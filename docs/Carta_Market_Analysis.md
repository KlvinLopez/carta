# Carta — Análisis de Mercado, Target Users y Justificación de Negocio

**Versión:** 1.0
**Fecha:** 4 de abril de 2026
**Autor:** Calvin + Claude
**Estado:** Research completo — listo para pitch deck
**Documento relacionado:** `Carta_Ideacion_v3.md`

---

## ⚠️ Corrección del 19 de septiembre de 2026

Este documento se escribió en abril de 2026 apoyado, en su mayor parte, en fuentes globales o de Estados Unidos. Dos rondas de investigación posteriores sobre fuentes oficiales mexicanas —INEGI (Censos Económicos y DENUE), SAT y los sitios de cada competidor— corrigieron cuatro cosas de fondo. Cada sección afectada lleva su corrección en el lugar donde estaba el error:

1. **El mercado es entre nueve y doce veces más chico.** No son 736 mil restaurantes: son **59,296 restaurantes de servicio completo** en el país y **8,142 en la Ciudad de México** (clase SCIAN 722511). La cifra vieja es todo el sector de alimentos e incluye taquerías, fondas y puestos, que no son el mercado de Carta. La compensación es real: esos restaurantes son el 10.2% de los negocios del sector pero el **33.2% de su producción bruta**. Ver §2.2.
2. **La competencia real es el punto de venta que el restaurante ya tiene instalado**, no las apps de reparto ni los competidores estadounidenses. Soft Restaurant y Fudo ya venden menú QR con pedido desde la mesa. Ver §5.5.
3. **Las cifras de realidad aumentada citadas no resisten verificación:** el «+22%» estaba mal atribuido y el «+25%» salió de un estudio del propio vendedor de la tecnología. Ver §5.5.
4. **Las estadísticas de adopción de punto de venta son de Estados Unidos.** En México esa medición no existe. Ver §6.1.

---

## 1. Resumen Ejecutivo

Carta entra en la intersección de tres mercados en expansión acelerada: restaurant technology (USD $46.5B proyectado a 2032), menús digitales QR (USD $5B proyectado a 2032, CAGR 20%), y realidad aumentada aplicada a food & beverage (dentro de un mercado AR global que alcanza USD $140B en 2025). La oportunidad específica de Carta es capturar la brecha entre los menús QR estáticos que el 75% de los restaurantes full-service en EE.UU. ya adoptaron, y la experiencia inmersiva y personalizada que los comensales de 20–45 años esperan de cualquier plataforma digital en 2026.

México, mercado inicial de Carta, tiene **59,296 restaurantes de servicio completo** (clase SCIAN 722511, INEGI, Censos Económicos), de los cuales **8,142 están en la Ciudad de México**. El sector de alimentos y bebidas completo suma 740,231 unidades económicas (DENUE, mayo de 2026), pero incluye taquerías, fondas, puestos y cafeterías: **ese no es el mercado de Carta**. El mercado foodservice del país se valúa en USD $41.28B (2024), creciendo a 8.4% anual.

El *timing* se sostiene por dos razones, una de infraestructura y otra de producto. La infraestructura móvil ya está lista. Y **Carta no exige que el restaurante tenga computadora**: corre en el teléfono del mesero, del capitán y del dueño, con versión de tableta para todos los roles y de escritorio solo para capitán y administración. Eso importa en un país donde **solo el 22.3% de las microempresas usa equipo de cómputo** (INEGI, Censos Económicos 2024) y 96 de cada 100 negocios restauranteros son microempresas.

Sobre la competencia hay que hablar con precisión: **sí existen competidores en México que ya venden menú QR con pedido y pago desde la mesa** —Soft Restaurant y Fudo—. Lo que ninguna plataforma revisada ofrece es que **varios comensales armen una sola orden juntos desde sus propios teléfonos**: las que existen dividen la cuenta al pagar, no construyen la orden al pedir. Ese es el hueco real (§5.5).

---

## 2. Definición del Mercado

### 2.1 TAM — Total Addressable Market

El TAM de Carta se define como el gasto total en tecnología de menú y experiencia del comensal a nivel global.

| Segmento | Valor (2025) | Proyección | CAGR | Fuente |
|----------|-------------|------------|------|--------|
| Restaurant Technology (global) | USD $25.6B | USD $46.5B (2032) | 7.95% | Business Research Insights |
| QR Code Menu Platforms (global) | USD $1.13B | USD $5B (2032) | 20% | FutureDataStats |
| AR en Food & Beverage (global) | Parte de USD $140B (AR total) | USD $1,716B AR total (2032) | — | ABI Research / múltiples |
| Online Food Delivery LATAM | — | Crecimiento sostenido | — | Statista |

**TAM consolidado:** ~USD $27B (restaurant tech + digital menus, 2025).

### 2.2 SAM — Serviceable Addressable Market

El SAM de Carta se enfoca en restaurantes en México y LATAM que ya tienen o están dispuestos a adoptar menú digital.

> **Corregido el 19 de septiembre de 2026.** El cálculo original —conservado más abajo— multiplicaba tres supuestos frágiles: un universo que no es el segmento de Carta, un porcentaje de adopción global aplicado a México sin fuente, y un gasto en tecnología por restaurante tomado de Estados Unidos. El resultado estaba inflado por un factor de nueve a doce.

### El universo real

