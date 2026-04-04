# Carta — Diagramas, User Stories y Flujos de UX (v2)

**Version:** 2.0
**Fecha:** 3 de abril de 2026
**Complemento de:** Carta_Ideacion_v3.md

---

## 1. User Stories por Persona y Fase

### Persona: Comensal Anonimo (Capa 0)

**Fase 1:**
- US-C01: Como comensal, quiero escanear un QR y ver el menu en mi celular para no depender del menu fisico.
- US-C02: Como comensal, quiero ver fotos reales de cada platillo para saber como luce.
- US-C03: Como comensal, quiero ver ingredientes y alergenos de cada platillo para saber si es seguro sin preguntar al mesero.
- US-C04: Como comensal, quiero ver los Top 3 recomendados para decidir mas rapido.
- US-C05: Como comensal, quiero que el menu cargue rapido y se vea bien en mi celular.

**Fase 2:**
- US-C06: Como comensal, quiero filtrar por categoria, precio y dieta para navegar mas rapido.
- US-C07: Como comensal, quiero ver un platillo en 3D sobre mi mesa con AR para conocer el tamano real.
- US-C08: Como comensal, quiero rotar y hacer zoom al modelo 3D para verlo desde todos los angulos.
- US-C09: Como comensal, desde la vista 3D quiero poder agregar el platillo a mi orden o regresar al menu.

### Persona: Comensal Registrado Gratis (Capa 1)

**Fase 2:**
- US-C10: Como comensal registrado, quiero unirme a una sesion grupal con mis amigos en la mesa para coordinar nuestra orden.
- US-C11: Como comensal registrado, quiero enviar un platillo que estoy viendo a mis amigos en la sesion para que lo vean sin tener que pasar mi celular.
- US-C12: Como comensal registrado, quiero armar mi orden personal dentro de la sesion grupal para que el mesero sepa exactamente que pedi yo.
- US-C13: Como comensal registrado, quiero presionar un boton de "Llamar mesero" cuando mi orden este lista, y que se notifique automaticamente cuando todos en la mesa hayan confirmado.
- US-C14: Como comensal registrado, quiero modificar mi orden en cualquier momento antes de que el mesero la cierre.

**Fase 3:**
- US-C15: Como comensal registrado, quiero crear un perfil basico de preferencias alimentarias.
- US-C16: Como comensal registrado, quiero ver cuanto llevo gastado en esta sesion y en mi historial de salidas.
- US-C17: Como comensal registrado, quiero exportar mis datos a un archivo JSON para tener un respaldo.
- US-C18: Como comensal registrado, quiero importar un backup de datos para restaurar mi perfil en un nuevo dispositivo.
- US-C19: Como comensal registrado, quiero probar Premium gratis por 1 mes al registrarme.

### Persona: Comensal Premium (Capa 2)

**Fase 3:**
- US-C20: Como comensal Premium, quiero que el menu me senale platillos como seguro/precaucion/no recomendado segun mi perfil completo de alergias y dietas.
- US-C21: Como comensal Premium, quiero navegar sin anuncios en todos los restaurantes.
- US-C22: Como comensal Premium, quiero que mi perfil y datos se respalden cifrados en la nube automaticamente.
- US-C23: Como comensal Premium, quiero migrar mis datos a un nuevo celular sin perder nada.
- US-C24: Como comensal Premium, quiero poder cancelar mi suscripcion en cualquier momento sin perder mis datos locales.

**Fase 4:**
- US-C25: Como comensal Premium, quiero decirle al asistente IA "tengo antojo de algo picante pero ligero" y recibir recomendaciones del menu actual.
- US-C26: Como comensal Premium, quiero que la IA considere mi historial en otros restaurantes para mejorar recomendaciones.
- US-C27: Como comensal Premium, quiero que las recomendaciones incluyan platillos populares entre usuarios con gustos similares a los mios.
- US-C28: Como comensal Premium, quiero que Carta me recomiende restaurantes cercanos de su red que se ajusten a mi perfil.
- US-C29: Como comensal Premium, quiero ver analytics de mis gastos por categoria, restaurante y tendencias mensuales.
- US-C30: Como comensal Premium, quiero hacer opt-in para compartir mis datos anonimos y recibir Carta Credits a cambio.

