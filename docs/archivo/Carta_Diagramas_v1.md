# Carta — Diagramas Tecnicos y de UX

**Version:** 1.0
**Fecha:** 3 de abril de 2026
**Complemento de:** Carta_Ideacion_v2.md

---

## 1. User Stories

### 1.1 Comensal — Capa 1 (Sin registro)

**US-C01:** Como comensal, quiero escanear un QR en la mesa y ver el menu del restaurante en mi navegador, para no depender de un menu fisico ni instalar ninguna app.

**US-C02:** Como comensal, quiero ver fotos reales de cada platillo junto con su descripcion y precio, para tener una idea clara de lo que voy a ordenar.

**US-C03:** Como comensal, quiero ver los ingredientes y alergenos de cada platillo, para saber si puedo comerlo sin tener que preguntarle al mesero.

**US-C04:** Como comensal, quiero ver los Top 3 platillos mas vendidos o recomendados, para tener un punto de partida cuando no se que elegir.

**US-C05:** Como comensal, quiero filtrar platillos por categoria, precio o tipo de dieta, para reducir las opciones y encontrar algo rapido.

**US-C06:** Como comensal, quiero ver un modelo 3D del platillo en realidad aumentada sobre mi mesa, para saber el tamano real de la porcion y como se ve antes de ordenar.

### 1.2 Comensal — Capa 2 (Carta Premium)

**US-C07:** Como comensal registrado, quiero crear un perfil con mis alergias, dietas y restricciones alimentarias, para que el menu se adapte automaticamente a mi.

**US-C08:** Como comensal registrado, quiero que el menu me muestre cuales platillos son seguros, cuales debo tener precaucion y cuales evitar segun mi perfil, para elegir sin preocupacion.

**US-C09:** Como comensal premium, quiero hablar con un asistente IA y decirle "tengo antojo de algo picante pero ligero" y que me recomiende del menu actual, para no tener que leer todo el menu.

**US-C10:** Como comensal premium, quiero que mis preferencias y pedidos anteriores en otros restaurantes mejoren las recomendaciones, para que cada vez sea mas facil elegir.

**US-C11:** Como comensal registrado, quiero exportar mis datos (perfil, historial) en un archivo JSON o respaldarlos en Google Drive, para tener control total sobre mi informacion.

**US-C12:** Como comensal premium, quiero no ver anuncios en ningun restaurante, para tener una experiencia limpia y sin distracciones.

### 1.3 Restaurante

**US-R01:** Como dueno de restaurante, quiero registrarme en Carta y crear mi menu digital con platillos, categorias, precios y fotos, para ofrecer una experiencia moderna a mis clientes.

**US-R02:** Como dueno de restaurante, quiero etiquetar los ingredientes y alergenos de cada platillo, para que mis clientes con restricciones alimentarias puedan elegir con confianza.

**US-R03:** Como dueno de restaurante, quiero marcar mis Top 3 platillos recomendados, para guiar a clientes indecisos hacia mis mejores opciones.

**US-R04:** Como dueno de restaurante, quiero generar codigos QR unicos para cada mesa o para el restaurante en general, para que mis clientes accedan al menu digital facilmente.

**US-R05:** Como dueno de restaurante, quiero ver un dashboard con cuantos escaneos tuve hoy, cuales platillos son los mas vistos, y cuales filtros usa mas la gente, para tomar decisiones informadas sobre mi menu.

**US-R06:** Como dueno de restaurante, quiero personalizar los colores, logo y estilo de mi menu digital, para que refleje la identidad de mi marca.

**US-R07:** Como dueno de restaurante, quiero subir fotos de mis platillos desde diferentes angulos y que se genere un modelo 3D automaticamente, para que mis clientes puedan verlo en realidad aumentada.

**US-R08:** Como dueno de restaurante, quiero contratar a un artista 3D verificado a traves de Carta para que haga modelos profesionales de mis platillos, para tener la mejor calidad visual posible.

---

## 2. User Journeys (Mapas de Viaje del Usuario)

### 2.1 Journey del Comensal — Capa 1