| Métrica | Dato | Fuente |
|---------|------|--------|
| Restaurantes de servicio completo, nacional (SCIAN **722511**) | **59,296** | INEGI, Censos Económicos |
| Servicio completo ampliado (722511 + 722512, con marisquerías) | 81,518 | INEGI, Censos Económicos |
| Servicio completo en la Ciudad de México | **8,142** | INEGI, Censos Económicos |
| Sector de alimentos y bebidas completo (el número viejo) | 740,231 | DENUE, corte de mayo de 2026 |
| Peso de la clase 722511 en la industria | 10.2% de las unidades · 24.7% del personal · **33.2% de la producción bruta** | INEGI, Censos Económicos |
| Rentabilidad de la clase | **44.9%** contra 30.9% de la economía nacional | INEGI, Censos Económicos |
| Precios reales del software de restaurante en México | $360 a $2,900 MXN al mes **por el sistema completo** | Sitios oficiales de Fudo, Soft Restaurant y Last.app, consultados 19-sep-2026 |

**Advertencia sobre la cifra:** la clase 722511 se llama hoy «a la carta **o de comida corrida**», así que incluye fondas. El segmento verdadero de Carta es algo menor que 59,296, y con datos públicos no se puede precisar cuánto.

### SAM corregido, en pesos

Se calcula en pesos porque es como se cobra este mercado, y sobre precios mexicanos observados, no sobre gasto estadounidense en tecnología.

| Escenario | Cálculo | SAM anual |
|---|---|---|
| Carta como **complemento** a $349/mes, todo el segmento nacional | 59,296 × $349 × 12 | **≈ $248 millones MXN** |
| Carta como **reemplazo del punto de venta** a $690–$1,100/mes | 59,296 × ($690 a $1,100) × 12 | **≈ $491 a $782 millones MXN** |
| Solo la Ciudad de México, como complemento | 8,142 × $349 × 12 | ≈ $34 millones MXN |

**Lo que esto obliga a aceptar:** el mercado es mucho más chico, pero cada cliente vale unas **3.3 veces** el negocio promedio del sector y es el más rentable de toda la industria restaurantera. El caso de negocio no se cae; cambia de forma. Deja de ser «capturar un pedacito de un mercado enorme» y pasa a ser «cobrarle bien a un mercado chico y rentable».

<details>
<summary>Cálculo original de abril de 2026 — conservado para trazabilidad, <b>no usar</b></summary>

| Métrica | Dato | Fuente |
|---------|------|--------|
| Restaurantes registrados en México | 736,367 | DENUE 2025 |
| Mercado foodservice México | USD $41.28B (2024) | Expert Market Research |
| Restaurantes que ya usan QR en alguna forma | ~70% (global) | MenuTiger / QR Code Chimp |
| Gasto promedio en tech por restaurante (estimado) | USD $3,000–$8,000/año | Toast / Industry avg |

**SAM estimado:** Si el 70% de los 736K restaurantes en México (~515K) gastan en promedio USD $5,000/año en tech de menú y experiencia digital → SAM México ≈ USD $2.58B/año. Expandiendo a LATAM: SAM LATAM ≈ USD $10B/año.

</details>

### 2.3 SOM — Serviceable Obtainable Market

El SOM es la porción realista que Carta puede capturar en los primeros 3 años.

**Fase 1 (Año 1): México — ciudades premium**
Mercado objetivo: restaurantes premium y modernos en CDMX, Guadalajara, Monterrey, Mérida, Puebla y corredores turísticos (Cancún, Los Cabos, Riviera Maya).
Restaurantes target: ~15,000 establecimientos (restaurantes de servicio completo, premium casual, fine dining, cafeterías de especialidad).
Conversión esperada año 1: 1–2% del target → **150–300 restaurantes**.
ARPU estimado: $349 MXN/mes plan Pro ≈ USD $20/mes → **USD $36K–$72K ARR año 1**.

**Fase 2 (Año 2): Expansión México + piloto LATAM**
Target: 5,000 restaurantes.
Conversión: 3–5% → 150–250 restaurantes adicionales.
Premium comensales (B2C): $29 MXN/mes × 5,000 suscriptores → ~USD $100K ARR adicional.

**Fase 3 (Año 3): LATAM — Colombia, Chile, Argentina**
Target: 50,000 restaurantes en la región.
Conversión: 2–3% → 1,000–1,500 restaurantes.
**SOM proyectado año 3: USD $500K–$1.2M ARR combinado (B2B + B2C).**

---

## 3. Target Users — Ecosistema Completo

### 3.1 Comensal — Persona Primaria (B2C End User)

#### Persona A: "Sofía" — La Foodie Millennial

| Atributo | Detalle |
|----------|---------|
| Edad | 26 años |
| Ciudad | CDMX (Roma Norte) |
| Ocupación | Content manager en agencia digital |
| Ingreso mensual | $25,000–$35,000 MXN |
| Come fuera | 4–6 veces por semana |
| Dispositivo | iPhone 15 |
| Apps que usa diario | Instagram, Airbnb, Uber Eats, Spotify |
| Perfil alimentario | Pescetariana, intolerante a lactosa |
| Motivación en Carta | Ver los platillos en 3D antes de ordenar, filtrar por restricciones, descubrir nuevos lugares |
| Disposición a pagar Premium | Sí — $29 MXN/mes le parece razonable si le ahorra malas decisiones |
| Frase que la define | "Si no sé cómo se ve, no lo pido" |

**Comportamiento clave:** Sofía ya escanea QR en restaurantes. Lo que la frustra es que el QR la lleve a un PDF o una página estática sin fotos. La primera vez que vea un platillo flotar sobre su mesa en AR, va a grabarlo y subirlo a Instagram Stories. Sofía es el vector de viralidad de Carta.

