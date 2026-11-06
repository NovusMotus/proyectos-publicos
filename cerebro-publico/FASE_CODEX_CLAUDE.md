---
titulo: "Fase de activación con Codex, Claude y Obsidian"
autor: "Codex desktop / OpenAI"
modelo: "no_confirmado"
fecha_elaboracion_utc: "2026-11-01T21:21:00Z"
estado: "revisado_para_presentar_lote_no_aprobado"
modelo_version_anterior: "no_confirmado_para_esta_sintesis"
agente: "codex"
entorno: "Codex desktop"
herramienta: "Codex desktop"
proveedor: "OpenAI"
atribucion_modelo: "Identificador exacto no confirmado para esta actualización; atribuciones anteriores conservadas en Git y campos históricos."
version: "actualizacion-2026-11-06-r1"
fecha_actualizacion_utc: "2026-11-06T13:24:08Z"
fecha_corte_informacion: "2026-11-06T13:22:26Z"
version_anterior_commit: "660149a13eaf7d4d27405f407bbfd6e29bb4be17"
version_anterior_sha256: "7f4f59da0195407c2409405be7e020511342bc93b3cf0415a963c02327d1f3af"
cambios_version: ["Estado fechado por superficie", "Lectura móvil declarada y ensayo aislado separados de integración", "Los14ámbitos y comprobaciones conservados; IA local opcional"]
revisado_por: "Agente revisor independiente; herramienta Subagente de Codex; modelo gpt-6-astra; revisión documental, no aprobación humana"
fecha_revision_utc: "2026-11-06T13:22:48Z"
aprobacion_humana: "pendiente_para_este_lote; no revoca aprobaciones históricas"
historial_publico: "La versión anterior existe en el commit fijado. Esta actualización es candidata local y requiere nueva aprobación de lista y destino."
revision_actual: {"reviewer": "Agente revisor independiente", "tool": "Subagente de Codex", "model": "gpt-6-astra", "reviewed_at": "2026-11-06T13:22:48Z", "scope": "Revisión independiente de contenido y procedencia del lote de 13 rutas; contraste de fuentes, notas, catálogo, plantillas de recibos, clasificación y límites; recálculo de huellas y preservación de las tres notas originales. Incluye comprobación de las correcciones solicitadas. Sin ejecución propia de pruebas Linux, observación directa de móviles/Mac ni auditoría completa de anonimización", "record": "Hallazgos relevantes corregidos y comprobados. Sin impedimento material identificado para presentar este lote concreto a aprobación humana. No constituye autorización de publicación, despliegue, migración ni nuevos accesos; tampoco acredita integración completa o sincronización"}
---

# Estado de la integración al 6 de noviembre de 2026

El núcleo anterior está publicado en `NovusMotus/proyectos-publicos`, bajo `cerebro-publico/`, en el commit `660149a13eaf7d4d27405f407bbfd6e29bb4be17`, consultado por Codex mediante conector GitHub. Esta actualización es un candidato local: su publicación e incorporación todavía requieren aprobación. El detalle fechado se conserva en la [continuidad nueva](aportaciones/5c58e624-9ec1-4fff-af21-414043250408.md); no equivale a una activación global.

| Superficie | Evidencia y alcance | Falta comprobar |
| --- | --- | --- |
| Grok Bot / Council | Grok declaró lectura del núcleo y entregó una [nota](aportaciones/13f1d365-6de6-4b79-b20f-f2028d9104f1.md); Claude Code aportó una [lectura cruzada local](aportaciones/14810ce7-272d-407c-9558-4bca8b4f3822.md). | Envío remoto propio, reintento/conflicto y recuperación desde el remoto; cobertura del resto de bots y migración de escritores/lectores. |
| Codex y Claude Code de escritorio | Codex consultó fuentes públicas fijadas. Se observó carga de skill en Claude Code y se contrastó su [nota de lectura](aportaciones/7784cd96-4ea4-46dd-9b14-8967a0b1b11c.md). Los ensayos de envío de noviembre 1 son históricos y tienen alcance propio. | Incorporación remota autorizada de notas nuevas y lectura posterior del commit resultante. |
| Chats ordinarios y móviles | Claude Chat de escritorio declaró lectura HTTPS pública. Según las respuestas transmitidas por Javier, ChatGPT móvil leyó mediante conector y Claude móvil mediante HTTPS tras fallar su conector; WebFetch parcial se distingue de la lectura completa posterior. | Escritura durable, recuperación por otro cliente, fecha/modelo de las pruebas móviles e independencia del PC apagado. No hubo observación directa del móvil por Codex. |
| Recepción del Council | Claude ejecutó el ZIP sintético v4.1: 88 aprobadas, 7 omitidas, sin errores en la extracción fiel. Codex y gpt-6-astra contrastaron artefactos y código; el revisor no ejecutó la batería. | Siete pruebas de lectores, escritores reales, perfiles sin variables de pausa y corte/rollback. No está desplegado por este ensayo. |
| Obsidian y Mac | Obsidian se reabrió visualmente en el Mac el 6 de noviembre: bóveda Cerebro y mapa de lectura visibles, versión 1.15.0. Hay pruebas previas de la vista pública en Windows. No se verificaron hoy todas las notas ni sus huellas. | Contenido actual del Mac, sincronización PC-Mac, copia restaurada y servicio con el PC apagado; la instalación o el resultado de una tarea no bastan. |

