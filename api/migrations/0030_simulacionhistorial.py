from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0029_omoe_evaluable_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='SimulacionHistorial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(blank=True, default='', max_length=200)),
                ('resultado', models.JSONField()),
                ('ganador_nombre', models.CharField(blank=True, default='', max_length=200)),
                ('ganador_valor_global', models.DecimalField(blank=True, decimal_places=6, max_digits=12, null=True)),
                ('num_alternativas', models.PositiveSmallIntegerField(default=0)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='simulaciones_historial', to=settings.AUTH_USER_MODEL)),
                ('proyecto', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='simulaciones_historial', to='api.proyecto')),
            ],
            options={
                'verbose_name': 'Historial de simulación',
                'verbose_name_plural': 'Historial de simulaciones',
                'ordering': ['-fecha_creacion', '-id'],
            },
        ),
    ]
