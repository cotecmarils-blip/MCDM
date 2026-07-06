from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0035_niveles_arbol_por_rama'),
    ]

    operations = [
        migrations.AddField(
            model_name='omoe',
            name='modo_evaluacion',
            field=models.CharField(
                blank=True,
                choices=[('certeza', 'Certeza'), ('incertidumbre', 'Incertidumbre')],
                default='certeza',
                help_text='Certeza: función de utilidad. Incertidumbre: riesgo (probabilidad × consecuencia).',
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name='omoe',
            name='consecuencia_descripciones',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Descripción de consecuencia por nivel (0.1, 0.3, …) cuando el modo es incertidumbre.',
            ),
        ),
        migrations.AddField(
            model_name='nodoarbol',
            name='modo_evaluacion',
            field=models.CharField(
                blank=True,
                choices=[('certeza', 'Certeza'), ('incertidumbre', 'Incertidumbre')],
                default='certeza',
                help_text='Certeza: función de utilidad. Incertidumbre: riesgo (probabilidad × consecuencia).',
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name='nodoarbol',
            name='consecuencia_descripciones',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Descripción de consecuencia por nivel (0.1, 0.3, …) cuando el modo es incertidumbre.',
            ),
        ),
    ]
