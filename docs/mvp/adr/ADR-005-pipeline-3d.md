# ADR-005 — Modelos 3D: generación con modelo local + revisión humana obligatoria

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
El producto depende de que el platillo se vea bien en 3D. Un modelo deforme daña la marca más que no tener modelo. Se evaluaron tres orígenes: estudio manual, captura por el restaurante (fotogrametría en dispositivo) y generación automática desde foto.

## Decisión
Pipeline de dos vías con una única puerta de salida:

1. **Vía asistida (por defecto):** el operador sube la foto del platillo y solicita generación. Un worker con un modelo local de imagen a 3D produce un borrador.
2. **Vía curada (respaldo):** el equipo Carta sube un `.glb` hecho a mano o capturado con fotogrametría de escritorio (US-20).

Ambas desembocan en el estado `listo_para_revision`. **Ningún modelo se muestra al comensal sin aprobación humana explícita** (INV-5, AC-19.1).

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Publicación automática sin revisión | Un solo modelo grotesco en una mesa destruye la percepción de calidad. El costo de revisar es de segundos. |
| Fotogrametría en el teléfono del restaurante | Feature grande, calidad dependiente del usuario, y riesgo de hundir el cronograma del MVP. Se difiere a v2. |
| Servicio de generación 3D en la nube por API | Costo por modelo y dependencia externa; además envía fotos del cliente a un tercero, lo que complica el aviso de privacidad. |
| Sólo modelos genéricos por categoría | Rompe la promesa: el comensal quiere ver *ese* platillo. |

## Consecuencias
- **Positivas:** calidad controlada, costo marginal cercano a cero (cómputo local), sin dependencia de terceros, y un camino de escape manual siempre disponible.
- **Negativas:** el proceso no es instantáneo (minutos) y requiere una persona revisando. Aceptable: el menú se carga una vez en el onboarding.
- **Escalabilidad:** la revisión humana no escala a miles de restaurantes; se revisará en v2 con umbral de confianza automático.

## Verificación
Prueba de integración: un `modelo_3d` en estado `listo_para_revision` no aparece en la respuesta del endpoint público del menú.
