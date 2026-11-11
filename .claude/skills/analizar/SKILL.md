---
name: analizar
description: Compuerta de consistencia antes del PR — comprueba que la spec, el plan, las tareas, el contrato OpenAPI, el código y las pruebas de una tarea de Carta cuenten la misma historia (trazabilidad criterio → prueba, reglas duras mecánicas, contrato). Úsala después de /revisar y antes de abrir el PR, o cuando el usuario diga "/analizar".
argument-hint: T-x.y
---

# /analizar $ARGUMENTS

No busca bugs (eso es `/revisar` y `/code-review`): busca **desalineación** entre lo que se especificó y lo que se construyó.

## 1. Trazabilidad criterio → prueba

```bash
uv run python scripts/verificar_trazabilidad.py --tarea $ARGUMENTS --estricto
```

- Cada criterio del brief (**Criterios** en `docs/plan/04_Fases_y_Tareas.md`) debe tener al menos una prueba con `@pytest.mark.ac("AC-x.y")` (o, en el frontend, con `// @ac AC-x.y` sobre el `it`), o un paso manual en `docs/piloto/ensayo.md`.
- Si el script falla: o falta la prueba (bloqueante) o el brief cita un criterio que ya no aplica (corrige el brief y anota la fila en 04 §11).

## 2. Spec ↔ código

Lee los criterios citados y, para cada uno, señala **dónde** en el diff se cumple (archivo:línea). Un criterio que no puedas señalar es un hallazgo. Comprueba también que el diff no construye nada que ningún criterio pide (alcance que se coló): cada endpoint, columna o pantalla nueva debe rastrearse a un AC o al brief.

## 3. Contrato

Si la tarea toca `app/api/` o `app/schemas/`:
1. Los endpoints del brief aparecen en `/openapi.json` con los esquemas de respuesta en `app/schemas/` y la envoltura de error de `docs/mvp/04_API_Spec.md` §1.2.
2. Si hay un servidor levantado y `schemathesis` instalado: `uv run schemathesis run http://localhost:8000/openapi.json --checks all --include-path-regex "<rutas de la tarea>"`. Hasta T-4.9 es opcional; después, obligatorio.
3. Si la tarea toca frontend: `npm --prefix frontend run tipos` no produce cambios (los tipos generados están al día con el contrato).

## 4. Reglas duras mecánicas

```bash
grep -rl "fastapi" app/services/ | wc -l            # debe ser 0
grep -rn "create_all" app/ | wc -l                   # debe ser 0
grep -rniE "(api[_-]?key|secret)[^:=]*[:=] *['\"][A-Za-z0-9]{16,}" app/ scripts/ | wc -l   # debe ser 0
grep -rn "restaurante_id" app/api/ | grep -iE "body|query|json\[" || true   # revisar a mano: nunca del cliente
```

## 5. Documentos

- ¿El brief sigue describiendo lo que se hizo? Si no, corrige 04 y añade la fila en §11.
- ¿Se tomó una decisión que un ADR debería recoger? Propón `/compound`.
- ¿`CLAUDE.md` sigue en ≤ 150 líneas? (`wc -l CLAUDE.md`).

## 6. Reporte

Tabla: `criterio · prueba · código (archivo:línea) · estado (ok | falta prueba | falta código | fuera de spec)`, más los resultados de §3–§5. Veredicto: **listo para PR** o la lista de lo que falta. Si está listo, recuerda la plantilla de PR (`.github/pull_request_template.md`).
