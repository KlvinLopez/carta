# Smart Menu — Documento de Ideacion y Definicion del Proyecto

**Version:** 1.0
**Fecha:** 3 de abril de 2026
**Autor:** Calvin
**Estado:** Ideacion / Pre-MVP

---

## 1. Declaracion del Problema

### El problema que resolvemos

En pleno 2026, la experiencia de elegir que comer en un restaurante sigue siendo fundamentalmente la misma que hace 30 anos. Ya sea un menu fisico o un codigo QR que abre un PDF o pagina web estatica, el comensal enfrenta los mismos problemas:

**Para el comensal:**
- Sobrecarga de opciones sin forma de filtrar o priorizar
- Cero personalizacion: el menu ignora alergias, dietas, restricciones religiosas o preferencias personales
- Falta de informacion visual real: no se sabe como luce el platillo, que tamano tiene la porcion, o como esta presentado
- Dependencia del mesero para resolver dudas sobre ingredientes o alergenos
- No existe memoria entre visitas ni entre restaurantes: cada vez se empieza de cero

**Para el restaurante:**
- No tienen datos sobre que buscan sus clientes o por que no ordenan ciertos platillos
- El menu no comunica sus mejores platillos de forma efectiva
- Digitalizar el menu actual (QR) no agrego valor real, solo cambio el formato

### Por que importa

Los codigos QR para menus fueron una solucion de emergencia durante la pandemia que se quedo por inercia, no por merito. Representan una oportunidad perdida: tenemos los celulares mas poderosos de la historia en cada mesa y los usamos para mostrar un PDF. Smart Menu propone que esos mismos celulares se conviertan en la interfaz inteligente entre el comensal y la cocina.

---

## 2. Vision del Producto

**Smart Menu** es una plataforma open source que transforma la experiencia de elegir comida en restaurantes mediante menus inteligentes, personalizados y visualmente inmersivos.

**Mision:** Que ningun comensal vuelva a sentirse perdido frente a un menu. Que cada restaurante pueda ofrecer una experiencia de seleccion moderna sin necesidad de un equipo de tecnologia.

**Destino:** Reemplazar los menus tradicionales y QR estaticos a nivel nacional (Mexico) y eventualmente global, convirtiendose en la infraestructura abierta estandar para menus digitales inteligentes.

---

## 3. Arquitectura de Dos Capas (Clave para la Adopcion)

El diseno de Smart Menu se basa en una estrategia de dos capas que minimiza la friccion de adopcion:

### Capa 1: Experiencia Web Instantanea (Sin instalacion)

**Acceso:** El comensal escanea un codigo QR en la mesa con la camara de su celular. Se abre una web app directamente en el navegador.

**Lo que obtiene sin instalar nada:**
- Menu visual mejorado y personalizado por el restaurante (colores, branding, categorias)
- Top 3 platillos mas vendidos o recomendados por la casa
- Visualizacion AR de platillos en 3D usando `<model-viewer>` de Google (funciona nativamente en Safari/iOS via AR Quick Look y en Chrome/Android via Scene Viewer, sin instalar nada)
- Filtros basicos: tipo de platillo, rango de precio, vegetariano/vegano
- Informacion de alergenos e ingredientes por platillo

**Tecnologia clave:** `<model-viewer>` de Google permite experiencias AR directamente en el navegador movil sin ninguna app. El usuario toca un boton, se abre la camara, y ve el platillo en 3D sobre su mesa.

**Propuesta de valor:** Incluso sin registrarse, la experiencia ya es drasticamente superior a cualquier QR actual. Esto genera el "wow factor" que impulsa el boca a boca.

#### Nota tecnica: `<model-viewer>` vs Three.js

Estas dos tecnologias no son competencia sino capas complementarias:

