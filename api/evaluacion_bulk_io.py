"""Plantilla Excel para cargar valores de evaluación de todas las alternativas."""

from io import BytesIO

from django.db import transaction
from django.core.exceptions import ValidationError
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

from .evaluacion_service import (
    build_evaluacion_schema,
    export_label_for_column,
    load_valores_map,
    save_valores_bulk,
)
from .models import Alternativa, Proyecto


HEADER_FILL = PatternFill('solid', fgColor='17365D')


def build_evaluacion_template(proyecto: Proyecto) -> bytes:
    schema = build_evaluacion_schema(proyecto)
    columnas = schema.get('columnas') or []
    alternativas = list(proyecto.alternativas.order_by('id'))

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Evaluacion'
    sheet.freeze_panes = 'C3'

    headers = ['ID alternativa', 'Alternativa'] + [
        export_label_for_column(column) for column in columnas
    ]
    keys = ['__alternativa_id__', '__alternativa_nombre__'] + [
        column['key'] for column in columnas
    ]
    sheet.append(headers)
    sheet.append(keys)
    sheet.row_dimensions[2].hidden = True

    for cell in sheet[1]:
        cell.font = Font(color='FFFFFF', bold=True)
        cell.fill = HEADER_FILL

    for alternativa in alternativas:
        valores = load_valores_map(alternativa.id)
        sheet.append(
            [alternativa.id, alternativa.nombre]
            + [valores.get(column['key'], '') for column in columnas]
        )

    sheet.column_dimensions['A'].width = 16
    sheet.column_dimensions['B'].width = 30
    for index in range(3, len(headers) + 1):
        sheet.column_dimensions[sheet.cell(1, index).column_letter].width = 24

    instructions = workbook.create_sheet('Instrucciones')
    instructions.append(['Carga masiva de evaluación'])
    instructions['A1'].font = Font(bold=True, size=14)
    instructions.append([
        'Diligencia únicamente las celdas de valores en la hoja Evaluacion. '
        'No cambies los encabezados, IDs, nombres ni la fila técnica oculta.'
    ])
    instructions.append([
        'Al importar, los valores del archivo reemplazan la evaluación actual '
        'de cada alternativa incluida.'
    ])
    instructions.column_dimensions['A'].width = 110

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


@transaction.atomic
def import_evaluacion_template(proyecto: Proyecto, uploaded_file) -> dict:
    try:
        workbook = load_workbook(uploaded_file, data_only=True)
    except Exception as exc:
        raise ValidationError('El archivo no es un Excel .xlsx válido.') from exc

    if 'Evaluacion' not in workbook.sheetnames:
        raise ValidationError('El archivo no contiene la hoja Evaluacion.')
    sheet = workbook['Evaluacion']
    keys = [sheet.cell(2, index).value for index in range(1, sheet.max_column + 1)]
    if keys[:2] != ['__alternativa_id__', '__alternativa_nombre__']:
        raise ValidationError('La plantilla fue modificada y no conserva su estructura.')

    schema = build_evaluacion_schema(proyecto)
    valid_keys = {column['key'] for column in schema.get('columnas') or []}
    value_columns = [
        (index, key)
        for index, key in enumerate(keys[2:], start=3)
        if key in valid_keys
    ]
    if not value_columns:
        raise ValidationError('La plantilla no contiene columnas de evaluación válidas.')

    updated = 0
    values_saved = 0
    errors = []
    for row in range(3, sheet.max_row + 1):
        alternativa_id = sheet.cell(row, 1).value
        if alternativa_id in (None, ''):
            continue
        try:
            alternativa = Alternativa.objects.get(
                pk=int(alternativa_id),
                proyecto=proyecto,
            )
        except (Alternativa.DoesNotExist, TypeError, ValueError):
            errors.append(f'Fila {row}: la alternativa {alternativa_id} no pertenece al proyecto.')
            continue

        valores = {}
        for column_index, key in value_columns:
            raw = sheet.cell(row, column_index).value
            valores[key] = '' if raw is None else str(raw)
        save_valores_bulk(alternativa.id, valores)
        updated += 1
        values_saved += sum(1 for value in valores.values() if value != '')

    if errors:
        raise ValidationError(errors)
    return {
        'alternativas_actualizadas': updated,
        'valores_guardados': values_saved,
    }
