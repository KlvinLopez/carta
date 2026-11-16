"""Pruebas del lector de cartas (sin red): destinos públicos, redirecciones, robots y agente de usuario.

    python3 docs/research/2026-11-13-muestra-500-lector-pruebas.py

Sustituyen el resolvedor de nombres por uno falso; ninguna prueba abre una conexión.
"""

from __future__ import annotations

import importlib.util
import socket
import unittest
import urllib.error
import urllib.request
from pathlib import Path

RUTA = Path(__file__).with_name("2026-11-13-muestra-500-lector.py")
spec = importlib.util.spec_from_file_location("lector", RUTA)
assert spec and spec.loader
lector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lector)

DNS = {
    "publico.example": ["93.184.216.34"],
    "otro-publico.example": ["104.20.23.154"],
    "interno.example": ["10.0.0.5"],
    "nube.example": ["169.254.169.254"],
    "bucle.example": ["127.0.0.1"],
    "mixto.example": [
        "93.184.216.34",
        "192.168.1.10",
    ],  # reasociación de DNS: una pública y una privada
    "v6local.example": ["::1"],
    "compartida.example": ["100.64.0.7"],
}


def resolvedor_falso(host, puerto, *a, **k):
    if host in DNS:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, puerto)) for ip in DNS[host]]
    try:  # direcciones literales
        socket.inet_aton(host)
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (host, puerto))]
    except OSError:
        raise OSError(f"no resuelve: {host}") from None


class Pruebas(unittest.TestCase):
    def setUp(self):
        self.original = lector._RESOLVER
        lector._RESOLVER = resolvedor_falso

    def tearDown(self):
        lector._RESOLVER = self.original

    def test_ip_publica(self):
        for ip in ("93.184.216.34", "104.20.23.154", "2606:4700::6810:1"):
            self.assertTrue(lector.ip_es_publica(ip), ip)
        for ip in (
            "127.0.0.1",
            "10.1.2.3",
            "172.16.0.9",
            "192.168.0.1",
            "169.254.169.254",
            "100.64.0.1",
            "0.0.0.0",
            "224.0.0.1",
            "::1",
            "fe80::1",
            "fd00::1",
            "::ffff:10.0.0.1",
        ):
            self.assertFalse(lector.ip_es_publica(ip), ip)

    def test_url_rechazada(self):
        for url in (
            "ftp://publico.example/",
            "file:///etc/passwd",
            "http://localhost/",
            "http://127.0.0.1/",
            "http://169.254.169.254/latest/meta-data/",
            "http://interno.example/",
            "http://nube.example/",
            "http://bucle.example/",
            "http://v6local.example/",
            "http://compartida.example/",
            "http://mixto.example/",  # basta una dirección no pública
            "http://publico.example:22/",
            "http://publico.example:8080/",
            "http://sin-resolver.example/",
            "http:///sin-host",
        ):
            self.assertFalse(lector.url_permitida(url), url)

    def test_clasificacion_de_la_url(self):
        self.assertEqual(lector.clasificar_url("http://sin-resolver.example/"), "no_resuelve")
        self.assertEqual(lector.clasificar_url("http://interno.example/"), "no_publico")
        self.assertEqual(lector.clasificar_url("ftp://publico.example/"), "invalido")
        self.assertEqual(lector.clasificar_url("http://publico.example:22/"), "invalido")
        self.assertEqual(lector.clasificar_url("https://publico.example/"), "ok")
        # un nombre que no existe es un sitio caído (código 0), no «destino no público» (-2)
        self.assertEqual(lector.descargar("http://sin-resolver.example/", 1000)[0], 0)

    def test_url_aceptada(self):
        self.assertTrue(lector.url_permitida("https://publico.example/menu"))
        self.assertTrue(lector.url_permitida("http://otro-publico.example:80/menu.pdf"))
        self.assertTrue(lector.url_permitida("https://publico.example:443/"))

    def _redirigir(self, destino):
        req = urllib.request.Request("https://publico.example/inicio")
        return lector._Redireccion().redirect_request(req, None, 302, "Found", {}, destino)

    def test_redireccion_a_destino_no_publico(self):
        for destino in (
            "http://169.254.169.254/",
            "http://interno.example/",
            "http://localhost/admin",
            "/ruta-relativa-a-http://interno.example",
        ):
            if destino.startswith("/"):
                continue
            with self.assertRaises(lector.DestinoNoPublico, msg=destino):
                self._redirigir(destino)

    def test_redireccion_vuelve_a_consultar_robots_del_nuevo_host(self):
        consultados = []
        original, original_esperar = lector.permitido, lector.esperar
        lector.permitido = lambda url: consultados.append(url) or False  # el nuevo host lo prohíbe
        lector.esperar = lambda dominio: None
        try:
            with self.assertRaises(lector.RobotsProhibe):
                self._redirigir("https://otro-publico.example/carta")
        finally:
            lector.permitido, lector.esperar = original, original_esperar
        self.assertEqual(consultados, ["https://otro-publico.example/carta"])

    def test_redireccion_permitida(self):
        original, original_esperar = lector.permitido, lector.esperar
        lector.permitido = lambda url: True
        lector.esperar = lambda dominio: None
        try:
            nueva = self._redirigir("https://otro-publico.example/carta")
        finally:
            lector.permitido, lector.esperar = original, original_esperar
        self.assertEqual(nueva.full_url, "https://otro-publico.example/carta")

    def test_descargar_no_abre_conexion_a_destino_no_publico(self):
        self.assertEqual(lector.descargar("http://interno.example/menu.pdf", 1000), (-2, "", b""))
        self.assertEqual(lector.descargar("http://169.254.169.254/", 1000), (-2, "", b""))

    def test_descargar_respeta_robots(self):
        original = lector.permitido
        lector.permitido = lambda url: False
        try:
            self.assertEqual(lector.descargar("https://publico.example/menu", 1000), (-1, "", b""))
        finally:
            lector.permitido = original

    def test_pdf_en_otro_dominio_pasa_las_mismas_comprobaciones(self):
        # el PDF enlazado en otro dominio se pide con `descargar`: IP pública y robots del dominio al que llegue
        self.assertEqual(lector.descargar("https://nube.example/carta.pdf", 1000)[0], -2)

    def test_conexion_rechaza_ip_no_publica(self):
        previo = lector.PROXY_ACTIVO
        lector.PROXY_ACTIVO = False
        try:
            with self.assertRaises(lector.DestinoNoPublico):
                lector._crear_conexion(("mixto.example", 80))
            with self.assertRaises(lector.DestinoNoPublico):
                lector._crear_conexion(("interno.example", 80))
        finally:
            lector.PROXY_ACTIVO = previo

    def test_agente_de_usuario_honesto_y_generico(self):
        ua = lector.UA
        self.assertNotIn("Mozilla", ua)
        self.assertNotIn("@", ua)
        self.assertNotIn(
            "carta", ua.replace("lector-automatico-de-cartas", "")
        )  # sin nombre del proyecto ni datos propios
        self.assertIn("lector-automatico", ua)

    def test_codigos_de_error_de_url(self):
        e = urllib.error.URLError(lector.DestinoNoPublico("x"))
        self.assertIsInstance(e.reason, lector.DestinoNoPublico)


if __name__ == "__main__":
    unittest.main(verbosity=2)