| | `<model-viewer>` | Three.js |
|--|-------------------|----------|
| **Que es** | Web component de Google (construido SOBRE Three.js) | Libreria 3D de bajo nivel para la web |
| **Complejidad** | Una linea de HTML: `<model-viewer src="taco.glb" ar>` | Requiere cientos de lineas: escena, camara, renderer, luces, controles |
| **AR nativo** | Si. Usa AR Quick Look (iOS) y Scene Viewer (Android) automaticamente | Requiere implementar WebXR manualmente, con soporte limitado en iOS |
| **Curva de aprendizaje** | Minima. Si sabes HTML, lo usas en 5 minutos | Alta. Necesitas entender graficos 3D, shaders, geometria |
| **Personalizacion** | Limitada a lo que el componente expone (suficiente para mostrar platillos) | Total. Animaciones custom, efectos, escenas interactivas, iluminacion avanzada |
| **Rendimiento** | Optimizado para un solo modelo. Ligero | Maneja escenas complejas con multiples objetos |
| **Caso de uso Smart Menu** | Fases 1-3: mostrar platillos en AR, rotar, zoom | Fase 4+: experiencias inmersivas (ej. recorrido virtual del restaurante, animaciones de preparacion) |

**Decision para Smart Menu:** Empezar con `<model-viewer>` en las primeras fases. Es la opcion correcta porque: funciona sin instalar nada, el soporte AR es nativo en ambas plataformas moviles, la implementacion es trivial (ideal para dev solo), y cubre el 95% del caso de uso (ver un platillo en 3D). Three.js se reserva como evolucion futura si se necesitan experiencias mas elaboradas — y la migracion es natural porque `<model-viewer>` ya usa Three.js internamente.

### Capa 2: Experiencia Personalizada (Con registro/app)

**Acceso:** Desde la experiencia web, se invita al usuario a registrarse (o instalar la PWA) para desbloquear funciones avanzadas.

**Lo que obtiene al registrarse:**
- Perfil de alimentacion: alergias, intolerancias, dietas (keto, vegana, sin gluten, etc.), restricciones religiosas (halal, kosher), indicaciones de nutriologo
- Filtrado inteligente automatico: el menu se adapta al perfil, resaltando platillos seguros y ocultando o senalando los que contienen alergenos
- Asistente IA conversacional: "Tengo antojo de algo picante pero ligero" y la IA recomienda del menu actual con base en ingredientes y preparacion
- Historial entre restaurantes: la IA aprende de lo que has pedido antes en otros establecimientos para mejorar recomendaciones
- Favoritos y notas personales por platillo

**Privacidad:** Los datos del perfil pertenecen al usuario. No se venden. El modelo de datos se puede disenar para que los datos sensibles se almacenen localmente en el dispositivo (on-device) y solo se compartan los minimos necesarios con el servidor para generar recomendaciones.

---

## 4. Funcionalidades Clave (Feature Map)

### 4.1 Para el Comensal

| Feature | Capa | Prioridad MVP |
|---------|------|---------------|
| Menu visual mejorado con branding del restaurante | 1 | v0.1 |
| Informacion de ingredientes y alergenos por platillo | 1 | v0.1 |
| Top 3 recomendados / mas vendidos | 1 | v0.1 |
| Filtros basicos (categoria, precio, dieta) | 1 | v0.2 |
| Modelos 3D de platillos con AR | 1 | v0.2 |
| Perfil de alimentacion personal | 2 | v0.3 |
| Filtrado inteligente con base en perfil | 2 | v0.3 |
| Asistente IA conversacional | 2 | v1.0 |
| Historial entre restaurantes | 2 | v1.0 |

### 4.2 Para el Restaurante

| Feature | Prioridad MVP |
|---------|---------------|
| Panel web para gestionar menu (CRUD platillos) | v0.1 |
| Subida de fotos por platillo | v0.1 |
| Etiquetado de ingredientes y alergenos | v0.1 |
| Personalizacion visual (logo, colores, categorias) | v0.2 |
| Generacion AI de modelos 3D a partir de fotos | v0.2 |
| Importacion de modelos 3D propios | v0.2 |
| Dashboard de analytics basico | v0.3 |
| Conexion con marketplace de artistas 3D | v1.0 |

