from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


DEFAULT_PROB = [
    (Decimal('0.1'), 'Remoto', 1),
    (Decimal('0.3'), 'Improbable', 2),
    (Decimal('0.5'), 'Probable', 3),
    (Decimal('0.7'), 'Altamente probable', 4),
    (Decimal('0.9'), 'Casi seguro', 5),
]

DEFAULT_IMP = [
    (
        Decimal('0.1'),
        'Consecuencia mínima o sin consecuencia sobre el desempeño técnico.',
        'Impacto mínimo o inexistente.',
        'Impacto mínimo o nulo en el presupuesto del proyecto.',
        1,
    ),
    (
        Decimal('0.3'),
        'Reducción mínima sobre el desempeño técnico, puede ser tolerado con un mínimo o insignificante impacto.',
        'Requerimiento de recursos adicionales. Puede cumplir plazos.',
        'Impacto requiere aumentar el presupuesto hasta en un 5%.',
        2,
    ),
    (
        Decimal('0.5'),
        'Reducción moderada sobre el desempeño técnico con limitado impacto sobre los objetivos del proyecto.',
        'Menor aplazamiento en hitos. No puede cumplir fechas requeridas.',
        'Impacto requiere aumentar el presupuesto hasta entre un 5% y 7%.',
        3,
    ),
    (
        Decimal('0.7'),
        'Reducción significativa sobre el desempeño técnico, podría poner en peligro el éxito del proyecto.',
        'Mayor aplazamiento en hitos o ruta crítica impactada.',
        'Impacto requiere aumentar el presupuesto hasta entre un 7% y 10%.',
        4,
    ),
    (
        Decimal('0.9'),
        'Reducción severa sobre el desempeño técnico; no puede alcanzar parámetros mínimos de desempeño.',
        'No puede cumplir con un hito importante del proyecto.',
        'Impacto requiere aumentar el presupuesto a más del 10%.',
        5,
    ),
]


def seed_tablas_riesgo(apps, schema_editor):
    Proyecto = apps.get_model('api', 'Proyecto')
    NivelProbabilidad = apps.get_model('api', 'NivelProbabilidad')
    NivelImpacto = apps.get_model('api', 'NivelImpacto')
    for proyecto in Proyecto.objects.all():
        if not NivelProbabilidad.objects.filter(proyecto_id=proyecto.id).exists():
            NivelProbabilidad.objects.bulk_create([
                NivelProbabilidad(
                    proyecto_id=proyecto.id,
                    valor=valor,
                    descripcion=desc,
                    orden=orden,
                )
                for valor, desc, orden in DEFAULT_PROB
            ])
        if not NivelImpacto.objects.filter(proyecto_id=proyecto.id).exists():
            NivelImpacto.objects.bulk_create([
                NivelImpacto(
                    proyecto_id=proyecto.id,
                    valor=valor,
                    descripcion_desempeno=desp,
                    descripcion_cronograma=cron,
                    descripcion_costo=costo,
                    orden=orden,
                )
                for valor, desp, cron, costo, orden in DEFAULT_IMP
            ])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0033_nodoarbolescenario'),
    ]

    operations = [
        migrations.CreateModel(
            name='NivelProbabilidad',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('valor', models.DecimalField(decimal_places=2, help_text='Nivel numérico (p. ej. 0.1, 0.3, 0.5).', max_digits=4)),
                ('descripcion', models.CharField(max_length=255)),
                ('orden', models.PositiveSmallIntegerField(default=0)),
                ('proyecto', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='niveles_probabilidad', to='api.proyecto')),
            ],
            options={
                'verbose_name': 'Nivel de probabilidad',
                'verbose_name_plural': 'Niveles de probabilidad',
                'ordering': ['proyecto_id', 'orden', 'valor'],
            },
        ),
        migrations.CreateModel(
            name='NivelImpacto',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('valor', models.DecimalField(decimal_places=2, max_digits=4)),
                ('descripcion_desempeno', models.TextField(blank=True)),
                ('descripcion_cronograma', models.TextField(blank=True)),
                ('descripcion_costo', models.TextField(blank=True)),
                ('orden', models.PositiveSmallIntegerField(default=0)),
                ('proyecto', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='niveles_impacto', to='api.proyecto')),
            ],
            options={
                'verbose_name': 'Nivel de impacto',
                'verbose_name_plural': 'Niveles de impacto',
                'ordering': ['proyecto_id', 'orden', 'valor'],
            },
        ),
        migrations.AddConstraint(
            model_name='nivelprobabilidad',
            constraint=models.UniqueConstraint(fields=('proyecto', 'valor'), name='uniq_proyecto_nivel_probabilidad_valor'),
        ),
        migrations.AddConstraint(
            model_name='nivelimpacto',
            constraint=models.UniqueConstraint(fields=('proyecto', 'valor'), name='uniq_proyecto_nivel_impacto_valor'),
        ),
        migrations.AddField(
            model_name='nodoarbol',
            name='nivel_impacto',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='nodos_arbol', to='api.nivelimpacto'),
        ),
        migrations.AddField(
            model_name='nodoarbol',
            name='nivel_probabilidad',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='nodos_arbol', to='api.nivelprobabilidad'),
        ),
        migrations.AddField(
            model_name='nodoarbol',
            name='tipo_consecuencia',
            field=models.CharField(blank=True, choices=[('desempeno', 'Desempeño'), ('cronograma', 'Cronograma'), ('costo', 'Costo')], default='desempeno', max_length=16),
        ),
        migrations.AddField(
            model_name='nodoarbolescenario',
            name='nivel_impacto',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='configs_nodo_escenario', to='api.nivelimpacto'),
        ),
        migrations.AddField(
            model_name='nodoarbolescenario',
            name='nivel_probabilidad',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='configs_nodo_escenario', to='api.nivelprobabilidad'),
        ),
        migrations.AddField(
            model_name='nodoarbolescenario',
            name='tipo_consecuencia',
            field=models.CharField(blank=True, choices=[('desempeno', 'Desempeño'), ('cronograma', 'Cronograma'), ('costo', 'Costo')], default='desempeno', max_length=16),
        ),
        migrations.RunPython(seed_tablas_riesgo, migrations.RunPython.noop),
    ]
