from django.db import migrations, models


def truncate_apodos(apps, schema_editor):
    Alternativa = apps.get_model('api', 'Alternativa')
    for alt in Alternativa.objects.exclude(apodo=''):
        if len(alt.apodo or '') > 8:
            alt.apodo = (alt.apodo or '')[:8]
            alt.save(update_fields=['apodo'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0037_alternativa_apodo'),
    ]

    operations = [
        migrations.RunPython(truncate_apodos, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='alternativa',
            name='apodo',
            field=models.CharField(
                blank=True,
                help_text='Nombre corto opcional para gráficos (máx. 8 caracteres).',
                max_length=8,
            ),
        ),
    ]
