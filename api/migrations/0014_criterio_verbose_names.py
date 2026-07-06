# Generated manually — solo renombra verbose_name en admin

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_categoria_mop'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='atributo',
            options={'ordering': ['nombre'], 'verbose_name': 'MOP', 'verbose_name_plural': 'MOP'},
        ),
        migrations.AlterModelOptions(
            name='dimension',
            options={
                'ordering': ['nombre'],
                'verbose_name': 'Grupo de afinidad',
                'verbose_name_plural': 'Grupos de afinidad',
            },
        ),
        migrations.AlterModelOptions(
            name='subatributo',
            options={'ordering': ['nombre'], 'verbose_name': 'Atributo', 'verbose_name_plural': 'Atributos'},
        ),
    ]