```mermaid
journey
    title Comensal - Primera visita (Capa 1)
    section Llegada al restaurante
      Se sienta en la mesa: 5: Comensal
      Ve el QR de Carta en la mesa: 4: Comensal
    section Escaneo y descubrimiento
      Escanea el QR con su camara: 5: Comensal
      Se abre el menu en el navegador: 5: Comensal
      Ve el menu visual con fotos: 5: Comensal
      Ve los Top 3 recomendados: 4: Comensal
    section Exploracion del menu
      Filtra por categoria o dieta: 4: Comensal
      Toca un platillo para ver detalle: 5: Comensal
      Ve ingredientes y alergenos: 5: Comensal
      Activa AR y ve el platillo en 3D: 5: Comensal
    section Decision
      Decide que ordenar: 5: Comensal
      Le dice al mesero su orden: 4: Comensal
    section Post-visita
      Ve invitacion a registrarse: 3: Comensal
```

### 2.2 Journey del Comensal — Capa 2 (Premium)

```mermaid
journey
    title Comensal Premium - Visita recurrente
    section Pre-visita
      Abre Carta desde su celular: 5: Comensal
      Busca el restaurante: 4: Comensal
    section En el restaurante
      Escanea QR - lo reconoce automaticamente: 5: Comensal
      Menu ya filtrado segun su perfil: 5: Comensal
      Ve badges de seguro - precaucion - evitar: 5: Comensal
    section Asistente IA
      Abre el chat - Tengo antojo de algo fresco: 5: Comensal
      IA recomienda 2 opciones del menu: 5: Comensal
      Ve el modelo 3D de la recomendacion: 5: Comensal
    section Decision
      Elige rapido y sin dudas: 5: Comensal
      Experiencia sin anuncios: 5: Comensal
```

### 2.3 Journey del Restaurante

```mermaid
journey
    title Restaurante - Onboarding y uso diario
    section Registro
      Descubre Carta por recomendacion: 4: Restaurante
      Se registra en el panel web: 4: Restaurante
      Crea su restaurante con nombre y logo: 5: Restaurante
    section Configuracion del menu
      Crea categorias - Entradas Fuertes Bebidas: 4: Restaurante
      Agrega platillos con foto y precio: 4: Restaurante
      Etiqueta ingredientes y alergenos: 3: Restaurante
      Marca sus Top 3 recomendados: 5: Restaurante
    section Activacion
      Genera QR para sus mesas: 5: Restaurante
      Imprime y coloca QRs: 4: Restaurante
      Primer comensal escanea: 5: Restaurante
    section Uso diario
      Revisa dashboard de analytics: 5: Restaurante
      Ve que platillos son mas vistos: 5: Restaurante
      Ajusta menu segun datos: 4: Restaurante
```

---

## 3. Flujos de Experiencia de Usuario (UX Flows)

### 3.1 Flujo del Comensal — Capa 1 (Completo)

```mermaid
flowchart TD
    A[Comensal en la mesa] --> B[Escanea QR con camara]
    B --> C[Navegador abre menu web de Carta]
    C --> D[Pantalla principal del menu]

    D --> E[Top 3 Recomendados]
    D --> F[Categorias del menu]
    D --> G[Barra de filtros]
    D --> H[Banner de anuncio discreto]

    F --> I[Lista de platillos de la categoria]
    G --> J[Filtrar por precio / dieta / tipo]
    J --> I

    I --> K[Toca un platillo]
    K --> L[Detalle del platillo]

    L --> M[Foto grande]
    L --> N[Descripcion + precio]
    L --> O[Ingredientes]
    L --> P[Alergenos con iconos]
    L --> Q{Modelo 3D disponible?}

    Q -->|Si| R[Boton: Ver en AR]
    R --> S[Se abre camara - modelo 3D en la mesa]
    S --> T[Comensal decide]

    Q -->|No| T
    T --> U{Quiere mas opciones?}
    U -->|Si| D
    U -->|No| V[Le dice al mesero su orden]

    V --> W[Banner: Registrate para menu personalizado]
    W --> X{Se registra?}
    X -->|Si| Y[Flujo Capa 2]
    X -->|No| Z[Fin de la experiencia]

    style A fill:#E8F5E9
    style Z fill:#FFEBEE
    style Y fill:#E3F2FD
    style R fill:#FFF3E0
    style H fill:#F5F5F5
```

### 3.2 Flujo del Comensal — Registro y Capa 2

