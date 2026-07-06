"""
Crea alternativas y completa el ejercicio (constantes L/U/k y variables x) para un proyecto.

Uso:
  python manage.py seed_ejercicio_completo --proyecto-id 3
  python manage.py seed_ejercicio_completo --proyecto-id 3 --solo-alternativas
  python manage.py seed_ejercicio_completo --proyecto-id 3 --sin-valores-x
"""
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count

from api.evaluacion_service import build_evaluacion_schema, save_valores_bulk
from api.models import (
    Alternativa,
    Caracteristica,
    CaracteristicaPlantilla,
    NodoArbol,
    NodoArbolEscenario,
    Omoe,
    Proyecto,
)


ALT_SPECS = [
    {
        'nombre': 'Alt. A — Astillero nacional',
        'descripcion': 'Diseño nacional con transferencia tecnológica.',
        'referencia': 'BICM-A-2025',
        'costo': Decimal('195.00'),
        'datos': ['84.0', '15.5', '5.9', '3150', '4500', '42'],
    },
    {
        'nombre': 'Alt. B — Diseño importado adaptado',
        'descripcion': 'Plataforma comercial adaptada a misiones BICM.',
        'referencia': 'BICM-B-2025',
        'costo': Decimal('168.50'),
        'datos': ['80.5', '15.0', '5.7', '3020', '4200', '45'],
    },
    {
        'nombre': 'Alt. C — Configuración modular',
        'descripcion': 'Módulos científicos intercambiables por misión.',
        'referencia': 'BICM-C-2025',
        'costo': Decimal('178.25'),
        'datos': ['82.0', '15.2', '5.8', '3080', '4350', '44'],
    },
]

DEMO_REFERENCIAS = {spec['referencia'] for spec in ALT_SPECS}
DEMO_NOMBRES = {spec['nombre'] for spec in ALT_SPECS}


def _is_demo_parametros(params) -> bool:
    if not params or not isinstance(params, dict):
        return False
    if set(params.keys()) != {'L', 'U'}:
        return False
    try:
        return float(params['L']) == 0.0 and float(params['U']) == 100.0
    except (TypeError, ValueError):
        return False


def _is_demo_leaf(nodo: NodoArbol) -> bool:
    return (
        (nodo.familia_funciones or '') == 'min_max'
        and (nodo.tipo_criterio or '') == 'mas_es_mejor'
        and (nodo.tipo_dato or '') == 'numerico'
        and _is_demo_parametros(nodo.parametros_funcion)
    )


def _is_demo_escenario_cfg(cfg: NodoArbolEscenario) -> bool:
    return (
        (cfg.familia_funciones or '') in ('', 'min_max')
        and (cfg.tipo_criterio or '') in ('', 'mas_es_mejor')
        and _is_demo_parametros(cfg.parametros_funcion)
    )


