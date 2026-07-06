# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_atributo_tipo_criterio_familia'),
    ]

    operations = [
        migrations.AddField(
            model_name='atributo',
            name='parametros_funcion',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
