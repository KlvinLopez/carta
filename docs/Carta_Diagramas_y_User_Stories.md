# Carta — Diagramas, User Stories y Flujos de UX

**Version:** 1.0
**Fecha:** 3 de abril de 2026
**Complemento de:** Carta_Ideacion_v2.md

---

## 1. User Stories por Persona y Fase

### Persona: Comensal (Sin registro — Capa 1)

**Fase 1:**
- US-C01: Como comensal, quiero escanear un QR en la mesa y ver el menu del restaurante en mi celular, para no depender de un menu fisico.
- US-C02: Como comensal, quiero ver fotos reales de cada platillo, para saber como luce antes de ordenar.
- US-C03: Como comensal, quiero ver los ingredientes y alergenos de cada platillo, para saber si es seguro para mi sin preguntarle al mesero.
- US-C04: Como comensal, quiero ver los Top 3 platillos recomendados del restaurante, para decidir mas rapido cuando no se que pedir.
- US-C05: Como comensal, quiero que el menu cargue rapido y se vea bien en mi celular, para no frustarme esperando.

**Fase 2:**
- US-C06: Como comensal, quiero filtrar el menu por categoria (entradas, platos fuertes, postres), para navegar mas rapido.
- US-C07: Como comensal, quiero filtrar por rango de precio, para encontrar opciones dentro de mi presupuesto.
- US-C08: Como comensal, quiero filtrar por etiquetas dieteticas (vegetariano, vegano, sin gluten), para ver solo lo que me interesa.
- US-C09: Como comensal, quiero tocar un platillo y verlo en 3D sobre mi mesa con realidad aumentada, para saber el tamano real de la porcion y como se presenta.
- US-C10: Como comensal, quiero rotar y hacer zoom al modelo 3D, para verlo desde todos los angulos.

### Persona: Comensal Registrado (Capa 2 — Premium)

**Fase 3:**
- US-C11: Como comensal registrado, quiero crear mi perfil de alimentacion (alergias, dietas, restricciones), para que el menu se adapte a mi automaticamente.
- US-C12: Como comensal registrado, quiero que el menu me senale los platillos que son seguros, con precaucion, o no recomendados para mi perfil, para elegir con confianza.
- US-C13: Como comensal registrado, quiero que mis datos se guarden en mi celular y no en la nube, para tener control total de mi informacion.
- US-C14: Como comensal registrado, quiero exportar mis datos a un archivo JSON o Google Drive, para tener un respaldo.
- US-C15: Como comensal registrado, quiero instalar Carta como PWA en mi celular, para acceder rapido sin ir al app store.
- US-C16: Como comensal, quiero suscribirme a Carta Premium para eliminar anuncios y tener la experiencia completa en todos los restaurantes.

**Fase 4:**
- US-C17: Como comensal premium, quiero decirle al asistente IA "tengo antojo de algo picante pero ligero" y que me recomiende del menu actual.
- US-C18: Como comensal premium, quiero que la IA considere mi historial de pedidos en otros restaurantes para mejorar sus recomendaciones.
- US-C19: Como comensal premium, quiero guardar platillos como favoritos y agregarles notas personales.

**Futuro:**
- US-C20: Como comensal, quiero pre-ordenar mi comida desde el camino al restaurante, para que este casi lista cuando llegue.

### Persona: Dueno/Administrador de Restaurante

**Fase 1:**
- US-R01: Como administrador, quiero registrar mi restaurante en Carta, para ofrecer un menu digital mejorado a mis comensales.
- US-R02: Como administrador, quiero agregar, editar y eliminar platillos de mi menu con nombre, descripcion, precio, foto, categoria, ingredientes y alergenos.
- US-R03: Como administrador, quiero generar codigos QR unicos para cada mesa, para que mis comensales puedan escanear y ver el menu.
- US-R04: Como administrador, quiero ver un dashboard con cuantos escaneos hubo hoy, cuales platillos fueron los mas vistos, y que filtros usan los comensales, para tomar mejores decisiones sobre mi menu.
- US-R05: Como administrador, quiero marcar cuales son mis Top 3 platillos recomendados, para destacarlos a los comensales.

