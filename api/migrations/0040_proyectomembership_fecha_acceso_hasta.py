from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0039_pesogrupoahp'),
    ]

    operations = [
        migrations.AddField(
            model_name='proyectomembership',
            name='fecha_acceso_hasta',
            field=models.DateTimeField(
                blank=True,
                help_text='Si se define, el acceso al proyecto vence en esta fecha/hora.',
                null=True,
            ),
        ),
    ]
