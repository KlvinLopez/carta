"""Corredor de precio (piso y techo) de Carta con todos los supuestos de clasificación a la vista.

Entradas: precios y funciones de la matriz (2026-11-14-precio-con-fundamento.py, páginas leídas el
13 y 14-nov-2026), costos por restaurante (planes-y-costo §0), comisión de tarjeta (planes-y-costo §7.2).
Salida: 2026-11-14-corredor-y-planes-datos.json. Sólo biblioteca estándar.
Marcas: [fuente] página del proveedor; [documento]; [supuesto] (va a «datos por conseguir» del .md).

K (qué fracción del sustituto se cobra) NO se deduce de nada: es una decisión de Calvin sobre qué tan
agresivo entrar. El guion muestra el precio para K de 0.3 a 0.7 y nunca elige uno.
"""

import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
FX = 18.6188
IVA = 0.16
USD = lambda x: round(x * FX)

COSTO_VAR = {"chico": 1.0, "mediano": 1.9, "grande": 7.5, "formal": 3.6}  # [documento] pesos al mes
FIJO = 3.0  # [documento] pesos por restaurante con 500 restaurantes (10 con 100; 2.6 con 1,000)
STRIPE_PCT, STRIPE_FIJO = 0.036, 3.0  # [documento: planes-y-costo §7.2]
SOPORTE = {"30": 30.0, "60": 60.0, "150": 150.0}  # [supuesto] pesos por restaurante de paga al mes
COMANDAS_POR_VISITA = 1.3  # [supuesto] 30 % de las visitas envía 2 comandas (generador de disco)

# Tabla de sustitutos: lo que cubre cada plan según su página y la clasificación que se le da.
# tope: pedidos al mes publicados (None = no publicado; el plan NO se trata como «ilimitado» ni como
# «con tope»: se muestra en ambos escenarios). iva: lo que declara la página.
SUSTITUTOS = [
    # nombre, MXN/mes, iva, tope, menú+pedir en mesa, comanda a mesero, trae POS, nota de clasificación
    (
        "Meniu Business",
        225,
        "no declarado",
        None,
        "sí",
        "sí (usuarios meseros, comandas)",
        "sí",
        "Un solo plan; sin tope de pedidos publicado; trae POS, KDS, mapa de mesas. Marcas ✓/✗ no extraídas del texto de la página",
    ),
    (
        "Fudo Avanzado",
        USD(35),
        "no declarado",
        None,
        "sí (pedido desde la mesa con Carta QR)",
        "sí (app móvil para camareros)",
        "sí",
        "Sin tope de pedidos publicado; el módulo de mesas (+5 USD) NO hace falta para pedir desde la mesa",
    ),
    (
        "Fudo Avanzado + módulo de mesas",
        USD(35) + USD(5),
        "no declarado",
        None,
        "sí",
        "sí",
        "sí",
        "Lo que usaba la primera versión de este informe; la página no lo exige para pedir desde la mesa",
    ),
    (
        "Soft Restaurant Cloud Lite",
        699,
        "+ IVA",
        None,
        "no (toma pedidos y cobra en mesa con comandera)",
        "sí",
        "sí",
        "349 sólo con Payments (>50,000 en tarjeta); no trae QR de pedidos",
    ),
    (
        "Last.app Starter",
        1000,
        "+ IVA",
        None,
        "sí (QR y pedidos en mesa, gratis)",
        "sí",
        "sí",
        "por sucursal; KDS +250",
    ),
    (
        "Poster Business",
        USD(44),
        "no declarado",
        None,
        "sólo menú QR y reseñas",
        "sí (comandero y KDS)",
        "sí",
        "hoy en USD (joinposter.mx); el 13-nov mostraba 837 MXN",
    ),
    (
        "OlaClick Elite",
        USD(59),
        "no declarado",
        "ilimitado",
        "no publicado",
        "no publicado",
        "sí",
        "POS y facturación",
    ),
    (
        "MenuTiger Advanced",
        USD(46),
        "no declarado",
        2000,
        "sí (pedidos QR)",
        "no publicado",
        "no (complemento)",
        "KDS incluido",
    ),
    (
        "MenuTiger Premium",
        USD(119),
        "no declarado",
        "ilimitado",
        "sí",
        "no publicado",
        "sí",
        "gestión de mesas",
    ),
    (
        "Waitry Premium",
        round(60 * 20.711),
        "sin IVA",
        None,
        "sí (pedido y pago en mesa)",
        "no publicado",
        "no publicado",
        "60 EUR mensual",
    ),
    (
        "MenuTiger Regular",
        USD(17),
        "no declarado",
        500,
        "sí (pedidos QR)",
        "no publicado",
        "no (complemento)",
        "con tope",
    ),
    (
        "OlaClick Premium",
        USD(25),
        "no declarado",
        400,
        "no publicado",
        "no publicado",
        "sí",
        "con tope",
    ),
    (
        "OlaClick Advanced",
        USD(9.9),
        "no declarado",
        75,
        "no publicado",
        "no publicado",
        "sí",
        "con tope",
    ),
    (
        "MenuTiger Free",
        0,
        "no declarado",
        75,
        "sí (pedidos QR)",
        "no publicado",
        "no",
        "con tope; gratis",
    ),
]
VISITAS_MES = {"chico": 1800, "mediano": 1800, "grande": 4500, "formal": 1500}  # [documento]
PPM = {"chico": 2.3, "mediano": 2.6, "grande": 3.0, "formal": 3.0}
GASTO_PERSONA = {"chico": 100, "mediano": 160, "grande": 220, "formal": 450}  # [supuesto]