#### Persona B: "Diego" — El Líder de Grupo

| Atributo | Detalle |
|----------|---------|
| Edad | 32 años |
| Ciudad | Monterrey |
| Ocupación | Gerente de ventas en empresa de manufactura |
| Ingreso mensual | $45,000–$60,000 MXN |
| Come fuera | 3–4 veces por semana (comidas de negocios + familia) |
| Dispositivo | Samsung Galaxy S24 |
| Perfil alimentario | Sin restricciones, pero cuida porciones |
| Motivación en Carta | Coordinar la orden del grupo sin caos, que todos vean lo que van a pedir, control del gasto |
| Feature favorito | Sesiones grupales — ve en tiempo real qué está pidiendo cada quien |
| Frase que lo define | "¿Ya todos saben qué van a pedir? Llevamos 20 minutos..." |

**Comportamiento clave:** Diego es el "host" natural. Va a ser quien abra la sesión grupal y pase el QR a los demás. Para Carta, Diego es el usuario que convierte una mesa de 6 en 6 usuarios activos simultáneos.

#### Persona C: "Martha y Roberto" — Turistas Nacionales / Internacionales

| Atributo | Detalle |
|----------|---------|
| Edad | 55 y 58 años |
| Ciudad | De visita en Mérida desde Guadalajara |
| Situación | Vacaciones, no conocen los restaurantes locales |
| Dispositivo | iPhone 13, moderadamente tech-savvy |
| Perfil alimentario | Roberto: diabético. Martha: evita mariscos |
| Motivación en Carta | Entender qué están ordenando sin depender del mesero, ver porciones reales, filtrar por ingredientes |
| Pain point actual | Menú en español con nombres que no reconocen (cochinita pibil, papadzules) — no saben qué esperar |
| Frase que los define | "Si hubiéramos visto cómo era, habríamos pedido otra cosa" |

**Comportamiento clave:** Para el turista, ver el platillo en 3D elimina la barrera del idioma y la incertidumbre. Este segmento no pagará Premium pero generará escaneos masivos en zonas turísticas — dato valioso para los restaurantes.

#### Persona D: "Valentina" — Gen Z / Nativa Digital

| Atributo | Detalle |
|----------|---------|
| Edad | 19 años |
| Ciudad | CDMX (estudiante en la Ibero) |
| Ingreso | Mesada + trabajo parcial, ~$8,000 MXN/mes |
| Come fuera | 5+ veces por semana (cafeterías, tacos, fast casual) |
| Dispositivo | iPhone 14 |
| Perfil alimentario | Vegana los lunes, el resto flexible |
| Motivación en Carta | Lo comparte en TikTok, le encanta el AR, quiere saber calorías |
| Disposición a pagar | No pagará Premium — pero genera contenido viral |
| Frase que la define | "Espera, déjame grabarlo antes de que lo quites" |

**Comportamiento clave:** Valentina es el motor de distribución orgánica. Va a generar UGC (user-generated content) al grabar la experiencia AR y compartirla. No es quien paga, pero es quien trae a los que pagan.

---

### 3.2 Restaurantero — Persona de Compra (B2B Customer)

#### Persona E: "Chef Andrés" — Dueño de Restaurante Premium

| Atributo | Detalle |
|----------|---------|
| Edad | 42 años |
| Ciudad | CDMX (Polanco) |
| Tipo de restaurante | Cocina mexicana contemporánea, 45 asientos, ticket promedio $650 MXN |
| Empleados | 18 (cocina + sala + admin) |
| Tech actual | POS Toast, Instagram para marketing, menú QR con Canva → PDF |
| Ingreso mensual del restaurante | ~$1.2M MXN |
| Pain points | No sabe qué platillos se ven pero no se piden, gasta $3K/mes en fotografía y aún así el menú no convence, los meseros pierden 5 min por mesa explicando platillos |
| Motivación en Carta | Mostrar su cocina de forma que haga justicia al trabajo del equipo, datos sobre qué funciona y qué no, reducir dependencia del mesero para "vender" platillos |
| Presupuesto tech | $5,000–$10,000 MXN/mes sin problema si demuestra ROI |
| Frase que lo define | "Mi cochinita está increíble pero nadie la pide porque el nombre no les dice nada" |

**Ciclo de venta:** Chef Andrés decidirá en 1–2 reuniones. Quiere ver demo con sus propios platillos. Si ve que el 3D captura bien su presentación, firma. Es el early adopter perfecto y su restaurante se convierte en caso de estudio.

#### Persona F: "Mariana" — Gerente de Cadena Regional

| Atributo | Detalle |
|----------|---------|
| Edad | 38 años |
| Rol | Directora de operaciones de cadena con 12 sucursales en Jalisco |
| Tipo de restaurante | Fast casual, ticket promedio $180 MXN |
| Pain points | Actualizar menú en 12 ubicaciones es un caos, cada sucursal tiene su propia versión del menú digital, no tiene datos centralizados de qué se vende dónde |
| Motivación en Carta | Un solo dashboard para todas las sucursales, actualizar precios y platillos en tiempo real, analytics comparativos entre ubicaciones |
| Presupuesto | Plan Enterprise, negociación por volumen |
| Frase que la define | "Cambié el precio del guacamole ayer y todavía hay 3 sucursales con el precio viejo" |

**Ciclo de venta:** 3–6 meses, involucra a dirección general. Necesita piloto en 2–3 sucursales antes de roll-out. Revenue alto pero ciclo largo.