---

## 5. Roadmap por Versiones

### Fase 1 — "El Menu que Si Sirve"

**Objetivo:** Demostrar que un menu digital puede ser drasticamente mejor que un QR actual. Validar con 1-3 restaurantes reales.

**Criterio para avanzar:** Al menos 1 restaurante real usando Smart Menu en sus mesas con retroalimentacion positiva de comensales.

**Alcance:**
- Backend: API REST para restaurantes y menus (CRUD completo)
- Panel restaurante: web app minima para registrar restaurantes, crear platillos con nombre, descripcion, precio, foto, categoria, ingredientes y etiquetas de alergenos
- Menu comensal: web app responsive accesible por QR, con diseno limpio, fotos de platillos, seccion de ingredientes/alergenos, y badge de "Top 3 recomendados"
- Generacion de QR unico por restaurante/mesa
- Repositorio open source publicado en GitHub con README, licencia y guia de contribucion
- Sin login de comensal, sin AR, sin IA

**Entregable:** Un restaurante real usando Smart Menu en sus mesas. Retroalimentacion directa de comensales.

**Metricas de exito:** Escaneos del QR, tiempo en el menu, feedback cualitativo ("fue mejor que el menu normal?")

### Fase 2 — "Ver para Creer"

**Objetivo:** Introducir la experiencia visual inmersiva que diferencia a Smart Menu de cualquier competidor.

**Criterio para avanzar:** Pipeline de 3D funcionando end-to-end (fotos → modelo → AR en navegador) y al menos 5 platillos con modelo 3D en un restaurante piloto.

**Alcance:**
- Integracion de `<model-viewer>` para visualizacion AR en navegador
- Pipeline de generacion de modelos 3D: el restaurante sube 4-6 fotos desde diferentes angulos y se genera un modelo basico usando IA generativa (ej. TripoSR, InstantMesh, o APIs como Meshy/Luma)
- Opcion de subir modelos 3D propios (formatos glTF/GLB)
- Filtros en el menu: categoria, rango de precio, etiquetas dieteticas
- Personalizacion visual del menu por restaurante (logo, paleta de colores)
- Documentacion de deployment self-hosted para que cualquier dev pueda levantar Smart Menu

**Entregable:** Comensales pueden ver platillos en 3D sobre su mesa desde el navegador. Restaurantes pueden personalizar la apariencia de su menu.

**Metricas de exito:** Porcentaje de usuarios que activan AR, engagement con modelos 3D, retroalimentacion de restaurantes sobre el pipeline de 3D.

### Fase 3 — "Tu Menu, Tu Perfil"

**Objetivo:** Introducir la capa personalizada. El menu se adapta al usuario.

**Criterio para avanzar:** Motor de filtrado validado con al menos 3 perfiles de prueba reales (ej. celiaco, vegano, alergico a mariscos) en 2+ restaurantes.

**Alcance:**
- Sistema de registro/login de comensales (auth ligero, posible "Sign in with Apple/Google")
- Perfil de alimentacion: alergias, dietas, restricciones, preferencias
- Motor de filtrado inteligente: los platillos se clasifican como "seguro", "precaucion" o "no recomendado" segun el perfil
- PWA installable para que el usuario "instale" la app desde el navegador sin app store
- Dashboard basico para restaurantes: cuantos escaneos, platillos mas vistos, platillos mas filtrados

**Entregable:** Comensales con perfiles ven menus adaptados. Restaurantes obtienen datos anonimos sobre preferencias.

**Metricas de exito:** Tasa de registro, comensales que reportan "el menu me mostro exactamente lo que podia comer", restaurantes que ajustan su menu con base en datos.

### Fase 4 — "Smart Menu Completo"

**Objetivo:** La experiencia completa con IA conversacional y ecosistema de comunidad.

