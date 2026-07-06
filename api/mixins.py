from django.db import models
from rest_framework.permissions import IsAuthenticated

from .access import (
    filter_alternativas_by_access,
    filter_queryset_by_access,
    is_global_admin,
    user_alternativa_ids,
    user_proyecto_ids,
)
from .models import (
    Alternativa,
    Atributo,
    Capacidad,
    Caracteristica,
    CaracteristicaPlantilla,
    Dimension,
    Documento,
    DocumentoCriterio,
    DpCriterio,
    Escenario,
    GrupoAfinidad,
    Mision,
    MopCriterio,
    NodoArbol,
    Omoe,
    Proyecto,
    ProyectoMembership,
    Requisito,
    Subatributo,
    VopResultado,
)
from .permissions import ProyectoAccessPermission


class AuthScopedViewSetMixin:
    permission_classes = [IsAuthenticated, ProyectoAccessPermission]


class ProyectoScopedMixin(AuthScopedViewSetMixin):
    def filter_by_proyecto_param(self, queryset):
        user = self.request.user
        proyecto_id = self.request.query_params.get('proyecto')
        if proyecto_id:
            if not is_global_admin(user) and int(proyecto_id) not in user_proyecto_ids(user):
                return queryset.none()
            return queryset.filter(proyecto_id=proyecto_id)
        return filter_queryset_by_access(user, queryset, 'proyecto_id')


class AlternativaScopedMixin(AuthScopedViewSetMixin):
    def filter_by_alternativa_access(self, queryset):
        user = self.request.user
        proyecto_id = self.request.query_params.get('proyecto')
        alternativa_id = self.request.query_params.get('alternativa')
        if alternativa_id:
            alt = Alternativa.objects.filter(pk=alternativa_id).first()
            if alt is None:
                return queryset.none()
            if not is_global_admin(user) and alt.proyecto_id not in user_proyecto_ids(user):
                return queryset.none()
            membership_rol = None
            if not is_global_admin(user):
                m = ProyectoMembership.objects.filter(
                    usuario=user, proyecto_id=alt.proyecto_id, activo=True
                ).first()
                membership_rol = m.rol if m else None
            if membership_rol == ProyectoMembership.ROL_OFERTANTE:
                return queryset.none()
            return queryset.filter(alternativa_id=alternativa_id)
        if proyecto_id:
            alt_qs = Alternativa.objects.filter(proyecto_id=proyecto_id)
            alt_qs = filter_alternativas_by_access(user, alt_qs, int(proyecto_id))
            return queryset.filter(alternativa_id__in=alt_qs.values_list('id', flat=True))
        return filter_queryset_by_access(
            user,
            queryset,
            'alternativa__proyecto_id',
        )


