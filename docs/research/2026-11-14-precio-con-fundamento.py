"""Precio con fundamento: matriz de funciones, deltas dentro de proveedor, modelo por funciones
(validación dejando uno fuera + bootstrap con semilla fija), valor del paquete de Carta y corredor.

Entrada: la matriz FUNCIONES de abajo (funciones según la página de cada proveedor, leída el 13-14
de noviembre de 2026; ver el .md) y el CSV de precios del 13 de noviembre.
Salida: 2026-11-14-funciones-y-precios.csv, 2026-11-14-precio-con-fundamento-datos.json
Sólo biblioteca estándar (el ajuste es mínimos cuadrados con eliminación gaussiana).
Valores: 1 = la página lo incluye en ese plan; 0 = la página dice que no (o es complemento de pago);
None = la página no lo publica (se trata como 0 en el modelo y se hace una sensibilidad).
"""

import csv
import json
import os
import random

AQUI = os.path.dirname(os.path.abspath(__file__))
SEMILLA = 20261114
FX = 18.6188  # MXN por USD, FIX Banxico 12-nov-2026 (documento: planes-y-costo §3.5)

# columnas de funciones
F = [
    "menu_qr",
    "pedir_mesa",
    "grupo",
    "comanda_app",
    "cocina",
    "pos",
    "pago_mesa",
    "factura",
    "reservas",
    "reparto",
    "inventario",
    "reportes",
    "sucursales",
]

# proveedor, plan, precio_mxn_mes_antes_iva (None = sin precio), unidad, funciones {…}, limites
# Fuente de cada fila: página del proveedor (CSV del 13-nov + lecturas del 14-nov; ver .md §1).
FILAS = [
    ("Soft Restaurant 12", "Lite", 799, "licencia", dict(pos=1), "Payments baja a 639"),
    ("Soft Restaurant 12", "Pro", 1099, "licencia", dict(pos=1), ""),
    (
        "Soft Restaurant Cloud",
        "Lite",
        699,
        "empresa",
        dict(pos=1, reportes=1, reparto=1, sucursales=0),
        "2 dispositivos",
    ),
    (
        "Soft Restaurant Cloud",
        "Pro",
        999,
        "empresa",
        dict(pos=1, reportes=1, reparto=1, sucursales=0),
        "5 dispositivos",
    ),
    (
        "Soft Restaurant Cloud",
        "Enterprise",
        1599,
        "empresa",
        dict(pos=1, reportes=1, reparto=1, sucursales=1),
        "10 dispositivos",
    ),
    (
        "Fudo",
        "Avanzado",
        652,
        "negocio",
        dict(menu_qr=1, pedir_mesa=1, pos=1, inventario=1, cocina=0),
        "mesas +5 USD, cocina +10 USD, reparto +15 USD",
    ),
    (
        "Fudo",
        "Pro",
        838,
        "negocio",
        dict(menu_qr=1, pedir_mesa=1, pos=1, inventario=1, reportes=1, cocina=0),
        "varias cajas, estado de resultados",
    ),
    (
        "Last.app",
        "Starter",
        1000,
        "sucursal",
        dict(pos=1, factura=1, cocina=0, sucursales=0),
        "2 licencias POS, 100 folios; cocina +250",
    ),
    (
        "Last.app",
        "Growth",
        1700,
        "sucursal",
        dict(pos=1, factura=1, cocina=0, sucursales=0),
        "4 licencias POS, 200 folios",
    ),
    (
        "Last.app",
        "Unlimited",
        2900,
        "sucursal",
        dict(pos=1, factura=1, cocina=0, sucursales=0),
        "licencias ilimitadas, 500 folios",
    ),
    ("OlaClick", "Advanced", 184, "negocio", dict(menu_qr=1, pos=1, reparto=1, factura=0), "75 pedidos/mes; facturación como complemento"),
    ("OlaClick", "Premium", 465, "negocio", dict(menu_qr=1, pos=1, reparto=1, factura=0), "400 pedidos/mes; facturación como complemento"),
    ("OlaClick", "Elite", 1099, "negocio", dict(menu_qr=1, pos=1, reparto=1, factura=1), "pedidos ilimitados; facturación incluida"),
    (
        "OlaClick",
        "Impulso",
        2979,
        "negocio",
        dict(menu_qr=1, pos=1, reparto=1, reportes=1),
        "copiloto de IA",
    ),
    (
        "MenuTiger",
        "Free",
        0,
        "negocio",
        dict(menu_qr=1, pedir_mesa=1, sucursales=0),
        "75 pedidos/mes, 1 local",
    ),
    (
        "MenuTiger",
        "Regular",
        317,
        "negocio",
        dict(menu_qr=1, pedir_mesa=1, reportes=1, cocina=0, sucursales=1),
        "500 pedidos, 2 locales",
    ),
    (
        "MenuTiger",
        "Advanced",
        856,
        "negocio",
        dict(menu_qr=1, pedir_mesa=1, reportes=1, cocina=1, sucursales=1),
        "2,000 pedidos, 5 locales",
    ),
    (
        "MenuTiger",
        "Premium",
        2216,
        "negocio",
        dict(menu_qr=1, pedir_mesa=1, reportes=1, cocina=1, sucursales=1),
        "pedidos ilimitados, gestión de mesas, marca blanca",
    ),
    ("Neolo", "Menú QR gratis", 0, "negocio", dict(menu_qr=1), "200 visualizaciones"),
    ("Neolo", "Plan 0", 157, "negocio", dict(menu_qr=1), "visualizaciones ilimitadas, alérgenos"),
    (
        "Meniu",
        "Business",
        225,
        "negocio",
        dict(menu_qr=1, pos=1, reservas=1, inventario=1, reparto=1),
        "prueba 7 días",
    ),
    (
        "Poster",
        "Mini",
        495,
        "negocio",
        dict(menu_qr=1, pos=1, inventario=1, comanda_app=0, cocina=0, reservas=0),
        "pago anual",
    ),
    (
        "Poster",
        "Business",
        837,
        "negocio",
        dict(menu_qr=1, pos=1, inventario=1, comanda_app=1, cocina=1, reservas=0),
        "comandero móvil, KDS",
    ),
    (
        "Poster",
        "Pro",
        1179,
        "negocio",
        dict(menu_qr=1, pos=1, inventario=1, comanda_app=1, cocina=1, reservas=1),
        "reservas, permisos",
    ),
    (
        "Loyverse",
        "POS gratis",
        0,
        "tienda",
        dict(pos=1, cocina=1, inventario=1, reportes=1, menu_qr=0),
        "analítica 31 días",
    ),
    ("Waitry", "Lite", 0, "negocio", dict(menu_qr=1, pedir_mesa=0, pago_mesa=0), "sólo carta"),
    (
        "Waitry",
        "Premium",
        1243,
        "negocio",
        dict(menu_qr=1, pedir_mesa=1, pago_mesa=1, reparto=1),
        "pedido y pago en mesa, venta en línea",
    ),
    ("OpenTable", "Basic", 2774, "restaurante", dict(reservas=1), "fuente secundaria, EE. UU."),
    ("OpenTable", "Core", 5567, "restaurante", dict(reservas=1), "fuente secundaria, EE. UU."),
    ("OpenTable", "Pro", 9291, "restaurante", dict(reservas=1), "fuente secundaria, EE. UU."),
    (
        "Parrot Software",
        "Starter/Pro/All-In-One",
        None,
        "negocio",
        dict(pos=1),
        "no publica precio",
    ),
    ("Wansoft", "Básico/Inventarios/Pro", None, "negocio", dict(pos=1), "no publica precio"),
    (
        "Soft Restaurant",
        "Menú Digital (complemento)",
        None,
        "tableta",
        dict(menu_qr=1, comanda_app=1),
        "no publica precio",
    ),
]