```mermaid
flowchart TD
    A[Comensal decide registrarse] --> B[Pantalla de registro]
    B --> C{Metodo de auth}
    C -->|Google| D[Sign in with Google]
    C -->|Apple| E[Sign in with Apple]
    C -->|Email| F[Email + password]

    D --> G[Cuenta creada]
    E --> G
    F --> G

    G --> H[Onboarding: Configura tu perfil]
    H --> I[Selecciona alergias]
    I --> J[Selecciona dietas]
    J --> K[Selecciona restricciones]
    K --> L[Selecciona preferencias de sabor]
    L --> M[Perfil guardado localmente en dispositivo]

    M --> N{Suscribirse a Premium?}
    N -->|Si| O[Pantalla de pago]
    O --> P[$29 MXN/mes o $249 MXN/ano]
    P --> Q[Pago procesado - Premium activo]
    Q --> R[Menu sin anuncios + filtrado activo]

    N -->|Despues| S[Menu con anuncios + perfil guardado]
    S --> T[Filtrado inteligente disponible al suscribirse]

    R --> U[Menu personalizado]
    U --> V[Platillos clasificados: Seguro / Precaucion / Evitar]
    V --> W[Boton: Hablar con asistente IA]
    W --> X[Chat: Que se te antoja?]
    X --> Y[IA recomienda del menu actual]
    Y --> Z[Comensal elige platillo]

    style A fill:#E3F2FD
    style Q fill:#C8E6C9
    style R fill:#C8E6C9
    style V fill:#FFF9C4
```

### 3.3 Flujo del Panel de Restaurante

```mermaid
flowchart TD
    A[Dueno accede a panel.carta.mx] --> B{Tiene cuenta?}
    B -->|No| C[Registro del restaurante]
    C --> D[Nombre, direccion, logo, colores]
    D --> E[Dashboard principal]

    B -->|Si| F[Login]
    F --> E

    E --> G[Menu lateral]
    G --> H[Gestion de Menu]
    G --> I[Analytics Dashboard]
    G --> J[Configuracion / Branding]
    G --> K[Codigos QR]
    G --> L[Modelos 3D]

    H --> M[CRUD Categorias]
    H --> N[CRUD Platillos]
    N --> N1[Nombre + descripcion + precio]
    N --> N2[Subir foto]
    N --> N3[Etiquetar ingredientes]
    N --> N4[Etiquetar alergenos]
    N --> N5[Marcar como Top 3]

    I --> I1[Escaneos por dia/semana/mes]
    I --> I2[Platillos mas vistos]
    I --> I3[Filtros mas usados]
    I --> I4[Tiempo promedio en menu]
    I --> I5[Horarios pico de escaneo]

    K --> K1[Generar QR por restaurante]
    K --> K2[Generar QR por mesa]
    K --> K3[Descargar QR para imprimir]

    L --> L1[Subir fotos para generar 3D con IA]
    L --> L2[Importar modelo 3D propio]
    L --> L3[Contratar artista del marketplace]

    style E fill:#E8F5E9
    style I fill:#E3F2FD
    style N fill:#FFF9C4
```

---

## 4. Arquitectura Tecnica Detallada

### 4.1 Diagrama de Componentes

```mermaid
graph TB
    subgraph Cliente - Navegador Movil
        A[Menu Web - Astro SSG]
        A1[model-viewer - AR]
        A2[IndexedDB - Perfil local]
        A3[Service Worker - PWA]
        A4[Ads SDK]
    end

    subgraph Cliente - Panel Restaurante
        B[Panel Web - Astro]
        B1[Dashboard Charts]
        B2[CRUD Forms]
        B3[Upload de fotos]
    end

    subgraph Google Cloud
        subgraph Cloud Run
            C[FastAPI - API REST]
            C1[Endpoints Restaurante]
            C2[Endpoints Menu]
            C3[Endpoints Analytics]
            C4[Endpoints Auth Middleware]
            C5[Endpoints Suscripciones]
        end

        subgraph Servicios Externos
            D[Firebase Auth]
            E[Stripe / Mercado Pago]
        end

        subgraph Datos
            F[Cloud SQL - PostgreSQL]
            G[Cloud Storage - Fotos y 3D]
        end

        subgraph Pipeline 3D - Cloud Run Job
            H[TripoSR / InstantMesh]
            H1[Cola de procesamiento]
        end
    end

    A --> C
    A1 --> G
    B --> C
    B3 --> G
    C --> D
    C --> E
    C --> F
    C --> G
    B3 --> H1
    H1 --> H
    H --> G

    style A fill:#E8F5E9
    style B fill:#E3F2FD
    style C fill:#FFF9C4
    style F fill:#F3E5F5
    style G fill:#F3E5F5
```

