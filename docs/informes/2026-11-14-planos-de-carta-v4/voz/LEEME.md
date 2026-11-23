# La voz y la música de la película

La película del informe (`js/e2_film.js`) suena con un mp3 de voz por toma, `apoyo/voz/<toma>.mp3`,
y con una pista de música continua, `apoyo/musica/fondo.mp3`. Los dos se arman aquí: la voz, a
partir de una grabación por frase; la música, a partir de una pieza y de los tiempos de la voz.

| Qué | Dónde | Viaja con la página |
|---|---|---|
| Un mp3 por toma, ya mezclado (27) | `apoyo/voz/<toma>.mp3` | Sí |
| El guion que se graba (108 frases) | `apoyo/voz/guion.json`, generado desde `VOZ` con `node apoyo/cine/guion.mjs` | No hace falta |
| Una grabación por frase (108) | `voz/lineas/<id>.mp3` | No |
| El mezclador | `voz/mezcla_tomas.py` | No |
| Los tiempos medidos de la mezcla | `voz/tiempos.json` (`RITMO`, `VOZ_AUDIO` y `VOZ_TIEMPOS`) | No: son las tablas de `js/e2_film.js` |
| El cortador de bloques | `voz/corta_lotes.py` | No |
| La música de fondo, ya con su volumen | `apoyo/musica/fondo.mp3` | Sí |
| La pieza de música original | `voz/musica/whats-the-angle.mp3` | No |
| El mezclador de la música | `voz/mezcla_musica.py` | No |
| Cuándo empieza y cuánto dura cada toma | `voz/linea_de_tiempo.json`, lo escribe `apoyo/cine/guion.mjs` | No |

## Reparto

Voces de la biblioteca de ElevenLabs, elegidas por Calvin el 21 de noviembre de 2026.

| Quién | Voz | `voice_id` | Frases |
|---|---|---|---|
| Narradora | Jade, en tono «cómplice» | `lP1VZ61RLnDtOoz41b3D` | 35 |
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
que el mes se renueve, hacia el 21 de diciembre de 2026 según la propia cuenta. El guion vigente
son 4,151 caracteres con marcas (lo cuenta `apoyo/cine/guion.mjs`), a un crédito por carácter.

## Susurros: qué se quitó y qué falta regrabar

Calvin no quiere susurros salvo en el arranque (la toma `mesa` y el «Bueno… casi» de `cumple`) y pidió
conservar esas frases en voz normal. Sin créditos para regrabar, **decidió el 22 de noviembre de 2026
quitarlas por ahora**. Las marcas `[softly]` y `[sighs]` hacen susurrar a esta voz, igual que `[whispers]`.

Cómo se midió (23 de noviembre de 2026): un susurro es sonido sin tono, porque no vibran las cuerdas
vocales. Con `librosa.pyin` se marca, cada 10 ms, si hay sonido y si hay tono; un tramo susurrado es una
ventana de 0.4 s con sonido en la que menos del 15 % de los cuadros tiene tono. Un transcriptor
(`faster-whisper`) dio el segundo de cada palabra para cortar sólo en un final de frase o en una pausa.

Quitadas enteras (7), por regrabar en la voz normal de Jade:

- `b2`: «Luego, un menú que no sabe nada de ellos.» y «Y a esperar.»
- `espera`: «Por fin, la orden salió.»
- `plato`: «Cada platillo le cuenta lo que lleva.» (la toma queda sin voz)
- `abierta`: «Carlos sí llegó a tiempo.»
- `prepara`: «Preparemos la mesa para los siguientes.» (la toma queda sin voz)
- `limpia`: «Y la mesa volvió a esperar.» (la toma queda sin voz)

Recortadas (7): se conserva el tramo en voz normal y falta regrabar la frase completa.

| Frase | Lo que suena hoy | Lo que se cortó |
|---|---|---|
| `b1-01` | «Primero, lo de siempre.» | «…ponerse de acuerdo.» |
| `escanea-01` | «…y ya está adentro. Sin descargar nada.» | «Ana escanea el código…» |
| `filtra-02` | «Carta guarda sus restricciones y quita lo que no puede comer.» | «No tuvo que decir nada:» (no era susurro: contradecía el «También se lo dijo al mesero» de la pantalla) |
| `abierta-11` | «A Diego se le antojó algo más.» | «Lo pidió desde su teléfono.» |
| `abierta-16` | «Ana quiso cambiar de opinión… demasiado tarde.» | la risita del principio y la respiración del final |
| `cuenta-09` | «Revisaron su total…» | «…y llamaron a Javier.» |
| `factura-03` | «Le llega al restaurante, que es quien la emite.» | «¿Factura? También desde el teléfono.» |

A `espera-03` sólo se le quitó la respiración del final.

Lo que queda, medido con la misma regla sobre las 35 frases de la narradora: fuera de `mesa` y de
`cumple` no hay ningún tramo susurrado de más de 0.45 s, y los que hay son la risita escrita en
`agrega-01` y sílabas finales con aire, propias de esta voz («-dos» en `sucia-02`, «ideas» en `top3-01`).
Dos frases conviene regrabarlas de todos modos: `pagada-04` («Carta le puso en pantalla los datos del
restaurante.», con aire al empezar y al terminar; un corte la dejaba irreconocible) y `juntos-01` (el
«-teo» de «tanteo»).

