"""Rebuild the curated semantic annotations from the public candidate only.

Standard library only. No generator, private source, network, inventory, or
repository is consulted. Selections are editorial interpretations awaiting
Javier's review. A capability edge is an invitation to examine a passage,
never an assessment, credential, or measurement of the person.

Run: python build_annotations.py [--check]
The source lock rejects silent corpus changes. To update it, review the new
public text and its attribution before changing this script and the lock.
"""
from __future__ import annotations

import argparse, os
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

APP = Path(__file__).resolve().parent
SOURCE = Path(os.environ.get("PORTFOLIO_TESIS_REPO", str(APP.parent.parent / "portfolio-tesis"))).resolve()
OUTPUT = APP / "content/annotations.json"
NOTES = APP / "review/corpus_author_notes.json"
CREATED_AT = "2026-10-15T17:29:40Z"
MODEL = "no_confirmado"
SCHEMA_VERSION = 1

CAPABILITIES = [
    {
        "id": "analisis-procesos",
        "label": "Resolución de problemas",
        "description": "Permite explorar la definición de un problema mediante el análisis de procesos. Pasajes para conversar sobre cómo se descompone una tarea y se relacionan información, estados y responsabilidades. No acredita desempeño profesional. No afirma que el problema esté resuelto.",
        "label_en": "Problem Solving",
        "category": "Transversal",
        "original_label": "Análisis de procesos",
        "aliases": [
            "Análisis de procesos",
            "Problem-solving"
        ],
        "terminology_basis": "linkedin_usage_verified",
        "terminology_source": "https://www.linkedin.com/business/learning/blog/top-skills-and-courses/most-in-demand-skills"
    },
    {
        "id": "delimitacion-alcance",
        "label": "Definición del alcance",
        "description": "Decisiones o propuestas documentadas que separan funciones y fijan qué se quiere abordar. Permite preguntar por límites y alternativas, sin evaluar a la persona.",
        "label_en": "Scope Definition",
        "category": "Metodológica",
        "original_label": "Delimitación de alcance",
        "aliases": [
            "Delimitación de alcance"
        ],
        "terminology_basis": "editorial_professional_term",
        "terminology_source": ""
    },
    {
        "id": "comparacion-criterios",
        "label": "Pensamiento crítico",
        "description": "Pasajes para revisar qué condiciones se conservan al comparar opciones y qué datos faltan. No demuestra calidad de una elección ni resultados.",
        "label_en": "Critical Thinking",
        "category": "Transversal",
        "original_label": "Comparación con criterios",
        "aliases": [
            "Comparación con criterios"
        ],
        "terminology_basis": "linkedin_usage_verified",
        "terminology_source": "https://www.linkedin.com/learning/critical-thinking"
    },
    {
        "id": "relacion-componentes",
        "label": "Pensamiento sistémico",
        "description": "Propuestas sobre dependencias, funciones o consecuencias entre partes de un sistema. Sirve para explorar razonamiento documentado, sin acreditar una arquitectura operativa.",
        "label_en": "Systems Thinking",
        "category": "Transversal",
        "original_label": "Relación entre componentes",
        "aliases": [
            "Relación entre componentes"
        ],
        "terminology_basis": "linkedin_usage_verified",
        "terminology_source": "https://www.linkedin.com/learning/systems-thinking"
    },
    {
        "id": "adaptacion-mecanismos",
        "label": "Pensamiento creativo",
        "description": "Propuestas que trasladan una herramienta, formato o referencia a otra tarea. Invita a examinar qué se conserva y qué necesita contraste; no prueba transferencia efectiva.",
        "label_en": "Creative Thinking",
        "category": "Transversal",
        "original_label": "Adaptación de mecanismos",
        "aliases": [
            "Adaptación de mecanismos",
            "Creatividad"
        ],
        "terminology_basis": "linkedin_usage_verified",
        "terminology_source": "https://www.linkedin.com/learning/how-to-make-creative-thinking-a-habit"
    },
    {
        "id": "revision-iteracion",
        "label": "Revisión e iteración",
        "description": "Pasajes que describen selección, corrección o cambio de una representación. Invita a revisar decisiones concretas, sin inferir un rasgo personal o una mejora medida.",
        "label_en": "Review and Iteration",
        "category": "Metodológica",
        "original_label": "Revisión e iteración",
        "aliases": [
            "Revisión e iteración"
        ],
        "terminology_basis": "editorial_professional_term",
        "terminology_source": ""
    },
    {
        "id": "documentacion-trazable",
        "label": "Documentación",
        "description": "Decisiones sobre cobertura, versiones, atribución o reserva de materiales. Permite conversar sobre cómo justificar una afirmación; no equivale a una auditoría completa.",
        "label_en": "Documentation",
        "category": "Metodológica",
        "original_label": "Documentación con procedencia",
        "aliases": [
            "Documentación con procedencia"
        ],
        "terminology_basis": "editorial_professional_term",
        "terminology_source": ""
    },
    {
        "id": "diseno-interaccion",
        "label": "Diseño de interacción",
        "description": "Propuestas atribuidas sobre una experiencia, recorrido o actividad. Permite preguntar cómo se relaciona intención e interfaz, sin acreditar usabilidad o eficacia.",
        "label_en": "Interaction Design",
        "category": "Técnica",
        "original_label": "Diseño de interacción",
        "aliases": [
            "Diseño de interacción"
        ],
        "terminology_basis": "editorial_professional_term",
        "terminology_source": ""
    },
    {
        "id": "exploracion-herramientas",
        "label": "Exploración de herramientas",
        "description": "Prácticas declaradas o experimentos dirigidos con ayuda de IA. Son puntos para reconstruir objetivos, decisiones y límites, sin acreditar programación autónoma, despliegue o dominio técnico.",
        "label_en": "Tool Exploration",
        "category": "Práctica exploratoria",
        "original_label": "Exploración dirigida de herramientas",
        "aliases": [
            "Exploración dirigida de herramientas"
        ],
        "terminology_basis": "editorial_professional_term",
        "terminology_source": ""
    },
    {
        "id": "comunicacion-proposito",
        "label": "Comunicación",
        "description": "Pasajes que delimitan qué se pretende explicar y cómo conservar significado o atribución. Invita a examinar una decisión de comunicación, sin medir una habilidad interpersonal.",
        "label_en": "Communication",
        "category": "Transversal",
        "original_label": "Comunicación con propósito",
        "aliases": [
            "Comunicación con propósito"
        ],
        "terminology_basis": "linkedin_usage_verified",
        "terminology_source": "https://www.linkedin.com/business/learning/blog/top-skills-and-courses/most-in-demand-skills"
    }
]

# Public terminology context is kept outside the thesis evidence. Never read
# CVs, application records or the private profile to compile this app.
RECRUITING = json.loads((APP / "content/recruiting_context.json").read_text(encoding="utf-8"))
assert set(RECRUITING["capabilities"]) == {c["id"] for c in CAPABILITIES}
for capability in CAPABILITIES:
    context = RECRUITING["capabilities"][capability["id"]]
    capability["recruiting_context"] = {
        "date": RECRUITING["date"], "origin": "comparacion_editorial_ia",
        "roles": context["roles"], "text": context["text"],
        "sources": [RECRUITING["sources"][key] for key in context["sources"]],
    }

TOPICS = [
    {"id": "continuidad-clinica", "label": "Continuidad de información entre turnos y niveles"},
    {"id": "estados-responsabilidad", "label": "Estados de una tarea y responsabilidad de actualización"},
    {"id": "localizacion-espacial", "label": "Localizar referencias y recorrer espacios"},
    {"id": "autoridad-decision", "label": "Quién decide y cómo participa cada actor"},
    {"id": "integracion-sustitucion", "label": "Integración y sustitución de componentes"},
    {"id": "practica-feedback", "label": "Práctica, error y revisión del aprendizaje"},
    {"id": "evidencia-procedencia", "label": "Afirmaciones vinculadas a documentos y procedencia"},
    {"id": "comparabilidad-opciones", "label": "Condiciones equivalentes al comparar opciones"},
    {"id": "agentes-funciones", "label": "Funciones y contextos separados entre agentes"},
    {"id": "automatizacion-excepciones", "label": "Automatización, excepciones y trabajo que permanece"},
    {"id": "operacion-entrega", "label": "Entrega, operación y mantenimiento de un servicio"},
    {"id": "canal-destinatario", "label": "Relación entre canal, destinatario y oferta"},
    {"id": "representacion-interactiva", "label": "Representación navegable frente a funcionamiento real"},
    {"id": "narrativa-mecanicas", "label": "Narrativa, reglas y consecuencias de juego"},
    {"id": "coherencia-creativa", "label": "Referencias, variantes y coherencia creativa"},
    {"id": "eventos-conciliacion", "label": "Eventos, cortes temporales y conciliación financiera"},
    {"id": "senal-incertidumbre", "label": "Datos, señales e incertidumbre"},
    {"id": "trayectoria-requisitos", "label": "Trayectoria propia frente a requisitos de acceso"},
    {"id": "explicacion-razonamiento", "label": "Explicar contenido y acompañar el razonamiento"},
    {"id": "pregunta-investigacion", "label": "Formular una pregunta antes de elegir una solución"},
    {"id": "privacidad-atribucion", "label": "Límites de privacidad y atribución pública"},
    {"id": "revision-hipotesis", "label": "Revisar una hipótesis sin inventar decisiones"},
    {"id": "comunicacion-audiovisual", "label": "Función de una pieza audiovisual"},
    {"id": "produccion-material", "label": "Pieza, fabricación y condiciones de uso"},
]

