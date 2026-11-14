# Disco de la base e historial: qué lo llena, cómo reducirlo y cuánto cuesta guardar lo viejo

**Fecha:** 14 de noviembre de 2026 · **Rama:** `agente/planes-precio-historial` · **Estado:** investigación; no cambia código, migraciones ni plan (salvo una fila en `04 §11`). La v1 no cobra ni tiene planes.
**Datos:** [`…-datos.json`](2026-11-14-disco-e-historial-datos.json) (por perfil y tabla) · [`…-capacidad.csv`](2026-11-14-disco-e-historial-capacidad.csv) (restaurantes que caben por palanca) · [`…-medicion-bruta.json`](2026-11-14-disco-e-historial-medicion-bruta.json) (tamaños de cada tabla e índice tal como salieron de PostgreSQL).
**Guion de medición (reproducible):** [`…-correr.sh`](2026-11-14-disco-e-historial-correr.sh) crea una base nueva y aplica las migraciones 0001 a 0003 · [`…-generador.sql`](2026-11-14-disco-e-historial-generador.sql) genera los datos con `generate_series` y semilla fija · [`…-medir.py`](2026-11-14-disco-e-historial-medir.py) lee `pg_total_relation_size` · [`…-modelo.py`](2026-11-14-disco-e-historial-modelo.py) calcula cuántos restaurantes caben.

**Marcas.** **[medida]** = medí aquí, en PostgreSQL 16.15 local con el esquema real. **[documento]** = lo dice un documento del repositorio. **[fuente]** = página oficial leída el 14 de noviembre de 2026. **[supuesto]** = juicio mío, y va a «datos por conseguir» (§8).

---

## 0. Conclusiones

- **Una visita pesa 7.1 a 8.5 KB en la base, no los 12 KB que suponía el mapa de procesos** [medida; el mapa decía «12 KB ±2×», estimada]. De eso, **43 a 51 % es analítica** (`evento_analitica`: 366 bytes por evento, 10 eventos por visita [supuesto]) y el resto son las siete tablas de la mesa (3.5 a 4.8 KB). Un restaurante mediano de 1,800 visitas al mes crece **13.5 MB al mes** (grande de 4,500: 35 MB).
- **Con el diseño de hoy (30 días gratuito, 12 meses de paga) caben 17 restaurantes de paga en 5 GB** (22 sin reserva), **88 con 80 % gratuitos y 20 % de paga** [medida + modelo]. Esto **confirma el 17 y el 85 del mapa de procesos** por un camino distinto: la cifra de 12 KB por visita no cambia mucho el resultado porque el peso se va a los 12 meses de historial, no al tamaño de la visita.
- **La palanca grande no es comprimir, es dónde vive el historial:** pasar el historial de paga de 12 meses a 3 en línea (el resto archivado en R2) sube los restaurantes de paga que caben de **22 a 128** (×5.8); con la analítica en bruto sólo 7 días y 1 mes de historial en línea, **de 414 a 570 en cualquier mezcla**. Quitar los 4 índices de clave foránea de `evento_analitica` sólo ahorra **10 %** de esa tabla: **no vale el riesgo**.
- **Guardar lo viejo cuesta casi nada:** un restaurante mediano archiva **0.88 MB al mes (10.6 MB al año)** comprimido, **7.8 veces menos** que en la base [medida; con xz 15.5×]. En R2 Standard son **0.0002 USD al mes por cada año de historial** [fuente: 0.015 USD por GB-mes]; los primeros 10 GB son gratis (≈ 940 restaurantes-año). Guardar **diez años** costaría **≈ 0.4 pesos al año por restaurante**.
- **La ley no fija un plazo para Carta, pero sí para el restaurante:** el Código de Comercio (arts. 38 y 46) obliga al comerciante a conservar comprobantes y registros de su negocio **diez años** y el Código Fiscal (art. 30), **cinco**. Si una comanda sin cobro cuenta como tal es **pregunta abierta para un abogado** (§4). **No es opinión legal.**
- **Decisión de Calvin (13–14 de noviembre): no se venden ni se comparten datos de usuarios ni de restaurantes.** Tres documentos viejos lo proponían (§6); lo decide la maestra si se corrigen.

---

## 1. Anatomía del disco

### 1.1 Qué se midió y cómo

