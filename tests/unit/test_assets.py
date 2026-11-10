"""T-1.4 (revisión de maestra): `procesar_foto` por dentro — memoria, capas contra bombas de
descompresión, modos de color, perfil ICC y proporción.

La memoria se mide en un subproceso aislado (`python -I`) con `VmHWM` (pico de memoria
residente del proceso): el de pytest ya trae cientos de MB. El archivo lo genera otro subproceso, para que
la generación (que sí carga la imagen entera) no cuente en la medida.
"""

from __future__ import annotations

import io
import subprocess
import sys
from pathlib import Path

import pytest
from PIL import Image

from app.core.errores import ErrorCarta
from app.services import assets
from app.services.assets import procesar_foto
from tests import imagenes_pruebas as img

RAIZ = Path(__file__).resolve().parents[2]
HEIC_48MP = RAIZ / "tests" / "fixtures" / "fotos" / "iphone-48mp.heic"

GENERAR = """
import io, sys
sys.path.insert(0, {raiz!r})
from tests import imagenes_pruebas as img
tipo, ruta = sys.argv[1], sys.argv[2]
if tipo == "png_rgba":
    datos = img.png_constante(7000, 7000, 6)
elif tipo == "png_gris16":
    datos = img.png_constante(7000, 7000, 0, 16)
else:
    salida = io.BytesIO()
    img.mitades(8000, 6100).save(salida, "JPEG", quality=80, progressive=True)
    datos = salida.getvalue()
open(ruta, "wb").write(datos)
"""

# Pico con `VmHWM` y no con `ru_maxrss`: en Linux `ru_maxrss` sobrevive a `fork` + `exec` y
# el hijo arrancaría con el pico de pytest (~500 MB); `VmHWM` es de la memoria del propio
# proceso y empieza de cero con el `exec`.
MEDIR = """
import sys
sys.path.insert(0, {raiz!r})
from app.services.assets import procesar_foto
foto = procesar_foto(open(sys.argv[1], "rb").read())
assert sorted(v.ancho for v in foto.variantes)[-1] <= 1200
pico = [l for l in open("/proc/self/status") if l.startswith("VmHWM:")][0]
print(int(pico.split()[1]) // 1024)
"""


def _pico_mb(ruta: Path) -> int:
    salida = subprocess.run(
        [sys.executable, "-I", "-c", MEDIR.format(raiz=str(RAIZ)), str(ruta)],
        capture_output=True,
        text=True,
        timeout=50,
        check=True,
    )
    return int(salida.stdout.strip().splitlines()[-1])


@pytest.mark.ac("AC-17.1")
@pytest.mark.parametrize("tipo", ["png_rgba", "png_gris16", "jpeg_progresivo"])
def test_procesar_foto_no_pasa_de_400_mb_con_49_megapixeles(tmp_path: Path, tipo: str) -> None:
    """Revisión A1: antes, PNG RGBA 7000² = 908 MB, PNG gris 16 bits = 721 MB, JPEG
    progresivo 8000 × 6100 = 241 MB. Ahora ~330, ~208 y ~248 MB (con ~88 MB de módulos)."""
    ruta = tmp_path / tipo
    subprocess.run(
        [sys.executable, "-I", "-c", GENERAR.format(raiz=str(RAIZ)), tipo, str(ruta)],
        check=True,
        timeout=50,
    )
    assert ruta.stat().st_size < assets.MAX_BYTES
    assert _pico_mb(ruta) < 400


@pytest.mark.ac("AC-17.1")
def test_un_heic_de_48_megapixeles_cabe_en_su_presupuesto() -> None:
    """El HEIC de un iPhone (8064 × 6048) es el peor caso: libheif lo decodifica entero, sin
    reducción posible, y el pico medido es ~439 MB (antes de la revisión, 697 MB). Es la
    cifra con la que `PROCESOS_SIMULTANEOS = 1` (docstring de `app/services/assets.py`).
    El archivo (11 KB, un color) se guarda en `tests/fixtures/fotos/`: generarlo tarda ~4 s."""
    with Image.open(HEIC_48MP) as imagen:
        assert imagen.size == (8064, 6048)
    assert _pico_mb(HEIC_48MP) < 480


def test_un_solo_proceso_de_pillow_a_la_vez() -> None:
    """Pico de ~430 MB × 2 procesos × 2 workers pasaría de 1,5 GB (regla de la revisión A1)."""
    assert assets.PROCESOS_SIMULTANEOS == 1


# ---------------------------------------------------------------------------
# B4 · cada capa contra bombas funciona sola
# ---------------------------------------------------------------------------


def _codigo(error: pytest.ExceptionInfo[ErrorCarta]) -> tuple[int, str]:
    return error.value.http, error.value.codigo