# Hand-curated project -> idea map. Each reason is about the text, not the person.
# The exact purpose sentence is selected from TL;DR; corpus hashes prevent a
# different sentence from silently acquiring these interpretations on rebuild.
IDEAS = {
    "almacen-hospital": [("localizacion-espacial", "La propuesta relaciona la búsqueda de una referencia con su ubicación."), ("estados-responsabilidad", "Localizar y reponer son funciones distintas del alcance descrito.")],
    "auditoria-flujos-clinicos": [("estados-responsabilidad", "El objeto es comprender un proceso clínico acotado, sin dar por realizada una auditoría."), ("pregunta-investigacion", "El servicio se mantiene como exploración de un alcance que aún debe definirse.")],
    "auditoria-retrospectiva": [("evidencia-procedencia", "El análisis retrospectivo se organiza alrededor de evidencia documental."), ("agentes-funciones", "La tesis separa análisis, documentación y revisión como diseño de flujo.")],
    "barrera-curas-sacras": [("pregunta-investigacion", "La línea pregunta por existencia o fabricación antes de fijar un dispositivo."), ("produccion-material", "La función buscada de una barrera requiere investigación de diseño y uso, todavía pendientes.")],
    "carro-paradas": [("localizacion-espacial", "La consulta se refiere a ubicación del material de un carro."), ("practica-feedback", "El propósito incluye practicar localización, sin acreditar competencia clínica.")],
    "chiarezza": [("explicacion-razonamiento", "Explicar un informe exige conservar su significado, sin añadir una conclusión clínica."), ("senal-incertidumbre", "La incertidumbre expresada por el informe forma parte del contenido que se quiere conservar.")],
    "comision-ia": [("autoridad-decision", "El cauce propuesto distribuye participación y valoración de iniciativas."), ("estados-responsabilidad", "El enfoque propone dos órganos complementarios e incluye mejoras que no necesiten IA.")],
    "ehr-interfaz": [("continuidad-clinica", "La transferencia de información entre niveles es un objetivo explícito."), ("integracion-sustitucion", "La navegación se examina junto a requisitos de integración y servicios aprovechables.")],
    "jev-clinico": [("pregunta-investigacion", "Las preguntas clínicas se delimitan mediante casos sintéticos y respuestas tipadas."), ("senal-incertidumbre", "El diseño distingue categorías y una respuesta de información insuficiente.")],
    "orientacion-hospital": [("localizacion-espacial", "El propósito se centra en recorridos comprensibles y accesibles."), ("representacion-interactiva", "La guía se presenta como una propuesta de representación, sin uso hospitalario acreditado.")],
    "smarthandover": [("continuidad-clinica", "El propósito relaciona información y tareas pendientes durante el relevo asistencial."), ("estados-responsabilidad", "El flujo relaciona cada registro con su contexto y distingue lo anotado de lo pendiente.")],
    "tfm-tecnologias-salud": [("continuidad-clinica", "El antecedente académico incluye continuidad de información clínica."), ("comunicacion-audiovisual", "Las redes y tecnologías digitales se estudian como formatos adaptables a salud.")],
    "analisis-cultural-editorial": [("pregunta-investigacion", "La continuidad de franquicias y el relevo creativo se plantean como preguntas de investigación."), ("revision-hipotesis", "La analogía e hipótesis no se convierten en causalidad demostrada.")],
    "ciencia-perdida": [("narrativa-mecanicas", "La recuperación de conocimiento se explora como ficción y mecánica de personaje."), ("coherencia-creativa", "La valoración de una prueba se relaciona con el universo y preferencias atribuidos a Javier.")],
    "juegos-cartas-mecanicas": [("narrativa-mecanicas", "El concepto se centra en un juego de cartas individual orientado al disfrute."), ("operacion-entrega", "La monetización contenida forma parte del concepto de juego individual.")],
    "lidia": [("narrativa-mecanicas", "Las decisiones sobre tecnología sanitaria se exploran mediante narración interactiva."), ("autoridad-decision", "El juego permite preguntar por la relación entre ayuda tecnológica y decisión humana.")],
    "one-piece-teoria": [("pregunta-investigacion", "La tesis relaciona motivos narrativos, números y música como hipótesis."), ("coherencia-creativa", "Las conexiones narrativas requieren distinguir referencias e interpretación.")],
    "triaje-colapso": [("narrativa-mecanicas", "El juego representa decisiones mediante recursos, mantenimiento y consecuencias diferidas."), ("estados-responsabilidad", "Las consecuencias se sitúan en un sistema de gestión, sin simular toda la realidad sanitaria.")],
    "videos-prototipos": [("comunicacion-audiovisual", "La pieza audiovisual explica ideas o funciones y puede atribuir estados al proyecto."), ("evidencia-procedencia", "Cada pieza se relaciona con proyecto y versión; la autoría concreta requiere registros.")],
    "zeclana": [("coherencia-creativa", "El diseño busca conservar personaje y expresiones entre piezas digitales.")],
    "alojamiento-larga-estancia": [("comparabilidad-opciones", "La comparación incorpora servicios domésticos que un precio de habitación puede omitir.")],
    "busqueda-empleo": [("trayectoria-requisitos", "La adaptación de candidaturas conserva la diferencia entre experiencia propia y requisitos."), ("privacidad-atribucion", "La base de terceros y las afirmaciones personales necesitan atribución y revisión.")],
    "casos-producto-candidaturas": [("trayectoria-requisitos", "Los casos son materiales preparados para candidaturas, sin acreditar empleo o contratación."), ("explicacion-razonamiento", "El propósito es hacer visible razonamiento de producto mediante casos para candidaturas.")],
    "doctorado-china": [("trayectoria-requisitos", "El encaje de una vía doctoral depende de una línea de investigación y requisitos concretos."), ("comparabilidad-opciones", "La comparación propuesta incluye programa, documentación, financiación y residencia.")],
    "doctorado-china-antecedente": [("revision-hipotesis", "La línea examina cómo cambia una investigación entre documentos."), ("evidencia-procedencia", "Comparar versiones no supone que la versión más extensa tenga mayor calidad.")],
    "entrevistas-metodo": [("trayectoria-requisitos", "La preparación conserva la diferencia entre experiencia propia y consejos externos."), ("privacidad-atribucion", "Los consejos externos no se transforman en experiencia personal.")],
    "idioma-healthtech": [("trayectoria-requisitos", "La exploración relaciona idioma y posibles vías profesionales en tecnología sanitaria.")],
    "jams-formacion": [("practica-feedback", "La propuesta añade práctica y revisión de decisiones a formación de adultos."), ("explicacion-razonamiento", "La propuesta combina reto, trabajo asincrónico, presentación y revisión del proceso.")],
    "ope-baremacion": [("evidencia-procedencia", "Los baremos y escenarios conservan la fuente de los datos."), ("senal-incertidumbre", "La organización de escenarios no equivale a una clasificación oficial.")],
    "oposiciones-enfermeria": [("practica-feedback", "La práctica diaria propone seguimiento de errores y progreso.")],
    "reforma-educativa": [("practica-feedback", "El diseño distingue dominio esperado y tiempo necesario para aprender."), ("autoridad-decision", "El apoyo personalizado se sitúa dentro de un modelo con función docente conservada.")],
    "tutor-familias": [("explicacion-razonamiento", "El tutor pretende acompañar el razonamiento y distinguir ayuda de comprensión."), ("practica-feedback", "El enfoque incluye seguimiento de dificultades y práctica posterior.")],
    "bot-mercados": [("senal-incertidumbre", "Los experimentos separan datos y señales."), ("automatizacion-excepciones", "El texto distingue ejecución y señales como etapas diferentes.")],
    "bot-meteorologia": [("senal-incertidumbre", "Se contrastan probabilidades meteorológicas y preguntas de mercados como hipótesis.")],
    "conexiones-financieras": [("evidencia-procedencia", "El pasaje diferencia disponer de acceso a una fuente y haber leído o guardado un dato."), ("estados-responsabilidad", "Una lectura completada y un dato guardado son estados distintos.")],
    "consolidacion-fiscal": [("eventos-conciliacion", "La consolidación relaciona operaciones del ejercicio y cálculos."), ("evidencia-procedencia", "El propósito conserva relación entre documentos originales y derivados.")],
    "cribado-financiero": [("senal-incertidumbre", "Un filtro financiero tiene variables incluidas y omitidas."), ("comparabilidad-opciones", "El indicador se examina bajo condiciones comparables, sin seleccionar inversiones.")],
    "finanzas-personales-app": [("eventos-conciliacion", "Reunir información exige separar fuentes, saldos y movimientos."), ("estados-responsabilidad", "Fuentes, saldos, movimientos y decisiones se mantienen como informaciones distintas.")],
    "fiscalidad-estancias-laborales": [("pregunta-investigacion", "La línea delimita preguntas sobre estancias y desplazamientos profesionales."), ("comparabilidad-opciones", "Los escenarios requieren conservar condiciones distintas sin resolver el caso fiscal personal.")],
    "gestion-financiera-metodo": [("revision-hipotesis", "El método hace explícitos objetivos, horizontes y motivos para revisar decisiones."), ("evidencia-procedencia", "Las herramientas se presentan como ayuda para organizar evidencias y comprobar consistencia.")],
    "historial-activos-metodo": [("eventos-conciliacion", "El historial diferencia eventos y sus representaciones para conciliarlos.")],
    "inventario-activos-metodo": [("eventos-conciliacion", "El inventario conserva una fecha de corte y diferencias entre fuentes.")],
    "robotica-cadena-valor": [("integracion-sustitucion", "El objeto son componentes, integraciones y dependencias de sistemas robóticos.")],
    "gobierno-ia": [("autoridad-decision", "La IA ocupa un centro efectivo de decisión, junto a mecanismos de participación ciudadana."), ("agentes-funciones", "Council se propone como cauce de análisis de iniciativas, dentro de una tesis conceptual.")],
    "archivo-documental": [("evidencia-procedencia", "El archivo relaciona documentos, periodos y derivados."), ("privacidad-atribucion", "La ficha limita los datos económicos publicados y distingue inventario de cumplimiento contable.")],
    "perfil-contexto": [("evidencia-procedencia", "El contexto debe conservar estados de revisión y evitar logros no comprobados."), ("privacidad-atribucion", "La cobertura del contexto no decide que todo su contenido sea público.")],
    "preparacion-proyectos": [("evidencia-procedencia", "La documentación propone versiones y atribución de las ayudas de IA."), ("privacidad-atribucion", "La organización diferencia tesis públicas, proyectos públicos y material reservado.")],
    "tareas-programadas-agentes": [("agentes-funciones", "El objeto es documentar seguimiento y tareas programadas en ChatGPT."), ("automatizacion-excepciones", "Documentar una tarea observada no acredita ejecución exitosa o conexión con un servidor.")],
    "alojamiento-rural-concepto": [("operacion-entrega", "El alojamiento mediante módulos o cápsulas sigue como concepto de implantación y operación."), ("produccion-material", "La representación de un módulo no resuelve sus condiciones físicas de uso.")],
    "canales-distribucion": [("canal-destinatario", "El intermediario se estudia por su función al localizar, comprender y recibir una oferta.")],
    "cartera-no-sanitaria": [("comparabilidad-opciones", "La comparación conserva actividades diferentes y sus entregas."), ("operacion-entrega", "Seguimiento, vigilancia y ocio implican responsabilidades operativas distintas.")],
    "celdas-negocio": [("canal-destinatario", "La necesidad y mecanismo de entrega se relacionan con alternativas del destinatario."), ("comparabilidad-opciones", "La matriz debe incluir sustitutos, sin demostrar mercado por su existencia.")],
    "centro-datos": [("operacion-entrega", "Alquiler de suelo, alojamiento de equipos y capacidad propia son actividades diferentes."), ("comparabilidad-opciones", "Las opciones se distinguen por el papel y las responsabilidades, sin viabilidad cerrada.")],
    "chocolate-3d": [("produccion-material", "El objeto es personalización de decoración mediante impresión de chocolate."), ("operacion-entrega", "El acabado, la conservación y las condiciones alimentarias siguen pendientes de ensayo.")],
    "comercio-local-virtual": [("representacion-interactiva", "La idea enlaza una representación digital de un negocio local con información."), ("comunicacion-audiovisual", "La pieza audiovisual aporta una función de presentación que debe estudiarse.")],
    "comparacion-iniciativas": [("comparabilidad-opciones", "La tesis reúne tres líneas diferentes para compararlas.")],
    "evolucion-hipotesis-negocio": [("revision-hipotesis", "La idea de servicio cambia ante alternativas, requisitos o dependencias nuevas."), ("canal-destinatario", "Revisar encaje puede cambiar destinatario o entrega sin demostrar mercado.")],
    "ideas-aparcadas": [("revision-hipotesis", "Las exploraciones conservan incógnitas y condiciones para retomarse."), ("produccion-material", "Bebidas, repostería y recursos personalizados siguen sin producción acreditada.")],
    "impresion-uv": [("produccion-material", "La línea explora personalización y componentes, incluidos usos ligados a juegos."), ("operacion-entrega", "Las variantes de componentes, servicio y alquiler requieren delimitar responsabilidades.")],
    "instalacion-asic": [("operacion-entrega", "Se comparan instalación propia y alojamiento externo como opciones de operación."), ("comparabilidad-opciones", "Compartir un emplazamiento no iguala minería y capacidad de IA.")],
    "modelos-negocio-discovery": [("pregunta-investigacion", "Un ejemplo llamativo se convierte en pregunta sobre actividad y entrega."), ("operacion-entrega", "Describir un anuncio no demuestra cómo opera un servicio.")],
    "perfume-dispensacion": [("operacion-entrega", "La aplicación se investiga como servicio en un local de ocio."), ("produccion-material", "Producto, dispositivo y condiciones del lugar requieren comprobaciones distintas.")],
    "servicios-digitales-practica": [("automatizacion-excepciones", "El objeto incluye procedimientos y automatización, sin ejecución completa reconstruida."), ("practica-feedback", "La práctica se distingue de producto y servicio contratado.")],
    "servicios-online": [("automatizacion-excepciones", "Se comparan herramientas según el trabajo que conservan."), ("operacion-entrega", "Construcción, distribución y operación necesitan alcances diferenciados.")],
    "tecnologia-china-espana": [("integracion-sustitucion", "La aplicación en otro entorno exige estudiar producto, integración y mantenimiento."), ("pregunta-investigacion", "La exploración no acredita importación o integración realizadas.")],
    "tres-vias-desarrollo": [("comparabilidad-opciones", "La comparación reúne mantenimiento de plugins, financiación y una herramienta documental."), ("operacion-entrega", "Cada vía conserva sus tareas y condiciones, sin actividad contratada acreditada.")],
    "video-inmobiliario": [("comunicacion-audiovisual", "El vídeo se explora como forma de presentar inmuebles, incluida generación desde fotografías."), ("operacion-entrega", "La práctica audiovisual y el posible servicio requieren evidencias diferentes.")],
    "adopcion-digital": [("comparabilidad-opciones", "La edición propone comparar recorridos y dependencias sin atribuir carencias personales a una etapa manual."), ("estados-responsabilidad", "El recorrido completo incluye integración y transición, además de una demostración aislada.")],
    "albacete-3d": [("representacion-interactiva", "La demo propone navegación urbana con información asociada."), ("localizacion-espacial", "Los lugares y recorridos son parte de la experiencia representada.")],
    "automatizacion-oficios": [("automatizacion-excepciones", "Se separan tareas automatizables y las que requieren presencia o criterio.")],
    "buzon-mejoras": [("autoridad-decision", "Las sugerencias de trabajadores se transforman en análisis para valoración organizativa."), ("privacidad-atribucion", "El cauce de sugerencias requiere protección de identidad y condiciones de uso.")],
    "caso-analitica-salud": [("evidencia-procedencia", "El caso conserva fuentes y restricciones de un análisis en salud."), ("pregunta-investigacion", "El alcance se delimita sin atribuir servicio o cliente.")],
    "caso-documentacion-clinica": [("evidencia-procedencia", "La documentación clínica constituye el objeto de análisis del caso."), ("agentes-funciones", "Las salidas de Council son material documental, sin caso repetido o validado.")],
    "caso-informacion-empresa": [("evidencia-procedencia", "El caso organiza información empresarial sin acreditar relación contractual."), ("agentes-funciones", "Las entradas y salidas de Council tienen límites de atribución.")],
    "caso-manual-cardiologia": [("evidencia-procedencia", "La revisión documental del manual se describe como caso de Council."), ("agentes-funciones", "La organización del caso no equivale a revisión clínica validada.")],
    "caso-scoring": [("senal-incertidumbre", "El caso hace visibles criterios y supuestos de una puntuación."), ("evidencia-procedencia", "La explicitación de reglas no acredita una clasificación validada.")],
    "council": [("agentes-funciones", "El diseño distribuye análisis, documentación y revisión entre funciones."), ("evidencia-procedencia", "La búsqueda de fuentes y contradicciones es un requisito de diseño, sin eficacia demostrada.")],
    "council-historico": [("agentes-funciones", "El antecedente conserva flujos de análisis entre herramientas y modelos."), ("evidencia-procedencia", "La evolución se reconstruye por materiales conservados, sin ejecución actual.")],
    "gemelos-urbanos": [("representacion-interactiva", "La investigación pregunta cuándo una representación ayuda a una tarea concreta.")],
    "narrativa-herramientas": [("evidencia-procedencia", "La extracción y los grafos requieren conservar procedencia."), ("pregunta-investigacion", "El diseño distingue datos recuperados e interpretación del investigador.")],
    "practica-agentes-servidor-personal": [("agentes-funciones", "La ficha conserva práctica declarada con agentes y una intención de servidor propio."), ("automatizacion-excepciones", "La intención y la compra no acreditan servicios desplegados.")],
    "senales-investigacion-online": [("pregunta-investigacion", "Las publicaciones se usan como origen de preguntas, aplicaciones o práctica."), ("revision-hipotesis", "El contenido anunciado necesita contraste antes de decidir sobre una aplicación.")],
}