### 4.2 Diagrama de Deployment (Google Cloud)

```mermaid
graph TB
    subgraph Internet
        U1[Comensal - Navegador movil]
        U2[Restaurante - Navegador desktop]
    end

    subgraph Firebase
        FH[Firebase Hosting\nCDN Global\nFrontend estatico]
        FA[Firebase Auth\nGoogle + Apple Sign-in]
    end

    subgraph Google Cloud Platform
        subgraph Cloud Run
            API[FastAPI Container\nAuto-scaling\nEscala a cero]
        end

        subgraph Cloud Run Jobs
            P3D[Pipeline 3D\nTripoSR Container\nEjecucion bajo demanda]
        end

        subgraph Cloud SQL
            PG[(PostgreSQL 15\nInstancia minima\n~$7-10 USD/mes)]
        end

        subgraph Cloud Storage
            CS[Bucket: carta-media\nFotos de platillos\nModelos 3D .glb\nLogos de restaurantes]
        end

        subgraph Cloud Tasks
            CT[Cola de tareas\nProcesamiento 3D asincrono]
        end
    end

    subgraph Servicios Terceros
        SP[Stripe / Mercado Pago\nSuscripciones + Pagos]
        ADS[Google AdSense / AdMob\nAnuncios contextuales]
    end

    U1 --> FH
    U2 --> FH
    FH --> API
    API --> FA
    API --> PG
    API --> CS
    API --> CT
    CT --> P3D
    P3D --> CS
    API --> SP
    FH --> ADS

    style FH fill:#4CAF50,color:#fff
    style API fill:#2196F3,color:#fff
    style PG fill:#9C27B0,color:#fff
    style CS fill:#FF9800,color:#fff
    style P3D fill:#F44336,color:#fff
```

---

## 5. Diagrama Entidad-Relacion (ERD)

```mermaid
erDiagram
    RESTAURANTE {
        uuid id PK
        string nombre
        string slug
        string direccion
        string telefono
        string email
        string logo_url
        json branding
        string tier
        timestamp created_at
        timestamp updated_at
    }

    USUARIO_RESTAURANTE {
        uuid id PK
        uuid restaurante_id FK
        string firebase_uid
        string email
        string rol
        timestamp created_at
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
        int orden
        timestamp created_at
        timestamp updated_at
    }

    INGREDIENTE {
        uuid id PK
        string nombre
        boolean es_alergeno
        string tipo_alergeno
        string icono
    }

    PLATILLO_INGREDIENTE {
        uuid platillo_id FK
        uuid ingrediente_id FK
        boolean es_principal
    }

    ETIQUETA_DIETA {
        uuid id PK
        string nombre
        string icono
    }

    PLATILLO_ETIQUETA {
        uuid platillo_id FK
        uuid etiqueta_id FK
    }

    CODIGO_QR {
        uuid id PK
        uuid restaurante_id FK
        string tipo
        string identificador_mesa
        string url_generada
        timestamp created_at
    }

    EVENTO_ANALYTICS {
        uuid id PK
        uuid restaurante_id FK
        uuid platillo_id FK
        string tipo_evento
        string session_id
        json metadata
        timestamp created_at
    }

    SUSCRIPCION_COMENSAL {
        uuid id PK
        string firebase_uid
        string stripe_subscription_id
        string plan
        string status
        timestamp inicio
        timestamp fin
        timestamp created_at
    }

    MODELO_3D_REQUEST {
        uuid id PK
        uuid platillo_id FK
        uuid restaurante_id FK
        string status
        string tipo
        json fotos_urls
        string modelo_url
        timestamp created_at
        timestamp completed_at
    }

    RESTAURANTE ||--o{ USUARIO_RESTAURANTE : tiene
    RESTAURANTE ||--o{ CATEGORIA : tiene
    RESTAURANTE ||--o{ PLATILLO : tiene
    RESTAURANTE ||--o{ CODIGO_QR : genera
    RESTAURANTE ||--o{ EVENTO_ANALYTICS : registra
    RESTAURANTE ||--o{ MODELO_3D_REQUEST : solicita
    CATEGORIA ||--o{ PLATILLO : contiene
    PLATILLO ||--o{ PLATILLO_INGREDIENTE : tiene
    INGREDIENTE ||--o{ PLATILLO_INGREDIENTE : aparece_en
    PLATILLO ||--o{ PLATILLO_ETIQUETA : tiene
    ETIQUETA_DIETA ||--o{ PLATILLO_ETIQUETA : aplicada_a
    PLATILLO ||--o{ EVENTO_ANALYTICS : genera
    PLATILLO ||--o{ MODELO_3D_REQUEST : tiene
```

