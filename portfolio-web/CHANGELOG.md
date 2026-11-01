# Cambios del portfolio

## 2026-10-17 · v9 · Coreografía continua de apertura

- Se sustituyen las transiciones de escenas y del mosaico por una secuencia de movimiento continuo: cápsula que gira, carga y se abre, anillos y partículas, imágenes que emergen y orbitan, trazos con puntos que viajan entre ellas y resolución final a mosaico. Tipografía cinética sincronizada con la misma secuencia de 12 segundos.
- Todo el movimiento del modal, incluido canvas, depende de un único reloj. Pausa congela poses y partículas; reanudar conserva el instante. Con movimiento reducido se muestran composiciones estáticas por escena. El portfolio conserva sus 82 fichas, nueve ámbitos, fechas, fuentes y límites.
- Dos series temporales de siete muestras prueban transforms distintos dentro de una misma escena; la pausa mantiene igualdad. Pruebas de fin a 12 s, permisos, reinicio, determinismo, poses finitas y encaje final de imágenes superadas. Cuatro escenas comprobadas a 320×600, 390×844, 768×900 y 1280×720, sin texto fuera de pantalla ni controles principales inaccesibles en esas muestras.
- Reproducción real grabada en 67 capturas durante 12,7 segundos: termina con el modal cerrado y el portfolio visible. `review/presentacion-motion-v9.gif` es una vista previa muestreada de esas capturas; la web reproduce la animación nativa. No se añade el GIF a las rutas públicas.
- Revisión independiente `gpt-6-astra` registrada en `review/motion-v9-review.json`. No se garantiza ausencia de solapes en todos los frames; no se emula movimiento reducido ni se prueba lector de pantalla o comprensión de reclutadores. Codex/OpenAI `gpt-6.1-sol`, turn_context de 2026-10-17T19:35:43.946Z. V8 preservada; sin publicación.

## 2026-10-17 · v8 · Presentación animada de entrada

- Apertura a pantalla completa de 12 segundos: identidad, observación y conexión de ideas, desarrollo con IA y alcance de 82 fichas en nueve ámbitos. Un núcleo luminoso se abre para revelar el mosaico de imágenes conceptuales ya existentes.
- Se muestra en la primera visita a la portada por sesión y al pedir `?intro=1`. Las entradas directas a proyectos, capacidades, ideas o anclas mantienen el acceso directo. Al terminar aparece el portfolio completo.
- Controles de saltar, pausa, cuatro escenas, repetición y salida con Escape. Abrir la transcripción pausa el reloj; una repetición la cierra. Se restaura el foco. Movimiento reducido evita reproducción automática y permite avanzar manualmente.
- Animación nativa HTML/CSS/JavaScript, sin sonido ni archivo MP4 exportado. Servidor local con nueva ruta estática permitida para intro.js; no se exponen otras rutas.
- Cinco bloques de pruebas del reloj y pruebas de movimiento superados. Comprobadas cuatro escenas en 320, 390, 768 y 1280 píxeles; corregido desbordamiento del resplandor. Verificados fin automático a 12 s, lectura pausada, repetición, salto, Escape, primera visita y enlace directo. No se prueba lector de pantalla ni se emula movimiento reducido en navegador; el ciclo completo de tabulación inversa no quedó establecido.
- Revisión independiente `gpt-6-astra` en `review/intro-review-2026-10-17.json`, diferenciada de las comprobaciones de navegador del principal. Preparación Codex/OpenAI `gpt-6.1-sol`, confirmado en turn_context de 2026-10-17T19:25:24.814Z. V7 preservada. Fuentes, corpus, relaciones, fechas y atribuciones históricas sin cambios; sin publicación.

## 2026-10-17 · v7 · Entrada visual desde el CV

