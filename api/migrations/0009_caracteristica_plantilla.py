# Generated manually for plantillas de características

import django.db.models.deletion
from django.db import migrations, models


def migrar_caracteristicas_a_plantillas(apps, schema_editor):
    Caracteristica = apps.get_model('api', 'Caracteristica')
    CaracteristicaPlantilla = apps.get_model('api', 'CaracteristicaPlantilla')

    for car in Caracteristica.objects.select_related('alternativa').all():
        nombre = getattr(car, 'nombre', None) or 'Sin nombre'
        proyecto_id = car.alternativa.proyecto_id
        plantilla, _ = CaracteristicaPlantilla.objects.get_or_create(
            proyecto_id=proyecto_id,
            nombre=nombre,
            defaults={'unidad': '', 'orden': 0, 'por_defecto': False},
        )
        car.plantilla_id = plantilla.id
        car.save(update_fields=['plantilla_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_remove_caracteristica_unidad'),
    ]

    operations = [
        migrations.CreateModel(
            name='CaracteristicaPlantilla',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=255)),
                ('unidad', models.CharField(blank=True, max_length=64)),
                ('orden', models.PositiveIntegerField(default=0)),
                ('por_defecto', models.BooleanField(
                    default=True,
                    help_text='Si está activa, se incluye al crear una nueva alternativa.',
                )),
                ('proyecto', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='caracteristicas_plantilla',
                    to='api.proyecto',
                )),
            ],
            options={
                'verbose_name': 'Plantilla de característica',
                'verbose_name_plural': 'Plantillas de características',
                'ordering': ['orden', 'id'],
            },
        ),
        migrations.AddConstraint(
            model_name='caracteristicaplantilla',
            constraint=models.UniqueConstraint(
                fields=('proyecto', 'nombre'),
                name='uniq_caracteristica_plantilla_proyecto_nombre',
            ),
        ),
        migrations.AddField(
            model_name='caracteristica',
            name='plantilla',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='valores',
                to='api.caracteristicaplantilla',
            ),
        ),
        migrations.RunPython(migrar_caracteristicas_a_plantillas, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='caracteristica',
            name='nombre',
        ),
        migrations.AlterField(
            model_name='caracteristica',
            name='plantilla',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='valores',
                to='api.caracteristicaplantilla',
            ),
        ),
        migrations.AlterModelOptions(
            name='caracteristica',
            options={
                'ordering': ['plantilla__orden', 'plantilla__id'],
                'verbose_name': 'Característica',
                'verbose_name_plural': 'Características',
            },
        ),
        migrations.AddConstraint(
            model_name='caracteristica',
            constraint=models.UniqueConstraint(
                fields=('alternativa', 'plantilla'),
                name='uniq_caracteristica_alternativa_plantilla',
            ),
        ),
    ]
