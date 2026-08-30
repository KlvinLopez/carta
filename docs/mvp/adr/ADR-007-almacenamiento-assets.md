# ADR-007 — Cloud Storage con separación público/privado y URLs firmadas

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
El sistema maneja tres clases de archivo: fotos originales subidas por el operador, borradores 3D pendientes de revisión y assets publicados que consume el comensal.

## Decisión
Dos buckets:

- `carta-assets-publicos` — lectura pública, servido por Cloud CDN, `Cache-Control: public, max-age=31536000, immutable`. Contiene sólo artefactos publicados, con nombre versionado por hash de contenido.
- `carta-assets-privados` — sin acceso público. Contiene originales y borradores. El back-office accede mediante URLs firmadas de 15 minutos.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Un solo bucket público | Expone borradores rechazados y fotos originales del restaurante. |
| Servir assets a través de la API | Consume CPU e instancias de Cloud Run en transferencia de bytes; peor latencia y costo. |
| Base de datos como almacén de blobs | Infla backups y degrada el rendimiento de PostgreSQL. |

## Consecuencias
- **Positivas:** caché agresiva sin riesgo de invalidación (nombres inmutables), coste de egreso optimizado por CDN, borradores no filtrables.
- **Negativas:** publicar implica copiar entre buckets. Es una operación de segundos y ocurre una vez por modelo.

## Verificación
Petición anónima a la URL de un borrador devuelve 403. Prueba de integración incluida.
