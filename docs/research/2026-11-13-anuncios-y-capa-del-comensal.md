# Anuncios, capa del comensal y escaleras de capacidad y conversión

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/anuncios-y-capa-del-comensal` · **Estado:** investigación y modelo para decidir. **No toca** `app/`, `frontend/src/`, `migrations/` ni documentos de plan (salvo una fila en [`04 §11`](../plan/04_Fases_y_Tareas.md)). Cifras de fuentes: [`2026-11-13-anuncios-y-capa-del-comensal-datos.csv`](2026-11-13-anuncios-y-capa-del-comensal-datos.csv). Cálculo: [`2026-11-13-anuncios-y-capa-del-comensal-modelo.py`](2026-11-13-anuncios-y-capa-del-comensal-modelo.py) (reutiliza el simulador de uso, misma semilla; `python3 docs/research/2026-11-13-anuncios-y-capa-del-comensal-modelo.py`, ≈ 10 s).

**Alcance, dicho en claro.** La v1 **no tiene** cuenta ni historial del comensal, ni Carta+, ni anuncios, ni cobro ([`CLAUDE.md`](../../CLAUDE.md) «Qué NO construir» y regla dura 10: sin datos personales del comensal en el servidor). Lo que Calvin describió el 13 de noviembre es la **visión del negocio**: aquí se **modela**, no se construye. Qué habría que cambiar el día que se construya está en §3.6, y lo que exige la ley, en §3.7.

**Marcas de cada cifra.** **[fuente externa]** = página leída el 13 de noviembre de 2026, con enlace (en el CSV). **[documento]** = lo dice un documento del repositorio. **[dato de Calvin]** = lo dijo él. **[medida]** = medida en una sesión. **[supuesta]** = juicio mío; va a la lista de §7 con la forma de conseguirla. **[derivada]** = aritmética mía sobre las anteriores. **Tipo de cambio:** 18.6188 pesos por dólar (FIX de Banxico, 12 de noviembre) **[documento]**. **IVA:** 16 % **[documento]**.

**Cómo leer las fuentes.** Varias lecturas las hizo un resumidor automático de páginas, no yo en el HTML crudo; donde cito entre comillas es lo que devolvió. La ley la leí yo en el PDF oficial. Lo que no abrió, se dice.

---

## 0. Para Calvin

**¿Con anuncios y sin nadie de paga se sostiene?** **Sí para la infraestructura, no para tu ingreso, y con una tarifa que hoy no tiene fuente fuerte.**
- La tarifa de anuncios no personalizados en México **no está publicada por nadie que pude leer**. Armé un rango con lo que sí tiene fuente: la calculadora de AdSense (2.62 USD por mil vistas, categoría comida, región Américas, de septiembre), un multiplicador de país de un blog de proveedor (México = 0.2 a 0.4 veces EE. UU., fiabilidad baja) y el estudio de Google de 2019 (sin personalizar se pierde 52 % en promedio, 64 % en la mediana). Sale **0.19 / 0.75 / 1.97 USD por mil visitas** (bajo / medio / alto) = **3.5 / 14 / 37 pesos** por mil visitas **[derivada]**.
- Un restaurante gratuito típico tiene ≈ **2,050 visitas con la app al mes** **[medida en el simulador]**. Con esa tarifa deja **7 / 29 / 75 pesos al mes** por restaurante. Un restaurante de paga a 349 deja 329 pesos netos: **uno de paga vale lo que 11 gratuitos con anuncios en el caso medio.**
- **Se paga la infraestructura de hoy** (≈ 10.2 USD al mes, 190 pesos: Railway 8.1 con la memoria deducida de tu factura más 2.1 del dominio; 11.6 con el extremo alto del comparativo) **desde 3 / 8 / 35 restaurantes** gratuitos típicos (alto / medio / bajo) con la forma de hoy; con eventos, 3 / 7 / 29. Son **6,200 a 72,000 visitas con la app al mes**.
- **Tu meta de «10,000 usuarios»** (leída como 10,000 visitas al mes) son **≈ 5 restaurantes típicos** y dejan 1.9 / 7.5 / 19.7 USD: cubre lo fijo sólo en el caso alto. **Tu meta de «70 % de la capacidad»** son **103 gratuitos** (hoy) o **209** (con eventos): dejan 40 / 159 / 415 USD (hoy) contra ≈ 20 USD de costo, **cubre en los tres casos**.
- **No cubre tu sueldo.** Para que los anuncios dejen **10,000 pesos al mes netos** hacen falta **≈ 365 gratuitos (eventos, caso medio)**, ≈ 137 en el alto y ≈ 1,544 en el bajo; con la forma de hoy el bajo ni cabe (el tope es 504).
- **Tres cosas pueden tumbarlo antes de la tarifa:** (1) que **AdSense no apruebe** una carta detrás de un código de mesa casi sin texto («contenido de calidad, original»; no pude confirmar si está disponible en México); (2) que abrir la política de seguridad (`script-src 'self'`) a un tercero obligue a rediseñar; (3) un anuncio junto a los botones de la orden puede dar **aviso de violación por clics accidentales** (política de AdSense).

**La escalera de capacidad** (gratuitos típicos que caben; el muro que manda; costo de Railway al mes):

| Escalón | Gratuitos | Muro | USD/mes |
|---|---|---|---|
| Hoy: sondeo, 2 procesos, Hobby | **148** | procesador | 20 |
| Con eventos, 2 procesos, Hobby | **299** | disco de 5 GB | 12 |
| Con eventos, 2 procesos, Pro | **1,064** | procesador | 30 |
| Con eventos, 4 procesos, Pro | **1,896** | procesador | 44 |
| Con eventos, 8 procesos, Pro | **2,116** | **10,000 conexiones abiertas de Railway** | 54 |
| Réplicas (2 o 4 veces 8 procesos) | **2,116** (no suben) | el mismo muro | 66 / 92 |

Los de paga típicos que caben son **17 → 17 → 450 → 691 → 687** (el disco de 5 GB los frena en Hobby porque guardan 12 meses). **Un restaurante de paga pesa 2.7 gratuitos con la forma de hoy y 2.3 con eventos** en procesador, y 17.6 en disco mientras sigas en Hobby.

**La escalera de conversión.** Por cada restaurante de paga que entra a 349 (neto 329 pesos tras la comisión del cobro):
- **En dinero**: el primero cubre lo fijo y **76 gratuitos más** con la forma de hoy (**282** con eventos); cada uno siguiente cubre ≈ **214** (≈ **1,344** con eventos) en costo variable. A 249 son 151 / 953 y a 449 son 277 / 1,735.
- **En capacidad entra con signo contrario**: cada restaurante de paga **ocupa el lugar de 2.4 a 2.7 gratuitos**, así que los de paga **no agrandan el cupo; pagan el escalón siguiente**. Sin cambiar de escalón, 10 de paga reducen el cupo de 504 a 477 (8 procesos, forma de hoy).
- **Por cada 100 comensales de 29 pesos**: entran **2,031 pesos al mes** (109 USD; 2,431 si los 29 son antes de IVA) después de comisión e IVA, **suficiente para toda la infraestructura hasta el tope de cada escalón**. Entre IVA y comisión (Stripe: 3.6 % + 3 pesos, más IVA) se va **30 % de los 29 pesos** (la comisión sola, 16 %); el cobro anual la baja a ≈ 5 %. **Un restaurante de paga equivale a 16 comensales de paga.** Y **un comensal de paga vale 700 veces lo que dejan sus anuncios** (0.03 pesos al mes con 2 visitas).

**Lo que falta saber** (§7): la tarifa real (una prueba pequeña de AdSense, 0 USD), si AdSense aprueba el sitio, cuántas impresiones caben por visita sin estorbar, cuántas visitas hay por persona, y si los 29 pesos llevan IVA.

**Decisiones que te tocan** (§7.2): (1) ¿pedimos ya la aprobación de AdSense con una página pública, sin tocar el producto?; (2) ¿los 29 pesos incluyen IVA?; (3) ¿«IA personalizada» va en el gratuito registrado (tú) o en Carta+ (prototipo)?; (4) ¿se queda «sin anuncios» como el beneficio del pago, sabiendo que no está en el prototipo?; (5) ¿abrimos ADR para la regla 10?

---

## 1. De dónde salen los datos de anuncios

### 1.1 Lo que se pudo leer y lo que no

| Fuente | Qué da | Fiabilidad | Leída hoy |
|---|---|---|---|
| **Calculadora de AdSense** ([adsense.google.com/start](https://adsense.google.com/start/)) | Pide categoría de contenido, región del tráfico y 50,000 a 10,000,000 de páginas vistas al mes; muestra «ganancias anuales potenciales» | Primaria | **Abre, pero el resultado se calcula con JavaScript y no se pudo leer.** Hay que correrla a mano en un navegador (§7). La cifra de **2.62 USD por mil vistas** (comida y bebida, **Américas**) es del 19 de septiembre **[documento: `modelo-de-negocio-y-pagos` §2.2]**; un blog da 1,500 USD al año por 50,000 vistas al mes en Américas = 2.50 por mil (resumen de búsqueda, página no abierta) |
| **Reparto de AdSense** ([180195](https://support.google.com/adsense/answer/180195)) | El sitio se queda con ≈ 68 % de lo que gasta el anunciante vía Google Ads (80 % tras la comisión de la plataforma), igual en todos los países | Primaria | Sí |
| **Anuncios no personalizados** ([9007336](https://support.google.com/adsense/answer/9007336), [15450188](https://support.google.com/adsense/answer/15450188), [7670312](https://support.google.com/adsense/answer/7670312)) | Qué son: no usan comportamiento pasado; el informe de AdSense permite comparar personalizados y no personalizados en ingresos; se pueden activar por página | Primaria | Sí. **Ninguna da un porcentaje de pérdida** |
| **Google, «Effect of disabling third-party cookies on publisher revenue»** (27-ago-2019, [PDF](https://services.google.com/fh/files/misc/disabling_third-party_cookies_publisher_revenue.pdf)) | Experimento aleatorio de 96 días en los 500 mayores publicadores de Ad Manager: sin cookies, **−52 % en promedio, −64 % en la mediana**; hay una cola de pérdidas de 10 % a más de 75 %; cita otros estudios: −52 % (Johnson), −37.5 % a −66 % (Beales), **−4 %** (Marotta, un solo publicador) | Primaria (de Google) | **Sí, íntegro** (lo extraje a texto). **Es sin cookies en programática de Ad Manager, no AdSense NPA**: NPA conserva contexto de la página, así que es una **cota alta** de la pérdida |
| **WeForAds, «Ad Revenue Benchmarks 2026»** (abr 2026) | Multiplicador aproximado de ingreso por nivel de país: «Brazil/Mexico: 0.2–0.4x» frente a EE. UU./Canadá = 1.0 | **Baja** (blog de proveedor, sin metodología) | Sí. Los dólares para México que aparecen en la lectura son cálculo del resumidor, **no los uso** |
| **Guía de CPM por país** ([adscalculator.xyz](https://adscalculator.xyz/blog/global-programmatic-display-cpm-benchmark-by-country-2025/)) | CPM de **compra** en México 0.60 a 1.50 USD, citando vagamente a eMarketer e IAB México | **Débil** | Leída por el comparativo del 13 de nov; **sólo la uso como contraste** |
| **Estudio Valor Total Media 2024** (AVE, CiM, IAB México) | Publicidad digital en México 2024: **81,720 millones de pesos**, 58.2 % de 140,306 millones (+4 %); sin CPM ni formato | Media (por prensa: [marketing4ecommerce](https://marketing4ecommerce.mx/inversion-publicitaria-en-mexico/), [Expansión](https://expansion.mx/mercadotecnia/2025/11/05/publicidad-mexico-rompe-tendencia-economica-crece)) | **El PDF oficial de cim.mx dio 404.** No hay edición con datos de 2025 |
| **DataReportal «Digital 2026: Mexico»** | Alcance publicitario por plataforma (Facebook 93.5 M, YouTube 85.0 M…) | Media | Sí; **sin CPM** |
| **Raptive** (ago 2025) | Sólo variaciones porcentuales de RPM para Reino Unido y GDPR | — | Sí; nada de México |
| **Meta Audience Network** ([Marketing Dive](https://www.marketingdive.com/news/facebook-will-shutter-audience-network-for-mobile-sites/571807/), [AdExchanger](https://www.adexchanger.com/platforms/facebook-is-killing-off-its-web-supply-in-audience-network-and-dont-be-surprised-if-it-all-shuts-down/)) | **Dejó de servir en web móvil el 11 de abril de 2020**; hoy su documentación oficial habla sólo de Android, iOS y Unity | Prensa + oficial | Sí. **Meta no es opción para una PWA**; no encontré ningún programa de Meta para publicadores web en 2026 |
| **AdMob** ([7356219](https://support.google.com/admob/answer/7356219)) | Ayuda general | Primaria | Sí. **No publica eCPM por país**, y es de apps nativas (que no sirva a una PWA lo vi sólo en fuentes secundarias) |
| **Otras redes** (Carbon Ads, EthicalAds, Adsterra) | Carbon: «350+ sitios de tecnología escogidos a mano»; EthicalAds: «sitios para desarrolladores con 50,000+ vistas», contextual y sin rastreo; Adsterra: sin mínimo de tráfico y 5 USD de pago mínimo, pero inventario con mala fama | Oficiales (marketing) | Sí. **Ninguna encaja con un menú de restaurante** salvo Adsterra, que no recomiendo (anuncios emergentes) |
| **Google Ads: Planificador de palabras clave** ([7337243](https://support.google.com/google-ads/answer/7337243)) | Muestra qué paga un anunciante (CPC de búsqueda); pide una cuenta de Google Ads con la configuración completa, **incluida la facturación**; no pide gasto | Primaria | Sí. **El Planificador de alcance (CPM de pantalla por país) no lo pude leer**: necesita la cuenta |
| **Uber Advertising** (incluye Uber Eats) | Más de 1,500 millones de USD de ingreso anual (Q1 2025) | Primaria | Sí. **Es el total de la plataforma, no por usuario ni visita**: no hay ARPU público de anuncios en apps de restaurantes |
| **OlaClick, menús QR gratuitos** | «Your digital menu is free and without commissions!»; **ninguna página leída menciona anuncios** | Primaria | Sí. El plan gratuito con anuncios que citaba septiembre no se pudo reconfirmar |
| **EMARKETER, WordStream** | CPM/CPC por país | — | **403, no abrieron** |

**Dónde está el hueco, sin maquillar:** *ninguna fuente primaria da el ingreso por mil impresiones para sitios en México.* La tarifa de §2 es una **cadena de tres eslabones**, dos de ellos de fiabilidad baja o parcial. Por eso el rango es amplio y por eso §1.3 propone medirlo.

### 1.2 Lo que paga el anunciante, y la herramienta oficial
- Lo que **paga el anunciante** aparece en **Google Ads**: el *Planificador de palabras clave* (CPC de búsqueda por ubicación) y el *Planificador de alcance* (CPM de pantalla y video). Requisito: una **cuenta de Google Ads con facturación configurada**; no hace falta gastar. **No lo leí** (no tengo la cuenta); es el dato por conseguir más barato (§7).
- Ojo: **CPC de búsqueda no es RPM de pantalla.** Y lo que paga el anunciante no es lo que recibe el sitio: AdSense deja ≈ 68 %.

### 1.3 Cómo medirlo de verdad: una prueba pequeña con anuncios no personalizados
| Paso | Qué es | Costo | Requisito |
|---|---|---|---|
| 1 | Correr **a mano la calculadora de AdSense** (categoría comida y bebida; regiones América Latina y Américas; 50,000 vistas) y guardar la captura | 0 | Un navegador; 5 minutos |
| 2 | **Pedir la aprobación del sitio** con **una página pública** del dominio (p. ej. la página de qué es Carta y un menú público de muestra), **sin tocar el producto** | 0 | Cuenta de Google, mayor de 18 años, acceso al HTML; la activación tarda «unos días» a «dos a cuatro semanas»; desde **junio de 2026 puede pedir verificar identidad**; ahí se aprende si aprueban un sitio con poco texto |
| 3 | **Un solo bloque** en la **pantalla de espera de la orden** (P04b del prototipo) de **un restaurante del piloto, con aviso al dueño**, con el interruptor de página `requestNonPersonalizedAds=1`, detrás de una bandera | 0 de dinero; trabajo de la Fase 3+ y el ADR de §3.6 | Abrir la CSP sólo para esa ruta; medir 2 a 4 semanas |
| 4 | Medir en el informe de AdSense: **impresiones, ingresos estimados, RPM de página y clics**, y compararlos con la **tarifa baja / media / alta de §2** | 0 | Con 3 restaurantes típicos, 2 impresiones por visita: ≈ 12,000 impresiones al mes |
| 5 | **Control:** el mismo restaurante sin el bloque, para ver si bajan las órdenes o suben los abandonos (la analítica de `scan` ya existe) | 0 | — |

- **El dinero no saldrá:** el pago empieza en **Mex$1,200 de ganancias** (tabla de umbrales de AdSense, **fuente externa**), que con esta prueba no se alcanza; lo que se mide son las **ganancias estimadas** del informe.
- **Lo que la prueba no contesta:** la tarifa a 1,000 restaurantes (el relleno cambia con el volumen) ni el efecto de la marca en el dueño.
- Para el efecto de personalizar, el informe de AdSense trae el desglose «restricciones de servicio» que **compara personalizados y no personalizados**; sería la primera cifra propia contra el −52 % de Google.

---

## 2. Modelo de ingresos por anuncios

### 2.1 La fórmula y los tres rangos
Ingreso por mil visitas = **impresiones por visita × (RPM de Américas × multiplicador de país × (1 − pérdida por no personalizar))**. Una «visita» es una entrada de un comensal con la app, como la cuenta `scan`.

| | Bajo | Medio | Alto |
|---|---|---|---|
| RPM de Américas, comida y bebida, USD por mil vistas **[documento]** | 2.62 | 2.62 | 2.62 |
| Multiplicador de México **[fuente externa débil; medio = punto medio supuesto]** | 0.2 | 0.3 | 0.4 |
| Pérdida por no personalizar **[fuente externa: Google 2019; mediana / promedio / cota baja de la literatura]** | 64 % | 52 % | 37.5 % |
| USD por mil vistas, **no personalizado** | 0.189 | 0.377 | 0.655 |
| Impresiones por visita **[supuesta]** | 1 | 2 | 3 |
| **USD por mil visitas, no personalizado** | **0.19** | **0.75** | **1.97** |
| **Pesos por mil visitas, no personalizado** | **3.5** | **14.0** | **36.6** |
| *Contraste:* USD por mil visitas, **personalizado** (sin la pérdida) | 0.52 | 1.57 | 3.14 |
| *Contraste:* pesos por mil visitas, personalizado | 9.8 | 29.3 | 58.5 |

- **Contraste con la guía débil de CPM de compra** (0.60 a 1.50 USD × 0.68 × 80 % de relleno = 0.33 a 0.82 USD por mil impresiones): mi rango por impresión es 0.19 / 0.38 / 0.66 **[derivada]**. Quedan en el mismo orden de magnitud, que es lo más que dos fuentes débiles pueden decir juntas.
- **El comparativo del 13 de nov** daba 0.20 / 1.09 / 3.06 USD por mil visitas con otra cadena (CPM de compra); la de hoy es **similar en el bajo y ≈ 30 % más baja en el medio y el alto**, porque parte de la calculadora de AdSense y aplica la pérdida por no personalizar (anuncios «genéricos, no personalizados», como pidió Calvin). Es la razón por la que cambia la sección 8 del informe.
- **El efecto de no personalizar es la cifra con mayor incertidumbre:** 4 % (Marotta) a 66 % (Beales); el rango «bajo / medio / alto» sólo usa 64 / 52 / 37.5 %.

### 2.2 Dónde cabrían las impresiones, frente al prototipo
Supuestos de colocación, **sin recarga automática** y **ninguno donde se arma la orden**:

| Pantalla del prototipo | ¿Cabe un anuncio? | Por qué |
|---|---|---|
| **P17a / P18a–c** escaneo y bienvenida (`comensal-onboarding.jsx`) | No | Es el primer contacto; el prototipo dice «Sin descarga. Sin registro. Inmediato.» |
| **P03 Menú completo** (`FullMenu`, `comensal-flow.jsx:7`) | Sí, 1: **al fondo de la lista**, después de la última categoría | No tapa platillos ni el botón de agregar |
| **P02 Detalle de platillo** (`DishDetail`, `comensal-core.jsx:296`) | Sí, 1, **debajo** del botón de agregar, con distancia | Riesgo de clic accidental junto al botón principal |
| **P04 Sesión grupal** (`GroupSession`, `comensal-flow.jsx:233`) | **No** | Es donde se arma la orden: los botones están por todos lados |
| **P04b Preparación de la orden** (`OrderTracking`, `comensal-flow.jsx:425`) | **Sí: la mejor**, 1 | El comensal espera con el teléfono en la mano y no está tocando botones de pedido |
| **P05 Checkout y propina** (pagos: **fuera de la v1**) | No | Pagos no existen en la v1 |
| **P22 Perfil** (`comensal-extra.jsx`) | No | Sólo para quien se registró |

- Bajo = 1 (sólo P04b). Medio = 2 (P04b y fondo de P03). Alto = 3 (más P02).
- **El prototipo no dibuja ni un anuncio**: la búsqueda de «anuncio / publicidad» en `prototipo/js/comensal-*.jsx`, `checkout-v2.jsx` y `shared.jsx` no encuentra nada. Estas ubicaciones son **mías**, no del diseño; pasarían por `/diseno-visual` («Digital Sommelier», sin lugar para un anuncio hoy).

### 2.3 Cuánto deja, por restaurante y por escalón
Visitas con la app por restaurante gratuito típico: **2,050 al mes** (113.9 comensales al día × 30 × 0.6 que abre la app) y 3,429 por uno de paga **[medida en el simulador, `USO_APP` = 0.6 es supuesto]**.

| | Bajo | Medio | Alto |
|---|---|---|---|
| **Pesos al mes por restaurante gratuito**, no personalizado | **7** | **29** | **75** |
| Pesos al mes por restaurante gratuito, personalizado (contraste) | 20 | 60 | 120 |

**Por escalón** (anuncios no personalizados, gratuitos típicos al tope del escalón; USD al mes):

| Escalón | Gratuitos | Visitas con la app/mes | Bajo | Medio | Alto | Costo Railway |
|---|---|---|---|---|---|---|
| Hoy | 148 | 303,000 | 57 | 229 | 596 | 20 |
| Eventos, Hobby | 299 | 613,000 | 116 | 463 | 1,205 | 12 |
| Eventos, Pro | 1,064 | 2.18 M | 412 | 1,646 | 4,287 | 30 |
| Eventos, 4 procesos | 1,896 | 3.89 M | 733 | 2,934 | 7,640 | 44 |
| Eventos, 8 procesos | 2,116 | 4.34 M | 819 | 3,274 | 8,526 | 54 |

Sobre el costo de Railway sólo, **los anuncios pagan sobradamente cada escalón si la tarifa es la del rango**. Lo que no pagan es todo lo demás (§0 y §6).

---

## 3. Capa del comensal (visión)

### 3.1 Qué dice el prototipo y qué dijo Calvin
Calvin: **(a)** sin registro, el menú es gratis; **(b)** registrado gratis: guarda su historial y recibe recomendaciones más inteligentes, y por registrarse se le puede mostrar publicidad; **(c)** de paga, 1 peso al día (29 al mes), **sin publicidad**.

El prototipo ([`comensal-onboarding.jsx`](../../prototipo/js/comensal-onboarding.jsx), pantallas P17a a P18c, y [`comensal-extra.jsx`](../../prototipo/js/comensal-extra.jsx), P22):
- **P18c «Carta+ · Plan Premium»** (`OnboardingPremium`): «**$1 MXN / día** (Cargo mensual de **$29 MXN** · **1 mes gratis**)»; beneficios: **IA personalizada**, eventos exclusivos, **realidad aumentada**, reservaciones prioritarias y «Carta Charity». Botones «Probar 1 mes gratis» y «Finalizar».
- **P18b Preferencias:** dieta (vegetariano, vegano, pescetariano), nivel de picante e ingredientes favoritos. **P22 Perfil del comensal:** nombre, correo, «miembro desde», preferencias, **historial de platillos con calificación**, «Carta+ · 24 días de prueba», «Invita y gana $50», «Cerrar sesión».

**Dónde coinciden y dónde no (para que decidas):**

| Tema | Calvin | Prototipo |
|---|---|---|
| Precio | 29 al mes | **$29 al mes = $1 al día** (coincide) |
| Prueba | — | **1 mes gratis** (no la mencionó) |
| Historial y recomendaciones | **gratis al registrarse** | Historial en el perfil (no se ve que cueste); **«IA personalizada» está dentro de Carta+ (de paga)** |
| Publicidad | el registrado la ve; el de paga **no** | **No hay anuncios ni «sin anuncios» en ninguna pantalla** |
| Alcance | — | Incluye AR, pagos y calificaciones (**fuera de la v1**: ADR-011, «Qué NO construir») |

### 3.2 Tres niveles
| Nivel | Qué ve | Qué guarda Carta en el servidor | Ingreso |
|---|---|---|---|
| **Anónimo** | Menú, orden en grupo (la v1 de hoy); anuncios no personalizados | Lo de hoy (sesión, comanda); nada del comensal | Anuncios: 3.5 a 37 pesos por mil visitas (§2) |
| **Registrado gratis** | Lo anterior + historial + recomendaciones; anuncios no personalizados | **Cuenta (correo), historial, preferencias** → datos personales | Anuncios (igual que el anónimo; la cuenta no sube la tarifa si no se personaliza) |
| **De paga, 29 al mes** | Lo anterior sin anuncios | Lo anterior + datos de cobro (los guarda el procesador de pagos) | 20.3 pesos netos (29 con IVA incluido) o 24.3 (si los 29 son antes de IVA) |

### 3.3 Lo que costaría en infraestructura guardar y recomendar (órdenes de magnitud)
- **Historial:** 12 KB por visita **[supuesta, ±2×: `KB_VISITA` del simulador]** × 2 visitas al mes por persona **[supuesta]** × 12 meses = **0.29 MB por registrado al año**; a 0.15 USD por GB-mes de volumen **[fuente externa: Railway]** son ≈ **0.00004 USD al mes** (0.0008 pesos) por registrado al cabo de un año. 100,000 registrados serían 29 GB al año ≈ 4 USD al mes. **Despreciable.**
- **Recomendaciones sin modelo de lenguaje** (consulta de «qué pidieron los que pidieron lo mismo»): una consulta SQL por visita, ≈ un sondeo de CPU (3.3 ms **[medida]**): despreciable.
- **Recomendaciones con un modelo de lenguaje:** 1,500 tokens de entrada y 200 de salida **[supuesta]** × tarifa de Opus 5.5 4 / 20 USD por millón **[fuente externa: platform.claude.com]** × 1.3 de reintentos **[documento]** = **0.013 USD = 0.24 pesos por recomendación.** **Un anuncio deja 0.014 pesos por visita** (caso medio): **recomendar con Opus cuesta 17 veces lo que esa visita deja en anuncios.** Con Haiku (40 a 50 veces menos **[documento: `mapa` §4.7]**) sería 0.005 pesos: cabe. **Conclusión: la «IA personalizada» del gratuito registrado sólo es viable con SQL o con un modelo chico, no con Opus.**
- **Capacidad:** el comensal registrado hace las mismas peticiones que el anónimo; lo que sube es una consulta de historial por visita. Sin medir: marcado en §7.

### 3.4 Cuánto deja un comensal de paga y cuántos restaurantes sostiene
Cobro de 29 pesos con tarjeta nacional de Stripe México: **3.6 % + 3.00 pesos**, «todas las comisiones excluyen el IVA» **[fuente externa: stripe.com/mx/pricing]**; IVA 16 % sobre la comisión **[supuesta: lo habitual; la página no lo dice]**.

| Los 29 pesos… | Neto por comensal al mes | Qué se va |
|---|---|---|
| **incluyen** IVA (25.00 sin IVA) | **20.31** | IVA 4.00 + comisión con IVA 4.69 = 8.69 (30 % de 29; la comisión sola, 16 %) |
| son **antes** de IVA (el comensal paga 33.64) | **24.31** | comisión con IVA 4.69 (16 % de 29) |
| Cobro **anual** de 348 (IVA incluido) | 282 al año = 23.5 al mes | comisión con IVA 18.0 (5.2 % del cobro: la cuota fija de 3 pesos pesa una sola vez) |

(La cuota fija de 3 pesos es lo que más pesa a 29 pesos. Mercado Pago, Conekta, OpenPay y Clip: **no abrieron**; sin cifras verificadas.)

- **100 comensales de paga** dejan **2,031 pesos al mes** (109 USD; 2,431 si son antes de IVA): **cubren toda la infraestructura hasta el tope de cada escalón** (504 gratuitos con la forma de hoy y 8 procesos; 2,116 con eventos), porque lo fijo cuesta 12 a 54 USD. En costo variable, **un comensal de paga cubre 13 gratuitos (forma de hoy) o 83 (eventos)**.
- **Un restaurante de paga a 349 equivale a 16.2 comensales de paga** (329 ÷ 20.3). **Y los anuncios de un restaurante gratuito (29 pesos al mes, caso medio) equivalen a 1.4 comensales de paga.** Es decir, *el pago del comensal rinde 700 veces lo que rindieron sus anuncios*: con 2 visitas al mes un comensal deja 0.03 pesos en anuncios y 20.3 en suscripción.

### 3.5 Qué tasas harían falta (supuestos marcados)
Personas distintas = visitas ÷ 2 visitas por persona al mes **[supuesta]**. Con **104 gratuitos** (≈ 70 % del tope de hoy): 106,600 personas; con **1,000** (con eventos): 1.03 millones. Pagan = personas × registro × pago.

| Para… | Con 104 gratuitos (hoy) | Con 1,000 gratuitos (eventos) |
|---|---|---|
| **Cubrir la infraestructura** (369 y 804 pesos al mes) | **18** pagadores = **0.017 %** de las personas | **40** pagadores = **0.004 %** |
| Dejar **10,000 pesos al mes** | **492** pagadores = 0.46 % | 492 = 0.05 % |

| Tasa de registro → de pago entre los registrados | 1 % | **2.18 %** | 5 % |
|---|---|---|---|
| 2 % se registra: pagadores (104 gratuitos) | 21 | 46 | 107 |
| 5 % se registra | 53 | 116 | 267 |
| 10 % se registra | 107 | 232 | 533 |

- La tasa de **2.18 %** es la **mediana de conversión de instalación a pago a 35 días de apps freemium con suscripción** (RevenueCat, 2025) **[fuente externa]**; **no es de menús ni de comensales anónimos** y sólo mide apps que ya venden suscripciones. Es un orden de magnitud, no un pronóstico.
- **Lectura:** *cubrir la infraestructura* con el pago del comensal pide una fracción minúscula (menos de 0.02 % de las personas); *llegar a 10,000 pesos* con 104 gratuitos pide ≈ 492 pagadores y con 5 % de registro y 2.18 % de pago salen 116 (2,360 pesos): se queda en la cuarta parte; haría falta 10 % y 5 % (533). **Con 1,000 gratuitos y 5 % / 2.18 %**: 1.03 M personas × 5 % × 2.18 % = **1,117 pagadores = 22,700 pesos al mes** **[derivada]**.
- **La tasa de registro (2 a 10 %) y la tasa de pago son supuestas**; no existe dato propio hasta que haya cuenta. Ver §7.

### 3.6 Qué habría que cambiar el día que se construya (reglas y documentos)
Nada de esto se toca ahora. La lista, con la fuente de cada cambio:

| Qué | Dónde está hoy | Qué habría que hacer |
|---|---|---|
| **Regla dura 10**: «Sin datos personales ni sensibles del comensal en el servidor. Los filtros de alérgenos viven en el teléfono» | [`CLAUDE.md`](../../CLAUDE.md) «Reglas duras» 10 | **ADR nuevo** (el propio archivo dice «No se negocian sin un ADR nuevo»): permitir cuenta (correo), historial y preferencias **no sensibles**; mantener las **alergias en el teléfono aunque haya cuenta** (§3.7) |
| **«Qué NO construir»**: «cuenta, perfil o historial del comensal; Carta+; analytics del restaurante» | [`CLAUDE.md`](../../CLAUDE.md) y [`01_Alcance_v1.md`](../plan/01_Alcance_v1.md) (cuenta del comensal y perfil alimentario → «v2»; Carta+ → «v3»; US-22 y US-23 retiradas) | Mover esas filas a una versión nueva; **Spec nueva** (`/especificar`) con criterios EARS; reabrir US-22 y US-23 |
| **Política de cabeceras de seguridad** | [`02_Arquitectura_v1.md` §12](../plan/02_Arquitectura_v1.md) y `app/core/cabeceras.py`: `default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' …`, sin `unsafe-inline`, sin nonces | Para cualquier red de anuncios habría que **abrir `script-src`, `frame-src`, `img-src` y `connect-src`** a orígenes de terceros **sólo en la ruta que muestra el anuncio**; mejor un **marco con `sandbox`** en una página aparte; la prueba `tests/unit/test_cabeceras.py` y la CSP de §12 tendrían que cambiar |
| **Datos sensibles del comensal** | 02 §12: «Ninguno en el servidor: los filtros de alérgenos viven en `localStorage`» | Se conserva |
| **Aviso de privacidad** | 02 §12 «Ley»: «aviso de privacidad revisado por abogado antes del primer restaurante» | Reescribirlo con cuenta, historial, transferencia a una red de anuncios y los derechos ARCO (§3.7) |
| **Registros** | Cloudflare y Caddy guardan IPs 30 días (02 §12) | Declarar también al proveedor de anuncios, que recibe IP y datos del navegador **sin pasar por Carta** |
| **Cobro** | La v1 «no cobra»; sin pagos | Procesador de pagos, comprobantes, cancelación, soporte; **no tocan a Carta los datos de tarjeta** si se usa un procesador (Stripe Billing), pero hay que escribir la política de cobro (§3.7) |

