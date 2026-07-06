from decimal import Decimal

from rest_framework import serializers

from .models import (
    Proyecto,
    Requisito,
    Alternativa,
    Capacidad,
    Caracteristica,
    CaracteristicaPlantilla,
    Documento,
    Dimension,
    Atributo,
    Subatributo,
    Escenario,
    PesoEscenario,
    DocumentoCriterio,
)
from .validators import validate_peso_value
from .mop_criterio_choices import (
    TIPO_CRITERIO_VALUES,
    is_familia_valid_for_tipo,
)
from .mop_funcion_params import validate_parametros_funcion


class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Documento
        fields = ['id', 'alternativa', 'nombre', 'archivo', 'fecha_carga']
        read_only_fields = ['id', 'fecha_carga']


class CapacidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Capacidad
        fields = ['id', 'alternativa', 'nombre', 'descripcion']
        read_only_fields = ['id']


def _normalize_unidad(value):
    u = (value or '').strip()
    while u.startswith('[') and u.endswith(']'):
        u = u[1:-1].strip()
    return u


class CaracteristicaPlantillaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaracteristicaPlantilla
        fields = ['id', 'proyecto', 'nombre', 'unidad', 'orden', 'por_defecto']
        read_only_fields = ['id']

    def validate_unidad(self, value):
        return _normalize_unidad(value)


class CaracteristicaSerializer(serializers.ModelSerializer):
    plantilla_nombre = serializers.CharField(source='plantilla.nombre', read_only=True)
    plantilla_unidad = serializers.CharField(source='plantilla.unidad', read_only=True)
    plantilla_orden = serializers.IntegerField(source='plantilla.orden', read_only=True)

    class Meta:
        model = Caracteristica
        fields = [
            'id', 'alternativa', 'plantilla',
            'plantilla_nombre', 'plantilla_unidad', 'plantilla_orden', 'dato',
        ]
        read_only_fields = ['id']


class AlternativaSerializer(serializers.ModelSerializer):
    documentos = DocumentoSerializer(many=True, read_only=True)
    capacidades = CapacidadSerializer(many=True, read_only=True)
    caracteristicas = CaracteristicaSerializer(many=True, read_only=True)

    class Meta:
        model = Alternativa
        fields = [
            'id', 'proyecto', 'nombre', 'apodo', 'descripcion', 'referencia',
            'costo', 'costo_unidad', 'foto', 'anexo', 'documentos', 'capacidades', 'caracteristicas',
            'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'descripcion': {'allow_blank': True, 'required': False},
            'referencia': {'allow_blank': True, 'required': False},
            'apodo': {'allow_blank': True, 'required': False},
        }


class RequisitoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requisito
        fields = [
            'id', 'proyecto', 'codigo', 'titulo', 'descripcion', 'categoria',
            'prioridad', 'estado', 'criterio_aceptacion', 'observaciones', 'orden',
            'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'codigo': {'allow_blank': True, 'required': False},
            'descripcion': {'allow_blank': True, 'required': False},
            'categoria': {'allow_blank': True, 'required': False},
            'criterio_aceptacion': {'allow_blank': True, 'required': False},
            'observaciones': {'allow_blank': True, 'required': False},
        }


class ProyectoSerializer(serializers.ModelSerializer):
    alternativas = AlternativaSerializer(many=True, read_only=True)
    requisitos = RequisitoSerializer(many=True, read_only=True)

    class Meta:
        model = Proyecto
        fields = [
            'id', 'nombre', 'descripcion', 'foto',
            'eslora_maxima', 'desplazamiento', 'velocidad_maxima', 'velocidad_crucero',
            'tripulacion', 'autonomia', 'propulsion', 'posicionamiento_dinamico',
            'laboratorios', 'otras_caracteristicas',
            'alternativas', 'requisitos', 'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'descripcion': {'allow_blank': True, 'required': False},
        }


class ProyectoListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proyecto
        fields = [
            'id', 'nombre', 'descripcion', 'foto', 'eslora_maxima',
            'fecha_creacion',
        ]
        read_only_fields = ['id', 'fecha_creacion']


class DocumentoCriterioSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoCriterio
        fields = [
            'id', 'dimension', 'atributo', 'subatributo',
            'nombre', 'archivo', 'fecha_carga',
        ]
        read_only_fields = ['id', 'fecha_carga']

    def validate(self, attrs):
        parents = sum([
            bool(attrs.get('dimension')),
            bool(attrs.get('atributo')),
            bool(attrs.get('subatributo')),
        ])
        if parents != 1:
            raise serializers.ValidationError(
                'Debe indicar exactamente un padre: grupo de afinidad, MOP o atributo.'
            )
        return attrs


class SubatributoSerializer(serializers.ModelSerializer):
    documentos = DocumentoCriterioSerializer(many=True, read_only=True)

    class Meta:
        model = Subatributo
        fields = [
            'id', 'atributo', 'nombre', 'referencia', 'descripcion',
            'documentos', 'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'descripcion': {'allow_blank': True, 'required': False},
            'referencia': {'allow_blank': True, 'required': False},
        }