---

## 6. Diagramas de Secuencia

### 6.1 Escaneo de QR y Visualizacion del Menu

```mermaid
sequenceDiagram
    actor C as Comensal
    participant N as Navegador
    participant FH as Firebase Hosting
    participant API as FastAPI API
    participant DB as PostgreSQL
    participant CS as Cloud Storage
    participant ADS as Ad Service

    C->>N: Escanea QR con camara
    N->>FH: GET /r/{restaurante_slug}
    FH->>N: HTML + JS del menu
    N->>API: GET /api/restaurantes/{slug}/menu
    API->>DB: Query restaurante + categorias + platillos + ingredientes
    DB-->>API: Datos del menu completo
    API-->>N: JSON con menu completo
    N->>CS: GET fotos de platillos (URLs)
    CS-->>N: Imagenes
    N->>ADS: Solicitar anuncio contextual
    ADS-->>N: Banner publicitario
    N->>N: Renderizar menu con fotos + Top 3 + ads
    N-->>C: Menu visual interactivo

    Note over N,API: Analytics se envian en background
    N->>API: POST /api/analytics/evento {tipo: escaneo}
    API->>DB: INSERT evento_analytics
```

### 6.2 Visualizacion AR de un Platillo

```mermaid
sequenceDiagram
    actor C as Comensal
    participant N as Navegador
    participant MV as model-viewer
    participant CS as Cloud Storage
    participant AR as AR Quick Look / Scene Viewer

    C->>N: Toca platillo - Ve detalle
    N->>N: Muestra detalle con foto, precio, ingredientes
    C->>N: Toca boton "Ver en AR"
    N->>CS: GET modelo .glb del platillo
    CS-->>N: Archivo .glb
    N->>MV: Carga modelo en model-viewer
    MV->>MV: Renderiza modelo 3D rotable
    C->>MV: Toca boton AR del model-viewer
    MV->>AR: Activa sesion AR nativa del OS
    AR->>AR: Abre camara + detecta superficie
    AR-->>C: Modelo 3D del platillo sobre la mesa
    C->>AR: Mueve, rota, escala el modelo
    C->>AR: Cierra AR
    AR-->>N: Regresa al menu
```

### 6.3 Registro y Configuracion de Perfil

```mermaid
sequenceDiagram
    actor C as Comensal
    participant N as Navegador
    participant FA as Firebase Auth
    participant API as FastAPI API
    participant IDB as IndexedDB (local)

    C->>N: Toca "Registrarse"
    N->>FA: Iniciar Sign in with Google
    FA->>FA: OAuth flow
    FA-->>N: Token JWT + UID
    N->>API: POST /api/comensales/registro {token}
    API->>FA: Verificar token
    FA-->>API: UID confirmado
    API-->>N: Cuenta creada (ID anonimo)

    Note over C,IDB: Onboarding de perfil - datos locales
    N-->>C: Pantalla: Configura tu perfil
    C->>N: Selecciona alergias (cacahuate, mariscos)
    C->>N: Selecciona dieta (sin gluten)
    C->>N: Selecciona preferencias (picante, mexicana)
    N->>IDB: Guardar perfil localmente
    IDB-->>N: Perfil guardado en dispositivo

    Note over C,N: El perfil NUNCA se sube al servidor
    N->>N: Filtrado se ejecuta localmente en el navegador
    N-->>C: Menu personalizado listo
```

### 6.4 Asistente IA Conversacional (Fase 4)