# Extra exact excerpts used when a purpose sentence would be insufficient.
# Key -> (exact heading, exact quote). Literal quotes are checked in that section.
PASSAGES = {
    "reforma-educativa": {
        "decision": ("Enfoque del proyecto y propuesta de esta versión", "El alumnado trabajaría con apoyo de una herramienta anclada al currículo y el docente distribuiría su atención dentro de las horas de su grupo."),
        "criterio": ("Punto de partida y pregunta de esta línea", "Javier plantea que dedicar el mismo tiempo a una materia no implica alcanzar el mismo dominio y que una calificación puede depender de condiciones de aprendizaje distintas."),
    },
    "gobierno-ia": {
        "decision": ("Enfoque del proyecto y propuesta de esta versión", "La posición expresada por Javier sitúa a la IA como centro efectivo de decisión y a personas como representantes y ejecutores en el mundo físico. No se limita a un sistema que aconseje a un gobierno humano."),
        "council": ("Enfoque del proyecto y propuesta de esta versión", "Council recibiría propuestas con apoyos ciudadanos, prepararía su análisis y facilitaría consultas o votaciones."),
    },
    "almacen-hospital": {"limite": ("Enfoque del proyecto y propuesta de esta versión", "Javier ha separado esta línea del carro de paradas.")},
    "orientacion-hospital": {"limite": ("Enfoque del proyecto y propuesta de esta versión", "Javier distingue la guía de orientación del carro y del almacén.")},
    "carro-paradas": {"diseno": ("Enfoque del proyecto y propuesta de esta versión", "Javier define el alcance formativo y las particularidades que conoce; las herramientas de IA ayudan a construir las representaciones.")},
    "chiarezza": {"comunicar": ("Conservar el significado al cambiar la forma de explicarlo", "El interés de Javier es que una persona pueda leer una explicación de su informe sin recibir una conclusión clínica distinta.")},
    "comision-ia": {"funciones": ("Enfoque del proyecto y propuesta de esta versión", "Javier propone funciones complementarias para una comisión de IA y un comité de intraemprendimiento. El diseño incluye participación de todos los estamentos, un canal de propuestas y acompañamiento del desarrollo. Una mejora puede ser tecnológica, organizativa o formativa; no tiene que incorporar IA.")},
    "ehr-interfaz": {"criterio": ("Enfoque del proyecto y propuesta de esta versión", "El enfoque de Javier es diseñar con los profesionales, preservar datos y servicios aprovechables, y exigir demostraciones de integración.")},
    "smarthandover": {"flujo": ("Enfoque del proyecto y propuesta de esta versión", "La aportación de Javier se sitúa en el diseño del problema y del flujo asistencial, con construcción asistida por IA.")},
    "tfm-tecnologias-salud": {"adaptacion": ("El alcance original incluye comunicación y adaptación de herramientas", "El TFM de Javier estudia redes sociales y tecnologías digitales como puntos de partida para aplicaciones en salud. Su alcance incluye comunicación, redes profesionales, formatos audiovisuales, videojuegos y blockchain. La continuidad de información clínica es una parte de esa exploración y no el contenido íntegro del trabajo. El original plantea trasladar usos observados a otro ámbito, una forma de razonar que Javier mantiene al explicar el portfolio.")},
    "ciencia-perdida": {"revision": ("Del concepto a una prueba local", "El proyecto recoge una prueba de Javier con Playground que, según su valoración, no satisfacía aspecto, combate o fidelidad. La exportación de aquella prueba no se recibió.")},
    "lidia": {"diseno": ("Enfoque del proyecto y propuesta de esta versión", "Javier define trama y pilares de diseño; la generación y combinación de recursos se apoyan en IA y herramientas de construcción.")},
    "one-piece-teoria": {"hipotesis": ("Enfoque del proyecto y propuesta de esta versión", "Los textos de Javier proponen relacionar motivos de sol, lluvia, bosque y tierra con una secuencia numérica y una composición musical.")},
    "triaje-colapso": {"sistema": ("Enfoque del proyecto y propuesta de esta versión", "El diseño combina progresión incremental con consecuencias acumulativas que pueden reducir capacidad o desplazar cargas. Javier propone situaciones y dilemas entre áreas, y un recorrido hacia funciones de gestión.")},
    "zeclana": {"revision": ("Enfoque del proyecto y propuesta de esta versión", "El material define rasgos del personaje y una regla de adaptación mínima de expresiones. Javier decide qué variantes conserva, modifica o descarta.")},
    "alojamiento-larga-estancia": {"criterio": ("La alternativa de referencia", "Javier plantea una comparación que tenga en cuenta los servicios que utilizaría en una vivienda, en lugar de tratar actividades domésticas como gratuitas por defecto.")},
    "jams-formacion": {"practica": ("Enfoque del proyecto y propuesta de esta versión", "Javier propone una jam semanal voluntaria con un reto, trabajo asincrónico, presentación breve y una revisión final del proceso."), "atribucion": ("Usar IA sin ocultar la aportación de cada participante", "Javier plantea hacer visible cómo se ha utilizado la IA: qué preguntas se formularon, qué decisiones se tomaron y qué errores se detectaron.")},
    "oposiciones-enfermeria": {"practica": ("Enfoque del proyecto y propuesta de esta versión", "Javier plantea sesiones breves de repaso, seguimiento de errores y una selección de preguntas relacionada con el progreso.")},
    "gestion-financiera-metodo": {"criterio": ("Enfoque del proyecto y propuesta de esta versión", "El enfoque consiste en registrar objetivos, horizontes, condiciones y motivos de revisión de forma explícita. Los documentos y versiones permiten observar qué criterio cambió y con qué información. Javier establece las preferencias y decisiones; una herramienta puede ayudar a comprobar consistencia y organizar evidencias.")},
    "preparacion-proyectos": {"estructura": ("Enfoque del proyecto y propuesta de esta versión", "La estructura indicada por Javier tiene exactamente tres repositorios: proyectos públicos, proyectos privados o reservados y tesis públicas de todos los proyectos al nivel de detalle autorizado.")},
    "perfil-contexto": {"cobertura": ("Enfoque del proyecto y propuesta de esta versión", "La solicitud de Javier de incluir todo el corpus se aplica a la cobertura, manteniendo visibles las limitaciones y los materiales que requieren reserva.")},
    "centro-datos": {"criterio": ("Enfoque del proyecto y propuesta de esta versión", "Javier plantea comparar vías de participación y no asumir automáticamente construcción y explotación completas.")},
    "comercio-local-virtual": {"adaptacion": ("Punto de partida y pregunta de esta línea", "Javier plantea conectar una representación digital de un negocio local con una pieza audiovisual de presentación.")},
    "impresion-uv": {"entrega": ("Enfoque del proyecto y propuesta de esta versión", "Javier propone explorar personalización y componentes que el destinatario pueda montar, en lugar de asumir necesariamente el montaje completo.")},
    "albacete-3d": {"diseno": ("Enfoque del proyecto y propuesta de esta versión", "Javier define el alcance de la experiencia y las revisiones; la construcción se apoya en IA y herramientas de transformación de datos.")},
    "council": {"funciones": ("Enfoque del proyecto y propuesta de esta versión", "Council distribuye funciones y entradas entre nodos de análisis, documentación, síntesis y revisión. El brief propone contextos separados y un núcleo común de reglas. Javier organiza el problema y las decisiones de diseño, con desarrollo asistido por IA.")},
    "practica-agentes-servidor-personal": {"practica": ("Punto de partida y pregunta de esta línea", "Javier declara que lleva practicando con agentes desde la etapa en que apareció Clawdbot y que compró un Mac mini con la intención de usarlo como servidor propio.")},
}

