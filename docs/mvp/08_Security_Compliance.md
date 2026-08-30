# Carta MVP — Seguridad y Cumplimiento

**Versión:** 1.0 · **Fecha:** 30 de agosto de 2026 · **Jurisdicción:** México

> **Aviso.** Este documento recoge decisiones técnicas y una lectura razonada del marco legal aplicable. No es asesoría legal. Antes de operar con restaurantes reales conviene que un abogado especializado en protección de datos revise el aviso de privacidad y los contratos de piloto.

---

## 1. Postura de privacidad

La decisión de producto es **recolectar lo mínimo indispensable**. Es una ventaja competitiva y reduce drásticamente la superficie de cumplimiento.

| Dato | ¿Se recolecta? | Base |
|---|---|---|
| Nombre real del comensal | No | El alias es libre y opcional |
| Correo o teléfono del comensal | Sólo si inicia sesión (Capa 1, opcional) | Consentimiento explícito |
| Ubicación | No | Nunca se solicita el permiso |
| Contactos, cámara persistente, micrófono | No | La cámara la usa el visor AR del sistema operativo, no la app |
| Identificadores publicitarios | No | No existen en el sistema |
| Dirección IP | Sólo como hash con sal rotativa diaria | Deduplicación de escaneos |
| Perfil alimentario | Sólo Capa 1, cifrado en reposo | Consentimiento; uso exclusivo para filtrar el menú |
| Historial de órdenes | Sí, ligado a la sesión de mesa | Interés legítimo operativo; anonimizado al borrar cuenta |

**Consecuencia práctica:** un comensal de Capa 0 nunca entrega un dato personal identificable. El sistema no sabe quién es.

---

## 2. LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares)

### 2.1 Roles
Para los datos de comensales de Capa 1, **Carta es responsable del tratamiento**. Para los datos operativos del restaurante (menú, mesas, comandas), Carta actúa como **encargado** por cuenta del restaurante. El contrato de piloto debe decirlo explícitamente.

### 2.2 Obligaciones y cómo se cubren

