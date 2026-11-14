"""Precio con fundamento: matriz de funciones, saltos dentro de proveedor, modelo por funciones
(validación dejando uno fuera + bootstrap con semilla fija) y complementos.

Entrada: la matriz FILAS de abajo. Fuente de cada fila: la página del propio proveedor, leída con
Chromium el 14-nov-2026 (Meniu, Fudo, Poster, MenuTiger, Soft Restaurant Cloud, Last.app, Loyverse,
Neolo, Waitry; OlaClick con la herramienta de lectura) o el 13-nov (resto; ver el CSV del comparativo).
Salida: 2026-11-14-funciones-y-precios.csv, 2026-11-14-precio-con-fundamento-datos.json.
Sólo biblioteca estándar.

Valores: 1 = la página lo incluye en ese plan; 0 = la página dice que no (o es complemento de pago);
None = la página no lo publica: NO cuenta como 0 en ningún cálculo (el modelo promedia sólo lo
conocido y descarta el plan si un grupo entero es desconocido).
iva: «sin IVA» / «+ IVA» = la página lo declara; «no declarado» = no dice.
tope: pedidos al mes publicados (None = no publicado, «ilimitado» = la página lo dice).
"""

import csv
import json
import os
import random

AQUI = os.path.dirname(os.path.abspath(__file__))
SEMILLA = 20261114
FX = 18.6188  # MXN por USD, FIX Banxico 12-nov-2026 (documento: planes-y-costo §3.5)
USD = lambda x: round(x * FX)

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

