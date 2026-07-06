"""
Demo: carga jerarquía y alternativas oceanográficas y muestra el ranking OMOE.
Ejecutar desde pyDecisionMaking:  python run_demo.py
"""
import json
import os
import sys

project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

from src.hierarchy import CriteriaHierarchy, MCDMEvaluator

SALIDAS = os.path.join(project_root, "..", "salidas")
HIERARCHY_JSON = os.path.join(SALIDAS, "oceanographic_hierarchy.json")
ALTERNATIVES_JSON = os.path.join(SALIDAS, "oceanographic_alternatives.json")


def main():
    print("=" * 60)
    print("  pyDecisionMaking — Demo Oceanographic Vessel Selection")
    print("=" * 60)

    for path, label in [(HIERARCHY_JSON, "jerarquía"), (ALTERNATIVES_JSON, "alternativas")]:
        if not os.path.isfile(path):
            print(f"\nERROR: No se encontró el archivo de {label}:\n  {path}")
            sys.exit(1)

    print(f"\n1. Cargando jerarquía desde:\n   {HIERARCHY_JSON}")
    hierarchy = CriteriaHierarchy.load_from_json(HIERARCHY_JSON)
    print(f"   Raíz: {hierarchy.root.name}")
    print(f"   Criterios principales: {[c.name for c in hierarchy.root.children]}")

    print("\n2. Validando jerarquía...")
    is_valid = hierarchy.validate_hierarchy()
    if is_valid:
        print("   OK — jerarquía lista para evaluar.")
    else:
        print("   ADVERTENCIA — errores de validación:")
        for err in hierarchy.validation_errors[:10]:
            print(f"     - {err}")
        if len(hierarchy.validation_errors) > 10:
            print(f"     ... y {len(hierarchy.validation_errors) - 10} más")

    print(f"\n3. Cargando alternativas desde:\n   {ALTERNATIVES_JSON}")
    with open(ALTERNATIVES_JSON, encoding="utf-8") as f:
        alternatives = json.load(f)
    print(f"   Alternativas: {list(alternatives.keys())}")

    print("\n4. Evaluando alternativas (OMOE)...")
    evaluator = MCDMEvaluator(alternatives)
    evaluator.add_model(hierarchy.root.name, hierarchy)

    matrix = evaluator.get_rating_matrix()
    scores = matrix[hierarchy.root.name].sort_values(ascending=False)

    print("\n" + "=" * 60)
    print("  RANKING (mayor puntuación = mejor)")
    print("=" * 60)
    for rank, (alt_name, score) in enumerate(scores.items(), start=1):
        bar = "#" * int(score * 40)
        print(f"  {rank}. {alt_name:<10}  {score:.4f}  {bar}")

    print("\n" + "=" * 60)
    print(f"  Ganador: {scores.index[0]}  (puntuación {scores.iloc[0]:.4f})")
    print("=" * 60)


if __name__ == "__main__":
    main()
