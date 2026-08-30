# ADR-010 — Frontend estático servido por la propia API

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
El MVP tiene tres superficies web (comensal, comandas, back-office). Podrían desplegarse por separado en un hosting estático con dominio propio.

## Decisión
Las tres se compilan a `app/static/` y se sirven desde el mismo servicio de Cloud Run que la API, bajo el mismo dominio. La PWA del comensal se monta en `/m/{codigo_mesa}`, comandas en `/comandas`, back-office en `/admin`.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Firebase Hosting o Cloud Storage + CDN separado | Segundo pipeline de despliegue, configuración de CORS y riesgo de desincronización entre frontend y API. |
| Framework SSR (Next.js) en servicio aparte | Complejidad y costo desproporcionados para tres pantallas. |

## Consecuencias
- **Positivas:** un despliegue atómico: frontend y API siempre en la misma versión. Cookies de primera parte sin configuración de CORS. Un solo certificado y dominio.
- **Negativas:** las peticiones de archivos estáticos consumen instancias de Cloud Run. Mitigado con `Cache-Control` largo y hash en el nombre; los assets pesados (modelos, fotos) van por CDN desde GCS, no por la API.
- **Reversible:** sí; mover a un CDN sólo requiere cambiar la ruta base de los estáticos.

## Verificación
Un despliegue produce una única revisión de Cloud Run que responde tanto `/api/v1/...` como `/m/{codigo}`.
