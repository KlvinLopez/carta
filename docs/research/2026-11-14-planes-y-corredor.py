"""Corredor de precio (piso, techo, propuesta) y tres planes de Carta, con sus cifras de origen.

Entradas (todas en el repositorio): precios 13-nov (CSV), funciones y complementos (2026-11-14-
precio-con-fundamento.py), costos por restaurante (planes-y-costo §0), disco (2026-11-14-disco-e-
historial-datos.json), estratos del núcleo DENUE (mercado-de-carta §2.1), cobertura de platillos
(muestra de 148, estadística de cartas), mesas y personal (modelo con supuestos, estadística §4.3).
Salida: 2026-11-14-corredor-y-planes-datos.json. Sólo biblioteca estándar.
Marcas: [medida] [documento] [fuente] [supuesto] (cada [supuesto] va a «datos por conseguir» en el .md).
"""

import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
FX = 18.6188  # [documento] FIX Banxico 12-nov-2026
IVA = 0.16

# --- costo variable mensual por perfil (pesos) [documento: planes-y-costo §0, 6 meses de historial] ---
COSTO_VAR = {"chico": 1.0, "mediano": 1.9, "grande": 7.5, "formal": 3.6}
FIJO_PRORRATEO = {
    "N=100": 10.0,
    "N=500": 3.0,
    "N=1000": 2.6,
}  # [documento: planes §0: 10, 3 y 2.6 pesos]
STRIPE_PCT, STRIPE_FIJO = 0.036, 3.0  # [documento: planes §7.2: «Stripe (3.6 % + 3 pesos)»]
SOPORTE = {
    "bajo": 30.0,
    "base": 60.0,
    "alto": 150.0,
}  # [supuesto] pesos por restaurante de paga al mes
# base: 30 min al mes a 120 pesos la hora. Se obtiene midiendo los tickets del piloto.

# --- sustitutos que cubren el mismo trabajo, pesos al mes antes de IVA (CSV del 13-nov) ---
SUSTITUTOS = {
    "menú QR sólo": {"Neolo Plan 0": 157},
    "menú + pedido con tope bajo": {
        "OlaClick Advanced (75 pedidos, con POS)": 184,
        "Meniu Business (con POS)": 225,
        "MenuTiger Regular (500 pedidos)": 317,
        "OlaClick Premium (400 pedidos)": 465,
    },
    "pedido desde la mesa sin tope publicado": {
        "Fudo Avanzado + módulo de mesas (con POS e inventario)": 652 + round(5 * FX),
        "OlaClick Elite (pedidos ilimitados, con POS y factura)": 1099,
        "MenuTiger Advanced (2,000 pedidos)": 856,
        "Waitry Premium (pedido y pago en mesa)": 1243,
    },
    "POS con comanda y cocina (negocio grande)": {
        "Fudo Pro + mesas + cocina": 838 + round(5 * FX) + round(10 * FX),
        "Poster Business (comandero y KDS)": 837,
        "Soft Restaurant Cloud Pro": 999,
        "Soft Restaurant Cloud Enterprise": 1599,
        "MenuTiger Premium (ilimitado)": 2216,
        "Last.app Growth": 1700,
    },
}
COMANDAS_POR_VISITA = 1.3  # [supuesto del generador de disco: 30 % de las visitas envía 2 comandas]
VISITAS_MES = {
    "chico": 1800,
    "mediano": 1800,
    "grande": 4500,
    "formal": 1500,
}  # [documento: planes §0]
GASTO_PERSONA = {
    "chico": 100,
    "mediano": 160,
    "grande": 220,
    "formal": 450,
}  # [supuesto] pesos por persona
PPM = {
    "chico": 2.3,
    "mediano": 2.6,
    "grande": 3.0,
    "formal": 3.0,
}  # [documento: simulador PERFILES]
K = 0.5  # [supuesto] Carta sin POS ni factura vale la mitad del sustituto que sí los trae


