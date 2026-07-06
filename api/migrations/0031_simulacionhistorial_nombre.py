from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_simulacionhistorial'),
    ]

    operations = [
        migrations.AddField(
            model_name='simulacionhistorial',
            name='nombre',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='Nombre del cálculo'),
        ),
    ]
