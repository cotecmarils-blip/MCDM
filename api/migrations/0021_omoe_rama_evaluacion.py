from django.db import migrations, models


def copy_rama_from_grupos(apps, schema_editor):
    Omoe = apps.get_model('api', 'Omoe')
    GrupoAfinidad = apps.get_model('api', 'GrupoAfinidad')
    for omoe in Omoe.objects.all():
        ramas = (
            GrupoAfinidad.objects.filter(mision__omoe_id=omoe.id)
            .exclude(rama_evaluacion__in=('', 'auto'))
            .values_list('rama_evaluacion', flat=True)
            .distinct()
        )
        ramas = list(ramas)
        if len(ramas) == 1:
            omoe.rama_evaluacion = ramas[0]
            omoe.save(update_fields=['rama_evaluacion'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_grupoafinidad_rama_evaluacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='omoe',
            name='rama_evaluacion',
            field=models.CharField(
                choices=[
                    ('auto', 'Inferir automáticamente (por nombre)'),
                    ('omoe', 'OMOE — Efectividad / desempeño'),
                    ('omoc', 'OMOC — Costo'),
                    ('omor', 'OMOR — Riesgo'),
                ],
                default='omoe',
                help_text='Tipo de dimensión: OMOE, OMOC u OMOR.',
                max_length=8,
            ),
        ),
        migrations.RunPython(copy_rama_from_grupos, migrations.RunPython.noop),
    ]
