# Portfolio: RAG y grafo de ideas

Aplicación local de las **82 tesis de 9 ámbitos**. Permite recorrer proyectos, ideas y posibles capacidades, comparar enfoques y preguntar con citas verificables. Incluye los ámbitos clínicos, educación, gobierno, finanzas, tecnología, negocios, creación, metodología y desarrollo profesional.

Edición visual del 16-10-2026: portada con imágenes de los nueve ámbitos, animaciones del grafo, transiciones de fichas y citas, controles más amplios y adaptación a móvil. «Animaciones: activas» permite pausar el movimiento; se respeta la preferencia de movimiento reducido del sistema. El contenido permanece visible sin depender de una animación. Fechas, modelo y cambios en VERSION.json y CHANGELOG.md.

La revisión de encaje v3 ajusta cada etiqueta a su anchura real y al contorno del círculo. Los títulos largos se abrevian visualmente en el mapa; permanecen completos en los encabezados, la ficha, los nombres accesibles y la lista de conexiones. El mapa pagina sus vecinos para separar etiquetas. La auditoría de tamaños y sus límites quedan en `review/text-fit-summary.json`.

Las miniaturas WebP ya están incluidas. Solo su reconstrucción opcional con `python prepare_visual_assets.py` necesita Pillow; el servidor sigue usando la biblioteca estándar. Las pruebas de preferencias de movimiento se ejecutan con `node test_motion.cjs`; las comprobaciones de navegador y la revisión independiente están en `review/`.

## Abrir después de apagar el ordenador

Haz doble clic en **INICIAR.cmd**. Abre `http://127.0.0.1:8877`. Si el servidor ya está disponible, reutiliza la aplicación. Requiere Python 3.10 o posterior; busca primero el Python incluido con Codex y después `py` o `python`. No instala dependencias.

Si PowerShell bloquea scripts según la política de tu equipo, puedes iniciar en una terminal: `python server.py --port 8877` y abrir esa dirección. El lanzador no cambia políticas del sistema. Para cerrar un servidor iniciado por el lanzador: `powershell -NoProfile -File cerrar.ps1`. Un servidor iniciado en terminal se cierra con Ctrl+C en esa terminal.

La dirección solo funciona en este ordenador. No es un enlace público ni funciona desde el móvil. No hay despliegue, repositorio nuevo, cuenta nueva ni arranque automático al encender Windows.

## Presentación de entrada

La primera visita a la portada reproduce una presentación silenciosa de unos 12 segundos: cápsula que gira y se abre, anillos, partículas, imágenes que salen en espiral, conexiones en movimiento y resolución a mosaico. La tipografía y las imágenes de nueve ámbitos siguen una coreografía continua, calculada en cada frame por un único reloj. Después abre el portfolio completo. «Saltar presentación» y Escape permiten entrar de inmediato; se puede pausar, avanzar por cuatro escenas y volver a verla desde la portada. La transcripción pausa la reproducción al abrirse.

Para repetirla directamente: `http://127.0.0.1:8877/?intro=1`. La visita normal la muestra una vez por sesión. Los enlaces a una ficha o ancla entran directamente. Con movimiento reducido del sistema no se reproduce automáticamente; la presentación admite avance manual. Es una animación integrada en la web, sin audio ni vídeo exportado. La dirección sigue siendo local y requiere el servidor iniciado.

Pruebas específicas: `node test_intro.cjs`. Movimiento dentro de cada escena, pausa y ajuste visual comprobados en `review/motion-v9-qa.json`; la revisión independiente y sus límites están en `review/motion-v9-review.json`. `review/presentacion-motion-v9.gif` muestra una captura animada muestreada del navegador; no se sirve por HTTP ni sustituye la animación nativa. Para verla de nuevo se entrega el enlace de reproducción activo, sin dejar el modal pausado.

## Uso

- La portada presenta a Javier y los ámbitos de trabajo. «Ver proyectos y aportaciones» abre un catálogo visual con las 82 fichas, en páginas de seis. Se puede buscar por tema o habilidad y filtrar por ámbito; el mosaico también activa ese filtro. Las imágenes son ilustraciones conceptuales.
- Cada tarjeta muestra propósito, aportación y trabajo documentado tomados literalmente del corpus, con límites completos desplegables y acceso al lector y al mapa. La guía de lectura permanece como ayuda opcional cerrada, después del catálogo.
- Sin un enlace específico, el explorador inicia en la propuesta de reforma educativa con el selector, mapa y detalle alineados. Un enlace con `?project=`, `?capability=` o `?topic=` conserva la selección indicada.
- El acceso principal recupera las 82 fichas y limpia búsqueda y ámbito del catálogo visual. Las rutas opcionales de la guía conservan acceso al ejemplo educativo y al mapa de habilidades. La ayuda del mapa explica puntos, líneas y límites de interpretación.
- Entra por una capacidad, una idea o cualquiera de los 82 proyectos. Los filtros y la búsqueda de títulos conservan el catálogo completo disponible.
- Selecciona nodos para recorrer conexiones. Sus fundamentos llevan a pasajes y versiones. Existe una lista accesible equivalente al grafo.
- Cada proyecto tiene ilustración conceptual, TL;DR, límites y acceso al texto completo. El lector añade una sección «Capacidades e ideas relacionadas», conservando el texto fuente.
- «Buscar pasajes» recupera texto local. «Preguntar con fuentes» genera una respuesta con los pasajes recuperados y verifica su soporte en una segunda pasada. Las citas se abren para comprobar el fragmento y su versión.

