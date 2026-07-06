# Generated manually

from django.db import migrations, models

DEFAULT_NIVELES = (
    ('nivel_1', 'Nivel 1'),
    ('mop_1', 'MOP 1'),
    ('mop_2', 'MOP 2'),
    ('mop_3', 'MOP 3'),
    ('dp_1', 'DP 1'),
    ('dp_2', 'DP 2'),
    ('dp_3', 'DP 3'),
)

RAMAS = ('omoe', 'omoc', 'omor')


def seed_ramas_niveles(apps, schema_editor):
    Proyecto = apps.get_model('api', 'Proyecto')
    ProyectoNivelArbol = apps.get_model('api', 'ProyectoNivelArbol')

    for proyecto in Proyecto.objects.all().iterator():
        for rama in RAMAS:
            if ProyectoNivelArbol.objects.filter(proyecto_id=proyecto.id, rama_evaluacion=rama).exists():
                continue
            for orden, (codigo, nombre) in enumerate(DEFAULT_NIVELES, start=1):
                ProyectoNivelArbol.objects.create(
                    proyecto_id=proyecto.id,
                    rama_evaluacion=rama,
                    orden=orden,
                    codigo=codigo,
                    nombre=nombre,
                    activo=True,
                )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0034_tablas_riesgo_nodo'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='proyectonivelarbol',
            name='uniq_proyecto_nivel_arbol_orden',
        ),
        migrations.RemoveConstraint(
            model_name='proyectonivelarbol',
            name='uniq_proyecto_nivel_arbol_codigo',
        ),
        migrations.AddField(
            model_name='proyectonivelarbol',
            name='rama_evaluacion',
            field=models.CharField(
                choices=[
                    ('omoe', 'OMOE — Efectividad / desempeño'),
                    ('omoc', 'OMOC — Costo'),
                    ('omor', 'OMOR — Riesgo'),
                ],
                default='omoe',
                help_text='Rama de dimensión a la que aplica este nivel (por proyecto).',
                max_length=8,
            ),
        ),
        migrations.AlterField(
            model_name='proyectonivelarbol',
            name='orden',
            field=models.PositiveSmallIntegerField(
                help_text='Posición del nivel (1–9) bajo la dimensión.',
            ),
        ),
        migrations.AddConstraint(
            model_name='proyectonivelarbol',
            constraint=models.UniqueConstraint(
                fields=('proyecto', 'rama_evaluacion', 'orden'),
                name='uniq_proyecto_rama_nivel_arbol_orden',
            ),
        ),
        migrations.AddConstraint(
            model_name='proyectonivelarbol',
            constraint=models.UniqueConstraint(
                fields=('proyecto', 'rama_evaluacion', 'codigo'),
                name='uniq_proyecto_rama_nivel_arbol_codigo',
            ),
        ),
        migrations.AlterModelOptions(
            name='proyectonivelarbol',
            options={
                'ordering': ['proyecto_id', 'rama_evaluacion', 'orden'],
                'verbose_name': 'Nivel del árbol',
                'verbose_name_plural': 'Niveles del árbol',
            },
        ),
        migrations.RunPython(seed_ramas_niveles, migrations.RunPython.noop),
    ]
