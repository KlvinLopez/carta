# Hyperframes Composition Brief: Carta

## Objective
Create a short, Apple-keynote-style launch film for Carta that shows a real dinner flow in the prototype.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080, 30 fps
- Duration: 25.0 seconds

## Source Material
- Project root: `C:\Users\calvi\Carta`
- Primary files read: `prototipo/Prototipo Carta.html`, `prototipo/js/*.jsx` (app.jsx, shared.jsx, comensal-*.jsx, checkout-v2.jsx), `prototipo/carta-assets/colors_and_type.css`, `README.md`, `docs/mvp/01_PRD.md`, `docs/pitch/Carta_Pitch_Deck.pdf`
- Product name: Carta
- Tagline / strongest claim: "Tu menú, Tu Carta." / "Elevando el arte de la mesa" (both verbatim from the prototype)
- Key UI to show: real prototype screens captured at 1170x2532: P17a scan (searching and valid), P01 AR view, P02 dish detail, P03 menu, P04 group order, P04b tracking, P05 checkout, P05b success
- Copy that must appear verbatim:
  - "Sin descarga. Sin registro. Inmediato."
  - "Tu menú, Tu Carta."
  - "Elevando el arte de la mesa"
  - "Cuando estén los cuatro, llamamos al mesero."

## Creative Direction
- Tone preset: polished
- Creative direction: Apple-style launch film; elegant, exciting, real people using Carta at a dinner
- Interpretation: few words and generous space. Slow, confident entrances, with one big moment per musical phrase. The excitement comes from the music drop, the phone crossing the frame and the logo landing.
- Angle: one dinner at La Ceiba · Mesa 7, told in four gestures (scan, see, share, pay) with real prototype screens inside an iPhone.
- Hook: "Todo empieza en la mesa." over a warm, blurred restaurant, then the Carta wordmark and "ELEVANDO EL ARTE DE LA MESA"
- Outro / punchline: "Carta" lands on the strong cue at 22.37 s; "Tu menú, Tu Carta." at 22.93 s; "MUY PRONTO"
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign of the app screens

## Visual Identity
- Background: warm dark field `#171210` → `#2A1B16` (radial, no full-screen linear gradients), vino glow `#6B2D3E`, dorado glow `#B8860B`
- Text: crema `#FEF9F1` (secondary at 72%)
- Accent: dorado claro `#FDC34D`
- Display font: DM Serif Display, regular and italic (local woff2 from the prototype)
- Body font: DM Sans, variable (local woff2 from the prototype)
- Visual references from the project: iPhone frame from `PhoneFrame` (radius 54, bezel `#100C0A` + `#3A322D`), gold QR reticle, vino gradient buttons, the La Ceiba restaurant photo

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. La mesa — 0.00–4.39 s — the hook line word by word, then the Carta wordmark and its tagline
2. Escanea — 4.39–8.74 s — phone rises; scan → "QR válido"; "Sin descarga. Sin registro. Inmediato."; tap on Continuar
3. Míralo antes de pedirlo — 8.74–13.11 s — the phone crosses left on the drop; AR view; "Mira tu platillo antes de pedirlo."; tap on the dish → detail; "En 3D, sobre tu mesa."
4. Toda la mesa — 13.11–17.47 s — three phones; "Toda la mesa, en sintonía."; the table-ready toast at 15.84 s
5. Pide y paga — 17.47–21.84 s — tracking → checkout → tap on Pagar → "¡Buen provecho!"; "Pide, sigue y paga." / "Sin esperar la cuenta."
6. Tu menú, Tu Carta — 21.84–25.00 s — logo, tagline, "MUY PRONTO", music fades out

## Audio
- Audio role: cinematic support (steady bed + minimal accents)
- Audio arc: soft entrance → full energy on the AR drop → warm, steady middle → fade under the logo
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (CC BY 4.0, ende.app)
- Music treatment: fade in 0–0.8 s, bed volume 0.4, fade out 23.8–25.0 s
- Music cue guidance: bundled preset `~/.claude/skills/brag/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`. Strong cues to lock: 8.74 (AR reveal), 15.84 (toast), 22.37 (logo), 22.93 (tagline). Beat grid for taps and screen changes: 6.56, 8.19, 11.46, 19.10, 20.75.
- Audio-reactive treatment: subtle. The bass band makes the dorado glow behind the phone breathe. Extraction uses FFmpeg + Node, because the Python helper is unavailable on this machine; the data is precomputed and baked into the composition.
- Audio-coupled moments:
  - 8.19 — tap on "Continuar"
  - 8.74 — AR reveal
  - 11.46 — tap on the dish
  - 15.84 — table-ready toast
  - 20.75 — tap on "Pagar" + success
  - 22.37 — logo landing
- SFX selection guidance: polished restraint. Very quiet clicks for taps, one soft impact on the reveal, soft bells for success and the logo. Use low/medium high-frequency-risk files only.
- SFX analysis guidance: `~/.claude/skills/brag/assets/sfx/sfx-analysis.md`
- Audio files: copied into `brag-output/composition/assets/`

## Hyperframes Instructions
Follow `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes` and `hyperframes-cli`. Single standalone `index.html`, one paused GSAP timeline, local GSAP, local fonts and local media only. Run `hyperframes check` before render.
