# AGENTS.md

Instrucciones para cualquier agente de IA que trabaje en este repositorio (Antigravity, Codex, Cursor, Gemini CLI u otro): **las reglas están en [`CLAUDE.md`](CLAUDE.md)** y son las mismas para todas las herramientas. Léelo completo antes de tocar nada.

En corto:

1. El plan vigente está en `docs/plan/`; cada tarea tiene un brief en `docs/plan/04_Fases_y_Tareas.md` con un comando de verificación. Trabaja una tarea a la vez, en su carril, en una rama `agente/T-x.y-<descripcion>`.
2. Los documentos son la fuente de verdad. Si vas a contradecir uno, detente y propón el cambio al documento.
3. Puerta de calidad antes de cada commit: `uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q`.
4. Nunca: `git push --force`, push directo a `master`, `Base.metadata.create_all()`, secretos en el repo, precios que vengan del cliente, `restaurante_id` que no venga del token, borrado físico de entidades con historial, 3D/AR en la v1.
5. Nunca dos agentes en el mismo carril al mismo tiempo, aunque sean herramientas distintas.

Los procedimientos (`/tarea`, `/revisar`, `/analizar`, `/compound`, `/especificar`, `/orquestar`) están en `.claude/skills/*/SKILL.md` y se pueden seguir desde cualquier herramienta leyendo el archivo.