# The second idea normally uses the distinct approach sentence. Overrides keep
# the precise supporting passage when that summary does not carry the nuance.
TOPIC_KEYS = {
    ("adopcion-digital", "comparabilidad-opciones"): "approach",
    ("alojamiento-larga-estancia", "comparabilidad-opciones"): "criterio",
    ("alojamiento-rural-concepto", "operacion-entrega"): "operacion",
    ("auditoria-flujos-clinicos", "pregunta-investigacion"): "purpose",
    ("chiarezza", "senal-incertidumbre"): "purpose",
    ("jev-clinico", "senal-incertidumbre"): "respuesta",
    ("smarthandover", "estados-responsabilidad"): "estados",
    ("tfm-tecnologias-salud", "comunicacion-audiovisual"): "adaptacion",
    ("juegos-cartas-mecanicas", "operacion-entrega"): "purpose",
    ("lidia", "autoridad-decision"): "decision",
    ("casos-producto-candidaturas", "explicacion-razonamiento"): "purpose",
    ("ope-baremacion", "senal-incertidumbre"): "limits",
    ("reforma-educativa", "autoridad-decision"): "decision",
    ("bot-mercados", "automatizacion-excepciones"): "purpose",
    ("conexiones-financieras", "estados-responsabilidad"): "purpose",
    ("finanzas-personales-app", "estados-responsabilidad"): "purpose",
    ("gobierno-ia", "agentes-funciones"): "council",
    ("archivo-documental", "privacidad-atribucion"): "limits",
    ("perfil-contexto", "privacidad-atribucion"): "limits",
    ("tareas-programadas-agentes", "automatizacion-excepciones"): "limits",
    ("alojamiento-rural-concepto", "produccion-material"): "limits",
    ("chocolate-3d", "operacion-entrega"): "limits",
    ("comercio-local-virtual", "comunicacion-audiovisual"): "purpose",
    ("ideas-aparcadas", "produccion-material"): "limits",
    ("modelos-negocio-discovery", "operacion-entrega"): "limits",
    ("tecnologia-china-espana", "pregunta-investigacion"): "limits",
    ("tres-vias-desarrollo", "operacion-entrega"): "limits",
    ("adopcion-digital", "estados-responsabilidad"): "limits",
    ("albacete-3d", "localizacion-espacial"): "purpose",
    ("caso-documentacion-clinica", "agentes-funciones"): "work",
    ("caso-informacion-empresa", "agentes-funciones"): "work",
    ("caso-manual-cardiologia", "agentes-funciones"): "purpose",
    ("council", "evidencia-procedencia"): "purpose",
    ("council-historico", "evidencia-procedencia"): "work",
    ("narrativa-herramientas", "pregunta-investigacion"): "approach",
    ("practica-agentes-servidor-personal", "automatizacion-excepciones"): "limits",
    ("council", "agentes-funciones"): "funciones",
    ("caso-informacion-empresa", "evidencia-procedencia"): "limits",
    ("caso-scoring", "evidencia-procedencia"): "limits",
    ("doctorado-china-antecedente", "evidencia-procedencia"): "limits",
    ("ideas-aparcadas", "revision-hipotesis"): "approach",
    ("jams-formacion", "explicacion-razonamiento"): "practica",
    ("perfil-contexto", "evidencia-procedencia"): "approach",
    ("preparacion-proyectos", "evidencia-procedencia"): "approach",
    ("tecnologia-china-espana", "integracion-sustitucion"): "integracion",
    ("tutor-familias", "explicacion-razonamiento"): "approach",
}
PASSAGES["lidia"]["decision"] = (
    "Enfoque del proyecto y propuesta de esta versión",
    "La relación entre una ayuda tecnológica y la decisión humana es un tema del juego.",
)
PASSAGES["almacen-hospital"]["consulta"] = (
    "Enfoque del proyecto y propuesta de esta versión",
    "La propuesta puede organizar consulta por ubicación y referencia, conservando la diferencia entre una ficha de material y un registro de stock. Javier ha separado esta línea del carro de paradas. Las responsabilidades de mantenimiento del catálogo y reposición tendrían que acordarse con quienes realizan esas tareas.",
)
PASSAGES["smarthandover"]["estados"] = (
    "Enfoque del proyecto y propuesta de esta versión",
    "La memoria propone un flujo digital estructurado para el traspaso de información y seguimiento de tareas. El enfoque consiste en relacionar cada registro con su contexto y diferenciar lo anotado de lo pendiente.",
)
PASSAGES.setdefault("alojamiento-rural-concepto", {})["operacion"] = (
    "Enfoque del proyecto y propuesta de esta versión",
    "La propuesta editorial es comparar experiencia de uso, implantación, suministros, operación y mantenimiento para un caso definido.",
)
PASSAGES.setdefault("jev-clinico", {})["respuesta"] = (
    "Una pregunta delimitada hace visible qué se intenta decidir",
    "Una categoría, una etiqueta de catálogo y una indicación de información insuficiente no representan la misma decisión.",
)
PASSAGES.setdefault("tecnologia-china-espana", {})["integracion"] = (
    "Enfoque del proyecto y propuesta de esta versión",
    "El enfoque editorial propuesto es comparar producto, integración, mantenimiento, derechos, documentación y requisitos aplicables.",
)

# (capability, passage key, claim type, interpretation). Attribution refers to
# how this public source describes the passage, not independent verification.
CAP_MAP = {
    "almacen-hospital": [("delimitacion-alcance", "limite", "razonamiento_documentado", "La separación explícita invita a preguntar por qué localizar y reponer requieren un alcance propio; no acredita gestión de stock.")],
    "barrera-curas-sacras": [("delimitacion-alcance", "approach", "propuesta", "La formulación invita a reconstruir la función buscada antes de elegir diseño; no acredita diseño de un producto sanitario.")],
    "carro-paradas": [("diseno-interaccion", "diseno", "propuesta", "El alcance formativo permite conversar sobre cómo representar una tarea de ubicación; no acredita implantación o competencia clínica.")],
    "chiarezza": [("comunicacion-proposito", "comunicar", "propuesta", "El límite entre explicar y concluir permite examinar una decisión de comunicación; no acredita fidelidad o seguridad del prototipo."), ("delimitacion-alcance", "approach", "propuesta", "El propósito y sus límites invitan a revisar qué salidas quedan fuera del proyecto; no acreditan control efectivo del modelo.")],
    "comision-ia": [("relacion-componentes", "funciones", "propuesta", "La complementariedad de órganos permite preguntar por funciones y participación, sin acreditar un cargo o estructura institucional.")],
    "ehr-interfaz": [("analisis-procesos", "criterio", "propuesta", "La relación entre tarea profesional, servicios e integración permite revisar requisitos; no acredita integración asistencial."), ("comparacion-criterios", "criterio", "propuesta", "Preservar servicios y pedir demostraciones invita a preguntar qué evidencia discriminaría opciones; no acredita una evaluación ya realizada.")],
    "jev-clinico": [("delimitacion-alcance", "approach", "propuesta", "La pregunta y el catálogo permiten explorar cómo acotar una decisión; no acreditan entrenamiento, calibración o validez de etiquetas.")],
    "orientacion-hospital": [("delimitacion-alcance", "limite", "razonamiento_documentado", "La distinción entre guía, carro y almacén permite revisar tareas y destinatarios, sin atribuir una guía implementada.")],
    "smarthandover": [("analisis-procesos", "flujo", "propuesta", "El pasaje sitúa la aportación en definir el flujo de relevo; permite preguntar por estados y continuidad sin acreditar resultados clínicos.")],
    "tfm-tecnologias-salud": [("adaptacion-mecanismos", "adaptacion", "razonamiento_documentado", "El antecedente académico permite examinar cómo se propone trasladar formatos a salud; no demuestra transferencia efectiva ni implementación.")],
    "analisis-cultural-editorial": [("adaptacion-mecanismos", "approach", "propuesta", "La hipótesis y analogía permiten revisar qué relación se propone y dónde deja de sostenerse; no acreditan causalidad o investigación concluida.")],
    "ciencia-perdida": [("revision-iteracion", "revision", "actuacion_declarada", "La valoración atribuida permite reconstruir qué no encajó con la intención creativa; la exportación ausente limita la comprobación y no acredita calidad del juego.")],
    "juegos-cartas-mecanicas": [("delimitacion-alcance", "approach", "propuesta", "Las preferencias fijadas permiten conversar sobre la experiencia buscada; las reglas siguen propuestas por el asistente y no se atribuyen a Javier.")],
    "lidia": [("diseno-interaccion", "diseno", "propuesta", "La trama y pilares atribuidos permiten revisar cómo una intención narrativa podría hacerse interactiva; no acreditan una experiencia validada.")],
    "one-piece-teoria": [("adaptacion-mecanismos", "hipotesis", "propuesta", "La relación propuesta entre motivos, números y música permite examinar una hipótesis y sus fuentes; no acredita intención del autor ni predicciones confirmadas.")],
    "triaje-colapso": [("relacion-componentes", "sistema", "propuesta", "Los dilemas entre áreas permiten revisar consecuencias y compromisos del diseño; no acreditan una simulación sanitaria completa.")],
    "zeclana": [("revision-iteracion", "revision", "razonamiento_documentado", "La selección de variantes permite examinar decisiones creativas y criterios de coherencia; no mide una habilidad ni verifica todas las piezas.")],
    "alojamiento-larga-estancia": [("comparacion-criterios", "criterio", "propuesta", "Incluir servicios domésticos invita a revisar la unidad de comparación y lo que omite un precio de habitación; no acredita ahorro o una reserva.")],
    "casos-producto-candidaturas": [("delimitacion-alcance", "approach", "propuesta", "El planteamiento y dirección atribuidos permiten reconstruir un caso autorizado, separando sugerencias de IA de experiencia laboral real.")],
    "jams-formacion": [("diseno-interaccion", "practica", "propuesta", "El reto y la revisión permiten preguntar qué actividad haría observable una decisión; no acreditan un piloto o aprendizaje medido."), ("documentacion-trazable", "atribucion", "propuesta", "La propuesta de hacer visible el uso de IA permite revisar atribución de ayudas; no acredita que todas las prácticas estén registradas.")],
    "oposiciones-enfermeria": [("diseno-interaccion", "practica", "propuesta", "Las sesiones y seguimiento permiten revisar una experiencia de repaso ligada al progreso; no acreditan retención, aplicación o éxito en examen.")],
    "reforma-educativa": [("comparacion-criterios", "criterio", "propuesta", "La distinción entre tiempo y dominio permite preguntar cómo se define una comparación de aprendizaje; no demuestra efectos educativos.")],
    "tutor-familias": [("comunicacion-proposito", "approach", "propuesta", "Acompañar el razonamiento en vez de dar siempre la solución permite examinar una intención de ayuda; no acredita comprensión posterior.")],
    "bot-mercados": [("exploracion-herramientas", "approach", "actuacion_declarada", "La dirección de experimentos asistidos permite reconstruir preguntas y límites concretos; no acredita programación autónoma, operación en vivo o rentabilidad.")],
    "bot-meteorologia": [("exploracion-herramientas", "approach", "actuacion_declarada", "La exploración dirigida invita a revisar fuentes, transformaciones y supuestos; no acredita calibración o resultados económicos.")],
    "finanzas-personales-app": [("delimitacion-alcance", "approach", "propuesta", "Definir necesidades y reglas permite preguntar qué dato se espera y bajo qué condiciones; no acredita sincronización o persistencia.")],
    "fiscalidad-estancias-laborales": [("delimitacion-alcance", "approach", "propuesta", "Los escenarios permiten reconstruir qué pregunta depende de qué condición, sin atribuir las distinciones editoriales al usuario ni resolver su caso fiscal.")],
    "gestion-financiera-metodo": [("comparacion-criterios", "criterio", "propuesta", "El registro de objetivos y revisión permite conversar sobre consistencia de criterios; no verifica aplicación continua o resultados de inversión.")],
    "gobierno-ia": [("relacion-componentes", "decision", "propuesta", "El pasaje permite examinar reparto de decisión y ejecución, preservando la IA como centro efectivo; no acredita legitimidad o viabilidad jurídica.")],
    "perfil-contexto": [("documentacion-trazable", "cobertura", "propuesta", "La exigencia de cobertura con límites permite revisar cómo evitar omisiones y logros no comprobados; no acredita una revisión integral del perfil.")],
    "preparacion-proyectos": [("documentacion-trazable", "estructura", "propuesta", "La separación de destinos permite discutir procedencia y exposición de materiales; no acredita publicación o auditoría de todos los archivos.")],
    "centro-datos": [("comparacion-criterios", "criterio", "propuesta", "Diferenciar vías de participación permite revisar qué responsabilidades asume cada opción; no acredita suministro, financiación o viabilidad.")],
    "comercio-local-virtual": [("adaptacion-mecanismos", "adaptacion", "propuesta", "La conexión propuesta entre representación y vídeo permite examinar la función de cada formato; no acredita participantes, contratos o utilidad.")],
    "impresion-uv": [("delimitacion-alcance", "entrega", "propuesta", "Separar componentes y montaje completo permite revisar tareas y responsabilidades de entrega; no acredita fabricación o demanda.")],
    "albacete-3d": [("diseno-interaccion", "diseno", "propuesta", "El alcance y las revisiones atribuidos permiten explorar decisiones sobre navegación; no acreditan usabilidad, servicio municipal o datos actualizados.")],
    "council": [("relacion-componentes", "funciones", "propuesta", "La distribución de funciones permite discutir entradas, contextos y reglas; no acredita independencia o eficacia de los agentes."), ("analisis-procesos", "funciones", "propuesta", "El diseño permite preguntar qué recibe y entrega cada función y cómo se revisa; no demuestra un servicio operativo.")],
    "practica-agentes-servidor-personal": [("exploracion-herramientas", "practica", "actuacion_declarada", "La práctica y finalidad de compra declaradas invitan a reconstruir un ensayo con evidencia; no acreditan servidor configurado o despliegues.")],
}