**Fase 2:**
- US-R06: Como administrador, quiero subir 4-6 fotos de un platillo y que la IA genere un modelo 3D automaticamente, para que mis comensales lo vean en AR.
- US-R07: Como administrador, quiero subir mis propios modelos 3D en formato glTF/GLB, para tener control total de la presentacion visual.
- US-R08: Como administrador, quiero personalizar el menu con el logo, colores y estilo de mi restaurante, para que sea coherente con mi marca.

**Fase 3:**
- US-R09: Como administrador, quiero ver analytics de que platillos son mas filtrados por alergenos, para considerar opciones alternativas en mi menu.

**Fase 4:**
- US-R10: Como administrador, quiero contratar artistas 3D verificados a traves del marketplace de Carta, para tener modelos profesionales de mis platillos.
- US-R11: Como administrador, quiero suscribirme al tier Pro para acceder a analytics avanzados, branding completo y soporte prioritario.

---

## 2. Flujo de Experiencia del Comensal (Journey Completo)

```mermaid
flowchart TD
    A[Comensal llega al restaurante\ny se sienta en la mesa] --> B[Ve el QR de Carta\nen la mesa]
    B --> C[Escanea el QR con\nla camara del celular]
    C --> D[Se abre el menu en\nel navegador movil]
    D --> E{Primera vez\nen Carta?}

    E -->|Si| F[Ve el menu completo\ncon fotos + Top 3 + anuncios]
    E -->|No, tiene cuenta| G{Es Premium?}

    G -->|No| F
    G -->|Si| H[Ve menu personalizado\nsin anuncios + filtrado por perfil]

    F --> I{Que quiere hacer?}
    H --> I

    I -->|Navegar menu| J[Explora por categorias\nAplica filtros]
    I -->|Ver platillo en AR| K[Toca icono 3D\nSe abre camara\nVe platillo en su mesa]
    I -->|Ver alergenos| L[Toca platillo\nVe ingredientes\ny etiquetas de alergenos]
    I -->|Hablar con IA| M{Es Premium?}

    M -->|Si| N[Abre asistente IA\nDescribe su antojo\nRecibe recomendacion]
    M -->|No| O[Ve invitacion a\nCarta Premium]

    J --> P[Elige platillo]
    K --> P
    L --> P
    N --> P

    P --> Q[Ordena al mesero\no pre-ordena desde Carta]

    O --> R{Se suscribe?}
    R -->|Si| S[Crea cuenta\nConfigura perfil\nPaga suscripcion]
    S --> H
    R -->|No| F

    style A fill:#E8F5E9
    style Q fill:#E8F5E9
    style H fill:#FFF3E0
    style N fill:#FFF3E0
    style S fill:#FFF3E0
```

---

## 3. Flujo de Experiencia del Restaurante (Journey Completo)

```mermaid
flowchart TD
    A[Dueno decide usar Carta\npara su restaurante] --> B[Entra a carta.mx/restaurantes\ny crea cuenta]
    B --> C[Registra datos del restaurante\nNombre, direccion, logo, colores]
    C --> D[Crea categorias del menu\nEntradas, Fuertes, Bebidas, Postres]
    D --> E[Agrega platillos uno por uno]

    E --> F[Por cada platillo:]
    F --> G[Sube foto del platillo]
    F --> H[Agrega nombre, descripcion, precio]
    F --> I[Selecciona ingredientes\ny etiquetas de alergenos]
    F --> J[Asigna categoria]
    F --> K[Marca si es Top 3]

    G --> L{Quiere modelo 3D?}
    L -->|Si, con IA| M[Sube 4-6 fotos\ndesde diferentes angulos]
    M --> N[IA genera modelo 3D\nautomaticamente]
    L -->|Si, propio| O[Sube archivo glTF/GLB]
    L -->|No por ahora| P[Solo foto 2D]
    L -->|Profesional| Q[Solicita artista\nen marketplace]

    N --> R[Revisa y aprueba\nel modelo 3D]
    O --> R
    Q --> R
    P --> S[Platillo listo]
    R --> S

    S --> T{Mas platillos?}
    T -->|Si| E
    T -->|No| U[Genera QRs\npara las mesas]

    U --> V[Imprime QRs\ny los coloca en mesas]
    V --> W[Restaurante activo en Carta]

    W --> X[Revisa dashboard diario]
    X --> Y[Ve escaneos, platillos mas vistos\nfiltros mas usados, tendencias]
    Y --> Z{Ajustar menu?}
    Z -->|Si| E
    Z -->|No| X

    style A fill:#E3F2FD
    style W fill:#E3F2FD
    style Y fill:#E3F2FD
```

