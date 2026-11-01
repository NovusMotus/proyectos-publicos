# Portfolio visual, grafo y búsqueda con fuentes

Candidato del segundo lote (01-11-2026), aún sin publicar. Contiene la aplicación de las 82 tesis públicas de nueve ámbitos. El código va en proyectos-publicos; las tesis y los datos públicos permanecen en portfolio-tesis. Las relaciones son interpretaciones de IA pendientes de revisión de Javier, no aptitudes acreditadas.

## Preparar una copia local

Requiere Python 3.10 o posterior. Coloca las copias locales de proyectos-publicos y portfolio-tesis juntas. Desde esta carpeta ejecuta:

```
python preparar_datos.py --tesis-repo ../../portfolio-tesis
python -m unittest test_app -v
python server.py --port 8877
```

Abre http://127.0.0.1:8877 en ese ordenador. INICIAR.cmd ofrece un lanzador para Windows. El montaje verifica todos los hashes antes de escribir; si un archivo existente difiere, lo conserva y pide usar una copia nueva. No descarga datos ni usa credenciales. No es una dirección pública ni permite abrirlo desde el móvil; el alojamiento necesita una revisión aparte.

La navegación y la búsqueda son locales. «Preguntar con fuentes» usa el inicio de sesión local de Codex del propietario, solicita el modelo indicado en la interfaz y puede consumir cuota. No se incluyen credenciales ni una cuenta compartida. No expongas este servidor de generación a Internet. En esta preparación no se ha invocado generación ni se ha consumido cuota para probar respuestas.

## Versiones y alcance

VERSION.json y CHANGELOG.md conservan las fechas y atribuciones históricas de la aplicación. HISTORIAL_APLICACION.md conserva la documentación de la preparación anterior: sus referencias a review/ y sus afirmaciones de pruebas son registros históricos, no archivos incluidos ni verificaciones nuevas. Los estados antiguos de «candidato» en las fuentes se conservan como metadatos de origen; la aprobación real del primer lote es posterior.

DATOS_PUBLICOS.json fija los 246 archivos de origen ya publicados y los datos propuestos. No contiene originales privados. Los datos nuevos del segundo lote necesitan aprobación. Los constructores usan por defecto el checkout hermano portfolio-tesis; PORTFOLIO_TESIS_REPO permite elegir otra copia pública local. Reconstruir datos altera archivos de la propia aplicación; revisa las diferencias antes de proponer otra versión.

Esta edición de empaquetado: Codex/OpenAI gpt-6.1-sol, atribuido al runtime turn_context de 2026-10-31T22:40:31.050Z. No se cambia la atribución de las tesis, imágenes ni anotaciones históricas. No se han revisado aquí por completo los textos de las 82 tesis ni su validez clínica, jurídica o comercial.

La reconstrucción opcional de miniaturas requiere Pillow; no hace falta para usar las imágenes incluidas. El contexto laboral recoge seis referencias públicas consultadas el 17-10-2026: es una comparación editorial histórica, no confirma vacantes vigentes ni acredita aptitudes personales.