---

### 3.3 Chef — Curador de Contenido

#### Persona G: "Chef Paola" — Chef Ejecutiva

| Atributo | Detalle |
|----------|---------|
| Edad | 35 años |
| Rol | Chef ejecutiva en restaurante de Persona E |
| Motivación en Carta | Que su "Top 3 del Chef" sea lo primero que vean los comensales, que el menú refleje su visión creativa, que los datos le digan qué platillos reformular |
| Interacción con Carta | Selecciona los 3 platillos destacados cada día/semana desde el admin panel, sube notas del chef y maridajes |
| Frase que la define | "Yo sé cuáles son mis mejores platillos — ahora necesito que los comensales también lo sepan" |

**Rol en el producto:** Chef Paola es quien da alma al "Top 3 del Chef" que aparece en la landing AR. Su curaduría humana es lo que diferencia Carta de un algoritmo frío.

---

### 3.4 Partners Estratégicos — Ecosistema Extendido

#### Proveedores POS (Toast, Square, Aloha)
Carta no reemplaza al POS — se integra. La API de Carta sincroniza el catálogo de platillos y eventualmente envía la orden confirmada al POS existente. Esto reduce la barrera de adopción: el restaurante no tiene que cambiar su infraestructura.

#### Influencers Gastronómicos
Los food bloggers e influencers de TikTok/Instagram se convierten en amplificadores naturales. Carta puede ofrecer un programa de embajadores donde el influencer tenga un link de referencia que le da al restaurante 1 mes gratis y al influencer una comisión o crédito.

#### Fotógrafos / Estudios 3D
El servicio de captura 3D de platillos se puede tercerizar a fotógrafos gastronómicos existentes, capacitándolos en fotogrametría. Esto crea un ecosistema de "Carta Certified Photographers" que ganan por proyecto.

#### Proveedores de Alimentos
Marcas como Coca-Cola, Bimbo, o cerveceras artesanales pueden patrocinar visibilidad dentro de Carta (ej: "Maridaje sugerido: Corona Extra" junto a un platillo de mariscos). Esto abre un revenue stream de advertising B2B2B.

---

## 4. Justificación de Negocio

### 4.1 El Timing es Ahora — Convergencia de Factores

**Infraestructura móvil lista:** La penetración de smartphones en LATAM alcanza el 70% de la población, con 5G creciendo 64% interanual en México (16.2M suscripciones 5G en 2024). WebAR (AR sin app nativa) ya funciona fluidamente en la mayoría de dispositivos modernos.

**Comportamiento post-pandemia consolidado:** El 75% de los restaurantes full-service en EE.UU. ya adoptaron menús QR (2025). En México la tendencia es similar. Los comensales ya están condicionados a sacar el teléfono en la mesa — Carta simplemente mejora lo que ya hacen.

**Insatisfacción con el statu quo:** Los menús QR actuales son PDFs glorificados. El 78% de los consumidores prefieren menús QR sobre papel (Eater), pero la experiencia actual es mediocre. Hay un gap enorme entre la expectativa (algo como Airbnb o Instagram) y la realidad (un PDF en el teléfono).

**AR probada en food:** Un estudio de Kabaq + Bareburger demostró que ver platillos en AR aumentó las ventas de postres en 25% y las ventas generales en 22%. Una investigación de Washington State University (2026) confirmó que los menús AR incrementan significativamente el interés del cliente en visitar el restaurante y generan word-of-mouth positivo.

**Pain points del restaurante son reales:** El 24% de los operadores en 2025 identificó la inflación como su principal desafío (Toast), con 30% preocupados por la confiabilidad de sus sistemas tech y 26% por problemas de integración con POS. Carta entra como solución que no reemplaza sino que complementa.

### 4.2 Modelo de Revenue — Tres Capas

| Capa | Quién paga | Precio | Revenue stream |
|------|-----------|--------|----------------|
| **B2B — Plan Gratis** | Restaurante | $0 | Menú digital básico, branding Carta, máx. 20 platillos. Genera datos y volumen. |
| **B2B — Plan Pro** | Restaurante | $349 MXN/mes (~USD $20) | Analytics, platillos ilimitados, personalización de tema, sin branding Carta, QR/NFC personalizados, soporte prioritario |
| **B2B — Plan Enterprise** | Cadena/franquicia | Negociado (desde $2,500 MXN/mes) | Multi-sucursal, API, dashboard centralizado, SLA, onboarding dedicado |
| **B2C — Premium** | Comensal | $29 MXN/mes (~USD $1.70) | Recomendaciones AI personalizadas (Gemma), historial cross-restaurante, perfil alimentario avanzado, sin ads |
| **B2B2B — Advertising** | Marcas / proveedores | CPM/CPC | Platillos destacados patrocinados, maridajes sugeridos, banners contextuales |

### 4.3 Unit Economics Proyectados

| Métrica | Valor estimado | Benchmark industria |
|---------|---------------|-------------------|
| ARPU B2B (blended) | ~$250 MXN/mes ($14 USD) | Restaurant SaaS: $20–$200 USD/mes |
| ARPU B2C Premium | $29 MXN/mes ($1.70 USD) | Consumer subscription: $1–$10 USD/mes |
| CAC B2B (estimado) | ~$2,000 MXN ($115 USD) | SaaS SMB: $100–$500 USD |
| LTV B2B (18 meses avg) | ~$4,500 MXN ($260 USD) | — |
| LTV:CAC ratio | ~2.3x | Saludable: >3x (meta año 2) |
| Churn mensual target | <5% | B2B SaaS promedio: 3.5% (2025) |
| Payback period | ~8 meses | SaaS benchmark: 6–18 meses |