---

## 4. Diagrama de Arquitectura Tecnica Detallado

```mermaid
graph TB
    subgraph Clientes["Clientes (Frontend)"]
        CM["Menu Comensal\n(Astro + Tailwind)\nPWA capable"]
        PR["Panel Restaurante\n(Astro + Tailwind + shadcn)\nDashboard + CRUD"]
    end

    subgraph CDN["Entrega de Contenido"]
        FH["Firebase Hosting\nCDN global\nSSL automatico"]
    end

    subgraph API["Backend API"]
        FA["FastAPI\n(Python 3.11+)\nREST endpoints"]
        AUTH["Firebase Auth\nGoogle / Apple Sign-in"]
        FILT["Motor de Filtrado\nReglas + Tags\nEjecucion client-side"]
        ADS["Servicio de Ads\nBanners contextuales"]
        PAY["Procesamiento Pagos\nStripe / Mercado Pago"]
    end

    subgraph IA["Servicios de IA (Local)"]
        GEMMA["Gemma 2\n(Ollama / llama.cpp)\nAsistente conversacional"]
        TRIPO["TripoSR / InstantMesh\nGeneracion de modelos 3D\nDesde fotos"]
    end

    subgraph Datos["Capa de Datos"]
        PG["PostgreSQL\n(Cloud SQL)\nDatos principales"]
        GCS["Google Cloud Storage\nFotos + Modelos 3D\n(.glb files)"]
        LOCAL["IndexedDB\n(Dispositivo del usuario)\nPerfil alimentario local-first"]
    end

    subgraph Infra["Infraestructura Google Cloud"]
        CR["Cloud Run\nContenedor Docker\nEscala a cero"]
    end

    CM --> FH
    PR --> FH
    FH --> CR
    CR --> FA
    FA --> AUTH
    FA --> FILT
    FA --> ADS
    FA --> PAY
    FA --> PG
    FA --> GCS
    FA --> GEMMA
    PR --> TRIPO
    TRIPO --> GCS
    CM --> LOCAL
    CM -.->|"model-viewer\n(carga directa)"| GCS

    style CM fill:#4CAF50,color:#fff
    style PR fill:#2196F3,color:#fff
    style FA fill:#FF9800,color:#fff
    style PG fill:#9C27B0,color:#fff
    style GEMMA fill:#F44336,color:#fff
    style TRIPO fill:#F44336,color:#fff
    style LOCAL fill:#607D8B,color:#fff
```

---

## 5. Diagramas de Secuencia

### 5.1 Escaneo de QR y Carga del Menu

```mermaid
sequenceDiagram
    actor C as Comensal
    participant QR as Codigo QR
    participant FH as Firebase Hosting
    participant API as FastAPI
    participant DB as PostgreSQL
    participant GCS as Cloud Storage
    participant ADS as Servicio Ads

    C->>QR: Escanea QR con camara
    QR-->>C: URL carta.mx/r/{restaurante_id}/m/{mesa_id}
    C->>FH: GET /r/{restaurante_id}/m/{mesa_id}
    FH-->>C: HTML + JS (Astro bundle)
    C->>API: GET /api/restaurantes/{id}/menu
    API->>DB: SELECT platillos, categorias, alergenos WHERE restaurante_id = {id}
    DB-->>API: Datos del menu completo
    API-->>C: JSON con menu completo
    C->>GCS: GET fotos de platillos (URLs directas)
    GCS-->>C: Imagenes
    C->>ADS: GET /api/ads/contextual?categoria={categoria}
    ADS-->>C: Banner ad contextual
    Note over C: Renderiza menu con fotos,<br/>categorias, Top 3, alergenos y ads
    C->>API: POST /api/analytics/event {tipo: "menu_view", restaurante_id, mesa_id}
    API->>DB: INSERT evento anonimo
```

### 5.2 Visualizacion AR de un Platillo

