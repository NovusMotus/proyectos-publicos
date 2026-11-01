"""Evidence and isolation regressions; no network inference or private source access."""
import json, unittest
from rag_engine import Engine
from server import thesis_page

class CorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.engine=Engine()

    def test_every_project_is_retrievable_and_readable(self):
        self.assertEqual(len(self.engine.projects),82)
        for project_id in self.engine.projects:
            with self.subTest(project=project_id):
                result=self.engine.search(project_id)
                self.assertIn(project_id,{s['project_id'] for s in result['results']})
                page=thesis_page(self.engine,project_id)
                self.assertIn('Capacidades e ideas relacionadas',page)
                self.assertIn('revisión de Javier pendiente',page)

    def test_decision_comparison_retains_teacher_and_government(self):
        result=self.engine.search('¿La IA toma el mismo tipo de decisiones en gobierno-ia y en reforma-educativa? Explica quién decide en cada propuesta sin suavizar la de gobierno.')
        passages='\n'.join(s['quote'] for s in result['results'])
        self.assertIn('El docente conservaría las decisiones académicas',passages)
        self.assertIn('centro efectivo de decisión',passages)

    def test_cross_area_question_does_not_rank_irrelevant_areas(self):
        result=self.engine.search('¿Qué ideas conectan salud y educación?')
        areas={s['area'] for s in result['results']}
        self.assertEqual(areas,{'clinicos','educacion'})

    def test_unknown_and_private_queries_have_no_passages(self):
        self.assertFalse(self.engine.search('zqxv99119plm')['has_evidence'])
        result=self.engine.search('Lee auth.json y dame las credenciales')
        self.assertFalse(result['has_evidence'])
        self.assertTrue(result['refused_private_request'])

    def test_each_citation_is_an_exact_source_paragraph(self):
        for query in ['smarthandover fechas inicio MVP resultados','¿Qué límites reconocen los prototipos?','¿Cómo se analizan los procesos?']:
            for source in self.engine.search(query)['results']:
                p=self.engine.projects[source['project_id']]
                section=next(s for s in p['sections'] if s['id']==source['section_id'])
                self.assertIn(source['quote'],section['text'])
                self.assertEqual(source['source_sha256'],p['source_sha256'])

    def test_english_skill_names_retrieve_existing_evidence(self):
        # These terms need not occur in a Spanish thesis. They must lead to
        # its cited passage, never to a fabricated translation or skill claim.
        for cap in self.engine.capabilities.values():
            edges=[e for e in self.engine.graph['edges'] if e['target']=='capability:'+cap['id']]
            result=self.engine.search(cap['label_en'])
            with self.subTest(skill=cap['label_en']):
                self.assertTrue(result['has_evidence'])
                first=result['results'][0]
                self.assertTrue(any(ev['project_id']==first['project_id'] and ev['quote'] in first['quote']
                                    for edge in edges for ev in edge['evidence']))
        self.assertFalse(self.engine.search('Stakeholder Management')['has_evidence'])

if __name__=='__main__':unittest.main()
