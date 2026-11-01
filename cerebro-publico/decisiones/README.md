---
id: "formato-decisiones-memoria"
titulo: "Formato de decisiones"
autor: "Codex / OpenAI"
agente: "codex"
proveedor: "OpenAI"
herramienta: "Codex desktop"
entorno: "Codex desktop"
modelo: "gpt-6.1-sol"
atribucion_modelo: "Modelo declarado por el entorno de ejecución; evidencia técnica conservada fuera del lote público"
fecha_informe_utc: "2026-11-01T17:45:37Z"
fecha_corte_informacion: "2026-11-01T17:50:42Z"
fecha_importacion_utc: "no-importado"
estado: "revisado"
confianza: "alta en las comprobaciones documentales indicadas; no evaluada en implantación y contratos"
procedencia_original: "Aportación nueva; versiones y fuentes originales conservadas"
fuentes: ["../PROTOCOLO_MEMORIA.md"]
relacionados: ["../INDICE_MEMORIA.md", "../PROTOCOLO_MEMORIA.md"]
version: "4"
cambios_version: ["Referencias restringidas explícitas", "Ubicación de índice, decisiones y registro de lectura privado", "Estados, atribución y línea base de publicación definidos"]
sustituye_a: []
revisado_por: "IA independiente: revisor_cerebro; modelo gpt-6-astra; no aprobación humana"
fecha_revision_utc: "2026-11-01T17:50:42Z"
revisiones_realizadas: [{agente: "revisor_cerebro", herramienta: "Subagente independiente de Codex", modelo: "gpt-6-astra", fecha_utc: "2026-11-01T17:50:42Z", alcance: "Consistencia documental e integridad de este lote; sin aprobación humana ni auditoría completa de anonimización"}]
aprobacion_humana: "pendiente"
tipo_documento: "guia_canonica"
fecha_actualizacion_utc: "2026-11-01T17:50:42Z"
---

# Decisiones

Este lote no añade ninguna decisión aprobada. Cada decisión futura usa un archivo nuevo con fecha UTC e identificador único. Solo se publica una decisión cuando su contenido y sus referencias sean compartibles y exista autorización concreta.

Campos mínimos: `id`, `titulo`, `fecha_decision_utc`, `responsable_que_aprueba`, `evidencia_de_aprobacion`, `alcance`, `fuentes`, `relacionados` y `nivel_acceso`.

El cuerpo explica qué se decidió, por qué, alternativas consideradas, límites, efectos y qué decisión anterior revisa cuando corresponda. La evidencia puede ser una referencia autorizada a la aprobación; no deben copiarse conversaciones privadas al documento público.

Las propuestas de IA no se convierten en decisiones por consenso entre agentes. Una revisión de IA no rellena el campo de aprobación humana. Las decisiones privadas permanecen en el repositorio privado y solo se citan en público mediante una referencia autorizada cuando proceda.