```mermaid
sequenceDiagram
    actor C as Comensal
    participant APP as Menu Web
    participant GCS as Cloud Storage
    participant MV as model-viewer
    participant AR as AR Session (iOS/Android)

    C->>APP: Toca icono "Ver en 3D" de un platillo
    APP->>GCS: GET /modelos/{platillo_id}.glb
    GCS-->>APP: Archivo GLB (modelo 3D)
    APP->>MV: Renderiza model-viewer con src=platillo.glb
    Note over MV: Muestra preview 3D interactivo<br/>(rotar, zoom con gestos)
    C->>MV: Toca boton "Ver en mi mesa"
    MV->>AR: Activa AR nativo del navegador
    Note over AR: iOS: AR Quick Look<br/>Android: Scene Viewer
    AR-->>C: Platillo en 3D sobre la mesa real
    C->>APP: Cierra AR, regresa al menu
    APP->>API: POST /api/analytics/event {tipo: "ar_view", platillo_id}
```

### 5.3 Registro y Configuracion de Perfil (Capa 2)

```mermaid
sequenceDiagram
    actor C as Comensal
    participant APP as Menu Web / PWA
    participant AUTH as Firebase Auth
    participant LOCAL as IndexedDB (dispositivo)
    participant API as FastAPI
    participant PAY as Stripe/MercadoPago

    C->>APP: Toca "Crear cuenta" o "Registrarse"
    APP->>AUTH: Sign in with Google/Apple
    AUTH-->>APP: Token de autenticacion + user ID anonimo
    APP->>C: Muestra formulario de perfil alimentario
    C->>APP: Configura alergias, dietas, restricciones
    APP->>LOCAL: Guarda perfil en IndexedDB (local-first)
    Note over LOCAL: Datos NUNCA salen<br/>del dispositivo sin permiso

    C->>APP: Quiere suscribirse a Premium
    APP->>PAY: Inicia checkout (~$29 MXN/mes)
    PAY-->>C: Pantalla de pago
    C->>PAY: Completa pago
    PAY-->>API: Webhook: suscripcion activa
    API->>DB: UPDATE usuario SET premium = true
    API-->>APP: Confirmacion premium
    Note over APP: Remueve anuncios<br/>Activa features Capa 2
```

### 5.4 Filtrado Inteligente por Perfil (Local-First)

```mermaid
sequenceDiagram
    actor C as Comensal Premium
    participant APP as Menu Web / PWA
    participant LOCAL as IndexedDB (dispositivo)
    participant API as FastAPI

    C->>APP: Escanea QR, abre menu
    APP->>API: GET /api/restaurantes/{id}/menu
    API-->>APP: Menu COMPLETO (todos los platillos con ingredientes y alergenos)
    APP->>LOCAL: Lee perfil alimentario del usuario
    LOCAL-->>APP: {alergias: ["cacahuate", "lactosa"], dieta: "sin_gluten"}

    Note over APP: FILTRADO LOCAL<br/>(ningun dato personal sale del dispositivo)

    APP->>APP: Clasifica cada platillo
    Note over APP: Seguro: no contiene alergenos del perfil<br/>Precaucion: ingrediente similar o cruzado<br/>No recomendado: contiene alergeno directo

    APP-->>C: Menu filtrado con indicadores visuales
    Note over C: Verde = seguro<br/>Amarillo = precaucion<br/>Rojo = no recomendado
```

### 5.5 Asistente IA Conversacional (Fase 4)

```mermaid
sequenceDiagram
    actor C as Comensal Premium
    participant APP as Menu Web / PWA
    participant LOCAL as IndexedDB
    participant API as FastAPI
    participant LLM as Gemma 2 (local)
    participant DB as PostgreSQL

    C->>APP: Abre asistente IA
    C->>APP: "Tengo antojo de algo picante pero ligero"
    APP->>LOCAL: Lee perfil alimentario
    LOCAL-->>APP: Perfil del usuario
    APP->>API: POST /api/ia/recomendar {mensaje, perfil_anonimo, restaurante_id}
    API->>DB: SELECT platillos con ingredientes WHERE restaurante_id
    DB-->>API: Menu completo del restaurante

    API->>LLM: Prompt con contexto:
    Note over LLM: "Eres un asistente de menu.<br/>Menu del restaurante: [datos]<br/>Perfil del usuario: [restricciones]<br/>El usuario dice: algo picante pero ligero.<br/>Recomienda 1-3 platillos y explica por que."

    LLM-->>API: Recomendacion estructurada
    API-->>APP: {platillos: [...], razon: "..."}
    APP-->>C: "Te recomiendo los Tacos de Pollo al Pastor<br/>porque son picantes, ligeros y no contienen<br/>ningun alergeno de tu perfil"
```

