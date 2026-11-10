---
name: compound
description: Cierra la sesión guardando lo aprendido donde la próxima sesión lo encuentre (test, regla en CLAUDE.md, skill, hook o ADR). Úsala antes de terminar cualquier sesión de trabajo en Carta, o cuando el usuario diga "compound", "cierra la sesión" o "guarda lo que aprendimos".
---

# /compound — cada vuelta del ciclo deja una capa

> Antes de cerrar: ¿qué aprendimos en esta sesión que la próxima debería saber? Propón dónde guardarlo y hazlo.

## Según el resultado de la sesión

| Resultado | Además de las lecciones, guarda |
|---|---|
| **TERMINADA** | Estado en `docs/plan/README.md` si la tarea cierra una fase; nada más que las lecciones reales |
| **BLOQUEADA** | Fila en `docs/plan/04_Fases_y_Tareas.md` §11: la contradicción exacta (documento vs código, dependencia, decisión) y la decisión que se necesita de Calvin. Sin código a medias en la rama |
| **FALLIDA** | Fila en 04 §11: qué se intentó (tres intentos), qué hipótesis quedaron y cuál descartarías primero; la prueba que falla se queda en la rama `wip/T-x.y` (nunca `skip` ni `xfail`) |

## Procedimiento

1. **Recorre la sesión.** Revisa `git diff master...HEAD --stat`, los commits de la sesión y la conversación. Busca:
   - un bug que costó encontrar o que podría regresar;
   - un hallazgo de revisión que se repitió o que sorprendió;
   - un procedimiento que hiciste a mano más de una vez (comandos, pasos, comprobaciones);
   - una regla que se rompió aunque estaba escrita;
   - una decisión con alternativas que descartaste con razones;
   - algo del plan (`docs/plan/04_Fases_y_Tareas.md`) que resultó falso o incompleto.

2. **Clasifica cada lección** con esta tabla y escribe el artefacto:

   | Lección | Artefacto | Dónde | Cómo |
   |---|---|---|---|
   | Bug que regresa | Test de regresión | `tests/unit/` o `tests/integration/` | Nombre `test_<regresion>_<descripcion>`; debe fallar sin el arreglo |
   | Hallazgo de revisión | Regla de una línea | `CLAUDE.md` (sección "Reglas duras" sólo si no se negocia; si no, en la skill que corresponda) | Imperativa, verificable |
   | Procedimiento repetido | Skill | `.claude/skills/<nombre>/SKILL.md` | Frontmatter `name` y `description` que diga cuándo usarla; pasos numerados; comando de verificación |
   | Regla que no puede fallar | Hook | `.claude/hooks/*.sh` + `.claude/settings.json` | Probar el hook con `echo '<json>' \| script` **desde un script en el scratchpad** (el guard de Bash inspecciona el texto del comando y bloquearía la propia prueba) |
   | Decisión costosa | ADR | `docs/mvp/adr/ADR-0NN-*.md` | Contexto → Decisión → Alternativas con motivo → Consecuencias → Verificación; agregar al índice |
   | Plan equivocado | Corrección del plan | `docs/plan/04_Fases_y_Tareas.md` §11 | Fila con fecha, tarea, qué se descubrió, cambio aplicado |

3. **Poda.** `wc -l CLAUDE.md` debe ser ≤ 150. Si lo supera, mueve el detalle a una skill y deja en `CLAUDE.md` una línea que apunte a ella. Borra duplicados.

4. **Verifica** que lo que escribiste funciona: el test falla sin el arreglo y pasa con él; el hook responde al JSON de prueba; la skill aparece con `/` en una sesión nueva.

5. **Commit** aparte, con prefijo `compound:`, por ejemplo `compound: regla sobre ETag en memoria y test de regresión de confirmar dos veces`.

6. **Resume en tres líneas** al usuario qué se guardó y dónde. Si no hubo nada que guardar, dilo: una sesión sin lecciones nuevas también es información.

## Qué no hacer

- No escribas notas de "cómo estuvo la sesión" en `CLAUDE.md`: va lo que cambia el comportamiento de la próxima sesión, nada más.
- No conviertas en regla algo que pasó una vez y no tiene por qué repetirse.
- No crees una skill sin un comando de verificación.
