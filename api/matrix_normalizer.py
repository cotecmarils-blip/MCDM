"""Normalización de matriz de decisión (notebook 01)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Sequence

import numpy as np
import numpy.typing as npt


class Direction(str, Enum):
    MIN = "min"
    MAX = "max"


class NormalizationMethod(str, Enum):
    DIRECTIONAL_MINMAX = "directional_minmax"
    VECTOR = "vector"
    DIRECTIONAL_VECTOR = "directional_vector"
    SUM = "sum"
    ZSCORE = "zscore"


@dataclass(frozen=True, slots=True)
class NormalizationResult:
    method: NormalizationMethod
    pareto_indices: list[int]
    pareto_alternatives: list[str]
    dimensions: list[str]
    directions: list[Direction]
    normalized_dimension_indices: list[int]
    normalized_dimensions: list[str]
    preserved_dimension_indices: list[int]
    preserved_dimensions: list[str]
    original_pareto_matrix: npt.NDArray[np.float64]
    normalized_matrix: npt.NDArray[np.float64]

    def to_dict(self) -> dict[str, Any]:
        return {
            "method": self.method.value,
            "pareto_indices": self.pareto_indices,
            "pareto_alternatives": self.pareto_alternatives,
            "dimensions": self.dimensions,
            "directions": [direction.value for direction in self.directions],
            "normalized_dimension_indices": self.normalized_dimension_indices,
            "normalized_dimensions": self.normalized_dimensions,
            "preserved_dimension_indices": self.preserved_dimension_indices,
            "preserved_dimensions": self.preserved_dimensions,
            "original_pareto_matrix": self.original_pareto_matrix.tolist(),
            "normalized_matrix": self.normalized_matrix.tolist(),
        }


class NonDominatedNormalizer:
    """
    Normalizes the non-dominated subset of a decision matrix.

    By default, all dimensions are normalized. However, the user can provide
    a subset of dimension names to normalize. Non-selected dimensions are
    preserved with their original values.
    """

    def __init__(
        self,
        matrix: Sequence[Sequence[float]] | npt.NDArray[np.float64],
        pareto_indices: Sequence[int],
        directions: Sequence[str | Direction],
        *,
        dimensions: Sequence[str] | None = None,
        alternatives: Sequence[str] | None = None,
        epsilon: float = 1e-12,
    ) -> None:
        self._matrix = np.asarray(matrix, dtype=np.float64)
        self._pareto_indices = [int(index) for index in pareto_indices]
        self._directions = [self._parse_direction(direction) for direction in directions]
        self._epsilon = float(epsilon)

        self._validate_base_inputs()

        self._n_alternatives: int = self._matrix.shape[0]
        self._n_dimensions: int = self._matrix.shape[1]

        self._dimensions = (
            list(dimensions)
            if dimensions is not None
            else [f"C{j + 1}" for j in range(self._n_dimensions)]
        )

        self._alternatives = (
            [str(alternative) for alternative in alternatives]
            if alternatives is not None
            else [f"A{i}" for i in range(self._n_alternatives)]
        )

        self._validate_metadata()

        self._pareto_matrix = self._matrix[self._pareto_indices, :]
        self._pareto_alternatives = [
            self._alternatives[index]
            for index in self._pareto_indices
        ]

    @staticmethod
    def _parse_direction(direction: str | Direction) -> Direction:
        if isinstance(direction, Direction):
            return direction

        normalized = str(direction).strip().lower()

        aliases = {
            "min": Direction.MIN,
            "minimize": Direction.MIN,
            "minimizar": Direction.MIN,
            "minimum": Direction.MIN,
            "cost": Direction.MIN,
            "costo": Direction.MIN,
            "max": Direction.MAX,
            "maximize": Direction.MAX,
            "maximizar": Direction.MAX,
            "maximum": Direction.MAX,
            "benefit": Direction.MAX,
            "beneficio": Direction.MAX,
        }

        if normalized not in aliases:
            raise ValueError(
                f"Invalid direction '{direction}'. "
                "Use 'min'/'max' or equivalent aliases."
            )

        return aliases[normalized]

    @staticmethod
    def _parse_method(method: str | NormalizationMethod) -> NormalizationMethod:
        if isinstance(method, NormalizationMethod):
            return method

        normalized = str(method).strip().lower()

        try:
            return NormalizationMethod(normalized)
        except ValueError as exc:
            valid_methods = [method.value for method in NormalizationMethod]
            raise ValueError(
                f"Invalid normalization method '{method}'. "
                f"Valid methods are: {valid_methods}."
            ) from exc

    def _validate_base_inputs(self) -> None:
        if self._matrix.ndim != 2:
            raise ValueError("matrix must be a two-dimensional array.")

        if self._matrix.size == 0:
            raise ValueError("matrix cannot be empty.")

        if not np.all(np.isfinite(self._matrix)):
            raise ValueError("matrix contains NaN or infinite values.")

        if not self._pareto_indices:
            raise ValueError("pareto_indices cannot be empty.")

        if len(set(self._pareto_indices)) != len(self._pareto_indices):
            raise ValueError("pareto_indices must be unique.")

        n_alternatives, n_dimensions = self._matrix.shape

        for index in self._pareto_indices:
            if index < 0 or index >= n_alternatives:
                raise IndexError(
                    f"Pareto index {index} is out of bounds for "
                    f"{n_alternatives} alternatives."
                )

        if len(self._directions) != n_dimensions:
            raise ValueError(
                "The number of directions must match the number of matrix columns. "
                f"Expected {n_dimensions}, got {len(self._directions)}."
            )

        if self._epsilon <= 0:
            raise ValueError("epsilon must be greater than zero.")

    def _validate_metadata(self) -> None:
        if len(self._dimensions) != self._n_dimensions:
            raise ValueError(
                "The number of dimensions must match the number of matrix columns. "
                f"Expected {self._n_dimensions}, got {len(self._dimensions)}."
            )

        if len(set(self._dimensions)) != len(self._dimensions):
            raise ValueError("Dimension names must be unique.")

        if len(self._alternatives) != self._n_alternatives:
            raise ValueError(
                "The number of alternatives must match the number of matrix rows. "
                f"Expected {self._n_alternatives}, got {len(self._alternatives)}."
            )

        if len(set(self._alternatives)) != len(self._alternatives):
            raise ValueError("Alternative identifiers must be unique.")

    def _resolve_dimensions_to_normalize(
        self,
        dimensions_to_normalize: Sequence[str] | None,
    ) -> tuple[list[int], list[str], list[int], list[str]]:
        """
        Resolves user-selected dimension names into column indices.

        If dimensions_to_normalize is None, all dimensions are normalized.
        """
        if dimensions_to_normalize is None:
            normalized_indices = list(range(self._n_dimensions))
        else:
            requested_dimensions = [str(name) for name in dimensions_to_normalize]

            if not requested_dimensions:
                raise ValueError(
                    "dimensions_to_normalize cannot be empty. "
                    "Use None to normalize all dimensions."
                )

            duplicated = {
                name
                for name in requested_dimensions
                if requested_dimensions.count(name) > 1
            }

            if duplicated:
                raise ValueError(
                    f"Duplicated dimensions in dimensions_to_normalize: {duplicated}"
                )

            dimension_to_index = {
                dimension: index
                for index, dimension in enumerate(self._dimensions)
            }

            missing = [
                dimension
                for dimension in requested_dimensions
                if dimension not in dimension_to_index
            ]

            if missing:
                raise ValueError(
                    f"Unknown dimensions requested for normalization: {missing}. "
                    f"Available dimensions are: {self._dimensions}."
                )

            normalized_indices = [
                dimension_to_index[dimension]
                for dimension in requested_dimensions
            ]

        preserved_indices = [
            index
            for index in range(self._n_dimensions)
            if index not in set(normalized_indices)
        ]

        normalized_dimensions = [
            self._dimensions[index]
            for index in normalized_indices
        ]

        preserved_dimensions = [
            self._dimensions[index]
            for index in preserved_indices
        ]

        return (
            normalized_indices,
            normalized_dimensions,
            preserved_indices,
            preserved_dimensions,
        )

    def normalize(
        self,
        method: str | NormalizationMethod,
        *,
        dimensions_to_normalize: Sequence[str] | None = None,
    ) -> NormalizationResult:
        selected_method = self._parse_method(method)

        (
            normalized_indices,
            normalized_dimensions,
            preserved_indices,
            preserved_dimensions,
        ) = self._resolve_dimensions_to_normalize(dimensions_to_normalize)

        if selected_method == NormalizationMethod.DIRECTIONAL_MINMAX:
            fully_normalized = self._directional_minmax()

        elif selected_method == NormalizationMethod.VECTOR:
            fully_normalized = self._vector()

        elif selected_method == NormalizationMethod.DIRECTIONAL_VECTOR:
            fully_normalized = self._directional_vector()

        elif selected_method == NormalizationMethod.SUM:
            fully_normalized = self._sum()

        elif selected_method == NormalizationMethod.ZSCORE:
            fully_normalized = self._zscore()

        else:
            raise NotImplementedError(
                f"Normalization method '{selected_method.value}' is not implemented."
            )

        normalized_matrix = self._pareto_matrix.copy()
        normalized_matrix[:, normalized_indices] = fully_normalized[:, normalized_indices]

        return NormalizationResult(
            method=selected_method,
            pareto_indices=self._pareto_indices.copy(),
            pareto_alternatives=self._pareto_alternatives.copy(),
            dimensions=self._dimensions.copy(),
            directions=self._directions.copy(),
            normalized_dimension_indices=normalized_indices,
            normalized_dimensions=normalized_dimensions,
            preserved_dimension_indices=preserved_indices,
            preserved_dimensions=preserved_dimensions,
            original_pareto_matrix=self._pareto_matrix.copy(),
            normalized_matrix=normalized_matrix,
        )

    def normalize_as_dict(
        self,
        method: str | NormalizationMethod,
        *,
        dimensions_to_normalize: Sequence[str] | None = None,
    ) -> dict[str, Any]:
        return self.normalize(
            method,
            dimensions_to_normalize=dimensions_to_normalize,
        ).to_dict()

    def normalize_all(
        self,
        methods: Sequence[str | NormalizationMethod] | None = None,
        *,
        dimensions_to_normalize: Sequence[str] | None = None,
    ) -> dict[NormalizationMethod, NormalizationResult]:
        if methods is None:
            selected_methods = list(NormalizationMethod)
        else:
            selected_methods = [self._parse_method(method) for method in methods]

        return {
            method: self.normalize(
                method,
                dimensions_to_normalize=dimensions_to_normalize,
            )
            for method in selected_methods
        }

    def normalize_all_as_dict(
        self,
        methods: Sequence[str | NormalizationMethod] | None = None,
        *,
        dimensions_to_normalize: Sequence[str] | None = None,
    ) -> dict[str, Any]:
        results = self.normalize_all(
            methods,
            dimensions_to_normalize=dimensions_to_normalize,
        )

        return {
            method.value: result.to_dict()
            for method, result in results.items()
        }

    def _directional_minmax(self) -> npt.NDArray[np.float64]:
        x = self._pareto_matrix
        mins = np.min(x, axis=0)
        maxs = np.max(x, axis=0)
        ranges = maxs - mins

        normalized = np.zeros_like(x, dtype=np.float64)

        for j, direction in enumerate(self._directions):
            if ranges[j] <= self._epsilon:
                normalized[:, j] = 1.0
                continue

            if direction == Direction.MAX:
                normalized[:, j] = (x[:, j] - mins[j]) / ranges[j]
            else:
                normalized[:, j] = (maxs[j] - x[:, j]) / ranges[j]

        return normalized

    def _vector(self) -> npt.NDArray[np.float64]:
        x = self._pareto_matrix
        norms = np.sqrt(np.sum(np.square(x), axis=0))

        normalized = np.zeros_like(x, dtype=np.float64)

        valid = norms > self._epsilon
        normalized[:, valid] = x[:, valid] / norms[valid]

        return normalized

    def _directional_vector(self) -> npt.NDArray[np.float64]:
        x = self._pareto_matrix
        norms = np.sqrt(np.sum(np.square(x), axis=0))

        normalized = np.zeros_like(x, dtype=np.float64)

        for j, direction in enumerate(self._directions):
            if norms[j] <= self._epsilon:
                normalized[:, j] = 0.0
                continue

            vector_values = x[:, j] / norms[j]

            if direction == Direction.MAX:
                normalized[:, j] = vector_values
            else:
                normalized[:, j] = 1.0 - vector_values

        return normalized

    def _sum(self) -> npt.NDArray[np.float64]:
        x = self._pareto_matrix
        normalized = np.zeros_like(x, dtype=np.float64)

        for j, direction in enumerate(self._directions):
            column = x[:, j]

            if direction == Direction.MAX:
                denominator = np.sum(column)

                if abs(denominator) <= self._epsilon:
                    normalized[:, j] = 0.0
                else:
                    normalized[:, j] = column / denominator

            else:
                if np.any(column <= self._epsilon):
                    raise ValueError(
                        f"Sum normalization for cost criterion "
                        f"'{self._dimensions[j]}' requires strictly positive values."
                    )

                reciprocal = 1.0 / column
                denominator = np.sum(reciprocal)

                if denominator <= self._epsilon:
                    normalized[:, j] = 0.0
                else:
                    normalized[:, j] = reciprocal / denominator

        return normalized

    def _zscore(self) -> npt.NDArray[np.float64]:
        x = self._pareto_matrix
        means = np.mean(x, axis=0)
        stds = np.std(x, axis=0, ddof=0)

        normalized = np.zeros_like(x, dtype=np.float64)

        for j, direction in enumerate(self._directions):
            if stds[j] <= self._epsilon:
                normalized[:, j] = 0.0
                continue

            if direction == Direction.MAX:
                normalized[:, j] = (x[:, j] - means[j]) / stds[j]
            else:
                normalized[:, j] = (means[j] - x[:, j]) / stds[j]

        return normalized