- Identidad y descriptor profesional visibles en portada, con explicación breve y acceso principal a proyectos y aportaciones. El contexto profesional se usa para la presentación solicitada; no se indexan CV ni datos privados.
- Catálogo visual anterior al mapa: las 82 fichas en 14 páginas de seis, con imágenes conceptuales, búsqueda por tema o habilidad y filtro por los nueve ámbitos. El orden inicial intercala ámbitos, sin puntuaciones ni clasificación de competencias.
- Propósito, aportación y trabajo documentado se muestran completos; los límites íntegros permanecen disponibles en un desplegable. Los títulos breves de seis entradas conservan el título original en el enlace accesible y en el lector completo.
- El mosaico lleva al ámbito del catálogo visual. Guía y ayuda del mapa quedan opcionales, cerradas inicialmente; las conexiones siguen disponibles desde cada tarjeta.
- Comprobados 82 IDs únicos y los cuatro campos de resumen y enlaces frente al corpus, sin discrepancias. Probados nueve filtros, búsqueda inglesa, cero resultados, mosaico y acceso al mapa; sin desbordamientos detectados en 320, 390, 768 y 1280 píxeles con los límites abiertos. Movimiento y sintaxis verificados.
- Revisión independiente `gpt-6-astra`, registrada en `review/cv-entry-review-2026-10-17.json`; la atención y comprensión de reclutadores no se han medido. Preparación por Codex/OpenAI `gpt-6.1-sol`, confirmado en turn_context de 2026-10-17T19:01:02.454Z. Se conserva v6. Fuentes, corpus, relaciones y atribuciones históricas sin cambios; sin publicación.

## 2026-10-17 · v6 · Primera visita

- Portada con identidad de Javier, definición del portfolio y distinción entre ideas, propuestas y prototipos. El acceso principal dirige a una guía breve antes del mapa.
- Tres rutas: leer una ficha educativa de ejemplo, explorar resolución de problemas o abrir las 82 fichas. El ejemplo explica el formato y no sustituye el catálogo completo.
- Ayuda visible y plegable para entender el centro, los puntos y las líneas del mapa, y la interpretación de habilidades.
- La primera selección y «Reiniciar» muestran el mismo proyecto en selector, mapa y detalle. Los enlaces directos a proyectos conservan su destino.
- Las rutas limpian filtros y llevan el foco a su contenido: ficha, mapa o catálogo. Corregido el destino móvil del ejemplo tras la revisión independiente.
- Comprobadas las cuatro rutas a 320, 390, 768 y 1280 píxeles, más filtros, enlace directo y reinicio. Sin desbordamiento horizontal detectado en los bloques nuevos. Verificación de preferencias de movimiento y sintaxis JavaScript superadas.
- Revisión independiente `gpt-6-astra`: estática y sobre registros de QA del principal; no prueba con visitantes ni lector de pantalla. Preparación por Codex/OpenAI `gpt-6.1-sol`, confirmado en turn_context de 2026-10-17T16:04:10.002Z. Fuentes, datos, relaciones y atribuciones históricas sin cambios. Sin publicación.

## 2026-10-17 · v5 · Aptitudes y familias de empleo

- Contexto editorial en las diez capacidades para explicar su relación con requisitos publicados de producto, procesos, automatización, adopción, formación y gobernanza. Cada desplegable incluye fuentes y fecha de consulta.
- La investigación privada de familias y candidaturas queda en `CVs/Analisis_aptitudes_portfolio_2026-10-17.json`, fuera de la aplicación. La app solo incorpora comparaciones y enlaces públicos; no indexa ofertas como evidencia de Javier.
- Se conservan las 82 tesis, sus versiones, 41 relaciones de capacidades y 249 evidencias. No se atribuyen habilidades adicionales, colaboración humana por coordinar agentes, implantaciones o resultados que las citas no acrediten.
- Revisión independiente `gpt-6-astra`: nueve fuentes primarias contrastadas y preservación de anotaciones comprobada. Seis regresiones pasan. El principal comprobó los diez desplegables abiertos a 320 y 1280 píxeles, 20 casos sin desbordamientos detectados.
- Preparación por Codex/OpenAI `gpt-6.1-sol`, confirmado en turn_context de 2026-10-17T15:30:21.147Z. Edición v4 conservada. Sin publicación ni cambios en LinkedIn.

## 2026-10-17 · v4 · Vocabulario de habilidades

