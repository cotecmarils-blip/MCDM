from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0050_arbolbackup'),
    ]

    operations = [
        migrations.AddField(
            model_name='alternativa',
            name='activa',
            field=models.BooleanField(
                default=True,
                help_text='Determina si la alternativa participa por defecto en los cálculos.',
            ),
        ),
    ]
