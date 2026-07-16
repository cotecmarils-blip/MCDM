import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0048_tipodimension_catalogo'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InformeProyectoJob',
            fields=[
                (
                    'id',
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    'estado',
                    models.CharField(
                        choices=[
                            ('pending', 'Pendiente'),
                            ('processing', 'Procesando'),
                            ('completed', 'Completado'),
                            ('error', 'Error'),
                        ],
                        default='pending',
                        max_length=16,
                    ),
                ),
                ('progreso', models.PositiveSmallIntegerField(default=0)),
                (
                    'etapa',
                    models.CharField(default='Preparando generación', max_length=160),
                ),
                ('incluir_pesos_mapas', models.BooleanField(default=False)),
                (
                    'archivo',
                    models.FileField(
                        blank=True,
                        max_length=255,
                        null=True,
                        upload_to='informes_proyecto/%Y/%m/%d/',
                    ),
                ),
                ('error', models.TextField(blank=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                (
                    'proyecto',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='informe_proyecto_jobs',
                        to='api.proyecto',
                    ),
                ),
                (
                    'usuario',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='informe_proyecto_jobs',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={'ordering': ['-fecha_creacion']},
        ),
    ]