@pytest.mark.ac("AC-17.3")
def test_la_comprobacion_propia_corta_aunque_pillow_no_tenga_limite(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", None)
    with pytest.raises(ErrorCarta) as error:
        procesar_foto(img.bomba_png(8000, 7000))
    assert _codigo(error) == (413, "ARCHIVO_EXCEDE_LIMITE")


@pytest.mark.ac("AC-17.3")
@pytest.mark.parametrize(("ancho", "alto"), [(8000, 7000), (12000, 12000)])
def test_pillow_corta_aunque_falte_la_comprobacion_propia(
    monkeypatch: pytest.MonkeyPatch, ancho: int, alto: int
) -> None:
    """56 MP: el aviso de Pillow (> `MAX_IMAGE_PIXELS`) como error; 144 MP: su error (> 2×)."""
    monkeypatch.setattr(assets, "MAX_PIXELES", 10**12)
    with pytest.raises(ErrorCarta) as error:
        procesar_foto(img.bomba_png(ancho, alto))
    assert _codigo(error) == (413, "ARCHIVO_EXCEDE_LIMITE")


def test_el_tope_de_pillow_es_el_de_la_aplicacion() -> None:
    assert Image.MAX_IMAGE_PIXELS == 50_000_000


# ---------------------------------------------------------------------------
# B6 · modos de color
# ---------------------------------------------------------------------------


def _variante(datos: bytes, nombre: str = "detalle") -> Image.Image:
    foto = procesar_foto(datos)
    (variante,) = [v for v in foto.variantes if v.nombre == nombre]
    return img.abrir(variante.datos)


@pytest.mark.ac("AC-17.2")
def test_un_png_de_paleta_con_transparencia_conserva_el_alfa() -> None:
    imagen = Image.new("P", (300, 200), 1)
    imagen.putpalette([0, 0, 0, 200, 30, 30] + [0] * 762)
    imagen.paste(0, (0, 0, 150, 200))  # mitad izquierda: índice 0, transparente
    salida = io.BytesIO()
    imagen.save(salida, "PNG", transparency=0)
    variante = _variante(salida.getvalue())
    assert variante.mode == "RGBA"
    assert variante.getpixel((20, 100))[3] == 0
    assert variante.getpixel((280, 100)) == pytest.approx((200, 30, 30, 255), abs=3)


@pytest.mark.ac("AC-17.2")
def test_un_png_gris_de_16_bits_no_se_satura_a_blanco() -> None:
    variante = _variante(img.png_constante(300, 200, 0, 16))  # 0x8000 = 32768
    rojo, verde, azul = variante.convert("RGB").getpixel((10, 10))
    assert rojo == pytest.approx(128, abs=3) and rojo == verde == azul


@pytest.mark.ac("AC-17.2")
def test_un_png_rgba_enorme_se_reduce_sin_perder_el_color_ni_el_alfa() -> None:
    """Reducción del núcleo de Pillow (sin premultiplicar) en 4000 × 3000."""
    variante = _variante(img.png_constante(4000, 3000, 6))  # (128, 128, 128, 128)
    assert variante.size == (1200, 900)
    assert variante.getpixel((600, 450)) == pytest.approx((128, 128, 128, 128), abs=3)


# ---------------------------------------------------------------------------
# B3 · perfil de color
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-17.2")
def test_un_perfil_de_color_se_convierte_a_srgb_y_no_viaja() -> None:
    """Con un perfil lineal, 60 es ~137 en sRGB; sin convertir, el navegador lo vería 60."""
    con = _variante(img.jpeg_con_perfil((60, 60, 60), img.perfil_rgb_lineal()))
    sin = _variante(img.jpeg_con_perfil((60, 60, 60), None))
    assert "icc_profile" not in con.info and "icc_profile" not in sin.info
    assert con.convert("RGB").getpixel((5, 5))[0] > 120
    assert sin.convert("RGB").getpixel((5, 5))[0] == pytest.approx(60, abs=3)


def test_un_perfil_roto_se_ignora() -> None:
    variante = _variante(img.jpeg_con_perfil((60, 60, 60), b"no es un perfil" * 10))
    assert variante.convert("RGB").getpixel((5, 5))[0] == pytest.approx(60, abs=3)


# ---------------------------------------------------------------------------
# C3 · proporción
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-17.3")
@pytest.mark.parametrize(("ancho", "alto"), [(1, 20000), (2200, 200)])
def test_una_imagen_mas_alargada_que_1_a_10_es_422(ancho: int, alto: int) -> None:
    salida = io.BytesIO()
    Image.new("L", (ancho, alto)).save(salida, "PNG")
    with pytest.raises(ErrorCarta) as error:
        procesar_foto(salida.getvalue())
    assert _codigo(error) == (422, "IMAGEN_NO_VALIDA")


def test_una_panoramica_de_1_a_10_entra() -> None:
    assert _variante(img.png(2000, 200, "RGB")).size == (1200, 120)