Las tres notas de otros agentes conservan sus UUID y textos originales. Recibirlas por archivo no demuestra todavía lectura desde GitHub. El cuerpo de cada aportación expresa el estado al redactarse; el catálogo y los recibos deben comprobarse después de la publicación efectiva.

## Criterios de comprobación

Para declarar operativa una superficie deben constar lote autorizado y publicado, una aportación desde ese cliente, recepción y reintento sin duplicados, conflicto detectado, integración revisada, recuperación y lectura del commit exacto, vista Obsidian pertinente y revisión independiente del estado resultante. Una prueba sintética o de escritorio no cubre automáticamente otra superficie. El transporte y sus rutas se describen en `ACTIVACION.md`; el puente de issues/Actions permanece sin activar en esta entrega. No se crea un PAT ni se amplían accesos.

La vista pública por commit es derivada. No sube la bóveda ni sincroniza por sí sola las ediciones privadas. La instalación Windows depende del equipo y de su sesión; no acredita funcionamiento del Mac ni disponibilidad con el PC apagado. Las ediciones locales deben conservarse y ofrecerse como aportaciones nuevas, sin convertirlas silenciosamente en fuente canónica.

Cada contribución conserva fecha de elaboración, origen y corte cuando consten, herramienta, proveedor, modelo realmente declarado y fuente de esa atribución. Una revisión no reemplaza la autoría anterior; ni publicación ni revisión de IA convierten hipótesis en resultados o decisiones de Javier.

## Alcance completo y siguientes comprobaciones

1. Grok Bot y todos los bots del Council: recepción durable y migración real.
2. Codex y Claude Code de escritorio: persistencia y lectura cruzada de aportaciones nuevas.
3. Chats ordinarios y móviles de ambos: pasar de lectura a escritura y recuperación verificadas.
4. Alojamiento, sincronización y copias del Mac: comprobar operación y restauración sin depender del PC.
5. Conflictos y concurrencia: llevar el ensayo aislado a una migración controlada, con corte y rollback comprobados.
6. Privacidad: comprobar separación pública, privada autorizada y restringida local; no conceder accesos por deducción.
7. Inventario de todos los proyectos e historiales: distinguir listado, recuperado, leído, clasificado e incorporado.
8. Wiki mantenida por agentes: ingesta, consulta, índice, revisión y contradicciones con fuentes.
9. Fechas, versiones y atribución: aplicarlas a cada contribución y superficie.
10. Captura web: conservar enlace, autor y fecha de las referencias sin convertir sus afirmaciones en hechos.
11. Grafo y búsqueda: relaciones con evidencia; las capacidades interpretadas no son acreditaciones personales.
12. Portfolio y presentación visual: línea relacionada, con cobertura completa y revisión móvil/visual propia.
13. IA local: incorporación futura opcional y de menor prioridad; no se reanuda su reparación por este lote.
14. Gemini y otros modelos: incorporaciones futuras opcionales, sin atribuir pruebas todavía no realizadas.

El contexto restringido local y sus derivados permanecen fuera de Git, conectores y bóveda compartida. Las claves opacas no permiten acceder a ese contenido desde IA externas. El lote público excluye conversaciones completas, originales privados, inventarios personales, credenciales, rutas de equipos y correspondencias de referencias no públicas. La revisión por patrones no garantiza anonimato. No se cambian visibilidades ni permisos privados.