```mermaid
sequenceDiagram
    actor C as Comensal Premium
    participant N as Navegador
    participant API as FastAPI API
    participant DB as PostgreSQL
    participant AI as Gemma 2 (local)
    participant IDB as IndexedDB

    C->>N: Abre asistente IA
    N->>IDB: Leer perfil local del comensal
    IDB-->>N: Perfil (alergias, dieta, preferencias)
    C->>N: "Tengo antojo de algo picante pero ligero"
    N->>API: POST /api/ia/recomendar {antojo, perfil_anonimo, restaurante_id}
    API->>DB: Query menu completo del restaurante
    DB-->>API: Platillos con ingredientes
    API->>AI: Prompt con menu + perfil + antojo

    Note over AI: Gemma 2 ejecuta localmente en servidor
    AI->>AI: Analiza ingredientes vs perfil vs antojo
    AI-->>API: 2-3 recomendaciones con explicacion
    API-->>N: JSON con recomendaciones
    N-->>C: "Te recomiendo los Tacos al Pastor porque..."
    C->>N: Toca recomendacion para ver detalle + AR
```

### 6.5 Onboarding de Restaurante

```mermaid
sequenceDiagram
    actor R as Dueno Restaurante
    participant P as Panel Web
    participant API as FastAPI API
    participant FA as Firebase Auth
    participant DB as PostgreSQL
    participant CS as Cloud Storage

    R->>P: Accede a panel.carta.mx
    R->>P: Crea cuenta con email
    P->>FA: Crear usuario restaurante
    FA-->>P: UID + Token

    R->>P: Llena datos del restaurante
    P->>API: POST /api/restaurantes {nombre, direccion, logo}
    API->>CS: Subir logo
    API->>DB: INSERT restaurante
    API-->>P: Restaurante creado con slug

    R->>P: Crea categoria "Entradas"
    P->>API: POST /api/categorias
    API->>DB: INSERT categoria

    R->>P: Agrega platillo con foto
    P->>CS: Upload foto del platillo
    CS-->>P: URL de la foto
    P->>API: POST /api/platillos {nombre, precio, foto_url, ingredientes, alergenos}
    API->>DB: INSERT platillo + relaciones
    API-->>P: Platillo creado

    R->>P: Genera QR para mesas
    P->>API: POST /api/qr/generar {tipo: mesa, cantidad: 10}
    API->>API: Generar QR codes con URLs unicas
    API-->>P: ZIP con 10 QR codes en PDF
    R->>P: Descarga e imprime QRs
```

---

## 7. Flujo de Datos y Privacidad

```mermaid
flowchart TD
    subgraph Dispositivo del Comensal
        A[Perfil alimentario\nAlergias + Dietas + Preferencias]
        B[IndexedDB / localStorage]
        C[Motor de filtrado local]
        D[Backup JSON / Google Drive]
    end

    subgraph Datos Anonimos al Servidor
        E[Session ID anonimo]
        F[Eventos de analytics\nescaneo - vista - filtro - AR]
        G[Antojo para IA\nsin datos personales]
    end

    subgraph Servidor Carta
        H[API FastAPI]
        I[PostgreSQL]
        J[Datos de restaurantes\ny menus - publicos]
        K[Analytics agregados\npor restaurante]
    end

    subgraph Lo que VE el restaurante
        L[Total escaneos hoy: 127]
        M[Platillo mas visto: Tacos al Pastor]
        N[Filtro mas usado: Sin gluten]
        O[Hora pico: 1-3 PM]
    end

    A --> B
    B --> C
    B --> D
    A -.->|NUNCA se envia| H
    E --> H
    F --> H
    G --> H
    H --> I
    I --> J
    I --> K
    K --> L
    K --> M
    K --> N
    K --> O

    style A fill:#C8E6C9
    style B fill:#C8E6C9
    style C fill:#C8E6C9
    style D fill:#C8E6C9
    style H fill:#BBDEFB
    style L fill:#FFF9C4
    style M fill:#FFF9C4
    style N fill:#FFF9C4
    style O fill:#FFF9C4
```

### Resumen de que dato va donde