# Complementos con precio propio (los datos más limpios de «cuánto vale una función»), MXN/mes
COMPLEMENTOS = [
    ("Fudo", "módulo de mesas", 5 * FX, "negocio"),
    ("Fudo", "pantalla de cocina", 10 * FX, "negocio"),
    ("Fudo", "reparto", 15 * FX, "negocio"),
    ("Last.app", "pantalla de cocina", 250, "sucursal"),
    ("Loyverse", "historial (más de 31 días)", 7 * FX, "tienda"),
    ("Loyverse", "empleados", 25 * FX, "tienda"),
    ("Loyverse", "inventario avanzado", 25 * FX, "tienda"),
]

# Funciones que Carta tendrá al terminar la Fase 3 (04 §7; ver .md §3): qué columnas cubre
PAQUETE_CARTA = {"menu_qr": 1, "pedir_mesa": 1, "grupo": 1, "comanda_app": 1, "reportes": 0}
# Grupos para el modelo (pocas variables, n pequeño)
GRUPOS = {
    "menu_y_pedido": ["menu_qr", "pedir_mesa", "grupo", "comanda_app"],
    "operacion": ["cocina", "pos", "pago_mesa", "factura", "inventario"],
    "reservas_y_reparto": ["reservas", "reparto"],
    "sucursales": ["sucursales"],
}


def resolver(lista, cols):
    return [lista.get(c) or 0 for c in cols]


def ols(X, y, lam=1e-6):
    n, p = len(X), len(X[0])
    A = [
        [sum(X[k][i] * X[k][j] for k in range(n)) + (lam if i == j else 0) for j in range(p)]
        for i in range(p)
    ]
    b = [sum(X[k][i] * y[k] for k in range(n)) for i in range(p)]
    for i in range(p):
        piv = max(range(i, p), key=lambda r: abs(A[r][i]))
        A[i], A[piv] = A[piv], A[i]
        b[i], b[piv] = b[piv], b[i]
        for r in range(i + 1, p):
            f = A[r][i] / A[i][i]
            for c in range(i, p):
                A[r][c] -= f * A[i][c]
            b[r] -= f * b[i]
    beta = [0.0] * p
    for i in range(p - 1, -1, -1):
        beta[i] = (b[i] - sum(A[i][j] * beta[j] for j in range(i + 1, p))) / A[i][i]
    return beta