class AtributoSerializer(serializers.ModelSerializer):
    documentos = DocumentoCriterioSerializer(many=True, read_only=True)
    subatributos = SubatributoSerializer(many=True, read_only=True)

    class Meta:
        model = Atributo
        fields = [
            'id', 'dimension', 'nombre', 'referencia', 'descripcion',
            'tipo_criterio', 'familia_funciones', 'parametros_funcion',
            'documentos', 'subatributos', 'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'descripcion': {'allow_blank': True, 'required': False},
            'referencia': {'allow_blank': True, 'required': False},
        }

    def validate(self, attrs):
        tipo = attrs.get('tipo_criterio', getattr(self.instance, 'tipo_criterio', '') or '')
        familia = attrs.get(
            'familia_funciones',
            getattr(self.instance, 'familia_funciones', '') or '',
        )
        if tipo and tipo not in TIPO_CRITERIO_VALUES:
            raise serializers.ValidationError(
                {'tipo_criterio': 'Tipo de criterio no válido.'}
            )
        if tipo and not familia:
            raise serializers.ValidationError(
                {'familia_funciones': 'Seleccione una familia de funciones.'}
            )
        if familia and not is_familia_valid_for_tipo(tipo, familia):
            raise serializers.ValidationError(
                {'familia_funciones': 'La familia no corresponde al tipo de criterio seleccionado.'}
            )
        params_in = attrs.get('parametros_funcion')
        if params_in is not None or familia:
            merged_params = params_in
            if merged_params is None and self.instance:
                merged_params = self.instance.parametros_funcion or {}
            if merged_params is None:
                merged_params = {}
            attrs['parametros_funcion'] = validate_parametros_funcion(familia, merged_params)
        return attrs


class DimensionSerializer(serializers.ModelSerializer):
    documentos = DocumentoCriterioSerializer(many=True, read_only=True)
    atributos = AtributoSerializer(many=True, read_only=True)

    class Meta:
        model = Dimension
        fields = [
            'id', 'proyecto', 'nombre', 'referencia', 'descripcion',
            'documentos', 'atributos', 'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'descripcion': {'allow_blank': True, 'required': False},
            'referencia': {'allow_blank': True, 'required': False},
        }


class PesoEscenarioItemSerializer(serializers.Serializer):
    level = serializers.ChoiceField(choices=['dimension', 'atributo', 'subatributo'])
    id = serializers.IntegerField()
    peso = serializers.DecimalField(max_digits=5, decimal_places=2)

    def validate_peso(self, value):
        return validate_peso_value(value)


class PesoEscenarioSerializer(serializers.ModelSerializer):
    level = serializers.SerializerMethodField()
    node_id = serializers.SerializerMethodField()

    class Meta:
        model = PesoEscenario
        fields = ['id', 'escenario', 'level', 'node_id', 'peso']
        read_only_fields = fields

    def get_level(self, obj):
        if obj.dimension_id:
            return 'dimension'
        if obj.atributo_id:
            return 'atributo'
        return 'subatributo'

    def get_node_id(self, obj):
        if obj.dimension_id:
            return obj.dimension_id
        if obj.atributo_id:
            return obj.atributo_id
        return obj.subatributo_id


class EscenarioSerializer(serializers.ModelSerializer):
    omoe_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Escenario
        fields = [
            'id', 'proyecto', 'omoe', 'omoe_nombre', 'nombre', 'descripcion', 'peso',
            'rama_evaluacion', 'orden', 'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = [
            'id', 'rama_evaluacion', 'omoe_nombre', 'fecha_creacion', 'fecha_actualizacion',
        ]
        extra_kwargs = {
            'descripcion': {'allow_blank': True, 'required': False},
        }

    def get_omoe_nombre(self, obj):
        if obj.omoe_id:
            return obj.omoe.nombre_modelo or obj.omoe.codigo or f'Dimensión #{obj.omoe_id}'
        return None

    def _rama_from_omoe(self, omoe):
        from .models import Omoe

        if isinstance(omoe, int):
            omoe = Omoe.objects.filter(pk=omoe).first()
        if not omoe:
            return 'omoe'
        rama = (getattr(omoe, 'rama_evaluacion', None) or '').strip()
        if not rama or rama == 'auto':
            return 'omoe'
        return rama

    def validate(self, attrs):
        omoe = attrs.get('omoe')
        if omoe is None and self.instance is not None:
            omoe = self.instance.omoe
        if omoe is None:
            raise serializers.ValidationError({
                'omoe': 'Debe indicar la dimensión a la que pertenece el escenario.',
            })
        attrs['rama_evaluacion'] = self._rama_from_omoe(omoe)
        if not attrs.get('proyecto') and not getattr(self.instance, 'proyecto_id', None):
            attrs['proyecto'] = omoe.proyecto
        if attrs.get('peso') is None:
            from decimal import Decimal, ROUND_HALF_UP
            from .models import Escenario as EscenarioModel

            omoe_id = getattr(omoe, 'id', None) if omoe else getattr(
                self.instance, 'omoe_id', None
            )
            if omoe_id is not None:
                existing = EscenarioModel.objects.filter(omoe_id=omoe_id).count()
                if self.instance and self.instance.omoe_id == omoe_id:
                    existing = max(existing - 1, 0)
                if existing == 0:
                    attrs['peso'] = Decimal('100')
                else:
                    each = (Decimal('100') / (existing + 1)).quantize(
                        Decimal('0.01'), rounding=ROUND_HALF_UP
                    )
                    attrs['peso'] = each
            else:
                attrs['peso'] = Decimal('100')
        return attrs