Base nueva, migraciones 0001–0003 aplicadas, datos de cuatro perfiles del simulador (`chico`, `mediano`, `grande`, `formal`; 10 restaurantes cada uno, **un mes** de visitas, 12 mesas, 4 personas, 6 categorías). Una **visita** es una `sesion_grupal` cerrada con sus miembros, órdenes, ítems, comandas, llamadas (30 %) y **10 eventos de analítica** [supuesto: 1 `scan`, 2 `menu_view`, 4 `dish_view`, `search`, `filter`, `item_add`; el contrato permite hasta 120 por minuto, así que 10 es una visita tranquila]. Los miembros por visita (2.3 a 3.0), ítems por orden (2.2 a 3.2) y el 30 % de visitas con dos comandas son **[supuestos]** del generador, tomados de los perfiles del simulador. Se hizo `VACUUM (ANALYZE)` antes de medir. Para cargar los ítems se apagó **sólo durante la carga** el trigger INV-3 (impide ítems en órdenes cerradas) y se volvió a encender.

### 1.2 Bytes por visita y por tabla [medida]

| Tabla | chico | mediano | grande | formal | Qué ocupa |
|---|---|---|---|---|---|
| `evento_analitica` (×10 eventos) | **3,660** | **3,680** | **3,600** | **3,710** | 204 B de fila + 162 B de 7 índices por evento |
| `item_orden` | 1,215 | 1,354 | 1,624 | 2,075 | 176 B por ítem; 3 índices |
| `miembro_sesion` | 573 | 649 | 731 | 741 | 250 B por miembro; 4 índices |
| `orden_personal` | 510 | 593 | 631 | 670 | 222 B por orden |
| `comanda_orden` | 380 | 438 | 488 | 511 | 166 B; la mitad es índice |
| `comanda` | 431 | 434 | 425 | 429 | 330 B por comanda |
| `sesion_grupal` | 263 | 264 | 256 | 275 | 260 B por sesión |
| `llamada_mesero` | 91 | 91 | 86 | 86 | 300 B por llamada, 30 % de las visitas |
| **Total por visita** | **7,124** | **7,506** | **7,844** | **8,496** | |
| Parte de analítica | 51 % | 49 % | 46 % | 44 % | |

**Crecimiento al mes por restaurante:** chico 12.8 MB, mediano 13.5 MB, grande 35.3 MB, formal 12.7 MB (visitas por mes: 1,800 / 1,800 / 4,500 / 1,500 [documento: planes-y-costo §0]).

**Fijo por restaurante** (restaurante, categorías, mesas, personal, platillos, importación, usuario): **0.14 a 0.21 MB**; un platillo ocupa **1.4 a 1.9 KB** con sus 8 índices (el mapa suponía 1.1 KB [medida anterior]: la diferencia son los dos índices GIN de alérgenos y etiquetas). **Los platillos no son el problema:** 80 platillos pesan ≈ 0.15 MB. Una base migrada y vacía pesa **7.6 MB** [medida].

### 1.3 Por qué 5 GB dan para tan pocos de paga

Un restaurante de paga mediano con 12 meses de historial ocupa **0.17 + 12 × 13.5 = 162 MB**; con la mezcla de paga del simulador (50 % medianos, 25 % grandes, 25 % formales) el promedio es **225 MB**, y 5 GB ÷ 225 MB = **22**. Un gratuito con 30 días ocupa 14 MB: caben 349. **El costo en dinero es trivial** (162 MB en el volumen de Railway cuestan 0.024 USD al mes, ≈ 0.45 pesos [fuente: 0.15 USD por GB-mes, docs.railway.com, 13-nov]): **el muro es la capacidad de 5 GB, no el dinero**. Con Pro, el volumen por defecto es 50 GB [documento: mapa de procesos §4.2], pero eso es pagar 20 USD al mes para guardar lo que en R2 cuesta casi cero.

**Comparación con el mapa de procesos.** Mismo modelo de retención (30 días / 12 meses): el mapa da 17 de paga y 85 con 80/20; esta medición da **17 y 70 con 20 % de reserva** (22 y 88 sin reserva). Coinciden pese a 12 KB frente a 7.1–8.5 KB por visita; **no aislé la causa** (el mapa usa otras mezclas y visitas por día). **No cambia ninguna conclusión del mapa**; sí corrige la cifra de bytes por visita y por platillo.

---

## 2. Palancas para reducirlo

