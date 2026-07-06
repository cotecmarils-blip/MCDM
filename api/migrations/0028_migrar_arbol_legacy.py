# Generated manually

from decimal import Decimal

from django.db import migrations


DEFAULT_NIVELES = (
    ('nivel_1', 'Nivel 1'),
    ('mop_1', 'MOP 1'),
    ('mop_2', 'MOP 2'),
    ('mop_3', 'MOP 3'),
    ('dp_1', 'DP 1'),
    ('dp_2', 'DP 2'),
    ('dp_3', 'DP 3'),
)


def _ensure_niveles(ProyectoNivelArbol, proyecto_id):
    by_orden = {}
    for orden, (codigo, nombre) in enumerate(DEFAULT_NIVELES, start=1):
        nivel, _ = ProyectoNivelArbol.objects.get_or_create(
            proyecto_id=proyecto_id,
            orden=orden,
            defaults={'codigo': codigo, 'nombre': nombre, 'activo': True},
        )
        by_orden[orden] = nivel
    return by_orden


def migrar_arbol_legacy(apps, schema_editor):
    Proyecto = apps.get_model('api', 'Proyecto')
    Omoe = apps.get_model('api', 'Omoe')
    GrupoAfinidad = apps.get_model('api', 'GrupoAfinidad')
    MopCriterio = apps.get_model('api', 'MopCriterio')
    DpCriterio = apps.get_model('api', 'DpCriterio')
    ProyectoNivelArbol = apps.get_model('api', 'ProyectoNivelArbol')
    NodoArbol = apps.get_model('api', 'NodoArbol')
    ValorEvaluacion = apps.get_model('api', 'ValorEvaluacion')

    niveles_por_proyecto = {}
    for proyecto in Proyecto.objects.all():
        niveles_por_proyecto[proyecto.id] = _ensure_niveles(ProyectoNivelArbol, proyecto.id)

    grupo_map = {}
    mop_map = {}
    dp_map = {}

    for omoe in Omoe.objects.select_related('proyecto').all():
        niveles = niveles_por_proyecto[omoe.proyecto_id]
        n1, n2, n5 = niveles[1], niveles[2], niveles[5]

        grupos = list(GrupoAfinidad.objects.filter(omoe_id=omoe.id))
        grupos += list(
            GrupoAfinidad.objects.filter(mision__omoe_id=omoe.id).select_related('mision')
        )
        for grupo in grupos:
            if grupo.id in grupo_map:
                continue
            node = NodoArbol.objects.create(
                omoe_id=omoe.id,
                parent_id=None,
                tipo_nivel_id=n1.id,
                nombre=grupo.nombre_grupo,
                codigo=grupo.codigo or '',
                descripcion=grupo.descripcion_funcional or '',
                peso=grupo.peso or Decimal('0'),
                orden_visual=grupo.orden_visual or 0,
                aplica=grupo.aplica,
                justificacion_peso=grupo.justificacion_peso or '',
                observaciones=grupo.observaciones or '',
                tipo_criterio=grupo.tipo_mop or '',
                familia_funciones=grupo.familia_funciones or '',
                parametros_funcion=grupo.parametros_funcion or {},
            )
            grupo_map[grupo.id] = node.id

        mops = list(MopCriterio.objects.filter(grupo_afinidad__omoe_id=omoe.id))
        mops += list(MopCriterio.objects.filter(grupo_afinidad__mision__omoe_id=omoe.id))
        for mop in mops:
            if mop.id in mop_map:
                continue
            parent_id = grupo_map.get(mop.grupo_afinidad_id)
            node = NodoArbol.objects.create(
                omoe_id=omoe.id,
                parent_id=parent_id,
                tipo_nivel_id=n2.id,
                nombre=mop.nombre_mop,
                codigo=mop.codigo or '',
                descripcion=mop.descripcion_indicador or '',
                peso=mop.peso or Decimal('0'),
                orden_visual=mop.orden_visual or 0,
                aplica=mop.aplica,
                observaciones=mop.observaciones or '',
                tipo_criterio=mop.tipo_mop or '',
                familia_funciones=mop.familia_funciones or '',
                parametros_funcion=mop.parametros_funcion or {},
                unidad=mop.unidad_medida or '',
                valor_umbral=mop.valor_umbral,
                valor_meta=mop.valor_meta,
                sentido_mejora=mop.sentido_mejora or '',
                metodo_evaluacion=mop.metodo_evaluacion or '',
                valor_minimo_utilidad=mop.valor_minimo_utilidad,
                valor_maximo_utilidad=mop.valor_maximo_utilidad,
                fuente_dato=mop.fuente_dato or '',
                evidencia_requerida=mop.evidencia_requerida,
            )
            mop_map[mop.id] = node.id

        dps = list(DpCriterio.objects.filter(mop__grupo_afinidad__omoe_id=omoe.id))
        dps += list(DpCriterio.objects.filter(mop__grupo_afinidad__mision__omoe_id=omoe.id))
        for dp in dps:
            if dp.id in dp_map:
                continue
            parent_id = mop_map.get(dp.mop_id)
            node = NodoArbol.objects.create(
                omoe_id=omoe.id,
                parent_id=parent_id,
                tipo_nivel_id=n5.id,
                nombre=dp.nombre_dp,
                codigo=dp.codigo or '',
                descripcion=dp.descripcion_tecnica or '',
                peso=dp.peso or Decimal('0'),
                orden_visual=dp.orden_visual or 0,
                observaciones=dp.observaciones or '',
                tipo_criterio='',
                familia_funciones=dp.familia_funciones or '',
                parametros_funcion=dp.parametros_funcion or {},
                unidad=dp.unidad or '',
                tipo_dato=dp.tipo_dato or '',
                valor_umbral=dp.valor_umbral,
                valor_meta=dp.valor_meta,
                sentido_mejora=dp.sentido_mejora or '',
                fuente_dato=dp.fuente_informacion or '',
                evidencia_requerida=dp.requiere_evidencia,
                tipo_evidencia=dp.tipo_evidencia or '',
            )
            dp_map[dp.id] = node.id

    legacy_map = {
        'grupo_afinidad': grupo_map,
        'mop': mop_map,
        'dp': dp_map,
    }
    for valor in ValorEvaluacion.objects.all():
        new_id = legacy_map.get(valor.nivel, {}).get(valor.nodo_id)
        if new_id:
            valor.nodo_arbol_id = new_id
            valor.nivel = 'nodo_arbol'
            valor.nodo_id = new_id
            valor.save(update_fields=['nodo_arbol_id', 'nivel', 'nodo_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0027_nodo_arbol_niveles'),
    ]

    operations = [
        migrations.RunPython(migrar_arbol_legacy, migrations.RunPython.noop),
    ]