---

## 6. Flujo de Onboarding del Restaurante (Detallado)

```mermaid
flowchart TD
    A[Dueno visita carta.mx] --> B[Clic en 'Registrar mi restaurante']
    B --> C[Login con Google / Apple / Email]
    C --> D[Formulario basico:]
    D --> D1[Nombre del restaurante]
    D --> D2[Direccion / ubicacion]
    D --> D3[Tipo de cocina]
    D --> D4[Logo + colores opcionales]

    D1 & D2 & D3 & D4 --> E[Dashboard vacio]
    E --> F[Wizard: 'Agrega tu primer platillo']

    F --> G[Opcion 1:\nAgregar manualmente]
    F --> H[Opcion 2:\nSubir foto del menu fisico\nOCR con IA extrae platillos]

    G --> I[Formulario por platillo:\n- Nombre\n- Descripcion\n- Precio\n- Foto\n- Categoria\n- Ingredientes selector\n- Alergenos tags\n- Es Top 3?]

    H --> J[IA extrae nombres y precios\nUsuario revisa y completa\ningredientes/alergenos/fotos]

    I --> K{Mas platillos?}
    J --> K
    K -->|Si| F
    K -->|No| L[Genera QRs automaticos\npara N mesas]

    L --> M[Preview: Asi se ve tu menu\npara los comensales]
    M --> N{Aprueba?}
    N -->|Ajustar| F
    N -->|Listo| O[Menu publicado\nQRs listos para imprimir]

    O --> P[Dashboard activo:\nEsperando primeros escaneos]

    style O fill:#4CAF50,color:#fff
    style P fill:#4CAF50,color:#fff
```

---

## 7. Diagrama de Estados del Comensal

```mermaid
stateDiagram-v2
    [*] --> Anonimo: Escanea QR

    Anonimo --> NavegandoMenu: Menu cargado
    NavegandoMenu --> ViendoAR: Toca "Ver en 3D"
    ViendoAR --> NavegandoMenu: Cierra AR
    NavegandoMenu --> ViendoDetalle: Toca platillo
    ViendoDetalle --> NavegandoMenu: Regresa
    NavegandoMenu --> Filtrando: Aplica filtros
    Filtrando --> NavegandoMenu: Resultados mostrados

    NavegandoMenu --> InvitadoRegistro: Ve invitacion Premium
    InvitadoRegistro --> Anonimo: Ignora
    InvitadoRegistro --> Registrandose: Acepta registrarse

    Registrandose --> ConfigurandoPerfil: Auth exitoso
    ConfigurandoPerfil --> RegistradoFree: Guarda perfil (sin pagar)
    ConfigurandoPerfil --> SuscribiendoPremium: Inicia pago
    SuscribiendoPremium --> Premium: Pago exitoso
    SuscribiendoPremium --> RegistradoFree: Cancela pago

    RegistradoFree --> NavegandoMenu: Regresa al menu (con ads)
    Premium --> MenuPersonalizado: Menu filtrado + sin ads

    MenuPersonalizado --> ViendoAR
    MenuPersonalizado --> ViendoDetalle
    MenuPersonalizado --> HablandoConIA: Abre asistente
    HablandoConIA --> MenuPersonalizado: Recibe recomendacion

    MenuPersonalizado --> Decidido: Elige platillo
    NavegandoMenu --> Decidido: Elige platillo
    Decidido --> [*]: Ordena al mesero

    note right of Premium: Datos en dispositivo local\nSin anuncios\nFiltrado + IA + Historial
    note right of Anonimo: Zero datos personales\nAnuncios visibles
```

---

## 8. Modelo de Datos Conceptual (ER)