**Criterio para avanzar:** Esta es la version de lanzamiento publico. Se completa cuando la plataforma es estable, documentada y cualquier persona puede deployarla.

**Alcance:**
- Asistente IA conversacional: el comensal describe su antojo en lenguaje natural y la IA recomienda platillos del menu actual, explicando por que, con base en ingredientes, preparacion y perfil del usuario
- Historial cross-restaurant: recomendaciones mejoran con el tiempo
- Marketplace de artistas 3D: restaurantes pueden solicitar modelos profesionales, artistas verificados los crean, Smart Menu cobra comision
- Smart Menu Cloud: version hosted para restaurantes que no quieren manejar servidores
- Guia completa de deployment, contribucion, y gobernanza del proyecto open source
- CLI o script de instalacion one-command para self-hosting

**Entregable:** Plataforma completa, open source, lista para que cualquier desarrollador o restaurante la adopte. Comunidad activa.

---

## 6. Arquitectura Tecnica Recomendada

### Stack Propuesto

**Backend (tu fortaleza):**
- **Lenguaje:** Node.js con TypeScript (o Python con FastAPI si prefieres — ambos tienen excelente ecosistema para APIs y AI)
- **Base de datos:** PostgreSQL (relacional, robusto, open source, soporte nativo para JSON)
- **Cache:** Redis (para menus frecuentemente accesados, sesiones)
- **ORM:** Prisma (si Node) o SQLAlchemy (si Python)
- **Autenticacion:** Auth.js (NextAuth) o Supabase Auth (soporta Sign in with Apple/Google out of the box)

**Frontend (minimo viable, maximo impacto):**
- **Menu comensal:** Web app con Next.js o Astro — ligera, rapida, SEO-friendly, funciona como PWA
- **Panel restaurante:** Misma tecnologia, area protegida con auth
- **AR:** `<model-viewer>` de Google — es un web component, se integra con una linea de HTML. Funciona en iOS y Android sin app.
- **UI:** Tailwind CSS + shadcn/ui para iterar rapido sin ser experto en frontend

**IA y 3D:**
- **Modelos 3D desde fotos:** TripoSR (open source, ejecutable local) o APIs como Meshy.ai / Luma Genie (mas facil de integrar inicialmente)
- **Asistente conversacional:** API de Claude o GPT con contexto del menu del restaurante (RAG simple sobre los platillos)
- **Motor de recomendacion:** Inicialmente basado en reglas (matching de ingredientes/etiquetas), evolucionando a embeddings semanticos

**Infraestructura:**
- **Hosting:** Railway, Fly.io, o Render (simple para dev solo, escala bien)
- **Almacenamiento:** S3-compatible (Cloudflare R2 es gratis para egress) para fotos y modelos 3D
- **Dominio:** smartmenu.mx (o similar)

### Diagrama de Arquitectura Simplificado

```
[Comensal]                    [Restaurante]
    |                              |
    | (escanea QR)                 | (panel web)
    v                              v
+------------------------------------------+
|           Smart Menu Web App             |
|  (Next.js / Astro — PWA capable)        |
|                                          |
|  - Menu visual + AR (model-viewer)       |
|  - Perfil usuario (Capa 2)              |
|  - Asistente IA (Capa 2)               |
+------------------------------------------+
                |
                v
+------------------------------------------+
|           Smart Menu API                 |
|  (Node.js/Python — REST/GraphQL)         |
|                                          |
|  - CRUD Restaurantes/Menus/Platillos    |
|  - Auth (comensales + restaurantes)     |
|  - Motor de filtrado inteligente        |
|  - Recomendaciones IA                   |
+------------------------------------------+
        |           |           |
        v           v           v
   [PostgreSQL]  [Redis]   [Object Storage]
   (datos)     (cache)    (fotos, modelos 3D)
                                |
                                v
                    [Pipeline 3D AI]
                    (TripoSR / Meshy)
```

