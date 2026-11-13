# ADR-013 — El personal entra con nombre y PIN; el capitán es un mesero con opciones extra

**Estado:** aceptada; enmendada por [ADR-017](ADR-017-el-personal-lleva-el-ciclo.md) (2026-11-13: permisos por rol con una tabla fija comprobada en un solo punto del servidor, que sustituye a la lista del punto 3; el dueño opera desde su panel; el sondeo de 5 s de las consecuencias lo sustituye el aviso del ADR-018) · **Fecha:** 2026-11-02 · **Decide:** Calvin · **Sustituye:** la "Vista de Comandas con token de dispositivo" del TDD §6 y la tabla `dispositivo_restaurante`

## Contexto
El MVP de agosto no tenía rol de mesero: una tableta en la barra con un token de dispositivo mostraba las comandas. La corrección de mercado de septiembre estableció que el restaurante no necesita computadora y que Carta corre en el teléfono del personal. El prototipo diseñó un mesero con perfil portable (modelo Airbnb) y un capitán con ocho pantallas propias. Para la v1 el mesero es indispensable, pero el perfil portable y las pantallas del capitán no.

## Decisión
1. Tabla `personal_restaurante` (nombre, rol `mesero` | `capitan`, PIN con Argon2id, activo). El operador la administra desde el panel.
2. Acceso en `/staff/<slug>`: la persona elige su nombre de una lista y teclea su PIN de 4–6 dígitos. Cookie firmada de 12 h limitada al restaurante. Límite de 5 intentos por minuto por restaurante y dirección, bloqueo progresivo y mensaje uniforme.
3. **El capitán no tiene pantallas propias.** Es la misma interfaz del mesero; con `rol = capitan` se muestran y se permiten por API las opciones adicionales (resumen del turno, liberar cualquier mesa, pausar platillos en bloque). Un mesero que llama a esas rutas recibe 404.
4. Todos ven todas las mesas (sin asignación en v1). Marcar un platillo agotado lo puede hacer cualquier persona del personal: es una necesidad operativa de las 21:00, no un privilegio.
5. Sin cuentas de mesero, sin correo, sin perfil portable, sin dispositivos autorizados. Un PIN se revoca desactivando a la persona.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Token de dispositivo en una tableta (TDD de agosto) | Exige una tableta en la barra; el restaurante pequeño no la tiene y el mesero no la ve desde el piso |
| Cuenta por mesero con Firebase (Google/correo) | Fricción de alta para personal con rotación alta; muchos no usan correo en el trabajo |
| Perfil portable del mesero (prototipo P19/P20) | Depende de reputación, reseñas y datos laborales; es v3 |
| Pantallas separadas para el capitán (C01–C08) | Duplica interfaz; en la v1 el capitán hace lo mismo que el mesero más tres acciones |

## Consecuencias
- **Positivas:** un mesero nuevo entra en 10 segundos; no hay datos personales del personal más allá de un nombre; una sola app para el piso.
- **Negativas:** un PIN compartido por descuido deja atribuciones imprecisas (quién atendió qué). Aceptable en el piloto; el operador puede reasignar PINs. No hay notificaciones push: el sonido depende de que la app esté abierta; se mitiga con el sondeo de 5 s y la petición inmediata al volver a primer plano.
- **Reversible:** sí; `personal_restaurante` puede ligarse a `usuario` cuando llegue el perfil portable.

## Verificación
`tests/integration/test_op_entrar.py`: 6.º intento en un minuto → 429; PIN incorrecto y nombre incorrecto devuelven el mismo mensaje; cookie de otro restaurante → 404 en todo `/op`; mesero en `/op/resumen` → 404; la fila en base no contiene el PIN.
