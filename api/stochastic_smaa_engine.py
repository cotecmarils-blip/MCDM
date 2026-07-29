"""Motor SMAA / sensibilidad estocástica (guía Joan, notebooks 03_1 / 03_2).

Port de la lógica computacional del notebook, sin Matplotlib/display.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Iterable, Literal, Mapping, Optional, Sequence, Tuple
import math
import warnings

import numpy as np
import pandas as pd
from numpy.typing import NDArray
from scipy import stats
from scipy.stats import qmc

FloatArray = NDArray[np.float64]
IntArray = NDArray[np.int64]
BoolArray = NDArray[np.bool_]
Direction = Literal["benefit", "cost"]
SamplingMethod = Literal["mc", "lhs", "sobol"]
AggregationName = Literal["additive", "topsis"]


# --- from notebook cell 7 ---
@dataclass(frozen=True)
class WeightConstraints:
    """Restricciones opcionales aplicables a un vector de pesos normalizado."""

    lower: Optional[FloatArray] = None
    upper: Optional[FloatArray] = None
    order_pairs: Tuple[Tuple[int, int], ...] = ()
    ratio_bounds: Tuple[Tuple[int, int, float, float], ...] = ()

    def validate(self, dimension: int) -> None:
        """Verifica coherencia dimensional y factibilidad básica."""
        if dimension < 2:
            raise ValueError("El simplex debe contener al menos dos pesos.")

        if self.lower is not None:
            lower = np.asarray(self.lower, dtype=float)
            if lower.shape != (dimension,):
                raise ValueError("lower debe contener una entrada por peso.")
            if np.any(lower < 0.0) or lower.sum() > 1.0 + 1e-12:
                raise ValueError("Los límites inferiores no son factibles.")

        if self.upper is not None:
            upper = np.asarray(self.upper, dtype=float)
            if upper.shape != (dimension,):
                raise ValueError("upper debe contener una entrada por peso.")
            if np.any(upper < 0.0) or np.any(upper > 1.0):
                raise ValueError("Los límites superiores deben pertenecer a [0, 1].")
            if upper.sum() < 1.0 - 1e-12:
                raise ValueError("Los límites superiores no permiten sumar uno.")

        if self.lower is not None and self.upper is not None:
            if np.any(np.asarray(self.lower) > np.asarray(self.upper)):
                raise ValueError("Un límite inferior supera al correspondiente superior.")

        for i, j in self.order_pairs:
            if not (0 <= i < dimension and 0 <= j < dimension):
                raise ValueError("Índice inválido en order_pairs.")

        for i, j, lo, hi in self.ratio_bounds:
            if not (0 <= i < dimension and 0 <= j < dimension):
                raise ValueError("Índice inválido en ratio_bounds.")
            if lo < 0.0 or hi < lo:
                raise ValueError("Intervalo inválido para una razón de pesos.")

    def is_unconstrained(self) -> bool:
        """Indica si el simplex no contiene restricciones adicionales."""
        return (
            self.lower is None
            and self.upper is None
            and not self.order_pairs
            and not self.ratio_bounds
        )

    def mask(self, weights: FloatArray, atol: float = 1e-12) -> BoolArray:
        """Identifica las filas que satisfacen todas las restricciones."""
        if weights.ndim != 2:
            raise ValueError("weights debe tener forma N x p.")

        valid = np.ones(weights.shape[0], dtype=bool)

        if self.lower is not None:
            valid &= np.all(weights >= np.asarray(self.lower) - atol, axis=1)
        if self.upper is not None:
            valid &= np.all(weights <= np.asarray(self.upper) + atol, axis=1)

        for i, j in self.order_pairs:
            valid &= weights[:, i] >= weights[:, j] - atol

        for i, j, lo, hi in self.ratio_bounds:
            denominator = np.maximum(weights[:, j], atol)
            ratio = weights[:, i] / denominator
            valid &= (ratio >= lo - atol) & (ratio <= hi + atol)

        return valid


@dataclass(frozen=True)
class SamplingConfig:
    """Configuración de generación de pesos sobre un simplex."""

    method: SamplingMethod = "mc"
    alpha: Optional[FloatArray] = None
    nominal_weights: Optional[FloatArray] = None
    concentration: Optional[float] = None
    constraints: WeightConstraints = field(default_factory=WeightConstraints)
    seed: int = 20260715
    rejection_multiplier: int = 8
    max_rejection_rounds: int = 50

    def resolved_alpha(self, dimension: int) -> FloatArray:
        """Obtiene el vector Dirichlet efectivo."""
        if self.alpha is not None:
            alpha = np.asarray(self.alpha, dtype=float)
        elif self.nominal_weights is not None and self.concentration is not None:
            nominal = np.asarray(self.nominal_weights, dtype=float)
            if nominal.shape != (dimension,):
                raise ValueError("nominal_weights tiene dimensión incorrecta.")
            if not np.isclose(nominal.sum(), 1.0):
                raise ValueError("nominal_weights debe sumar uno.")
            if np.any(nominal <= 0.0):
                raise ValueError("Los pesos nominales deben ser positivos para Dirichlet.")
            if self.concentration <= 0.0:
                raise ValueError("concentration debe ser positiva.")
            alpha = nominal * float(self.concentration)
        else:
            alpha = np.ones(dimension, dtype=float)

        if alpha.shape != (dimension,) or np.any(alpha <= 0.0):
            raise ValueError("alpha debe tener una entrada positiva por peso.")

        self.constraints.validate(dimension)
        return alpha


@dataclass(frozen=True)
class StoppingConfig:
    """Política de simulación secuencial y detención anticipada."""

    min_iterations: int = 8_192
    max_iterations: int = 65_536
    batch_size: int = 2_048
    patience: int = 3
    rank_tolerance: float = 0.005
    quantile_tolerance: float = 0.005
    ci_half_width_tolerance: float = 0.01
    confidence: float = 0.95
    score_quantiles: Tuple[float, ...] = (0.05, 0.50, 0.95)

    def validate(self) -> None:
        """Verifica la coherencia de la política de parada."""
        if not (0 < self.min_iterations <= self.max_iterations):
            raise ValueError("Se requiere 0 < min_iterations <= max_iterations.")
        if self.batch_size <= 0:
            raise ValueError("batch_size debe ser positivo.")
        if self.patience < 1:
            raise ValueError("patience debe ser al menos uno.")
        if not 0.0 < self.confidence < 1.0:
            raise ValueError("confidence debe estar entre cero y uno.")
        for value in (
            self.rank_tolerance,
            self.quantile_tolerance,
            self.ci_half_width_tolerance,
        ):
            if value <= 0.0:
                raise ValueError("Las tolerancias deben ser positivas.")
        if not all(0.0 < q < 1.0 for q in self.score_quantiles):
            raise ValueError("Los cuantiles deben pertenecer a (0, 1).")


@dataclass(frozen=True)
class AnalysisConfig:
    """Configuración transversal del modelo de evaluación."""

    aggregation: AggregationName = "additive"
    tie_tolerance: float = 1e-12
    reciprocal_epsilon: float = 1e-12
    admissibility_threshold: Optional[float] = 0.40

    def validate(self) -> None:
        if self.tie_tolerance < 0.0:
            raise ValueError("tie_tolerance no puede ser negativa.")
        if self.reciprocal_epsilon <= 0.0:
            raise ValueError("reciprocal_epsilon debe ser positiva.")

# --- from notebook cell 9 ---
class SimplexWeightSampler:
    """Generador secuencial de pesos Dirichlet con restricciones opcionales."""

    def __init__(self, dimension: int, config: SamplingConfig) -> None:
        self.dimension = int(dimension)
        self.config = config
        self.alpha = config.resolved_alpha(self.dimension)
        self.rng = np.random.default_rng(config.seed)
        self._engine: Optional[qmc.QMCEngine]

        if config.method == "lhs":
            self._engine = qmc.LatinHypercube(d=self.dimension, seed=config.seed)
        elif config.method == "sobol":
            self._engine = qmc.Sobol(d=self.dimension, scramble=True, seed=config.seed)
        elif config.method == "mc":
            self._engine = None
        else:
            raise ValueError(f"Método de muestreo no reconocido: {config.method}")

    def _unit_sample(self, n: int) -> FloatArray:
        """Genera variables uniformes para la transformación Dirichlet."""
        if self.config.method == "mc":
            unit = self.rng.random((n, self.dimension))
        else:
            assert self._engine is not None
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", category=UserWarning)
                unit = self._engine.random(n=n)

        tiny = np.finfo(float).eps
        return np.clip(unit, tiny, 1.0 - tiny)

    def _dirichlet_candidates(self, n: int) -> FloatArray:
        """Transforma variables uniformes en realizaciones Dirichlet."""
        if self.config.method == "mc":
            return self.rng.dirichlet(self.alpha, size=n)

        unit = self._unit_sample(n)
        gamma_values = stats.gamma.ppf(unit, a=self.alpha, scale=1.0)
        gamma_values = np.maximum(gamma_values, np.finfo(float).tiny)
        return gamma_values / gamma_values.sum(axis=1, keepdims=True)

    def sample(self, n: int) -> FloatArray:
        """Obtiene exactamente n pesos válidos mediante rechazo controlado."""
        if n <= 0:
            raise ValueError("n debe ser positivo.")

        accepted: list[FloatArray] = []
        remaining = n

        for _ in range(self.config.max_rejection_rounds):
            candidate_n = (
                remaining
                if self.config.constraints.is_unconstrained()
                else max(
                    remaining * self.config.rejection_multiplier,
                    remaining,
                )
            )
            candidates = self._dirichlet_candidates(candidate_n)
            valid = candidates[self.config.constraints.mask(candidates)]

            if valid.size:
                take = min(remaining, valid.shape[0])
                accepted.append(valid[:take])
                remaining -= take

            if remaining == 0:
                return np.vstack(accepted)

        raise RuntimeError(
            "No fue posible generar suficientes pesos válidos. "
            "Revise las restricciones o aumente los límites de rechazo."
        )

# --- from notebook cell 11 ---
class DirectionalVectorNormalizer:
    """Normalización vectorial con orientación común hacia beneficio."""

    def __init__(self, epsilon: float = 1e-12) -> None:
        if epsilon <= 0.0:
            raise ValueError("epsilon debe ser positiva.")
        self.epsilon = float(epsilon)

    def transform(
        self,
        matrix: FloatArray,
        directions: Sequence[Direction],
    ) -> FloatArray:
        """Normaliza matrices 2D o lotes 3D sin alterar el input."""
        values = np.asarray(matrix, dtype=float)
        if values.ndim not in (2, 3):
            raise ValueError("matrix debe ser 2D o 3D.")
        if values.shape[-1] != len(directions):
            raise ValueError("directions no coincide con el número de columnas.")
        if not np.all(np.isfinite(values)):
            raise ValueError("La matriz contiene valores no finitos.")

        transformed = values.copy()
        for j, direction in enumerate(directions):
            column = transformed[..., j]
            if direction == "cost":
                if np.any(column <= 0.0):
                    raise ValueError(
                        "La transformación recíproca exige valores positivos."
                    )
                transformed[..., j] = 1.0 / np.maximum(column, self.epsilon)
            elif direction != "benefit":
                raise ValueError(f"Dirección no reconocida: {direction}")

        if transformed.ndim == 2:
            denominator = np.linalg.norm(transformed, axis=0, keepdims=True)
        else:
            denominator = np.linalg.norm(transformed, axis=1, keepdims=True)

        if np.any(denominator <= self.epsilon):
            raise ValueError("Existe una columna con norma prácticamente nula.")

        return transformed / denominator


class AggregationRule(ABC):
    """Interfaz para reglas de síntesis global."""

    @abstractmethod
    def score(self, normalized: FloatArray, weights: FloatArray) -> FloatArray:
        """Calcula scores para una matriz o un lote de matrices."""
        raise NotImplementedError


class AdditiveValueAggregator(AggregationRule):
    """Función de valor aditiva ponderada."""

    def score(self, normalized: FloatArray, weights: FloatArray) -> FloatArray:
        matrix = np.asarray(normalized, dtype=float)
        weight_array = np.asarray(weights, dtype=float)

        if matrix.ndim == 2 and weight_array.ndim == 2:
            return weight_array @ matrix.T
        if matrix.ndim == 3 and weight_array.ndim == 2:
            return np.einsum("nmd,nd->nm", matrix, weight_array)
        if matrix.ndim == 2 and weight_array.ndim == 1:
            return matrix @ weight_array
        raise ValueError("Combinación dimensional no soportada.")


class TopsisAggregator(AggregationRule):
    """TOPSIS sobre matrices ya normalizadas y orientadas como beneficio."""

    def score(self, normalized: FloatArray, weights: FloatArray) -> FloatArray:
        matrix = np.asarray(normalized, dtype=float)
        weight_array = np.asarray(weights, dtype=float)

        if matrix.ndim == 2 and weight_array.ndim == 1:
            weighted = matrix * weight_array
            ideal = weighted.max(axis=0)
            anti = weighted.min(axis=0)
            d_pos = np.linalg.norm(weighted - ideal, axis=1)
            d_neg = np.linalg.norm(weighted - anti, axis=1)
            return d_neg / np.maximum(d_pos + d_neg, np.finfo(float).eps)

        if matrix.ndim == 2 and weight_array.ndim == 2:
            weighted = matrix[None, :, :] * weight_array[:, None, :]
        elif matrix.ndim == 3 and weight_array.ndim == 2:
            weighted = matrix * weight_array[:, None, :]
        else:
            raise ValueError("Combinación dimensional no soportada por TOPSIS.")

        ideal = weighted.max(axis=1)
        anti = weighted.min(axis=1)
        d_pos = np.linalg.norm(weighted - ideal[:, None, :], axis=2)
        d_neg = np.linalg.norm(weighted - anti[:, None, :], axis=2)
        return d_neg / np.maximum(d_pos + d_neg, np.finfo(float).eps)


def build_aggregator(name: AggregationName) -> AggregationRule:
    """Construye la estrategia de agregación seleccionada."""
    if name == "additive":
        return AdditiveValueAggregator()
    if name == "topsis":
        return TopsisAggregator()
    raise ValueError(f"Regla de agregación no reconocida: {name}")

# --- from notebook cell 13 ---
def scores_to_ranks(scores: FloatArray, tie_tolerance: float = 1e-12) -> IntArray:
    """Convierte scores N x m en rangos enteros, con mayor score como mejor."""
    values = np.asarray(scores, dtype=float)
    if values.ndim != 2:
        raise ValueError("scores debe tener forma N x m.")

    # Se añade una perturbación determinística muy inferior a la tolerancia
    # para obtener un orden reproducible en empates numéricos.
    m = values.shape[1]
    deterministic_jitter = np.arange(m, dtype=float) * tie_tolerance * 0.1
    stable_scores = values - deterministic_jitter[None, :]
    order = np.argsort(-stable_scores, axis=1, kind="mergesort")
    ranks = np.empty_like(order, dtype=np.int64)
    row_index = np.arange(values.shape[0])[:, None]
    ranks[row_index, order] = np.arange(1, m + 1, dtype=np.int64)
    return ranks

# --- from notebook cell 15 ---
@dataclass
class ConvergenceRecord:
    """Diagnóstico acumulado registrado después de cada lote."""

    iterations: int
    max_rank_change: float
    max_quantile_change: float
    max_wilson_half_width: float
    leading_alternative: str
    criteria_satisfied: bool
    consecutive_successes: int


@dataclass
class SimulationResult:
    """Contenedor inmutable de las realizaciones y métricas derivadas."""

    alternatives: Tuple[str, ...]
    criteria: Tuple[str, ...]
    scores: FloatArray
    ranks: IntArray
    macro_weights: FloatArray
    nominal_scores: FloatArray
    nominal_ranks: IntArray
    convergence: pd.DataFrame
    stop_reason: str
    sampling_method: str
    meso_weights: Optional[FloatArray] = None
    raw_omoe: Optional[FloatArray] = None
    admissibility_threshold: Optional[float] = None

    @property
    def n_iterations(self) -> int:
        return int(self.scores.shape[0])

    def rank_acceptability(self) -> pd.DataFrame:
        m = len(self.alternatives)
        table = np.zeros((m, m), dtype=float)
        for i in range(m):
            counts = np.bincount(self.ranks[:, i], minlength=m + 1)[1:]
            table[i, :] = counts / self.n_iterations
        return pd.DataFrame(
            table,
            index=self.alternatives,
            columns=[f"Rango {r}" for r in range(1, m + 1)],
        )

    def first_place_probability(self) -> pd.Series:
        return self.rank_acceptability()["Rango 1"].rename("P(rango=1)")

    def expected_rank(self) -> pd.DataFrame:
        return pd.DataFrame(
            {
                "media": self.ranks.mean(axis=0),
                "mediana": np.median(self.ranks, axis=0),
                "q05": np.quantile(self.ranks, 0.05, axis=0),
                "q95": np.quantile(self.ranks, 0.95, axis=0),
            },
            index=self.alternatives,
        )

    def pairwise_preference_probability(self) -> pd.DataFrame:
        m = len(self.alternatives)
        matrix = np.zeros((m, m), dtype=float)
        for i in range(m):
            for k in range(m):
                if i == k:
                    matrix[i, k] = 0.5
                else:
                    matrix[i, k] = np.mean(self.scores[:, i] > self.scores[:, k])
        return pd.DataFrame(matrix, index=self.alternatives, columns=self.alternatives)

    def score_summary(self) -> pd.DataFrame:
        return pd.DataFrame(
            {
                "score_base": self.nominal_scores,
                "media": self.scores.mean(axis=0),
                "desviación": self.scores.std(axis=0, ddof=1),
                "q05": np.quantile(self.scores, 0.05, axis=0),
                "mediana": np.quantile(self.scores, 0.50, axis=0),
                "q95": np.quantile(self.scores, 0.95, axis=0),
                "mínimo_muestral": self.scores.min(axis=0),
                "máximo_muestral": self.scores.max(axis=0),
            },
            index=self.alternatives,
        )

    def regret(self) -> FloatArray:
        best = self.scores.max(axis=1, keepdims=True)
        return best - self.scores

    def regret_summary(self) -> pd.DataFrame:
        regret = self.regret()
        return pd.DataFrame(
            {
                "regret_medio": regret.mean(axis=0),
                "regret_q95": np.quantile(regret, 0.95, axis=0),
                "regret_máximo": regret.max(axis=0),
            },
            index=self.alternatives,
        )

    def ordinal_stability(self) -> pd.Series:
        m = len(self.alternatives)
        stability = 1.0 - np.mean(
            np.abs(self.ranks - self.nominal_ranks[None, :]),
            axis=0,
        ) / max(m - 1, 1)
        return pd.Series(stability, index=self.alternatives, name="Estabilidad ordinal")

    def feasibility_probability(self) -> pd.Series:
        if self.admissibility_threshold is None:
            return pd.Series(
                np.nan,
                index=self.alternatives,
                name="P(admisible)",
            )
        return pd.Series(
            np.mean(self.scores >= self.admissibility_threshold, axis=0),
            index=self.alternatives,
            name="P(admisible)",
        )

    def robustness_dashboard(self) -> pd.DataFrame:
        p_first = self.first_place_probability()
        q05 = pd.Series(
            np.quantile(self.scores, 0.05, axis=0),
            index=self.alternatives,
            name="Score inferior Q05",
        )
        regret = self.regret()
        regret_scale = max(float(regret.max()), np.finfo(float).eps)
        complement_regret = pd.Series(
            1.0 - regret.mean(axis=0) / regret_scale,
            index=self.alternatives,
            name="1 - regret medio normalizado",
        )
        base = pd.Series(
            self.nominal_scores,
            index=self.alternatives,
            name="Score base",
        )
        dashboard = pd.concat(
            [
                base,
                p_first,
                q05,
                complement_regret,
                self.ordinal_stability(),
                self.feasibility_probability(),
            ],
            axis=1,
        )
        return dashboard

    def conditional_weight_summary(self, alternative: str) -> pd.DataFrame:
        if alternative not in self.alternatives:
            raise KeyError(f"Alternativa no reconocida: {alternative}")
        idx = self.alternatives.index(alternative)
        mask = self.ranks[:, idx] == 1
        if not np.any(mask):
            raise ValueError("La alternativa nunca ocupa el primer lugar.")

        selected = self.macro_weights[mask]
        table = pd.DataFrame(
            {
                "media": selected.mean(axis=0),
                "q05": np.quantile(selected, 0.05, axis=0),
                "mediana": np.quantile(selected, 0.50, axis=0),
                "q95": np.quantile(selected, 0.95, axis=0),
            },
            index=self.criteria,
        )
        return table

# --- from notebook cell 17 ---
def rank_acceptability_array(ranks: IntArray) -> FloatArray:
    """Calcula la matriz m x m de aceptabilidad desde un prefijo de rangos."""
    n, m = ranks.shape
    table = np.zeros((m, m), dtype=float)
    for i in range(m):
        table[i, :] = np.bincount(ranks[:, i], minlength=m + 1)[1:] / n
    return table


def wilson_half_width(
    successes: FloatArray,
    n: int,
    confidence: float,
) -> FloatArray:
    """Semiancho del intervalo de Wilson para proporciones binomiales."""
    z = stats.norm.ppf(0.5 + confidence / 2.0)
    p_hat = np.asarray(successes, dtype=float) / n
    denominator = 1.0 + (z**2) / n
    inside = p_hat * (1.0 - p_hat) / n + (z**2) / (4.0 * n**2)
    return z * np.sqrt(inside) / denominator


class SequentialConvergenceMonitor:
    """Evalúa convergencia de aceptabilidades, cuantiles e intervalos."""

    def __init__(
        self,
        alternatives: Sequence[str],
        config: StoppingConfig,
    ) -> None:
        config.validate()
        self.alternatives = tuple(alternatives)
        self.config = config
        self.previous_acceptability: Optional[FloatArray] = None
        self.previous_quantiles: Optional[FloatArray] = None
        self.previous_leader: Optional[str] = None
        self.consecutive_successes = 0
        self.records: list[ConvergenceRecord] = []

    def update(self, scores: FloatArray, ranks: IntArray) -> bool:
        """Actualiza diagnósticos y devuelve True cuando debe detenerse."""
        n = scores.shape[0]
        acceptability = rank_acceptability_array(ranks)
        quantiles = np.quantile(
            scores,
            self.config.score_quantiles,
            axis=0,
        )
        p_first = acceptability[:, 0]
        leader = self.alternatives[int(np.argmax(p_first))]
        half_width = wilson_half_width(
            successes=(ranks == 1).sum(axis=0),
            n=n,
            confidence=self.config.confidence,
        )

        if self.previous_acceptability is None:
            rank_change = math.inf
            quantile_change = math.inf
            leader_stable = False
        else:
            rank_change = float(
                np.max(np.abs(acceptability - self.previous_acceptability))
            )
            quantile_change = float(
                np.max(np.abs(quantiles - self.previous_quantiles))
            )
            leader_stable = leader == self.previous_leader

        criteria_satisfied = bool(
            n >= self.config.min_iterations
            and rank_change <= self.config.rank_tolerance
            and quantile_change <= self.config.quantile_tolerance
            and float(np.max(half_width))
            <= self.config.ci_half_width_tolerance
            and leader_stable
        )

        if criteria_satisfied:
            self.consecutive_successes += 1
        else:
            self.consecutive_successes = 0

        self.records.append(
            ConvergenceRecord(
                iterations=n,
                max_rank_change=rank_change,
                max_quantile_change=quantile_change,
                max_wilson_half_width=float(np.max(half_width)),
                leading_alternative=leader,
                criteria_satisfied=criteria_satisfied,
                consecutive_successes=self.consecutive_successes,
            )
        )

        self.previous_acceptability = acceptability
        self.previous_quantiles = quantiles
        self.previous_leader = leader
        return self.consecutive_successes >= self.config.patience

    def to_frame(self) -> pd.DataFrame:
        """Convierte los diagnósticos acumulados en una tabla trazable."""
        return pd.DataFrame(
            [
                {
                    "Iteraciones": record.iterations,
                    "Cambio máx. aceptabilidad": record.max_rank_change,
                    "Cambio máx. cuantiles": record.max_quantile_change,
                    "Semiancho Wilson máx.": record.max_wilson_half_width,
                    "Alternativa líder": record.leading_alternative,
                    "Criterios cumplidos": record.criteria_satisfied,
                    "Éxitos consecutivos": record.consecutive_successes,
                }
                for record in self.records
            ]
        )

# --- from notebook cell 19 ---
@dataclass
class BatchResult:
    """Resultado elemental producido por una ejecución por lotes."""

    scores: FloatArray
    ranks: IntArray
    macro_weights: FloatArray
    meso_weights: Optional[FloatArray] = None
    raw_omoe: Optional[FloatArray] = None


class SensitivityScenario(ABC):
    """Interfaz para escenarios jerárquicos de sensibilidad."""

    @property
    @abstractmethod
    def alternatives(self) -> Tuple[str, ...]:
        raise NotImplementedError

    @property
    @abstractmethod
    def criteria(self) -> Tuple[str, ...]:
        raise NotImplementedError

    @abstractmethod
    def nominal_evaluation(self) -> Tuple[FloatArray, IntArray]:
        raise NotImplementedError

    @abstractmethod
    def simulate_batch(self, n: int) -> BatchResult:
        raise NotImplementedError


@dataclass(frozen=True)
class MacroDecisionData:
    """Datos inmutables del análisis exclusivamente macro."""

    alternatives: Tuple[str, ...]
    criteria: Tuple[str, ...]
    matrix: FloatArray
    directions: Tuple[Direction, ...]
    nominal_weights: FloatArray

    def validate(self) -> None:
        matrix = np.asarray(self.matrix, dtype=float)
        if matrix.shape != (len(self.alternatives), len(self.criteria)):
            raise ValueError("La matriz macro no coincide con nombres y criterios.")
        if len(self.directions) != len(self.criteria):
            raise ValueError("Debe existir una dirección por criterio.")
        weights = np.asarray(self.nominal_weights, dtype=float)
        if weights.shape != (len(self.criteria),):
            raise ValueError("nominal_weights tiene dimensión incorrecta.")
        if np.any(weights < 0.0) or not np.isclose(weights.sum(), 1.0):
            raise ValueError("Los pesos nominales deben ser no negativos y sumar uno.")


@dataclass(frozen=True)
class MacroMesoDecisionData:
    """Datos inmutables del análisis meso–macro para dos contextos OMOE."""

    alternatives: Tuple[str, ...]
    criteria: Tuple[str, ...]
    omoc: FloatArray
    omor: FloatArray
    omoe_contexts: FloatArray
    directions: Tuple[Direction, ...]
    nominal_macro_weights: FloatArray
    nominal_meso_weights: FloatArray

    def validate(self) -> None:
        m = len(self.alternatives)
        if np.asarray(self.omoc).shape != (m,):
            raise ValueError("omoc debe contener un valor por alternativa.")
        if np.asarray(self.omor).shape != (m,):
            raise ValueError("omor debe contener un valor por alternativa.")
        if np.asarray(self.omoe_contexts).shape != (m, 2):
            raise ValueError("omoe_contexts debe tener forma m x 2.")
        if self.criteria != ("OMOC", "OMOE", "OMOR"):
            raise ValueError("El ejemplo espera el orden OMOC, OMOE, OMOR.")
        if len(self.directions) != 3:
            raise ValueError("Se requieren tres orientaciones.")
        macro = np.asarray(self.nominal_macro_weights, dtype=float)
        meso = np.asarray(self.nominal_meso_weights, dtype=float)
        if macro.shape != (3,) or not np.isclose(macro.sum(), 1.0):
            raise ValueError("Los pesos macro nominales deben tener longitud tres y sumar uno.")
        if meso.shape != (2,) or not np.isclose(meso.sum(), 1.0):
            raise ValueError("Los pesos meso nominales deben tener longitud dos y sumar uno.")
        if np.any(macro < 0.0) or np.any(meso < 0.0):
            raise ValueError("Los pesos nominales deben ser no negativos.")


class MacroOnlyScenario(SensitivityScenario):
    """Simulación con matriz dimensional fija y pesos macro variables."""

    def __init__(
        self,
        data: MacroDecisionData,
        normalizer: DirectionalVectorNormalizer,
        aggregator: AggregationRule,
        macro_sampler: SimplexWeightSampler,
        tie_tolerance: float,
    ) -> None:
        data.validate()
        self.data = data
        self.normalizer = normalizer
        self.aggregator = aggregator
        self.macro_sampler = macro_sampler
        self.tie_tolerance = tie_tolerance
        self.normalized_matrix = normalizer.transform(data.matrix, data.directions)

    @property
    def alternatives(self) -> Tuple[str, ...]:
        return self.data.alternatives

    @property
    def criteria(self) -> Tuple[str, ...]:
        return self.data.criteria

    def nominal_evaluation(self) -> Tuple[FloatArray, IntArray]:
        scores = self.aggregator.score(
            self.normalized_matrix,
            np.asarray(self.data.nominal_weights, dtype=float),
        )
        ranks = scores_to_ranks(scores[None, :], self.tie_tolerance)[0]
        return scores, ranks

    def simulate_batch(self, n: int) -> BatchResult:
        macro_weights = self.macro_sampler.sample(n)
        scores = self.aggregator.score(self.normalized_matrix, macro_weights)
        ranks = scores_to_ranks(scores, self.tie_tolerance)
        return BatchResult(scores=scores, ranks=ranks, macro_weights=macro_weights)


class MacroMesoScenario(SensitivityScenario):
    """Simulación conjunta de pesos meso de OMOE y pesos macro."""

    def __init__(
        self,
        data: MacroMesoDecisionData,
        normalizer: DirectionalVectorNormalizer,
        aggregator: AggregationRule,
        macro_sampler: SimplexWeightSampler,
        meso_sampler: SimplexWeightSampler,
        tie_tolerance: float,
    ) -> None:
        data.validate()
        self.data = data
        self.normalizer = normalizer
        self.aggregator = aggregator
        self.macro_sampler = macro_sampler
        self.meso_sampler = meso_sampler
        self.tie_tolerance = tie_tolerance

    @property
    def alternatives(self) -> Tuple[str, ...]:
        return self.data.alternatives

    @property
    def criteria(self) -> Tuple[str, ...]:
        return self.data.criteria

    def _raw_matrices(self, meso_weights: FloatArray) -> Tuple[FloatArray, FloatArray]:
        raw_omoe = meso_weights @ np.asarray(self.data.omoe_contexts, dtype=float).T
        n = meso_weights.shape[0]
        m = len(self.data.alternatives)
        matrices = np.empty((n, m, 3), dtype=float)
        matrices[:, :, 0] = np.asarray(self.data.omoc, dtype=float)[None, :]
        matrices[:, :, 1] = raw_omoe
        matrices[:, :, 2] = np.asarray(self.data.omor, dtype=float)[None, :]
        return matrices, raw_omoe

    def nominal_evaluation(self) -> Tuple[FloatArray, IntArray]:
        meso = np.asarray(self.data.nominal_meso_weights, dtype=float)[None, :]
        matrices, _ = self._raw_matrices(meso)
        normalized = self.normalizer.transform(matrices, self.data.directions)[0]
        scores = self.aggregator.score(
            normalized,
            np.asarray(self.data.nominal_macro_weights, dtype=float),
        )
        ranks = scores_to_ranks(scores[None, :], self.tie_tolerance)[0]
        return scores, ranks

    def simulate_batch(self, n: int) -> BatchResult:
        macro_weights = self.macro_sampler.sample(n)
        meso_weights = self.meso_sampler.sample(n)
        matrices, raw_omoe = self._raw_matrices(meso_weights)
        normalized = self.normalizer.transform(matrices, self.data.directions)
        scores = self.aggregator.score(normalized, macro_weights)
        ranks = scores_to_ranks(scores, self.tie_tolerance)
        return BatchResult(
            scores=scores,
            ranks=ranks,
            macro_weights=macro_weights,
            meso_weights=meso_weights,
            raw_omoe=raw_omoe,
        )


class SequentialSensitivityEngine:
    """Ejecuta un escenario por lotes hasta convergencia o N máximo."""

    def __init__(
        self,
        scenario: SensitivityScenario,
        stopping: StoppingConfig,
        sampling_method: str,
        admissibility_threshold: Optional[float],
    ) -> None:
        stopping.validate()
        self.scenario = scenario
        self.stopping = stopping
        self.sampling_method = sampling_method
        self.admissibility_threshold = admissibility_threshold

    def run(self) -> SimulationResult:
        score_batches: list[FloatArray] = []
        rank_batches: list[IntArray] = []
        macro_batches: list[FloatArray] = []
        meso_batches: list[FloatArray] = []
        omoe_batches: list[FloatArray] = []

        monitor = SequentialConvergenceMonitor(
            alternatives=self.scenario.alternatives,
            config=self.stopping,
        )
        stop_reason = "Se alcanzó N_max sin cumplir todos los criterios de convergencia."
        total = 0

        while total < self.stopping.max_iterations:
            current_batch = min(
                self.stopping.batch_size,
                self.stopping.max_iterations - total,
            )
            batch = self.scenario.simulate_batch(current_batch)
            score_batches.append(batch.scores)
            rank_batches.append(batch.ranks)
            macro_batches.append(batch.macro_weights)
            if batch.meso_weights is not None:
                meso_batches.append(batch.meso_weights)
            if batch.raw_omoe is not None:
                omoe_batches.append(batch.raw_omoe)

            total += current_batch
            scores = np.vstack(score_batches)
            ranks = np.vstack(rank_batches)

            if monitor.update(scores, ranks):
                stop_reason = (
                    "Detención anticipada: los criterios de convergencia se "
                    f"cumplieron durante {self.stopping.patience} lotes consecutivos."
                )
                break

        nominal_scores, nominal_ranks = self.scenario.nominal_evaluation()
        return SimulationResult(
            alternatives=self.scenario.alternatives,
            criteria=self.scenario.criteria,
            scores=np.vstack(score_batches),
            ranks=np.vstack(rank_batches),
            macro_weights=np.vstack(macro_batches),
            meso_weights=np.vstack(meso_batches) if meso_batches else None,
            raw_omoe=np.vstack(omoe_batches) if omoe_batches else None,
            nominal_scores=nominal_scores,
            nominal_ranks=nominal_ranks,
            convergence=monitor.to_frame(),
            stop_reason=stop_reason,
            sampling_method=self.sampling_method,
            admissibility_threshold=self.admissibility_threshold,
        )