# source, target, type, explanation, source passage, target passage.
# These edges describe relations among texts; no chronology, causation,
# implementation, institutional endorsement or personal ranking is inferred.
CROSS = [
    ("gobierno-ia", "reforma-educativa", "contrasta_con", "Reparten de forma diferente la decisión: gobierno sitúa a la IA en el centro efectivo; educación conserva al docente que distribuye su atención con apoyo de una herramienta. No son el mismo modelo de autoridad.", "decision", "decision"),
    ("gobierno-ia", "council", "contrasta_con", "El gobierno propuesto asigna decisión efectiva a la IA; Council documenta funciones de análisis y revisión. Una arquitectura de análisis no acredita el modelo político ni equivale a gobernar.", "decision", "funciones"),
    ("almacen-hospital", "carro-paradas", "contrasta_con", "Almacén trata localización y reposición; carro delimita consulta y práctica de ubicación. La separación explícita impide transferir control de existencias o funcionalidades por asociación.", "consulta", "purpose"),
    ("centro-datos", "instalacion-asic", "contrasta_con", "El primero compara suelo, alojamiento y capacidad propia; el segundo instalación o alojamiento de equipos de minería. Compartir condiciones físicas no convierte minería en capacidad de IA ni prueba viabilidad.", "purpose", "purpose"),
    ("tfm-tecnologias-salud", "ehr-interfaz", "posible_transferencia", "El antecedente académico sobre continuidad puede aportar preguntas a la propuesta entre niveles. La relación expresa un objetivo compartido, sin atribuir una integración al TFM o una arquitectura ya validada.", "purpose", "purpose"),
    ("smarthandover", "ehr-interfaz", "comparte_enfoque", "Ambos textos preguntan por continuidad de información: entre turnos en SmartHandover y entre niveles en EHR. Sus alcances y evidencias operativas siguen separados.", "purpose", "purpose"),
    ("chiarezza", "tutor-familias", "comparte_enfoque", "Los dos distinguen una salida de comprensión: Chiarezza busca explicar sin cambiar significado; el tutor acompaña el razonamiento. La relación no equipara sus dominios ni acredita eficacia.", "purpose", "purpose"),
    ("jev-clinico", "oposiciones-enfermeria", "posible_transferencia", "El diseño de preguntas delimitadas puede inspirar revisión de ítems de práctica. Los casos sintéticos y un temario de examen requieren fuentes y validaciones distintas.", "purpose", "purpose"),
    ("carro-paradas", "jams-formacion", "comparte_enfoque", "El propósito incluye práctica observable: ubicación de material en un caso y revisión de decisiones en el otro. La relación no acredita aprendizaje o competencia clínica.", "purpose", "purpose"),
    ("lidia", "triaje-colapso", "comparte_enfoque", "Los diseños exploran decisiones mediante interacción: narración sobre tecnología sanitaria y consecuencias de recursos en un sistema de juego. No son simulaciones clínicas validadas.", "purpose", "purpose"),
    ("lidia", "ciencia-perdida", "comparte_enfoque", "Ambos convierten un tema en material narrativo e interacción, con universos y mecánicas propios. Compartir una forma creativa no acredita una experiencia final equivalente.", "purpose", "purpose"),
    ("zeclana", "ciencia-perdida", "comparte_enfoque", "La selección de variantes y la valoración de una prueba permiten revisar coherencia con una intención creativa. Se comparan decisiones descritas, sin puntuar calidad ni recepción.", "revision", "revision"),
    ("one-piece-teoria", "narrativa-herramientas", "posible_transferencia", "La hipótesis narrativa puede apoyarse en extracción y grafos con procedencia; un vínculo de grafo seguiría siendo interpretación pendiente de contraste con referencias.", "purpose", "purpose"),
    ("analisis-cultural-editorial", "one-piece-teoria", "comparte_enfoque", "Ambos plantean hipótesis sobre material cultural. La continuidad editorial y las conexiones internas de una obra son objetos distintos; ninguna asociación confirma una causa o una intención autoral.", "purpose", "purpose"),
    ("albacete-3d", "orientacion-hospital", "posible_transferencia", "Una experiencia urbana navegable puede aportar preguntas de representación para recorridos hospitalarios. La demo no acredita mapas, accesibilidad o destinos de un hospital.", "purpose", "purpose"),
    ("gemelos-urbanos", "comercio-local-virtual", "posible_transferencia", "Preguntar qué tarea ayuda a realizar una representación puede servir al concepto de negocio local. El vínculo no acredita un gemelo operativo, participantes o demanda.", "purpose", "purpose"),
    ("impresion-uv", "juegos-cartas-mecanicas", "posible_transferencia", "Los componentes ligados a juegos ofrecen una posible aplicación física a explorar junto al concepto de cartas. Es una interpretación de uso posible, sin diseño acordado, fabricación o derechos acreditados.", "purpose", "purpose"),
    ("chocolate-3d", "impresion-uv", "comparte_enfoque", "Ambas líneas investigan personalización mediante producción material. Materiales, seguridad, repetición y entrega necesitan comprobaciones específicas; no se transfieren conclusiones alimentarias o técnicas.", "purpose", "purpose"),
    ("alojamiento-larga-estancia", "alojamiento-rural-concepto", "contrasta_con", "Una línea compara alojamiento para vivir y trabajar; la otra explora un concepto de alojamiento rural. Decidir como usuario y estudiar implantación de una oferta son alcances diferentes.", "purpose", "purpose"),
    ("finanzas-personales-app", "conexiones-financieras", "comparte_enfoque", "Reunir información requiere distinguir fuente, lectura y dato guardado. La relación conserva las conexiones pendientes y no afirma sincronización o persistencia.", "purpose", "purpose"),
    ("consolidacion-fiscal", "historial-activos-metodo", "comparte_enfoque", "Los dos conservan relaciones entre eventos y documentos para conciliación. El vínculo es metodológico y no publica movimientos ni acredita corrección fiscal.", "purpose", "purpose"),
    ("perfil-contexto", "preparacion-proyectos", "comparte_enfoque", "Los dos buscan explicar proyectos sin convertir materiales o ideas en logros acreditados. Cobertura completa y exposición pública son decisiones diferentes.", "purpose", "purpose"),
    ("tareas-programadas-agentes", "practica-agentes-servidor-personal", "contrasta_con", "La práctica con tareas de ChatGPT y la intención de servidor propio tienen evidencias separadas. La existencia de tareas o una compra no demuestra ejecución local o conexión entre ambas líneas.", "purpose", "practica"),
    ("bot-meteorologia", "bot-mercados", "comparte_enfoque", "Ambos textos separan información y señales de una eventual operación. Las probabilidades meteorológicas necesitan contraste y no acreditan calibración, ejecución o retorno.", "purpose", "purpose"),
    ("council", "auditoria-retrospectiva", "posible_transferencia", "La distribución entre análisis, documentación y revisión puede ayudar a examinar un flujo retrospectivo. Los prompts no prueban independencia, ausencia de errores o competencia clínica y jurídica.", "funciones", "approach"),
    ("auditoria-flujos-clinicos", "auditoria-retrospectiva", "contrasta_con", "Una línea estudia procesos clínicos y condiciones de servicio; la otra organiza evidencia documental retrospectiva. Sus objetos no autorizan trasladar pruebas o conclusiones entre auditorías.", "purpose", "purpose"),
    ("comision-ia", "buzon-mejoras", "comparte_enfoque", "Ambos textos proponen un cauce para que iniciativas de profesionales o trabajadores puedan valorarse. Un órgano institucional y un posible producto conservan gobernanza, privacidad y estados distintos.", "purpose", "purpose"),
    ("canales-distribucion", "servicios-online", "posible_transferencia", "Analizar la función del intermediario puede concretar distribución y entrega de un servicio digital. No prueba captación, acuerdos o autonomía operativa.", "purpose", "purpose"),
]