def scoped_queryset_for_model(user, model, queryset, request):
    proyecto_id = request.query_params.get('proyecto')
    alternativa_id = request.query_params.get('alternativa')
    omoe_id = request.query_params.get('omoe') or request.query_params.get('parent_id')
    mision_id = request.query_params.get('mision') or (
        request.query_params.get('parent_id')
        if model is Mision
        else None
    )
    grupo_id = request.query_params.get('grupo_afinidad')
    mop_id = request.query_params.get('mop')
    dp_id = request.query_params.get('dp')
    dimension_id = request.query_params.get('dimension')
    atributo_id = request.query_params.get('atributo')
    subatributo_id = request.query_params.get('subatributo')
    escenario_id = request.query_params.get('escenario')

    if is_global_admin(user):
        qs = queryset
    elif model is Proyecto:
        qs = queryset.filter(id__in=user_proyecto_ids(user))
    elif model is Requisito:
        qs = filter_queryset_by_access(user, queryset, 'proyecto_id')
    elif model is Escenario:
        qs = filter_queryset_by_access(user, queryset, 'proyecto_id')
        ofertante_pids = ProyectoMembership.objects.filter(
            usuario=user, activo=True, rol=ProyectoMembership.ROL_OFERTANTE
        ).values_list('proyecto_id', flat=True)
        qs = qs.exclude(proyecto_id__in=ofertante_pids)
    elif model in {Dimension, CaracteristicaPlantilla, Omoe}:
        qs = filter_queryset_by_access(user, queryset, 'proyecto_id')
    elif model is Alternativa:
        qs = filter_alternativas_by_access(
            user, queryset, int(proyecto_id) if proyecto_id else None
        )
    elif model in {Capacidad, Caracteristica, Documento, VopResultado}:
        if alternativa_id:
            alt = Alternativa.objects.filter(pk=alternativa_id).first()
            if alt is None or (
                not is_global_admin(user)
                and alt.proyecto_id not in user_proyecto_ids(user)
            ):
                return queryset.none()
            membership = None
            if not is_global_admin(user):
                membership = ProyectoMembership.objects.filter(
                    usuario=user, proyecto_id=alt.proyecto_id, activo=True
                ).first()
            if membership and membership.rol == ProyectoMembership.ROL_OFERTANTE:
                return queryset.none()
            return queryset.filter(alternativa_id=alternativa_id)
        return filter_queryset_by_access(user, queryset, 'alternativa__proyecto_id')
    elif model is Mision:
        qs = filter_queryset_by_access(user, queryset, 'omoe__proyecto_id')
    elif model is GrupoAfinidad:
        qs = queryset
        if not is_global_admin(user):
            pids = user_proyecto_ids(user)
            qs = qs.filter(
                models.Q(omoe__proyecto_id__in=pids)
                | models.Q(mision__omoe__proyecto_id__in=pids)
            )
    elif model is MopCriterio:
        qs = queryset
        if not is_global_admin(user):
            pids = user_proyecto_ids(user)
            qs = qs.filter(
                models.Q(grupo_afinidad__omoe__proyecto_id__in=pids)
                | models.Q(grupo_afinidad__mision__omoe__proyecto_id__in=pids)
            )
    elif model is DpCriterio:
        qs = queryset
        if not is_global_admin(user):
            pids = user_proyecto_ids(user)
            qs = qs.filter(
                models.Q(mop__grupo_afinidad__omoe__proyecto_id__in=pids)
                | models.Q(mop__grupo_afinidad__mision__omoe__proyecto_id__in=pids)
            )
    elif model is NodoArbol:
        qs = filter_queryset_by_access(user, queryset, 'omoe__proyecto_id')
    elif model is Atributo:
        qs = filter_queryset_by_access(user, queryset, 'dimension__proyecto_id')
    elif model is Subatributo:
        qs = filter_queryset_by_access(user, queryset, 'atributo__dimension__proyecto_id')
    elif model is DocumentoCriterio:
        qs = queryset
        if not is_global_admin(user):
            pids = user_proyecto_ids(user)
            qs = qs.filter(
                models.Q(dimension__proyecto_id__in=pids)
                | models.Q(atributo__dimension__proyecto_id__in=pids)
                | models.Q(subatributo__atributo__dimension__proyecto_id__in=pids)
            )
    else:
        qs = queryset

    if proyecto_id and model not in {Proyecto, Alternativa, Requisito, Escenario}:
        field_map = {
            Dimension: 'proyecto_id',
            CaracteristicaPlantilla: 'proyecto_id',
            Omoe: 'proyecto_id',
            Alternativa: 'proyecto_id',
            Mision: 'omoe__proyecto_id',
            GrupoAfinidad: 'omoe__proyecto_id',
            MopCriterio: 'grupo_afinidad__omoe__proyecto_id',
            DpCriterio: 'mop__grupo_afinidad__omoe__proyecto_id',
            NodoArbol: 'omoe__proyecto_id',
            Atributo: 'dimension__proyecto_id',
            Subatributo: 'atributo__dimension__proyecto_id',
        }
        field = field_map.get(model)
        if field:
            qs = qs.filter(**{field: proyecto_id})

    if proyecto_id and model in {Requisito, Escenario}:
        qs = qs.filter(proyecto_id=proyecto_id)

    if omoe_id and model is Mision:
        qs = qs.filter(omoe_id=omoe_id)
    if omoe_id and model is GrupoAfinidad:
        qs = qs.filter(models.Q(omoe_id=omoe_id) | models.Q(mision__omoe_id=omoe_id))
    if omoe_id and model is NodoArbol:
        qs = qs.filter(omoe_id=omoe_id)
    if omoe_id and model is Escenario:
        qs = qs.filter(omoe_id=omoe_id)
    if mision_id and model is GrupoAfinidad:
        qs = qs.filter(mision_id=mision_id)
    if grupo_id and model is MopCriterio:
        qs = qs.filter(grupo_afinidad_id=grupo_id)
    if mop_id and model is DpCriterio:
        qs = qs.filter(mop_id=mop_id)
    if dimension_id and model is Atributo:
        qs = qs.filter(dimension_id=dimension_id)
    if atributo_id and model is Subatributo:
        qs = qs.filter(atributo_id=atributo_id)
    if dp_id and model is VopResultado:
        qs = qs.filter(dp_id=dp_id)
    if escenario_id:
        pass

    return qs