**Futuro:**
- US-C31: Como comensal, quiero pre-ordenar mi comida desde el camino al restaurante para que este casi lista cuando llegue.
- US-C32: Como comensal, quiero personalizar un platillo (quitar/agregar ingredientes) desde Carta si el restaurante lo permite.

### Persona: Dueno/Administrador de Restaurante

**Fase 1:**
- US-R01: Como administrador, quiero registrar mi restaurante en Carta para ofrecer un menu digital mejorado.
- US-R02: Como administrador, quiero subir mi menu en PDF y que la IA extraiga automaticamente los platillos con nombre, descripcion y precio.
- US-R03: Como administrador, quiero revisar, editar y completar cada platillo extraido por la IA antes de publicarlo.
- US-R04: Como administrador, quiero agregar platillos manualmente con al menos nombre y precio (lo demas es opcional pero recomendado).
- US-R05: Como administrador, quiero generar QR ilimitados para cada mesa de mi restaurante.
- US-R06: Como administrador, quiero ver un dashboard con escaneos diarios, platillos mas vistos y filtros mas usados.
- US-R07: Como administrador, quiero marcar mis Top 3 platillos recomendados.

**Fase 2:**
- US-R08: Como administrador, quiero subir fotos de un platillo y que la IA genere un modelo 3D automaticamente.
- US-R09: Como administrador, quiero subir mis propios modelos 3D en formato glTF/GLB.
- US-R10: Como administrador, quiero personalizar el menu con logo, colores y estilo de mi restaurante.
- US-R11: Como administrador, quiero QR personalizados con mi logo embebido o explorar usar NFC en mis mesas.
- US-R12: Como administrador, quiero recibir notificacion cuando una mesa ya confirmo su orden y esta lista para el mesero.

**Fase 3:**
- US-R13: Como administrador, quiero pagar por promover platillos especificos, descuentos o promociones en el espacio de anuncios de mi propio menu en Carta.
- US-R14: Como administrador Pro, quiero ver analytics avanzados: tendencias por dia/hora, comparativas entre platillos, horarios pico.
- US-R15: Como administrador Pro, quiero ver las ordenes por mesa con el nombre/identificador de cada comensal para que mi equipo sepa quien pidio que.

**Fase 4:**
- US-R16: Como administrador, quiero solicitar modelos 3D profesionales a artistas verificados a traves del marketplace de Carta.
- US-R17: Como administrador, quiero ver el portafolio, reviews y precios de cada artista antes de contratarlo.
- US-R18: Como administrador Enterprise, quiero integrar Carta con mi sistema de gestion (Zof Restaurant u otro) para sincronizar el menu y recibir ordenes.

---

## 2. Flujo del Comensal (Journey Completo v2)

```mermaid
flowchart TD
    A[Llega al restaurante] --> B[Escanea QR de la mesa]
    B --> C[Menu se abre en navegador\nCapa 0: Anonimo]
    C --> D[Ve menu con fotos\nTop 3 + Alergenos + Ads]

    D --> E{Que quiere hacer?}
    E -->|Navegar| F[Explora categorias\nAplica filtros]
    E -->|Ver en 3D| G[AR: ve platillo en su mesa\nAgrega a orden o regresa]
    E -->|Ver ingredientes| H[Detalle: ingredientes\nalergenos, precio]

    F --> I{Quiere funciones sociales?}
    H --> I
    G --> I

    I -->|No| J[Decide platillo\nLlama al mesero de forma tradicional]
    I -->|Si| K[Login rapido\nGoogle/Apple\nCapa 1: Registrado]

    K --> L[Se une a sesion grupal\nde la mesa automaticamente]
    L --> M[Ve quienes estan en la sesion]

    M --> N{Que hace?}
    N -->|Navegar| F
    N -->|Compartir platillo| O[Envia platillo a\namigo en la sesion]
    N -->|Armar orden| P[Agrega platillos\na su orden personal]

    O --> N
    P --> Q{Orden lista?}
    Q -->|No| N
    Q -->|Si| R[Confirma su orden]

    R --> S{Todos en la mesa\nconfirmaron?}
    S -->|No| T[Espera a los demas\nPuede modificar]
    S -->|Si| U[Se notifica al mesero\nautomaticamente]

    U --> V[Mesero llega\nConfirma ordenes\nValida ingredientes/alergenos]
    V --> W[Mesero cierra y envia a cocina]

    W --> X[Cada comensal ve\nsu orden confirmada\ny costo acumulado]

    J --> Y[Ordena de forma tradicional]

    style C fill:#E8F5E9
    style K fill:#FFF3E0
    style U fill:#E3F2FD
    style W fill:#E3F2FD
```