```mermaid
erDiagram
    RESTAURANTE {
        uuid id PK
        string nombre
        string direccion
        string tipo_cocina
        string logo_url
        string color_primario
        string color_secundario
        string tier "gratis | pro | enterprise"
        timestamp creado_en
    }

    USUARIO_RESTAURANTE {
        uuid id PK
        uuid restaurante_id FK
        string firebase_uid
        string rol "admin | editor"
    }

    CATEGORIA {
        uuid id PK
        uuid restaurante_id FK
        string nombre
        int orden
        boolean activa
    }

    PLATILLO {
        uuid id PK
        uuid restaurante_id FK
        uuid categoria_id FK
        string nombre
        text descripcion
        decimal precio
        string foto_url
        string modelo_3d_url
        boolean es_top3
        boolean activo
        timestamp creado_en
    }

    INGREDIENTE {
        uuid id PK
        string nombre
        string categoria "proteina | vegetal | lacteo | grano | etc"
    }

    ALERGENO {
        uuid id PK
        string nombre "gluten | lactosa | cacahuate | mariscos | etc"
        string icono_url
    }

    PLATILLO_INGREDIENTE {
        uuid platillo_id FK
        uuid ingrediente_id FK
        boolean es_principal
    }

    PLATILLO_ALERGENO {
        uuid platillo_id FK
        uuid alergeno_id FK
        string nivel "contiene | puede_contener"
    }

    ETIQUETA_DIETETICA {
        uuid id PK
        string nombre "vegetariano | vegano | sin_gluten | keto | halal | kosher"
    }

    PLATILLO_ETIQUETA {
        uuid platillo_id FK
        uuid etiqueta_id FK
    }

    MESA {
        uuid id PK
        uuid restaurante_id FK
        string numero_mesa
        string qr_code_url
    }

    EVENTO_ANALYTICS {
        uuid id PK
        uuid restaurante_id FK
        uuid mesa_id FK
        uuid platillo_id FK "nullable"
        string tipo "menu_view | platillo_view | ar_view | filtro_usado"
        jsonb metadata
        timestamp creado_en
    }

    SUSCRIPCION_COMENSAL {
        uuid id PK
        string firebase_uid
        string estado "activa | cancelada | expirada"
        string plan "premium_mensual | premium_anual"
        timestamp inicio
        timestamp fin
        string stripe_subscription_id
    }

    ARTISTA_3D {
        uuid id PK
        string nombre
        string portafolio_url
        decimal rating
        boolean verificado
    }

    SOLICITUD_MODELO_3D {
        uuid id PK
        uuid restaurante_id FK
        uuid platillo_id FK
        uuid artista_id FK "nullable"
        string estado "pendiente | en_progreso | entregado | aprobado"
        decimal precio
        decimal comision_carta
        timestamp creado_en
    }

    RESTAURANTE ||--o{ USUARIO_RESTAURANTE : "administrado por"
    RESTAURANTE ||--o{ CATEGORIA : "tiene"
    RESTAURANTE ||--o{ PLATILLO : "ofrece"
    RESTAURANTE ||--o{ MESA : "tiene"
    RESTAURANTE ||--o{ EVENTO_ANALYTICS : "genera"
    CATEGORIA ||--o{ PLATILLO : "agrupa"
    PLATILLO ||--o{ PLATILLO_INGREDIENTE : "contiene"
    INGREDIENTE ||--o{ PLATILLO_INGREDIENTE : "usado en"
    PLATILLO ||--o{ PLATILLO_ALERGENO : "tiene"
    ALERGENO ||--o{ PLATILLO_ALERGENO : "presente en"
    PLATILLO ||--o{ PLATILLO_ETIQUETA : "etiquetado"
    ETIQUETA_DIETETICA ||--o{ PLATILLO_ETIQUETA : "aplica a"
    PLATILLO ||--o{ EVENTO_ANALYTICS : "registra"
    MESA ||--o{ EVENTO_ANALYTICS : "origen"
    PLATILLO ||--o{ SOLICITUD_MODELO_3D : "solicita"
    RESTAURANTE ||--o{ SOLICITUD_MODELO_3D : "pide"
    ARTISTA_3D ||--o{ SOLICITUD_MODELO_3D : "ejecuta"
```

---

## 9. Diagrama de Despliegue (Infraestructura)