### 3.7 Lo que exige la ley mexicana de datos personales (con fuente)
**No es asesoría legal.** Leí el texto consolidado de la **[Ley Federal de Protección de Datos Personales en Posesión de los Particulares](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf)**: «Nueva Ley publicada en el Diario Oficial de la Federación el 20 de marzo de 2025», **texto vigente, última reforma DOF 14-11-2025** (la autoridad ya no es el INAI sino la **Secretaría Anticorrupción y Buen Gobierno**, art. 2, XV). Lo que dice y importa aquí:

| Artículo | Texto (corto) | Qué implica para Carta |
|---|---|---|
| **7** | El consentimiento puede ser expreso o tácito; es **tácito** cuando se puso a disposición el aviso de privacidad y la persona no manifiesta lo contrario; **«por regla general será válido el consentimiento tácito»**; los **datos financieros o patrimoniales requieren consentimiento expreso**; es revocable | Cuenta con correo: aviso de privacidad visible y tácito; **el cobro con tarjeta pide consentimiento expreso** (lo recoge el procesador de pagos, pero lo tiene que haber) |
| **8** y **2, VI** | Los **datos sensibles** (entre ellos **«estado de salud presente o futuro»**, lista enunciativa) requieren **«consentimiento expreso y por escrito»** (firma autógrafa, electrónica u otro mecanismo de autenticación); no se crean bases de sensibles sin justificarlas | **Las alergias son salud.** Guardarlas en el servidor las vuelve datos sensibles: por eso 02 §12 y la regla 10 las dejan en el teléfono. **Recomendación: que sigan en el teléfono aunque haya cuenta** |
| **16, II** | Si los datos se obtienen por medio electrónico, el aviso se da en su **modalidad simplificada** y se señala dónde está el integral | Aviso simplificado en el registro |
| **35** | Al **transferir** datos a terceros se les comunica el aviso y las finalidades, y el aviso lleva **«una cláusula en la que se indique si la persona titular acepta o no la transferencia»** | Un registro cuyos datos viajaran a la red de anuncios sería una transferencia. **Anuncios no personalizados + ningún dato del comensal en la petición** la evitan; es otra razón para no personalizar |
| **22 a 26, 31, 34** | Derechos de acceso, rectificación, cancelación y oposición (ARCO); respuesta en veinte días; gratuito | Pantalla y proceso para ejercerlos (borrar cuenta) |
| **59** | Multas de **100 a 160,000 UMA** y de **200 a 320,000 UMA** según la infracción | El valor de la UMA en pesos no está en la ley: **dato por conseguir (INEGI)** |