De la ronda anterior siguen pendientes, en voz normal: `b3-01` «…y mucha fe.», `ticket` «La cuenta. Un
solo papel para los cuatro.», `pivote-01` «Desde el principio.», `filtra` «Al mesero se lo dijo también.
Por si acaso.», `recomienda` «A Ana se le antojó la arrachera… para Carlos. Se la pasó.», `avisa-01`
«Clara. Completa.», `cuenta-01` «Y aquí viene mi parte favorita.», `limpia-01` «Javier la marcó limpia…»
y `pagada-06` con el monto («Cuatrocientos treinta y uno… completo. Validado.»).

## Volver a mezclar

Necesita `ffmpeg` y `ffprobe`. Desde esta carpeta:

```bash
python3 mezcla_tomas.py
```

Lee `apoyo/voz/guion.json` y `voz/lineas/`, escribe los 27 `apoyo/voz/<toma>.mp3` y `voz/tiempos.json`.
Después se copian `VOZ_AUDIO` y `VOZ_TIEMPOS` de `tiempos.json` a `js/e2_film.js` y se regenera la
página. Las reglas de entrada de cada frase (pegada, encimada, la narradora nunca encima de un
personaje) están en la cabecera del mezclador. La misma entrada da los mismos archivos. Si el guion
pide algo que no se puede mezclar (`con` en la primera frase de una toma o junto a la narradora, un
`encima` mayor que la frase anterior, un valor negativo), no escribe nada y sale con código 1.

**El ritmo.** La película puede correr más rápido que como se escribió: `RITMO` en `js/e2_film.js`,
que `apoyo/cine/guion.mjs` copia a `voz/linea_de_tiempo.json` (`ritmo`; 1 si no está). Los segundos de
`VOZ`, de `tiempos.json` y de la línea de tiempo son «de guion»; cada mp3 de toma se acelera al final
por ese ritmo sin cambiar el tono (`atempo` de ffmpeg) y dura sus segundos de guion entre el ritmo. La
música no se acelera: `mezcla_musica.py` pasa los tiempos a segundos de reloj y la pista dura lo que
la película en el reloj.

## La música

«What's The Angle?», de Shane Ivers: jazz «de detective», con trompeta con sordina, contrabajo
caminando y batería, según su autor. **La eligió Calvin de oído el 23 de noviembre de 2026**, entre
seis candidatas de jazz y swing (todas CC BY 4.0) que se le presentaron ese día en la página «Música
de Carta», después de pedir el 22 «algo tipo Monsters, Inc., tipo jazz, algo más animado» en lugar de
«Bossa Antigua» (Kevin MacLeod), que oyó como música de elevador. La versión 20 salió unas horas con
«Swing Has Swung», del mismo autor, que era la apuesta de la sesión maestra.

Licencia Creative Commons Atribución 4.0: se puede usar en público dando crédito y diciendo si se
adaptó. La ficha con la licencia es
https://freemusicarchive.org/music/shane-ivers/single/whats-the-angle/ (leída el 23 de noviembre de
2026); el mp3 es el que esa ficha sirve a su reproductor (320 kb/s, sha256 `6a86cf4c…f93737e2df`). El
crédito que pide el autor:

```
Music: What's The Angle? by Shane Ivers – https://silvermansound.com
```

La película lo muestra en la tarjeta final con la licencia y la palabra «adaptada», porque aquí se
recorta, se repite y se le cambia el volumen. Un aviso de la ficha: en YouTube puede saltar un reclamo
automático, que el autor libera en su sitio.

```bash
python3 mezcla_musica.py
```

Lee `voz/linea_de_tiempo.json`, `voz/tiempos.json` y las voces de `apoyo/voz`, y escribe
`apoyo/musica/fondo.mp3`, que dura lo que la película en el reloj. La música va 13 unidades de
sonoridad por debajo de la voz mientras alguien habla y 9 cuando nadie habla; sube sólo si el silencio
dura más de 1.5 s. Se apaga en la toma `pivote`, vuelve a empezar en `ofrece` y otra vez en `prepara`.
La pieza dura 2:40 y el tramo de en medio de la película es más largo: al terminar vuelve a empezar,
salvo que falten menos de 12 s para el tramo siguiente. Todo eso son constantes al principio del
guion, y la pieza es `PIEZA`. Hay que volver a correrlo cada vez que cambie un tiempo de la voz, la
duración de una toma o el ritmo. Si un tiempo de voz cae fuera de su toma, o `tiempos.json` se mezcló
a otro ritmo, se detiene con un error en vez de hornear una pista mala.

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
- Varias frases son un tramo de una grabación más larga: `sucia-02`, `filtra-01`, `b3-01`,
  `pivote-01`, `avisa-01`, `b1-01`, `abierta-11` y `cuenta-09` conservan el principio; `cuenta-01`,
  `escanea-01`, `filtra-02` y `factura-03`, el final.
- `pagada-06` dice «Está completo. Validado.»: la frase que además decía el monto no cupo en los
  créditos que quedaban.
- En el canto de cumpleaños (`cierres-06` a `-08`) y en las risas, las frases llevan `con`: empiezan
  casi a la vez.
- Tres cortes se parecen menos de 0.8 a su texto según el transcriptor (`cuenta-03`, `abierta-10`
  y `abierta-02`); son frases muy cortas.
- La voz se mezcla a −23 dB de volumen medio por frase; la música se mide contra ella.
- Quien hizo la mezcla no oye. Un transcriptor automático comprobó que cada frase diga su texto, y
  una prueba en Chromium que cada pista suene en su toma.