- Etiquetas más reconocibles para selección: resolución de problemas, pensamiento crítico, sistémico y creativo, comunicación y documentación. Se conserva la distinción entre categorías transversales, técnicas, metodológicas y práctica exploratoria.
- Cada categoría incorpora nombre inglés y etiqueta anterior; ambos funcionan en el catálogo y la recuperación de pasajes. Las consultas inglesas recuperan citas existentes, sin traducirlas ni convertir etiquetas en evidencia.
- Los nombres contrastados con LinkedIn tienen fuente de uso; las restantes denominaciones son editoriales. No se presenta un catálogo oficial completo ni se añade gestión de stakeholders sin evidencia pertinente.
- Permanecen los 82 proyectos, 10 IDs de capacidades, 41 vínculos de capacidades y 249 evidencias; las fuentes y sus versiones no cambian. Comparación reproducible en `review/check_terminology.py`.
- Seis pruebas de regresión y revisión independiente `gpt-6-astra` sin hallazgos materiales. Comprobados los diez centros de capacidad y todas sus páginas en 320 y 1280 píxeles: 25 vistas, sin desbordamientos ni solapamientos detectados por la sonda geométrica. Esta comprobación de interfaz corresponde al agente principal.
- Implementación Codex/OpenAI `gpt-6.1-sol`, confirmada por turn_context de 2026-10-17T14:10:06.363Z. Edición anterior conservada en `versions/2026-10-16-v3.json`. Sigue en preparación local.

## 2026-10-16 · v3 · Encaje de textos

- Las etiquetas del grafo se calculan con la anchura real del texto y el espacio disponible dentro del círculo. Se conserva el título completo en encabezados, fichas y nombres accesibles.
- Círculo central y órbita ampliados; 4, 6 u 8 vecinos por página para separar etiquetas. Los seis nombres propios de proyecto se muestran completos en una línea dentro del nodo.
- Encabezado móvil a ancho completo y ajuste de textos largos en botones de relaciones, fichas y citas.
- Comprobados los 116 nodos y sus 550 páginas entre cuatro tamaños de pantalla, más los 82 lectores completos en móvil y casos de citas largas. Revisión independiente: `gpt-6-astra`; metodología, resultados y límites en `review/text-fit-summary.json` y `review/text-fit-review-2026-10-16.json`.
- Fuentes, corpus y relaciones sin cambios. Implementación por Codex/OpenAI `gpt-6.1-sol`, con atribución de ejecución en VERSION.json. Edición anterior conservada en `versions/2026-10-16-v2.json`.

## 2026-10-16 · v2 · Presentación y movimiento

- Portada editorial con fotografías conceptuales de los nueve ámbitos y acceso a todos sus proyectos.
- Animaciones de entrada, navegación del grafo, cambios de ficha, citas, imágenes y estados de carga; indicador de progreso de lectura.
- Pausa global conservada durante la sesión. Respeto a `prefers-reduced-motion`, cancelación de animaciones activas y pausa al ocultar la pestaña.
- Textos y controles mayores, correcciones de ancho móvil y conservación del foco al reconstruir catálogo, mapa y detalle.
- Miniaturas WebP para las 82 ilustraciones. Compresión y reducción de tamaño mediante Pillow; no se ha generado contenido nuevo ni cambiado los originales.
- Las 82 tesis, sus versiones, el corpus y las relaciones permanecen sin cambios. Continúa la preparación local sin publicación.

Implementación: Codex/OpenAI `gpt-6.1-sol`, confirmado en el contexto de ejecución de 2026-10-16T00:23:12.614Z. Revisión independiente de esta edición: `gpt-6-astra`; alcance y resultados en `review/animation-review-2026-10-16.json`. Esta revisión no acredita competencias ni resultados de los proyectos.

## 2026-10-15 · v1 · RAG y grafo

Primera aplicación local con 82 tesis, búsqueda, respuestas con citas y comprobación de soporte, grafo con 221 relaciones y lector con conexiones. Metadatos de la edición anterior conservados en `versions/2026-10-15-v1.json`.
