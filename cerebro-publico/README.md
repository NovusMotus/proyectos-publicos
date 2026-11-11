---
id: "memoria-comun-publica-2026-11-01"
titulo: "Memoria común de proyectos"
tipo_documento: "canonico"
autor: "Codex desktop / OpenAI"
agente: "codex"
herramienta: "Codex desktop"
proveedor: "OpenAI"
modelo: "no_confirmado"
atribucion_modelo: "Identificador exacto no confirmado para esta contribución; no sustituye atribuciones históricas."
fecha_actualizacion_utc: "2026-11-11T16:11:34.843954+00:00"
fecha_corte_informacion: "2026-11-11T16:11:34.843954+00:00"
version: "2026-11-11-r239-r3"
version_anterior_commit: "84fd851548883d45bcf4a4922038e32edf67d671"
version_anterior_sha256: "c4f16199f83a6b74a1c81e54a10bd100665613ef7e10533a90ed55ffae7e14d4"
fuentes: ["https://github.com/NovusMotus/proyectos-publicos/blob/84fd851548883d45bcf4a4922038e32edf67d671/cerebro-publico/README.md", "https://github.com/NovusMotus/proyectos-publicos/issues/11", "https://github.com/NovusMotus/proyectos-publicos/pull/12"]
aprobacion_y_publicacion: "Dependen de la autorización externa y de la PR correspondiente; este texto no las concede."
---

# Memoria común de proyectos

Este núcleo reúne el contexto compartible de proyectos, investigaciones, tesis y práctica con herramientas. Su finalidad es que diferentes asistentes puedan consultar los mismos objetivos, fuentes, decisiones y pendientes. El alcance incluye salud, tecnología, educación, negocios, creación, gobierno, finanzas, metodología y desarrollo profesional.

La memoria pública es la referencia compartible. El complemento privado solo se consulta desde entornos autorizados para ese contenido. Lo restringido local se conserva en el nodo local autorizado, fuera de Git, conectores y bóveda compartida, incluidos sus derivados. Es una memoria lógica con accesos distintos; no todos los asistentes reciben los mismos datos. Los secretos quedan fuera de los repositorios públicos y privados.

## Qué debe explicar cada proyecto

- Punto de partida: necesidad, pregunta, contenido de referencia o supuesto.
- Propósito y enfoque: qué se intenta conseguir y qué decisiones se han tomado.
- Estado y evidencia: idea, investigación, propuesta, prototipo, prueba o resultado documentado.
- Próximo paso y preguntas abiertas.
- Aportación humana y colaboración de herramientas, con modelo real, fecha y versión cuando consten.

La perspectiva de un agente se conserva como una aportación atribuida. Una propuesta solo pasa a decisión cuando la persona responsable la aprueba. Los argumentos publicados no equivalen a acceso a conversaciones privadas o a una memoria interna de todos los modelos.

## Referencias comunes con fuentes restringidas

Una afirmación pública puede citar una clave opaca, por ejemplo `REF-DEMO`, mientras la ficha bibliográfica concreta queda en el ámbito privado autorizado o, si está clasificada como restringida local, exclusivamente en el almacén local autorizado fuera de Git y de la bóveda compartida. La misma clave mantiene la conexión entre las dos vistas de la memoria.

**Ejemplo ficticio, sin correspondencia con un hospital real ni un resultado del portfolio:** «Un centro sanitario documentó un cambio en la reposición de material». Referencia: `REF-DEMO` — fuente restringida; no verificable desde esta vista. Esta frase ilustra el formato, no aporta evidencia sobre una actuación real.

En una aplicación real, una conexión autorizada puede resolver referencias privadas dentro de su alcance. Una fuente restringida local solo se consulta dentro del nodo local y mediante procesamiento local autorizado; conocer su clave no permite solicitar su cuerpo o derivados desde una IA externa. Un agente sin acceso conserva la referencia y declara el límite; no inventa la bibliografía. Estos controles requieren verificación técnica y no quedan implantados por describirlos.

El texto público necesita su propia revisión de divulgación e identificación. Reservar la identidad de una fuente no convierte automáticamente en publicable lo que cuenta. Las fuentes legítimamente públicas pueden citarse normalmente cuando el contexto añadido también sea compartible.

## Destinos y separación de acceso

- Núcleo público: repositorio existente `NovusMotus/proyectos-publicos`, carpeta `cerebro-publico/`. Esa carpeta no es un repositorio nuevo.
- Complemento privado: destino existente previsto `NovusMotus/cerebro`, sujeto a comprobación de acceso y permisos antes de incorporar nuevas fuentes privadas. Este lote no cambia su visibilidad ni verifica qué proveedores están autorizados.
- Restringido local: fuera de Git, sincronizaciones compartidas y contextos de proveedores externos; almacenamiento en el nodo local autorizado. Su aislamiento efectivo sigue pendiente de verificación.

Los documentos de preparación y sus estados se conservan en el historial fijado en la cabecera. La publicación se acredita por las incorporaciones correspondientes; una cabecera histórica que decía «pendiente» no invalida una publicación posterior. Cada nueva lista y destino requieren su autorización. Este documento no concede accesos ni incorpora conversaciones completas.