Restaurantes que caben en **5 GB** con la mezcla de tamaños del simulador (gratuito: 60 % chico, 25 % mediano, 5 % grande, 10 % formal; paga: 50 / 25 / 25), **sin reserva** y entre paréntesis **con 20 % de reserva** [supuesto: WAL, hinchazón y catálogo; se mide con `pg_ls_waldir()` en producción]:

| Palanca (acumulada) | MB gratuito | MB paga | Todo gratuito | 90/10 | 80/20 | Todo de paga |
|---|---|---|---|---|---|---|
| **P0** hoy: 30 días / 12 meses, todo en línea | 14.3 | 225.4 | 349 (279) | 141 (112) | 88 (70) | **22 (17)** |
| **P1** analítica en línea sólo 30 días | 14.3 | 129.0 | 349 (279) | 193 (155) | 134 (107) | 38 (30) |
| **P2** P1 + historial de paga 3 meses en línea, el resto archivado | 14.3 | 39.0 | 349 (279) | 298 (238) | 259 (207) | **128 (102)** |
| **P3** P2 + sin los 4 índices FK de `evento_analitica` | 13.6 | 38.1 | 367 (294) | 311 (249) | 270 (216) | 130 (104) |
| **P4** P3 + analítica 7 días en bruto, el resto en agregados | 8.8 | 32.0 | 570 (456) | 450 (360) | 372 (297) | 155 (124) |
| **P5** P4 + historial de paga 1 mes en línea | 8.8 | 12.0 | 570 (456) | 549 (439) | 530 (424) | **414 (331)** |

Cómo se lee: **P1 y P2 son baratas de construir** (una purga programada y un archivador mensual) y **suben el 22 a 128**; **P4 y P5 ya cambian el producto** (la analítica del restaurante sólo ve 7 días en bruto). **P3 no se recomienda:** ahorra 3–4 % del total y esos cuatro índices existen porque la regla del skill `/migracion` exige índice en toda clave foránea con `ON DELETE` (sin ellos, borrar un platillo o una mesa recorre la tabla entera de eventos).

**Dónde está el ahorro de cada una** [medida]: la analítica pesa 51 % en un chico; retenerla 30 días en lugar de 12 meses en paga ahorra **96 MB por restaurante de paga**. De los 366 bytes por evento, 162 son índices: `idx_evento_restaurante_fecha` (9.5 MB por 180 mil eventos) y `idx_evento_tipo` (9.2 MB) son los grandes. Otras reducciones **[derivadas]**: guardar `ip_hash` en 16 caracteres en vez de 64 (SHA-256 completo) ahorra ≈ 48 de 204 bytes de fila, ≈ 13 % de la tabla; no la medí.

### 2.1 Razón de compresión del archivo [medida, mismo mes del perfil mediano]

| Formato | Bruto | gzip -6 | xz -6 | Razón en la base ÷ archivo |
|---|---|---|---|---|
| Una línea JSON por visita (sesión, miembros, órdenes con ítems, comandas), **18,000 visitas** | 41.1 MB | **8.8 MB (489 B por visita)** | **4.4 MB (247 B)** | **7.8× (gzip) · 15.5× (xz)** frente a 3,822 B en línea |
| CSV por tabla (7 tablas de la mesa) | 50.6 MB | 14.7 MB | 11.4 MB | 4.7× (gzip) |
| Eventos de analítica en CSV (180 mil) | 43.9 MB | 12.5 MB | 1.7 MB (**no creíble**: los datos sintéticos son demasiado regulares) | usar sólo gzip: 3.5× |
| **Agregados de eventos por día y tipo** (1,860 renglones) | 0.19 MB | 0.012 MB | 0.010 MB | 5,700× menos que los 66 MB de eventos en línea |

**Advertencias de la medición:** los UUID y los alias son aleatorios, como en la realidad, y los precios y textos del generador son regulares, así que **la razón real será algo peor que la medida** [supuesto: 6× en vez de 7.8×; se mide con el primer mes real]. El archivo por visita **repite menos UUID** que el CSV por tabla: por eso comprime el doble. **Quedarse con agregados** (conteo por día, tipo y platillo) conserva lo que el panel del dueño usa y pesa **0.6 B por visita**.

---

## 3. Historial como oferta

### 3.1 Qué cuesta guardar el historial en frío

Tamaño a archivar por restaurante mediano [medida]: **0.88 MB al mes, 10.6 MB al año** (gzip, formato por visita) más ≈ 1 KB al mes de agregados. Para un grande (4,500 visitas): 2.2 MB al mes, 26 MB al año.

