---
id: "2026-11-01T172133Z_chatgpt_revision-estructura_c4fb6a01e115"
titulo: "Revisión de la estructura documental y atribución"
autor: "Codex / OpenAI"
agente: "chatgpt"
entorno: "Codex desktop"
modelo: "gpt-6.1-sol"
atribucion_modelo: "Own runtime turn_context 2026-11-01T17:13:47.532Z"
fecha_informe_utc: "2026-11-01T17:21:33Z"
fecha_corte_informacion: "2026-11-01T17:21:33Z"
fecha_importacion_utc: "no-importado"
estado: "borrador"
confianza: "alta en las comprobaciones documentales indicadas; propuestas e implantación no evaluadas"
procedencia_original: "Aportación nueva; deriva de documentos de preparación conservados sin cambios"
fuentes: ["2026-11-01T162128Z_chatgpt_precisiones-agentes_02.md", "../PROTOCOLO_MEMORIA.md", "Plantilla y nota recibidas de Grok; originales conservados"]
relacionados: ["../revisiones/2026-11-01T162128Z_chatgpt_precisiones-agentes_02.md", "../PROTOCOLO_MEMORIA.md", "../informes/chatgpt/2026-11-01T172133Z_chatgpt_continuidad-memoria_7534edd48ab0.md"]
version: "3"
version_anterior: "2026-11-01T162128Z_chatgpt_precisiones-agentes_02"
version_anterior_sha256: "22d2ae8e7b5ceb76fedd72b369e4e2be5af40c73748c39a5b057cdeb522ff89b"
cambios_version: ["Compatibilidad de campos, versiones, destinos y revisión", "Continuidad de actividades internas y traspaso opcional"]
sustituye_a: []
revisado_por: "agente revisor_cerebro; Codex; modelo gpt-6-astra"
fecha_revision_utc: "2026-11-01T17:24:23Z"
revisiones_realizadas: [{"agente": "revisor_cerebro", "herramienta": "Codex", "modelo": "gpt-6-astra", "fecha_utc": "2026-11-01T17:24:23Z", "alcance": "Revisión documental independiente; no aprobación humana ni autorización de publicación"}]
aprobacion_humana: "pendiente"
tipo_documento: "revision"
secciones_revisadas: ["Precisiones técnicas para la memoria común: Instrucciones y permisos", "Precisiones técnicas para la memoria común: Autenticación y aportaciones", "Precisiones técnicas para la memoria común: Autoría, cronología y coordinación"]
---

# Revisión de la estructura documental y atribución

## Informe y secciones revisadas

[Precisiones anteriores](./2026-11-01T162128Z_chatgpt_precisiones-agentes_02.md#instrucciones-y-permisos), especialmente «Instrucciones y permisos», «Autenticación y aportaciones» y «Autoría, cronología y coordinación». Esta es una nueva aportación; el archivo anterior se conserva íntegro.

## Hechos y correcciones propuestas

- Se añaden fuentes, fecha de corte y la referencia a `decisiones/` en los documentos vigentes correspondientes. No se reescriben las cabeceras históricas para simular que siempre estuvieron completas.
- Se distingue una aportación fechada, que conserva cada versión como archivo nuevo, de README, protocolo e índice canónicos actualizables con historial.
- Los destinos propuestos quedan explícitos: núcleo público dentro del repositorio público existente y complemento privado separado, con accesos todavía por verificar. No se crea un repositorio por nombrar una carpeta.
- La revisión de un agente de IA se identifica como tal. La aprobación humana es un hecho diferente y sigue pendiente. Los identificadores existentes son únicos en este lote; no se vuelven inválidos por usar sufijos secuenciales. Las nuevas aportaciones usan identificadores adicionales para reducir colisiones.
- Una cita a un registro privado no autoriza publicar el commit, las rutas o los documentos leídos en ese ámbito. La plantilla separa el registro público del privado.
- El orden de incorporación se concreta: rama, preparación de cambios, selección de rutas, revisión del diff preparado, commit y PR.

## Aspectos que mantienen sus límites

La carga de `AGENTS.md` en Claude depende de versión, configuración y archivos del entorno; debe comprobarse en la sesión. Los modos de una herramienta no conceden acceso remoto. Un token es una vía posible, no una necesidad universal demostrada. [Instrucciones de Claude](https://code.claude.com/docs/en/memory) y [permisos](https://code.claude.com/docs/en/permission-modes).

Las referencias cruzadas conservan el nivel de evidencia y las restricciones de difusión. Identificar una fuente mediante una clave no garantiza anonimato ni habilita acceso. La lectura descrita por otro agente permanece atribuida a él.

## Próximo paso y límites

Revisar y aprobar la lista concreta antes de publicar. Esta propuesta no incorpora los ejemplos recibidos de Grok como hechos públicos verificados, no ejecuta sus comandos ni valida sus marcas temporales por suposición.
