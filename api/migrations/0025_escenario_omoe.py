# Generated manually

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_valorevaluacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='escenario',
            name='omoe',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='escenarios',
                to='api.omoe',
                help_text='Dimensión a la que pertenece el escenario.',
            ),
        ),
    ]