| Dato | Donde se almacena | Quien puede verlo |
|------|-------------------|-------------------|
| Perfil alimentario (alergias, dietas) | Dispositivo del comensal (IndexedDB) | Solo el comensal |
| Preferencias de sabor | Dispositivo del comensal | Solo el comensal |
| Historial de platillos vistos | Dispositivo del comensal | Solo el comensal |
| Menu del restaurante | Servidor (PostgreSQL) | Publico (cualquier comensal) |
| Fotos y modelos 3D | Cloud Storage | Publico (cualquier comensal) |
| Eventos de analytics | Servidor (PostgreSQL) | Restaurante (agregados), Calvin (raw) |
| Datos de suscripcion | Stripe/Mercado Pago + servidor | Calvin (admin), comensal (su suscripcion) |
| Session ID | Temporal en navegador | Servidor (anonimo) |

---

## 8. Diagrama de Estados — Pipeline 3D

```mermaid
stateDiagram-v2
    [*] --> Pendiente: Restaurante sube fotos
    Pendiente --> EnCola: Se encola para procesamiento
    EnCola --> Procesando: Cloud Run Job inicia
    Procesando --> Generado: TripoSR genera modelo .glb
    Procesando --> Error: Fallo en generacion
    Error --> Pendiente: Reintentar
    Generado --> Revision: Restaurante revisa modelo
    Revision --> Publicado: Restaurante aprueba
    Revision --> Pendiente: Restaurante pide regenerar
    Publicado --> [*]

    note right of Procesando
        TripoSR ejecuta localmente
        en Cloud Run Job.
        Sin costo por API externa.
        Tiempo estimado: 30-60 seg por modelo.
    end note
```

---

## 9. Diagrama de Monetizacion por Fase

```mermaid
gantt
    title Activacion de Fuentes de Ingreso por Fase
    dateFormat X
    axisFormat %s

    section Comensal
    Anuncios en capa gratuita           :active, ads, 1, 4
    Suscripcion Carta Premium           :premium, 3, 4

    section Restaurante
    Tier Gratis                         :active, free, 1, 4
    Tier Pro                            :pro, 3, 4
    Tier Enterprise                     :enterprise, 4, 4

    section Ecosistema
    Marketplace Artistas 3D             :marketplace, 4, 4
    Servicios de Onboarding             :onboarding, 4, 4
```

| Fase | Fuentes de ingreso activas | Ingreso estimado mensual |
|------|---------------------------|-------------------------|
| Fase 1 | Ads + Restaurante gratis (sin ingreso de restaurante) | ~$500-2,000 MXN (solo ads) |
| Fase 2 | Ads (mas escaneos por wow del AR) | ~$2,000-5,000 MXN |
| Fase 3 | Ads + Carta Premium + Restaurante Pro | ~$8,000-15,000 MXN |
| Fase 4 | Todo activo | ~$15,000-30,000+ MXN |

---

## 10. Mapa de Navegacion del Menu Comensal

```mermaid
graph TD
    QR[Escaneo QR] --> HOME[Pantalla Principal]

    HOME --> TOP3[Top 3 Recomendados]
    HOME --> CATS[Categorias]
    HOME --> FILTROS[Filtros]
    HOME --> BUSCAR[Busqueda]
    HOME --> PERFIL[Mi Perfil - Capa 2]
    HOME --> IA[Asistente IA - Premium]

    CATS --> LISTA[Lista de Platillos]
    FILTROS --> LISTA
    BUSCAR --> LISTA
    TOP3 --> DETALLE[Detalle de Platillo]
    LISTA --> DETALLE

    DETALLE --> FOTO[Foto ampliada]
    DETALLE --> INGR[Ingredientes + Alergenos]
    DETALLE --> AR[Ver en AR - 3D]
    DETALLE --> LISTA

    AR --> ARCAM[Camara AR + Modelo 3D]
    ARCAM --> DETALLE

    PERFIL --> ALERGIAS[Mis Alergias]
    PERFIL --> DIETAS[Mis Dietas]
    PERFIL --> HISTORIAL[Mi Historial]
    PERFIL --> EXPORT[Exportar Datos]
    PERFIL --> SUSCRIPCION[Carta Premium]

    IA --> CHAT[Chat Conversacional]
    CHAT --> DETALLE

    style HOME fill:#4CAF50,color:#fff
    style DETALLE fill:#2196F3,color:#fff
    style AR fill:#FF9800,color:#fff
    style IA fill:#9C27B0,color:#fff
    style PERFIL fill:#F44336,color:#fff
```