---

## 3. Flujo del Restaurante (Onboarding + PDF Import)

```mermaid
flowchart TD
    A[Dueno visita carta.mx] --> B[Crea cuenta]
    B --> C[Registra restaurante\nNombre, direccion, tipo cocina]

    C --> D{Como quiere cargar el menu?}
    D -->|Subir PDF| E[Sube PDF del menu actual]
    D -->|Manual| F[Wizard: agrega platillos uno a uno]
    D -->|Ambos| E

    E --> G[Pipeline IA procesa PDF]
    G --> G1[OCR extrae texto del PDF\nTesseract + EasyOCR]
    G1 --> G2[Gemma 4 estructura datos:\nnombre, descripcion, precio\ncategoria, ingredientes]
    G2 --> G3[Genera lista de platillos\nextraidos automaticamente]
    G3 --> H[Restaurante revisa cada platillo:\nedita, completa, aprueba o descarta]

    F --> I[Por cada platillo:\n- Nombre OBLIGATORIO\n- Precio OBLIGATORIO\n- Descripcion opcional\n- Foto opcional\n- Ingredientes recomendado\n- Alergenos recomendado\n- Categoria recomendado]

    H --> J{Mas platillos?}
    I --> J
    J -->|Si: manual| F
    J -->|Si: otro PDF| E
    J -->|No| K[Marca Top 3 recomendados]

    K --> L{Quiere modelo 3D?}
    L -->|IA gratuita| M[Sube 4-6 fotos\nIA genera modelo 3D]
    L -->|Propio| N[Sube glTF/GLB]
    L -->|Profesional| O[Solicita en marketplace]
    L -->|Despues| P[Solo foto 2D por ahora]

    M & N & O & P --> Q[Preview del menu\ncomo lo ve el comensal]
    Q --> R{Aprueba?}
    R -->|Ajustar| F
    R -->|Listo| S[Genera QRs para mesas]

    S --> T{Tipo de QR?}
    T -->|Basico gratis| U[QR estandar\nblanco/negro]
    T -->|Personalizado| V[QR con logo\ncolores de marca]
    T -->|NFC Fase 2| W[Tags NFC\npara mesas]

    U & V & W --> X[Imprime/instala\nen mesas]
    X --> Y[Restaurante activo\nDashboard en vivo]

    style E fill:#E3F2FD
    style G fill:#FFF3E0
    style Y fill:#E8F5E9
```

---

## 4. Diagrama de Secuencia: Sesion Grupal + Orden

