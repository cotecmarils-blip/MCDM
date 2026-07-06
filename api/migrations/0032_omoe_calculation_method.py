from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_simulacionhistorial_nombre'),
    ]

    operations = [
        migrations.AddField(
            model_name='omoe',
            name='calculation_method',
            field=models.CharField(
                default='MAVT',
                help_text='Método principal de cálculo: MAVT, MAUT, UTA o WEIGHTED_SUM.',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='omoe',
            name='calculation_config',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Configuración específica del método de cálculo (escenarios, preferencias, etc.).',
            ),
        ),
        migrations.AddField(
            model_name='omoe',
            name='enable_sensitivity_analysis',
            field=models.BooleanField(
                default=False,
                help_text='Habilita análisis de sensibilidad complementario sobre el método principal.',
            ),
        ),
    ]
