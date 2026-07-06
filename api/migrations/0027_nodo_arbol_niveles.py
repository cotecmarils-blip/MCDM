# Generated manually

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_escenario_estandar_data'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProyectoNivelArbol',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('orden', models.PositiveSmallIntegerField(help_text='Posición del nivel (1–7) bajo la dimensión.')),
                ('codigo', models.CharField(help_text='Identificador interno estable (p. ej. mop_1, dp_2).', max_length=32)),
                ('nombre', models.CharField(help_text='Nombre visible que define el administrador del proyecto.', max_length=128)),
                ('activo', models.BooleanField(default=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('proyecto', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='niveles_arbol', to='api.proyecto')),
            ],
            options={
                'verbose_name': 'Nivel del árbol',
                'verbose_name_plural': 'Niveles del árbol',
                'ordering': ['proyecto_id', 'orden'],
            },
        ),
        migrations.CreateModel(
            name='NodoArbol',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=255)),
                ('codigo', models.CharField(blank=True, max_length=64)),
                ('descripcion', models.TextField(blank=True)),
                ('peso', models.DecimalField(decimal_places=2, default=0, max_digits=7)),
                ('orden_visual', models.PositiveIntegerField(default=0)),
                ('aplica', models.BooleanField(default=True)),
                ('justificacion_peso', models.TextField(blank=True)),
                ('observaciones', models.TextField(blank=True)),
                ('tipo_criterio', models.CharField(blank=True, default='', max_length=64)),
                ('familia_funciones', models.CharField(blank=True, default='', max_length=64)),
                ('parametros_funcion', models.JSONField(blank=True, default=dict)),
                ('unidad', models.CharField(blank=True, max_length=64)),
                ('tipo_dato', models.CharField(blank=True, max_length=64)),
                ('valor_umbral', models.DecimalField(blank=True, decimal_places=4, max_digits=14, null=True)),
                ('valor_meta', models.DecimalField(blank=True, decimal_places=4, max_digits=14, null=True)),
                ('sentido_mejora', models.CharField(blank=True, max_length=64)),
                ('metodo_evaluacion', models.CharField(blank=True, max_length=128)),
                ('valor_minimo_utilidad', models.DecimalField(blank=True, decimal_places=4, max_digits=14, null=True)),
                ('valor_maximo_utilidad', models.DecimalField(blank=True, decimal_places=4, max_digits=14, null=True)),
                ('fuente_dato', models.CharField(blank=True, max_length=255)),
                ('evidencia_requerida', models.BooleanField(default=False)),
                ('tipo_evidencia', models.CharField(blank=True, max_length=128)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('omoe', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='nodos', to='api.omoe')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='hijos', to='api.nodoarbol')),
                ('tipo_nivel', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='nodos', to='api.proyectonivelarbol')),
            ],
            options={
                'verbose_name': 'Nodo del árbol',
                'verbose_name_plural': 'Nodos del árbol',
                'ordering': ['orden_visual', 'nombre', 'id'],
            },
        ),
        migrations.AddField(
            model_name='valorevaluacion',
            name='nodo_arbol',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='valores_evaluacion', to='api.nodoarbol'),
        ),
        migrations.AlterField(
            model_name='valorevaluacion',
            name='nivel',
            field=models.CharField(blank=True, choices=[('grupo_afinidad', 'Grupo de afinidad'), ('mop', 'MOP'), ('dp', 'DP'), ('nodo_arbol', 'Nodo del árbol')], default='', max_length=16),
        ),
        migrations.AlterField(
            model_name='valorevaluacion',
            name='nodo_id',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='proyectonivelarbol',
            constraint=models.UniqueConstraint(fields=('proyecto', 'orden'), name='uniq_proyecto_nivel_arbol_orden'),
        ),
        migrations.AddConstraint(
            model_name='proyectonivelarbol',
            constraint=models.UniqueConstraint(fields=('proyecto', 'codigo'), name='uniq_proyecto_nivel_arbol_codigo'),
        ),
    ]