- **Cookies y publicidad:** en el texto **no aparece la palabra «cookie», «identificador» ni «publicidad»** (búsqueda de esas palabras en el PDF, sin resultados). Un despacho dice que «México carece de lineamientos específicos sobre cookies» ([ECIJA, 31-oct-2025](https://www.ecija.com/actualidad-insights/publicidad-digital-y-privacidad-lo-que-las-cookies-revelan-y-la-ley-aun-no-regula-del-todo/), **secundaria**). No encontré lineamientos de la autoridad ni de IAB México. **Dato por conseguir** (§7); un abogado debe decir si una red de anuncios en el teléfono del comensal requiere más que el aviso.
- **Menores:** la ley no tiene un artículo específico (búsqueda de «niñ» y «adolesc» en el PDF, sin resultados). **AdSense no permite publicidad personalizada para usuarios que se saben menores de 13** (política de AdSense, [10502938](https://support.google.com/adsense/answer/10502938)). Un comensal anónimo puede ser menor: otra razón para no personalizar.
- **Suscripción de 29 pesos:** la [Ley Federal de Protección al Consumidor](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf), **art. 76 Bis, fracciones VIII y IX** (adicionadas el 12-dic-2025), pide **informar** periodicidad, monto y fecha de los **cobros automáticos recurrentes**, **consentimiento expreso e informado**, **aviso de renovación con al menos cinco días naturales**, y poder **cancelar «de manera inmediata»**. Si hay que registrar el contrato ante PROFECO: **dato por conseguir**.
- **Impuestos del ingreso de AdSense:** una lectura secundaria de blogs dice que AdSense paga desde el exterior y que el ISR se declara en México; **sin respaldo oficial leído**. Dato por conseguir con contador.

---

## 4. Escalera de capacidad

**Cómo se calculó.** Mismo simulador de uso (semilla fija, 364 días, CPU a 70 % en la hora más cargada con 95 % de probabilidad, **[documento: `mapa` §0]**), mismos gratuitos típicos y de paga típicos; el nuevo script sólo cambia procesos, núcleos y plan. **Núcleos útiles:** 2 procesos = 2; **4 procesos = 3.6** (×1.8 **[documento: capacidad, palanca 1]**); **8 procesos = 6.6** (×3.3 **[documento: `planes` §6.1, no medido en Railway]**). Conexiones abiertas: **10,000 por dominio** **[fuente externa: Railway]**, una por teléfono con la pantalla encendida con eventos; frente p95 del simulador (4.7 por gratuito, 14 por uno de paga) **[medida en el simulador, supuesta la pantalla encendida]**. **Costo:** Railway Hobby (5 USD con 5 incluidos) o Pro (20 con 20 incluidos); PostgreSQL de 0.085 GB en Hobby y 0.5 GB en Pro (ilustrativo); más 2 entornos; sin dominio ni lecturas de PDF.

| Escalón | Qué cambia | Gratuitos típicos que caben | De paga típicos | Comensales al día (gratuitos) | Muro que manda | USD/mes (gratuitos) | Marca |
|---|---|---|---|---|---|---|---|
| **E0 · Hoy** | Sondeo de 3 s, 2 procesos, Hobby | **148** | **17** (disco; 55 por CPU) | 16,900 | procesador (gratuitos); **disco de 5 GB** (paga, 12 meses) | 20 | [documento: `mapa` §0] |
| **E1 · Con eventos** | Entrega por eventos (ADR-018, **aceptado el 13 de noviembre**; sustituye al ADR-004), 2 procesos, Hobby | **299** | 17 | 34,100 | **disco de 5 GB** (el procesador daría 1,064) | 12 | [documento + medida de eventos] |
| **E2 · Eventos y Pro** | Plan Pro (20 USD); disco hasta 1 TB | **1,064** | **450** | 121,000 | procesador | 30 | [supuesta: Pro no probado] |
| **E3 · 4 procesos** | `WORKERS=4`; pool 5+5 | **1,896** | 691 (CPU daría 812) | 216,000 | procesador / conexiones (paga) | 44 | [supuesta: ×1.8 sin medir] |
| **E4 · 8 procesos** | `WORKERS=8`; pool 3+2 | **2,116** | 687 | 241,000 | **10,000 conexiones abiertas** (el procesador daría 3,456) | 54 | [supuesta: ×3.3 sin medir] |
| **E5 · Réplicas** | 2 réplicas (16 procesos) o 4 (32), mismo dominio | **2,116** (el procesador subiría a 6,912 y 13,824, pero no se usa) | ≈ 687 | 241,000 | **el mismo muro de 10,000 conexiones** | 66 / 92 | [supuesta] |

**Sin eventos, sólo más procesos (forma de hoy):** 4 procesos = **272** gratuitos / 100 de paga (33 USD en Hobby, 42 en Pro); 8 procesos = **504** / 190 (el disco de Hobby frena a 299 gratuitos; en Pro 67 USD).

**Lo que hay que leer de la tabla:**
- **El primer cambio que más rinde es E1 (eventos):** 148 → 299 con **menos** costo (12 contra 20 USD), porque deja de gastarse CPU en preguntar. El muro pasa del procesador al disco.
- **E2 (Pro) cuesta 18 USD más** y multiplica por 3.6 el cupo; sin Pro no se pasa de ≈ 299.
- **E3 y E4** suman ≈ 1.6 USD por proceso (0.16 GB × 10 USD) y tienen dos pendientes: la memoria de cada proceso sube y hay que bajar el *pool* de conexiones a PostgreSQL (hoy 2 × 20 = 40; Railway permite ≈ 100 **[estimada, sin verificar]**).
- **El muro de 10,000 conexiones abiertas de Railway** llega en **≈ 2,100 gratuitos** o **≈ 690 de paga** (aquí sí sube, porque los de paga tienen más teléfonos al frente: 14 contra 4.7). **Réplicas no lo mueven**: el límite es por dominio. Pasarlo requiere **cambiar la entrega** (p. ej. pasar al sondeo por fase para el exceso, como modo degradado), **otro dominio para los eventos** o **otra plataforma**. **Nada de esto está medido ni diseñado.**
- **No medido y con ±2×:** el costo de procesador en Railway, cuántos núcleos entrega Hobby a un servicio, la pantalla encendida, y la memoria por conexión abierta con miles de teléfonos. La entrega por eventos ya está decidida (ADR-018); lo que falta es medirla en Railway. El panel del dueño y las vistas del personal también irán por eventos (decisión del 13 de noviembre): el simulador las cuenta con el respaldo de 60 s **[supuesta]**.

---

## 5. Escalera de conversión

### 5.1 Cuánto pesa un restaurante de paga
| | Forma de hoy | Con eventos |
|---|---|---|
| Procesador: gratuitos que desplaza un restaurante de paga | **2.69** (148 ÷ 55) | **2.36** (1,064 ÷ 450) |
| Disco en Hobby (12 meses de historial) | **17.6** (299 ÷ 17) | 17.6 |
| Costo variable al mes | 0.237 USD (4.4 pesos) contra 0.081 (1.5 pesos) del gratuito | 0.068 USD (1.3 pesos) contra 0.013 (0.24 pesos) |

El de paga «típico» es 50 % mediano, 25 % grande y 25 % formal **[documento: `planes` §6.2]**; uno pequeño pesaría menos.

### 5.2 Por cada restaurante de paga que entra
Neto por restaurante tras la comisión de cobro (Stripe México, 3.6 % + 3 pesos con IVA sobre la comisión, cobrando el precio más IVA) **[derivada de fuente externa]**: **233 pesos a 249, 329 a 349, 424 a 449** (12.5 / 17.6 / 22.8 USD).

| | A 249 | A 349 | A 449 |
|---|---|---|---|
| **Gratuitos que cubre el costo variable de cada uno** (forma de hoy) | 151 | **214** | 277 |
| Ídem, con eventos | 953 | **1,344** | 1,735 |
| **Capacidad que gasta** (procesador) | 2.7 gratuitos (hoy), 2.4 (eventos) | igual | igual |

**Tabla de gratuitos sostenidos en costo** (incluye lo fijo y los escalones de procesos y de plan; el costo se reparte así: un restaurante de paga cubre primero lo fijo):

| Restaurantes de paga | Forma de hoy: 249 | 349 | 449 | Con eventos: 249 | 349 | 449 |
|---|---|---|---|---|---|---|
| 1 | 21 | **76** | 131 | 88 | **282** | 282 |
| 2 | 142 | **228** | 265 | 265 | **667** | 1,059 |
| 3 | 248 | **263** | 422 | 755 | **1,246** | 1,866 |
| 5 | 355 | 490 *(cupo)* | 490 *(cupo)* | 1,627 | 2,101 *(cupo)* | 2,101 *(cupo)* |
| 10 | 477 *(cupo)* | 477 | 477 | 2,085 *(cupo)* | 2,085 | 2,085 |

«(cupo)» = el costo ya no frena: manda la capacidad (con el escalón más alto, **E4 con eventos o 8 procesos con la forma de hoy**). Los escalones irregulares (de 228 a 263 con 3 de paga a 349) son los saltos de plan y de procesos. **La capacidad que queda con k restaurantes de paga es: gratuitos ≤ tope del escalón − 2.4 a 2.7 × k.**

**Lectura:**
1. **El dinero deja de ser el límite con 3 a 5 restaurantes de paga a 349**: con ellos se pagan todos los escalones hasta E4.
2. **La capacidad sí sigue siendo el límite**: entrar de paga *quita* lugar. Hay que usar el ingreso para subir de escalón, no para «meter más gratuitos» sin cambiar nada.
3. **Cambiar el precio de 349 a 249 o 449** mueve el tamaño del primer salto (21 a 131 gratuitos con la forma de hoy, 88 a 282 con eventos) pero **no cambia el tope de capacidad**.

### 5.3 Por cada 100 comensales de paga a 29 pesos
- Ingreso neto: **2,031 pesos al mes** (109 USD; 2,431 si los 29 son antes de IVA).
- Eso paga **toda la infraestructura hasta el tope de cada escalón**: **504** gratuitos (forma de hoy, 8 procesos) o **2,116** (con eventos).
- **Capacidad que gastan:** la de siempre; son personas que ya iban a escanear. No ocupan lugar de restaurantes.
- **Equivalencia:** 100 comensales de paga = **6.2 restaurantes de paga a 349** (2,031 ÷ 329).

---

## 6. ¿Se sostiene sin nadie de paga, sólo con anuncios?

### 6.1 Punto de equilibrio de la infraestructura
Primer número de gratuitos típicos desde el cual los anuncios cubren el costo mínimo de Railway del escalón que corresponde (más dominio y lecturas de PDF de altas nuevas); no hay ninguno de paga.

| Tarifa (no personalizada) | Forma de hoy | Con eventos | Visitas con la app al mes (hoy) |
|---|---|---|---|
| **Baja** (3.5 pesos por mil visitas) | **35** gratuitos | **29** | 71,800 |
| **Media** (14.0) | **8** | **7** | 16,400 |
| **Alta** (36.6) | **3** | **3** | 6,200 |
| *Contraste, personalizada: baja / media / alta* | 11 / 4 / 2 | 10 / 4 / 2 | 22,600 / 8,200 / 4,100 |

Excedente al tope del escalón (forma de hoy, 504 gratuitos): **120 / 705 / 1,956 USD al mes**; con eventos (2,116): 738 / 3,194 / 8,446.

### 6.2 Tu meta («≈ 10,000 usuarios» o «≈ 70 % de la capacidad»)
| | Qué es en este modelo | Anuncios, USD al mes (bajo / medio / alto) | Costo | ¿Cubre? |
|---|---|---|---|---|
| **10,000 usuarios** leídos como **10,000 visitas con la app al mes** | ≈ 5 gratuitos típicos | 1.9 / 7.5 / 19.7 | 10.2 | **Sólo en el alto** |
| 10,000 **personas** (2 visitas cada una) | ≈ 10 gratuitos | 3.8 / 15.1 / 39.3 | 10.2 | Medio y alto |
| **70 % de la capacidad de hoy** | **103 gratuitos**, 211,000 visitas | 40 / 159 / 415 | ≈ 20 | **Los tres** |
| **70 % de E1** (con eventos, Hobby, muro de disco) | **209 gratuitos**, 429,000 visitas | 81 / 323 / 842 | ≈ 15 | **Los tres** |

«Usuarios» no está medido: Carta no tiene identificador de persona; lo que existe es `scan` por miembro y minuto (visitas).

### 6.3 Cubrir tu ingreso, no sólo la infraestructura
Gratuitos necesarios para que los anuncios dejen **10,000 pesos al mes netos de infraestructura**:

| | Forma de hoy | Con eventos |
|---|---|---|
| Tarifa alta | **140** | **137** |
| Tarifa media | **389** | **365** |
| Tarifa baja | **no cabe** (tope 504) | **1,544** |

Con tarifa media, 365 gratuitos llevan 750,000 visitas con la app al mes y exigen **E2 o E3** (Pro). **Con la tarifa baja, sólo con eventos y E3 (4 procesos, 1,896 gratuitos).**

### 6.4 Veredicto
- **La infraestructura se paga con anuncios desde pocos restaurantes (3 a 35).** *Si* la tarifa está en el rango, *si* AdSense aprueba el sitio, *si* el diseño y la política de seguridad lo permiten.
- **Tu ingreso no.** Con anuncios solos, 10,000 pesos al mes piden 137 a 1,544 gratuitos según la tarifa; con restaurantes de paga a 349 son **30** (documento: 10,000 ÷ 329).
- **Para el piloto, nada de esto es urgente**: el costo de hoy lo paga un solo restaurante de paga.

---

## 7. Datos por conseguir y preguntas

### 7.1 Datos por conseguir
| # | Dato | Cómo conseguirlo | Quién | Costo |
|---|---|---|---|---|
| 1 | **Resultado de la calculadora de AdSense** (comida y bebida; América Latina y Américas) | Correrla en un navegador, guardar captura (§1.3 paso 1) | Calvin o sesión con navegador | 0 |
| 2 | **Aprobación de AdSense** y si hay disponibilidad en México | Solicitar con una página pública del dominio (§1.3 paso 2) | Calvin | 0 |
| 3 | **CPM de pantalla por país** que paga el anunciante | Cuenta de Google Ads con facturación; Planificador de alcance (ubicación: México) | Calvin | 0 (sin gasto) |
| 4 | **Tarifa real no personalizada** en el flujo de la mesa | Prueba de §1.3 pasos 3 a 5 en 1 a 3 restaurantes del piloto | Sesión maestra + dueño | 0 de dinero; trabajo de fase |
| 5 | **Efecto de no personalizar en AdSense** | Informe «restricciones de servicio» de AdSense durante la prueba | — | 0 |
| 6 | **Impresiones por visita sin estorbar** y su efecto en órdenes | Control de §1.3 paso 5 con la analítica de `scan` | — | 0 |
| 7 | **Visitas por persona al mes** (hoy 2, supuesta) | Sólo existe con la capa de cuenta; antes, entrevistas | — | 0 |
| 8 | **Tasas de registro y de pago** (2–10 %; 1–5 %) | Piloto con la cuenta; antes, referencias de apps parecidas | — | 0 |
| 9 | **¿Los 29 pesos llevan IVA?** | Decisión de producto | Calvin | 0 |
| 10 | **Comisión de otros procesadores** (Mercado Pago, Conekta, OpenPay, Clip) y de OXXO/SPEI | Sus páginas de tarifas (no abrieron) o cotización | — | 0 |
| 11 | **Valor de la UMA en pesos**, multas | INEGI | — | 0 |
| 12 | **Lineamientos de cookies/publicidad** de la Secretaría Anticorrupción y Buen Gobierno y de IAB México; **reglamento vigente** de la ley | Sus sitios; DOF | Abogado | según honorarios |
| 13 | **¿PROFECO pide registrar el contrato de la suscripción?** | Consulta | Abogado | idem |
| 14 | **ISR/IVA del ingreso de AdSense** | SAT y contador | Contador | idem |
| 15 | **Memoria por conexión abierta, núcleos que da Hobby, `max_connections`** | Prueba T-4.4 en staging (≈ 0.3–0.5 USD) | Sesión maestra | ≈ 0.5 USD |
| 16 | **Estudio Valor Total Media 2024 completo** (formatos, dispositivo) | PDF oficial de CiM/IAB (el enlace de cim.mx dio 404) | — | 0 |

### 7.2 Preguntas para Calvin, con mi recomendación
| # | Pregunta | Recomendación |
|---|---|---|
| 1 | ¿Pedimos ya la aprobación de AdSense con una página pública del dominio, **sin tocar el producto**, y corremos la calculadora a mano? | **Sí.** Cuesta 0 y contesta dos de las tres incertidumbres (aprobación y tarifa de referencia) |
| 2 | ¿Los 29 pesos **incluyen IVA**? | **Sí** (juicio mío: más simple para el comensal; el prototipo no lo dice): netos 20.3 pesos; si son antes de IVA, 24.3 |
| 3 | ¿«IA personalizada» en el **gratuito registrado** (tu idea) o en **Carta+** (prototipo)? | **Gratuito registrado**, con SQL o un modelo chico (§3.3); es tu gancho para registrarse |
| 4 | ¿«Sin anuncios» como beneficio del pago, aunque el prototipo no lo muestra? | **Sí**; hay que agregarlo al prototipo cuando se haga la Spec |
| 5 | ¿Se mantiene la regla 10 con **ADR nuevo** para la cuenta, dejando las **alergias en el teléfono**? | **Sí** (§3.6 y §3.7) |
| 6 | ¿Cuándo se enciende la prueba de anuncios? | Después de eventos (E1) y con ≥ 1 restaurante real; **no** en el piloto de alfa |
| 7 | ¿Seguimos sin patrocinio directo? | **Sí**, como pediste: sigue sin considerarse. (Es la única vía sin rastreo con precio fijo; queda en el comparativo §5.5) |
| 8 | ¿La prueba de carga T-4.4 incluye medir la memoria por conexión de eventos y los núcleos de Hobby? | **Sí**: son los números que más mueven E3, E4 y el muro de conexiones |

*Qué no modeló este informe:* tu tiempo, soporte, el costo de conseguir restaurantes, impuestos sobre la renta, facturación, los clics (ingreso por clic ya va en el RPM), anuncios de video, ni cómo reaccionaría el dueño a un anuncio en su carta.

---

## 8. Fuentes

**Del repositorio:** [`2026-11-13-comparativo-de-precios-y-anuncios.md`](2026-11-13-comparativo-de-precios-y-anuncios.md) (§5 y §6), [`2026-11-13-mapa-de-procesos-y-costos.md`](2026-11-13-mapa-de-procesos-y-costos.md) y [`2026-11-13-simulador-de-uso.py`](2026-11-13-simulador-de-uso.py), [`2026-11-13-estrategia-de-precios.md`](2026-11-13-estrategia-de-precios.md), [`2026-09-23-escenarios-publicidad-infraestructura.md`](2026-09-23-escenarios-publicidad-infraestructura.md), [`2026-09-19-modelo-de-negocio-y-pagos.md`](2026-09-19-modelo-de-negocio-y-pagos.md), [`../Carta_Ideacion_v3.md`](../Carta_Ideacion_v3.md), [`../plan/01_Alcance_v1.md`](../plan/01_Alcance_v1.md), [`../plan/02_Arquitectura_v1.md`](../plan/02_Arquitectura_v1.md) §12, el informe `docs/informes/2026-11-13-planos-de-carta/` y el prototipo (`prototipo/js/comensal-onboarding.jsx`, `comensal-extra.jsx`, `comensal-flow.jsx`, `comensal-core.jsx`).

**Externas** (leídas el 13-nov-2026, enlaces completos en el CSV): AdSense [180195](https://support.google.com/adsense/answer/180195), [9007336](https://support.google.com/adsense/answer/9007336), [15450188](https://support.google.com/adsense/answer/15450188), [7670312](https://support.google.com/adsense/answer/7670312), [1709871](https://support.google.com/adsense/answer/1709871), [9724](https://support.google.com/adsense/answer/9724), [10162](https://support.google.com/adsense/answer/10162), [1346295](https://support.google.com/adsense/answer/1346295), [10502938](https://support.google.com/adsense/answer/10502938); [Ad Manager 9005435](https://support.google.com/admanager/answer/9005435) y [7678538](https://support.google.com/admanager/answer/7678538); [Google Ads 7337243](https://support.google.com/google-ads/answer/7337243); [estudio de Google, 2019](https://services.google.com/fh/files/misc/disabling_third-party_cookies_publisher_revenue.pdf); [WeForAds](https://weforads.com/blog/ad-revenue-benchmarks-2026/); [DataReportal](https://datareportal.com/reports/digital-2026-mexico); [Marketing Dive](https://www.marketingdive.com/news/facebook-will-shutter-audience-network-for-mobile-sites/571807/) y [AdExchanger](https://www.adexchanger.com/platforms/facebook-is-killing-off-its-web-supply-in-audience-network-and-dont-be-surprised-if-it-all-shuts-down/); [Stripe México](https://stripe.com/mx/pricing); [RevenueCat 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/); LFPDPPP y LFPC en diputados.gob.mx; [ECIJA](https://www.ecija.com/actualidad-insights/publicidad-digital-y-privacidad-lo-que-las-cookies-revelan-y-la-ley-aun-no-regula-del-todo/); [marketing4ecommerce](https://marketing4ecommerce.mx/inversion-publicitaria-en-mexico/); [Expansión](https://expansion.mx/mercadotecnia/2025/11/05/publicidad-mexico-rompe-tendencia-economica-crece).

**No abrieron o no se leyeron:** PDF del estudio Valor Total Media 2024 en cim.mx (404); EMARKETER (403); WordStream (403); Mercado Pago (403 y 404), Conekta (404), Clip (404), OpenPay (solo título); Ezoic, Kevel y Mediavine (404); resultado de la calculadora de AdSense (JavaScript); Planificador de alcance de Google Ads (sin cuenta); eCPM por país de AdMob (no publicado); reglamento de la ley; lineamientos de cookies de la autoridad; guías de IAB México; textos fiscales de AdSense para México.
