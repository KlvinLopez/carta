"""Reparto de las 500 plazas de la muestra por zona metropolitana (apoya docs/research/2026-11-13-muestra-500-cartas.md §3).

Sólo biblioteca estándar:  python3 docs/research/2026-11-13-muestra-500-reparto.py

Peso de cada zona = gasto trimestral por persona en «Alimentos y bebidas consumidas fuera del hogar» de la entidad
(ENIGH 2024, INEGI: gasto por hogar ÷ personas por hogar) × población de la zona metropolitana (Censo 2020, tal como la
publican SEDATU, CONAPO e INEGI en «Metrópolis de México 2020»). Regla: mínimo 15 y máximo 125 plazas (25 % de 500),
repartidas por iteración (se fija en el tope lo que lo rebasa y luego en el mínimo lo que queda por debajo, recalculando
con el resto) y redondeo por mayor residuo.

Fuentes: ENIGH 2024, presentación de resultados por entidad
https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados_<sufijo>.pdf
(sufijo = cdmx, mex, jal, nl, pue, qro, yuc, gto, bc, son, chih, slp, qroo, oax, mich, ver, ags); nacional (sin sufijo):
3,896 pesos por hogar al trimestre en alimentos y bebidas fuera del hogar y 3.35 personas por hogar en 2024.
NOTA: el sufijo «tab» es Tabasco, no el nacional.
Población: https://www.gob.mx/cms/uploads/sedatu/MM2020_06022024.pdf (cuadros de población por zona, 2020).
"""

from __future__ import annotations

N = 500
MINIMO = 15
TOPE = 125

# zona: (entidad usada para el gasto, gasto por hogar 2024, personas por hogar 2024, población 2020)
ZONAS: dict[str, tuple[str, int, float, int]] = {
    "Valle de México": ("Ciudad de México", 7915, 3.03, 21_436_911),
    "Guadalajara": ("Jalisco", 5267, 3.27, 5_110_617),
    "Monterrey": ("Nuevo León", 3828, 3.30, 5_322_117),
    "Puebla-Tlaxcala": ("Puebla", 3088, 3.51, 2_776_893),
    "Toluca": ("México", 4398, 3.48, 2_353_924),
    "Tijuana": ("Baja California", 5790, 3.17, 2_049_413),
    "León": ("Guanajuato", 2870, 3.54, 1_935_928),
    "Querétaro": ("Querétaro", 6051, 3.34, 1_530_820),
    "Mérida": ("Yucatán", 3845, 3.32, 1_324_771),
    "San Luis Potosí": ("San Luis Potosí", 3035, 3.37, 1_243_980),
    "Aguascalientes": ("Aguascalientes", 4463, 3.44, 1_140_916),
    "Morelia": ("Michoacán", 4297, 3.42, 988_704),
    "Chihuahua": ("Chihuahua", 3460, 3.18, 988_065),
    "Cancún": ("Quintana Roo", 4567, 3.22, 934_189),
    "Veracruz": ("Veracruz", 2209, 3.22, 882_011),
    "Hermosillo": ("Sonora", 3556, 3.22, 936_263),
    "Oaxaca": ("Oaxaca", 2212, 3.52, 744_912),
}


def pesos() -> dict[str, float]:
    return {z: (gasto / personas) * pob for z, (_, gasto, personas, pob) in ZONAS.items()}


def repartir(
    pesos_: dict[str, float], total: int = N, minimo: int = MINIMO, tope: int = TOPE
) -> dict[str, int]:
    fijos: dict[str, int] = {}
    libres = set(pesos_)
    while libres:
        resto = total - sum(fijos.values())
        suma = sum(pesos_[z] for z in libres)
        parte = {z: resto * pesos_[z] / suma for z in libres}
        arriba = [z for z in libres if parte[z] > tope]
        if arriba:
            for z in arriba:
                fijos[z] = tope
                libres.discard(z)
            continue
        abajo = [z for z in libres if parte[z] < minimo]
        if abajo:
            for z in abajo:
                fijos[z] = minimo
                libres.discard(z)
            continue
        break
    exacto = (
        {**{z: float(v) for z, v in fijos.items()}, **{z: parte[z] for z in libres}}
        if libres
        else {z: float(v) for z, v in fijos.items()}
    )
    entero = {z: int(v) for z, v in exacto.items()}
    faltan = total - sum(entero.values())
    # mayor residuo, sólo entre las zonas no fijadas en el tope ni en el mínimo
    candidatas = sorted(
        (z for z in exacto if z not in fijos), key=lambda z: -(exacto[z] - entero[z])
    )
    for z in candidatas[:faltan]:
        entero[z] += 1
    return entero


def main() -> None:
    p = pesos()
    r = repartir(p)
    suma_p = sum(p.values())
    print(
        "| Zona | Población 2020 | Entidad del gasto | Gasto por persona (pesos al trimestre) | Peso | Plazas |"
    )
    print("|---|---|---|---|---|---|")
    for z in sorted(r, key=lambda z: -r[z]):
        ent, gasto, personas, pob = ZONAS[z]
        print(
            f"| {z} | {pob:,} | {ent} | {gasto / personas:,.0f} | {100 * p[z] / suma_p:.1f} % | {r[z]} |"
        )
    print(f"| **Total** | | | | 100 % | **{sum(r.values())}** |")
    assert sum(r.values()) == N


if __name__ == "__main__":
    main()