| Obligación | Implementación |
|---|---|
| Aviso de privacidad accesible antes de recabar datos | Enlace visible en la pantalla de entrada y en el pie de la PWA; versión integral en `carta.mx/privacidad` |
| Consentimiento para datos sensibles | El perfil alimentario puede revelar salud o religión (alergias, kosher, halal). Se trata como **dato sensible**: casilla de consentimiento expreso, separada, sin preseleccionar |
| Derechos ARCO | `GET /p/perfil/exportar` (acceso), `PUT /p/perfil` (rectificación), `DELETE /p/perfil` (cancelación), y correo de contacto para oposición |
| Principio de finalidad | El perfil alimentario **sólo** filtra el menú. Prohibido usarlo para segmentar publicidad — regla en el aviso y en el código |
| Medidas de seguridad | Cifrado en tránsito y en reposo, control de acceso por rol, registro de acceso administrativo |
| Plazo de conservación | Definido en [03_Data_Model §8](03_Data_Model.md#8-retención-y-borrado) |

### 2.3 Datos sensibles: la decisión importante
Las alergias son datos de salud y las dietas kosher o halal pueden inferir religión. Por eso:

1. El perfil alimentario **nunca** se activa por defecto.
2. Vive cifrado con clave gestionada en Secret Manager.
3. No se comparte con el restaurante. El restaurante ve el pedido, no el perfil.
4. Se excluye de cualquier exportación analítica agregada.

---

## 3. Amenazas y mitigaciones

Modelo STRIDE aplicado a las superficies del MVP.

| # | Amenaza | Escenario | Mitigación |
|---|---|---|---|
| A1 | Suplantación de comensal | Alguien adivina o roba el token de otro miembro | JWT firmado, `HttpOnly`, vigencia 6 h, sin identificadores adivinables |
| A2 | Enumeración de mesas | Alguien recorre códigos para acceder a sesiones | Código de 128 bits (`secrets.token_urlsafe(16)`); 404 uniforme; límite de tasa por IP |
| A3 | Manipulación de precio | El cliente envía un precio alterado | El precio **nunca** viene del cliente; se lee de la base al agregar y se congela al confirmar |
| A4 | Orden fantasma / spam | Alguien confirma órdenes falsas desde fuera del local | Requiere el código de mesa impreso; límite de tasa; el personal valida en la mesa antes de preparar |
| A5 | Fuga entre restaurantes | Un operador consulta datos de otro | `restaurante_id` siempre derivado del token; 404 en recursos ajenos; prueba de aislamiento obligatoria |
| A6 | Filtración de borradores 3D | URL de borrador compartida | Bucket privado + URL firmada de 15 min |
| A7 | Denegación de servicio por sondeo | Cliente malicioso sondea sin pausa | Límite de 120 peticiones/min por token; `304` baratos; Cloud Armor si escala |
| A8 | Elevación de privilegio a publicación | El worker publica un modelo sin revisión | Restricción de base `ck_publicado_completo`; la cuenta de servicio del worker no tiene permiso de escritura en el bucket público |
| A9 | Robo de token de dispositivo | Tablet extraviada | Token revocable desde el back-office; sólo da acceso a comandas del propio restaurante |
| A10 | Inyección SQL | Entrada maliciosa | SQLAlchemy con parámetros ligados; prohibido construir SQL por concatenación |
| A11 | XSS en alias o notas | Alias con `<script>` | Escapado en render; CSP sin `unsafe-inline`; validación de longitud y contenido |
| A12 | Carga de archivo malicioso | PDF disfrazado de JPG | Validación por contenido (números mágicos), no por extensión; reprocesado con Pillow, que descarta payloads |

---

## 4. Controles técnicos obligatorios

| Control | Estado actual | Tarea |
|---|---|---|
| HTTPS forzado con HSTS | Pendiente | T-6.5 |
| CORS restringido al dominio propio (hoy `allow_origins=["*"]`) | **Vulnerable** | T-6.5 |
| CSP sin `unsafe-inline`, con excepción explícita para `model-viewer` | Pendiente | T-6.5 |
| `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` | Pendiente | T-6.5 |
| Cookies `HttpOnly`, `Secure`, `SameSite=Lax` | Pendiente | T-2.1 |
| Secretos en Secret Manager, nunca en el repositorio | Parcial | T-6.7 |
| Rotación del secreto de firma JWT (trimestral) | Pendiente | T-6.7 |
| Cuenta de servicio del worker con permisos mínimos | Pendiente | T-5.8 |
| Registro de acciones administrativas (quién publicó qué modelo) | Cubierto por `aprobado_por` | T-5.6 |
| Backups diarios con restauración probada | Pendiente | T-6.7 |
| Dependencias auditadas (`pip-audit`, `npm audit`) en CI | Pendiente | T-0.5 |

**El `SECRET_KEY` por defecto en `.env.example` (`dev-secret-key`) no debe existir en ningún entorno desplegado.** El arranque en producción debe fallar si detecta un secreto por defecto.

---

## 5. Retención y eliminación

Resumen operativo; el detalle está en [03_Data_Model §8](03_Data_Model.md#8-retención-y-borrado).

| Dato | Retención | Al vencer |
|---|---|---|
| Eventos de analítica | 13 meses | Se agregan por día y se purga el detalle |
| Sesiones y órdenes | 24 meses | Purga |
| Comandas | 24 meses | Purga |
| Borradores 3D rechazados | 90 días | Borrado del bucket |
| Fotos originales | Vida del platillo + 6 meses | Borrado |
| Cuenta de usuario | Hasta solicitud de borrado | Anonimización de referencias, borrado del perfil |

La purga corre como tarea programada mensual y deja registro de cuántas filas eliminó.

---

## 6. Compromisos con el restaurante piloto

El contrato de piloto debe fijar por escrito:

1. **Propiedad de los datos.** El menú, las fotos y los modelos 3D son del restaurante. Carta los usa para prestar el servicio y para material promocional **sólo con autorización escrita**.
2. **Portabilidad.** Al terminar el piloto, el restaurante recibe sus modelos 3D en formato `.glb` sin costo.
3. **Confidencialidad de métricas.** Los datos de ventas y tickets de un restaurante no se comparten con otros ni se publican identificados.
4. **Sin exclusividad de datos.** Carta puede publicar métricas agregadas y anónimas del piloto.
5. **Baja.** El restaurante puede salir en cualquier momento con 15 días de aviso; sus datos se exportan y se eliminan en 30 días.

---

## 7. Lo que queda fuera y por qué

| Tema | Estado en el MVP | Cuándo importa |
|---|---|---|
| **PCI DSS** | No aplica: el MVP no procesa pagos | v2, al integrar el PSP. Se usará un proveedor que mantenga los datos de tarjeta fuera de nuestros servidores (tokenización) |
| **Facturación SAT / CFDI** | No aplica: no hay cobro al comensal | v2, con la comisión del 1.8% al restaurante |
| **Datos laborales de meseros** | No aplica: el MVP no tiene perfiles de mesero | v2, con el perfil portable — implica datos personales de trabajadores |
| **Accesibilidad WCAG completa** | Sólo contraste AA y áreas táctiles ≥ 44 px | v2, auditoría completa |
| **Menores de edad** | La app no solicita edad ni datos personales en Capa 0 | Si Capa 2 introduce pagos o perfiles, revisar consentimiento parental |

---

## 8. Respuesta a incidentes (mínimo viable)

Con un equipo de una persona, el procedimiento debe ser corto para que se ejecute de verdad.

| Paso | Acción | Tiempo objetivo |
|---|---|---|
| 1 | Detectar: alerta de uptime, error 5xx sostenido, o aviso de un restaurante | — |
| 2 | Contener: revocar tokens o dispositivos afectados; si hay fuga, deshabilitar el endpoint | < 1 h |
| 3 | Evaluar: qué datos se vieron afectados y de cuántas personas | < 4 h |
| 4 | Notificar: a los restaurantes afectados de inmediato; a los titulares si hubo datos personales comprometidos, conforme a la LFPDPPP | < 72 h |
| 5 | Corregir y documentar: causa raíz, corrección y prueba que evite la recurrencia | < 7 días |

Todo incidente se registra en `docs/incidentes/AAAA-MM-DD-titulo.md`, aunque no haya afectado a nadie.