# proveedor, plan, precio MXN/mes (None = sin precio), moneda original, iva, unidad, tope de pedidos,
# funciones, límites y notas
FILAS = [
    (
        "Soft Restaurant 12",
        "Lite",
        799,
        "MXN",
        "+ IVA",
        "licencia",
        None,
        dict(pos=1),
        "con Payments 639; 13-nov",
    ),
    ("Soft Restaurant 12", "Pro", 1099, "MXN", "+ IVA", "licencia", None, dict(pos=1), "13-nov"),
    (
        "Soft Restaurant Cloud",
        "Lite",
        699,
        "MXN",
        "+ IVA",
        "empresa",
        None,
        dict(pos=1, comanda_app=1, factura=1, reparto=1, reportes=1, sucursales=0),
        "2 dispositivos; 349 con Payments (>50,000 en tarjeta); 14-nov",
    ),
    (
        "Soft Restaurant Cloud",
        "Pro",
        999,
        "MXN",
        "+ IVA",
        "empresa",
        None,
        dict(pos=1, comanda_app=1, factura=1, reparto=1, reportes=1, sucursales=0),
        "5 dispositivos; 13-nov",
    ),
    (
        "Soft Restaurant Cloud",
        "Enterprise",
        1599,
        "MXN",
        "+ IVA",
        "empresa",
        None,
        dict(pos=1, comanda_app=1, factura=1, reparto=1, reportes=1, sucursales=1),
        "10 dispositivos, multisucursal; 13-nov",
    ),
    (
        "Fudo",
        "Avanzado",
        USD(35),
        "USD",
        "no declarado",
        "negocio",
        None,
        dict(menu_qr=1, pedir_mesa=1, comanda_app=1, pos=1, inventario=1, reportes=1, cocina=0),
        "«Pedido desde la mesa con Carta QR», «App móvil para camareros», usuarios ilimitados; módulos: mesas +5 USD, comensal +2, reparto +15, cocina +10, tu delivery +30; 14-nov",
    ),
    (
        "Fudo",
        "Pro",
        USD(45),
        "USD",
        "no declarado",
        "negocio",
        None,
        dict(menu_qr=1, pedir_mesa=1, comanda_app=1, pos=1, inventario=1, reportes=1, cocina=0),
        "Avanzado + varias cajas, turnos, estado de resultados; 14-nov",
    ),
    (
        "Last.app",
        "Starter",
        1000,
        "MXN",
        "+ IVA",
        "sucursal",
        None,
        dict(
            menu_qr=1,
            pedir_mesa=1,
            pos=1,
            factura=1,
            reparto=1,
            reportes=1,
            cocina=0,
            inventario=0,
            reservas=1,
        ),
        "QR y pedidos en mesa gratis; 2 licencias POS, 100 folios; inventario desde Growth; The Book plan Basic gratis; KDS de pago; 14-nov",
    ),
    (
        "Last.app",
        "Growth",
        1700,
        "MXN",
        "+ IVA",
        "sucursal",
        None,
        dict(
            menu_qr=1,
            pedir_mesa=1,
            pos=1,
            factura=1,
            reparto=1,
            reportes=1,
            cocina=0,
            inventario=1,
            reservas=1,
        ),
        "4 licencias POS, 200 folios; 14-nov",
    ),
    (
        "Last.app",
        "Unlimited",
        2900,
        "MXN",
        "+ IVA",
        "sucursal",
        None,
        dict(
            menu_qr=1,
            pedir_mesa=1,
            pos=1,
            factura=1,
            reparto=1,
            reportes=1,
            cocina=0,
            inventario=1,
            reservas=1,
        ),
        "licencias ilimitadas, 500 folios; 14-nov",
    ),
    (
        "OlaClick",
        "Advanced",
        USD(9.9),
        "USD",
        "no declarado",
        "negocio",
        75,
        dict(menu_qr=1, pos=1, factura=0),
        "14-nov (herramienta de lectura; tabla por plan perdida)",
    ),
    (
        "OlaClick",
        "Premium",
        USD(25),
        "USD",
        "no declarado",
        "negocio",
        400,
        dict(menu_qr=1, pos=1, factura=0),
        "idem",
    ),
    (
        "OlaClick",
        "Elite",
        USD(59),
        "USD",
        "no declarado",
        "negocio",
        "ilimitado",
        dict(menu_qr=1, pos=1, factura=1),
        "idem",
    ),
    (
        "OlaClick",
        "Impulso",
        USD(160),
        "USD",
        "no declarado",
        "negocio",
        "ilimitado",
        dict(menu_qr=1, pos=1, factura=1),
        "copiloto de IA; idem",
    ),
    (
        "MenuTiger",
        "Free",
        0,
        "USD",
        "no declarado",
        "negocio",
        75,
        dict(menu_qr=1, pedir_mesa=1, pos=0, cocina=0, sucursales=0, reportes=1),
        "1 local; 14-nov",
    ),
    (
        "MenuTiger",
        "Regular",
        USD(17),
        "USD",
        "no declarado",
        "negocio",
        500,
        dict(menu_qr=1, pedir_mesa=1, pos=0, cocina=0, sucursales=1, reportes=1),
        "2 locales; POS como complemento (30 USD); 14-nov",
    ),
    (
        "MenuTiger",
        "Advanced",
        USD(46),
        "USD",
        "no declarado",
        "negocio",
        2000,
        dict(menu_qr=1, pedir_mesa=1, pos=0, cocina=1, sucursales=1, reportes=1),
        "5 locales; KDS; POS complemento; 14-nov",
    ),
    (
        "MenuTiger",
        "Premium",
        USD(119),
        "USD",
        "no declarado",
        "negocio",
        "ilimitado",
        dict(menu_qr=1, pedir_mesa=1, pos=1, cocina=1, sucursales=1, reportes=1),
        "locales ilimitados; gestión de mesas; marca blanca; 14-nov",
    ),
    (
        "Neolo",
        "Menú QR gratis",
        0,
        "MXN",
        "no declarado",
        "negocio",
        None,
        dict(menu_qr=1),
        "hasta 200 visitas; 14-nov",
    ),
    (
        "Neolo",
        "Plan 0",
        157,
        "MXN",
        "no declarado",
        "negocio",
        None,
        dict(menu_qr=1),
        "es un paquete de hosting con menú QR incluido; alérgenos; estadísticas de escaneo; 14-nov",
    ),
    (
        "Meniu",
        "Business",
        225,
        "MXN",
        "no declarado",
        "negocio",
        None,
        dict(
            menu_qr=1,
            pedir_mesa=1,
            pago_mesa=1,
            cocina=1,
            pos=1,
            reservas=1,
            reparto=1,
            inventario=1,
            reportes=1,
            sucursales=1,
        ),
        "plan único; sucursales ilimitadas; la lista de la página incluye «Ordena y paga desde tu mesa», KDS, mapa de mesas, usuarios meseros; las marcas ✓/✗ no se extraen del texto, se asume que la lista es lo que trae el plan; sin tope de pedidos publicado; 14-nov",
    ),
    (
        "Poster",
        "Mini",
        USD(26),
        "USD",
        "no declarado",
        "negocio",
        None,
        dict(menu_qr=1, pos=1, inventario=1, reportes=1, comanda_app=0, cocina=0, reservas=0),
        "hoy en USD en joinposter.mx (el 13-nov mostraba 495 MXN); 100 productos; 14-nov",
    ),
    (
        "Poster",
        "Business",
        USD(44),
        "USD",
        "no declarado",
        "negocio",
        None,
        dict(
            menu_qr=1,
            pos=1,
            inventario=1,
            reportes=1,
            comanda_app=1,
            cocina=1,
            reparto=1,
            reservas=0,
        ),
        "300 productos; comandero móvil, KDS; 14-nov",
    ),
    (
        "Poster",
        "Pro",
        USD(62),
        "USD",
        "no declarado",
        "negocio",
        None,
        dict(
            menu_qr=1,
            pos=1,
            inventario=1,
            reportes=1,
            comanda_app=1,
            cocina=1,
            reparto=1,
            reservas=1,
        ),
        "1,500 productos; reservas; 14-nov",
    ),
    (
        "Loyverse",
        "POS gratis",
        0,
        "USD",
        "sin IVA",
        "tienda",
        None,
        dict(pos=1, cocina=1, inventario=1, reportes=1, sucursales=1),
        "analítica 31 días; complementos por tienda: historial 7 USD, empleados 25, inventario avanzado 25; 14-nov",
    ),
    (
        "Waitry",
        "Lite",
        0,
        "EUR",
        "sin IVA",
        "negocio",
        None,
        dict(menu_qr=1),
        "sólo carta digital; 14-nov",
    ),
    (
        "Waitry",
        "Premium",
        round(60 * 20.711),
        "EUR",
        "sin IVA",
        "negocio",
        None,
        dict(menu_qr=1, pedir_mesa=1, pago_mesa=1, reparto=1),
        "60 EUR mensual / 48 anual; 14-nov",
    ),
    (
        "OpenTable",
        "Basic",
        2774,
        "USD",
        "no declarado",
        "restaurante",
        None,
        dict(reservas=1),
        "fuente secundaria, EE. UU.",
    ),
    (
        "OpenTable",
        "Core",
        5567,
        "USD",
        "no declarado",
        "restaurante",
        None,
        dict(reservas=1),
        "fuente secundaria, EE. UU.",
    ),
    (
        "OpenTable",
        "Pro",
        9291,
        "USD",
        "no declarado",
        "restaurante",
        None,
        dict(reservas=1),
        "fuente secundaria, EE. UU.",
    ),
    (
        "Parrot Software",
        "Starter/Pro/All-In-One",
        None,
        "MXN",
        "",
        "negocio",
        None,
        dict(pos=1),
        "no publica precio",
    ),
    (
        "Wansoft",
        "Básico/Inventarios/Pro",
        None,
        "MXN",
        "",
        "negocio",
        None,
        dict(pos=1),
        "no publica precio",
    ),
    (
        "Soft Restaurant",
        "Menú Digital (complemento)",
        None,
        "MXN",
        "",
        "tableta",
        None,
        dict(menu_qr=1, comanda_app=1),
        "no publica precio",
    ),
]

