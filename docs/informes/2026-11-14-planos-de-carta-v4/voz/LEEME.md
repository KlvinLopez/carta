# La voz y la música de la película

La película del informe (`js/e2_film.js`) suena con un mp3 de voz por toma, `apoyo/voz/<toma>.mp3`,
y con una pista de música continua, `apoyo/musica/fondo.mp3`. Los dos se arman aquí: la voz, a
partir de una grabación por frase; la música, a partir de una pieza y de los tiempos de la voz.

| Qué | Dónde | Viaja con la página |
|---|---|---|
| Un mp3 por toma, ya mezclado (30) | `apoyo/voz/<toma>.mp3` | Sí |
| El guion que se graba (115 frases) | `apoyo/voz/guion.json`, generado desde `VOZ` con `node apoyo/cine/guion.mjs` | No hace falta |
| Una grabación por frase (115) | `voz/lineas/<id>.mp3` | No |
| El mezclador | `voz/mezcla_tomas.py` | No |
| Los tiempos medidos de la mezcla | `voz/tiempos.json` (`VOZ_AUDIO` y `VOZ_TIEMPOS`) | No: son las dos tablas de `js/e2_film.js` |
| El cortador de bloques | `voz/corta_lotes.py` | No |
| La música de fondo, ya con su volumen | `apoyo/musica/fondo.mp3` | Sí |
| La pieza de música original | `voz/musica/bossa-antigua.mp3` | No |
| El mezclador de la música | `voz/mezcla_musica.py` | No |
| Cuándo empieza y cuánto dura cada toma | `voz/linea_de_tiempo.json`, lo escribe `apoyo/cine/guion.mjs` | No |

## Reparto

Voces de la biblioteca de ElevenLabs, elegidas por Calvin el 21 de noviembre de 2026.

| Quién | Voz | `voice_id` | Frases |
|---|---|---|---|
| Narradora | Jade, en tono «cómplice» | `lP1VZ61RLnDtOoz41b3D` | 42 |
| Mesero (Javier) | Martín Álvarez | `Wl3O9lmFSMgGFTTwuS6f` | 20 |
| Ana | Marlene | `JYyJjNPfmNJdaby8LdZs` | 22 |
| Sofía | Andromeda Thunders | `Gyqu9jCJup6lkiLgiu0l` | 6 |
| Diego | Lalo | `MWqKtvxRYrsfKFZfU1He` | 11 |
| Carlos | Silverio | `lLu7VwiNjffLb7HZ3LFW` | 14 |

Modelo `eleven_v4`, que entiende las marcas entre corchetes del guion (`[whispers]`, `[laughs]`,
`[pause]`…). Una sola toma por frase.

La voz de referencia que dio Calvin (una locutora real) **no se subió a ElevenLabs ni se clonó**:
sólo sirvió para elegir entre voces de la biblioteca.

## Licencia de las voces

