from decimal import Decimal

from django.db import migrations, models


def grupos_to_omoe(apps, schema_editor):
    GrupoAfinidad = apps.get_model('api', 'GrupoAfinidad')
    for grupo in GrupoAfinidad.objects.select_related('mision').all():
        if grupo.mision_id and not grupo.omoe_id:
            grupo.omoe_id = grupo.mision.omoe_id
            grupo.save(update_fields=['omoe_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_omoe_rama_evaluacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='grupoafinidad',
            name='omoe',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='grupos',
                to='api.omoe',
            ),
        ),
        migrations.RunPython(grupos_to_omoe, migrations.RunPython.noop),
        migrations.AddField(
            model_name='escenario',
            name='peso',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0'),
                max_digits=7,
            ),
        ),
        migrations.AddField(
            model_name='escenario',
            name='rama_evaluacion',
            field=models.CharField(
                choices=[
                    ('omoe', 'OMOE — Efectividad / desempeño'),
                    ('omoc', 'OMOC — Costo'),
                    ('omor', 'OMOR — Riesgo'),
                ],
                default='omoe',
                max_length=8,
            ),
        ),
        migrations.AddField(
            model_name='grupoafinidad',
            name='familia_funciones',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='grupoafinidad',
            name='parametros_funcion',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='grupoafinidad',
            name='tipo_mop',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
    ]