```mermaid
graph TB
    subgraph Internet
        USER["Comensal\n(Navegador movil)"]
        REST["Dueno Restaurante\n(Navegador desktop/movil)"]
    end

    subgraph Google_Cloud["Google Cloud Platform"]
        subgraph Firebase
            FH["Firebase Hosting\n(CDN + SSL)\ncarta.mx"]
            FAUTH["Firebase Auth\n(Google/Apple Sign-in)"]
        end

        subgraph Cloud_Run["Cloud Run"]
            API1["Instancia API\n(FastAPI + Docker)\nEscala 0 a N"]
        end

        subgraph Datos_GCP["Almacenamiento"]
            CSQL["Cloud SQL\nPostgreSQL 15\nInstancia minima"]
            GCS2["Cloud Storage\nBucket: carta-media\nFotos + GLB models"]
        end

        subgraph Compute["Compute (Fase 2+)"]
            GPU["Compute Engine\n(GPU opcional)\nTripoSR pipeline\nSolo cuando se generan modelos"]
        end
    end

    subgraph Externos["Servicios Externos"]
        STRIPE["Stripe / MercadoPago\n(Pagos + Suscripciones)"]
        ADSNET["Red de Ads\n(Google AdSense o similar)"]
    end

    USER -->|HTTPS| FH
    REST -->|HTTPS| FH
    FH -->|Proxy| API1
    API1 --> FAUTH
    API1 --> CSQL
    API1 --> GCS2
    API1 --> STRIPE
    USER -->|Directo CDN| GCS2
    REST --> GPU
    GPU --> GCS2
    USER -.->|Ads| ADSNET

    style FH fill:#4CAF50,color:#fff
    style API1 fill:#FF9800,color:#fff
    style CSQL fill:#9C27B0,color:#fff
    style GCS2 fill:#2196F3,color:#fff
```

---

## 10. Flujo de Monetizacion Completo

```mermaid
flowchart TD
    subgraph Comensal
        A[Usa Carta gratis] --> B[Ve anuncios contextuales]
        B --> C{Le gustan\nlas features Capa 2?}
        C -->|Si| D[Se suscribe a Premium\n$29 MXN/mes o $249/ano]
        C -->|No| E[Sigue usando gratis\nCarta gana por ads]
        D --> F[Sin anuncios\n+ Perfil + IA + Historial]
    end

    subgraph Restaurante
        G[Se registra gratis] --> H[Usa tier gratuito\nMenu + Analytics basico]
        H --> I{Necesita mas?}
        I -->|Si| J[Sube a Pro\n$199-299 MXN/mes]
        I -->|No| K[Sigue en tier gratis]
        J --> L[Analytics avanzado\n+ Branding completo\n+ Soporte prioritario]
    end

    subgraph Marketplace
        M[Restaurante quiere\nmodelos 3D pro] --> N[Publica solicitud\nen marketplace]
        N --> O[Artista verificado\nentrega modelo]
        O --> P[Restaurante paga\nArtista recibe 80-85%\nCarta recibe 15-20%]
    end

    style D fill:#4CAF50,color:#fff
    style J fill:#2196F3,color:#fff
    style P fill:#FF9800,color:#fff
```

---

## 11. Mapa de Features por Fase (Visual)

```mermaid
graph LR
    subgraph Fase_1["Fase 1: El Menu que Si Sirve"]
        F1A[Menu visual responsive]
        F1B[Fotos de platillos]
        F1C[Ingredientes + Alergenos]
        F1D[Top 3 recomendados]
        F1E[QR por mesa]
        F1F[Panel restaurante CRUD]
        F1G[Dashboard analytics]
        F1H[Anuncios contextuales]
    end

    subgraph Fase_2["Fase 2: Ver para Creer"]
        F2A[AR con model-viewer]
        F2B[Pipeline 3D con IA]
        F2C[Upload modelos propios]
        F2D[Filtros menu]
        F2E[Branding restaurante]
    end

    subgraph Fase_3["Fase 3: Tu Menu Tu Perfil"]
        F3A[Auth Google/Apple]
        F3B[Perfil alimentario local]
        F3C[Filtrado inteligente]
        F3D[PWA installable]
        F3E[Carta Premium suscripcion]
        F3F[Export datos JSON/GDrive]
    end

    subgraph Fase_4["Fase 4: Carta Completo"]
        F4A[Asistente IA Gemma]
        F4B[Historial cross-restaurant]
        F4C[Marketplace artistas 3D]
        F4D[Tiers restaurante Pro/Enterprise]
        F4E[Landing publica + onboarding]
    end

    Fase_1 --> Fase_2 --> Fase_3 --> Fase_4

    style Fase_1 fill:#E8F5E9
    style Fase_2 fill:#E3F2FD
    style Fase_3 fill:#FFF3E0
    style Fase_4 fill:#F3E5F5
```