```mermaid
sequenceDiagram
    actor C1 as Comensal 1
    actor C2 as Comensal 2
    participant APP as Carta Web
    participant WS as WebSocket Server
    participant API as FastAPI
    participant DB as PostgreSQL
    participant REDIS as Redis
    participant NOTIF as Notificaciones

    Note over C1,C2: Ambos escanean el QR de la mesa 5

    C1->>APP: Escanea QR mesa 5
    APP->>API: GET /api/menu + mesa_id=5
    API->>DB: SELECT menu del restaurante
    DB-->>API: Menu completo
    API-->>APP: Menu + session_token
    APP-->>C1: Menu renderizado (Capa 0)

    C1->>APP: Login con Google (Capa 1)
    APP->>API: POST /api/sesion/unirse mesa_id=5
    API->>REDIS: Crear/unir sesion grupal mesa_5
    API->>WS: Abrir canal WebSocket sesion_mesa_5
    REDIS-->>API: Sesion activa: [Comensal1]
    WS-->>C1: Conectado a sesion. Miembros: [tu]

    C2->>APP: Escanea QR mesa 5 + Login
    APP->>API: POST /api/sesion/unirse mesa_id=5
    API->>REDIS: Agregar C2 a sesion_mesa_5
    WS-->>C1: Nuevo miembro: Comensal2
    WS-->>C2: Conectado. Miembros: [C1, tu]

    C1->>APP: Toca platillo "Tacos al Pastor"
    C1->>APP: Toca "Compartir con mesa"
    APP->>WS: SHARE platillo_id=42 to sesion
    WS-->>C2: C1 te comparte: Tacos al Pastor

    C1->>APP: Agrega Tacos al Pastor a su orden
    APP->>WS: ORDER_UPDATE C1: [Tacos al Pastor]
    C2->>APP: Agrega Enchiladas a su orden
    APP->>WS: ORDER_UPDATE C2: [Enchiladas]

    Note over C1,C2: Ambos ven las ordenes de todos en tiempo real

    C1->>APP: Confirma su orden
    APP->>WS: ORDER_CONFIRMED C1
    C2->>APP: Confirma su orden
    APP->>WS: ORDER_CONFIRMED C2

    Note over WS: Todos confirmaron

    WS->>API: POST /api/mesa/5/orden-lista
    API->>NOTIF: Notificar restaurante: Mesa 5 lista
    NOTIF-->>APP: Push al panel restaurante
    Note over API: El mesero ve en su panel:\nMesa 5 - Lista para ordenar\nC1: Tacos al Pastor\nC2: Enchiladas

    API->>WS: WAITER_NOTIFIED
    WS-->>C1: Mesero notificado. En camino.
    WS-->>C2: Mesero notificado. En camino.
```

---

## 5. Diagrama de Secuencia: Llamar Mesero + Confirmar Orden

```mermaid
sequenceDiagram
    actor M as Mesero
    participant PANEL as Panel Restaurante
    actor C1 as Comensal 1
    actor C2 as Comensal 2
    participant WS as WebSocket

    Note over C1,C2: Mesa 5: ordenes confirmadas

    PANEL-->>M: Notificacion: Mesa 5 lista
    M->>PANEL: Abre ordenes de Mesa 5
    Note over PANEL: C1: Tacos al Pastor\nC2: Enchiladas Suizas

    M->>M: Va a la mesa, verifica con comensales

    alt Orden OK sin cambios
        M->>PANEL: Confirma y cierra orden Mesa 5
        PANEL->>WS: ORDER_CLOSED mesa_5
        WS-->>C1: Orden confirmada por mesero
        WS-->>C2: Orden confirmada por mesero
        Note over PANEL: Orden enviada a cocina
    else Comensal quiere cambiar
        C1->>WS: Modifica orden: cambia a Tacos de Suadero
        WS-->>PANEL: C1 modifico su orden
        M->>PANEL: Confirma orden actualizada
        PANEL->>WS: ORDER_CLOSED mesa_5
        WS-->>C1: Orden confirmada (Tacos de Suadero)
        WS-->>C2: Orden confirmada (Enchiladas)
    else Mesero sugiere cambio
        M->>PANEL: Agrega nota: "Se acabo el pastor, sugerimos suadero"
        PANEL->>WS: WAITER_NOTE "Se acabo el pastor"
        WS-->>C1: Nota del mesero: Se acabo el pastor
        C1->>WS: Acepta cambio a Suadero
        M->>PANEL: Confirma y cierra
    end

    Note over C1,C2: Cada comensal ve su orden\nfinal y costo acumulado
```

---

## 6. Diagrama de Secuencia: Import PDF con IA

