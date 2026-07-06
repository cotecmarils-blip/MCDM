"""
Importa alternativas y valores desde salidas/oceanographic_alternatives.json.

Opcionalmente crea la dimensión demo con hojas nombradas como en el JSON de jerarquía
para que los valores se puedan mapear en Evaluación.

Uso:
  python manage.py import_oceanographic_alternatives --proyecto-id 3 --limpiar
  python manage.py import_oceanographic_alternatives --proyecto-id 3 --con-arbol-demo
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.evaluacion_service import import_alternativas_from_json
from api.models import Alternativa, Omoe, Proyecto, ValorEvaluacion
from api.oceanographic_import import (
    OCEAN_OMOE_CODIGO,
    OCEAN_ESCENARIO_NOMBRE,
    ensure_oceanographic_eval_nodes,
    sync_oceanographic_constantes_escenario,
)

DEFAULT_ALT_JSON = Path('salidas/oceanographic_alternatives.json')
DEFAULT_HIERARCHY_JSON = Path('salidas/oceanographic_hierarchy.json')
IMPORT_REFERENCIA = 'oceanographic-demo'


class Command(BaseCommand):
    help = 'Importa alternativas Ship_* desde oceanographic_alternatives.json'

    def add_arguments(self, parser):
        parser.add_argument('--proyecto-id', type=int, default=3)
        parser.add_argument('--archivo', type=str, default=str(DEFAULT_ALT_JSON))
        parser.add_argument('--jerarquia', type=str, default=str(DEFAULT_HIERARCHY_JSON))
        parser.add_argument(
            '--con-arbol-demo',
            action='store_true',
            help='(Opcional) Crea dimensión demo oceanográfica — no usar en producción BICM',
        )
        parser.add_argument(
            '--reemplazar-arbol',
            action='store_true',
            help='Borra y recrea las hojas de la dimensión demo oceanográfica',
        )
        parser.add_argument(
            '--limpiar',
            action='store_true',
            help='Elimina alternativas importadas y la dimensión demo oceanográfica',
        )

    def handle(self, *args, **options):
        proyecto_id = options['proyecto_id']
        try:
            proyecto = Proyecto.objects.get(pk=proyecto_id)
        except Proyecto.DoesNotExist as exc:
            raise CommandError(f'Proyecto {proyecto_id} no existe.') from exc

        if options['limpiar']:
            self._limpiar(proyecto)
            return

        alt_path = Path(options['archivo'])
        if not alt_path.is_file():
            raise CommandError(f'No se encontró el archivo: {alt_path}')

        with alt_path.open(encoding='utf-8') as f:
            data = json.load(f)

        if not isinstance(data, dict) or not data:
            raise CommandError('El JSON de alternativas debe ser un objeto no vacío.')

        arbol_info = None
        if options['con_arbol_demo']:
            hier_path = Path(options['jerarquia'])
            if not hier_path.is_file():
                raise CommandError(f'No se encontró la jerarquía: {hier_path}')
            arbol_info = ensure_oceanographic_eval_nodes(
                proyecto,
                hier_path,
                replace=options['reemplazar_arbol'],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'Dimensión demo: omoe={arbol_info["omoe_id"]}, '
                    f'hojas nuevas={arbol_info["hojas_creadas"]}/{arbol_info["atributos"]}, '
                    f'constantes en escenario={arbol_info["constantes_escenario"]}'
                )
            )
        elif Path(options['jerarquia']).is_file():
            omoe = Omoe.objects.filter(proyecto=proyecto, codigo=OCEAN_OMOE_CODIGO).first()
            if omoe:
                escenario = omoe.escenarios.filter(nombre=OCEAN_ESCENARIO_NOMBRE).first()
                if escenario:
                    stats = sync_oceanographic_constantes_escenario(escenario, Path(options['jerarquia']))
                    self.stdout.write(
                        f'Constantes actualizadas en escenario: {stats["constantes_escenario"]}'
                    )

        with transaction.atomic():
            result = import_alternativas_from_json(proyecto, data, update_existing=True)

        self.stdout.write(self.style.SUCCESS(
            f'Alternativas: {result["alternativas"]} '
            f'(creadas={result["creadas"]}, actualizadas={result["actualizadas"]})'
        ))
        self.stdout.write(
            f'Valores guardados: {result["valores_guardados"]} '
            f'(columnas en schema: {result["columnas_schema"]})'
        )

        if result['valores_guardados'] == 0 and options['con_arbol_demo'] is False:
            self.stdout.write(self.style.WARNING(
                'No se mapeó ningún valor al árbol BICM. Los JSON oceanográficos '
                'no coinciden con los criterios del proyecto; use el módulo Evaluación '
                'o importe datos alineados con su árbol.'
            ))

    def _limpiar(self, proyecto: Proyecto):
        with transaction.atomic():
            alts = Alternativa.objects.filter(
                proyecto=proyecto,
                referencia=IMPORT_REFERENCIA,
            )
            alt_ids = list(alts.values_list('id', flat=True))
            valores_deleted, _ = ValorEvaluacion.objects.filter(
                alternativa_id__in=alt_ids
            ).delete()
            alts_deleted, _ = alts.delete()

            omoe = Omoe.objects.filter(proyecto=proyecto, codigo=OCEAN_OMOE_CODIGO).first()
            nodos_deleted = 0
            omoe_deleted = 0
            if omoe:
                nodos_deleted, _ = omoe.nodos.all().delete()
                esc_deleted, _ = omoe.escenarios.all().delete()
                omoe_deleted, _ = Omoe.objects.filter(pk=omoe.id).delete()
                self.stdout.write(f'Escenarios demo eliminados: {esc_deleted}')

        self.stdout.write(self.style.SUCCESS(
            f'Limpieza: {alts_deleted} alternativas, {valores_deleted} valores, '
            f'{nodos_deleted} nodos demo, {omoe_deleted} dimensión demo'
        ))
