---
name: especificar
description: Escribe la especificación de una feature o cambio de alcance de Carta que no está en el plan (docs/specs/NNN-nombre/spec.md) con criterios EARS, escenarios concretos y preguntas [ACLARAR], sin decisiones de implementación, y propone cómo entra al plan. Úsala cuando el usuario pida algo que no es una tarea T-x.y existente, o diga "/especificar", "especifica", "quiero agregar X".
argument-hint: nombre corto de la feature y una frase de qué se quiere
---

# /especificar $ARGUMENTS

Produce una spec que un agente pueda convertir en tareas sin adivinar. **No toca código ni el plan**: sólo escribe `docs/specs/NNN-<nombre>/spec.md` y propone el siguiente paso.

## 1. Entender antes de escribir

1. Lee `docs/plan/01_Alcance_v1.md` (§2 roles, §4 qué NO entra) y busca si la feature ya está cubierta, pospuesta o prohibida. Si está en "Qué NO construir" de `CLAUDE.md`, dilo y detente: requiere decisión de Calvin, no una spec.
2. Busca criterios existentes relacionados (`grep -n "AC-" docs/plan/01_Alcance_v1.md docs/mvp/01_PRD.md`) para no duplicar IDs ni historias.
3. Mira primero el **prototipo navegable** (`prototipo/js/`: `comensal-*.jsx`, `checkout-v2.jsx`, `mesero.jsx`, `capitan.jsx`, `admin-*.jsx`), la referencia de flujo más refinada (`stitch/` es la primera versión). Cada pregunta a Calvin cita la pantalla revisada; donde el prototipo va más allá del alcance de la v1, dilo.
4. Haz **hasta 5 preguntas** con `AskUserQuestion`, sólo las que cambian la spec (quién la usa, cuándo ocurre, qué pasa si falla, qué métrica mueve, qué queda fuera). Lo que no se pueda resolver se marca `[ACLARAR]` en la spec.

## 2. Escribir la spec

Número consecutivo (`ls docs/specs/`), nombre en español con guiones. Plantilla:

```markdown
# Spec NNN — <Nombre>

**Fecha:** AAAA-MM-DD · **Estado:** borrador | aprobada · **Pedida por:** Calvin · **Historia:** US-NN (nueva o existente)

## Problema
Quién lo sufre, cuándo, qué pasa hoy. Dos o tres frases con un ejemplo real (La Ceiba, mesa 7, viernes 21:00).

## Resultado esperado
Qué cambia para esa persona cuando esto exista. Qué métrica o señal lo mostraría (M1–M5, G1–G2 o una nueva).

## Historia
> Como <rol>, quiero <acción>, para <beneficio>.

## Criterios de aceptación (EARS)
- **AC-NN.1** — CUANDO <evento>, EL sistema DEBERÁ <respuesta medible>.
- **AC-NN.2** — SI <condición indeseada>, ENTONCES EL sistema DEBERÁ <respuesta>.
- **AC-NN.3** — MIENTRAS <estado>, EL sistema DEBERÁ <comportamiento>.

## Escenarios (uno por criterio)
**AC-NN.1** · Dado <datos concretos de la semilla> · Cuando <acción> · Entonces <resultado observable>.

## Fuera de alcance
Lo que esta feature NO hace, aunque parezca natural.

## Preguntas abiertas
- [ACLARAR] …

## Impacto en el plan (propuesta, no decisión)
- ¿Toca `02_Arquitectura_v1.md` o `03_Datos_v1.md`? ¿Requiere ADR?
- Tareas propuestas con el formato del brief de 04 (ID provisional `T-x.y`, carril, depende de, verificar).
```

Reglas: nada de tablas, endpoints, librerías ni pantallas concretas en los criterios (eso va en 02/03 y en el brief); cada criterio es verificable por una prueba o un paso manual; un criterio = una idea; máximo 5 `[ACLARAR]`.

## 3. Cerrar

1. Muestra la spec al usuario y pregunta si la aprueba (cambia **Estado** a `aprobada`).
2. Si toca 02/03 o es una decisión costosa, propón el ADR antes de las tareas.
3. Con la spec aprobada, el siguiente paso es agregar las tareas a `docs/plan/04_Fases_y_Tareas.md` citando sus criterios, y una fila en el registro de cambios. Hasta entonces, **nadie implementa**.
4. Commit: `spec NNN: <nombre>`.
5. Si Calvin no está, no uses `AskUserQuestion`: deja `[ACLARAR-n]` con escenario y recomendación, una sección 0 de una página (decidido, abierto, tamaño) y, al final, la lista de «lecturas que Calvin aprueba al fusionar»; el PR de la spec lo fusiona Calvin o la maestra cuando él lo diga.