COMPLEMENTOS = [
    ("Fudo", "gestión de mesas", USD(5), "negocio"),
    ("Fudo", "ventas por comensal (separar cuentas)", USD(2), "negocio"),
    ("Fudo", "pantalla de cocina", USD(10), "negocio"),
    ("Fudo", "apps de reparto", USD(15), "negocio"),
    ("Fudo", "tu delivery (tienda en línea)", USD(30), "negocio"),
    ("Fudo", "recepcionista de IA", USD(40), "negocio"),
    ("MenuTiger", "POS en la nube", USD(30), "negocio"),
    ("MenuTiger", "gestión de impresoras de cocina", USD(20), "negocio"),
    ("MenuTiger", "dominio de marca blanca", USD(29), "negocio"),
    ("Poster", "Poster QR (menú y reseñas)", USD(7), "negocio"),
    ("Poster", "sitio de pedidos", USD(19), "negocio"),
    ("Last.app", "pantalla de cocina", 250, "sucursal"),
    ("Loyverse", "historial de ventas (más de 31 días)", USD(7), "tienda"),
    ("Loyverse", "gestión de empleados", USD(25), "tienda"),
    ("Loyverse", "inventario avanzado", USD(25), "tienda"),
]

GRUPOS = {
    "menu_y_pedido": ["menu_qr", "pedir_mesa", "grupo", "comanda_app"],
    "operacion": ["cocina", "pos", "pago_mesa", "factura", "inventario"],
    "sucursales": ["sucursales"],
}
PAQUETE_CARTA = {
    "menu_qr": 1,
    "pedir_mesa": 1,
    "grupo": 1,
    "comanda_app": 1,
    "cocina": 0,
    "pos": 0,
    "pago_mesa": 0,
    "factura": 0,
    "inventario": 0,
    "sucursales": 0,
}


def grupo_valor(f, cols):
    """Promedio de lo CONOCIDO del grupo; None si ninguna función del grupo está publicada."""
    v = [f[c] for c in cols if f.get(c) is not None]
    return sum(v) / len(v) if v else None


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