## Alcance de las relaciones

El grafo contiene 116 nodos y 221 relaciones: 82 proyectos, 10 capacidades y 24 ideas; 41 vínculos de capacidades, 152 temáticos y 28 comparaciones entre proyectos. Las 249 evidencias adjuntas son citas exactas. Las relaciones son **interpretaciones de IA, pendientes de revisión de Javier**. No acreditan habilidades ni desempeño profesional. En 45 proyectos no se atribuye una capacidad personal por falta de evidencia suficiente; permanecen incluidos en el catálogo y en las relaciones temáticas.

Se distinguen enfoques compartidos, posibles transferencias y contrastes. Una afinidad no prueba que una solución se haya aplicado, validado o trasladado entre proyectos. Las fechas documentales y los inicios declarados conservan sus distintas procedencias.

Las categorías usan vocabulario profesional reconocible, con equivalentes en inglés y las etiquetas anteriores como alias de búsqueda. En su detalle se distingue habilidad transversal, metodología, técnica o práctica exploratoria y se concreta qué permite examinar el pasaje. Se documenta el uso de algunos términos en LinkedIn; no se afirma que todas las traducciones formen parte de su catálogo oficial ni que Javier haya obtenido certificaciones. «Comunicación» no se transforma en «Gestión de stakeholders» sin evidencia específica. Las búsquedas inglesas recuperan los pasajes españoles originales.

El desplegable «Relación con puestos de trabajo» compara el tema de cada capacidad con requisitos públicos, consultados el 17-10-2026. Es contexto editorial, no una valoración del candidato. Las fuentes de empleo no son citas de los proyectos ni se recuperan como evidencia personal. La muestra es intencional y no mide frecuencias del mercado; un anuncio accesible tampoco confirma que siga abierta la candidatura. `content/recruiting_context.json` contiene únicamente vocabulario, comparaciones y enlaces públicos; el historial de búsqueda y el informe privado permanecen fuera de la aplicación.

## Generación y herramientas

La recuperación utiliza BM25, vocabulario en español y anclas de evidencia del grafo. No usa embeddings remotos ni una base vectorial. La generación utiliza el ejecutable oficial de **Codex**, con la sesión existente del propietario, y solicita explícitamente **gpt-6.1-sol**. Para otra edición se puede configurar `PORTFOLIO_MODEL` antes de arrancar; el modelo solicitado aparece en el estado y en cada respuesta. No se atribuye un modelo interno que el proveedor no haya expuesto.

**Cada respuesta generada envía la pregunta y los pasajes públicos candidatos recuperados al proveedor de Codex**, y las respuestas aceptadas requieren dos invocaciones que consumen la cuota de la cuenta. Una abstención puede requerir una o ninguna. La búsqueda y navegación funcionan sin generación ni sesión. No se incluyen originales privados ni credenciales. No se comparten contraseñas entre agentes. La inferencia desactiva herramientas, conectores, shell, navegación y subagentes. Se rechazan eventos de ejecución inesperados.

Las respuestas aceptadas requieren citas exactas y una comprobación automática separada del soporte. Esto reduce errores, pero no garantiza exhaustividad ni sustituye la revisión humana. La recuperación léxica puede omitir un pasaje pertinente. Ante ausencia de evidencia o fallo del proveedor, se informa del límite y se conservan las fuentes recuperadas.

Implementación: Python con biblioteca estándar, HTML/CSS/JavaScript y SVG, sin CDN ni librerías externas. Preparación actual por Codex/OpenAI `gpt-6.1-sol`; revisión independiente `gpt-6-astra`. La extracción de anotaciones registra `no_confirmado` cuando su agente no dispone de evidencia del modelo exacto. Las atribuciones históricas y los modelos de cada tesis permanecen en TESIS.md, en la sección de herramientas; VERSION.json conserva fechas y versiones; las imágenes preexistentes conservan su atribución, con motor exacto no expuesto cuando corresponde. Véase VERSION.json para esta edición.

## Archivos y actualización

`public-sources/` incluye copias de las 82 tesis, sus VERSION.json e ilustraciones. `web/data/` contiene el corpus y el grafo compilados; `build_manifest.json` registra hashes y cobertura. El servicio solo expone rutas permitidas y escucha en loopback. `private-runtime/` y `review/` no se sirven por HTTP ni se destinan a publicación.

Para reconstruir datos en esta preparación: `python build_corpus.py`. Este comando requiere las fuentes hermanas `../documentacion-por-proyecto/portfolio-tesis` y las anotaciones de `content/annotations.json`. Una copia portable de la app funciona con sus datos compilados sin esa carpeta hermana. Actualizar una tesis requiere revisar su contenido, modificar anotaciones y comprobar de nuevo hashes, citas, límites y privacidad; no hay sincronización automática de originales o de GitHub.

Verificación local: `python -m unittest test_app -v`. La auditoría independiente y pruebas de generación quedan en `review/`. Ni esas pruebas ni las comprobaciones de citas son una garantía absoluta.

## Destino previsto

Se mantiene el reparto en **tres repositorios**: `proyectos-publicos` para el código publicable, `proyectos-privados` para desarrollos reservados y `portfolio-tesis` para tesis y documentación pública. Esta aplicación no crea un cuarto repositorio. Todo sigue en preparación local; publicar requiere revisar la clasificación y confirmar cuenta, nombres y visibilidad.
