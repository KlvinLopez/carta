# ADR-017 — El personal lleva el ciclo de la mesa; la sesión no se cierra sola

**Estado:** aceptada (Calvin, 2026-11-13, al aprobar la Spec 001) · **Fecha:** 2026-11-13 · **Enmienda:** [ADR-003](ADR-003-identidad-invitado.md) (vigencia del pase) y [ADR-013](ADR-013-personal-con-pin.md) (permisos por rol y el dueño como validador) · **Especificación:** [`docs/specs/001-ciclo-de-la-mesa/spec.md`](../../specs/001-ciclo-de-la-mesa/spec.md) (US-29 a US-39) · **Tareas:** T-3.0 a T-3.19 (`docs/plan/04_Fases_y_Tareas.md` §7)

## Contexto
La v1 cierra la mesa sola tras 3 h sin actividad (AC-02.4) y el pase del comensal dura 6 h (AC-01.2, ADR-003). Una comida real dura más, tiene gente que llega tarde, teléfonos apagados y un cobro al final; con esas reglas la mesa se cierra en plena sobremesa y el pase caduca antes de pagar (Spec 001 §1). Además, un QR impreso no puede guardar un secreto que rote: quien tiene la foto sigue entrando. Calvin decidió (Spec 001 §0, «Decidido por Calvin») que **el personal lleve el ciclo** y que **ningún reloj cierre ni cambie nada**. Carta exige al menos un validador: el dueño, que es el primer mesero si no hay más. El cobro ocurre fuera de la app.