def diseno(filas, grupos=None):
    grupos = grupos or GRUPOS
    """Sólo planes con precio, sin OpenTable (EE. UU., fuente secundaria) y con TODOS los grupos
    conocidos (borrado por lista: no se imputa ni se cuenta lo desconocido como 0)."""
    X, y, usados = [], [], []
    for prov, plan, precio, mon, iva, un, tope, f, nota in filas:
        if precio is None or prov == "OpenTable":
            continue
        vals = [grupo_valor(f, cols) for cols in grupos.values()]
        if any(v is None for v in vals):
            continue
        X.append([1.0] + vals)
        y.append(float(precio))
        usados.append(f"{prov} {plan}")
    return X, y, usados


def ajustar(grupos, nombre):
    random.seed(SEMILLA)
    X, y, usados = diseno(FILAS, grupos)
    n = len(y)
    beta = ols(X, y)
    errs = []
    for i in range(n):
        b = ols(X[:i] + X[i + 1:], y[:i] + y[i + 1:])
        errs.append(sum(c * v for c, v in zip(b, X[i])) - y[i])
    mae = sum(abs(e) for e in errs) / n
    media = sum(y) / n
    base_mae = sum(abs(v - media) for v in y) / n
    carta = [1.0] + [grupo_valor(PAQUETE_CARTA, cols) for cols in grupos.values()]
    reps, coefs = [], []
    for _ in range(2000):
        idx = [random.randrange(n) for _ in range(n)]
        b = ols([X[i] for i in idx], [y[i] for i in idx], lam=1e-3)
        coefs.append(b)
        reps.append(sum(c * v for c, v in zip(b, carta)))
    reps.sort()
    q = lambda a, p: a[int(p * (len(a) - 1))]
    cs = {}
    for j, nom in enumerate(["intercepto"] + list(grupos)):
        col = sorted(c[j] for c in coefs)
        cs[nom] = dict(estimado=round(beta[j]), p5=round(q(col, 0.05)), p95=round(q(col, 0.95)))
    return dict(modelo=nombre, n=n, planes_usados=usados, coeficientes_mxn=cs,
                error_absoluto_medio_dejando_uno_fuera=round(mae), error_de_predecir_el_promedio=round(base_mae),
                mejora_sobre_el_promedio=bool(mae < base_mae),
                valor_paquete_carta_mxn=dict(estimado=round(sum(c * v for c, v in zip(beta, carta))),
                                            p5=round(q(reps, .05)), p95=round(q(reps, .95))))


def main():
    G2 = {k: v for k, v in GRUPOS.items() if k != "sucursales"}
    salida = dict(modelo_3_grupos=ajustar(GRUPOS, "menú y pedido, operación, sucursales"),
                  modelo_2_grupos=ajustar(G2, "menú y pedido, operación (sin sucursales, casi nunca publicadas)"))
    # saltos dentro de proveedor (sólo funciones CONOCIDAS en ambos planes)
    deltas = []
    por_prov = {}
    for r in FILAS:
        if r[2] is not None and r[0] != "OpenTable":
            por_prov.setdefault(r[0], []).append(r)
    for prov, rs in por_prov.items():
        rs.sort(key=lambda r: r[2])
        for a, b in zip(rs, rs[1:]):
            nuevas = [
                k
                for k in F
                if a[7].get(k) is not None and b[7].get(k) is not None and b[7][k] > a[7][k]
            ]
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
                    tope_de=a[6],
                    tope_a=b[6],
                    notas=b[8],
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
            [
                "proveedor",
                "plan",
                "precio_mxn_mes",
                "moneda_original",
                "iva",
                "unidad_de_cobro",
                "tope_pedidos_mes",
            ]
            + F
            + ["notas_y_fecha_de_lectura"]
        )
        for prov, plan, precio, mon, iva, un, tope, f, nota in FILAS:
            w.writerow(
                [
                    prov,
                    plan,
                    "" if precio is None else precio,
                    mon,
                    iva,
                    un,
                    "no publicado" if tope is None else tope,
                ]
                + [("no publicado" if f.get(c) is None else f[c]) for c in F]
                + [nota]
            )
    print(
        json.dumps(
            {k: v for k, v in salida.items() if k not in ("deltas", "complementos")},
            ensure_ascii=False,
            indent=1,
        )
    )
    for d in deltas:
        print(
            d["proveedor"],
            d["de"],
            "->",
            d["a"],
            d["sube"],
            d["funciones_nuevas"],
            d["tope_de"],
            d["tope_a"],
        )


if __name__ == "__main__":
    main()
