from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0028_migrar_arbol_legacy'),
    ]

    operations = [
        migrations.AddField(
            model_name='omoe',
            name='tipo_criterio',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='omoe',
            name='familia_funciones',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='omoe',
            name='parametros_funcion',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='omoe',
            name='unidad',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='omoe',
            name='tipo_dato',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='omoe',
            name='valor_umbral',
            field=models.DecimalField(
                blank=True, decimal_places=4, max_digits=14, null=True
            ),
        ),
        migrations.AddField(
            model_name='omoe',
            name='valor_meta',
            field=models.DecimalField(
                blank=True, decimal_places=4, max_digits=14, null=True
            ),
        ),
        migrations.AddField(
            model_name='omoe',
            name='sentido_mejora',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AlterField(
            model_name='valorevaluacion',
            name='nivel',
            field=models.CharField(
                blank=True,
                choices=[
                    ('grupo_afinidad', 'Grupo de afinidad'),
                    ('mop', 'MOP'),
                    ('dp', 'DP'),
                    ('nodo_arbol', 'Nodo del árbol'),
                    ('omoe', 'Dimensión'),
                ],
                default='',
                max_length=16,
            ),
        ),
    ]
