# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_criterio_verbose_names'),
    ]

    operations = [
        migrations.AddField(
            model_name='atributo',
            name='tipo_criterio',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='atributo',
            name='familia_funciones',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
    ]