---

## 7. Modelo de Negocio

### Filosofia: Open Source como Mision, no como Estrategia de Marketing

Smart Menu no es un SaaS que libera su codigo para parecer transparente. Es un proyecto open source genuino cuyo proposito principal es transformar la experiencia de comer en restaurantes para todos. La meta no es maximizar ingresos sino maximizar adopcion e impacto. El dinero es un medio para sostener el proyecto, no el fin.

El modelo a seguir es mas cercano a OpenStreetMap, Signal, o Blender que a GitLab o Supabase: el proyecto es de la comunidad. Calvin lo inicia, pero el objetivo es que crezca mas alla de una sola persona.

**Principios del modelo open source:**
- 100% de las funcionalidades del core son gratuitas y abiertas, sin features artificialmente limitadas
- Cualquier persona puede deployar Smart Menu completo en su propio servidor sin restricciones
- La licencia sera AGPL-3.0 (obliga a que forks tambien sean open source, protegiendo la comunidad)
- Gobernanza transparente: roadmap publico, decisiones en GitHub Discussions, contribuciones bienvenidas
- Documentacion de primera clase: si no esta documentado, no existe

### Fuentes de Sostenibilidad Economica

Para que el proyecto sobreviva y crezca, necesita ser economicamente sostenible. Estas son las fuentes de ingreso, ordenadas por alineacion con la mision:

**1. Donaciones y Patrocinios (Primaria)**
Modelo tipo Open Collective, GitHub Sponsors, o Ko-fi. Restaurantes que usan Smart Menu gratis y quieren apoyar. Desarrolladores de la comunidad. Empresas que se benefician del ecosistema. Esto es lo mas alineado con la mision: la gente paga porque quiere, no porque tiene que.

**2. Smart Menu Cloud (Hosted)**
Para restaurantes que no quieren (o no saben) manejar servidores. La version self-hosted siempre sera 100% funcional y gratuita. El servicio hosted cobra por la comodidad y el soporte, no por features extra. Precio sugerido: ~$199-299 MXN/mes, accesible para cualquier restaurante en Mexico.

**3. Marketplace de Artistas 3D (Comision)**
Los restaurantes que quieran modelos 3D profesionales pueden contratar artistas verificados a traves de la plataforma. Smart Menu cobra una comision del 15-20% por cada proyecto completado. Esto es opcional: los restaurantes siempre pueden generar modelos con IA o subir los propios gratis. La generacion por IA es gratuita e ilimitada.

**4. Servicios de Onboarding (Opcional)**
Para restaurantes que quieran ayuda para digitalizar su menu, configurar su panel, o tomar las fotos para modelos 3D. Esto se puede delegar a la comunidad (freelancers certificados por Smart Menu) con una comision.

### Por que Open Source es la Unica Opcion Correcta

- **Elimina friccion de adopcion:** No hay barrera de pago para empezar. Cualquier restaurante de cualquier tamano puede usarlo.
- **Escala por la comunidad:** Un dev solo no puede instalar Smart Menu en 10,000 restaurantes. 1,000 devs en la comunidad si.
- **Confianza real en privacidad:** "No vendemos tus datos" es una promesa. Codigo abierto es una prueba verificable.
- **Resiliencia:** Si Calvin se va manana, el proyecto sigue. No depende de una empresa ni de una persona.
- **Efecto de red comunitario:** Cada restaurante que se suma hace la plataforma mas util para todos. Cada dev que contribuye la hace mejor para todos.

---

## 8. Modelo de Privacidad

### Principios

1. **Los datos del usuario son del usuario.** Smart Menu no vende, comparte ni monetiza datos personales.
2. **Minimo necesario.** Solo se recolectan los datos estrictamente necesarios para el funcionamiento.
3. **Transparencia total.** El codigo es open source: cualquiera puede verificar que se hace con los datos.
4. **Local-first cuando sea posible.** El perfil de alimentacion puede almacenarse en el dispositivo y procesarse localmente.