## Continuidad e historial

Se conserva una síntesis vigente por actividad. Cada aportación fechada y cada nueva versión de esa síntesis usa un archivo nuevo, enlaza la anterior y no la borra. Los informes anteriores se conservan como antecedentes fechados; el índice y los recibos permiten localizar las aportaciones incorporadas y sus revisiones.

README, protocolo e índice son documentos canónicos: pueden actualizarse mediante cambios revisados y un historial de versiones. Las preparaciones anteriores permanecen conservadas localmente y Git conserva las versiones ya publicadas. Las fechas de las aportaciones históricas no se actualizan por revisar estos documentos canónicos.

- [Plantilla de continuidad](plantillas/continuidad.md): trabajo interno del Council o externo, con traspaso opcional.
- [Síntesis anterior conservada](informes/chatgpt/2026-11-01T162128Z_chatgpt_sintesis-integracion_01.md).
- [Precisiones anteriores conservadas](revisiones/2026-11-01T162128Z_chatgpt_precisiones-agentes_02.md).

## Índice, decisiones y condiciones de reutilización

La entrada de continuidad vigente es [INDICE_MEMORIA.md](INDICE_MEMORIA.md). El responsable mantiene allí las actividades, su estado y el enlace a la síntesis vigente; el índice no debe confundirse con un inventario completo de todas las actividades o conversaciones.

El formato y ubicación de decisiones se describen en [decisiones/README.md](decisiones/README.md). No se crea una decisión aprobada por rellenar una plantilla.

Este lote no incorpora una licencia ni autoriza nuevas condiciones de reutilización. La elección de licencia corresponde a la persona responsable. Publicar y permitir lectura en GitHub no significa haber elegido una licencia abierta. [Licencias en GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## Línea base e historial

La línea base pública anterior está disponible en el commit 660149a13eaf7d4d27405f407bbfd6e29bb4be17. Los hashes de preparaciones locales previas no se presentan como publicaciones. Los informes fechados conservan sus bytes; sus cabeceras describen el momento en que se escribieron. El índice enlaza el estado actualizado sin reatribuir ni reescribir esas observaciones.

## Entradas para consultar

- [Protocolo de contribución y acceso](PROTOCOLO_MEMORIA.md).
- [Síntesis de integración entre agentes](informes/codex/2026-11-01T174537Z_codex_continuidad-memoria_7bdd3c0ec74d.md).
- [Precisiones técnicas para agentes](revisiones/2026-11-01T174537Z_codex_revision-trazabilidad_2912536ec58b.md).
- [Catálogo y tesis públicas](https://github.com/NovusMotus/portfolio-tesis).
- [Código y proyectos públicos](https://github.com/NovusMotus/proyectos-publicos).

Los enlaces a los repositorios existentes son referencias de lectura; este lote no copia toda su historia ni sustituye sus fichas. Los proyectos reservados conservan su clasificación y autorización propias.

## Cómo comprobar el contexto compartido

Al empezar, cada agente debe identificar el commit público que consulta, los documentos que leyó y lo que sigue pendiente. Una conexión autorizada al ámbito privado registrará también su versión privada sin revelar su contenido al ámbito público. Tener el mismo commit disponible no demuestra haberlo leído.

El estado fechado y los límites están en [FASE_CODEX_CLAUDE.md](FASE_CODEX_CLAUDE.md). Hay pruebas históricas de lectura y ensayos de alcance limitado. El piloto público de noviembre tiene su issue11 y PR12; no acredita memoria idéntica entre asistentes, recuperación completa de historiales ni sincronización con el PC apagado. Esta actualización documental no instala conectores, servicios o sincronización.

## Visibilidad

Publicar en GitHub permite la lectura por cualquier persona de internet, además de los asistentes. Una carpeta o una rama de un repositorio público no se usa para ocultar datos privados. El ámbito privado debe quedar en otro repositorio con acceso restringido. [Visibilidad de repositorios en GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories).

## Corte de comprobación de noviembre11

La [PR12](https://github.com/NovusMotus/proyectos-publicos/pull/12) consta fusionada el 10 de noviembre de 2026. El depósito de la [issue11](https://github.com/NovusMotus/proyectos-publicos/issues/11) forma parte de ese piloto. La existencia de esos eventos no autoriza nuevas aportaciones, prueba todos los bots o acredita escritura de los chats móviles. El estado y los catorce ámbitos permanecen separados en [FASE_CODEX_CLAUDE.md](FASE_CODEX_CLAUDE.md).

## Portfolio y memoria, destinos relacionados

El plan acordado mantiene tres repositorios de portfolio: `NovusMotus/proyectos-publicos` para código publicable aprobado; `NovusMotus/proyectos-privados` para proyectos reservados y código privado autorizado; y `NovusMotus/portfolio-tesis` para versiones públicas aprobadas de las tesis. `NovusMotus/cerebro` es el complemento privado de esta memoria lógica, con controles propios. No se crean repositorios por cada proyecto ni se hacen públicas sus fuentes por enlazar una tesis. Esta descripción no cambia visibilidades o permisos.
