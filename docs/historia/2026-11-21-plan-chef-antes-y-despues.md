# El plan Chef de Calvin (21 de noviembre): antes → después (archivado; generado, no editar a mano)

**Estado:** archivado el 21 de noviembre de 2026 (r16). Lo vigente está en `docs/research/2026-11-14-modelo-de-escenarios.md` y en los demás informes. Generado por `2026-11-21-plan-chef.mjs`.

**Decisión de Calvin:** Calvin, 21 de noviembre de 2026: «Quiero que un restaurante en Chef pueda tener hasta 3 cuentas sincronizadas. O sea, el dueño del restaurante y 3 meseros máximo. Y de mesa serían 6. Platillos base, dejémoslos en 50.»

*Antes* = Chef de la ronda 15 (6 mesas, 1 cuenta de personal, 150 platillos). *Después* = Chef decidido (6 mesas, 3 cuentas de personal además del dueño, 50 platillos). Historial del gratuito: la política vigente (03 §7); la propuesta de 30 días va al lado.

| Cifra | Antes | Después |
|---|---|---|
| Líneas abiertas por restaurante gratuito en la hora pico | 2.04 | 4.04 |
| Líneas abiertas por restaurante registrado (con la mezcla de paga) | 3.06 | 4.85 |
| GB de fotos por gratuito en R2 (supuesto) | 0.37 | 0.12 |
| Negocios de 0 a 5 personas que caben en Chef | 48.4 % | 44.3 % |
| Negocios de 6 a 10 personas que caben en Chef | 0 % | 7.8 % |
| Cobertura de platillos, cota baja (sitios propios) | 51.8 % | 14.7 % |
| Cobertura de platillos, cota alta (reparto) | 98 % | 62.9 % |
| De paga por cada 1,000 restaurantes | 116 | 119 |
| Costo por restaurante gratuito (pesos al mes, con soporte) | 3.92 | 3.85 |
| Costo por cliente de paga (pesos al mes) | 87.49 | 87.24 |
| Gratuitos que sostiene un cliente de paga (sin anuncios) | 35 | 36 |
| Margen con 1,000 restaurantes, recomendado (política vigente) | +14,752 | +15,221 |
| Margen con 1,000 restaurantes, peor (política vigente) | −1,513 | −1,362 |
| Margen con 1,000 restaurantes, mejor (política vigente) | +59,123 | +60,439 |
| Margen con 1,000 restaurantes, estrés (política vigente) | −5,433 | −5,330 |
| Margen recomendado con la propuesta de 30 días | +18,591 | +19,058 |
| Mes 12, 300 restaurantes: margen de operación | +3,596 | +3,737 |
| Sueldo de 1 salario mínimo: restaurantes en régimen | 760 | 740 |
| Capacidad con lo que se paga hoy (política vigente), con avisos | 28 | 28 |
| Capacidad con la propuesta de 30 días, con avisos / con sondeo | 182 / 173 | 179 / 179 |
| Capacidad sin purga (12 meses) | 41 | 41 |

## Supuestos nuevos
- Cada cuenta de personal abre una línea `/op/eventos` (ADR-018 §3: una por teléfono del personal); se supone que las 3 están conectadas en la hora pico del restaurante (cota alta); la línea del dueño en el panel no se cuenta. Se mide con las líneas abiertas del piloto.
- El modelo de mesas y cuentas (dispersión lognormal σ = 0.5, supuesto) da la parte de negocios que cabe en 6 mesas y 3 cuentas; sólo los conteos por estrato son medidos.
- La cobertura de platillos con el tope de 50 depende de la cota (sitios propios contra reparto): sigue sin saberse cuál muestra tiene razón.

## Lectura
- **Líneas abiertas:** con tres cuentas de personal en vez de una, un gratuito abre 4.04 líneas en la hora pico en vez de 2.04 (cota alta); el recurso de líneas no es el que limita.
- **Quién cae en Chef:** con 3 cuentas caben negocios de 6 a 10 personas (7.8 %), pero el tope de 50 platillos recorta la cobertura de platillos; el efecto neto en los negocios de 0 a 5 personas es 48.4 % → 44.3 %.
- **Quién paga:** 116 → 119 por cada 1,000 restaurantes (con la mezcla del modelo, sin dato de pago real).
