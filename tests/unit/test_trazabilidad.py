"""T-4.9 (adelanto): `scripts/verificar_trazabilidad.py` cuenta también las pruebas de frontend.

Un criterio que sólo vive en la pantalla (búsqueda, filtros, pantallas de fallo) no tiene prueba
de backend: su prueba de vitest lleva `// @ac AC-x.y` en la línea de arriba.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts import verificar_trazabilidad as traza

VITEST = """\
import { describe, it, test } from 'vitest';

// @ac AC-05.1
it('busca sin acentos', () => {});

// @ac AC-05.2, AC-05.3
// @ac AC-06.1
test("filtra por alérgeno", () => {});

// @ac AC-01.3
describe(`pantallas de fallo`, () => {
  it('AC-04.3 en el título no cuenta', () => {});
});

// @ac AC-07.1
it.skip('saltada', () => {});

// @ac AC-07.2
it.todo('pendiente');

// @ac AC-08.1
const suelto = 1;
it('lejos del marcador', () => {});

  // @ac AC-02.1–AC-02.3
  it.only('con rango y sangría', () => {});
"""


@pytest.fixture
def repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    frontend = tmp_path / "frontend" / "src" / "comensal"
    frontend.mkdir(parents=True)
    (frontend / "menu.test.tsx").write_text(VITEST, encoding="utf-8")
    (frontend / "util.test.ts").write_text(
        "// @ac AC-05.1\nit('otra del mismo criterio', () => {});\n", encoding="utf-8"
    )
    (frontend / "menu.tsx").write_text("// @ac AC-09.1\nit('no es prueba', () => {});\n")
    pruebas = tmp_path / "tests"
    pruebas.mkdir()
    # El marcador se arma en dos trozos: el escáner lee también este archivo y, escrito de
    # corrido, lo contaría como una prueba real de AC-05.1 y AC-10.1.
    marcador = "@pytest.mark." + 'ac("AC-05.1", "AC-10.1")'
    (pruebas / "test_algo.py").write_text(
        f"{marcador}\nasync def test_de_backend():\n    pass\n", encoding="utf-8"
    )
    monkeypatch.setattr(traza, "RAIZ", tmp_path)
    monkeypatch.setattr(traza, "FRONTEND", tmp_path / "frontend" / "src")
    monkeypatch.setattr(traza, "PRUEBAS", pruebas)
    return tmp_path


def test_un_marcador_sobre_it_test_o_describe_cuenta(repo: Path) -> None:
    cobertura = traza.cobertura_en_frontend()
    assert cobertura["AC-05.1"] == [
        "frontend/src/comensal/menu.test.tsx::busca sin acentos",
        "frontend/src/comensal/util.test.ts::otra del mismo criterio",
    ]
    assert cobertura["AC-01.3"] == ["frontend/src/comensal/menu.test.tsx::pantallas de fallo"]
    for criterio in ("AC-05.2", "AC-05.3", "AC-06.1"):
        assert cobertura[criterio] == ["frontend/src/comensal/menu.test.tsx::filtra por alérgeno"]


def test_un_rango_se_expande_y_la_sangria_no_importa(repo: Path) -> None:
    cobertura = traza.cobertura_en_frontend()
    for criterio in ("AC-02.1", "AC-02.2", "AC-02.3"):
        assert cobertura[criterio] == ["frontend/src/comensal/menu.test.tsx::con rango y sangría"]


def test_lo_que_no_cuenta(repo: Path) -> None:
    cobertura = traza.cobertura_en_frontend()
    assert "AC-04.3" not in cobertura, "un AC en el título no es un marcador"
    assert "AC-07.1" not in cobertura, "una prueba saltada no cubre nada"
    assert "AC-07.2" not in cobertura, "un todo no cubre nada"
    assert "AC-08.1" not in cobertura, "el marcador va justo encima de la prueba"
    assert "AC-09.1" not in cobertura, "sólo archivos *.test.ts(x)"
    assert set(cobertura) == {
        "AC-01.3",
        "AC-02.1",
        "AC-02.2",
        "AC-02.3",
        "AC-05.1",
        "AC-05.2",
        "AC-05.3",
        "AC-06.1",
    }


def test_backend_y_frontend_se_suman(repo: Path) -> None:
    cobertura = traza.cobertura_en_pruebas()
    assert cobertura["AC-10.1"] == ["tests/test_algo.py::test_de_backend"]
    assert sorted(cobertura["AC-05.1"]) == [
        "frontend/src/comensal/menu.test.tsx::busca sin acentos",
        "frontend/src/comensal/util.test.ts::otra del mismo criterio",
        "tests/test_algo.py::test_de_backend",
    ]


def test_sin_frontend_no_falla(repo: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(traza, "FRONTEND", repo / "no-existe")
    assert traza.cobertura_en_frontend() == {}
    assert traza.cobertura_en_pruebas()["AC-10.1"] == ["tests/test_algo.py::test_de_backend"]


VITEST_EACH_Y_SALTADOS = """\
import { describe, it } from 'vitest';

// @ac AC-11.1
it.each(casos)('busca %s', () => {});

// @ac AC-11.2
it.each([
  ['a', 'b'],
  ['c', 'd'],
])('tabla en varias líneas %s', () => {});

// @ac AC-11.3
it.each`
  a    | b
  ${1} | ${2}
`("con plantilla $a", () => {});

describe.skip('bloque saltado', () => {
  // @ac AC-11.4
  it('dentro de un describe saltado', () => {});

  describe('anidado', () => {
    // @ac AC-11.5
    it('nieto de un describe saltado', () => {});
  });
});

// @ac AC-11.6
it('después del bloque saltado', () => {});

// @ac AC-11.7
it.skip.each(casos)('each saltado', () => {});

describe('bloque normal', () => {
  // @ac AC-11.8
  it('dentro de un describe normal', () => {});
});
"""


def test_it_each_cuenta_con_su_titulo_y_un_describe_saltado_no(repo: Path) -> None:
    archivo = repo / "frontend" / "src" / "comensal" / "busqueda.test.tsx"
    archivo.write_text(VITEST_EACH_Y_SALTADOS, encoding="utf-8")
    cobertura = traza.cobertura_en_frontend()
    ruta = "frontend/src/comensal/busqueda.test.tsx"
    assert cobertura["AC-11.1"] == [f"{ruta}::busca %s"]
    assert cobertura["AC-11.2"] == [f"{ruta}::tabla en varias líneas %s"]
    assert cobertura["AC-11.3"] == [f"{ruta}::con plantilla $a"]
    assert cobertura["AC-11.6"] == [f"{ruta}::después del bloque saltado"]
    assert cobertura["AC-11.8"] == [f"{ruta}::dentro de un describe normal"]
    assert "AC-11.4" not in cobertura, "un it dentro de describe.skip no corre"
    assert "AC-11.5" not in cobertura, "ni lo anidado dentro de un describe.skip"
    assert "AC-11.7" not in cobertura, "un it.skip.each no corre"
