from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_alter_grupoafinidad_mision_nullable'),
    ]

    operations = [
        migrations.CreateModel(
            name='ValorEvaluacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nivel', models.CharField(
                    choices=[
                        ('grupo_afinidad', 'Grupo de afinidad'),
                        ('mop', 'MOP'),
                        ('dp', 'DP'),
                    ],
                    max_length=16,
                )),
                ('nodo_id', models.PositiveIntegerField()),
                ('valor', models.TextField(blank=True, default='')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('alternativa', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='valores_evaluacion',
                    to='api.alternativa',
                )),
                ('escenario', models.ForeignKey(
                    blank=True,
                    help_text='Null = valor global (p. ej. costo/riesgo sin misión).',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='valores_evaluacion',
                    to='api.escenario',
                )),
            ],
            options={
                'verbose_name': 'Valor de evaluación',
                'verbose_name_plural': 'Valores de evaluación',
            },
        ),
        migrations.AddIndex(
            model_name='valorevaluacion',
            index=models.Index(fields=['alternativa', 'nivel', 'nodo_id'], name='api_valorev_alt_niv_idx'),
        ),
        migrations.AddConstraint(
            model_name='valorevaluacion',
            constraint=models.UniqueConstraint(
                fields=('alternativa', 'escenario', 'nivel', 'nodo_id'),
                name='uniq_valor_eval_alternativa_esc_nodo',
            ),
        ),
    ]