**Nota:** Los unit economics mejorarán significativamente con el plan Enterprise (ARPU alto, churn bajo) y el revenue de advertising (margen ~90%).

> **Corregido el 19 de septiembre de 2026.** Con el mercado ajustado a 59,296 restaurantes en lugar de 736 mil, un ARPU de ~$250 MXN al mes ya no basta para sostener el caso: **el precio tiene que subir o el negocio no cierra**. Hay con qué defenderlo — el cliente objetivo es 3.3 veces más productivo que el negocio promedio del sector y tiene 44.9% de rentabilidad —, pero el cálculo debe hacerse sobre 59 mil clientes potenciales, no sobre 736 mil. Además, el modelo vigente del producto es **gratuito de base con publicidad**, con funciones que se desbloquean al pagar; por lo tanto el ingreso por restaurante depende de la tasa de conversión a pago y del ingreso publicitario por mesa atendida, no de un precio de lista. Ambos están en medición.

### 4.4 Ventajas Competitivas Defendibles

**Red de datos (network effect):** Cada comensal que usa Carta genera datos de preferencia que mejoran las recomendaciones para todos los comensales en todos los restaurantes. Más restaurantes → más datos → mejores recomendaciones → más comensales → más restaurantes. Este flywheel es difícil de replicar.

**Contenido 3D como moat:** Los modelos 3D de platillos son costosos y lentos de producir. Una vez que un restaurante tiene 50+ platillos digitalizados en Carta, el switching cost es alto — no van a re-hacer ese trabajo en otra plataforma.

**Localización profunda:** Construido desde y para LATAM. Nombres de platillos en español, integración con sistemas de pago locales (SPEI, CoDi), entendimiento cultural de la gastronomía mexicana. Un competidor de EE.UU. tendría que localizar desde cero.

**AI on-device con Gemma:** Las recomendaciones corren con Gemma localmente, sin enviar datos personales a la nube. Esto es un diferenciador de privacidad y reduce costos de servidor.

---

## 5. Landscape Competitivo

### 5.1 Competidores Directos — AR + Menú Digital

| Competidor | País | Qué hace | Diferenciador vs. Carta |
|-----------|------|----------|------------------------|
| **Kabaq / QReal** | EE.UU. | App nativa para ver platillos en AR. Requiere descarga. | Carta es WebAR (sin descarga). Kabaq no tiene sesiones grupales, analytics, ni B2C Premium. Enfoque EE.UU., sin presencia LATAM. |
| **JARIT** | España | Menú AR web. Scan QR → ve platillos en 3D. | Similar en concepto, pero sin personalización AI, sin sesiones grupales, sin modelo B2C. Enfoque Europa. |
| **Reality Menu** | EE.UU. | AR menu delivery system para restaurantes. | Enfocado en la entrega del menú AR, no en la experiencia completa del comensal. Sin analytics profundos ni modelo freemium. |
| **AR Code** | Internacional | Plataforma genérica de AR (no solo food). QR → objeto 3D. | Herramienta genérica, no vertical de restaurantes. Sin features de menú, órdenes, o analytics gastronómicos. |

### 5.2 Competidores Indirectos — Menú Digital sin AR

| Competidor | País | Qué hace | Diferenciador vs. Carta |
|-----------|------|----------|------------------------|
| **Popmenu** | EE.UU. | Plataforma de marketing + menú digital con fotos interactivas. | Sin AR, sin sesiones grupales. Fuerte en marketing, débil en experiencia in-restaurant. Pricing más alto ($149–$399 USD/mes). |
| **BentoBox** | EE.UU. | Website builder + menú digital para restaurantes. | Enfocado en presencia web, no en experiencia in-situ. Sin AR, sin orden grupal, sin analytics de comportamiento en mesa. |
| **Toast** | EE.UU. | POS completo + Mobile Order & Pay vía QR. | Full stack POS — Carta no compite sino que se integra. Toast no tiene AR ni personalización AI. |
| **MenuTiger / UpMenu** | Global | QR menu builders SaaS económicos. | Commoditized: menús QR simples, sin AR, sin 3D, sin analytics avanzados. Compiten en precio, no en experiencia. |
| **Choice QR / TableQR** | Global | Menú QR + orden digital. | Similar a MenuTiger. Funcional pero genérico. Carta diferencia por experiencia premium + AR + datos. |

### 5.3 Competidores Potenciales — Gigantes que Podrían Entrar

| Actor | Riesgo | Por qué no han entrado |
|-------|--------|----------------------|
| **Google** | Medio | Tiene AR (ARCore), Maps, y data de restaurantes. Pero Google no opera verticales SaaS para restaurantes. Su juego es data y ads, no product experience. |
| **Apple** | Bajo | Tiene ARKit y el hardware más potente. Pero Apple no construye software vertical B2B. Posible partner, no competidor. |
| **Uber Eats / Rappi** | Alto | Ya tienen la relación con restaurantes y comensales. Pero su modelo es delivery, no dine-in. Entrar a dine-in canibaliza su negocio de delivery. |
| **iFood (Brasil)** | Medio | Líder en delivery LATAM. Podría expandir a dine-in. Pero su core es logística, no experiencia en mesa. |

### 5.4 Mapa de Posicionamiento

