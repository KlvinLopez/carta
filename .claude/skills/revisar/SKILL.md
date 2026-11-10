---
name: revisar
description: Revisión en paralelo del diff actual con tres lentes (seguridad multi-tenant, cobertura de pruebas, adversarial) usando los subagentes de .claude/agents/, y consolidación de hallazgos antes del PR. Úsala antes de abrir un PR en Carta o cuando el usuario diga "revisa esto", "/revisar".
---

# /revisar — escepticismo a escala, antes del PR

## 1. Preparar el diff

```bash
git fetch origin master
git diff origin/master...HEAD --stat
git diff origin/master...HEAD > /tmp/carta-diff.patch
```

Si el diff está vacío, dilo y termina.

## 2. Lanzar los tres revisores en paralelo

Con el tool `Agent`, en la misma respuesta, un subagente por lente. A cada uno pásale: la ruta del parche, la tarea `T-x.y` que implementa, el brief de `docs/plan/04_Fases_y_Tareas.md` y las reglas duras de `CLAUDE.md`.

| Subagente | Lente |
|---|---|
| `revisor-seguridad` | Fugas entre restaurantes, `restaurante_id` del token, 404 vs 403, validación de entrada, secretos, inyección, cookies, PIN, archivos subidos, OWASP Top 10 |
| `revisor-pruebas` | Cada criterio de aceptación del brief tiene prueba; casos límite; la prueba fallaría sin el cambio; nada marcado `skip`; el comando de Verificar pasa |
| `revisor-adversarial` | Concurrencia (dos confirmaciones a la vez), reintentos e idempotencia, estados vacíos, red intermitente, datos sucios del PDF, límites (12 miembros, 140 caracteres, 20 MB) |

Pide a cada uno hallazgos en este formato: `severidad (bloqueante | importante | menor) · archivo:línea · qué falla · cómo reproducirlo · propuesta`.

## 3. Consolidar

1. Junta los hallazgos, quita duplicados, ordena por severidad.
2. **Verifica cada bloqueante** antes de aceptarlo: reprodúcelo con una prueba o un comando. Un hallazgo que no se puede reproducir baja a "importante" con la nota "no reproducido".
3. Arregla los bloqueantes y los importantes que estén en alcance de la tarea. Los menores se anotan en el PR.
4. Vuelve a correr la calidad: `uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest -q`.

## 4. Reportar

Tabla al usuario: hallazgo · severidad · estado (arreglado / anotado / descartado y por qué). Si un hallazgo apunta a una regla que falta, propón `/compound`.

También puedes correr `/code-review` (el revisor integrado) después; no sustituye las tres lentes, las complementa con bugs de corrección generales.