def piso(perfil, precio, comision=True, soporte="base", fijo="N=500"):
    iva_comision = (
        1 + IVA
    )  # el IVA de la comisión del procesador no se recupera [supuesto fiscal: revisar]
    com = (STRIPE_PCT * precio + STRIPE_FIJO) * iva_comision if comision else 0.0
    return COSTO_VAR[perfil] + FIJO_PRORRATEO[fijo] + com + SOPORTE[soporte]


def main():
    salida = {"parametros": dict(k=K, soporte=SOPORTE, fijo=FIJO_PRORRATEO, costo_var=COSTO_VAR)}
    # Piso por perfil, con y sin comisión de tarjeta, para tres precios candidatos
    pisos = {}
    for pf in COSTO_VAR:
        pisos[pf] = {"sin_soporte": round(COSTO_VAR[pf] + FIJO_PRORRATEO["N=500"], 1)}
        for p in (349, 549, 2167):
            pisos[pf][f"con_todo_a_{p}"] = round(piso(pf, p), 1)
    salida["pisos"] = pisos
    # Techo: sustituto más barato que aguanta el volumen del perfil
    techo = {}
    for pf, vis in VISITAS_MES.items():
        coms = vis * COMANDAS_POR_VISITA
        cand = []
        if pf in ("chico", "mediano", "formal"):
            for nombre, p in SUSTITUTOS["pedido desde la mesa sin tope publicado"].items():
                if "2,000 pedidos" in nombre and coms > 2000:
                    continue
                cand.append((p, nombre))
        else:  # grande: necesita cocina y comandero; Fudo Avanzado + mesas no los trae
            cand = [(p, n) for n, p in SUSTITUTOS["POS con comanda y cocina (negocio grande)"].items()
                    if "Premium" not in n or coms > 2000]
        cand.sort()
        techo[pf] = dict(
            comandas_mes=round(coms),
            sustituto_mas_barato=cand[0][1],
            mxn=cand[0][0],
            mediana_de_sustitutos=sorted(c[0] for c in cand)[len(cand) // 2],
        )
    salida["techo"] = techo
    # Regla: P = max(3 × piso, min(K × sustituto, sustituto)), redondeo a x49
    prop = {}
    for pf, t in techo.items():
        raw = K * t["mxn"]
        redondo = int(raw // 50 * 50 - 1) if raw >= 100 else round(raw)
        prop[pf] = dict(
            k_por_sustituto=round(raw),
            propuesta_redondeada=redondo,
            tres_veces_el_piso=round(3 * piso(pf, redondo)),
            margen_pct=round(100 * (1 - piso(pf, redondo) / redondo)),
        )
    salida["regla_propuesta"] = prop
    # Evaluación de 349, 2,167 (=500 por semana × 52 / 12), 2,000 y 799 contra cada perfil
    cand = {
        "349": 349,
        "549": 549,
        "799": 799,
        "2000": 2000,
        "500_por_semana": round(500 * 52 / 12),
    }
    ev = {}
    for nombre, p in cand.items():
        ev[nombre] = {}
        for pf in COSTO_VAR:
            ing = VISITAS_MES[pf] * PPM[pf] * GASTO_PERSONA[pf]
            ev[nombre][pf] = dict(
                veces_el_piso=round(p / piso(pf, p), 1),
                pct_del_sustituto=round(100 * p / techo[pf]["mxn"]),
                pct_del_ingreso_supuesto=round(100 * p * (1 + IVA) / ing, 2),
                ingreso_supuesto_mes=round(ing),
            )
    salida["evaluacion"] = ev
    # Ingreso con 20 visitas por día (micro de 0-5 personas) [supuesto]
    micro = 20 * 30 * 2.3 * 100
    salida["micro_20_visitas_dia"] = dict(
        ingreso_mes=round(micro),
        pct_349_con_iva=round(100 * 349 * 1.16 / micro, 2),
        pct_2167_con_iva=round(100 * 2167 * 1.16 / micro, 2),
    )
    json.dump(
        salida,
        open(f"{AQUI}/2026-11-14-corredor-y-planes-datos.json", "w"),
        ensure_ascii=False,
        indent=1,
    )
    print(json.dumps(salida, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
