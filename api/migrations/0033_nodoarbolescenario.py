from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_omoe_calculation_method'),
    ]

    operations = [
        migrations.CreateModel(
            name='NodoArbolEscenario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('peso', models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=7)),
                ('aplica', models.BooleanField(default=True)),
                ('tipo_criterio', models.CharField(blank=True, default='', max_length=64)),
                ('familia_funciones', models.CharField(blank=True, default='', max_length=64)),
                ('parametros_funcion', models.JSONField(blank=True, default=dict)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('escenario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='configs_nodo_arbol',
                    to='api.escenario',
                )),
                ('nodo_arbol', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='configs_escenario',
                    to='api.nodoarbol',
                )),
            ],
            options={
                'verbose_name': 'Configuración nodo por escenario',
                'verbose_name_plural': 'Configuraciones nodo por escenario',
            },
        ),
        migrations.AddConstraint(
            model_name='nodoarbolescenario',
            constraint=models.UniqueConstraint(
                fields=('escenario', 'nodo_arbol'),
                name='uniq_nodo_arbol_escenario',
            ),
        ),
    ]