## Decisión
1. **Ciclo de la mesa** con estados vivos `abierta → cuenta cerrada → pagada → limpia` (la sesión termina en «limpia») y candado: con la cuenta cerrada o después, nadie nuevo entra (AC-29.5); se reabre sólo antes de «pagada» (AC-29.11). La mesa se abre con el primer escaneo (AC-29.1) y pide en rondas sucesivas, cada una con su comanda (AC-29.2).
2. **Cuenta por comensal:** `pidiendo → cuenta cerrada → pagada`, y además `flotante` (perdió su lugar) y `retirado`. El comensal marca («cerré mi cuenta», «ya pagué»), el personal valida (AC-29.3–29.8). «Mesa limpia» exige que no haya comandas no terminales ni cuentas sin pagar o flotantes (AC-29.10, regla dura 8); la única salida es la liberación con cargos, sólo con permiso (AC-29.12).
3. **Sin cierre por reloj.** La sesión no caduca; los relojes sólo marcan estatus (verde < 20 min sin acciones, amarillo 20–40, rojo > 40), un recordatorio a los 30 min y, tras 2 h en rojo, que escanear exija aprobación (AC-30.2, 30.6–30.9). El cierre de 3 h (`CierreInactivas`) **se retira en T-3.18**, sólo después de que el personal limpie una mesa real de punta a punta en staging: en todo momento existe el cierre de 3 h o el flujo del personal (Spec 001 §12).
4. **Pase del comensal (enmienda a ADR-003):** sin vigencia fija mientras la mesa siga abierta; caduca tras **24 h sin usarse** y queda sin efecto cuando la mesa queda limpia (AC-30.1, 30.4, 30.5). Quien vuelve con el pase caducado entra como persona nueva y su cuenta anterior queda flotante. Cambia en T-3.12; hasta entonces sigue el JWT de 6 h. El resto del ADR-003 (JWT HS256 en cookie, sin datos personales, validable sin ir a la base) sigue igual.
5. **Una mesa a la vez, también entre restaurantes** (AC-34.x): un candado de dos partes que sólo conoce la cookie; no es control de seguridad (AC-34.5).
6. **Entrada de la mesa** (AC-33.x, 38.x): la entrada cerrada, las 2 h en rojo y el horario fuera de apertura producen la misma **solicitud de entrada**, con tope (5 por mesa, 20 por restaurante) y caducidad de 10 min. Regenerar el código sigue siendo el último recurso del dueño y no cierra la sesión (T-2.1).
7. **Permisos por rol (enmienda a ADR-013):** una tabla fija en la v1 (Spec 001 §5) comprobada en **un solo punto** del servidor (`puede(persona, permiso)`); una acción sin permiso responde 404 como cualquier ruta del rol (AC-36.3). El dueño puede todo y **opera desde su panel** con las mismas acciones del personal, sin PIN (AC-36.6). El punto 3 del ADR-013 («liberar cualquier mesa» como opción del capitán) se sustituye por la tabla: liberar con cargos sin pagar es sólo del dueño. El capitán sigue sin pantallas propias (AC-39.3).
8. **Costuras para la v1.1** (Spec 001 §7), construidas en T-3.0: cada cargo lleva quién lo pidió y un **reparto del cargo** (tabla, en la v1 una fila al 100 %) con registro de movimientos; la cuenta se calcula siempre sobre el reparto, en centavos enteros. El ítem tiene un estado «cancelado por el personal» con autor y hora y un origen (`comensal` · `personal`): **INV-3 se ajusta una sola vez** (un ítem confirmado no cambia; una corrección es cancelar y agregar). Tabla de permisos sembrada con migración para los existentes. Horario como lista de tramos por día con versión.
9. **Propina declarada:** el comensal elige una propina por defecto en su teléfono y puede cambiarla hasta que el personal valide su pago; al cerrar su cuenta se envía **sólo como dato** (consumo, propina, quién validó y cuándo; nada del comensal). El personal ve consumo, propina y total a cobrar, nunca por debajo del consumo (US-37). Carta no cobra, no custodia ni reparte propinas, y no produce su reporte en la v1. Cambia la línea «pagos, propinas o comisión» de «Qué NO construir».
10. **Horario del restaurante con zona horaria** y el ajuste «fuera de horario» (pedir aprobación por defecto, o rechazar siempre) (US-38).
11. **Marcas de tiempo** de cada paso, sin sobrescribir y sin datos personales (US-35).
12. **Ajustes por restaurante** con valores del piloto (Spec 001 §3): máximo 12 comensales, umbrales del estatus, recordatorio, 2 h en rojo, topes y vigencia de solicitudes. Los cambia Calvin, no el operador (salvo horario y su ajuste). La v1 no tiene planes ni cobros de Carta (una futura Spec 002).

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Mantener el cierre por inactividad (3 h) y el pase de 6 h | Corta sobremesas reales y caduca el pase antes de pagar (Spec 001 §1) |
| Cierre por inactividad más largo (6–12 h) | Sigue siendo un reloj que actúa: la mesa de ayer se cierra o no según la hora, no según si se pagó |
| El comensal cierra la mesa | Sin validación del personal, cualquiera libera una mesa con cargos sin pagar |
| Responsable del cargo como columna del ítem | Invitar a medida y dividir entre varios (v1.1) obligarían a rehacer la cuenta y las pantallas (Spec 001 §7) |
| Permisos editables desde la v1 | Más pantallas y más formas de configurarlo mal; la tabla fija ya funciona sin configurar (AC-36.4) |
| QR que rota o código corto por sesión | Lo impreso no puede rotar; el código corto añade fricción a cada mesa. La entrada cerrada con aprobación corta el ataque sin reimprimir |

## Consecuencias
- **Positivas:** ninguna mesa se corta en plena comida; el personal ve en qué paso va cada mesa; un QR filtrado se contiene con un toque; quedan las horas de cada paso; la v1.1 sólo añade sobre las costuras.
- **Negativas:** la Fase 3 pasa de 7 a 17 tareas (19 con las de ADR-018); depende de que el personal limpie las mesas (lo cubren el estatus, el recordatorio y la aprobación tras 2 h en rojo); riesgo aceptado: un comensal queda bloqueado en otro restaurante si su mesa pasa la noche abierta (Spec 001, US-34).
- **Legal:** guardar la propina declarada por trabajador es un dato laboral del restaurante (LFT art. 346 y 350); queda para la revisión legal de T-4.5.

## Verificación
Los criterios AC-29.x a AC-39.x de la Spec 001, indexados en [`01_Alcance_v1.md` §6](../../plan/01_Alcance_v1.md), cada uno con su prueba marcada `@pytest.mark.ac(...)` o `// @ac` en las tareas de la Fase 3; `uv run python scripts/verificar_trazabilidad.py --fase 3 --estricto` al cerrar la fase. T-3.18 se verifica además con una mesa real limpiada por el personal en staging antes de retirar el cierre de 3 h.
