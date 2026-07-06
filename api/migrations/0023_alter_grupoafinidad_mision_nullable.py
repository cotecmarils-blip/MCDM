from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_grupo_omoe_escenario_rama_utilidad'),
    ]

    operations = [
        migrations.AlterField(
            model_name='grupoafinidad',
            name='mision',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='grupos',
                to='api.mision',
            ),
        ),
    ]