def comision(precio, tarjeta=True):
    """Stripe cobra sobre lo que paga el cliente (precio + IVA) y el IVA de la comisión no se recupera
    [supuesto fiscal: revisar con contador]."""
    if not tarjeta:
        return 0.0
    return (STRIPE_PCT * precio * (1 + IVA) + STRIPE_FIJO) * (1 + IVA)


def piso(perfil, precio, soporte="60", tarjeta=True):
    return COSTO_VAR[perfil] + FIJO + comision(precio, tarjeta) + SOPORTE[soporte]


def precio_regla(S, K, perfil="mediano", soporte="60"):
    """máx(3 × piso, K × S). El piso depende del precio (comisión): se itera."""
    p = K * S
    for _ in range(20):
        p = max(3 * piso(perfil, p, soporte), K * S)
    return p


def redondea(p, perfil="mediano", soporte="60"):
    """Hacia abajo al x49 o x99 anterior, pero nunca por debajo de 3 × piso: si cae debajo, sube al siguiente."""
    base = int(p // 50 * 50 - 1) if p >= 100 else round(p)
    if p >= 100:
        while base < 3 * piso(perfil, base, soporte):
            base += 50
    return base


def main():
    salida = {
        "sustitutos": [
            dict(
                zip(
                    (
                        "nombre",
                        "mxn_mes",
                        "iva",
                        "tope_pedidos",
                        "menu_y_pedir_en_mesa",
                        "comanda_a_mesero",
                        "trae_pos",
                        "nota",
                    ),
                    s,
                )
            )
            for s in SUSTITUTOS
        ]
    }
    Ks = [0.3, 0.4, 0.5, 0.6, 0.7]
    # 1) precio por K y por sustituto (perfil mediano, soporte 60)
    ref = {
        "Meniu Business": 225,
        "Fudo Avanzado": USD(35),
        "Fudo Avanzado + módulo de mesas": USD(40),
        "Fudo Avanzado, si su precio ya incluye IVA": round(USD(35) / 1.16),
        "Fudo + mesas, si su precio ya incluye IVA": round(USD(40) / 1.16),
        "Last.app Starter": 1000,
    }
    tabla = {}
    for nom, S in ref.items():
        tabla[nom] = dict(
            S=S,
            **{
                f"K={k}": dict(
                    precio=round(precio_regla(S, k)),
                    x49=redondea(precio_regla(S, k)),
                    manda="piso" if 3 * piso("mediano", k * S) > k * S else "sustituto",
                )
                for k in Ks
            },
        )
    salida["precio_por_K_y_sustituto"] = tabla
    # 2) soporte 30 / 60 / 150 (K = 0.5)
    sop = {}
    for nom in ("Meniu Business", "Fudo Avanzado", "Fudo Avanzado + módulo de mesas"):
        S = ref[nom]
        sop[nom] = {
            s: dict(
                piso=round(piso("mediano", 349, s), 1),
                precio=round(precio_regla(S, 0.5, soporte=s)),
                x49=redondea(precio_regla(S, 0.5, soporte=s), soporte=s),
            )
            for s in SOPORTE
        }
    salida["soporte_K0_5"] = sop
    # 3) volumen: sustituto más barato que aguanta las comandas (tope publicado); los sin tope publicado se
    #    muestran aparte
    capados = [(s[3], s[1], s[0]) for s in SUSTITUTOS if isinstance(s[3], int)] + [
        (10**9, s[1], s[0]) for s in SUSTITUTOS if s[3] == "ilimitado"
    ]
    sin_tope_pub = {
        s[0]: s[1]
        for s in SUSTITUTOS
        if s[3] is None and s[0] in ("Meniu Business", "Fudo Avanzado")
    }
    vol = []
    for v in (300, 385, 600, 900, 1800, 4500):
        coms = v * COMANDAS_POR_VISITA
        cubren = sorted(
            (p, n, t)
            for t, p, n in capados
            if t >= coms and n != "MenuTiger Free" or (n == "MenuTiger Free" and coms <= 75)
        )
        S_cap = cubren[0]
        S_all = min([S_cap[0]] + list(sin_tope_pub.values()))
        vol.append(
            dict(
                visitas_mes=v,
                comandas_mes=round(coms),
                sustituto_con_tope_publicado=S_cap[1],
                mxn_con_tope=S_cap[0],
                precio_regla_K05_solo_con_tope=round(precio_regla(S_cap[0], 0.5)),
                precio_regla_K05_con_Meniu_Fudo=round(precio_regla(S_all, 0.5)),
                S_con_Meniu_Fudo=S_all,
            )
        )
    salida["volumen"] = vol
    # 4) piso por perfil y precio (con comisión sobre precio con IVA)
    salida["pisos"] = {
        pf: {str(p): round(piso(pf, p), 1) for p in (249, 299, 349, 399, 549, 2167)}
        for pf in COSTO_VAR
    }
    # 5) evaluación de candidatos contra los dos sustitutos extremos (Meniu 225 y Fudo Avanzado 652) y el de mesas
    cand = {
        "249": 249,
        "299": 299,
        "349": 349,
        "399": 399,
        "549": 549,
        "799": 799,
        "2000": 2000,
        "500_por_semana": round(500 * 52 / 12),
    }
    ev = {}
    for nombre, p in cand.items():
        ev[nombre] = {"veces_el_piso_mediano": round(p / piso("mediano", p), 1)}
        for s in ("Meniu Business", "Fudo Avanzado", "Fudo Avanzado + módulo de mesas"):
            ev[nombre][f"pct_de_{s}"] = round(100 * p / ref[s])
        for pf in COSTO_VAR:
            ing = VISITAS_MES[pf] * PPM[pf] * GASTO_PERSONA[pf]
            ev[nombre][f"pct_ingreso_{pf}"] = round(100 * p * (1 + IVA) / ing, 2)
        micro = 20 * 30 * 2.3 * 100
        ev[nombre]["pct_ingreso_micro_20_visitas_dia"] = round(100 * p * (1 + IVA) / micro, 2)
    salida["evaluacion"] = ev
    # 6) Salón (perfil grande: cocina y comandero): sustitutos que cubren eso
    salon = {
        "Poster Business": USD(44),
        "Fudo Avanzado + pantalla de cocina": USD(35) + USD(10),
        "Last.app Starter + cocina": 1250,
        "Meniu Business (trae KDS)": 225,
    }
    salida["salon"] = {
        n: dict(S=S, **{f"K={k}": redondea(precio_regla(S, k, perfil="grande")) for k in Ks})
        for n, S in salon.items()
    }
    # 7) equivalencias de precios en que la regla sí es sensible al IVA
    salida["iva_fudo"] = dict(
        fudo_con_modulo_de_mesas=USD(40),
        sin_iva_si_incluido=round(USD(40) / 1.16),
        precio_regla_K05_si_incluido=redondea(precio_regla(USD(40) / 1.16, 0.5)),
    )
    json.dump(
        salida,
        open(f"{AQUI}/2026-11-14-corredor-y-planes-datos.json", "w"),
        ensure_ascii=False,
        indent=1,
    )
    print(
        json.dumps(
            {k: v for k, v in salida.items() if k != "sustitutos"}, ensure_ascii=False, indent=1
        )
    )


if __name__ == "__main__":
    main()
