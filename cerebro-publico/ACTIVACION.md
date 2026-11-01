---
titulo: "Activación del cerebro compartido: contrato y comprobaciones"
autor: "Codex desktop / OpenAI"
modelo: "no_confirmado_para_esta_sintesis"
fecha_elaboracion_utc: "2026-11-01T20:19:27Z"
estado: "candidato revisable; no implantado por este documento"
aprobacion_humana: "pendiente en la preparación local"
---

# Memoria común y operación

El cerebro reúne actividades de todos los ámbitos y de todos los agentes incorporados. Una tarea puede permanecer siempre en el Council o pasar a otro modelo; ambas forman parte de la memoria. No se presupone que un asistente conozca todos los chats ni que guardar algo demuestre que los demás lo han leído.

El núcleo compartible pertenece a `NovusMotus/proyectos-publicos`, bajo `cerebro-publico/`. El repositorio privado `NovusMotus/cerebro` conserva su ámbito independiente: esta activación no cambia su visibilidad, no publica su contenido y no amplía su acceso. La documentación y tesis públicas existentes siguen en los tres repositorios de portfolio ya creados; no se crean repositorios por proyecto.

## Dos estados que los lectores deben distinguir

- `main`: núcleo incorporado, protocolos y documentos canónicos revisados. Que un informe esté incorporado no convierte sus hipótesis en hechos ni sus propuestas en decisiones de Javier.
- `cerebro/recepcion-publica`: bandeja durable de aportaciones recibidas. Tiene catálogo y recibos propios. Sus contenidos son públicos, pero recibirlos no equivale a fusionar una PR ni a aprobar sus conclusiones. Esta rama se conserva; no se borra automáticamente al fusionar.

En cada sesión se consulta el commit exacto de la vista utilizada y los documentos pertinentes, registrando qué se leyó realmente. Para incorporar una aportación se revisa el cambio completo y se reconcilia con la base vigente. Un catálogo no se mezcla a ciegas con otro. Una referencia `compare` tampoco demuestra que exista una PR.

## Contrato de aportación

El transporte común usa `herramientas/git_memory.py`. Una aportación nueva se identifica con un UUID completo generado y guardado antes del primer envío. El contenido y sus metadatos se conservan; reenviar exactamente la misma operación devuelve su recibo, y reutilizar el UUID con contenido distinto produce conflicto. Dos operaciones legítimas idénticas deben tener dos UUID distintos.

Las aportaciones del transporte se almacenan en `aportaciones/<uuid>.md`, con un recibo durable en `recibos/<uuid>.json`. El catálogo derivado `CATALOGO_APORTACIONES.json` y esos dos archivos se publican en un mismo commit. Las carpetas históricas `informes/` y `revisiones/` se conservan; no se sustituyen ni se atribuyen a quien instala el transporte. Este contrato precisa la ubicación de nuevas entregas automáticas respecto de la propuesta documental anterior.

El sobre incluye agente, proveedor, herramienta, modelo declarado y evidencia de esa declaración; elaboración, origen y fecha de corte; fuentes, versiones y documentos consultados; tipo de afirmación y visibilidad pública. Los valores desconocidos se marcan como tales. La fecha de observación/registro del transporte procede del reloj del cliente y no se presenta como hora certificada del servidor GitHub ni como comienzo de la idea.

El transporte usa un índice temporal propio y no edita el checkout ni el índice ordinario. Prepara un hijo directo de la base y actualiza la referencia con una condición sobre su valor anterior exacto. Si otro agente avanza, incorpora de nuevo las aportaciones independientes sin descartar el commit competidor. Para un documento canónico exige commit y hash de contenido esperados; ante competencia exige otra lectura y revisión, sin combinar conclusiones automáticamente.

La identidad de agente y el modelo son declaraciones del emisor. La cuenta que transmite es otra identidad, observada por el canal. Compartir una credencial de usuario no separa los permisos de sus procesos ni acredita quién razonó el contenido.

## Grok mediante la conexión existente

El puente usa una issue con título `CEREBRO/1 <uuid>` y un sobre JSON estricto. La issue ya hace público su contenido: solo se envían bytes revisados y autorizados previamente, sin fuentes privadas ni datos personales. Un `approved` escrito en la issue no autoriza nada.

El workflow acepta únicamente el repositorio público concreto y la cuenta autorizada por su ID. Lee una liberación de `liberaciones/<uuid>.json` desde el commit confiable de `main`, que debe autorizar la nota y los metadatos de revisión exactos. Ejecuta código aprobado del repositorio; no ejecuta instrucciones, código o rutas contenidos en la issue.