```
                        EXPERIENCIA INMERSIVA (AR/3D)
                                  ↑
                                  |
                    Kabaq/QReal   |   ★ CARTA ★
                    JARIT         |
                    Reality Menu  |
                                  |
    SOLO RESTAURANTE ─────────────┼──────────── ECOSISTEMA COMPLETO
    (una función)                 |             (comensal + restaurante + datos)
                                  |
                    MenuTiger     |   Popmenu
                    UpMenu        |   BentoBox
                    Choice QR     |   Toast (POS)
                                  |
                                  ↓
                        MENÚ ESTÁTICO (PDF/lista)
```

Carta ocupa el cuadrante superior derecho: experiencia inmersiva + ecosistema completo. Ningún competidor actual ocupa ese espacio.

### 5.5 Corrección de septiembre de 2026 — la competencia real en México

Las secciones 5.1 a 5.4 listan nueve competidores de Estados Unidos, España o globales, y **ninguno de los sistemas que un restaurante mexicano tiene instalado hoy**. Una investigación sobre los sitios oficiales de cada empresa, hecha el 19 de septiembre de 2026, encontró lo siguiente.

| Sistema | ¿Ya hace menú QR y orden en mesa? | Precio publicado | ¿Acepta que un sistema externo le registre una orden? |
|---|---|---|---|
| **Soft Restaurant** (National Soft) | **Sí, los tres.** Su módulo e-Menu QR deja al comensal ver el menú, ordenar y pagar desde su celular | $799 a $1,099 MXN/mes + IVA | **No.** Su conexión pública sirve para entregar el menú, no para recibir órdenes |
| **Fudo** | **Sí.** «Pedido desde la mesa con Carta QR» desde su plan intermedio | $360 · $690 · $1,050 MXN/mes | **Sí**, solo en el plan más caro |
| **Parrot Software** | Parcial: vende autofacturación por QR, no menú para el comensal | Sin precio público | Solo lectura |
| **Wansoft** (by Clip) | Parcial: comandero móvil y cobro con terminal | Sin precio público | Sin documentación pública |
| **Oracle Simphony** | Vía socios; es el sistema de hoteles y cadenas | Sin precio público en México | **Sí**, la conexión más completa del mercado |
| **Last.app** | Sí, con menú QR y pedido en mesa. Entró a México en 2025 | $1,000 a $2,900 MXN/mes por sucursal | — |
| **Toast** | **No opera en México.** Sus mercados son EE.UU., Canadá, Irlanda y Reino Unido | No aplica | No aplica |

**Lo que cambia con esto:**

1. La afirmación de que «ningún competidor en LATAM ofrece esta combinación» **es falsa en la parte de menú QR, orden y pago en mesa**, y sigue siendo cierta en 3D/AR y en la orden compartida.
2. **Toast, Square y Aloha no sirven como socios de integración** para un piloto en México: el primero no opera aquí.
3. **El menú QR no es un producto vendible:** es gratis en al menos cinco lugares, incluido un generador que regala Soft Restaurant.
4. **El diferenciador defendible es la orden compartida.** Sunday, Getnet y Yumminn dividen la cuenta *al pagar*; ninguna plataforma revisada la construye *al pedir*.
5. **Las apps de reparto no están en la mesa.** Ni Rappi, ni DiDi Food, ni Uber Eats tienen hoy producto activo de menú, orden o pago en mesa en México, así que el riesgo «Alto» que les asigna §5.3 está sobrestimado en el corto plazo.
6. **Kabaq ya no compite:** se renombró QReal, pertenece a The Glimpse Group y se movió a moda, lujo y automotriz.

**Y sobre las cifras de realidad aumentada que aparecen en §4.1 y §6.3:** el «+22% en ventas» no es de Bareburger sino de un wine bar de Nueva York, difundido por el propio proveedor; el «+25% en postres» proviene de un estudio hecho por Kabaq, es decir, por quien vendía la tecnología; y el estudio de Washington State University midió **intención de visitar y de recomendar** en un experimento simulado, no ventas. **No existe evidencia pública, independiente y verificable de que un menú en 3D suba el ticket promedio.** El piloto de Carta sería la primera medición seria, y por eso vale la pena hacerla con grupo de control.

---

## 6. Datos de Mercado que Sustentan el Proyecto

### 6.1 Mercado de Restaurant Tech

El mercado global de restaurant technology fue valuado en USD $25.6B en 2024 y se proyecta alcanzar USD $46.5B para 2032 (CAGR 7.95%).

> **Corregido el 19 de septiembre de 2026.** Este párrafo decía que «el 65% de los restaurantes ya adoptó sistemas POS integrados, y el 78% usa alguna forma de software POS». Esas cifras son globales o de Estados Unidos y no describen a México. **No existe una medición pública de penetración de punto de venta en restaurantes mexicanos.** El dato oficial mexicano más cercano apunta en dirección contraria: solo el **22.3% de las microempresas usa equipo de cómputo** (INEGI, Censos Económicos 2024) y 96 de cada 100 negocios restauranteros son microempresas. Para Carta eso es una ventaja y no un obstáculo: corre en teléfono y tableta, y solo el capitán y la administración tienen versión de escritorio — el restaurante no necesita comprar una computadora para usarla. El 26% de los operadores planea implementar nuevos sistemas de tecnología en 2025, un incremento de 7 puntos porcentuales respecto a 2023 — la disposición a invertir en tech está en su punto más alto.

