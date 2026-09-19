# Video de lanzamiento de Carta

Film de 25 s estilo lanzamiento tipo Apple. Cuenta una cena en *La Ceiba · Mesa 7* con las pantallas reales del prototipo: escanear el QR, ver el platillo en 3D, coordinar la orden con la mesa y pagar. Se hizo en septiembre de 2026 con la skill `/brag` y [HyperFrames](https://github.com/heygen-com/hyperframes).

| Archivo | Qué es |
|---|---|
| `carta-lanzamiento-16x9.mp4` | Versión horizontal, 1920×1080 (YouTube, LinkedIn, presentaciones) |
| `carta-lanzamiento-9x16.mp4` | Versión vertical, 1080×1920 (Instagram Reels e Historias, TikTok) |
| `*.jpg` | Miniatura de cada versión (también es el primer cuadro del video) |
| `share-copy.txt` | Texto principal para publicar |
| `share-copy-variants.md` | Texto para Instagram con hashtags y crédito de la música |
| `brag-plan.md` | Guion, escenas y sincronía con la música |
| `composition-brief.md` | Brief técnico para HyperFrames |
| `composition/`, `composition-vertical/` | Código fuente de cada versión, para editar y volver a renderizar |

## Notas

- Las pantallas dentro del teléfono se capturaron **antes** de corregir la tipografía del prototipo; por eso en ellas los títulos se ven en cursiva. Los textos del propio video ya usan la tipografía correcta.
- Después del render, el audio se normalizó a -16 LUFS (nivel de redes) y la miniatura se insertó como primer cuadro. El render directo sale cerca de -23 LUFS.

## Cómo volver a renderizar

Requiere Node 22+ y FFmpeg. Desde la carpeta de la versión que quieras:

```bash
env -u GOOGLE_API_KEY -u GEMINI_API_KEY HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.50 render --quality delivery --output out.mp4
```

Quita siempre las llaves de Google del entorno. Si las encuentra, `hyperframes snapshot` manda cuadros del video a Gemini por su cuenta; con ese comando usa también `--describe false`.

Para normalizar el audio e insertar la miniatura (`poster.jpg` es un cuadro fijo del propio render):

```bash
ffmpeg -y -i out.mp4 -i poster.jpg -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v];[0:a]volume=7.45dB,alimiter=limit=0.84:attack=5:release=60:level=disabled[a]" -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart final.mp4
```

## Créditos y licencias

- **Música:** "Happy Beats / Business Moves vol. 12", Sascha Ende ([ende.app](https://ende.app/en)), CC BY 4.0. Se permite uso comercial y dar crédito es opcional.
- **Efectos de sonido:** [Kenney](https://kenney.nl/), CC0.
- **Tipografías:** DM Serif Display y DM Sans, SIL Open Font License.
- **Animación:** GSAP 3.14.2, licencia estándar gratuita.
- **Fotos de platillos y del restaurante:** Unsplash, tal como aparecen en el prototipo.