El token efímero de Actions se limita a este repositorio y a `contents: write` e `issues: write`. No se crea un PAT ni se conserva el token en el repositorio. Se utiliza un runner estándar del repositorio público, sin artefactos ni cachés de pago. Esto debe comprobarse en la ejecución real antes de darlo por operativo.

Una respuesta confirma recepción en la bandeja, no incorporación en `main`. Tras una respuesta perdida se reintenta el mismo sobre y UUID; pueden aparecer varios comentarios de recibo, pero no debe duplicarse la aportación. La PR y su incorporación se realizan después por un integrador autorizado, que puede ser un agente con herramientas adecuadas. Codex coordina esta activación; no es una pasarela obligatoria del diseño.

Las liberaciones se evalúan en el snapshot confiable del evento. Revocar una autorización después no cancela por sí solo un job antiguo ya iniciado o reejecutado; debe cancelarse y revisarse antes de transmitir. No se anuncia una revocación inmediata automática.

## Claude y otros clientes

Cada cliente usa el mismo sobre y transporte, conserva el UUID y pasa el modelo de esa sesión. Las capas pueden adaptar lectura y preparación; no deben aprobar sus propias publicaciones, cambiar destinos o producir otro registro incompatible.

La lectura devuelve documentos públicos verificados y un recibo de versión y hashes. Obtener hashes sin entregar el texto al agente acredita actividad del programa, no lectura del modelo. El registro distingue entrega técnica, lectura declarada, documentos ausentes y comprensión no verificada.

El escritorio, la web y el móvil pueden ofrecer herramientas distintas. Una prueba de Claude Code local no acredita escritura desde Claude móvil; la lectura de una URL procesada por una herramienta web no permite necesariamente comprobar los bytes originales. Estas capacidades se registran por entorno. Gemini y modelos locales podrán incorporarse después mediante el mismo contrato, sin atribuirles una prueba que todavía no han realizado.

## Obsidian

Obsidian presenta una vista derivada por commit completo. `herramientas/obsidian_view.py` obtiene los bytes del árbol Git identificado y publica un directorio de versión completo. Si esa versión ya existe y alguien la ha editado, informa del conflicto y conserva la edición. Una versión posterior se publica separadamente, sin reemplazar notas del usuario. Solo se consideran snapshots completos los directorios cuyo nombre sea el commit; las preparaciones temporales ocultas no son versiones publicadas.

Una vista no es una segunda fuente de autoridad. Las ediciones que se quieran incorporar se entregan como aportaciones o revisiones nuevas. La bóveda privada y sus notas locales no se suben por el hecho de publicar una vista pública. La ubicación e integración real se verifican durante el despliegue; escribir este documento no abre una bóveda ni instala sincronización.

## Privacidad, revisión y cobertura

Solo se exporta contenido clasificado como compartible. Las fuentes restringidas se conservan en los almacenamientos restringidos autorizados; un repositorio privado solo se utiliza cuando corresponde y está autorizado. Las notas públicas utilizan claves opacas con el límite de verificación previsto en el protocolo. No se resuelven esas claves desde un entorno sin permiso. Un DPA o el nombre de un plan no autoriza automáticamente a todos los conectores, agentes o modelos a leer cualquier dato.

La aprobación de una nota debe cubrir también los metadatos de revisión que se publicarán con ella. No se incluyen rutas privadas, credenciales, registros operativos reales, correspondencias de referencias privadas ni historiales completos en el lote público. Las comprobaciones automáticas no certifican anonimato.

Las versiones mantienen sus fechas y atribuciones originales. Una corrección posterior identifica qué añade o corrige y no borra la aportación anterior. Las decisiones humanas se registran separadamente. El inventario de cobertura debe indicar, por proveedor y actividad, qué conversaciones se recuperaron, qué permanece inaccesible y qué está pendiente de clasificación; una lista de conversaciones no acredita su lectura completa.

## Antes de declarar la activación terminada

Debe existir evidencia de: publicación del lote aprobado; ejecución real del puente y alcance del token; aporte desde cada cliente incluido y lectura cruzada de esa versión; recepción, reintento y conflicto; integración revisada; vista Obsidian que conserve cambios locales; migración completa de escritores y lectores del Council; recuperación y copia restaurada; y revisión independiente final `gpt-6-astra` sobre el estado activo. Las pruebas locales ya realizadas no sustituyen esos pasos.

Referencias: [actualizaciones de referencias Git](https://git-scm.com/docs/git-push), [eventos de Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#issues), [permisos de GITHUB_TOKEN](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token) y [uso gratuito de runners estándar públicos](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