Fuentes: [Business Research Insights](https://www.businessresearchinsights.com/market-reports/restaurant-technology-market-118085), [Restroworks](https://www.restroworks.com/blog/restaurant-technology-industry-statistics/)

### 6.2 Menús QR y Digitales

El mercado de plataformas de menú QR alcanzó USD $1.13B en 2024, con CAGR de 16.9% hasta 2033. El mercado de Smart Contactless Menus fue valuado en USD $1.5B en 2024 con proyección a USD $5B para 2032 (CAGR 20%). El 75% de restaurantes full-service en EE.UU. ya adoptó menús QR, con un incremento del 150% en adopción en los últimos dos años. El 78% de los consumidores prefiere menús QR sobre menús de papel.

Fuentes: [MenuTiger](https://www.menutiger.com/blog/qr-code-menu-forecast), [FutureDataStats](https://www.futuredatastats.com/smart-contactless-menus-market), [QR Code Chimp](https://www.qrcodechimp.com/qr-code-statistics/)

### 6.3 AR en Food & Beverage

El mercado global de AR fue valuado en USD $93.67B en 2024 y se espera que alcance USD $140.34B en 2025. Para 2025, aproximadamente 4.3 mil millones de consumidores globales usarán AR de forma frecuente. Un estudio de Kabaq + Bareburger demostró un aumento del 22% en ventas generales y 25% en ventas de postres al implementar visualización AR de platillos. Un estudio de Washington State University (publicado febrero 2026) confirmó que los menús AR incrementan significativamente el interés en visitar el restaurante y generan word-of-mouth positivo. El 22% de los operadores de restaurantes planea destinar recursos a AR para entrenamiento o campañas de marketing.

Fuentes: [TechXplore / WSU Study](https://techxplore.com/news/2026-02-augmented-reality-menus-restaurants-customers.html), [SIGEP](https://www.sigep.it/en/news-detail/AR-augmented-reality?newsId=1298334), [AppInventiv](https://appinventiv.com/blog/ar-vr-in-food-and-beverages/)

### 6.4 México y LATAM

México registra **740,231** establecimientos de alimentos y bebidas (DENUE, corte de **mayo de 2026**), con los estados de mayor concentración en Estado de México (89,408), CDMX (55,753) y Jalisco (48,957). De esos, los **restaurantes de servicio completo —el mercado de Carta— son 59,296 en el país y 8,142 en la Ciudad de México** (INEGI, Censos Económicos). El mercado foodservice de México fue valuado en USD $41.28B (2024) con proyección a USD $92.48B para 2034 (CAGR 8.4%).

> **Corregido el 19 de septiembre de 2026.** La versión anterior citaba 736,367 establecimientos (corte de mayo de 2025) y **3.8 millones de empleos**. Esa cifra de empleo no concuerda con la fuente oficial: el INEGI, junto con la CANIRAC, reporta **poco más de 2 millones** de empleos en la industria restaurantera, equivalentes al 7.5% del empleo del país, y que **96 de cada 100 unidades del sector son microempresas**, que dan trabajo a 70 de cada 100 personas ocupadas en él.

Dentro de la Ciudad de México, cuatro alcaldías concentran el **53%** de los restaurantes de servicio completo: Cuauhtémoc (1,944), Benito Juárez (1,041), Miguel Hidalgo (828) y Coyoacán (538). Benito Juárez es donde la proporción es más alta: el 28.5% de sus establecimientos de alimentos son de servicio completo, contra el 15.1% del promedio de la ciudad.

En LATAM, el mercado QSR fue valuado en USD $94.61B (2025) con proyección a USD $182.80B para 2032 (CAGR 9.87%). El mercado de Digital Transformation en LATAM alcanza USD $107.23B (2025) con CAGR de 17.69%.

La penetración de smartphones en México sigue en aumento sostenido, con 5G creciendo 64% interanual (16.2M suscripciones en 2024). La penetración de internet móvil se proyecta en ~60% para 2029. El mercado de smartphones en LATAM fue valuado en USD $47.60B (2025).

Fuentes: [DENUE / Data México](https://www.economia.gob.mx/datamexico/en/profile/industry/restaurants-and-other-eating-places), [Expert Market Research](https://www.expertmarketresearch.com/reports/mexico-food-service-market), [Fortune Business Insights](https://www.fortunebusinessinsights.com/latin-america-and-caribbean-quick-service-restaurants-market-108600), [GSMA Mobile Economy LATAM 2025](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-economy/latam/)

### 6.5 Pain Points Validados

Los principales dolor points del restaurantero en 2025, según Toast y QSR Magazine: inflación y costos crecientes (24% lo identifican como su dolor #1, +9pts vs 2024), escasez de personal, dificultad para integrar múltiples sistemas tech (26%), preocupación por confiabilidad de sistemas (30%), y altos costos iniciales de tecnología (29%). Los restaurantes que adoptan pagos y órdenes QR experimentan un incremento del 15% en rotación de mesas y más del 50% de ahorro en costos de impresión.

Fuentes: [Toast — State of the Restaurant Industry 2025](https://pos.toasttab.com/blog/on-the-line/state-of-the-restaurant-industry-2025), [QSR Magazine](https://www.qsrmagazine.com/growth/fast-casual/14-restaurant-leaders-on-the-trends-challenges-and-opportunities-of-2025/)

---

## 7. Estrategia de Adopción por Fases

### Fase 0: Validación (Meses 1–3)
**Objetivo:** Confirmar product-market fit con 5–10 restaurantes piloto.
**Target users:** Chef Andrés (Persona E) × 5–10 en CDMX.
**Modelo:** 100% gratis. Carta hace el onboarding, captura 3D de 10–15 platillos por restaurante, instala QR en mesas.
**Métricas de éxito:** ≥100 escaneos/semana por restaurante, tasa de orden ≥60% (del que escanea, cuántos ordenan), NPS ≥50, al menos 1 restaurante dispuesto a pagar al final del piloto.
**Users activos:** Comensales (Personas A–D) llegan orgánicamente por los QR en las mesas.

### Fase 1: Lanzamiento México — Premium Cities (Meses 4–12)
**Objetivo:** 150–300 restaurantes, primeros ingresos B2B.
**Estrategia de adquisición B2B:**
Convertir pilotos exitosos en casos de estudio con datos reales ("Restaurante X vio +22% en ventas de platillos destacados"). Outbound a restaurantes premium en Polanco, Condesa, Roma, Santa Fe (CDMX), San Pedro (Monterrey), Providencia (GDL). Programa de referidos: restaurante que refiere otro restaurante recibe 1 mes Pro gratis. Partnerships con asociaciones restauranteras (CANIRAC).
**Estrategia de adquisición B2C:**
Orgánica — el comensal descubre Carta al escanear el QR en la mesa. Viralidad de AR: el efecto "wow" genera compartidos en redes. Programa de referidos: comensal que invita a otro recibe 1 mes Premium gratis. Influencer seeding: 20–30 food influencers en CDMX, MTY, GDL prueban la experiencia y publican contenido.

### Fase 2: Escala Nacional + B2C Premium (Meses 12–24)
**Objetivo:** 500+ restaurantes, 5,000+ comensales Premium.
**Expansión geográfica:** Ciudades turísticas (Cancún, Los Cabos, Riviera Maya, Oaxaca, San Miguel de Allende) — alto volumen de turistas que valoran información visual. Puebla, Querétaro, Mérida — ciudades con escena gastronómica en crecimiento.
**Producto:** Lanzamiento de B2C Premium ($29 MXN/mes) con recomendaciones AI. Plan Enterprise para cadenas regionales (Persona F). Integración con POS (Toast, Square) para sincronización de catálogo.

### Fase 3: LATAM (Meses 24–36)
**Objetivo:** 1,500+ restaurantes en 4+ países.
**Mercados prioritarios:** Colombia (Bogotá, Medellín) — escena gastronómica vibrante, alta penetración móvil. Chile (Santiago) — mercado premium, alto ingreso per cápita. Argentina (Buenos Aires) — cultura gastronómica fuerte, pero volatilidad monetaria (modelo en USD). Perú (Lima) — capital gastronómica de LATAM.
**Estrategia:** Partner local en cada país (distribuidor, aceleradora, o asociación restaurantera). Localización del producto (moneda, idioma regional, platillos típicos). Replicar el playbook de México: piloto → casos de estudio → escala.

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Baja adopción de AR por comensales (prefieren menú sin cámara) | Media | Alto | Carta funciona igual de bien sin AR — el menú digital con fotos/3D en pantalla es la experiencia por defecto. AR es el diferenciador, no la dependencia. |
| Costo alto de captura 3D por platillo | Alta | Medio | Automatizar con fotogrametría móvil (iPhone LiDAR). Ofrecer servicio de captura como parte del onboarding. A largo plazo: generación AI de modelos 3D a partir de fotos 2D. |
| Restaurantes no ven ROI suficiente | Media | Alto | Dashboard de analytics que muestre métricas concretas (vistas, clics, conversiones, comparativo con/sin Carta). Período de prueba gratuita de 30 días con datos reales. |
| Competidor grande entra al mercado (Uber Eats, iFood) | Baja–Media | Alto | First-mover advantage en LATAM. Profundizar moat de contenido 3D y datos. Moverse rápido a Enterprise para lock-in. |
| Problemas de privacidad con datos de comensales | Baja | Alto | Gemma corre on-device (datos no salen del teléfono). No almacenamos IP real (solo hash). Compliance con leyes de datos mexicanas (LFPDPPP). |
| Conectividad pobre en restaurantes | Media | Medio | PWA con cache agresivo. Modelos 3D pre-cargados. Funciona offline después de la carga inicial. |

---

## 9. Métricas Clave de Éxito

### Para Comensales (B2C)
Escaneos totales por mes, porcentaje que activa AR vs. menú estático, tasa de conversión (escaneo → orden), tiempo promedio en menú, platillos vistos en 3D por sesión, NPS del comensal, tasa de conversión a Premium, retención mensual de Premium.

### Para Restaurantes (B2B)
Restaurantes activos (con ≥10 escaneos/semana), churn mensual, ARPU, expansión de revenue (upgrade gratis → Pro → Enterprise), ticket promedio antes vs. después de Carta, aumento en ventas de platillos destacados, reducción en tiempo de explicación del mesero.

### Para el Negocio
MRR (Monthly Recurring Revenue), ARR, burn rate, runway, LTV:CAC ratio, payback period, gross margin.

---

## 10. Conclusión

Carta no es "otro menú QR." Es la primera plataforma en LATAM que combina visualización AR de platillos, personalización AI, y sesiones grupales de orden en una experiencia que transforma el momento de elegir comida. El mercado está maduro (75% ya escanea QR), la tecnología está lista (WebAR + 5G), los comensales lo demandan (78% prefiere digital), y los restaurantes necesitan desesperadamente herramientas que generen ROI real. Con un TAM de USD $27B, un SAM LATAM de USD $10B, y un competidor directo que ocupe el cuadrante "inmersivo + ecosistema completo" = cero, la pregunta no es si hay espacio para Carta, sino qué tan rápido puede escalar.