```mermaid
sequenceDiagram
    actor R as Restaurante
    participant PANEL as Panel Web
    participant API as FastAPI
    participant OCR as Tesseract/EasyOCR
    participant LLM as Gemma 4
    participant DB as PostgreSQL

    R->>PANEL: Sube menu.pdf
    PANEL->>API: POST /api/menu/import-pdf (archivo)
    API->>API: Extrae paginas del PDF
    API->>OCR: Procesa cada pagina
    OCR-->>API: Texto crudo extraido

    API->>LLM: Prompt: Estructura estos datos de menu
    Note over LLM: Input: texto crudo del OCR\nOutput: JSON estructurado\n[{nombre, descripcion, precio,\ncategoria, ingredientes}]

    LLM-->>API: JSON con platillos extraidos
    API->>DB: INSERT platillos como borrador (estado: pendiente_revision)
    DB-->>API: IDs de platillos creados
    API-->>PANEL: Lista de platillos extraidos para revision

    R->>PANEL: Revisa platillo 1
    Note over R: Nombre: Tacos al Pastor - OK\nPrecio: $85 - OK\nDescripcion: edita para mejorar\nIngredientes: agrega los faltantes\nAlergenos: selecciona tags\nFoto: sube foto

    R->>PANEL: Aprueba platillo 1
    PANEL->>API: PUT /api/platillos/{id} estado=aprobado
    API->>DB: UPDATE platillo SET estado=activo

    R->>PANEL: Descarta platillo mal extraido
    PANEL->>API: DELETE /api/platillos/{id}

    R->>PANEL: Agrega platillo nuevo manualmente
    PANEL->>API: POST /api/platillos {nombre, precio}
    Note over R: Solo nombre y precio son obligatorios.\nResto es opcional pero recomendado.
```

---

## 7. Diagrama de Secuencia: Compartir Platillo con Amigos

```mermaid
sequenceDiagram
    actor C1 as Comensal 1
    actor C2 as Comensal 2
    participant APP as Carta Web
    participant WS as WebSocket

    Note over C1,C2: Ambos en sesion grupal Mesa 5

    C1->>APP: Navega al platillo "Arrachera 300g"
    C1->>APP: Toca boton "Compartir con mesa"
    APP->>WS: SHARE {platillo_id: 42, from: C1, to: sesion}
    WS-->>C2: Notificacion: C1 te comparte Arrachera 300g

    C2->>APP: Toca notificacion
    APP-->>C2: Abre detalle del platillo Arrachera 300g
    Note over C2: Ve foto, precio, ingredientes,\nalergenos, opcion 3D

    C2->>APP: Toca "Ver en 3D"
    Note over C2: Ve el platillo en AR sobre su mesa

    alt Le gusta
        C2->>APP: Agrega a su orden personal
    else No le gusta
        C2->>APP: Regresa al menu
    end
```

---

## 8. Flujo de Monetizacion Completo (v2)

```mermaid
flowchart TD
    subgraph Comensales
        CA[Capa 0: Anonimo\nVe ads] --> CB[Capa 1: Registrado Gratis\nVe ads + 1 mes trial Premium]
        CB --> CC[Capa 2: Premium\n$29/mes sin ads\n+ todas las features]
        CC --> CD[Opt-in datos anonimos\n= Carta Credits]
    end

    subgraph Restaurantes
        RA[Tier Gratis\nMenu + QR + Analytics basico]
        RA --> RB[Ads Self-Serve\nPagar por promover\nsus propios platillos]
        RA --> RC[Tier Pro $249/mes\nAnalytics avanzado\n+ Ordenes por mesa]
        RC --> RD[Tier Enterprise\nMulti-sucursal\n+ Integraciones]
    end

    subgraph Marketplace
        MA[Artista publica perfil\nPortafolio + precios] --> MB[Restaurante solicita\nmodelo 3D]
        MB --> MC[Artista entrega modelo]
        MC --> MD[Restaurante aprueba]
        MD --> ME[Pago: 80-85% artista\n15-20% Carta]
    end

    subgraph Futuro
        FA[Insights anonimos\nagregados vendidos\na industria restaurantera]
    end

    style CC fill:#4CAF50,color:#fff
    style RC fill:#2196F3,color:#fff
    style ME fill:#FF9800,color:#fff
```

---

## 9. Marketplace de Artistas 3D (Modelo Fiverr)

