# Generated manually for requisito support

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_atributo_parametros_funcion'),
    ]

    operations = [
        migrations.CreateModel(
            name='Requisito',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.CharField(blank=True, max_length=64)),
                ('titulo', models.CharField(max_length=255)),
                ('descripcion', models.TextField(blank=True)),
                ('categoria', models.CharField(blank=True, max_length=128)),
                ('prioridad', models.CharField(choices=[('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta'), ('critica', 'Crítica')], default='media', max_length=16)),
                ('estado', models.CharField(choices=[('pendiente', 'Pendiente'), ('revision', 'En revisión'), ('validado', 'Validado'), ('implantado', 'Implantado')], default='pendiente', max_length=16)),
                ('criterio_aceptacion', models.TextField(blank=True)),
                ('observaciones', models.TextField(blank=True)),
                ('orden', models.PositiveIntegerField(default=0)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('proyecto', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='requisitos', to='api.proyecto')),
            ],
            options={
                'verbose_name': 'Requisito',
                'verbose_name_plural': 'Requisitos',
                'ordering': ['orden', 'id'],
            },
        ),
    ]
