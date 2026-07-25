from docx import Document
from django.test import SimpleTestCase

from api.informe_math import _append_omml, _repair_omml, latex_to_omml_element


class InformeMathOmmlTests(SimpleTestCase):
    """Regresión: ecuaciones con \\bar / acentos deben quedar como OMML nativo.

    mathml2omml emite XML mal formado para overline/acentos (cierra
    <m:groupChrPr> con </m:groupChr>), lo que hacía que la ecuación (9) y
    similares cayeran a texto plano (LaTeX crudo visible en el Word).
    """

    def test_repair_corrige_groupchrpr(self):
        broken = (
            '<m:groupChr><m:groupChrPr><m:chr m:val="x"/>'
            '<m:pos m:val="top"/></m:groupChr><m:e/></m:groupChr>'
        )
        fixed = _repair_omml(broken)
        self.assertIn('</m:groupChrPr>', fixed)
        self.assertEqual(fixed.count('<m:groupChr>'), fixed.count('</m:groupChr>'))

    def test_ecuacion_9_es_omml_no_texto_plano(self):
        eq = (
            r'\bar{u}_j=\dfrac{\sum_{m=1}^{5} (p_m\cdot u_{jm})}'
            r'{\sum_{m=1}^{5} p_m}'
        )
        doc = Document()
        p = doc.add_paragraph()
        self.assertTrue(_append_omml(p, eq))
        xml = p._p.xml
        self.assertIn('oMath', xml)
        self.assertNotIn(r'\dfrac', xml)

    def test_acentos_convierten_a_omml(self):
        for eq in (r'\hat{x}', r'\vec{v}', r'\tilde{y}', r'\overline{z}'):
            el = latex_to_omml_element(eq)
            self.assertTrue(el.tag.endswith('oMath'), eq)