### Implementacion Tecnica

- **Capa 1 (sin registro):** Zero datos personales. No se requiere ni nombre ni email. Analytics anonimos y agregados para restaurantes (ej. "hoy hubo 45 escaneos, el platillo mas visto fue X").
- **Capa 2 (con registro):** Perfil de alergias/dietas almacenado con cifrado. Opcion de almacenamiento local-only donde el filtrado se ejecuta en el dispositivo. Historial de pedidos asociado a un ID anonimo, no a identidad real.
- **Para restaurantes:** Reciben datos agregados y anonimos. Nunca ven perfiles individuales de comensales.

---

## 9. Analisis Competitivo Rapido

| Competidor | Que Hace | Donde Smart Menu es Diferente |
|------------|----------|-------------------------------|
| QR estaticos (iMenuPro, etc.) | PDF/web estatica via QR | Sin personalizacion, sin AR, sin IA, sin filtrado |
| MenuTech | Gestion de menus con alergenos | Solo informacion, no personaliza ni recomienda |
| Bento (AR menus) | AR en menus | App nativa requerida, no open source, no personaliza |
| Google Maps/Yelp | Fotos de comida, reviews | No estan en el momento de decidir en la mesa |

**La diferencia clave de Smart Menu:** Es la unica solucion que combina AR sin instalacion + personalizacion por perfil + IA conversacional + open source. No existe este combo en el mercado.

---

## 10. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| Restaurantes no quieren cargar datos de sus platillos | Alto | UX del panel ultra simple. Ofrecer servicio de onboarding. Importar desde menus existentes con OCR/IA |
| Modelos 3D generados por IA se ven mal | Medio | Comenzar con fotos de alta calidad como fallback. El 3D es un bonus, no un requisito |
| Baja adopcion por comensales | Alto | La Capa 1 no requiere nada del comensal. El wow de AR genera boca a boca |
| Sobrecarga como dev solo | Alto | MVP ultra enfocado. Comunidad open source. No construir todo a la vez |
| Costos de infraestructura al escalar | Medio | Self-hosted es gratis. Hosted usa pricing que cubre costos. Cloudflare R2 sin egress fees |

---

## 11. Proximos Pasos Inmediatos (Semana 1)

1. **Validar el nombre y dominio:** Verificar disponibilidad de "Smart Menu" como marca y dominio (.mx, .com). Considerar alternativas si esta tomado.
2. **Crear repositorio GitHub:** Estructura inicial del monorepo, README, licencia (MIT o AGPL segun estrategia), CONTRIBUTING.md.
3. **Disenar el schema de base de datos v0.1:** Restaurantes, Menus, Categorias, Platillos, Ingredientes, Alergenos, Fotos.
4. **Wireframes del menu comensal:** Dibujar las 3-4 pantallas principales del menu (lista de categorias, lista de platillos, detalle de platillo, vista de alergenos).
5. **Contactar 1-3 restaurantes locales:** Presentar la idea, ofrecer ser piloto gratuito, obtener su menu actual para modelar los datos.

---

## Apendice: Glosario

- **Capa 1:** Experiencia accesible sin instalacion ni registro, via navegador web
- **Capa 2:** Experiencia personalizada que requiere registro o instalacion de PWA
- **PWA:** Progressive Web App — aplicacion web que se puede "instalar" en el celular desde el navegador, sin app store
- **`<model-viewer>`:** Web component de Google que permite visualizar modelos 3D y AR directamente en navegadores moviles
- **WebXR:** API web para experiencias de realidad aumentada/virtual en el navegador
- **glTF/GLB:** Formato estandar para modelos 3D en la web (el "JPEG de los modelos 3D")
- **RAG:** Retrieval-Augmented Generation — tecnica de IA donde se alimenta contexto especifico (ej. el menu del restaurante) a un modelo de lenguaje para que de respuestas relevantes