Todo se grabó con el **plan gratuito** de ElevenLabs. Sus términos de uso (sección 1(c), versión del 9 de
octubre de 2026, leídos el 22 de noviembre de 2026 en https://elevenlabs.io/terms-of-use) dicen que quien
usa el servicio sin pagar sólo puede usarlo con fines no comerciales; la licencia comercial viene con los
planes de pago (https://elevenlabs.io/pricing).

El repositorio es público y GitHub Pages publica `master`, así que estas voces quedan a la vista de
cualquiera. **Calvin lo decidió así el 22 de noviembre de 2026**, sabiendo lo anterior: la película se
integra con sus voces y las grabaciones se quedan en las ramas de trabajo. **Antes de cualquier uso
comercial se vuelven a grabar con un plan de pago**; los términos no dicen que pasar a un plan de pago
cubra lo ya generado.

Gasto: la cuenta marca 9,992 de los 10,000 créditos del mes (leído de la cuenta el 22 de noviembre de
2026) y no todo es de esta película: la cuenta tuvo otros usos esos días. La voz queda cerrada hasta
que el mes se renueve, hacia el 21 de diciembre de 2026 según la propia cuenta. El guion completo
son 4,654 caracteres con marcas, a un crédito por carácter.

## Por regrabar cuando haya créditos

Calvin no quiere susurros salvo el del arranque («Viernes en la noche») y pidió conservar esas frases
en voz normal. Sin créditos, por ahora están quitadas. Faltan, en la voz normal de Jade:

- `b3-01`: «…y mucha fe.»
- `ticket`: «La cuenta. Un solo papel para los cuatro.»
- `pivote-01`: «Desde el principio.»
- `filtra`: «Al mesero se lo dijo también. Por si acaso.»
- `recomienda`: «A Ana se le antojó la arrachera… para Carlos. Se la pasó.»
- `avisa-01`: «Clara. Completa.»
- `cuenta-01`: «Y aquí viene mi parte favorita.»
- `limpia-01`: «Javier la marcó limpia…»
- `pagada-06`, con el monto: «Cuatrocientos treinta y uno… completo. Validado.»

## Volver a mezclar

Necesita `ffmpeg` y `ffprobe`. Desde esta carpeta:

```bash
python3 mezcla_tomas.py
```

Lee `apoyo/voz/guion.json` y `voz/lineas/`, escribe los 30 `apoyo/voz/<toma>.mp3` y `voz/tiempos.json`.
Después se copian `VOZ_AUDIO` y `VOZ_TIEMPOS` de `tiempos.json` a `js/e2_film.js` y se regenera la
página. Las reglas de entrada de cada frase (pegada, encimada, la narradora nunca encima de un
personaje) están en la cabecera del mezclador. La misma entrada da los mismos archivos.

## La música

«Bossa Antigua», de Kevin MacLeod, elegida por Calvin el 22 de noviembre de 2026. Licencia Creative
Commons Atribución 4.0: se puede usar en público dando crédito. La ficha y la licencia están en
https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700069 (leída el 22 de noviembre de
2026). El crédito que pide el autor, y que la película muestra al final:

```
"Bossa Antigua" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

```bash
python3 mezcla_musica.py
```

Lee `voz/linea_de_tiempo.json`, `voz/tiempos.json` y las voces de `apoyo/voz`, y escribe
`apoyo/musica/fondo.mp3`, que dura lo que la película. La música va 13 unidades de sonoridad por
debajo de la voz mientras alguien habla y 9 cuando nadie habla; sube sólo si el silencio dura más
de 1.5 s. Se apaga en la toma `pivote`, vuelve a empezar en `ofrece` y otra vez en `prepara`. Todo
eso son constantes al principio del guion. Hay que volver a correrlo cada vez que cambie un tiempo
de la voz o la duración de una toma.

## Cambiar o añadir una frase

1. Cambia la frase en `VOZ` (`js/e2_film.js`) y regenera `apoyo/voz/guion.json`.
2. Graba esa frase con la voz de su personaje y guárdala como `voz/lineas/<id>.mp3` (el `id` es
   el de `guion.json`: toma y número, `abierta-07`).
3. Mezcla y copia las dos tablas.

Para grabar muchas frases de una voz en una sola generación, únelas con ` [pause] ` y sepáralas
con `corta_lotes.py`.

## Lo que conviene saber

- Una frase que sólo tiene una marca (`[laughs]`) falla al generarse. Las tres risas sueltas de
  «Abierta» (`abierta-07`, `-08`, `-09`) se grabaron con texto y cada una en un estilo distinto: una
  explosiva y rápida, una espaciada y fuerte, una risita. En `VOZ` siguen escritas como `[laughs]`.
- 72 frases salieron de 15 bloques por personaje cortados con `corta_lotes.py`; las demás se
  grabaron sueltas.
- Varias frases son un tramo de una grabación más larga: `sucia-02`, `escanea-01`, `filtra-01`,
  `b3-01`, `pivote-01` y `avisa-01` conservan el principio; `cuenta-01` y `limpia-01`, el final.
- `pagada-06` dice «Está completo. Validado.»: la frase que además decía el monto no cupo en los
  créditos que quedaban.
- En el canto de cumpleaños (`cierres-06` a `-08`) y en las risas, las frases llevan `con`: empiezan
  casi a la vez.
- Tres cortes se parecen menos de 0.8 a su texto según el transcriptor (`cuenta-03`, `abierta-10`
  y `abierta-02`); son frases muy cortas.
- La voz se mezcla a −23 dB de volumen medio por frase; la música se mide contra ella.
- Quien hizo la mezcla no oye. Un transcriptor automático comprobó que cada frase diga su texto, y
  una prueba en Chromium que cada pista suene en su toma.
