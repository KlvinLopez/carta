"""Consulta el Sistema Automatizado de Información Censal (SAIC) de INEGI, Censos Económicos 2024 (año de referencia 2023).
API pública que usa la propia página https://www.inegi.org.mx/app/saic/default.html (una consulta, no descarga masiva).
Salida: 2026-11-14-lo-que-paga-un-restaurante-datos.json. Sólo biblioteca estándar; `python3 -I`."""
import json
import os
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
URL = "https://www.inegi.org.mx/app/api/saic/consulta/tabla/6/"
VARS = ["UE", "H001A", "H001D", "H010A", "J000A", "K000A", "K050A", "K810A", "K820A", "K060A", "K620A", "K090A", "M000A", "A111A", "A131A", "A700A", "A800A"]
ACT = {"722511": "Restaurantes a la carta o de comida corrida", "722412": "Bares, cantinas y similares", "7225": "Preparación de alimentos y bebidas (rama)"}


def consulta(acteco, estratos):
    cuerpo = {"anios": ["2023"], "ageos": ["00"], "actecos": [acteco], "stratums": estratos,
              "varcens": [{"nom": v, "pos": i} for i, v in enumerate(VARS)], "indicators": [], "calcs": [],
              "total": False, "orden": "1", "desc": True, "page": 0, "reg": 50}
    req = urllib.request.Request(URL, data=json.dumps(cuerpo).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


salida = {"fuente": "INEGI, Censos Económicos 2024 (datos de 2023), SAIC", "url": "https://www.inegi.org.mx/app/saic/default.html", "consulta": "2026-11-14", "variables": VARS, "resultados": {}}
for k in ACT:
    salida["resultados"][k] = consulta(k, [0, 1, 2, 3, 4])
json.dump(salida, open(f"{AQUI}/2026-11-14-lo-que-paga-un-restaurante-datos.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(salida["resultados"]["722511"], ensure_ascii=False)[:2500])
