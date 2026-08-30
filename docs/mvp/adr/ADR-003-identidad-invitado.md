# ADR-003 — Identidad de invitado con token firmado, sin cuenta

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
Capa 0 requiere que el comensal use todo el producto sin registrarse (AC-22.3), pero el sistema necesita distinguir "quién pidió qué" dentro de una mesa y evitar que un comensal modifique la orden de otro (AC-09.2).

## Decisión
Al abrir `/m/{codigo_mesa}` se crea una fila en `miembro_sesion` y se emite un JWT HS256 con `sub = miembro_id`, `sesion_id`, `mesa_id`, `restaurante_id` y vigencia de 6 horas, entregado en cookie `HttpOnly; Secure; SameSite=Lax`. No contiene ningún dato personal. El login con Firebase es opcional y, cuando ocurre, vincula el `miembro_sesion` existente al `usuario`.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Registro obligatorio | Contradice la premisa central del producto. |
| Identificador sólo en `localStorage` sin firma | Manipulable: cualquiera podría hacerse pasar por otro miembro. |
| Sesión de servidor con cookie opaca | Obliga a almacenar estado de sesión; el JWT permite validar sin ir a base. |
| Huella de dispositivo (fingerprinting) | Invasivo, frágil y contrario al compromiso de privacidad. |

## Consecuencias
- **Positivas:** cero fricción, sin PII, autorización verificable sin consultar la base en cada petición.
- **Negativas:** si el comensal borra cookies pierde su orden en curso. Mitigación: espejo del identificador en `localStorage` para reconstruir (AC-01.4).
- **Seguridad:** el secreto de firma vive en Secret Manager y rota trimestralmente; la rotación invalida tokens vigentes, aceptable con ventana de 6 h.

## Verificación
Prueba de integración: un miembro con token de la sesión A recibe 404 al intentar modificar la orden de un miembro de la sesión B.
