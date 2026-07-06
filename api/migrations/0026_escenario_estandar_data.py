# Generated manually

from decimal import Decimal

from django.db import migrations, models


def crear_escenarios_estandar(apps, schema_editor):
    Omoe = apps.get_model('api', 'Omoe')
    Escenario = apps.get_model('api', 'Escenario')
    for omoe in Omoe.objects.all():
        Escenario.objects.get_or_create(
            omoe_id=omoe.id,
            nombre='Estandar',
            defaults={
                'proyecto_id': omoe.proyecto_id,
                'descripcion': 'Escenario por defecto de la dimensión.',
                'peso': Decimal('100'),
                'rama_evaluacion': getattr(omoe, 'rama_evaluacion', None) or 'omoe',
                'orden': 0,
            },
        )


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ('api', '0025_escenario_omoe'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='escenario',
            name='uniq_escenario_proyecto_nombre',
        ),
        migrations.AddConstraint(
            model_name='escenario',
            constraint=models.UniqueConstraint(
                condition=models.Q(('omoe__isnull', True)),
                fields=('proyecto', 'nombre'),
                name='uniq_escenario_proyecto_nombre_sin_omoe',
            ),
        ),
        migrations.AddConstraint(
            model_name='escenario',
            constraint=models.UniqueConstraint(
                condition=models.Q(('omoe__isnull', False)),
                fields=('omoe', 'nombre'),
                name='uniq_escenario_omoe_nombre',
            ),
        ),
        migrations.RunPython(crear_escenarios_estandar, migrations.RunPython.noop),
    ]
