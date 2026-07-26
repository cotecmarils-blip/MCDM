"""Eliminación segura de proyectos (respeta FK PROTECT de niveles del árbol)."""
from __future__ import annotations

from django.db import transaction

from .models import NodoArbol, Proyecto, ProyectoNivelArbol


@transaction.atomic
def delete_proyecto(proyecto: Proyecto) -> None:
    """Borra un proyecto y todo lo asociado.

    ``NodoArbol.tipo_nivel`` usa PROTECT hacia ``ProyectoNivelArbol``. Django no
    puede resolver el orden al borrar el proyecto de un golpe, así que primero
    se eliminan los nodos (y su config en cascada), luego los niveles y al final
    el proyecto.
    """
    NodoArbol.objects.filter(omoe__proyecto=proyecto).delete()
    ProyectoNivelArbol.objects.filter(proyecto=proyecto).delete()
    proyecto.delete()