# Populated from the authorized public files at this editorial revision.
SOURCE_LOCKS = {
    "almacen-hospital": {
        "version": "2026-10-14-v4",
        "sha256": "b68a91645b46b9e667bcf71691e8a91353e34b5510087fb5caff70c5af8d3a85",
        "version_sha256": "bfde0f8e55196e39ae6c686e3899cbca65aa3811da335a1098501253cc50da52"
    },
    "auditoria-flujos-clinicos": {
        "version": "2026-10-14-v7",
        "sha256": "6398b3eecbebe5f375317f82526cdc907f8e49c684232623411adeb574addb09",
        "version_sha256": "65d7c81ca6dcb5aad9cbf966f6e1574a830610dd73a46c0b2e9f3064787f2bd1"
    },
    "auditoria-retrospectiva": {
        "version": "2026-10-14-v4",
        "sha256": "fe4befe89bcefa68b1942b4a9405d76e618d8fbe5fbd468fc77a7b4c8d41f101",
        "version_sha256": "11df159b46d47c04acc1680bba31ac714687407e0547debffcaf0033e10d914c"
    },
    "barrera-curas-sacras": {
        "version": "2026-10-14-v7",
        "sha256": "6d8faf6ef776864551e2bec0653164a4748bac2938e4cb113b69b366d83cbd6f",
        "version_sha256": "ff495b0945c1cd032ca71eefa54f93ac6851289ecf549f7d02f2a9f3da19fff1"
    },
    "carro-paradas": {
        "version": "2026-10-14-v5",
        "sha256": "8c9a63825bb7c2e4201342e96574c5180e734a631f6054d212a7e915c5f1c251",
        "version_sha256": "e9b10cb6c19873bea5bfca1094f65c824eebc1c7e8eeae4f315c9195c5ea5643"
    },
    "chiarezza": {
        "version": "2026-10-14-v4",
        "sha256": "fc0c8651febc11bf8c9361232920ed31d9e03c6562f65473e49ac41a67d2d901",
        "version_sha256": "21b60669b9bbd5a07f52e07b990f8426d432dfbe9acbc9476f19de49033a22bd"
    },
    "comision-ia": {
        "version": "2026-10-14-v4",
        "sha256": "c70a0138f5de2b611e8acb7d2442bfff815694d26c0b660eac3f4072f1165405",
        "version_sha256": "30ceabac08f047034e55b45a06861f065a4082e43a8c477c0bc0eb30684e5b82"
    },
    "ehr-interfaz": {
        "version": "2026-10-14-v5",
        "sha256": "85a79dec7c2277757b479320e456acc36ec1ee5ce39e45f579abcf62d492f46f",
        "version_sha256": "13d9742d9a315f7fcbef947be14863a903645d85cd34ccb36e04e25ac088e002"
    },
    "jev-clinico": {
        "version": "2026-10-14-v4",
        "sha256": "391e8ec1d9f47dda7ca933a153836e0c5cd132069ebfc036a6dbc0f08927839a",
        "version_sha256": "d78ec71813545941b6d719f05f8599b1b9a6cefc1f862469665e1bccfdd10584"
    },
    "orientacion-hospital": {
        "version": "2026-10-14-v4",
        "sha256": "a673ffc5690c211452130c36647e299b1c9785fb5173791aa649c77bf199ce22",
        "version_sha256": "26a7563bdea9f0d8ab147be1873074dc6c01e350abdc8ab7cfe73ac9acf6a01b"
    },
    "smarthandover": {
        "version": "2026-10-14-v5",
        "sha256": "a4658fa6f33ddc3be137f40ba91223ff4e03450e4c13c7f089948b742b1f1eec",
        "version_sha256": "331887da4dbce8def185c4b7dfcde56d8aa3b3a33bbeb8f793d596d0a6530a5b"
    },
    "tfm-tecnologias-salud": {
        "version": "2026-10-14-v4",
        "sha256": "908456c3e612abb523e199b65c42a1f5e619fd6eb8fa6993f23da794174a9018",
        "version_sha256": "9ee028a7465426a2154eeb8a48a56ab35d6c8cce758ebbdf4356d91d2351e9b4"
    },
    "analisis-cultural-editorial": {
        "version": "2026-10-14-v7",
        "sha256": "207d807de4f517abf7184ee62774fcfbe27af68cf1fc0103e8cb82e8b49f2999",
        "version_sha256": "f3a19625f878ef64a0c5c31887d0ca79eed5a05424c7225abe95969cc54dfbb8"
    },
    "ciencia-perdida": {
        "version": "2026-10-14-v7",
        "sha256": "2116d33e2c0809c57f204095ac8ef7ff7bd6965501a320d6708d93b5d94e94ee",
        "version_sha256": "982ce9abee1127d86ce6e6e79a9303498576ba41a6f31171b3c25ed49bf4c990"
    },
    "juegos-cartas-mecanicas": {
        "version": "2026-10-14-v8",
        "sha256": "35069d5e5f76e5ad98d028a99155994615add9a86ae5caa5ea1d5deae387de51",
        "version_sha256": "694a30abed9e7ad8d52c34c1592b4f12c3258aa3464c96533d7f0204e049b638"
    },
    "lidia": {
        "version": "2026-10-14-v5",
        "sha256": "c10f5bfdc8c23de026bd91233c81a5a83c89fb430a4cee2307e4942c937e824d",
        "version_sha256": "6004d0e1c94ea3c8b501962a22417397aee5105a39bd196311865a39c308a584"
    },
    "one-piece-teoria": {
        "version": "2026-10-14-v6",
        "sha256": "783a63d7356a99d93b0cd5ce59b7da31f2e1041d85e32604ea0c3e5f9eb1cb85",
        "version_sha256": "ccbf31543ac063efd709567d5d42bb830faed9a1d58cd813e7073bb38f0d2ee2"
    },
    "triaje-colapso": {
        "version": "2026-10-14-v5",
        "sha256": "f26e3f81baebecc88fe9de1048fa813271f10b1533110940b1a07ac99bd88781",
        "version_sha256": "b459cb38e88ba4e3bb0a64017ec24b8709f968f799d2b4a5a8565250de969518"
    },
    "videos-prototipos": {
        "version": "2026-10-14-v7",
        "sha256": "a5234264793d2bef1563fc2829714f87c1a34c4af2c990310031d62f6bc2ffa8",
        "version_sha256": "b0e146c4d11c61360c285990259af94c32d4cdfd35e2c3f01e126a801a01271e"
    },
    "zeclana": {
        "version": "2026-10-14-v5",
        "sha256": "7e2be59a464012bb5aa57c6f4480d71ae61d54ccfad830ff02c93a89bdaab812",
        "version_sha256": "c5fabde3217c069a74271a1491f9f62cb85d31f0aae2c2c7391b34fbd6268004"
    },
    "alojamiento-larga-estancia": {
        "version": "2026-10-14-v7",
        "sha256": "fcbce7c0a9bf847da312bbbf03eb1a9ce2d4337ed2abba94548961dd6f872e1a",
        "version_sha256": "428a1812cfa359b4a7e47a9caa60a22e0ba4a5b4ce09d8509cfedf90fc72a6f5"
    },
    "busqueda-empleo": {
        "version": "2026-10-14-v7",
        "sha256": "f6b456abc646011896bfcde92a7fc8cfc25eada0243e60c861b596a3af406d0b",
        "version_sha256": "4b255d32924b65bc47a8f6af9057fb989f2ba4fb6a710bd2365f06e9fa4fd48a"
    },
    "casos-producto-candidaturas": {
        "version": "2026-10-14-v5",
        "sha256": "a6810037bc229e94208f728b8454b5a0c1e1a952c99655aeda347ccc68a5f7c0",
        "version_sha256": "006ce38e1dc1bd6fae5932ead3e3e25328163e3aeb71f77545471dd978166ea4"
    },
    "doctorado-china": {
        "version": "2026-10-14-v6",
        "sha256": "88e8cc7313cbcc8d2c562802a5dec16ff5b190d68f5b6f348325f6f2bc5d5bf9",
        "version_sha256": "e387ed84723424d499b555afbbfe7c488f83f12c6ae7c801e6aea0cfb56577b2"
    },
    "doctorado-china-antecedente": {
        "version": "2026-10-14-v6",
        "sha256": "3296e23736f57c54deda03f0d19dcdcc5789149dfeeca073b30d651f146f9539",
        "version_sha256": "ea267c9805ef20d145104e7f44d87fcac03f67919c14e5a819d164e482a59f6f"
    },
    "entrevistas-metodo": {
        "version": "2026-10-14-v5",
        "sha256": "2a895a0b25bfc5ae0867079397d641cceaea1898d85be094fbc7f5bd33fcc0e5",
        "version_sha256": "9e286ed7b53a79efae8935b9eeb614418e36c48869c64c42835b3e500f3e2613"
    },
    "idioma-healthtech": {
        "version": "2026-10-14-v6",
        "sha256": "ed1a609fff1809b5ce30c87d4645a1fdf2de08e5bdd343e0e17483deb5050fad",
        "version_sha256": "96aa4f6f7d3a568fe97c0d689849aabd2ae6c4781ccc2daa14c33ca13cdad8e2"
    },
    "jams-formacion": {
        "version": "2026-10-14-v5",
        "sha256": "3ec88b2139b5e32c607a7d7e50a2f16e2b1d2dadd6be70788ab539ef9c3a3430",
        "version_sha256": "af83826e8e4cc106cbdd92c14552a43bf9738f755336b4490f70d5d14d7bcdbb"
    },
    "ope-baremacion": {
        "version": "2026-10-14-v5",
        "sha256": "16ab16aa7164e3085f1d4aac2c0d6b326a2c7190aae1eef1e00b67e4231c0545",
        "version_sha256": "adc0c029632a6bf45a514605edf4d8c476148031483803ac2cb8a7fcd14aaf2b"
    },
    "oposiciones-enfermeria": {
        "version": "2026-10-14-v4",
        "sha256": "44b41c44f612bda0b42c6d9424c867ab564df62ef5bfa718bd1267d071f8fd9c",
        "version_sha256": "6d96b73e8a9962b772b6fffa664a3a8a7be71c710471de9f1744180e9c6dafc8"
    },
    "reforma-educativa": {
        "version": "2026-10-14-v4",
        "sha256": "e9749ef069e0049466bcb65e18a92b2105fb82ab34c34b59f0bd29525c8a1b6f",
        "version_sha256": "cdfd74f0b6d7f75d81ab7c5aaa7476535b0ba25727fc60256be7d7b32cf7e61b"
    },
    "tutor-familias": {
        "version": "2026-10-14-v5",
        "sha256": "8a502615fa6e2df1e0472329833e794099d6a0b122b83d7df26277b10c2344e4",
        "version_sha256": "63480c76552664a58974d6ff976cebbdd443cb4166561ec3475c89c88f42bddf"
    },
    "bot-mercados": {
        "version": "2026-10-14-v4",
        "sha256": "2baa57ff2769c240ab3d82e4937288e642b93855e78d98488180d6e8e1cc3b62",
        "version_sha256": "9cd7fcea003568b4ce0577e5856056216cf63f5278bcd50a6485e36475ce5c5e"
    },
    "bot-meteorologia": {
        "version": "2026-10-14-v4",
        "sha256": "41460015cf8cc7ea161b63bf8085674855c9045c422675a99498bd7b6ea9d6c0",
        "version_sha256": "4ce5f84ae25ae1223f22fbdfc7480741f7f67a6d3db3712ee65f298b94323d90"
    },
    "conexiones-financieras": {
        "version": "2026-10-14-v4",
        "sha256": "1f0cb7bc4cee4b340259a513f0928cdf1e27b1da876b891ccfe0f224dc62ead1",
        "version_sha256": "88d8739da097f59b9212211fd870d2d41439288043fa68db9e013a0816770cd1"
    },
    "consolidacion-fiscal": {
        "version": "2026-10-14-v4",
        "sha256": "2c5c387da1768d0fb0180b0d3a4f188e6ddc3d8226ef3c1aad14dd3ea464705e",
        "version_sha256": "a09c8d6bfd803e36de1c7abdc0cc83e36ccdcd841142094491974421ed79ccd9"
    },
    "cribado-financiero": {
        "version": "2026-10-14-v6",
        "sha256": "050f1cf5d3d9642f54e1047e5a8b36888f4f8e5a45e8cb84f37050a9c1c4520b",
        "version_sha256": "28c3de4fa4d5acb4ec39ef1ce3433494aff7e811244438b80384ac809b8641f9"
    },
    "finanzas-personales-app": {
        "version": "2026-10-14-v4",
        "sha256": "0afd503f1f2957c8d2bcf0675aec83d598df376c1a802c791ea2b50ac1ba53a3",
        "version_sha256": "78f31b2eebba266cf95e2e095e840a36aaf753df752f9e5b02aa403155e43fe2"
    },
    "fiscalidad-estancias-laborales": {
        "version": "2026-10-14-v7",
        "sha256": "f042cde46118e1cbc53c0c32a039b94106a43b2d4e0fb837bf09c8ee18bb720b",
        "version_sha256": "ae95799d440e113f5f88645e326d6c1f6a24bb109c358270bd620bf63cf77fd6"
    },
    "gestion-financiera-metodo": {
        "version": "2026-10-14-v5",
        "sha256": "aa29124e4c00bdd31e080787cce49d0e60f1745910bd27861b7a30b5cf0aefe5",
        "version_sha256": "ef3728627fda134362ff93f230b6f6e6a1ecf1aaf5b1c9cf791955fe610e4e08"
    },
    "historial-activos-metodo": {
        "version": "2026-10-14-v5",
        "sha256": "479ed9b0de19a2495308fb85f498d285dab8937146a60897ae1e352e951340ca",
        "version_sha256": "77d01299ac58035119bbabaf20a80e5aeffcef6bda4863505f7a0a0021c074bd"
    },
    "inventario-activos-metodo": {
        "version": "2026-10-14-v5",
        "sha256": "a68b1538f46bb3315cc02c5375608965bbb2d4893b335902cd6a711421f5c123",
        "version_sha256": "e5add8b98810c5cf995945aefc0ad5d16cf63d2d3703bf04c2269805fb733ffc"
    },
    "robotica-cadena-valor": {
        "version": "2026-10-14-v5",
        "sha256": "917786cbfabb15d2458c2cb6a06fcbe69d0474164718695ac855d67f1b32f54a",
        "version_sha256": "fe8c072744bfe7da16f7b7f4ba3555005586facd230313ec1a8ebc4fb17e9eeb"
    },
    "gobierno-ia": {
        "version": "2026-10-14-v4",
        "sha256": "e8f39f794269f77666c1374e795673d1e47fa362ed7788afc6a12f1f5e7fb321",
        "version_sha256": "538c1fdcf2be5396fcdc5928c2cdb76144cc0561d824db23767dfa4dae52f2ca"
    },
    "archivo-documental": {
        "version": "2026-10-14-v5",
        "sha256": "51d988919fd52d8f4a992ac7ae36b0d3a0615b77da1077146dbc04c05f40d73b",
        "version_sha256": "23174393a8de0414963526b4442ac23e4158d20280e1b9ef58499b4ed3b2be6a"
    },
    "perfil-contexto": {
        "version": "2026-10-14-v6",
        "sha256": "fc6799b3843bc447b66010aff2b634550eb41974f7bec7ccef7a58dfbaefd015",
        "version_sha256": "ae51141e037cf24b3cb11ec769121de995917f1f3c65e5bd594073282cd70ca5"
    },
    "preparacion-proyectos": {
        "version": "2026-10-14-v6",
        "sha256": "b455113938bb0dc0b8af7766c5f5e20c0da60c4ef70d72992a58328882a10ee6",
        "version_sha256": "c83bc7ebe9e97ed72dcbe5b7a09d4096aa7e8247d041727eba2382eec3be018d"
    },
    "tareas-programadas-agentes": {
        "version": "2026-10-14-v6",
        "sha256": "8050370b1a7ce956ffa434c964b70f05b333d1e20373f19c8e0388eb8bec18c2",
        "version_sha256": "8154b6e07dfd6a29661f93a22617428c4dd2d30df322be7bc80d875fe899be3e"
    },
    "alojamiento-rural-concepto": {
        "version": "2026-10-14-v4",
        "sha256": "7fc24a4e4f6febb6f11394e0ace5e0a3cf207e0469e24597473a3132b5bc3906",
        "version_sha256": "2a875e09ac77fd449b928c6e53372d7ab64c6cb003e0ea88759a7f494cb5c821"
    },
    "canales-distribucion": {
        "version": "2026-10-14-v6",
        "sha256": "496eeced6cdcdcf3523c38f7790b720a319d64ecc2f822b86fa76feba04b0836",
        "version_sha256": "dcc969d917fe0aac924213ec9230d26f44864a3be576496d2ed3ed49b73f031b"
    },
    "cartera-no-sanitaria": {
        "version": "2026-10-14-v5",
        "sha256": "07d16fdd2746b4aa02580e429adfc35b9ceeab7531250dd98788f2a7818cb5e1",
        "version_sha256": "a7c0ac4cd6d7ebc87ee35a736f9b3cffbe3eb8f7a0403d19b92c25c41b51b808"
    },
    "celdas-negocio": {
        "version": "2026-10-14-v5",
        "sha256": "5b5c1538954bc9b4c2e9efed19ca5a6e24fcba7265090b76d12adc506dfbaa18",
        "version_sha256": "27b67dcce4a68d8a4a92ee9f453b6e7410fbcf311a0cb0ece9b8fdb7a93c73d8"
    },
    "centro-datos": {
        "version": "2026-10-14-v6",
        "sha256": "a5a2a7625c767627ead6b0cd09268ccda4d73e4ef62d11892ecf20b68f7658db",
        "version_sha256": "2d81a2a24849b529b92058a26a95bfeedbda1e8b17cb1b35116fac395c28ef7f"
    },
    "chocolate-3d": {
        "version": "2026-10-14-v4",
        "sha256": "e4d453df5ad005fdb52493ab8eddd1566fe0a76577f425da63d9c5d80ad95ad4",
        "version_sha256": "994edd141293ae976f8ffedb00e270f1c071ac5a87012a339a47e634f6a206a4"
    },
    "comercio-local-virtual": {
        "version": "2026-10-14-v5",
        "sha256": "b0dcc8e96c7ce1ee4072df9c179849ba90a956c71848b73972c816cd5084b90f",
        "version_sha256": "f5fd1816ab0ea9dd468c8ed0d4e928773a06496dd61a1df81a92f7478c1ace75"
    },
    "comparacion-iniciativas": {
        "version": "2026-10-14-v5",
        "sha256": "efb6545311cfa14f5d1617ea7fef1891f8f44e891e37285f52d1efde3c0108ae",
        "version_sha256": "0bb2a10fa148c07ea10bbca91cca72098b6b4974a7d039ec6c794815b59528e7"
    },
    "evolucion-hipotesis-negocio": {
        "version": "2026-10-14-v5",
        "sha256": "29af329e113d411fe2637f3cb3ad8fa7a76c384cb97af35284d735d42b5f8e8e",
        "version_sha256": "dc07e2211b5466869bd1dc3092442ce86a7f310416e8bb9b484c9a413687c0ee"
    },
    "ideas-aparcadas": {
        "version": "2026-10-14-v5",
        "sha256": "f6e1ffc5613a16d0acc4cb5ce33b6a1f365e31454ef37fd1aab9ef9816eafdae",
        "version_sha256": "c58aaa8dd2d1599a711ae160181979b6f0af0b51e59d1365e2f4304a2be0eeee"
    },
    "impresion-uv": {
        "version": "2026-10-14-v6",
        "sha256": "ec1b86fbafb2223abccafdc6581fd92534c4f30afdf81c80d51cb24d63cacaf0",
        "version_sha256": "1efa19d85b416d1ef4526f888e1a84703a61163d6cd7d1852c8aae4736714491"
    },
    "instalacion-asic": {
        "version": "2026-10-14-v6",
        "sha256": "f4fe1bfa7d053afba799fdce867ff464a6967f3829d5d04941d1f7a2874fc108",
        "version_sha256": "2d8774f89608bc3aaae38911c6abfa80a0a3297c709fd46f342526afcfe1c343"
    },
    "modelos-negocio-discovery": {
        "version": "2026-10-14-v5",
        "sha256": "65cc0d4a87b5271fc1fc7290aa8fc4f6821cfd47e012e190c167718ad367ccba",
        "version_sha256": "31d886ae4cb896e91a0f9cd0bdc4fd7f13b5745aa2b711cf13ff0387454ddc9b"
    },
    "perfume-dispensacion": {
        "version": "2026-10-14-v5",
        "sha256": "47e3b34a99194ada636c20628362fb3bdd6bbc85e79f3cd72a51780f5a003152",
        "version_sha256": "132b5ba25905d259f3355f3c80a68e149625a19a41a0cb023a8d41f1f951c63c"
    },
    "servicios-digitales-practica": {
        "version": "2026-10-14-v5",
        "sha256": "b97bf3dc82bee63123933497ff93c852ed8afdfe5c2d58c79b1fe48d02bfd663",
        "version_sha256": "0662e9af367a1e301455329cb9e54fcd31caf9a39adce07c17118ea224635d9b"
    },
    "servicios-online": {
        "version": "2026-10-14-v4",
        "sha256": "caa7ea98e2e3d07324c3264561b581dfb0e93c5c1df65d247a4c0e1d99d1ebf0",
        "version_sha256": "ca6a4df770309e7041e757774c4249c5f6d3626bed13258d85b53ddcbc07a09b"
    },
    "tecnologia-china-espana": {
        "version": "2026-10-14-v4",
        "sha256": "73779a1cb08b34dbca3e5465306413cf85b20d3e38e420feead3afbd7a32be85",
        "version_sha256": "c2b99d4dfa318507f8bc16f1f40a5940150689da934bcab3d6abe21f04e182d5"
    },
    "tres-vias-desarrollo": {
        "version": "2026-10-14-v6",
        "sha256": "e1fb588810eff70a227a733323351b802711bc7136d59ae70af711de6d1661f7",
        "version_sha256": "9c4051b90d9249dc27f0dd9f113e9bf6da96097caf3f8ea6a4fd233dca3ff11d"
    },
    "video-inmobiliario": {
        "version": "2026-10-14-v5",
        "sha256": "7ca2ed715edb32487283f7385b69099281620e1b28b98f8e175c9d549a456326",
        "version_sha256": "debb5bd48e6f1cd6a9ab5aed0ed68b1dbd0e5f8d412d6ca2318b79534517531b"
    },
    "adopcion-digital": {
        "version": "2026-10-14-v5",
        "sha256": "fc00e102a3f40525ee56c28489853041c029053578ce202dfcd150ef868e02a6",
        "version_sha256": "50524a8602acbeb6cf893b4421a54cb5a31be89c96154b853c3a943624fa54c2"
    },
    "albacete-3d": {
        "version": "2026-10-14-v6",
        "sha256": "6f898c48939b24b4697c64fbbf9e796fe9bb73476adaca891f0af1527111f6ab",
        "version_sha256": "7e22188af28d8af68f6d618a11dea64304da96bd74317b693e5512631630e815"
    },
    "automatizacion-oficios": {
        "version": "2026-10-14-v5",
        "sha256": "76c6040ffb5f48ae46adbaf98877698d0f20c19c3fde077ca454f6f347bdfbee",
        "version_sha256": "063434c5538c82292f18fbc6aa91c13a0b104123bad4374d596ea32dd8ccb305"
    },
    "buzon-mejoras": {
        "version": "2026-10-14-v4",
        "sha256": "f798f47d8f3699ac7c716ec5ee4a80d37fc0944d07c0129059375c4e196f092a",
        "version_sha256": "56dcb01c092d8148d797715a0fd059ae34fcb545d6feef3edc458e5f3d572a04"
    },
    "caso-analitica-salud": {
        "version": "2026-10-14-v5",
        "sha256": "6ca5232cc5f5ff3c91a36fe95ef9fb65910310e598b2181034803f66365b09b4",
        "version_sha256": "7a9d4d573ae007d64a9e6524e908c51a92ffbe91916716a4a9b23f8d136d4c15"
    },
    "caso-documentacion-clinica": {
        "version": "2026-10-14-v5",
        "sha256": "4e818e9f724f528fb45f7b9298a283f87495341fb0c5e652b0a395193c9953af",
        "version_sha256": "54d76fb99356edd9db610709a45e3b6f192e6c95b51ec325e5d4e315dc7a7e53"
    },
    "caso-informacion-empresa": {
        "version": "2026-10-14-v5",
        "sha256": "670451dac54fcc06efccb4d7d9c6cbeff947ab2f4e7b14069513f8c162ba8647",
        "version_sha256": "59bd98b621515c3b53a58c0c04bebc91badf1552d91b8919133306e1fdc274dc"
    },
    "caso-manual-cardiologia": {
        "version": "2026-10-14-v5",
        "sha256": "53038bf64463fac00b625cc4d3d8244bbea6642768c2d3ba02ac982f634a7674",
        "version_sha256": "b796cada66f21a36a5443eb7dfd3a249a9f99742cc8011458efbf3e97a2888df"
    },
    "caso-scoring": {
        "version": "2026-10-14-v5",
        "sha256": "7fd75c8c3d725071cc685fd9f8e845b8d18b4ce53252426be5de3b0fd8d3e37b",
        "version_sha256": "b6f73e595fcef8d053f35f6284ff747d144407b58236184d5de8179624c2f9fc"
    },
    "council": {
        "version": "2026-10-14-v8",
        "sha256": "cbc50a4add7870b0b218e7991d9e5ae372626c1fe751954914b7854b892f6a5b",
        "version_sha256": "4bc147eb2612fc26ac8714724f004614d476357ecb6106bd37a6b4a7573c5334"
    },
    "council-historico": {
        "version": "2026-10-14-v4",
        "sha256": "994856beed41790f817c79569b42d0e56c2b139eb1f03c269aafcc4353667c0f",
        "version_sha256": "5dab7867749549317cc8a50f237aafa98c31e37374663c71686ae52e9e797b57"
    },
    "gemelos-urbanos": {
        "version": "2026-10-14-v5",
        "sha256": "25c9bb598dd39454e054b52e4395177226d0955d667cc3c159a7996377cc23bb",
        "version_sha256": "4076766ed2f7407a01f9e18b7b1fe478bd098f37bc0b99f9578a046554e5587a"
    },
    "narrativa-herramientas": {
        "version": "2026-10-14-v5",
        "sha256": "720cdbdd8f8b61fb0b7d6851e82b552cc69abbbf2af437e299a9df0811d45e22",
        "version_sha256": "b9a03b60c3c1d8777a0a49c2d0e20412602243382b52dec27b3d42d866767c9b"
    },
    "practica-agentes-servidor-personal": {
        "version": "2026-10-14-v6",
        "sha256": "52cf2941d25c333c62fdd745a43829fcfcd4cf48d28e0adefac426072046de0d",
        "version_sha256": "4f6ac77c15427fc2c8f35a54f348d834398b93f000f3a30dec3fc5a2727534f8"
    },
    "senales-investigacion-online": {
        "version": "2026-10-14-v6",
        "sha256": "7936bd4c40e19ec86f650f8876492d712c60d5f2b1f0f8c0b8b20b900c8a846f",
        "version_sha256": "fa59b59ebe523f672ff573a28035210e4ced92cda999c6133b2516a69574cf9f"
    }
}


