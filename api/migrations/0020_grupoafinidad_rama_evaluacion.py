# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_auth_roles'),
    ]

    operations = [
        migrations.AddField(
            model_name='grupoafinidad',
            name='rama_evaluacion',
            field=models.CharField(
                choices=[
                    ('auto', 'Inferir automáticamente (por nombre)'),
                    ('omoe', 'OMOE — Efectividad / desempeño'),
                    ('omoc', 'OMOC — Costo'),
                    ('omor', 'OMOR — Riesgo'),
                ],
                default='auto',
                max_length=8,
            ),
        ),
    ]
