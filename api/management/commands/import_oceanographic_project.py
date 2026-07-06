"""
Crea un proyecto NUEVO y carga todo el contenido de los .json oceanográficos:
el árbol completo de criterios (3 dimensiones OMOE/OMOC/OMOR) y las alternativas
con todos sus valores.

Uso:
  python manage.py import_oceanographic_project
  python manage.py import_oceanographic_project --nombre "Buque oceanográfico"
  python manage.py import_oceanographic_project --reemplazar
  python manage.py import_oceanographic_project \
      --jerarquia salidas/oceanographic_hierarchy.json \
      --alternativas salidas/oceanographic_alternatives.json
"""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api.oceanographic_project_import import import_oceanographic_project

DEFAULT_HIERARCHY_JSON = Path('salidas/oceanographic_hierarchy.json')
DEFAULT_ALT_JSON = Path('salidas/oceanographic_alternatives.json')
DEFAULT_NOMBRE = 'Oceanographic Vessel Selection (demo)'


class Command(BaseCommand):
    help = 'Crea un proyecto nuevo con todo el contenido de los .json oceanográficos.'

    def add_arguments(self, parser):
        parser.add_argument('--nombre', type=str, default=DEFAULT_NOMBRE)
        parser.add_argument('--jerarquia', type=str, default=str(DEFAULT_HIERARCHY_JSON))
        parser.add_argument('--alternativas', type=str, default=str(DEFAULT_ALT_JSON))
        parser.add_argument(
            '--reemplazar',
            action='store_true',
            help='Elimina proyectos existentes con el mismo nombre antes de crear.',
        )
        parser.add_argument(
            '--usuario',
            action='append',
            dest='usuarios',
            help='Username al que dar acceso (repetible). Por defecto: todos los usuarios no-admin.',
        )
        parser.add_argument(
            '--rol',
            type=str,
            default=None,
            help='Rol de membresía a asignar (jefe, analista, evaluador, ofertante, auditor). '
                 'Por defecto se replica el rol habitual de cada usuario.',
        )
        parser.add_argument(
            '--sin-membresias',
            action='store_true',
            help='No asigna membresías (solo lo verían los administradores).',
        )

    def handle(self, *args, **options):
        hier_path = Path(options['jerarquia'])
        alt_path = Path(options['alternativas'])
        if not hier_path.is_file():
            raise CommandError(f'No se encontró la jerarquía: {hier_path}')
        if not alt_path.is_file():
            raise CommandError(f'No se encontró el archivo de alternativas: {alt_path}')

        try:
            result = import_oceanographic_project(
                options['nombre'],
                hier_path,
                alt_path,
                reemplazar=options['reemplazar'],
                asignar_membresias=not options['sin_membresias'],
                usuarios=options.get('usuarios'),
                rol=options.get('rol'),
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(
            f'Proyecto creado: id={result["proyecto_id"]} «{result["proyecto_nombre"]}»'
        ))
        for dim in result['dimensiones']:
            escenarios = dim.get('escenarios') or []
            self.stdout.write(
                f'  [{dim["rama"].upper()}] {dim["dimension"]} '
                f'(peso rel. {dim["peso_relativo"]:.2f}) -> '
                f'nodos={dim["nodos"]}, hojas={dim["hojas"]}, '
                f'escenarios={len(escenarios)}'
            )
            for esc in escenarios:
                self.stdout.write(
                    f'      · {esc["nombre"]} (peso {esc["peso"]:.2f}%, '
                    f'config={esc["configs"]})'
                )

        alt = result['alternativas']
        self.stdout.write(self.style.SUCCESS(
            f'Alternativas: {alt["alternativas"]} '
            f'(creadas={alt["creadas"]}, actualizadas={alt["actualizadas"]})'
        ))
        self.stdout.write(
            f'Valores guardados: {alt["valores_guardados"]} '
            f'(columnas en schema: {alt["columnas_schema"]})'
        )

        membresias = result.get('membresias') or []
        if membresias:
            usuarios = ', '.join(
                f'{m["usuario"]}({m["rol"]})' for m in membresias
            )
            self.stdout.write(self.style.SUCCESS(
                f'Acceso concedido a {len(membresias)} usuario(s): {usuarios}'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                'Sin membresías: solo los administradores verán el proyecto.'
            ))