```mermaid
flowchart TD
    subgraph Artista
        A1[Se registra como artista] --> A2[Crea perfil:\nPortafolio\nExperiencia\nPrecios\nTiempo de entrega]
        A2 --> A3[Carta verifica y aprueba]
        A3 --> A4[Perfil visible en marketplace]
    end

    subgraph Restaurante_Busca[Restaurante Busca]
        R1[Quiere modelo 3D profesional] --> R2[Navega marketplace\nVe perfiles, portafolios,\nreviews y precios]
        R2 --> R3[Selecciona artista\nEnvia brief: fotos del platillo\nreferencias, notas]
    end

    subgraph Proyecto
        P1[Artista recibe solicitud] --> P2{Acepta?}
        P2 -->|Si| P3[Trabaja en modelo 3D]
        P2 -->|No| P4[Restaurante busca otro]
        P3 --> P5[Entrega preview]
        P5 --> P6{Restaurante aprueba?}
        P6 -->|Revision| P7[Artista ajusta]
        P7 --> P5
        P6 -->|Aprobado| P8[Modelo publicado en menu]
    end

    subgraph Pago
        P8 --> PA[Restaurante paga precio acordado]
        PA --> PB[Artista recibe 80-85%]
        PA --> PC[Carta recibe 15-20% comision]
    end

    subgraph Disputas
        D1[Alguna parte no esta conforme] --> D2[Abre disputa en Carta]
        D2 --> D3[Carta revisa evidencia\nMediacion]
        D3 --> D4[Resolucion: reembolso\no pago parcial\no acuerdo]
    end

    subgraph Reputacion
        P8 --> RE1[Restaurante califica artista]
        P8 --> RE2[Artista califica restaurante]
        RE1 & RE2 --> RE3[Rating visible en perfiles]
    end

    style P8 fill:#4CAF50,color:#fff
    style PC fill:#FF9800,color:#fff
```

---

## 10. Red de Restaurantes Carta (Grafo de Recomendaciones)

```mermaid
graph TD
    subgraph Usuarios
        U1[Usuario A\nPerfil: picante, mexicana\nsin lactosa]
        U2[Usuario B\nPerfil: picante, mexicana\nsin gluten]
        U3[Usuario C\nPerfil: italiana, mariscos]
    end

    subgraph Restaurantes_Red[Red de Restaurantes Carta]
        R1[Taqueria El Sol\nMexicana]
        R2[La Parrilla\nMexicana-Argentina]
        R3[Trattoria Roma\nItaliana]
        R4[Mariscos del Puerto\nMariscos]
    end

    U1 -->|"Le gusto: Tacos al Pastor"| R1
    U2 -->|"Le gusto: Tacos al Pastor"| R1
    U1 -.->|"Recomendacion: gustos similares a U2"| R2
    U2 -.->|"Recomendacion: gustos similares a U1"| R2
    U3 -->|"Le gusto: Pasta Alfredo"| R3
    U3 -.->|"Recomendacion: mariscos en tu perfil"| R4

    subgraph Variables[Variables del Algoritmo]
        V1[Preferencias del perfil]
        V2[Historial de platillos gustados]
        V3[Distancia al restaurante]
        V4[Rating del restaurante]
        V5[Precio promedio]
        V6[Usuarios similares]
    end

    style U1 fill:#FFF3E0
    style U2 fill:#FFF3E0
    style U3 fill:#FFF3E0
    style R1 fill:#E8F5E9
    style R2 fill:#E8F5E9
    style R3 fill:#E8F5E9
    style R4 fill:#E8F5E9
```

---

## 11. Diagrama de Estados del Comensal (v2)

```mermaid
stateDiagram-v2
    [*] --> Anonimo: Escanea QR

    Anonimo --> NavegandoMenu: Menu cargado
    NavegandoMenu --> ViendoAR: Toca Ver en 3D
    ViendoAR --> NavegandoMenu: Regresa
    ViendoAR --> AgregandoAOrden: Agrega platillo
    NavegandoMenu --> ViendoDetalle: Toca platillo
    ViendoDetalle --> NavegandoMenu: Regresa
    ViendoDetalle --> AgregandoAOrden: Agrega platillo
    NavegandoMenu --> Filtrando: Aplica filtros
    Filtrando --> NavegandoMenu: Resultados

    NavegandoMenu --> Registrandose: Quiere features sociales
    Registrandose --> RegistradoEnSesion: Login exitoso

    state RegistradoEnSesion {
        [*] --> EnSesionGrupal
        EnSesionGrupal --> CompartiendoPlatillo: Comparte con mesa
        CompartiendoPlatillo --> EnSesionGrupal: Enviado
        EnSesionGrupal --> ArmandoOrden: Agrega a orden
        ArmandoOrden --> EnSesionGrupal: Sigue navegando
        ArmandoOrden --> OrdenConfirmada: Confirma orden
        OrdenConfirmada --> ArmandoOrden: Modifica
    }

    RegistradoEnSesion --> EsperandoMesero: Todos confirmaron
    EsperandoMesero --> OrdenCerrada: Mesero confirma
    OrdenCerrada --> ViendoCuenta: Ve costo total

    AgregandoAOrden --> NavegandoMenu: Sin registro solo navega

    NavegandoMenu --> SuscribiendoPremium: Quiere Premium
    SuscribiendoPremium --> Premium: Pago exitoso

    state Premium {
        [*] --> MenuFiltrado: Menu personalizado sin ads
        MenuFiltrado --> AsistenteIA: Abre asistente
        AsistenteIA --> MenuFiltrado: Recibe recomendacion
        MenuFiltrado --> DescubriendoRestaurantes: Explora red Carta
    end

    ViendoCuenta --> [*]: Sale del restaurante
```