class Command(BaseCommand):
    help = 'Crea alternativas y completa constantes + variables x del ejercicio de evaluación.'

    def add_arguments(self, parser):
        parser.add_argument('--proyecto-id', type=int, required=True)
        parser.add_argument(
            '--solo-alternativas',
            action='store_true',
            help='Solo crea alternativas, sin constantes ni valores x.',
        )
        parser.add_argument(
            '--sin-valores-x',
            action='store_true',
            help='No genera valores x de demostración.',
        )
        parser.add_argument(
            '--reset-alternativas',
            action='store_true',
            help='Elimina alternativas existentes antes de crear.',
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Elimina alternativas demo, valores x y constantes L=0/U=100 generadas por este comando.',
        )

    def handle(self, *args, **options):
        proyecto_id = options['proyecto_id']
        try:
            proyecto = Proyecto.objects.get(pk=proyecto_id)
        except Proyecto.DoesNotExist as exc:
            raise CommandError(f'Proyecto id={proyecto_id} no existe.') from exc

        if options['limpiar']:
            stats = self._limpiar_demo(proyecto)
            self.stdout.write(self.style.SUCCESS(
                f'Datos demo eliminados en proyecto id={proyecto.id} «{proyecto.nombre}»'
            ))
            for key, val in stats.items():
                self.stdout.write(f'  {key}: {val}')
            return

        with transaction.atomic():
            if options['reset_alternativas']:
                Alternativa.objects.filter(proyecto=proyecto).delete()

            alternativas = self._seed_alternativas(proyecto)
            if not options['solo_alternativas']:
                nodos = self._fill_constantes(proyecto)
                configs = self._sync_escenario_constantes(proyecto)
                valores_count = 0
                if not options['sin_valores_x']:
                    valores_count = self._seed_valores_x(proyecto, alternativas)
            else:
                nodos = configs = valores_count = 0

        schema = build_evaluacion_schema(proyecto)
        n_cols = len(schema.get('columnas', []))

        self.stdout.write(self.style.SUCCESS(
            f'Ejercicio cargado en proyecto id={proyecto.id} «{proyecto.nombre}»'
        ))
        self.stdout.write(f'  Alternativas: {len(alternativas)}')
        if not options['solo_alternativas']:
            self.stdout.write(f'  Nodos hoja con constantes: {nodos}')
            self.stdout.write(f'  Configs escenario sincronizadas: {configs}')
            self.stdout.write(f'  Columnas evaluación: {n_cols}')
            if not options['sin_valores_x']:
                self.stdout.write(f'  Celdas x generadas: {valores_count}')

    def _seed_alternativas(self, proyecto):
        plantillas = list(
            CaracteristicaPlantilla.objects.filter(proyecto=proyecto).order_by('orden', 'id')
        )
        alternativas = []
        for spec in ALT_SPECS:
            alt, _ = Alternativa.objects.get_or_create(
                proyecto=proyecto,
                nombre=spec['nombre'],
                defaults={
                    'descripcion': spec['descripcion'],
                    'referencia': spec['referencia'],
                    'costo': spec['costo'],
                    'costo_unidad': Alternativa.COSTO_MUSD,
                },
            )
            if plantillas and spec.get('datos'):
                for plantilla, dato in zip(plantillas, spec['datos']):
                    Caracteristica.objects.update_or_create(
                        alternativa=alt,
                        plantilla=plantilla,
                        defaults={'dato': dato},
                    )
            alternativas.append(alt)
        return alternativas

    def _leaf_nodes(self, proyecto):
        omoes = Omoe.objects.filter(proyecto=proyecto)
        return NodoArbol.objects.filter(omoe__in=omoes).annotate(
            num_hijos=Count('hijos'),
        ).filter(num_hijos=0)

    def _default_params(self, nodo: NodoArbol) -> dict:
        params = dict(nodo.parametros_funcion or {})
        if params.get('L') is None and nodo.valor_umbral is not None:
            params['L'] = float(nodo.valor_umbral)
        if params.get('U') is None and nodo.valor_meta is not None:
            params['U'] = float(nodo.valor_meta)
        if params.get('L') is None:
            params['L'] = 0
        if params.get('U') is None:
            params['U'] = 100
        return params

    def _fill_constantes(self, proyecto) -> int:
        updated = 0
        for nodo in self._leaf_nodes(proyecto):
            changed = False
            if not (nodo.familia_funciones or '').strip():
                nodo.familia_funciones = 'min_max'
                changed = True
            if not (nodo.tipo_criterio or '').strip():
                nodo.tipo_criterio = 'mas_es_mejor'
                changed = True
            if not (nodo.tipo_dato or '').strip():
                nodo.tipo_dato = 'numerico'
                changed = True
            params = self._default_params(nodo)
            if dict(nodo.parametros_funcion or {}) != params:
                nodo.parametros_funcion = params
                changed = True
            if changed:
                nodo.save(update_fields=[
                    'familia_funciones', 'tipo_criterio', 'tipo_dato', 'parametros_funcion',
                ])
                updated += 1
        return updated

    def _sync_escenario_constantes(self, proyecto) -> int:
        leaf_ids = set(self._leaf_nodes(proyecto).values_list('id', flat=True))
        updated = 0
        configs = NodoArbolEscenario.objects.filter(
            nodo_arbol_id__in=leaf_ids,
            escenario__proyecto=proyecto,
            aplica=True,
        ).select_related('nodo_arbol')

        for cfg in configs:
            nodo = cfg.nodo_arbol
            changed = False
            if not (cfg.familia_funciones or '').strip():
                cfg.familia_funciones = nodo.familia_funciones or 'min_max'
                changed = True
            if not (cfg.tipo_criterio or '').strip():
                cfg.tipo_criterio = nodo.tipo_criterio or 'mas_es_mejor'
                changed = True
            params = dict(cfg.parametros_funcion or {})
            defaults = self._default_params(nodo)
            for key, val in defaults.items():
                if params.get(key) is None:
                    params[key] = val
                    changed = True
            if changed:
                cfg.parametros_funcion = params
                cfg.save(update_fields=['familia_funciones', 'tipo_criterio', 'parametros_funcion'])
                updated += 1
        return updated

    def _demo_x(self, col: dict, alt_index: int) -> str:
        const = col.get('constantes') or {}
        try:
            low = float(const.get('L', 0))
            high = float(const.get('U', 100))
        except (TypeError, ValueError):
            low, high = 0.0, 100.0
        span = high - low if high > low else 100.0
        nodo_id = col.get('nodo_id') or 0
        esc_id = col.get('escenario_id') or 0
        frac = (0.25 + 0.15 * alt_index + (nodo_id % 11) * 0.04 + (esc_id % 7) * 0.03) % 1.0
        val = low + span * frac
        if col.get('input_kind') == 'number':
            return str(round(val, 2))
        return str(round(val, 2))

    def _seed_valores_x(self, proyecto, alternativas) -> int:
        schema = build_evaluacion_schema(proyecto)
        columnas = schema.get('columnas', [])
        total = 0
        for idx, alt in enumerate(alternativas):
            valores = {col['key']: self._demo_x(col, idx) for col in columnas}
            save_valores_bulk(alt.id, valores)
            total += len([v for v in valores.values() if v])
        return total

    def _limpiar_demo(self, proyecto: Proyecto) -> dict[str, int]:
        from api.models import SimulacionHistorial, ValorEvaluacion

        with transaction.atomic():
            demo_alts = Alternativa.objects.filter(proyecto=proyecto).filter(
                referencia__in=DEMO_REFERENCIAS,
            )
            alt_count = demo_alts.count()
            valores_count = ValorEvaluacion.objects.filter(alternativa__in=demo_alts).count()
            demo_alts.delete()

            leaf_ids = set(self._leaf_nodes(proyecto).values_list('id', flat=True))
            nodos_revertidos = 0
            for nodo in NodoArbol.objects.filter(id__in=leaf_ids):
                if not _is_demo_leaf(nodo):
                    continue
                nodo.familia_funciones = ''
                nodo.tipo_criterio = ''
                nodo.tipo_dato = ''
                nodo.parametros_funcion = {}
                nodo.save(update_fields=[
                    'familia_funciones', 'tipo_criterio', 'tipo_dato', 'parametros_funcion',
                ])
                nodos_revertidos += 1

            configs_revertidos = 0
            for cfg in NodoArbolEscenario.objects.filter(
                nodo_arbol_id__in=leaf_ids,
                escenario__proyecto=proyecto,
            ):
                if not _is_demo_escenario_cfg(cfg):
                    continue
                cfg.familia_funciones = ''
                cfg.tipo_criterio = ''
                cfg.parametros_funcion = {}
                cfg.save(update_fields=['familia_funciones', 'tipo_criterio', 'parametros_funcion'])
                configs_revertidos += 1

            historial_count, _ = SimulacionHistorial.objects.filter(proyecto=proyecto).delete()

        return {
            'alternativas_eliminadas': alt_count,
            'valores_x_eliminados': valores_count,
            'nodos_hoja_revertidos': nodos_revertidos,
            'configs_escenario_revertidas': configs_revertidos,
            'historial_simulacion_eliminado': historial_count,
        }
