"""Un `frontend/dist` mínimo para las pruebas que sirven la PWA (T-0.6).

Las pruebas no construyen el frontend: arman este dist en `tmp_path`, apuntan
`settings.FRONTEND_DIST` ahí y crean la aplicación con `create_app()`. Tiene la misma forma
que deja `vite build`: `index.html` con `<div id="app">`, `assets/` con nombres con hash,
`fonts/`, `manifest.webmanifest` y un ícono en la raíz.
"""

from __future__ import annotations

from pathlib import Path

INDEX_HTML = '<!doctype html><html lang="es"><body><div id="app"></div></body></html>'
JS = "export const area = 'comensal';\n"
CSS = "body{background:#FEF9F1}\n"
FUENTE = b"wOF2" + bytes(16)
MANIFEST = '{"name": "Carta", "start_url": "/"}'
SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

ASSET_JS = "assets/Area-a1b2c3d4.js"
ASSET_CSS = "assets/index-e5f6a7b8.css"
FUENTE_WOFF2 = "fonts/DMSans-variable-latin.woff2"


def construir_dist(raiz: Path) -> Path:
    (raiz / "assets").mkdir(parents=True)
    (raiz / "fonts").mkdir()
    (raiz / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    (raiz / ASSET_JS).write_text(JS, encoding="utf-8")
    (raiz / ASSET_CSS).write_text(CSS, encoding="utf-8")
    (raiz / FUENTE_WOFF2).write_bytes(FUENTE)
    (raiz / "manifest.webmanifest").write_text(MANIFEST, encoding="utf-8")
    (raiz / "icono.svg").write_text(SVG, encoding="utf-8")
    return raiz
