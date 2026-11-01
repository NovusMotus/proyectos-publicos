---
# Plantilla derivada; el documento creado con ella debe completar sus propios datos
id: "AAAA-MM-DDTHHMMSSZ_agente_continuidad-tema_id"
titulo: "Continuidad: nombre de la actividad"
autor: "pendiente"
agente: "identificador-del-agente"
proveedor: "desconocido"
herramienta: "pendiente"
entorno: "pendiente"            # herramienta y entorno realmente usados
modelo: "desconocido"           # modelo realmente usado; si no se declara, desconocido
atribucion_modelo: "desconocido"  # de dónde sale el dato del modelo
fecha_informe_utc: "pendiente-AAAA-MM-DDTHH:MM:SSZ"
fecha_corte_informacion: "desconocido"
fecha_importacion_utc: "no-importado"
estado: "borrador"              # borrador | revisado | corregido | obsoleto (estado del documento)
confianza: "no evaluada"        # baja | media | alta | no evaluada, siempre con motivo
procedencia_original: "elaboración nueva o identificador del original"
fuentes: []                  
relacionados: []                # informes, revisiones y decisiones de la actividad
version: "1"
version_anterior: "ninguna"     # id de la síntesis anterior; se conserva, no se borra
version_anterior_sha256: "no-aplica"
fecha_actualizacion_utc: "no-aplica"
modelo_actualizacion: "no-aplica"     # modelo de quien actualiza; no reemplaza a modelo
atribucion_modelo_actualizacion: "no-aplica"
cambios_version: []
sustituye_a: []                 # id de la síntesis anterior; la vigencia la fija quien mantiene el índice
revisado_por: "pendiente"
revisiones_realizadas: []       # agente/persona, entorno, modelo declarado, fecha y alcance
aprobacion_humana: "pendiente"
fecha_revision_utc: "pendiente"
tipo_documento: "continuidad"
actividad: "proyecto|investigacion|desarrollo|tarea-recurrente|herramienta|decision|resultado"
estado_actividad: "idea|en-curso|en-pausa|terminada|descartada"
ambito: "interno-council|externo|mixto"
nivel_acceso: "publico|privado" # un documento privado va solo al repositorio privado
responsables: []                # persona responsable y agentes asignados
---

# Continuidad: nombre de la actividad

## Pregunta y alcance

- **Origen:** necesidad, pregunta o encargo; quién, cuándo y dónde (identificador).
- **Objetivo:** qué buscamos.
- **Fuera de alcance:** qué no cubre.

## Resumen

Estado actual y próximo paso, en 3–5 líneas.

## Hechos y evidencia

| Afirmación | Fuente / localización | Fecha de la fuente | Comprobación realizada |
| --- | --- | --- | --- |

## Pruebas realizadas

| Prueba | Fecha UTC | Quién / herramienta / modelo | Resultado | Evidencia |
| --- | --- | --- | --- | --- |

## Interpretación

Hipótesis e inferencias, separadas de los hechos. Cada una indica qué la confirmaría.

## Propuestas

Alternativas y propuesta actual. No son decisiones aprobadas.

## Decisiones aprobadas

Solo las aprobadas por la persona responsable, con fecha y enlace a `decisiones/`. Si no hay ninguna: «ninguna».

## Resultados documentados

Enlaces a los resultados. Un informe de IA no acredita por sí solo una implantación ni un resultado medido.

## Pendientes

| Pendiente | Responsable | Bloqueo o condición |
| --- | --- | --- |

## Próxima acción y criterio de terminado

- **Próxima acción concreta:** pendiente.
- **Responsable:** pendiente.
- **Criterio de terminado verificable:** pendiente.

## Acceso y privacidad

- **Nivel:** público o privado.
  - Lo público se publica solo tras revisar su contenido y la lista de archivos.
  - Lo privado va únicamente al repositorio privado y a conexiones autorizadas para ese contenido, con entorno, contrato y DPA comprobados y preferencia por la UE.
  - Las credenciales no van en ninguno de los dos.
- **Fuente privada citada en público:** clave aleatoria (`REF-<uuid>`) más «fuente restringida; no verificable desde esta vista».
- **Límites:** quien no tiene acceso lo declara aquí. Consultar no autoriza a divulgar.

## Sincronización

| Fecha UTC | Agente / IA | Herramienta y modelo | Versión pública leída (commit) | Documentos públicos leídos | Acción |
| --- | --- | --- | --- | --- | --- |

Los identificadores de commits, rutas y documentos privados se registran únicamente en el repositorio privado, con acceso autorizado. Ubicación propuesta: `sincronizacion/<agente>/AAAA-MM-DDTHHMMSSZ_id.md`.

### Registro privado, solo para una nota privada

No aplica en esta vista pública. Al crear un documento privado autorizado, usar: fecha UTC; agente, proveedor, herramienta y modelo; commit público leído; commit privado leído; rutas o referencias privadas consultadas; alcance autorizado y acción realizada. No rellenar estos campos con datos privados dentro de un documento público.

La referencia desde una nota pública a ese registro usa una clave autorizada cuando proceda; no copia sus metadatos automáticamente.

Guardar esta síntesis no demuestra que las demás IA hayan actualizado su contexto. Tener el mismo commit disponible no demuestra haberlo leído.

## Traspaso (opcional)

No aplica.
<!-- Solo si la persona responsable decide trasladar la tarea: destino, encargo, documentos que debe leer, acceso autorizado y criterio de terminado.
Claude Code: comprobar en esa sesión si ha cargado AGENTS.md. Depende de la versión, de la configuración y de los CLAUDE.md o CLAUDE.local.md del directorio de trabajo y de los superiores. -->

## Confianza y límites

Motivo de la confianza, información ausente y qué podría cambiar la conclusión.

## Fuentes

Título, autor u organismo, URL, ruta relativa o clave `REF-…`, y fecha de consulta. Separar las fuentes consultadas de las no abiertas.

## Procedencia y revisión

- **Versiones anteriores:** enlazadas, sin borrar, y sin sustituir su atribución de modelo. Los desacuerdos van en `revisiones/`; no se simula consenso.
- **Incorporación:** rama → preparar cambios → seleccionar rutas concretas → revisar `git diff --cached` → commit → PR. El token es una vía opcional de autenticación.
- **Copias de trabajo:** sin escritores simultáneos en una copia; reutilizarla por turnos, con coordinación, sí está permitido.
- **Índice:** lo mantiene la persona responsable o quien ella designe expresamente.
- **Revisión:** quién la ha hecho y cuándo.

<!-- PROCEDENCIA EDITORIAL DE LA PLANTILLA: adaptación de Codex a partir de una plantilla de Grok (modelo no declarado). Esta nota no describe autoría ni revisión de una futura aportación. La trazabilidad de la plantilla queda en el manifiesto de entrega. -->