def sections(text: str) -> dict[str, str]:
    """Keep exact body text. Include subordinate headings in their parent section."""
    matches = list(re.finditer(r"(?m)^## ([^\r\n]+)\r?$", text))
    result = {}
    for index, match in enumerate(matches):
        heading = match.group(1)
        if heading in result:
            raise ValueError(f"Duplicate section heading: {heading}")
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        result[heading] = text[match.end():end]
    return result


def load_sources():
    found = {}
    for path in sorted(SOURCE.glob("*/*/TESIS.md")):
        raw = path.read_bytes()
        text = raw.decode("utf-8-sig")
        meta_path = path.with_name("VERSION.json")
        meta_raw = meta_path.read_bytes()
        meta = json.loads(meta_raw.decode("utf-8-sig"))
        pid = meta["id"]
        assert pid == path.parent.name and pid not in found, pid
        assert meta["area"] == path.parent.parent.name, pid
        assert meta.get("public_candidate") is True, pid
        found[pid] = {"text": text, "sections": sections(text), "version": meta["version"],
                      "area": meta["area"], "sha256": hashlib.sha256(raw).hexdigest(),
                      "version_sha256": hashlib.sha256(meta_raw).hexdigest()}
    assert len(found) == 82, f"Expected 82 public TESIS.md, found {len(found)}"
    assert set(found) == set(IDEAS), "Curated IDs do not match the public corpus"
    assert len({x['area'] for x in found.values()}) == 9
    return found


