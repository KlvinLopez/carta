"""PDFs hostiles para las pruebas de importación (T-1.9, revisión A1). Nada binario en el repo."""

from __future__ import annotations

import zlib


def ceros_comprimidos(mib: int) -> bytes:
    """`mib` MiB de ceros en FlateDecode, comprimidos por trozos (sin tener el GiB en memoria)."""
    compresor = zlib.compressobj(9)
    trozo = b"\0" * (1 << 20)
    partes = [compresor.compress(trozo) for _ in range(mib)]
    partes.append(compresor.flush())
    return b"".join(partes)


def pdf_con_xref_gigante(mib: int = 1024) -> bytes:
    """Un PDF válido de una página cuyo *xref stream* se descomprime en `mib` MiB de ceros:
    ~1 MB en disco por GiB declarado. Abrirlo sin topes cuesta lo que descomprime."""
    objetos = [
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
        b"2 0 obj<</Type/Pages/Kids[4 0 R]/Count 1>>endobj\n",
        b"4 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\n",
    ]
    datos = bytearray(b"%PDF-1.5\n")
    for objeto in objetos:
        datos += objeto
    flujo = ceros_comprimidos(mib)
    inicio_xref = len(datos)
    datos += (
        b"3 0 obj<</Type/XRef/Size 5/W[1 4 2]/Root 1 0 R/Filter/FlateDecode/Length "
        + str(len(flujo)).encode()
        + b">>stream\n"
        + flujo
        + b"\nendstream endobj\n"
    )
    datos += b"startxref\n" + str(inicio_xref).encode() + b"\n%%EOF\n"
    return bytes(datos)