| Almacenamiento (S3 compatible, regla dura 13) | USD por GB-mes | Mínimo / recuperación | Salida de datos | Costo de **10 años** de un restaurante mediano (106 MB) |
|---|---|---|---|---|
| **Cloudflare R2 Standard** | **0.015** | sin mínimo; 10 GB-mes gratis | **gratis** | **0.019 USD al año ≈ 0.36 pesos** (dentro de los 10 GB gratis, 0) |
| **Cloudflare R2 Infrequent Access** | **0.010** | **30 días mínimos**; **0.01 USD por GB recuperado**; sin capa gratis | gratis | 0.013 USD al año |
| **Backblaze B2** | **0.00695** (6.95 USD por TB-mes) | **sin mínimo**; primeros 10 GB gratis | gratis hasta 3× lo almacenado; después 0.01 USD por GB | 0.009 USD al año |
| **Clases frías de S3** (Glacier Instant, Flexible, Deep Archive) | **no se pudo leer** (la página de precios de AWS no entregó las tablas) | mínimos de **30, 90 y 180 días** según la página | — | **dato por conseguir** |

**Fuentes y fecha:** R2: <https://developers.cloudflare.com/r2/pricing/> («Last updated Oct 30, 2026»), leída el 14 de noviembre. B2: <https://www.backblaze.com/cloud-storage/pricing> (sin fecha de actualización visible), leída el 14 de noviembre. S3: <https://aws.amazon.com/s3/pricing/>, leída el 14 de noviembre: sólo aparecen las duraciones mínimas; los precios cargan dinámicamente y no los pude leer, así que **no los cito** (ruta: calculadora oficial de AWS o la página de precios en un navegador). **Recomendación: R2 Standard.** Ya es el almacenamiento de fotos y respaldos de Carta (ADR-012, mapa de procesos §5), la salida es gratis (descargar lo antiguo no cuesta) y el ahorro de B2 o de Infrequent Access es de **centavos por restaurante-año**: no compensa un proveedor más ni una penalización por recuperar. El tiempo de recuperación de R2 Standard y B2 es el de un objeto cualquiera (segundos); las clases tipo Glacier tardan horas y no se justifican a este tamaño.

### 3.2 Cómo ofrecerlo (propuesta para la Spec 002; la v1 no tiene planes)

- **Meses en línea por plan** (lo que cuesta capacidad de 5 GB): gratuito 1 (30 días); paga 3 a 12 según la palanca elegida en §2 (3 meses = **128 restaurantes de paga**; 12 meses = **22**).
- **Archivo descargable** de lo que sale de línea: un `.json.gz` por mes, **que el propio restaurante descarga** desde el panel («Descargar mi historial de abril»), con aviso antes de que salga de línea. Es la respuesta a «dar un historial grande y la opción de descargar lo viejo para liberar espacio»: **liberar espacio de la base, no del restaurante.**
- **Años en frío** (en R2, a cargo de Carta): a 10.6 MB por restaurante-año el costo es de centavos; el límite real es **cuánto tiempo se compromete Carta a guardar** (§4: si no es registro contable, no hay obligación; si lo es, la obligación es del comerciante y la copia descargable le basta).
- **Dato de mercado del valor del historial:** Loyverse cobra **7 USD por tienda al mes (≈ 130 pesos)** el complemento «historial» después de 31 días [fuente: loyverse.com/pricing, leída el 13 de noviembre en el comparativo de precios]. Es el único precio publicado por historial que encontré; vale la pena para el informe de precios (A).

---

## 4. Ley mexicana: qué plazos de conservación existen

> **Esto no es opinión legal.** Son los textos oficiales y una pregunta abierta; **requieren revisión de un abogado** antes de prometer un plazo.