def excerpt(found, pid, key):
    if key in {"purpose", "approach", "work", "limits"}:
        label = {"purpose": "Propósito", "approach": "Aportación y enfoque", "work": "Trabajo y evidencia", "limits": "Resultados y límites"}[key]
        body = found[pid]["sections"]["TL;DR"]
        matches = re.findall(rf"(?m)^- \*\*{re.escape(label)}:\*\* (.+?)\r?$", body)
        assert len(matches) == 1, (pid, key)
        section, quote = "TL;DR", matches[0]
    else:
        section, quote = PASSAGES[pid][key]
    assert quote.strip() and quote in found[pid]["sections"][section], (pid, section, quote)
    return {"quote": quote, "section": section}


def validate_annotations(data, found):
    assert set(data) == {"schema_version", "created_at", "model", "capabilities", "topics", "projects", "cross_relations"}
    assert data["schema_version"] == 1 and data["model"] == "no_confirmado"
    assert 8 <= len(data["capabilities"]) <= 12
    assert 15 <= len(data["topics"]) <= 25
    capids = {x["id"] for x in data["capabilities"]}
    topicids = {x["id"] for x in data["topics"]}
    assert len(capids) == len(data["capabilities"]) and len(topicids) == len(data["topics"])
    assert {x['id'] for x in data['projects']} == set(found)
    assert len(data["projects"]) == 82
    checked_quotes = 0
    used_caps, used_topics = set(), set()
    forbidden = {"Herramientas y modelos", "Fuentes y alcance de lectura", "Cómo podría comprobarse", "Fechas, versiones y cambios"}

    def check_quote(pid, item):
        nonlocal checked_quotes
        assert item["quote"].strip()
        assert item["section"] not in forbidden
        assert item["section"] in found[pid]["sections"]
        assert item["quote"] in found[pid]["sections"][item["section"]], (pid, item)
        checked_quotes += 1

    for project in data["projects"]:
        assert set(project) == {"id", "topics", "capabilities"}
        pid = project["id"]
        assert 1 <= len(project["topics"]) <= 3
        assert 0 <= len(project["capabilities"]) <= 2
        assert len({x["id"] for x in project["topics"]}) == len(project["topics"])
        assert len({x["id"] for x in project["capabilities"]}) == len(project["capabilities"])
        for item in project["topics"]:
            assert set(item) == {"id", "reason", "quote", "section"}
            assert item["id"] in topicids and item["reason"].strip()
            used_topics.add(item["id"])
            check_quote(pid, item)
        for item in project["capabilities"]:
            assert set(item) == {"id", "reason", "quote", "section", "attribution", "claim_type", "origin", "user_review"}
            assert item["id"] in capids and item["reason"].strip()
            assert item["attribution"] == "javier_descrito"
            assert "Javier" in item["quote"], (pid, "Attribution needs an explicit anchor")
            assert item["claim_type"] in {"propuesta", "razonamiento_documentado", "actuacion_declarada"}
            assert item["origin"] == "interpretacion_ia" and item["user_review"] == "pending"
            used_caps.add(item["id"])
            check_quote(pid, item)
    assert used_caps == capids and used_topics == topicids, "Unused catalogue entry"
    assert 20 <= len(data["cross_relations"]) <= 30
    pairs = set()
    for relation in data["cross_relations"]:
        assert set(relation) == {"source", "target", "type", "label", "origin", "user_review", "evidence"}
        assert relation["source"] in found and relation["target"] in found
        assert relation["source"] != relation["target"]
        pair = tuple(sorted((relation["source"], relation["target"])))
        assert pair not in pairs
        pairs.add(pair)
        assert relation["type"] in {"contrasta_con", "comparte_enfoque", "posible_transferencia"}
        assert relation["origin"] == "interpretacion_ia" and relation["user_review"] == "pending"
        assert len(relation["evidence"]) == 2
        assert {e["project_id"] for e in relation["evidence"]} == {relation["source"], relation["target"]}
        for evidence in relation["evidence"]:
            assert set(evidence) == {"project_id", "quote", "section"}
            check_quote(evidence["project_id"], evidence)
    assert sum(r["type"] == "contrasta_con" for r in data["cross_relations"]) >= 2
    special = next(r for r in data["cross_relations"] if r["source"] == "gobierno-ia" and r["target"] == "reforma-educativa")
    assert special["type"] == "contrasta_con"
    assert "centro efectivo de decisión" in special["evidence"][0]["quote"]
    assert "el docente" in special["evidence"][1]["quote"]
    related_areas = {found[r[k]]["area"] for r in data["cross_relations"] for k in ("source", "target")}
    assert len(related_areas) == 9, "Cross-relations must cover all nine areas"
    return checked_quotes


def build(found):
    projects = []
    for pid in sorted(found):
        topics = [{"id": tid, "reason": reason, **excerpt(found, pid, TOPIC_KEYS.get((pid, tid), "purpose" if index == 0 else "approach"))}
                  for index, (tid, reason) in enumerate(IDEAS[pid])]
        capabilities = []
        for cid, key, claim_type, reason in CAP_MAP.get(pid, []):
            capabilities.append({"id": cid, "reason": reason, **excerpt(found, pid, key),
                                 "attribution": "javier_descrito", "claim_type": claim_type,
                                 "origin": "interpretacion_ia", "user_review": "pending"})
        projects.append({"id": pid, "topics": topics, "capabilities": capabilities})
    cross = []
    for source, target, kind, label, source_key, target_key in CROSS:
        cross.append({"source": source, "target": target, "type": kind, "label": label,
                      "origin": "interpretacion_ia", "user_review": "pending",
                      "evidence": [{"project_id": pid, **excerpt(found, pid, key)}
                                   for pid, key in [(source, source_key), (target, target_key)]]})
    return {"schema_version": SCHEMA_VERSION, "created_at": CREATED_AT, "model": MODEL,
            "capabilities": CAPABILITIES, "topics": TOPICS, "projects": projects,
            "cross_relations": cross}


def encode(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate sources and exact reproducibility without writing")
    args = parser.parse_args()
    found = load_sources()
    assert len(SOURCE_LOCKS) == 82, "Source lock must contain exactly 82 reviewed public sources"
    for pid, source in found.items():
        lock = SOURCE_LOCKS[pid]
        assert lock == {k: source[k] for k in ("version", "sha256", "version_sha256")}, f"Source changed: {pid}; review before updating lock"
    data = build(found)
    quotes = validate_annotations(data, found)
    stats = {"projects": len(data["projects"]), "areas": dict(sorted(Counter(p["area"] for p in found.values()).items())),
             "capability_catalogue": len(CAPABILITIES), "topic_catalogue": len(TOPICS),
             "capability_edges": sum(len(p["capabilities"]) for p in data["projects"]),
             "topic_edges": sum(len(p["topics"]) for p in data["projects"]),
             "projects_without_capabilities": sum(not p["capabilities"] for p in data["projects"]),
             "cross_relations": len(data["cross_relations"]),
             "cross_relation_types": dict(sorted(Counter(r["type"] for r in data["cross_relations"]).items())),
             "exact_quotes_validated": quotes}
    notes = {"schema_version": 1, "created_at": CREATED_AT, "model": MODEL,
             "scope": "Anotaciones editoriales del candidato público; no auditoría de originales, personas o resultados.",
             "input_policy": "Exclusivamente 82 TESIS.md y sus VERSION.json en portfolio-tesis. Sin originales privados, registro de dossiers, redes, servicios o publicación.",
             "source_reading": {"files_loaded_completely": len(found), "characters_loaded": sum(len(p["text"]) for p in found.values()),
                                "method": "Carga íntegra y seccionado programático de las 82 tesis; contraste editorial de propósito, enfoque, atribución y pasajes específicos. Las secciones históricas, fuentes y herramientas no se usan para acreditar capacidades. No se declara una nueva auditoría sustantiva de todos los originales ni de las referencias externas."},
             "interpretation_policy": [
                 "Las 82 tesis tienen ideas; ninguna necesita una capacidad para permanecer visible.",
                 "Cada capacidad enlaza una propuesta, razonamiento documentado o actuación declarada atribuida explícitamente a Javier en el texto público; no acredita una habilidad.",
                 "Las etiquetas son preguntas para explorar decisiones con evidencias; no son evaluación psicométrica, ranking o medición del desempeño.",
                 "Attribution javier_descrito significa que así lo describe la tesis asistida por IA; no equivale a comprobar la fuente original o una actuación real.",
                 "Una interpretación editorial conserva origin interpretacion_ia y user_review pending; la revisión técnica no cambia la aceptación personal de Javier.",
                 "No se adjudican métodos propuestos por el asistente como conducta de Javier. Donde no hay anclaje suficiente, capacidades permanece vacío.",
                 "Las relaciones posibles no afirman causalidad, cronología, integración, clientes, contratos, implantación, producción o eficacia.",
                 "Gobierno por IA conserva su centro efectivo de decisión; reforma educativa conserva el papel docente. La arista entre ellos es un contraste explícito.",
                 "El catálogo contiene ideas y preguntas de lectura, sin afirmar hechos técnicos, clínicos, jurídicos o financieros vigentes.",
             ],
             "known_limits": [
                 "Las fuentes siguen siendo borradores públicos candidatos que requieren revisión de Javier antes de publicar.",
                 "Los pasajes son citas exactas y su atribución se toma del dossier público; la precisión del dossier no se revalida con originales privados.",
                 "Los temas se curan a partir de propósito, enfoque y pasajes específicos; varias aristas pueden compartir una cita cuando esta sostiene ambos matices.",
                 "Una cita pertinente apoya la interpretación de lectura y sus límites; no prueba de forma independiente capacidades o efectos reales.",
                 "Modelos de turnos anteriores mencionados por las fuentes no identifican al autor actual; model se conserva como no_confirmado.",
                 "Este archivo solo documenta la autoría y validación del corpus anotado; no verifica recuperación RAG, generador o interfaz.",
             ],
             "validation": {"source_lock": "82 versiones y SHA-256 de TESIS.md y VERSION.json; cualquier cambio obliga a revisar antes de reconstruir.",
                            "exact_quote_check": "Cada cita no vacía debe aparecer literalmente en la sección declarada del proyecto correcto.",
                            "schema_check": "Claves exactas, vocabularios, IDs, cobertura 82/9, 1-3 ideas, 0-2 capacidades, 2 evidencias y contraste gobierno/educación.",
                            "reproducibility": "python build_annotations.py --check compara el JSON y estas notas byte por byte sin modificarlos."},
             "statistics": stats,
             "independent_review": {"required_model": "gpt-6-astra", "status": "pending", "note": "El agente principal encarga y registra la revisión independiente; estas notas no simulan su resultado."},
             "sources": [{"id": pid, "version": p["version"], "sha256": p["sha256"], "version_sha256": p["version_sha256"]} for pid, p in sorted(found.items())]}
    expected = [(OUTPUT, encode(data))]
    if not args.check or NOTES.exists():
        expected.append((NOTES, encode(notes)))
    if args.check:
        for path, content in expected:
            assert path.is_file() and path.read_bytes() == content.encode("utf-8"), f"Not reproducible: {path.name}"
    else:
        for path, content in expected:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content.encode("utf-8"))
    print(json.dumps({"ok": True, "mode": "check" if args.check else "build", **stats}, ensure_ascii=False))


if __name__ == "__main__":
    main()
