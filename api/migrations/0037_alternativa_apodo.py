from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0036_modo_evaluacion_riesgo_nodo'),
    ]

    operations = [
        migrations.AddField(
            model_name='alternativa',
            name='apodo',
            field=models.CharField(
                blank=True,
                help_text='Nombre corto opcional para mostrar en gráficos.',
                max_length=80,
            ),
        ),
    ]
