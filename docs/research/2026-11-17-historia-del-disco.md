# Historia del disco: una mesa de tres comensales (generado; no editar a mano)

Generado por `2026-11-17-historia-del-disco.mjs` desde `2026-11-14-parametros.json`. Datos: bytes por fila (con índices) de una copia de medición en PostgreSQL local con **datos sintéticos** (`2026-11-17-fila-por-visita-medir.py` y `2026-11-14-recursos-medir.py`); con tráfico real cambia.

## 1. Paso a paso: qué se guarda cuando entra una mesa de 3

| Paso | Tabla | Filas | Bytes por fila | Bytes | Acumulado |
|---|---|---|---|---|---|
| Escanean el QR: entra el primero y se crea la sesión de la mesa | `sesion_grupal` | 1 | 264 | 264 | 264 |
| Cada comensal entra y se vuelve miembro (3) | `miembro_sesion` | 3 | 250 | 750 | 1,014 |
| Cada uno abre su orden personal | `orden_personal` | 3 | 229 | 687 | 1,701 |
| Agregan platillos a su orden (3 por comensal en la copia) | `item_orden` | 9 | 174 | 1,566 | 3,267 |
| La mesa envía la comanda al personal | `comanda` | 1.3 | 334 | 434 | 3,701 |
| La comanda enlaza la orden de cada comensal | `comanda_orden` | 3 | 169 | 507 | 4,208 |
| Alguien llama al mesero (en la copia: una de cada 3.3 sesiones) | `llamada_mesero` | 0.3 | 304 | 92 | 4,300 |
| Mientras tanto, el teléfono de cada comensal manda sus eventos (3.9 por comensal: supuesto del generador) | `evento_analitica` | 11.6 | 353 | 4,082 | 8,382 |

**Una mesa de 3 deja 8.4 KB en la base: 4.3 KB de la mesa y 4.1 KB (49 %) de analítica.** La analítica es la mitad de lo que deja la visita, y es la parte que se puede cambiar sin tocar la orden ni la comanda. Los conteos por sesión salen de los cocientes de la copia; los eventos por sesión (10) son un supuesto del generador de datos.

## 2. Cómo queda lo guardado con cada opción

Por mesa de 3, lo que ocupa la analítica; y cuántos restaurantes caben por disco (con avisos, carga por topes) sin purga y con el historial del plan gratuito a 30 días.

| Opción | Qué queda en la base | Qué se pierde | Analítica por mesa de 3 (bytes) | Analítica por restaurante al mes (MB, en la copia) | Caben sin purga | Caben con historial a 30 días |
|---|---|---|---|---|---|---|
| Hoy: una fila por evento | una fila por toque del comensal, con sesión, miembro, platillo, huella de red y navegador | nada | 4,082 | 6.35 | 41 | 182 |
| Contar por día | un conteo por restaurante, día, tipo y platillo; crece con los días y los platillos, no con las visitas | el detalle por sesión y por teléfono | 449 | 0.7 | 68 | 222 |
| Fila por visita de comensal (propuesta de Calvin) | una fila por comensal y día con veces y segundos en menú, platillo y búsqueda (los filtros se cuentan por restaurante y día, no por comensal); crece con las visitas | qué platillo se vio y el orden de los toques | 458 | 0.71 | 68 | 222 |
| Fila por visita más conteo de platillo por día | la fila por visita más un conteo diario por platillo | cuál comensal vio cuál platillo | 721 | 1.12 | 65 | 219 |
| Adelgazar la tabla (índices mínimos y tipos chicos) | una fila por evento, más angosta y con dos índices | índices de consulta; huella de red de 8 bytes | 2,487 | 3.87 | 49 | 197 |
| Archivar las sesiones de los restaurantes de paga (3 meses en la base) | la base conserva sólo 3 meses de las sesiones del plan de paga; lo viejo queda en R2 (no se borra) | consulta inmediata de lo viejo de los de paga; hay que releer del archivo | 4,082 | 6.35 | 46 | 347 |
| Archivar las sesiones de todos los planes (3 meses en la base) | la base conserva sólo 3 meses de las sesiones de cada restaurante, gratuito incluido; lo viejo queda en R2 (no se borra) | consulta inmediata de lo viejo de todos; el gratuito pierde historial en línea | 4,082 | 6.35 | 70 | 347 |

Comprar disco: No cambia los datos guardados: sube el costo del escalón (ver la escalera en recursos y palancas). Archivar no es borrar y no baja la analítica: saca de la base las sesiones de más de 3 meses y las deja en R2, de donde se vuelven a leer (toca las reglas 8 y 9 y pide ADR). **Hay dos alcances que no se suman:** sólo las de los restaurantes de paga (3 meses en la base) o las de todos los planes (también el gratuito queda en 3 meses); las bajas de «contar por día» y «fila por visita» son a **el volumen de la copia** (1,800 sesiones por restaurante-mes, 18,000 eventos): contar por día crece con los días y los platillos, no con las visitas, así que con más visitas gana más.

