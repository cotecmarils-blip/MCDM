"""Opciones de tipo de criterio y familias de funciones para MOP (modelo Atributo).

Las etiquetas de «Familias de funciones aplicadas» y su documentación matemática
están en ``api/familia_funciones_doc.py`` (mismo nombre visible que en la UI).
"""

TIPO_CRITERIO_CHOICES = [
    ('mas_es_mejor', 'Más es mejor'),
    ('menos_es_mejor', 'Menos es mejor'),
    (
        'menos_es_mejor_penalizacion',
        'Menos es mejor, con penalización potencialmente no lineal',
    ),
    ('valor_objetivo', 'Existe un valor objetivo'),
    ('intervalo_optimo', 'Existe un intervalo o punto optimo'),
    ('preferencia_categorias', 'Preferencia por categorías'),
]

FAMILIA_FUNCIONES_POR_TIPO = {
    'mas_es_mejor': [
        ('razon_relativa', 'Razón relativa'),
        ('min_max', 'Min-max'),
        ('meta_saturada', 'Meta saturada'),
        ('umbral_creciente', 'Umbral creciente'),
        ('exponencial_creciente', 'Exponencial creciente'),
    ],
    'menos_es_mejor': [
        ('razon_inversa', 'Razón inversa'),
        ('min_max_decreciente', 'Min-max decreciente'),
        ('umbral_decreciente', 'Umbral decreciente'),
        ('exponencial_decreciente', 'Exponencial decreciente'),
    ],
    'menos_es_mejor_penalizacion': [
        ('exponencial_decreciente', 'Exponencial decreciente'),
        ('logistica_decreciente', 'Logística decreciente'),
        ('umbral_veto', 'Umbral de veto'),
    ],
    'valor_objetivo': [
        ('funcion_saturada', 'Función saturada'),
        ('distancia_meta', 'Distancia a meta'),
    ],
    'intervalo_optimo': [
        ('triangular', 'Triangular'),
        ('trapezoidal', 'Trapezoidal'),
        ('distancia_ideal', 'Distancia al ideal'),
    ],
    'preferencia_categorias': [
        ('escalas_discretas', 'Escalas discretas'),
        ('funciones_tramos', 'Funciones por tramos'),
        ('tablas_equivalencia', 'Tablas de equivalencia'),
    ],
}

TIPO_CRITERIO_VALUES = {c[0] for c in TIPO_CRITERIO_CHOICES}

ALL_FAMILIA_FUNCIONES_CHOICES = sorted(
    {
        choice
        for choices in FAMILIA_FUNCIONES_POR_TIPO.values()
        for choice in choices
    },
    key=lambda c: c[1],
)


def familia_choices_for_tipo(tipo_criterio):
    return FAMILIA_FUNCIONES_POR_TIPO.get(tipo_criterio, [])


def familia_values_for_tipo(tipo_criterio):
    return {c[0] for c in familia_choices_for_tipo(tipo_criterio)}


def is_familia_valid_for_tipo(tipo_criterio, familia_funciones):
    if not tipo_criterio or not familia_funciones:
        return False
    return familia_funciones in familia_values_for_tipo(tipo_criterio)
