# ADR-008 — Conservar la nomenclatura en español del esquema Fase 1

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
El esquema existente (`docs/Carta_Schema_Fase1.md`, `app/db/models.py`) usa nombres en español: `restaurante`, `platillo`, `orden_personal`. La convención habitual en proyectos de software es inglés.

## Decisión
Mantener español en el modelo de datos y en la capa de servicios. Usar inglés únicamente en artefactos donde es idiomático inseparable: palabras clave del lenguaje, nombres de librerías y campos de protocolos estándar.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Migrar todo a inglés | Reescribe 506 líneas de modelos y toda la documentación existente sin ganancia funcional. Puro costo. |
| Mezclar según el módulo | La inconsistencia es peor que cualquiera de las dos opciones puras. |

## Consecuencias
- **Positivas:** continuidad con el trabajo hecho; el vocabulario del dominio coincide con el que usan los restaurantes ("comanda", "platillo", "mesero"), lo que reduce errores de traducción conceptual.
- **Negativas:** un desarrollador anglófono tendrá una curva inicial. Se mitiga con el glosario de `CLAUDE.md`.

## Verificación
Revisión de código: cualquier tabla o servicio nuevo en inglés se rechaza en PR.
