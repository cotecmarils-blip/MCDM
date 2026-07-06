"""Extrae código de los notebooks a módulos api/."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

with open(ROOT / '01_Pareto_Front_Computation.ipynb', encoding='utf-8') as f:
    nb1 = json.load(f)
pareto = ''.join(nb1['cells'][2]['source'])
(ROOT / 'api' / 'pareto_solver.py').write_text(
    '"""Frente de Pareto / alternativas no dominadas (notebook 01)."""\n\n' + pareto,
    encoding='utf-8',
)

norm = ''.join(nb1['cells'][35]['source'])
(ROOT / 'api' / 'matrix_normalizer.py').write_text(
    '"""Normalización de matriz de decisión (notebook 01)."""\n\n' + norm,
    encoding='utf-8',
)

with open(ROOT / '02_MADM_Methods.ipynb', encoding='utf-8') as f:
    nb2 = json.load(f)
wcalc = ''.join(nb2['cells'][39]['source'])
ranker = ''.join(nb2['cells'][41]['source'])
(ROOT / 'api' / 'madm_ranker.py').write_text(
    '"""Pesos y métodos MADM vía pyMCDM (notebook 02)."""\n\n' + wcalc + '\n\n' + ranker,
    encoding='utf-8',
)

print('OK')