def diseno(filas):
    """X con intercepto y 4 grupos (cuántas funciones del grupo trae el plan, normalizado a 0..1)."""
    X, y = [], []
    for prov, plan, precio, un, f, lim in filas:
        if precio is None:
            continue
        row = [1.0]
        for g, cols in GRUPOS.items():
            row.append(sum(resolver(f, cols)) / len(cols))
        X.append(row)
        y.append(float(precio))
    return X, y


def main():
    random.seed(SEMILLA)
    filas_precio = [
        r for r in FILAS if r[2] is not None and r[0] != "OpenTable"
    ]  # OpenTable: fuente secundaria, EE. UU.
    X, y = diseno(filas_precio)
    n = len(y)
    beta = ols(X, y)
    # validación dejando uno fuera
    errs = []
    for i in range(n):
        Xi = X[:i] + X[i + 1 :]
        yi = y[:i] + y[i + 1 :]
        b = ols(Xi, yi)
        pred = sum(c * v for c, v in zip(b, X[i]))
        errs.append(pred - y[i])
    mae = sum(abs(e) for e in errs) / n
    media = sum(y) / n
    base = sum(abs(v - media) for v in y) / n  # error de predecir siempre el promedio
    # bootstrap del coeficiente y del valor del paquete de Carta
    carta = [1.0] + [sum(resolver(PAQUETE_CARTA, cols)) / len(cols) for cols in GRUPOS.values()]
    reps = []
    coefs = []
    for _ in range(2000):
        idx = [random.randrange(n) for _ in range(n)]
        Xb = [X[i] for i in idx]
        yb = [y[i] for i in idx]
        try:
            b = ols(Xb, yb, lam=1e-3)
        except ZeroDivisionError:
            continue
        coefs.append(b)
        reps.append(sum(c * v for c, v in zip(b, carta)))
    reps.sort()
    q = lambda a, p: a[int(p * (len(a) - 1))]
    nombres = ["intercepto"] + list(GRUPOS)
    cs = {}
    for j, nom in enumerate(nombres):
        col = sorted(c[j] for c in coefs)
        cs[nom] = dict(estimado=round(beta[j]), p5=round(q(col, 0.05)), p95=round(q(col, 0.95)))
    salida = dict(
        n=n,
        coeficientes_mxn=cs,
        error_absoluto_medio_dejando_uno_fuera=round(mae),
        error_de_predecir_el_promedio=round(base),
        valor_paquete_carta_mxn=dict(
            estimado=round(sum(c * v for c, v in zip(beta, carta))),
            p5=round(q(reps, 0.05)),
            p95=round(q(reps, 0.95)),
        ),
        paquete_carta=PAQUETE_CARTA,
    )
    # sensibilidad: sólo planes de menú QR / pedidos (excluye POS completos)
    sub = [r for r in filas_precio if not (r[4].get("pos") and r[0] not in ("OlaClick", "Meniu"))]
    Xs, ys = diseno(sub)
    salida["n_sin_pos_completos"] = len(ys)
    salida["precio_mediano_sin_pos_completos"] = sorted(ys)[len(ys) // 2]
    # deltas dentro del proveedor
    deltas = []
    por_prov = {}
    for r in FILAS:
        if r[2] is not None and r[0] != "OpenTable":
            por_prov.setdefault(r[0], []).append(r)
    for prov, rs in por_prov.items():
        rs.sort(key=lambda r: r[2])
        for a, b in zip(rs, rs[1:]):
            nuevas = [k for k in F if (b[4].get(k) or 0) > (a[4].get(k) or 0)]
            deltas.append(
                dict(
                    proveedor=prov,
                    de=a[1],
                    a=b[1],
                    precio_de=a[2],
                    precio_a=b[2],
                    sube=round(b[2] - a[2]),
                    sube_pct=round(100 * (b[2] / a[2] - 1)) if a[2] else None,
                    funciones_nuevas=nuevas,
                    limites=b[5],
                )
            )
    salida["deltas"] = deltas
    salida["complementos"] = [
        dict(proveedor=p, funcion=f, mxn_mes=round(m), unidad=u) for p, f, m, u in COMPLEMENTOS
    ]
    json.dump(
        salida,
        open(f"{AQUI}/2026-11-14-precio-con-fundamento-datos.json", "w"),
        ensure_ascii=False,
        indent=1,
    )
    with open(f"{AQUI}/2026-11-14-funciones-y-precios.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(
            ["proveedor", "plan", "precio_mxn_mes_antes_iva", "unidad_de_cobro"]
            + F
            + ["limites_y_notas"]
        )
        for prov, plan, precio, un, f, lim in FILAS:
            w.writerow(
                [prov, plan, "" if precio is None else precio, un]
                + [("no publicado" if f.get(c) is None else f[c]) for c in F]
                + [lim]
            )
    print(
        json.dumps({k: v for k, v in salida.items() if k != "deltas"}, ensure_ascii=False, indent=1)
    )
    for d in deltas:
        print(d)


if __name__ == "__main__":
    main()