### Combinaciones (restaurantes registrados que caben por disco, con avisos)

| Archivo de sesiones | Forma de guardar la analítica | Con el historial del gratuito a 30 días (propuesta) | Con el gratuito a 12 meses, sin purga (03 §7: política vigente) |
|---|---|---|---|
| sin archivo | una fila por evento (hoy) | 182 | 41 |
| sin archivo | contar por día | 222 | 68 |
| sin archivo | fila por visita | 222 | 68 |
| sin archivo | fila por visita más platillo por día | 219 | 65 |
| archivar sólo las de paga | una fila por evento (hoy) | 347 | 46 |
| archivar sólo las de paga | contar por día | 533 | 83 |
| archivar sólo las de paga | fila por visita | 532 | 82 |
| archivar sólo las de paga | fila por visita más platillo por día | 512 | 78 |
| archivar las de todos los planes | una fila por evento (hoy) | 347 | 70 |
| archivar las de todos los planes | contar por día | 533 | 217 |
| archivar las de todos los planes | fila por visita | 532 | 216 |
| archivar las de todos los planes | fila por visita más platillo por día | 512 | 188 |

Lectura: archivar sólo las sesiones de paga ayuda poco si el gratuito conserva 12 meses (46 frente a 41 sin archivo); lo que da un salto es recortar también al gratuito, sea a 30 días o archivando a todos (216 con la fila por visita). Las formas de guardar la analítica tampoco se suman entre sí.

## 3. La propuesta de Calvin, medida

**Qué es:** una fila por comensal y visita, armada en el teléfono, con los pares «veces que entró / segundos totales» para menú, platillo y búsqueda (seis enteros chicos); **los filtros no van por comensal** (revelarían quién usa filtros, indicio indirecto de una restricción alimentaria, regla 10) y se cuentan por restaurante y día junto con el platillo, que el teléfono manda al terminar.

| Medida (PostgreSQL local, 46,696 visitas de comensal) | Valor |
|---|---|
| Bytes por visita de comensal, llave (restaurante, día, miembro) | **153** |
| …con un índice más por miembro | 184 |
| …sin la columna del restaurante | 113 |
| Analítica de hoy por visita de comensal | 1,361 (por mesa de 3: 4,082) |
| Tamaño total frente a la analítica de hoy | 11 % (con el conteo por platillo: 18 %) |
| Actualizar la fila 2 veces (la manda 3 veces): tabla antes → después | 7.1 MB → 16 MB; sólo 42 de 93,392 actualizaciones son HOT |
| …con `fillfactor` 70 | 8.7 MB → 14.1 MB; 51,307 de 93,392 HOT (55 %) |

### Qué se gana
- **89 % menos disco que hoy** por visita (153 frente a 1,361 bytes por comensal) y, a diferencia de «contar por día», conserva **qué hizo cada comensal** (tiempo en cada lugar), útil para saber si buscan o sólo miran.
- **No necesita `ip_hash`** ni navegador por evento: la huella de red deja de guardarse. La regla 10 se cuida con la fila anónima (id opaco) y sin los filtros por comensal.
- Menos peticiones del teléfono (una al terminar frente a lotes cada 5 s) y menos escrituras: un INSERT por visita.

### Qué se pierde o cuesta
- **El platillo visto**: la fila no dice qué platillo; se recupera con un conteo diario por platillo (la combinación: 18 % del disco de hoy, 219 restaurantes con historial a 30 días frente a 222 con la fila sola).
- **Depende de que el teléfono mande la fila**: si se cierra el navegador o se apaga el teléfono antes, esa visita no queda; se puede mandar también al ocultarse la página, pero no es garantía.
- **Actualizar cuesta**: cada actualización deja una versión muerta; con 2 actualizaciones la tabla pasa de 7.1 a 16 MB aun con vacuum. Conviene **un solo INSERT al terminar** (idempotente por la llave) y no actualizar.
- **Contar por día sigue siendo más chico a más visitas** (crece con días y platillos): con la copia 0.7 MB frente a 0.71 MB por restaurante al mes.

## 4. Supuestos y datos por conseguir
- eventos por sesión: 10 (supuesto del generador de datos)
- contadores de la fila por visita: sintéticos (el tamaño no depende del valor)
- bytes por fila: con índices, de una copia con datos sintéticos; con tráfico real cambia
- **Por conseguir (la fila por visita):** la base de 1,361 bytes de analítica por comensal de hoy depende de 3.9 eventos por comensal (supuesto del generador); qué parte de las visitas se pierde cuando el teléfono no alcanza a mandar la fila (se mide comparando contra los `scan`); el `fillfactor` 70, que haría la tabla de 185 bytes por visita en vez de 153 si se actualiza; y la reserva de 20 % del volumen para el WAL y el vacuum, que no se midió con esta tabla.
- **Por conseguir (todo):** con el piloto, medir los eventos reales por comensal, las visitas por restaurante al mes y qué parte de los teléfonos alcanza a mandar la fila al terminar (comparar con los `scan`).
