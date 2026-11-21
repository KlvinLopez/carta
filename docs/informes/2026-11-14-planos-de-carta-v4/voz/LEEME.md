# La voz de la película

La película del informe (`js/e2_film.js`) suena con un mp3 por toma: `apoyo/voz/<toma>.mp3`.
Esos mp3 se mezclan aquí a partir de una grabación por frase.

| Qué | Dónde | Viaja con la página |
|---|---|---|
| Un mp3 por toma, ya mezclado (32) | `apoyo/voz/<toma>.mp3` | Sí |
| El guion que se graba (110 frases) | `apoyo/voz/guion.json`, generado desde `VOZ` con `node apoyo/cine/guion.mjs` | No hace falta |
| Una grabación por frase (110) | `voz/lineas/<id>.mp3` | No |
| El mezclador | `voz/mezcla_tomas.py` | No |
| Los tiempos medidos de la mezcla | `voz/tiempos.json` (`VOZ_AUDIO` y `VOZ_TIEMPOS`) | No: son las dos tablas de `js/e2_film.js` |
| El cortador de bloques | `voz/corta_lotes.py` | No |

## Reparto

Voces de la biblioteca de ElevenLabs, elegidas por Calvin el 21 de noviembre de 2026.

| Quién | Voz | `voice_id` | Frases |
|---|---|---|---|
| Narradora | Jade, en tono «cómplice» | `lP1VZ61RLnDtOoz41b3D` | 44 |
| Mesero (Javier) | Martín Álvarez | `Wl3O9lmFSMgGFTTwuS6f` | 19 |
| Ana | Marlene | `JYyJjNPfmNJdaby8LdZs` | 20 |
| Sofía | Andromeda Thunders | `Gyqu9jCJup6lkiLgiu0l` | 6 |
| Diego | Lalo | `MWqKtvxRYrsfKFZfU1He` | 9 |
| Carlos | Silverio | `lLu7VwiNjffLb7HZ3LFW` | 12 |

Modelo `eleven_v4`, que entiende las marcas entre corchetes del guion (`[whispers]`, `[laughs]`,
`[pause]`…). Una sola toma por frase.

La voz de referencia que dio Calvin (una locutora real) **no se subió a ElevenLabs ni se clonó**:
sólo sirvió para elegir entre voces de la biblioteca.

## Licencia: no es para uso público

Todo se grabó con el **plan gratuito** de ElevenLabs, que no incluye licencia comercial (lo dijo
Calvin el 21 de noviembre de 2026; las condiciones vigentes están en la página de precios de
ElevenLabs). Sirve para trabajar la película entre nosotros. **Antes de mostrarla fuera se vuelve
a grabar con un plan de pago.**

Gasto: 7,271 de los 10,000 créditos del mes, leído de la cuenta el 21 de noviembre de 2026 después
de la última frase (incluye las audiciones de voces). El guion completo son 4,751 caracteres con
marcas, a un crédito por carácter.

## Volver a mezclar

Necesita `ffmpeg` y `ffprobe`. Desde esta carpeta:

```bash
python3 mezcla_tomas.py
```

Lee `apoyo/voz/guion.json` y `voz/lineas/`, escribe los 32 `apoyo/voz/<toma>.mp3` y `voz/tiempos.json`.
Después se copian `VOZ_AUDIO` y `VOZ_TIEMPOS` de `tiempos.json` a `js/e2_film.js` y se regenera la
página. Las reglas de entrada de cada frase (pegada, encimada, la narradora nunca encima de un
personaje) están en la cabecera del mezclador. La misma entrada da los mismos archivos.

## Cambiar o añadir una frase

1. Cambia la frase en `VOZ` (`js/e2_film.js`) y regenera `apoyo/voz/guion.json`.
2. Graba esa frase con la voz de su personaje y guárdala como `voz/lineas/<id>.mp3` (el `id` es
   el de `guion.json`: toma y número, `abierta-07`).
3. Mezcla y copia las dos tablas.

Para grabar muchas frases de una voz en una sola generación, únelas con ` [pause] ` y sepáralas
con `corta_lotes.py`.

## Lo que conviene saber

- Una frase que sólo tiene una marca (`[laughs]`) falla al generarse: las tres risas sueltas de
  «Abierta» (`abierta-07`, `-08`, `-09`) se grabaron como `[laughs] ¡Ja, ja, ja!`.
- 34 frases se grabaron sueltas, 72 salieron de 15 bloques por personaje cortados con
  `corta_lotes.py`, 3 son las risas y 1 se añadió al final (`prepara-01`).
- `sucia-02` es el primer tramo (hasta 3.25 s) de una grabación que seguía con otra frase; esa
  segunda frase se sustituyó por `prepara-01`, que dice lo mismo que el rótulo en pantalla.
- Tres cortes se parecen menos de 0.8 a su texto según el transcriptor (`cuenta-03`, `abierta-10`
  y `abierta-02`); son frases muy cortas y nadie las ha escuchado todavía para confirmarlo.
- Nadie ha escuchado la mezcla completa: quien la hizo no oye. Un transcriptor automático comprobó
  que cada frase diga su texto, y una prueba en Chromium que cada pista suene en su toma.
