#!/bin/bash
# PreToolUse (Bash): bloquea comandos que no deben correr nunca desde una sesión de agente en Carta.
# Recibe el JSON del hook por stdin. Sale con 2 y un mensaje en stderr para bloquear.

set -u
entrada="$(cat)"
cmd="$(printf '%s' "$entrada" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

bloquear() {
  echo "Bloqueado por .claude/hooks/guard-bash.sh: $1" >&2
  echo "Comando: $cmd" >&2
  exit 2
}

# Historial compartido: nunca se reescribe desde un agente.
printf '%s' "$cmd" | grep -Eq 'git +push[^|;&]*(--force|-f\b|--force-with-lease)' && bloquear "push forzado"
printf '%s' "$cmd" | grep -Eq 'git +push[^|;&]*\b(origin +)?master\b' && bloquear "push directo a master (usa una rama agente/T-x.y y un PR)"
printf '%s' "$cmd" | grep -Eq 'git +(reset +--hard|clean +-[a-z]*f|branch +-D|checkout +-- +\.)' && bloquear "descarta trabajo sin confirmación"

# Infraestructura y datos.
printf '%s' "$cmd" | grep -Eq 'terraform +(destroy|apply)' && bloquear "terraform destroy/apply se corre a mano"
printf '%s' "$cmd" | grep -Eiq '\b(drop +(database|schema|table)|truncate +table)\b' && bloquear "sentencia destructiva de base de datos"
printf '%s' "$cmd" | grep -Eq 'alembic +downgrade +base' && bloquear "downgrade base borra el esquema; hazlo sólo en pruebas locales explícitas"
printf '%s' "$cmd" | grep -Eq 'rm +-rf +(/|~|\$HOME|\.|\*)( |$)' && bloquear "rm -rf sobre raíz, home o el repo"
printf '%s' "$cmd" | grep -Eq 'docker +(compose +)?(down +-v|volume +rm|system +prune +-a)' && bloquear "borra volúmenes de Docker (datos de PostgreSQL)"

# Reglas duras del proyecto.
printf '%s' "$cmd" | grep -Eq 'create_all\(' && bloquear "Base.metadata.create_all() está prohibido (regla dura 3)"

exit 0
