---
id: "2026-11-01T162128Z_chatgpt_sintesis-integracion_01"
titulo: "Integración documental entre asistentes"
autor: "Codex / OpenAI"
agente: "chatgpt"
entorno: "Codex desktop"
modelo: "gpt-6.1-sol"
atribucion_modelo: "Own runtime turn_context 2026-11-01T16:14:13.231Z"
fecha_informe_utc: "2026-11-01T16:21:28Z"
fecha_importacion_utc: "no-importado"
estado: "borrador"
confianza: "alta en las comprobaciones documentales indicadas; no evaluada en la implantación"
procedencia_original: "Síntesis nueva; originales y correspondencia de fuentes conservados fuera del lote público"
relacionados: ["../../README.md", "../../PROTOCOLO_MEMORIA.md", "../../revisiones/2026-11-01T162128Z_chatgpt_precisiones-agentes_02.md"]
modelo_actualizacion: "gpt-6.1-sol"
atribucion_modelo_actualizacion: "Own runtime turn_context 2026-11-01T16:27:46.300Z"
version: "2026-11-01-v2"
version_anterior_sha256: "f04f21ef55429cbe3862f914a4d61f17462c6749fbdc48ae9b707178fc12ce28"
fecha_actualizacion_utc: "2026-11-01T16:31:35Z"
cambios_version: ["Referencias públicas con resolución privada y límites de identificación y evidencia"]
sustituye_a: []
revisado_por: "gpt-6-astra; revisión independiente documental v2"
fecha_revision_utc: "2026-11-01T16:33:32Z"
---

# Integración documental entre asistentes

## Pregunta y alcance

Cómo compartir objetivos y aportaciones entre asistentes manteniendo versiones, autoría y separación entre información pública y privada.

## Hechos documentados

Se recibieron una guía previa, un acta de lectura y una revisión elaboradas por otro agente. Se comprobaron sus huellas y la conservación del cuerpo original incluido en la guía. Los originales y la correspondencia completa de procedencia se conservan fuera de este lote público.

La documentación previa de Grok declara un modelo subyacente desconocido. Esta síntesis no lo adivina ni atribuye ese material al modelo de Codex. La guía describía un borrador distinto de la estructura compartida examinada; por eso se conserva como antecedente y no se reproduce como procedimiento actual.

Un acta de lectura describe la prueba de su autor. Contrastar commits, árboles y huellas permite comprobar coherencia e integridad, pero no demuestra de forma independiente las llamadas realizadas en el entorno de otro agente. La escritura efectiva se prueba por separado cuando esté autorizada.

## Enfoque propuesto

Mantener un núcleo público autónomo con objetivos, decisiones autorizadas, fuentes y pendientes. El contexto privado se añade únicamente en conexiones autorizadas. Para comparar qué sabe cada asistente se registran las versiones consultadas y las fuentes realmente leídas.

Conservar aportaciones en archivos nuevos y correcciones asociadas permite revisar cambios de criterio sin sobrescribir a otro autor. Antes de publicar, seleccionar rutas, revisar el contenido preparado e incorporar mediante una rama y una PR. El protocolo define el flujo; sus controles técnicos requieren configuración y comprobación.

## Límites

Estos documentos no prueban sincronización activa ni acceso uniforme de todas las IA. No contienen conversaciones, citas personales, inventario de equipo, costes de cuentas o rutas internas de los materiales fuente. Tampoco certifican contratos, residencia de datos, planes o ajustes de cuenta.

## Fuentes

- [Protocolo de este núcleo](../../PROTOCOLO_MEMORIA.md).
- [Repositorios y visibilidad en GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories).
- [Documentación oficial sobre instrucciones de Claude Code](https://code.claude.com/docs/en/memory).
- [Documentación oficial de configuración de Codex](https://learn.chatgpt.com/docs/config-file/config-advanced).

## Procedencia

Síntesis nueva de Codex a partir de materiales recibidos y revisados. Conserva las conclusiones generales necesarias para su lectura pública y omite información retenida. No es una exportación literal ni sustituye los originales.

## Referencias con acceso diferenciado

La memoria común puede mantener una misma clave de cita en ambas vistas. El lector público recibe una afirmación revisada y su límite de verificación; la conexión autorizada puede resolver la clave contra una ficha bibliográfica privada. El registro privado conserva evidencia y alcance de acceso sin publicar la identidad.

Se trata de una propuesta de estructura. No se ha creado un resolvedor, un registro bibliográfico real ni una sincronización entre proveedores. La clave no transforma una afirmación reservada en información publicable.