Textos copiados de los PDF oficiales de la **Cámara de Diputados** (<https://www.diputados.gob.mx/LeyesBiblio/>), leídos el 14 de noviembre de 2026:

**Código Fiscal de la Federación, art. 30** (versión con «Última Reforma DOF 09-04-2026»):
> «Las personas obligadas a llevar contabilidad deberán conservarla a disposición de las autoridades fiscales de conformidad con la fracción III del artículo 28 de este Código. […] La documentación a que se refiere el párrafo anterior de este artículo y la contabilidad, deberán conservarse durante un plazo de cinco años, contado a partir de la fecha en la que se presentaron o debieron haberse presentado las declaraciones con ellas relacionadas.»

**Código de Comercio** (versión con «Última reforma publicada DOF 14-11-2025»):
> **Art. 38:** «El comerciante deberá conservar, debidamente archivados, los comprobantes originales de sus operaciones, en formato impreso, o en medios electrónicos, ópticos o de cualquier otra tecnología, siempre y cuando, en estos últimos medios, se observe lo establecido en la norma oficial mexicana sobre digitalización y conservación de mensajes de datos […] y deberá conservarlos por un plazo mínimo de diez años.»
> **Art. 46:** «Todo comerciante está obligado a conservar los libros, registros y documentos de su negocio por un plazo mínimo de diez años. Los herederos de un comerciante tienen la misma obligación.»
> **Art. 47:** «Los comerciantes están obligados a conservar debidamente archivadas las cartas, telegramas y otros documentos que reciban en relación con sus negocios o giro, así como copias de las que expidan.»

**Ley Federal de Protección de Datos Personales en Posesión de los Particulares** («Nueva Ley publicada en el Diario Oficial de la Federación el 20 de marzo de 2025», última reforma DOF 14-11-2025):
> **Art. 10 (2.º párr.):** «Cuando los datos personales hayan dejado de ser necesarios para el cumplimiento de las finalidades previstas en el aviso de privacidad […] deberán ser suprimidos previo bloqueo, en su caso, y una vez que concluya el plazo de conservación de los mismos.»
> **Art. 24 (2.º y 3.º párr.):** «La cancelación de datos personales dará lugar a un periodo de bloqueo tras el cual se procederá a la supresión del dato […]. El periodo de bloqueo será equivalente al plazo de prescripción de las acciones derivadas de la relación jurídica que funda el tratamiento […].»
> **Art. 25, fracc. II:** el responsable no está obligado a cancelar cuando los datos «deban ser tratados por disposición legal».

**NOM-151-SCFI-2016** (conservación de mensajes de datos y digitalización; la cita el art. 38): **no la pude leer**; el sitio del DOF devolvió 503 el 14 de noviembre. Pendiente.

| Norma | A quién obliga | Plazo | Qué implica para Carta |
|---|---|---|---|
| CFF art. 30 | Contribuyentes (el restaurante): contabilidad y documentación fiscal | **5 años** desde la declaración | Sólo si la comanda es documentación fiscal |
| Código de Comercio arts. 38, 46, 47 | **Comerciantes** (el restaurante): comprobantes, libros, registros, documentos y correspondencia del negocio | **10 años** | Obliga al restaurante, **no a Carta como proveedor**. Si la comanda cuenta como «registro» o «comprobante», el restaurante debe poder conservarla 10 años: la **copia descargable** lo resuelve sin que Carta la guarde |
| LFPDPPP arts. 10, 24, 25 | El «responsable» que trata datos personales (Carta, por el nombre del personal y el correo del operador; **no** hay datos del comensal, regla dura 10) | Mientras sirva la finalidad; tras cancelar, **bloqueo igual a la prescripción** de la relación jurídica | Un historial largo no choca con la ley siempre que **no** incluya datos personales del comensal; el nombre y el PIN del personal se bloquean y luego se suprimen al darlo de baja |

**Pregunta abierta para un abogado:** *¿una comanda de Carta sin cobro (Carta no cobra, no factura y no registra pagos) es un «comprobante original de sus operaciones» (art. 38), un «registro» (art. 46) o documentación fiscal (CFF art. 30)?* El artículo 38 habla de «operaciones»; una comanda registra un pedido, no un cobro. **No lo sé; no lo supongo.** Efectos de cada respuesta: si **no** lo es, Carta puede fijar el plazo que quiera; si lo es, la obligación es del restaurante y basta ofrecer la descarga. **Otras preguntas:** ¿el plazo de bloqueo de la LFPDPPP para el personal dado de baja? ¿Qué dice la NOM-151 que Carta deba cumplir si ofrece archivos «con validez» (constancia de conservación, sello de tiempo)? **Carta no debería prometer validez probatoria** en la v1.

---

## 5. Cómo lo hacen otros

| Empresa | Cuánto guarda | Descarga de datos | Fuente (leída el 14-nov-2026) |
|---|---|---|---|
| **Spotify** | Sólo da **un plazo concreto: 90 días** para lo escrito en búsquedas: «personal data you may input as part of search queries is deleted after 90 days.» El resto, «only as long as necessary to provide you with the Spotify Service» | Herramienta **«Download your data»** en su página de privacidad de cuenta; la página **no dice formato ni plazo** de entrega | <https://www.spotify.com/legal/privacy-policy/> («Effective as of July 1, 2026») |
| **Airbnb** | **Sin plazos concretos:** «We retain personal information for as long as needed or as permitted in light of the purpose(s)»; copias de respaldo «for a limited period of time» | La política **no describe** una función de exportación; remite a una solicitud formal (dpo@airbnb.com) y al centro de ayuda (no leído) | <https://www.airbnb.com/help/article/3175> («Last Updated: February 5, 2026») |

**Lectura:** **ninguna de las dos publica «guardamos N años»**; ambas dicen «mientras sea necesario» y ofrecen descarga a la persona dueña de los datos. Lo defendible para Carta es lo mismo: **fijar una ventana por plan, avisar antes de que salga de línea y ofrecer la descarga**, sin prometer años. Spotify es la única con un plazo duro (90 días) y es para lo más sensible (búsquedas).

---

## 6. Decisión: no se venden ni se comparten datos de usuarios ni de restaurantes

**Decisión de Calvin, 13–14 de noviembre de 2026.** Dónde la contradecían (con `grep`; **no se tocó nada**: lo decide la maestra):

| Archivo | Líneas | Qué decía |
|---|---|---|
| `docs/Carta_Ideacion_v3.md` | 554–556, 583–584, 777, 846 | «Monetizacion de datos (futuro, con consentimiento)»: insights anónimos y agregados «vendidos a la industria»; «Carta Credits» para quien comparta datos anónimos |
| `docs/Carta_Diagramas_v2.md` | 57, 388, 406 | US-C30 (comensal Premium comparte datos anónimos por «Carta Credits») e «Insights anonimos agregados vendidos a industria restaurantera» |
| `docs/archivo/Carta_Ideacion_v2.md` | 392 | **Ya decía lo contrario:** «Carta no vende, comparte ni monetiza datos personales. Nunca.» |

`docs/Carta_Ideacion_v3.md` y `Carta_Diagramas_v2.md` son anteriores al plan vigente (no están en `docs/plan/` ni `docs/mvp/`); `docs/plan/01_Alcance_v1.md` ya excluye «Carta+» y la analítica del restaurante. Ningún documento del plan ni del código propone vender datos. Propuesta para la maestra: una línea en `01_Alcance_v1.md` («no se venden ni comparten datos de usuarios ni de restaurantes») y marcar esas líneas de v3 como descartadas.

---

## 7. Qué recomiendo (con la regla escrita)

1. **Historial de paga: 3 meses en línea y el resto descargable y en R2** (P2). Sube 22 → 128 restaurantes de paga en 5 GB y no cuesta producto: el panel del dueño casi nunca mira más de 90 días [supuesto: se confirma con las entrevistas del piloto].
2. **Analítica en línea 30 días** (P1) y **agregados por día y tipo después** (conservan el panel).
3. **No quitar los índices de clave foránea** (P3).
4. **Primero medir** `evento_analitica` con el piloto: es la tabla más grande y su volumen (10 eventos por visita) es un [supuesto].
5. **Subir a Pro (20 USD)** sólo cuando P1–P2 no alcancen; hoy es innecesario.

## 8. Datos por conseguir

| Dato | Para qué | Cómo se obtiene | Costo |
|---|---|---|---|
| Eventos reales por visita | El 51 % del disco depende de esto | `SELECT count(*) FILTER (...)` sobre `evento_analitica` del piloto | 0 |
| Miembros, ítems y comandas reales por visita | Ajustar 3.5–4.8 KB por visita | Consultas de lectura sobre el piloto | 0 |
| WAL, hinchazón y catálogo reales | La reserva de 20 % | `pg_ls_waldir()`, `pgstattuple` en producción | 0 |
| Razón de compresión real | Hoy: 7.8× con datos generados | Archivar el primer mes real | 0 |
| Precios de S3 Glacier (US East) | Completar §3.1 | Calculadora de AWS en navegador | 0 |
| NOM-151 | §4 | DOF cuando esté disponible | 0 |
| Si una comanda es «registro» (art. 46) | Plazo prometido | Abogado | por cotizar |
| Retención y exportación de Airbnb (artículo 2273) | §5 | Leerlo | 0 |