---

## 12. Modelo de Datos Conceptual (ER v2)

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
        string tier
        timestamp creado_en
    }

    USUARIO_RESTAURANTE {
        uuid id PK
        uuid restaurante_id FK
        string firebase_uid
        string rol
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
        string estado
        timestamp creado_en
    }

    INGREDIENTE {
        uuid id PK
        string nombre
        string categoria
    }

    ALERGENO {
        uuid id PK
        string nombre
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
        string nivel
    }

    ETIQUETA_DIETETICA {
        uuid id PK
        string nombre
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
        string tipo_acceso
    }

    SESION_GRUPAL {
        uuid id PK
        uuid mesa_id FK
        uuid restaurante_id FK
        string estado
        timestamp creada_en
        timestamp cerrada_en
    }

    MIEMBRO_SESION {
        uuid id PK
        uuid sesion_id FK
        string firebase_uid
        string nombre_display
        string rol_sesion
        timestamp unido_en
    }

    ORDEN_PERSONAL {
        uuid id PK
        uuid sesion_id FK
        uuid miembro_id FK
        string estado
        decimal total
        timestamp creada_en
        timestamp confirmada_en
    }

    ITEM_ORDEN {
        uuid id PK
        uuid orden_id FK
        uuid platillo_id FK
        int cantidad
        text notas
        decimal precio_unitario
    }

    EVENTO_ANALYTICS {
        uuid id PK
        uuid restaurante_id FK
        uuid mesa_id FK
        uuid platillo_id FK
        string tipo
        jsonb metadata
        timestamp creado_en
    }

    SUSCRIPCION_COMENSAL {
        uuid id PK
        string firebase_uid
        string estado
        string plan
        timestamp inicio
        timestamp fin
        timestamp trial_fin
        string stripe_id
    }

    AD_RESTAURANTE {
        uuid id PK
        uuid restaurante_id FK
        uuid platillo_id FK
        string tipo
        string texto_promo
        decimal presupuesto_diario
        string estado
        timestamp inicio
        timestamp fin
    }

    ARTISTA_3D {
        uuid id PK
        string nombre
        string portafolio_url
        text bio
        decimal rating
        int trabajos_completados
        boolean verificado
    }

    SOLICITUD_MODELO_3D {
        uuid id PK
        uuid restaurante_id FK
        uuid platillo_id FK
        uuid artista_id FK
        string estado
        decimal precio
        decimal comision_carta
        text brief
        timestamp creado_en
        timestamp entregado_en
    }

    REVIEW_MARKETPLACE {
        uuid id PK
        uuid solicitud_id FK
        string autor_tipo
        string autor_id
        int estrellas
        text comentario
        timestamp creado_en
    }

    DISPUTA {
        uuid id PK
        uuid solicitud_id FK
        string reportado_por
        text descripcion
        string estado
        text resolucion
        timestamp creado_en
        timestamp resuelto_en
    }

    RESTAURANTE ||--o{ USUARIO_RESTAURANTE : tiene
    RESTAURANTE ||--o{ CATEGORIA : tiene
    RESTAURANTE ||--o{ PLATILLO : ofrece
    RESTAURANTE ||--o{ MESA : tiene
    RESTAURANTE ||--o{ EVENTO_ANALYTICS : genera
    RESTAURANTE ||--o{ AD_RESTAURANTE : publica
    RESTAURANTE ||--o{ SOLICITUD_MODELO_3D : pide
    CATEGORIA ||--o{ PLATILLO : agrupa
    PLATILLO ||--o{ PLATILLO_INGREDIENTE : contiene
    INGREDIENTE ||--o{ PLATILLO_INGREDIENTE : en
    PLATILLO ||--o{ PLATILLO_ALERGENO : tiene
    ALERGENO ||--o{ PLATILLO_ALERGENO : en
    PLATILLO ||--o{ PLATILLO_ETIQUETA : etiquetado
    ETIQUETA_DIETETICA ||--o{ PLATILLO_ETIQUETA : aplica
    PLATILLO ||--o{ ITEM_ORDEN : ordenado
    PLATILLO ||--o{ EVENTO_ANALYTICS : registra
    MESA ||--o{ SESION_GRUPAL : aloja
    SESION_GRUPAL ||--o{ MIEMBRO_SESION : tiene
    SESION_GRUPAL ||--o{ ORDEN_PERSONAL : contiene
    MIEMBRO_SESION ||--o{ ORDEN_PERSONAL : crea
    ORDEN_PERSONAL ||--o{ ITEM_ORDEN : incluye
    ARTISTA_3D ||--o{ SOLICITUD_MODELO_3D : ejecuta
    SOLICITUD_MODELO_3D ||--o{ REVIEW_MARKETPLACE : recibe
    SOLICITUD_MODELO_3D ||--o{ DISPUTA : genera
```

---

## 13. Diagrama de Despliegue (Infraestructura v2)

```mermaid
graph TB
    subgraph Internet
        USER[Comensales\nNavegador movil]
        REST[Restaurantes\nNavegador desktop/movil]
    end

    subgraph GCP[Google Cloud Platform]
        subgraph Firebase_Services[Firebase]
            FH[Firebase Hosting\nCDN + SSL\ncarta.mx]
            FAUTH[Firebase Auth\nGoogle/Apple]
            FCM[Cloud Messaging\nPush notifications]
        end

        subgraph Cloud_Run_Services[Cloud Run]
            API1[API Principal\nFastAPI + Docker\nREST + WebSockets]
            WORKER[Worker IA\nGemma 4 + TripoSR\nProcesamiento async]
        end

        subgraph Data_Services[Datos]
            CSQL[Cloud SQL\nPostgreSQL 15]
            GCS2[Cloud Storage\nFotos + GLB + PDFs]
            MEMSTORE[Memorystore\nRedis\nSesiones + Cache]
        end
    end

    subgraph External[Servicios Externos]
        STRIPE[Stripe / MercadoPago\nPagos + Suscripciones]
        ADSNET[Ads Network\nContextuales]
        GMAPS[Google Maps API\nUbicaciones + Reviews]
    end

    USER -->|HTTPS| FH
    REST -->|HTTPS| FH
    FH --> API1
    API1 --> FAUTH
    API1 --> CSQL
    API1 --> GCS2
    API1 --> MEMSTORE
    API1 --> STRIPE
    API1 --> FCM
    API1 --> WORKER
    WORKER --> GCS2
    WORKER --> CSQL
    USER -.-> GCS2
    API1 -.-> GMAPS

    style FH fill:#4CAF50,color:#fff
    style API1 fill:#FF9800,color:#fff
    style CSQL fill:#9C27B0,color:#fff
    style MEMSTORE fill:#F44336,color:#fff
```

---

## 14. Alternativas al QR (Visual)

```mermaid
graph LR
    subgraph Fase_1[Fase 1]
        QR1[QR Basico\nBlanco/negro\nGratis ilimitado]
    end

    subgraph Fase_2[Fase 2]
        QR2[QR con Branding\nLogo embebido\nColores de marca]
        NFC[NFC Tag\nSticker en mesa\nTap to open]
        STAND[Stand de Mesa\nAcrilico con QR/NFC\nParte de la decoracion]
    end

    subgraph Futuro_QR[Futuro]
        MARKER[Table Marker AR\nPosavasos con diseno\nApuntar camara = Carta]
    end

    Fase_1 --> Fase_2 --> Futuro_QR

    style QR1 fill:#E8F5E9
    style QR2 fill:#E3F2FD
    style NFC fill:#E3F2FD
    style MARKER fill:#FFF3E0
```
