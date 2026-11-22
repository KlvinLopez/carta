/* ===== la película: una mesa de restaurante contada como cine (cinco actos) =====
   Dirección de arte: cine con la identidad de Carta. Campo oscuro cálido, vino y dorado; las personas son siluetas sin rasgos
   dibujados que la luz de la vela modela; el salón ya viene desenfocado (bokeh) y la mesa y la comida son lo más luminoso.
   Franjas de cine arriba y abajo: arriba van las etiquetas de alcance (hoy · Fase 3 · visión), abajo el diálogo; cada rótulo
   grande cae en una zona del cuadro que la toma deja limpia. Todas las capas salen de apoyo/cine/generar.mjs (webp pintado en
   Chromium desde ese guion) y su caja viaja en la tabla CAPAS de abajo.
   Pantallas de hoy: capturas reales de apoyo/ (datos de ejemplo). Pantallas de la Fase 3 y de la visión: dibujadas aquí con el
   lenguaje de Carta, para que no parezcan capturas. Todo lo del comensal (filtros, gustos) vive en su teléfono: regla dura 10.
   El cobro ocurre fuera de Carta: no hay pantalla de pago. Cada teléfono está en una mano (dorso detrás, pulgar y yemas delante;
   quien toca es la otra mano de la misma persona) y cada cambio de plano funde el conjunto entero: ninguna pieza se despega.
   Ojo al editar: todos los js/*.js comparten un solo ámbito global y la hoja de la plantilla estiliza clases genéricas
   (.esc, .chip, .fila, .s, .w y #intro svg{width:100%}): aquí todo nombre lleva prefijo (c…) y el CSS va bajo #cine. */
/* CAPAS:inicio (lo escribe apoyo/cine/generar.mjs; no editar a mano) */
const CAPAS = {
  "fondo": ["apoyo/cine/fondo.webp", 0, 0, 1920, 1080],
  "ana-silla": ["apoyo/cine/ana-silla.webp", 302, 562, 220, 520],
  "ana-cuerpo": ["apoyo/cine/ana-cuerpo.webp", 342, 562, 280, 520],
  "ana-cabeza": ["apoyo/cine/ana-cabeza.webp", 372, 428, 160, 190],
  "ana-brazo": ["apoyo/cine/ana-brazo.webp", 342, 422, 400, 380],
  "ana-brazo-cel": ["apoyo/cine/ana-brazo-cel.webp", 342, 422, 400, 380],
  "ana-brazo-carta": ["apoyo/cine/ana-brazo-carta.webp", 342, 422, 400, 380],
  "ana-brazo-copa": ["apoyo/cine/ana-brazo-copa.webp", 342, 422, 400, 380],
  "carlos-silla": ["apoyo/cine/carlos-silla.webp", 1398, 562, 220, 520],
  "carlos-cuerpo": ["apoyo/cine/carlos-cuerpo.webp", 1298, 562, 280, 520],
  "carlos-cabeza": ["apoyo/cine/carlos-cabeza.webp", 1388, 428, 160, 190],
  "carlos-brazo": ["apoyo/cine/carlos-brazo.webp", 1178, 422, 400, 380],
  "carlos-brazo-cel": ["apoyo/cine/carlos-brazo-cel.webp", 1178, 422, 400, 380],
  "carlos-brazo-carta": ["apoyo/cine/carlos-brazo-carta.webp", 1178, 422, 400, 380],
  "carlos-brazo-copa": ["apoyo/cine/carlos-brazo-copa.webp", 1178, 422, 400, 380],
  "sofia-cuerpo": ["apoyo/cine/sofia-cuerpo.webp", 630, 530, 340, 280],
  "sofia-cabeza": ["apoyo/cine/sofia-cabeza.webp", 690, 350, 220, 300],
  "sofia-brazos": ["apoyo/cine/sofia-brazos.webp", 600, 350, 400, 430],
  "sofia-brazos-cel": ["apoyo/cine/sofia-brazos-cel.webp", 600, 350, 400, 430],
  "sofia-brazos-carta": ["apoyo/cine/sofia-brazos-carta.webp", 600, 350, 400, 430],
  "diego-cuerpo": ["apoyo/cine/diego-cuerpo.webp", 910, 530, 340, 280],
  "diego-cabeza": ["apoyo/cine/diego-cabeza.webp", 970, 350, 220, 300],
  "diego-brazos": ["apoyo/cine/diego-brazos.webp", 880, 350, 400, 430],
  "diego-brazos-cel": ["apoyo/cine/diego-brazos-cel.webp", 880, 350, 400, 430],
  "diego-brazos-carta": ["apoyo/cine/diego-brazos-carta.webp", 880, 350, 400, 430],
  "mesero-cuerpo": ["apoyo/cine/mesero-cuerpo.webp", 1080, 270, 340, 540],
  "mesero-cabeza": ["apoyo/cine/mesero-cabeza.webp", 1170, 162, 160, 190],
  "mesero-brazos": ["apoyo/cine/mesero-brazos.webp", 860, 440, 720, 380],
  "mesero-brazos-carta": ["apoyo/cine/mesero-brazos-carta.webp", 860, 440, 720, 380],
  "mesero-brazos-cel": ["apoyo/cine/mesero-brazos-cel.webp", 860, 440, 720, 380],
  "mesero-brazos-libreta": ["apoyo/cine/mesero-brazos-libreta.webp", 860, 440, 720, 380],
  "mesero-brazo-pluma": ["apoyo/cine/mesero-brazo-pluma.webp", 860, 440, 720, 380],
  "mesero-brazos-tableta": ["apoyo/cine/mesero-brazos-tableta.webp", 860, 440, 720, 380],
  "mesero-brazos-platos": ["apoyo/cine/mesero-brazos-platos.webp", 860, 440, 720, 380],
  "mesero-brazos-cuenta": ["apoyo/cine/mesero-brazos-cuenta.webp", 860, 440, 720, 380],
  "mesero-brazos-terminal": ["apoyo/cine/mesero-brazos-terminal.webp", 860, 440, 720, 380],
  "mesero-brazos-trapo": ["apoyo/cine/mesero-brazos-trapo.webp", 860, 440, 720, 380],
  "ticket": ["apoyo/cine/ticket.webp", 1060, 720, 150, 110],
  "pastel": ["apoyo/cine/pastel.webp", 876, 700, 160, 124],
  "mesa": ["apoyo/cine/mesa.webp", 380, 690, 1160, 390],
  "montaje": ["apoyo/cine/montaje.webp", 560, 720, 800, 100],
  "copa-a": ["apoyo/cine/copa-a.webp", 776, 640, 60, 132],
  "copa-c": ["apoyo/cine/copa-c.webp", 1082, 640, 60, 132],
  "vela": ["apoyo/cine/vela.webp", 862, 706, 80, 90],
  "llama": ["apoyo/cine/llama.webp", 886, 688, 32, 52],
  "resplandor": ["apoyo/cine/resplandor.webp", 522, 336, 760, 760],
  "acrilico": ["apoyo/cine/acrilico.webp", 916, 644, 140, 140],
  "qr-brillo": ["apoyo/cine/qr-brillo.webp", 836, 558, 300, 300],
  "platillo-a": ["apoyo/cine/platillo-a.webp", 582, 718, 248, 100],
  "platillo-c": ["apoyo/cine/platillo-c.webp", 1090, 718, 248, 100],
  "sucia-a": ["apoyo/cine/sucia-a.webp", 570, 720, 300, 110],
  "sucia-c": ["apoyo/cine/sucia-c.webp", 1080, 720, 300, 110],
  "sucia-vaso": ["apoyo/cine/sucia-vaso.webp", 740, 730, 370, 120],
  "sucia-migas": ["apoyo/cine/sucia-migas.webp", 630, 744, 660, 72],
  "nuevos": ["apoyo/cine/nuevos.webp", 0, 280, 820, 800],
  "ana-mano-atras": ["apoyo/cine/ana-mano-atras.webp", -700, 270, 1180, 900],
  "ana-mano-frente": ["apoyo/cine/ana-mano-frente.webp", -100, 270, 580, 480],
  "ana-dedo": ["apoyo/cine/ana-dedo.webp", -40, -30, 920, 1130],
  "carlos-mano-atras": ["apoyo/cine/carlos-mano-atras.webp", -80, 270, 1180, 900],
  "carlos-mano-frente": ["apoyo/cine/carlos-mano-frente.webp", -80, 270, 580, 480],
  "carlos-dedo": ["apoyo/cine/carlos-dedo.webp", -880, -30, 920, 1130],
  "mesero-mano-atras": ["apoyo/cine/mesero-mano-atras.webp", -700, 270, 1180, 900],
  "mesero-mano-frente": ["apoyo/cine/mesero-mano-frente.webp", -100, 270, 580, 480],
  "mesero-dedo": ["apoyo/cine/mesero-dedo.webp", -40, -30, 920, 1130],
  "sofia-mano-atras": ["apoyo/cine/sofia-mano-atras.webp", -700, 270, 1180, 900],
  "sofia-mano-frente": ["apoyo/cine/sofia-mano-frente.webp", -100, 270, 580, 480],
  "sofia-dedo": ["apoyo/cine/sofia-dedo.webp", -40, -30, 920, 1130],
  "diego-mano-atras": ["apoyo/cine/diego-mano-atras.webp", -80, 270, 1180, 900],
  "diego-mano-frente": ["apoyo/cine/diego-mano-frente.webp", -80, 270, 580, 480],
  "diego-dedo": ["apoyo/cine/diego-dedo.webp", -880, -30, 920, 1130],
  "visor": ["apoyo/cine/visor.webp", 0, 0, 400, 866],
  "plato-pescado": ["apoyo/cine/plato-pescado.webp", 0, 0, 400, 400],
  "torno-plato": ["apoyo/cine/torno-plato.webp", 0, 0, 400, 400],
  "torno-pez": ["apoyo/cine/torno-pez.webp", 0, 0, 400, 400],
  "torno-adorno": ["apoyo/cine/torno-adorno.webp", 0, 0, 400, 400],
  "plato-aguachile": ["apoyo/cine/plato-aguachile.webp", 0, 0, 400, 400],
  "plato-tacos": ["apoyo/cine/plato-tacos.webp", 0, 0, 400, 400],
  "plato-ensalada": ["apoyo/cine/plato-ensalada.webp", 0, 0, 400, 400],
  "plato-enchiladas": ["apoyo/cine/plato-enchiladas.webp", 0, 0, 400, 400],
  "plato-mole": ["apoyo/cine/plato-mole.webp", 0, 0, 400, 400],
  "plato-res": ["apoyo/cine/plato-res.webp", 0, 0, 400, 400],
  "plato-flan": ["apoyo/cine/plato-flan.webp", 0, 0, 400, 400],
  "plato-jamaica": ["apoyo/cine/plato-jamaica.webp", 0, 0, 400, 400],
  "plato-limonada": ["apoyo/cine/plato-limonada.webp", 0, 0, 400, 400],
  "cerca-fondo": ["apoyo/cine/cerca-fondo.webp", 0, 0, 1920, 1080],
  "grano": ["apoyo/cine/grano.webp", 0, 0, 256, 256],
};
/* CAPAS:fin */
const CAP = {menu: "apoyo/menu-inicio.webp"};
const CI = n => CAPAS[n][0];
/* [id, acto, duración en s, alcance de lo que muestra ([etapa, qué es]: no se rotula durante la película, se ofrece en la tarjeta final),
   rótulo (la cursiva entre *), posición del rótulo, retraso del rótulo en s, segundos que dura el rótulo,
   fracción de la toma que sirve de cuadro fijo en el guion gráfico (0.82 si no se dice)] */
const CICLO = [["f3", "El personal lleva el ciclo de la mesa: abierta, cuenta cerrada, pagada y mesa limpia"]];
const TOMAS = [
  /* A · el gancho */
  ["mesa", 1, 10, [["hoy", "El QR de cada mesa"]], ["Todo empieza en *la mesa*."], "hook", 0.6],
  ["cumple", 1, 12.4, [], ["Mira esta mesa: *un cumpleaños, cuatro amigos*."], "linea", 1.0],
  /* B · las problemáticas, rápidas: el problema es el sistema, no las personas */
  ["b1", 2, 13.1, [], ["Ponerse de acuerdo, *al tanteo*."], "linea", 0.3],
  ["b2", 2, 21.2, [], ["Un menú que *no te conoce*."], "linea", 0.3],
  ["b3", 2, 11.5, [], ["Cuatro órdenes, *a mano*."], "linea", 0.3],
  ["b3t", 2, 8.2, [], ["En papel o en tableta, *el mismo problema*."], "linea", 0.3],
  ["espera", 2, 12.9, [], [], ""],
  ["ticket", 2, 8.5, [], ["Un solo papel *para todos*."], "linea", 3.4],
  ["b4", 2, 10.3, [], ["Una cuenta, *cuatro calculadoras*."], "linea", 0.3],
  ["pivote", 2, 6.6, [], ["¿Y si lo", "*reimaginamos*?"], "medio", 0.5],
  /* C · Carta, en el mismo orden */
  ["ofrece", 3, 9.2, [], [], ""],
  ["escanea", 3, 7.5, [["hoy", "Entrar con el QR, sin descarga (el menú es captura real de la app, con datos de ejemplo)"], ["vis", "Carta reconoce a quien ya tiene perfil de comensal: «Hola de nuevo, Ana»"]], ["Sin descargar", "*nada*."], "izq", 1.8],
  ["filtra", 3, 12.5, [["hoy", "Lo agotado se ve atenuado en la carta"], ["vis", "Perfil del comensal con sus restricciones guardadas: la carta quita sola lo que no puede comer (no sustituye avisar al personal)"]], ["~Antes: preguntar platillo por platillo.", "Lo que no comes,", "*fuera*."], "izq"],
  ["top3", 3, 7.5, [["vis", "«✦ Para ti»: recomendaciones por restaurantes visitados y por lo que le dio me gusta"]], ["Elegido", "*para ti*."], "izq"],
  ["plato", 3, 6.5, [["vis", "El platillo como modelo que gira, con sus ingredientes"]], ["Sabe lo que", "*lleva*."], "izq"],
  ["agrega", 3, 4, [["f3", "Agregar platillos a la orden de la mesa"]], ["Directo a", "*tu mesa*."], "izq"],
  ["juntos", 4, 10.7, [["f3", "La mesa pide junta: cada quien ve lo de todos"]], ["~Antes: al tanteo.", "La mesa *pide junta*."], "hook", 5.1],
  ["recomienda", 4, 6.5, [["vis", "Pasarle un platillo a otra persona de la mesa"]], ["Pásaselo *a Carlos*."], "linea"],
  ["confirma", 4, 5.1, [["f3", "Cuando todos están listos, Carta manda una sola comanda y llama al mesero"]], ["Carta *llama al mesero*."], "centro"],
  ["esperan", 4, 3.2, [["f3", "Cada quien ve en su teléfono que Carta llamó al mesero"]], [], ""],
  ["avisa", 4, 6, [["f3", "El mesero recibe la comanda en su teléfono"], ["vis", "Aviso con el teléfono bloqueado"]], ["Al mesero le llega", "*al instante*."], "izq", 0.2, 4.2, 0.6],
  ["llega", 4, 12.4, [["f3", "El mesero valida y atiende la comanda"]], ["~Antes: cuatro órdenes, a mano.", "Una sola comanda. *Él la valida*."], "linea"],
  ["cocina", 4, 5.6, [["f3", "El seguimiento de la orden en el teléfono de cada quien"]], [], ""],
  ["abierta", 5, 67.8, CICLO, ["Abierta"], "fase", 0.8],
  ["cierres", 5, 41.8, [["f3", "Cada quien cierra su cuenta desde el seguimiento de su orden; la mesa pasa a «cuenta cerrada» cuando todos cerraron la suya"]], ["Cuenta *cerrada*"], "fase", 39.6],
  ["cuenta", 5, 32.9, [["f3", "Cada quien ve su cuenta, con su propina"], ["vis", "Decir qué te gustó"], ["v11", "Invitar a alguien: lo suyo se reparte solo entre quienes invitan"]], ["~Antes: un ticket y cuatro calculadoras.", "Cada quien, *su cuenta*."], "linea", 0.3, 1.9],
  ["pagada", 5, 24.2, [["f3", "El cobro ocurre fuera de Carta (terminal o efectivo); el mesero valida el pago"], ["vis", "Elegir el método en la app, ver los datos de transferencia del restaurante y el contador «n de 4 comensales pagaron» (datos de ejemplo)"]], ["Pagada"], "fase", 20.4],
  ["factura", 5, 10.6, [["vis", "Pedir la factura desde la app; la emite el restaurante (fuera de la v1)"]], [], ""],
  ["sucia", 5, 4.6, CICLO, ["Fue una gran noche", "*para nuestros invitados*."], "linea", 1.6],
  ["prepara", 5, 4.2, CICLO, ["Preparemos la mesa", "*para los siguientes*."], "linea", 0.0],
  ["limpia", 5, 8.3, CICLO, ["Mesa *limpia*"], "fase", 1.6, 6.2],
  ["fin", 6, 5, [], [], ""],
];
const ACTOS = [[1, "El gancho"], [2, "El problema"], [3, "Tu carta"], [4, "La mesa"], [5, "El ciclo"], [6, "Fin"]];
/* ===== la voz =====
   Guion para oírse (español de México): por toma, [segundo dentro de la toma, quién, lo que dice, {g, tras, encima}].
   El segundo es el valor de partida. `g` es el globo que muestra la línea (`fin`, si lo lleva, es el segundo en que ese globo debe irse porque cambia el plano); `tras` son los segundos después de que termina la anterior (0.2 entre personajes si no se dice)
   y `encima` los segundos que se monta sobre el final de la anterior (risas, agradecimientos, respuestas que entran antes de tiempo);
   `con` son los segundos después de que EMPIEZA la anterior (para que hablen a la vez).
   «narrador» cuenta la historia; los demás son los personajes y dicen lo mismo que su globo. El texto va tal como se le manda al modelo de voz; las marcas ([laughs], [chuckles], [sighs], [warmly], [excited], [pause], [long pause]) van dentro, antes de las palabras que colorean, y sólo donde cambian la entrega: cada carácter cuenta.
   El audio es un archivo por toma, apoyo/voz/<toma>.mp3, con todo lo de esa toma ya mezclado en sus segundos. */
const VOZ = {
  mesa: [[0.4, "narrador", "[whispers] Viernes en la noche. [pause] [mischievously] Imaginemos una mesa. Mantel blanco, una vela… y cuatro sillas que todavía no saben la noche que les espera."]],
  cumple: [[0.3, "narrador", "[gasps] ¡Es el cumpleaños de Sofía! [warmly] Ana, Diego y Carlos llegaron temprano. [giggles] Bueno… casi."], [9.7, "mesero", "Buenas noches. Aquí está la carta.", {g: 1}]],
  b1: [[0.2, "narrador", "[mischievously] Primero, lo de siempre: ponerse de acuerdo."], [4.4, "ana", "¿Pedimos algo para compartir?", {g: 10}], [6.3, "diego", "¿La parrillada alcanza para cuatro?", {g: 11}],
    [8.5, "carlos", "[sighs] Es el mismo menú, pero en PDF.", {g: 12}], [11.0, "sofia", "[jumping in] ¿Y eso qué trae?", {g: 13, encima: 0.2}]],
  b2: [[0.2, "narrador", "[softly] Luego, un menú que no sabe nada de ellos."], [4.0, "ana", "Los tacos de pescado, por favor.", {g: 14}], [6.0, "mesero", "Se nos terminaron. Una disculpa.", {g: 15}], [8.0, "ana", "¿Y el mole?", {g: 16}],
    [9.4, "mesero", "¿Es alérgica a algo? Lleva cacahuate.", {g: 17}], [11.7, "ana", "Sí… ¿y las enchiladas?", {g: 18}], [13.6, "ana", "[jumping in] Espere… ¿llevan cacahuate?", {g: 26, encima: 0.2}], [15.5, "mesero", "Déjeme pregunto en cocina.", {g: 27}],
    [17.9, "narrador", "[sighs] Y a esperar."], [19.7, "mesero", "Sí llevan cacahuate.", {g: 36}]],
  b3: [[0.2, "narrador", "Cuatro antojos, una libreta… [whispers] y mucha fe."], [3.9, "mesero", "¿Eran dos aguachiles… o tres?", {g: 19}], [5.8, "carlos", "[jumping in] El mío sin cebolla.", {g: 20, encima: 0.2}], [7.8, "ana", "[chuckles] Yo cambié de opinión.", {g: 21}]],
  b3t: [[0.2, "narrador", "[chuckles] ¿Y con tableta? Lo mismo, pero con pantalla."], [3.5, "mesero", "Un momento… está cargando.", {g: 28}]],
  espera: [[0.9, "narrador", "[softly] Por fin, la orden salió."], [3.0, "carlos", "Ya tardó, ¿no?", {g: 37}], [4.7, "diego", "Yo ya tengo hambre.", {g: 38, encima: 0.2}],
    [6.6, "narrador", "Llegó la comida, llegaron las risas… [mischievously] y llegó ese momento."], [10.8, "ana", "¿Nos trae la cuenta, por favor?", {g: 39}]],
  ticket: [[0.9, "mesero", "Muchas gracias por venir.", {g: 31}], [3.3, "narrador", "[whispers] La cuenta. Un solo papel para los cuatro."]],
  b4: [[0.2, "narrador", "[giggles] Y cuatro calculadoras."], [2.8, "diego", "¿Quién pidió las limonadas?", {g: 22}], [4.8, "ana", "[jumping in] A Sofi la invitamos: ¿entre tres?", {g: 23, encima: 0.2}], [7.2, "carlos", "[sighs] ¿Y la propina?", {g: 24, encima: 0.3}]],
  pivote: [[0.6, "narrador", "[mischievously] ¿Y si lo reimaginamos? [pause] Misma mesa. Mismos amigos. [whispers] Desde el principio."]],
  ofrece: [[1.2, "mesero", "Aquí usamos Carta: con el QR ven el menú y piden desde su teléfono.", {g: 40}], [5.8, "ana", "[excited] ¡Espléndido! Yo ya tengo mi perfil hecho y todo.", {g: 75, tras: 0.2}]],
  escanea: [[1.0, "narrador", "[softly] Ana escanea el código… [gasps] y ya está adentro. Sin descargar nada."]],
  filtra: [[0.4, "narrador", "Ana no come cacahuate."], [2.2, "narrador", "[mischievously] No tuvo que decir nada: Carta guarda sus restricciones y quita lo que no puede comer.", {tras: 0.3}], [8.6, "narrador", "[whispers] Al mesero se lo dijo también. Por si acaso.", {tras: 0.3}]],
  top3: [[0.4, "narrador", "[warmly] Y como ya la conoce, le tenía tres ideas: por los restaurantes que ha visitado [giggles] y por lo que le dio me gusta."]],
  plato: [[0.4, "narrador", "[softly] Cada platillo le cuenta lo que lleva."]],
  agrega: [[0.3, "narrador", "Un toque… [giggles] y a la mesa."]],
  juntos: [[0.2, "narrador", "[mischievously] Esta vez nadie pidió al tanteo: cada quien veía lo que pedían los demás."], [6.3, "ana", "Ya pedí. ¿Tú qué vas a pedir?", {g: 3}], [8.4, "carlos", "Estoy viendo, todavía no sé.", {g: 4}]],
  recomienda: [[0.4, "narrador", "[whispers] A Ana se le antojó la arrachera… para Carlos. [giggles] Se la pasó."]],
  confirma: [[0.3, "narrador", "[warmly] Y cuando los cuatro estuvieron listos, Carta llamó al mesero automáticamente."]],
  avisa: [[0.4, "narrador", "A Javier le llegó una sola comanda. [whispers] Clara. Completa."]],
  llega: [[0.5, "mesero", "Para Ana, pescado a la talla.", {g: 5}], [2.2, "mesero", "Para Sofía, ensalada. Para Diego, aguachile.", {g: 29}], [4.5, "mesero", "Y para Carlos, arrachera.", {g: 30}], [6.3, "ana", "Sí, todo bien.", {g: 6, encima: 0.2}],
    [8.0, "narrador", "[warmly] Él la confirmó en voz alta. Nada se perdió en el camino."]],
  cocina: [[0.5, "narrador", "[softly] Y mientras la cocina trabajaba, cada quien veía cómo iba lo suyo."]],
  abierta: [[0.3, "narrador", "[warmly] La mesa siguió abierta. Como la plática."], [3.3, "sofia", "¿Han visto a Luis?", {g: 41}], [5.1, "diego", "Fuimos a Cancún, estuvo muy bonito.", {g: 42}],
    [7.4, "ana", "[jumping in] ¡No te creo!", {g: 71, encima: 0.2}], [7.9, "carlos", "[overlapping] Ahí va otra vez con Cancún.", {g: 72, encima: 0.3}], [9.6, "sofia", "[overlapping] [laughs] ¡Ay, Diego!", {g: 73, encima: 0.4}],
    [9.9, "ana", "[laughs]", {g: 43, encima: 0.6}], [10.2, "carlos", "[laughs]", {g: 44, con: 0.35}], [10.5, "diego", "[laughs]", {g: 74, con: 0.25}],
    [11.7, "diego", "Se me antojó un guacamole.", {g: 60, encima: 1.5}], [14.0, "narrador", "[mischievously] A Diego se le antojó algo más. Lo pidió desde su teléfono."], [20.6, "mesero", "Sí se puede. Ahorita se lo traigo.", {g: 63}],
    [23.9, "ana", "Mejor quiero los camarones.", {g: 61, fin: 25.6}], [32.8, "mesero", "Ya no es posible: su pescado ya se está preparando.", {g: 64}], [34.7, "ana", "No hay problema, muchas gracias.", {g: 66, encima: 0.2}],
    [37.6, "narrador", "[giggles] Ana quiso cambiar de opinión… demasiado tarde."], [41.1, "carlos", "Mejor sin el agua de jamaica.", {g: 62, fin: 42.8}], [50.0, "mesero", "Ése sí: cocina todavía no lo prepara.", {g: 65}],
    [53.3, "narrador", "[softly] Carlos sí llegó a tiempo."], [55.6, "narrador", "[gasps] ¡Y llegó la comida!"], [57.5, "mesero", "Provecho.", {g: 70}],
    [61.9, "ana", "Prueba el pescado, está increíble.", {g: 8}], [63.8, "carlos", "[jumping in] Y la arrachera. Hay que volver.", {g: 9, encima: 0.2}], [65.8, "sofia", "¡Qué rico estuvo!", {g: 45, encima: 0.3}]],
  cierres: [[0.5, "ana", "Yo ya quedé. Me gustó mucho.", {g: 46, fin: 2.4}], [3.0, "narrador", "[softly] Ana fue la primera en decir: ya quedé. Cerró su cuenta desde su lugar."], [8.1, "diego", "Deja veo si pido un postre.", {g: 47}],
    [10.7, "carlos", "[jumping in] Yo sí quiero un flan.", {g: 48, encima: 0.2}], [16.3, "diego", "Y un pastel para la cumpleañera.", {g: 49}],
    [17.9, "ana", "[excited] ¡Feliz cumpleaños, Sofi!", {g: 76, encima: 0.2}], [18.2, "carlos", "[cheering] ¡Felicidades, Sofi! ¡Eeeh!", {g: 77, con: 0.3}], [18.5, "diego", "[singing] ¡Feliz cumpleaños a ti…!", {g: 78, con: 0.3}],
    [21.0, "sofia", "[touched] ¡Ay, amigos… muchas gracias! [giggles]", {g: 50, encima: 0.5}],
    [25.0, "narrador", "[mischievously] Los demás, a su ritmo."], [32.0, "carlos", "¿Ya nadie va a pedir nada más?", {g: 32}], [34.0, "ana", "[jumping in] No, todo bien.", {g: 33, encima: 0.2}],
    [35.7, "narrador", "[warmly] Y cuando cerró el último, la mesa entera quedó en cuenta cerrada.", {tras: 0.3}]],
  cuenta: [[0.3, "narrador", "[whispers] Y aquí viene mi parte favorita. [warmly] Cada quien vio su propia cuenta, con su propina."], [7.0, "ana", "[excited] Sofi, nosotros te invitamos, es tu cumpleaños.", {g: "q0"}], [11.8, "narrador", "Entre uno."],
    [14.4, "diego", "[jumping in] Sí, nosotros te invitamos.", {g: "q2", encima: 0.3}], [16.8, "narrador", "Entre dos."], [19.4, "carlos", "[overlapping] Sí, nosotros te invitamos.", {g: "q3", encima: 0.3}],
    [21.8, "narrador", "[giggles] Entre tres. La cuenta de Sofía se repartió sola."], [25.5, "sofia", "[overlapping] [warmly] ¡Ay, muchas gracias, amigos!", {g: "q1", encima: 0.4}], [28.2, "narrador", "[softly] Revisaron su total… y llamaron a Javier."]],
  pagada: [[0.5, "narrador", "[warmly] Y cada quien pagó a su manera."], [3.6, "mesero", "Con la terminal, cuando gusten.", {g: 25, tras: 0.3}], [7.5, "diego", "Yo, por transferencia.", {g: 79}],
    [9.8, "narrador", "[softly] Carta le puso en pantalla los datos del restaurante.", {tras: 0.3}], [14.5, "carlos", "Yo pago en efectivo.", {g: 80}], [18.0, "mesero", "Está completo. Validado.", {g: 81}],
    [21.5, "mesero", "Todo pagado. ¡Muchas gracias!", {g: 7, tras: 0.3}]],
  factura: [[0.4, "ana", "¿Facturan?", {g: 51}], [2.1, "mesero", "Sí, se pide desde la aplicación.", {g: 52, encima: 0.2}], [4.9, "narrador", "[mischievously] ¿Factura? También desde el teléfono. [softly] Le llega al restaurante, que es quien la emite."]],
  sucia: [[0.1, "ana", "¡Gracias, buenas noches!", {g: 53, encima: 0.2}], [2.3, "narrador", "[warmly] Fue una gran noche para nuestros invitados."]],
  prepara: [[0.3, "narrador", "[softly] Preparemos la mesa para los siguientes."]],
  limpia: [[2.0, "narrador", "[whispers] Javier la marcó limpia… [mischievously] y la mesa volvió a esperar."]],
  fin: [[1.2, "narrador", "[warmly] Carta. Tu menú, tu Carta."]],
};
/* Las tomas que ya tienen audio y cuánto dura cada uno, en segundos: {b1: 9.8, …}. Vacío = película en silencio.
   Una toma se alarga sola a lo que dure su audio más el margen. */
const VOZ_AUDIO = {"mesa":11.14,"cumple":12.05,"b1":12.7,"b2":21.12,"b3":10.3,"b3t":6.0,"espera":11.74,"ticket":5.35,"b4":8.45,"pivote":6.43,"ofrece":9.46,"escanea":5.95,"filtra":11.52,"top3":8.06,"plato":2.64,"agrega":3.29,"juntos":10.94,"recomienda":5.28,"confirma":5.23,"avisa":4.82,"llega":12.91,"cocina":4.63,"abierta":67.85,"cierres":38.64,"cuenta":32.21,"pagada":23.54,"factura":10.03,"sucia":4.54,"prepara":2.54,"limpia":6.0,"fin":3.43};
/* Los tiempos medidos del audio, por toma: {b1: [[inicio, fin], …]}, uno por línea de VOZ en su orden (null si no se midió). Vacío = se usan los segundos de VOZ.
   Con tiempos aquí, los globos de esa toma entran y salen con ellos; puede haber dos globos a la vez. */
const VOZ_TIEMPOS = {"mesa":[[0.4,10.96]],"cumple":[[0.3,7.48],[9.7,11.85]],"b1":[[0.2,3.43],[4.4,5.98],[6.18,8.08],[8.28,11.56],[11.36,12.51]],"b2":[[0.2,3.31],[4.0,5.84],[6.04,8.15],[8.35,8.99],[9.19,11.72],[11.92,14.35],[14.15,16.01],[16.21,17.66],[17.96,19.49],[19.79,20.93]],"b3":[[0.2,4.14],[4.44,7.02],[6.82,7.94],[8.14,10.12]],"b3t":[[0.2,3.87],[4.17,5.82]],"espera":[[0.9,2.75],[3.05,4.0],[3.8,4.95],[5.25,9.78],[10.08,11.55]],"ticket":[[0.9,2.08],[2.38,5.17]],"b4":[[0.2,2.54],[2.84,4.17],[3.97,7.15],[6.85,8.25]],"pivote":[[0.6,6.24]],"ofrece":[[1.2,5.56],[5.76,9.28]],"escanea":[[1.0,5.77]],"filtra":[[0.4,2.1],[2.4,8.11],[8.41,11.32]],"top3":[[0.4,7.87]],"plato":[[0.4,2.46]],"agrega":[[0.3,3.1]],"juntos":[[0.2,4.94],[6.3,8.51],[8.71,10.75]],"recomienda":[[0.4,5.08]],"confirma":[[0.3,5.05]],"avisa":[[0.4,4.63]],"llega":[[0.5,2.26],[2.46,5.54],[5.74,7.41],[7.21,8.91],[9.21,12.74]],"cocina":[[0.5,4.45]],"abierta":[[0.3,2.9],[3.2,4.29],[4.49,6.95],[6.75,8.43],[8.13,9.99],[9.59,12.02],[11.42,16.06],[11.77,14.82],[12.02,14.52],[14.56,16.06],[16.36,20.53],[20.83,22.86],[23.9,26.17],[32.8,35.87],[35.67,37.54],[37.84,42.42],[42.72,44.26],[50.0,52.89],[53.19,54.69],[54.99,56.85],[57.15,57.73],[61.9,64.58],[64.38,66.36],[66.06,67.66]],"cierres":[[0.5,2.75],[3.05,7.53],[7.83,9.46],[9.26,10.4],[16.3,17.96],[17.76,19.51],[18.06,20.76],[18.36,21.34],[20.84,24.37],[25.0,27.29],[32.0,33.5],[33.3,34.32],[34.62,38.45]],"cuenta":[[0.3,5.56],[7.0,10.28],[11.8,12.47],[14.4,16.13],[16.43,17.17],[19.4,21.07],[21.37,25.2],[25.5,28.97],[29.27,32.03]],"pagada":[[0.5,2.56],[3.6,5.17],[7.5,9.05],[9.36,12.05],[14.5,15.83],[18.0,19.88],[21.5,23.35]],"factura":[[0.4,0.95],[2.1,3.96],[4.26,9.83]],"sucia":[[0.1,1.59],[1.89,4.34]],"prepara":[[0.3,2.35]],"limpia":[[2.0,5.81]],"fin":[[1.2,3.24]]};
const VOZ_MARGEN = 0.6;
TOMAS.forEach(t => { const d = VOZ_AUDIO[t[0]]; if (d && d + VOZ_MARGEN > t[2]) t[2] = Math.ceil((d + VOZ_MARGEN) * 10) / 10; });
const HAY_VOZ = Object.keys(VOZ_AUDIO).length > 0;
let vozOn = true, vozLibre = false, vozAct = null, puertaI = false, vozSalto = true, vozToma = -1, vozUltT = 0;
const vozPistas = {};
const vozRuta = id => ["apoyo", "voz", id + ".mp3"].join("/");
/* cada cuadro: suena la pista de la toma en curso. Mientras suena, la IMAGEN se ajusta al audio (si no, un cuadro lento rebobinaría la voz);
   el audio sólo se coloca con un salto: ±3 s, teclas de acto, repetir o el cambio de toma. Si la pista no tiene datos o ya terminó, manda el reloj de cuadros. */
function vozSync() {
  if (!HAY_VOZ) return;
  if (Math.abs(tI - vozUltT) > 400) vozSalto = true; /* un brinco del tiempo que no viene de un cuadro es un salto */
  const s = tI / 1000; let i = 0; while (i < TOMAS.length - 1 && s >= T0[i + 1]) i++;
  const id = TOMAS[i][0], quiere = vozOn && vozLibre && !REDUCE;
  const pista = n => vozPistas[n] || (vozPistas[n] = Object.assign(new Audio(vozRuta(n)), {preload: "auto"}));
  const a = quiere && VOZ_AUDIO[id] ? pista(id) : null;
  if (vozAct && vozAct !== a) vozAct.pause();
  if (a !== vozAct || i !== vozToma) vozSalto = true;
  vozAct = a; vozToma = i; vozUltT = tI;
  if (quiere && i + 1 < TOMAS.length && T0[i + 1] - s < 3 && VOZ_AUDIO[TOMAS[i + 1][0]]) pista(TOMAS[i + 1][0]); /* la siguiente pista, cargada antes del cambio */
  if (!a) return;
  const seg = s - T0[i];
  if (pausaI || $("#intro").hidden || seg >= (a.duration || VOZ_AUDIO[id])) { if (!a.paused) a.pause(); return; }
  if (vozSalto) { vozSalto = false; try { a.currentTime = seg; } catch (e) { /* aún sin datos */ } }
  if (a.paused) { a.play().catch(() => { /* falta el archivo o el permiso: la película sigue en silencio */ }); return; }
  if (a.readyState < 2 || a.seeking || a.ended) return;
  const dif = a.currentTime - seg;
  if (Math.abs(dif) <= 0.08 || (dif < 0 && dif > -0.25 && seg < 1.5)) return; /* al empezar, si la pista va apenas detrás, que alcance sola */
  tI = clamp((T0[i] + a.currentTime) * 1000, T0[i] * 1000, T0[i + 1] * 1000 - 1); vozUltT = tI;
}
function vozBoton() { const b = $("#introSon"); if (!b) return; b.textContent = HAY_VOZ && vozOn ? "🔊" : "🔇"; b.title = HAY_VOZ ? (vozOn ? "Quitar el sonido" : "Poner el sonido") : "Esta versión todavía no tiene voz"; b.disabled = !HAY_VOZ; }
const T0 = TOMAS.reduce((a, t) => (a.push(a[a.length - 1] + t[2]), a), [0]);
const TOT = T0[T0.length - 1], TOTI = TOT * 1000;
const tomaIni = id => T0[TOMAS.findIndex(t => t[0] === id)];
const ACT_INI = ACTOS.map(([n]) => T0[TOMAS.findIndex(t => t[1] === n)]);
const ACT_FIN = ACTOS.map((_, k) => (k + 1 < ACTOS.length ? ACT_INI[k + 1] : TOT));
/* instantes de guion gráfico (movimiento reducido): el momento de cada toma en que ya está todo en pantalla */
const CLAVES = TOMAS.map((t, i) => T0[i] + t[2] * (t[8] || 0.82));
let tI = 0, pausaI = false, rafI = 0, ultI = 0, ocultoT = 0, tlF = null;

const cineCss = `
#cine{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;background:#171210;font-family:'DM Sans',sans-serif;color:#fef9f1}
#cine *{box-sizing:border-box}
#intro #cine svg{width:16px;height:16px;max-height:none;display:inline-block;margin:0;flex:none}
#intro #cine .cing svg{width:24px;height:24px}#intro #cine .clisto svg{width:24px;height:24px}
#intro > .ictl:not(.barras):not(.cactos){position:absolute;top:16px;right:16px;z-index:6}
/* el campo: oscuro cálido con un resplandor vino y otro dorado */
#cine .cf{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse 70% 62% at 50% 64%,#2a1b16 0%,#1d1411 52%,#171210 100%)}
#cine .cf i{position:absolute;border-radius:50%}
#cine .cf .l1{left:310px;top:260px;width:1300px;height:940px;background:radial-gradient(closest-side,rgba(107,45,62,.6),rgba(107,45,62,0))}
#cine .cf .l2{left:600px;top:430px;width:720px;height:560px;background:radial-gradient(closest-side,rgba(184,134,11,.24),rgba(184,134,11,0))}
/* los dos decorados: la sala (plano abierto, con cámara) y el primer plano de las manos */
#cine .sala,#cine .cerca,#cine .pfon,#cine .pfig,#cine .gp,#cine .cfon{position:absolute;left:0;top:0;width:1920px;height:1080px}
/* el informe tiene una clase .gp (puntos de sus gráficas) con una animación de entrada: aquí no aplica, o anula los movimientos de los personajes */
#cine .gp{animation:none;transform-box:border-box}
#cine .silu{position:absolute;left:1318px;top:470px;width:380px;height:520px;border-radius:50%;background:radial-gradient(closest-side,rgba(253,214,140,.55),rgba(253,195,77,.18) 55%,rgba(253,195,77,0));mix-blend-mode:screen;opacity:0;visibility:hidden;pointer-events:none}
/* B · el nombre de cada quien, bajo su figura: va dentro de su grupo, así entra, sale y se mueve con él */
#cine .nmb{position:absolute;transform:translateX(-50%);padding:4px 14px;border-radius:999px;background:rgba(23,18,16,.46);color:rgba(254,249,241,.92);font:600 21px 'DM Sans',sans-serif;letter-spacing:.02em;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none}
#cine .sala{z-index:1}#cine .cerca{z-index:2;opacity:0;visibility:hidden}
#cine .pfig{transform-origin:0 0}
#cine img.k{position:absolute;display:block;max-width:none}
#cine .k-resplandor,#cine .k-qr-brillo{mix-blend-mode:screen}
#cine .buzz{position:absolute;left:1312px;top:612px;width:60px;height:60px;opacity:0;visibility:hidden}
#cine .buzz i{position:absolute;inset:0;border-radius:50%;border:4px solid #fdc34d;border-left-color:transparent;border-bottom-color:transparent}
#cine .buzz i+i{inset:-14px}
/* cine: grano, viñeta y franjas */
#cine .grano{position:absolute;inset:0;z-index:5;background:url(${CI("grano")});opacity:.09;pointer-events:none;animation:cgrano .5s steps(1) infinite}
@keyframes cgrano{0%{background-position:0 0}25%{background-position:-90px 60px}50%{background-position:70px -110px}75%{background-position:-40px -50px}}
@media(prefers-reduced-motion:reduce){#cine .grano{animation:none}}
#cine .vin{position:absolute;left:0;right:0;top:100px;bottom:100px;z-index:5;pointer-events:none;background:radial-gradient(ellipse 76% 82% at 50% 54%,rgba(10,6,5,0) 50%,rgba(10,6,5,.66) 100%)}
#cine .franja{position:absolute;left:0;right:0;height:100px;z-index:6;background:#0c0908}
#cine .franja.fa{top:0}#cine .franja.fb{bottom:0}
/* diálogo: sale de la boca de quien habla, con una cola hacia ella, en la zona limpia junto a su cara */
#cine .globo{position:absolute;z-index:7;max-width:520px;padding:13px 22px;border-radius:24px;background:rgba(23,18,16,.78);box-shadow:inset 0 0 0 1.5px rgba(253,195,77,.34),0 14px 30px rgba(8,4,3,.4);font-size:30px;line-height:1.22;font-style:italic;color:#fef9f1;opacity:0;visibility:hidden}
#cine .globo::after{content:"";position:absolute;top:50%;width:16px;height:16px;margin-top:-8px;background:rgba(23,18,16,.78);transform:rotate(45deg)}
#cine .globo.gl-i::after{left:-8px;box-shadow:inset 1.5px -1.5px 0 rgba(253,195,77,.34)}
#cine .globo.gl-d::after{right:-8px;box-shadow:inset -1.5px 1.5px 0 rgba(253,195,77,.34)}
#cine .globo.gl-a::after,#cine .globo.gl-b::after,#cine .globo.gl-c::after{top:auto;bottom:-8px;margin:0;box-shadow:inset -1.5px -1.5px 0 rgba(253,195,77,.34)}
#cine .globo.gl-a::after{left:50%;margin-left:-8px}#cine .globo.gl-b::after{left:84%;margin-left:-8px}#cine .globo.gl-c::after{left:16%;margin-left:-8px}
/* rótulos: cada posición cae en la zona limpia de su toma */
#cine .r{position:absolute;z-index:7;opacity:0;visibility:hidden;font-family:'DM Serif Display',serif;font-weight:400;line-height:1.05;letter-spacing:-.01em;text-shadow:0 4px 30px rgba(10,6,5,.6)}
#cine .r .cln{display:block;white-space:nowrap}
#cine .r .cw{display:inline-block}
#cine .r em{font-style:italic;color:#fdc34d}
#cine .r.hook{left:0;right:0;top:134px;text-align:center;font-size:100px}
#cine .r.arriba{left:112px;top:140px;font-size:80px}
#cine .r.izq{left:120px;top:372px;font-size:100px}
#cine .r.centro{left:0;right:0;top:116px;text-align:center;font-size:74px}
#cine .r.centro .cln,#cine .r.hook .cln{width:max-content;margin:0 auto}
#cine .r.fase{left:112px;top:134px;font-size:92px}
#cine .r.linea{left:112px;top:128px;font-size:64px}
#cine .r .cln.ck{font-family:'DM Sans',sans-serif;font-size:30px;font-weight:500;letter-spacing:0;line-height:1.2;color:rgba(254,249,241,.72);margin-bottom:12px;text-shadow:none}
#cine .r.linea .cln.ck{margin-bottom:6px}
/* la lupa: un círculo que amplía lo que alguien ve en su pantalla o en su papel; un aro dorado marca de dónde sale */
#cine .lupa{position:absolute;left:1520px;top:214px;width:320px;height:320px;border-radius:50%;overflow:hidden;z-index:4;background:#fef9f1;box-shadow:0 0 0 4px rgba(253,195,77,.85),0 0 0 11px rgba(23,18,16,.55),0 30px 60px rgba(8,4,3,.5);opacity:0;visibility:hidden}
#cine .lmarca{position:absolute;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;z-index:4;box-shadow:0 0 0 3px rgba(253,195,77,.85);opacity:0;visibility:hidden}
#cine .lpdf{position:absolute;left:0;top:0;width:560px;padding:26px 28px;background:#fbf6ec;color:#2a1c16;transform-origin:0 0}
#cine .lpdf h5{margin:0 0 4px;font:400 30px 'DM Serif Display',serif;text-align:center;color:#4f1728}
#cine .lpdf h6{margin:12px 0 4px;font:700 12px 'DM Sans',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8a6a2a}
#cine .lpdf .lcol{column-count:2;column-gap:26px}
#cine .lpdf p{margin:0;display:flex;justify-content:space-between;gap:8px;font-size:12.5px;line-height:1.75;break-inside:avoid}
#cine .lpdf p i{font-style:normal;color:#6b5a48}
#cine .ltab{position:absolute;inset:0;background:#1c1614;color:#fef9f1;padding:70px 56px 0}
#cine .ltab b{display:block;font:400 26px 'DM Serif Display',serif}
#cine .ltab u{display:block;height:14px;border-radius:7px;background:rgba(254,249,241,.14);margin-top:14px;text-decoration:none}
#cine .ltab span{position:absolute;left:0;right:0;top:214px;text-align:center;font-size:19px;color:rgba(254,249,241,.75)}
#cine .ltab .lok{position:absolute;left:0;right:0;top:170px;text-align:center;font-style:normal;font-size:23px;font-weight:700;color:#bfe3a8}
#cine .ltab .ctab{position:absolute;left:138px;top:150px;width:44px;height:44px;border-radius:50%;border:5px solid rgba(254,249,241,.25);border-top-color:#fdc34d}
#cine .lck{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#1a1a1a;text-align:center}
#cine .lck .av{width:44px;height:44px;font-size:20px;margin:0;box-shadow:none}
#cine .lck b{font-size:26px;line-height:1.1}#cine .lck small{font-size:19px;color:#5b4a3d;margin-top:-6px}
#cine .lck .qseg{margin:0}#cine .lck .qseg i{width:74px;height:54px;font-size:18px}#cine .lck .qseg .lsel{position:absolute;left:74px;top:0;width:74px;height:54px;border-radius:999px;background:#4f1728}
#cine .lck .qseg svg,#intro #cine .lck .qseg svg{width:30px;height:30px}#cine .lck .qseg i.qp{color:#fff}
#cine .lck p{margin:0;font-size:19px;color:#6b2d3e;font-weight:600}
#cine .lck .lct{display:flex;align-items:baseline;gap:16px;font:400 30px 'DM Serif Display',serif;color:#4f1728}#cine .lck .lct i{font-style:normal;font-size:54px}
#cine .ltk{position:absolute;left:36px;top:0;width:248px;padding:22px 18px 30px;background:#fff;color:#2a2420;font-size:14px;line-height:1.72}
#cine .ltk b{display:block;text-align:center;font-size:15px;letter-spacing:.12em;margin-bottom:8px}
#cine .ltk p{margin:0;display:flex;justify-content:space-between;gap:10px}
#cine .ltk p.lt{margin-top:8px;padding-top:8px;box-shadow:inset 0 1.5px 0 #2a2420;font-weight:700;font-size:16px}
/* la pluma del mesero y su trazo sobre la libreta */
#cine .k-mesero-brazo-pluma{transform-origin:71% 32%}

#cine .r.medio{left:0;right:0;top:390px;text-align:center;font-size:124px}
#cine .r.medio .cln{width:max-content;margin:0 auto}
/* el teléfono en su mano: dorso detrás, marco, pulgar y yemas delante, y el índice de la otra mano */
#cine .agarre{position:absolute;left:0;top:0;width:400px;height:866px;transform-origin:0 0;opacity:0;visibility:hidden}
#cine .cel{position:absolute;inset:0;border-radius:56px;box-shadow:0 0 0 11px #100c0a,0 0 0 13px #3a322d}
#cine .nom{position:absolute;left:50%;top:-62px;transform:translateX(-50%);padding:8px 20px;border-radius:999px;background:rgba(254,249,241,.1);color:#fef9f1;font-size:24px;font-weight:600;white-space:nowrap;opacity:0;visibility:hidden}
/* el recuadro del acto 5: el teléfono del mesero, arriba a la derecha */
#cine .pip{position:absolute;left:1424px;top:118px;width:436px;height:800px;z-index:3;border-radius:44px;overflow:hidden;background:radial-gradient(ellipse 90% 70% at 50% 40%,#3a2420,#1a1210);box-shadow:0 0 0 2px rgba(253,195,77,.4),0 40px 80px rgba(8,4,3,.6);opacity:0;visibility:hidden}
#cine .pipt{position:absolute;left:34px;right:0;top:15px;text-align:left;font-size:18px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fdd88a}
/* sobre la escena */
#cine .estado{position:absolute;z-index:4;padding:11px 24px;border-radius:999px;font-size:30px;font-weight:700;white-space:nowrap;opacity:0;visibility:hidden;box-shadow:0 10px 26px rgba(8,4,3,.4)}
#cine .estado.lista{background:#66713d;color:#fff}
#cine .estado.elige{background:rgba(254,249,241,.92);color:#5b4a3d}
#cine .estado.vino{background:#fef9f1;color:#4f1728}
#cine .resu{position:absolute;z-index:4;width:250px;padding:16px 18px;border-radius:22px;background:#fef9f1;color:#1a1a1a;opacity:0;visibility:hidden;box-shadow:0 14px 30px rgba(8,4,3,.4)}
#cine .resu b{display:block;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#6b2d3e}
#cine .resu span{display:flex;justify-content:space-between;font-size:18px;margin-top:6px;color:#3a2a22}
#cine .resu span i,#cine .resu strong i{font-style:normal}
#cine .resu strong{display:flex;justify-content:space-between;font-size:21px;margin-top:8px;color:#4f1728}
#cine .divi{position:absolute;left:959px;top:196px;width:2px;height:790px;z-index:2;background:linear-gradient(180deg,rgba(253,195,77,0),rgba(253,195,77,.7) 18%,rgba(253,195,77,.7) 82%,rgba(253,195,77,0));transform-origin:50% 0;opacity:0;visibility:hidden}
#cine .hora{position:absolute;right:64px;top:116px;display:flex;align-items:center;gap:10px;z-index:5;transform-origin:100% 50%;opacity:0;visibility:hidden}
#cine .hora .hd{padding:9px 24px;border-radius:999px;background:rgba(23,18,16,.62);color:#fdd88a;font-size:44px;font-weight:700;box-shadow:0 0 0 1.5px rgba(253,195,77,.4)}
#cine .hora{gap:16px}#cine .hora .esfera{width:76px;height:76px}#cine .hora .esfera i{left:35.500px;width:5px;transform-origin:2.500px 100%}#cine .hora .esfera .hh{top:19px;height:19px}#cine .hora .esfera .mm{top:9px;height:29px}
#cine .reloj{position:absolute;right:30px;top:9px;display:flex;align-items:center;gap:8px;z-index:8;opacity:0;visibility:hidden}
#cine .reloj .x4{padding:4px 11px;border-radius:999px;background:#fdc34d;color:#2a0d17;font-size:16px;font-weight:800}
#cine .esfera{position:relative;width:32px;height:32px;border-radius:50%;background:#fef9f1}
#cine .esfera i{position:absolute;left:14.500px;width:3px;border-radius:2px;background:#4f1728;transform-origin:1.500px 100%}
#cine .esfera .hh{top:8px;height:8px}#cine .esfera .mm{top:4px;height:12px;background:#b8860b}
#cine .pan{position:absolute;inset:0;border-radius:56px;overflow:hidden;background:#fef9f1;color:#1a1a1a}
#cine .pan>.cs{position:absolute;inset:0;isolation:isolate;z-index:0;opacity:0;visibility:hidden;overflow:hidden;background:#fef9f1}
#cine .pan>.cs>img.ccap{position:absolute;left:0;top:44px;width:400px;height:822px;object-fit:cover;object-position:top}
#cine .sb{position:absolute;left:0;right:0;top:0;height:44px;z-index:5;color:#1a1a1a;background:#fef9f1}
#cine .sb.osc{background:transparent;color:#fef9f1}
#cine .sb b{position:absolute;left:34px;top:13px;font:700 16px 'DM Sans',sans-serif}
#cine .sb i{position:absolute;left:50%;top:10px;width:100px;height:28px;margin-left:-50px;border-radius:16px;background:#0b0809}
#cine .sb u{position:absolute;right:30px;top:16px;width:24px;height:11px;border-radius:4px;box-shadow:inset 0 0 0 1.6px currentColor;background:linear-gradient(90deg,currentColor 72%,transparent 72%)}
#cine .halo{position:absolute;left:0;top:0;width:0;height:0;border-radius:20px;box-shadow:0 0 0 5px #fdc34d,0 0 0 10px rgba(253,195,77,.32),0 0 34px 12px rgba(253,195,77,.65);opacity:0;visibility:hidden;z-index:8;pointer-events:none}
#cine .foto{flex:none;display:inline-block;width:64px;height:64px;border-radius:50%;overflow:hidden;background:#2a1d17;box-shadow:0 0 0 2.5px rgba(253,195,77,.7)}
#cine .foto img{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
#cine .pjav{margin-left:auto;display:inline-flex;align-items:center;gap:8px;font-weight:700}#cine .pjav .foto{width:36px;height:36px;box-shadow:0 0 0 2px #b8860b}
/* los cuatro teléfonos en fila: líneas doradas entre ellos, y arriba de cada uno su foto y su nombre */
#cine .dvq{position:absolute;top:196px;width:2px;height:790px;z-index:2;background:linear-gradient(180deg,rgba(253,195,77,0),rgba(253,195,77,.7) 18%,rgba(253,195,77,.7) 82%,rgba(253,195,77,0));transform-origin:50% 0;opacity:0;visibility:hidden}
#cine .nq{position:absolute;top:122px;width:350px;display:flex;align-items:center;justify-content:center;gap:14px;font:400 40px 'DM Serif Display',serif;color:#fef9f1;z-index:4;opacity:0;visibility:hidden}
#cine .qL .eord{top:150px}
#cine .qL .lst{position:absolute;left:24px;top:330px;display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:999px;background:#eef0e2;color:#4c5630;font-size:18px;font-weight:700}
#cine .qL .lst svg,#intro #cine .qL .lst svg{width:18px;height:18px;stroke:#4c5630}
#cine .qL .lesp{position:absolute;left:26px;right:26px;bottom:36px;height:56px;border-radius:999px;background:#efe6d6;color:#8a7a6c;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}
#cine .toque{position:absolute;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;background:rgba(255,255,255,.4);box-shadow:0 0 0 3px rgba(255,255,255,.9),0 6px 18px rgba(0,0,0,.25);opacity:0;z-index:8}
/* visor de la cámara */
#cine .cs.visor img{position:absolute;inset:0;width:400px;height:866px}
#cine .ret{position:absolute;left:96px;top:306px;width:208px;height:208px}
#cine .ret i{position:absolute;width:46px;height:46px;border:5px solid #ffd60a}
#cine .ret i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0;border-radius:14px 0 0 0}#cine .ret i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0;border-radius:0 14px 0 0}
#cine .ret i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0;border-radius:0 0 0 14px}#cine .ret i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0;border-radius:0 0 14px 0}
#cine .det{position:absolute;left:50%;top:556px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:12px 20px;border-radius:999px;background:#ffd60a;color:#1a1a1a;font-size:18px;font-weight:700;white-space:nowrap;opacity:0}
#cine .det em{font-style:normal;font-weight:500}
#cine .cam{position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(rgba(10,6,6,0),rgba(10,6,6,.85))}
#cine .cam i{position:absolute;left:50%;bottom:40px;width:72px;height:72px;margin-left:-36px;border-radius:50%;background:#fff;box-shadow:0 0 0 5px rgba(10,6,6,.85),0 0 0 9px #fff}
/* pantallas dibujadas (Fase 3 y visión) */
#cine .cx{padding:58px 26px 0}
#cine .cx h4{margin:0;font-family:'DM Serif Display',serif;font-weight:400;color:#4f1728}
#cine .cx .cab{display:flex;align-items:center;gap:12px;font-family:'DM Serif Display',serif;font-size:22px;color:#4f1728}
#cine .cx .lg{width:42px;height:42px;border-radius:14px;background:#f3e9da;display:flex;align-items:center;justify-content:center;font-size:22px}
#cine .cx .mia{margin-left:auto;display:flex;align-items:center;gap:8px;padding:6px 8px 6px 14px;border-radius:999px;background:#f3e9da;font:600 15px 'DM Sans',sans-serif;color:#4f1728;position:relative}
#cine .av{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:700 14px 'DM Sans',sans-serif;color:#fff;box-shadow:0 0 0 2px #fef9f1}
#cine .av.ca{background:#66713d}#cine .av.cc{background:#3a3340;margin-left:-12px}#cine .av.cs{background:#7a2f45;margin-left:-12px}#cine .av.cd{background:#3b4a5a;margin-left:-12px}
#cine .listos .avs .av{margin-left:0}
#cine .mia .bd{position:absolute;right:-6px;top:-8px;width:24px;height:24px;border-radius:50%;background:#b8860b;color:#fff;font:700 13px 'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;opacity:0}
#cine .bien .hola h4{font-size:35px;line-height:1.05}#cine .bsub{margin:12px 0 0;font-size:19px;color:#5b4a3d}
#cine .bperf{margin-top:28px;padding:18px 20px;border-radius:22px;background:#f8f1e5;display:flex;align-items:center;gap:14px}
#cine .bperf svg,#intro #cine .bperf svg{width:30px;height:30px;flex:none;stroke:#66713d}
#cine .bperf b{display:block;font-size:18px;line-height:1.2}#cine .bperf small{font-size:15px;color:#5b4a3d}
#cine .hola{display:flex;align-items:center;gap:14px;margin-top:30px}
#cine .hola .av{width:58px;height:58px;font-size:26px;box-shadow:none}
#cine .hola h4{font-size:44px}
#cine .carga{position:relative;height:34px;margin-top:16px}
#cine .carga span{position:absolute;left:0;top:0;display:flex;align-items:center;gap:10px;font-size:19px;color:#5b4a3d;white-space:nowrap;opacity:0}
#cine .carga span::before{content:"";width:12px;height:12px;border-radius:50%;background:#b8860b}
#cine .cchips{display:flex;gap:10px;margin-top:14px}
#cine .cchip{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:#4f1728;color:#fef9f1;font-size:16px;font-weight:600;white-space:nowrap}
#cine .cchip svg{width:16px;height:16px}
#cine .tel{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:15px;color:#5b4a3d}
#cine .tel svg{width:16px;height:16px;flex:none}
#cine .clista{margin-top:20px;display:flex;flex-direction:column}
#cine .cfila{display:flex;align-items:center;gap:14px;height:84px;overflow:hidden}
#cine .cfila img{width:64px;height:64px;border-radius:20px;background:#2a1a14;flex:none}
#cine .cfila b{display:block;font-family:'DM Serif Display',serif;font-weight:400;font-size:20px;color:#1a1a1a}
#cine .cfila small{font-size:14px;color:#5b4a3d}
#cine .cfila .cno{margin-left:auto;padding:5px 10px;border-radius:999px;background:#f6dede;color:#8c2a2a;font-size:13px;font-weight:700;opacity:0;white-space:nowrap}
#cine .clisto{position:absolute;left:26px;right:26px;bottom:40px;height:66px;border-radius:999px;background:linear-gradient(135deg,#66713d,#4c5630);color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;font-size:21px;font-weight:700;opacity:0}
#cine .clisto svg{width:24px;height:24px}
#cine .sec{margin-top:26px;display:flex;align-items:baseline;gap:10px}
#cine .sec h4{font-size:30px}
#cine .sec .es{color:#b8860b;font-size:22px}
#cine .porq{margin-top:6px;font-size:15px;color:#5b4a3d;display:flex;align-items:center;gap:8px}
#cine .tira{position:relative;height:300px;margin:16px -26px 0;overflow:hidden}
#cine .tira .rail{position:absolute;left:26px;top:0;display:flex;gap:24px}
#cine .tj{width:210px;border-radius:24px;background:#fff;box-shadow:0 14px 30px rgba(79,23,40,.1);overflow:hidden;flex:none}
#cine .tj .fo{height:150px;background:radial-gradient(circle at 50% 45%,#3a2a22,#1d1310);display:flex;align-items:center;justify-content:center}
#cine .tj .fo img{width:140px;height:140px}
#cine .tj .ctx{padding:12px 14px 14px}
#cine .tj b{display:block;font-family:'DM Serif Display',serif;font-weight:400;font-size:19px;line-height:1.1}
#cine .tj small{display:block;margin-top:6px;font-size:13px;line-height:1.3;color:#6b2d3e;font-weight:600}
#cine .tj .cpr{display:block;margin-top:6px;font-size:15px;font-weight:600;color:#1a1a1a}
#cine .cats{display:flex;gap:8px;margin-top:6px}
#cine .cats span{padding:9px 16px;border-radius:999px;background:#f3e9da;font-size:15px;white-space:nowrap}
#cine .cats span:first-child{background:#4f1728;color:#fff}
/* el platillo en su torno */
#cine .cs.pPlato{padding:0}
#cine .vuelta{position:absolute;left:26px;top:58px;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:rgba(254,249,241,.92);font-size:15px;font-weight:600;color:#4f1728;z-index:3}
#cine .torno{position:absolute;left:0;top:0;width:400px;height:360px;background:radial-gradient(ellipse 70% 70% at 50% 42%,#4a2e24,#1d1210);overflow:hidden}
#cine .torno .som{position:absolute;left:52px;top:214px;width:296px;height:96px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.65),rgba(0,0,0,0))}
#cine .torno .capa{position:absolute;left:60px;top:66px;width:280px;height:280px}
#cine .torno .gir{position:absolute;inset:0}
#cine .torno .gir img{position:absolute;inset:0;width:280px;height:280px}
#cine .torno .capa.k0 img,#cine .torno .capa.k1 img,#cine .torno .capa.k2 img{filter:brightness(.45) saturate(.8)}
#cine .torno .capa.k3 img{filter:brightness(.7)}
#cine .torno .brillo{position:absolute;left:84px;top:150px;width:232px;height:116px;border-radius:50%;overflow:hidden;mix-blend-mode:screen}
#cine .torno .brillo i{position:absolute;left:-80px;top:-20px;width:60px;height:160px;background:linear-gradient(90deg,rgba(255,240,210,0),rgba(255,240,210,.45),rgba(255,240,210,0));transform:skewX(-20deg)}
#cine .torno .aro360{position:absolute;left:30px;top:140px;width:340px;height:170px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(253,195,77,.55)}
#cine .torno .g360{position:absolute;right:22px;top:292px;padding:6px 12px;border-radius:999px;background:rgba(20,10,8,.6);color:#fdd88a;font-size:14px;font-weight:700;letter-spacing:.04em}
#cine .torno .luz{position:absolute;inset:0;background:radial-gradient(ellipse 50% 30% at 40% 20%,rgba(255,220,160,.2),rgba(255,220,160,0))}
#cine .ficha{position:absolute;left:0;right:0;top:340px;bottom:0;border-radius:30px 30px 0 0;background:#fef9f1;padding:26px 26px 0}
#cine .ficha h4{font-size:32px;color:#1a1a1a}
#cine .ficha .cpr{font-size:21px;font-weight:600;color:#4f1728;margin-top:4px}
#cine .cings{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
#cine .cing{display:inline-flex;align-items:center;gap:7px;padding:7px 13px 7px 8px;border-radius:999px;background:#f3e9da;font-size:15px;white-space:nowrap}
#cine .cing svg{width:24px;height:24px}
#cine .reco{margin-top:16px;padding:14px 16px;border-radius:22px;background:#f8f1e5;font-size:15.5px;line-height:1.35;color:#3a2a22}
#cine .reco b{color:#4f1728}
#cine .reco .tel{margin-top:8px}
#cine .agr{position:absolute;left:26px;right:26px;bottom:36px;height:64px;border-radius:999px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;box-shadow:0 12px 26px rgba(79,23,40,.35)}
#cine .cabp{position:absolute;right:26px;top:54px;z-index:4}
#cine .vuela{position:absolute;left:170px;top:770px;width:60px;height:60px;border-radius:50%;overflow:hidden;background:#2a1c17;box-shadow:0 8px 18px rgba(0,0,0,.35);opacity:0;z-index:9}
#cine .vuela img{width:100%;height:100%}
#cine .caviso{position:absolute;left:26px;right:26px;bottom:116px;padding:14px 18px;border-radius:22px;background:#4f1728;color:#fff;font-size:16px;font-weight:600;display:flex;align-items:center;gap:12px;opacity:0;z-index:9;box-shadow:0 14px 30px rgba(79,23,40,.35)}
#cine .caviso img{width:40px;height:40px}
/* cierre */
#cine .marca{position:absolute;left:0;right:0;top:330px;display:flex;flex-direction:column;align-items:center;gap:26px;opacity:0;visibility:hidden}
#cine .marca b{font-family:'DM Serif Display',serif;font-weight:400;font-size:230px;line-height:1;color:#fef9f1}
#cine .marca i{display:block;width:420px;height:2px;background:rgba(253,195,77,.7)}
#cine .marca span{font-family:'DM Serif Display',serif;font-size:76px;color:#fdc34d;font-style:italic}
#cine .avisoT{margin-top:18px;padding:14px 16px;border-radius:22px;background:#f8f1e5;font-size:15.5px;line-height:1.35;color:#3a2a22;display:flex;gap:10px}
#cine .hero{position:absolute;left:0;right:0;top:0;height:330px;background:radial-gradient(ellipse 70% 70% at 50% 45%,#4a2e24,#1d1210);display:flex;align-items:center;justify-content:center}
#cine .hero img{width:250px;height:250px}
#cine .btn2{position:absolute;left:26px;right:26px;height:60px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700}
#cine .btn2.v{background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;bottom:36px}
#cine .btn2.o{background:#eef0e2;color:#4c5630;bottom:110px;box-shadow:inset 0 0 0 2px #66713d}
#cine .toast{position:absolute;left:26px;right:26px;top:60px;padding:14px 18px;border-radius:22px;background:#4c5630;color:#fff;font-size:17px;font-weight:600;display:flex;align-items:center;gap:10px;opacity:0;z-index:9}
#cine .toast svg,#intro #cine .toast svg{width:22px;height:22px}
#cine .reco2{position:absolute;left:20px;right:20px;top:330px;padding:16px;border-radius:24px;background:#fff;box-shadow:0 18px 40px rgba(79,23,40,.22);opacity:0;z-index:6}
#cine .reco2 .de{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:#4f1728}
#cine .reco2 .pl{display:flex;align-items:center;gap:12px;margin-top:12px}
#cine .reco2 .pl img{width:70px;height:70px;border-radius:20px;background:#2a1a14}
#cine .reco2 .pl b{font-family:'DM Serif Display',serif;font-weight:400;font-size:21px}
#cine .reco2 .me{margin-top:14px;height:52px;border-radius:999px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700}
#cine .listos{margin-top:28px;text-align:center}
#cine .listos .avs{display:flex;justify-content:center;gap:16px;margin-top:20px}
#cine .listos .avs span{position:relative}
#cine .listos .avs .av{width:66px;height:66px;font-size:27px;box-shadow:0 0 0 4px #66713d}
#cine .listos .avs em{position:absolute;right:-4px;bottom:-4px;width:30px;height:30px;border-radius:50%;background:#66713d;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #fef9f1}
#cine .listos .avs em svg,#intro #cine .listos .avs em svg{width:18px;height:18px}
#cine .barra{height:12px;border-radius:6px;background:#66713d;margin:26px 10px 10px}
#cine .listos p{margin:6px 0 0;font-size:18px;color:#5b4a3d}
#cine .listos h4{font-size:36px}
#cine .bloq{background:linear-gradient(170deg,#6b2d3e,#2a0d17 70%)!important;color:#fef9f1;text-align:center;padding-top:110px}
#cine .bloq .hr{font-size:84px;font-weight:300;letter-spacing:-.02em;line-height:1}
#cine .bloq .fe{font-size:18px;opacity:.8;margin-top:6px}
#cine .noti{margin:66px 14px 0;padding:18px 20px;border-radius:42px;background:rgba(254,249,241,.94);color:#1a1a1a;text-align:left}
#cine .noti .ap{display:flex;align-items:center;gap:8px;font-size:14px;color:#5b4a3d}
#cine .noti .ap i{width:24px;height:24px;border-radius:7px;background:#4f1728;color:#fdc34d;font:400 16px 'DM Serif Display',serif;display:flex;align-items:center;justify-content:center;font-style:normal}
#cine .noti b{display:block;font-size:18px;margin-top:8px}
#cine .noti .ya{margin-top:12px;height:46px;border-radius:999px;background:#4f1728;color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}
#cine .mesa7{display:flex;align-items:center;gap:12px;margin-top:22px}
#cine .mesa7 h4{font-size:38px}
#cine .mesa7 span{padding:7px 14px;border-radius:999px;background:#eef0e2;color:#4c5630;font-size:15px;font-weight:700;white-space:nowrap}
#cine .ped{display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px;border-radius:22px;background:#fff;box-shadow:0 10px 24px rgba(79,23,40,.08)}
#cine .ped img{width:56px;height:56px;border-radius:18px;background:#2a1a14}
#cine .ped b{display:block;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#6b2d3e}
#cine .ped span{font-family:'DM Serif Display',serif;font-size:19px}
#cine .hecho{position:absolute;left:26px;right:26px;bottom:36px;height:60px;border-radius:999px;background:#66713d;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-size:19px;font-weight:700;opacity:0}
#cine .hecho svg,#intro #cine .hecho svg{width:22px;height:22px}
#cine .marca{z-index:7;top:270px}
/* los cuatro teléfonos del ciclo: seguimiento de la orden (prototipo P04b) y la cuenta (prototipo P05 v2), dibujadas; sin método de pago */
#cine .sgx .sgc{position:absolute;left:26px;right:26px;top:62px;display:flex;justify-content:space-between;align-items:center}
#cine .sgx .sgc i{font:italic 400 25px 'DM Serif Display',serif;color:#4f1728}
#cine .sgx .sgc span{padding:7px 14px;border-radius:999px;background:#f1e3e6;color:#4f1728;font-size:15px;font-weight:700}
#cine .sgx .sgp{position:absolute;left:30px;right:30px;top:126px;display:flex;align-items:flex-start}
#cine .sgx .sgp span{flex:none;width:86px;display:flex;flex-direction:column;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:#4f1728;text-align:center}
#cine .sgx .sgp u{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;text-decoration:none}
#cine .sgx .sgp .act u{box-shadow:0 8px 20px rgba(79,23,40,.3)}
#cine .sgx .sgp em{flex:1;height:4px;border-radius:2px;margin-top:22px;background:linear-gradient(135deg,#6b2d3e,#4f1728)}
#cine .sgx .sgp svg,#intro #cine .sgx .sgp svg{width:23px;height:23px;stroke:#fff}
#cine .sgx .sgm{position:absolute;left:0;right:0;top:262px;display:flex;flex-direction:column;align-items:center;text-align:center}
#cine .sgx .sgi{width:128px;height:128px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;box-shadow:0 24px 56px rgba(79,23,40,.35)}
#cine .sgx .sgi svg,#intro #cine .sgx .sgi svg{width:62px;height:62px;stroke:#fff}
#cine .sgx .sgm b{font:400 34px 'DM Serif Display',serif;margin-top:24px}
#cine .sgx .sgm em{font:italic 400 21px 'DM Serif Display',serif;color:#4f1728;margin-top:6px}
#cine .sgx .sgm small{font-size:15px;color:#5b4a3d;margin-top:10px}
#cine .sgx .sgb,#cine .sgx .sgw{position:absolute;left:26px;right:26px;bottom:36px;display:flex;flex-direction:column;gap:10px}
#cine .sgx .sb1,#cine .sgx .sb2{height:56px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}
#cine .sgx .sb1{background:#efe6d6;color:#4f1728}#cine .sgx .sb2{background:linear-gradient(135deg,#d4a017,#b8860b);color:#fff}
#cine .sgx .sgw,#cine .sgx .sgt{opacity:0;visibility:hidden}
#cine .sgx .sgt{position:absolute;left:26px;right:26px;top:206px;z-index:2;padding:15px;border-radius:20px;background:#eef0e2;color:#4c5630;font-size:19px;font-weight:700;text-align:center;box-shadow:0 12px 28px rgba(60,40,20,.18)}
#cine .sgx .sgw span{display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;color:#5b4a3d}
#cine .sgx .sgw span i{flex:none;width:9px;height:9px;border-radius:50%;background:#b8860b}
#cine .sgx .sgp .no{color:#8a7a6c}#cine .sgx .sgp .no u{background:#e6dccb;box-shadow:none}#cine .sgx .sgp em.no{background:#e6dccb}
#cine .sgx .sgp .no svg,#intro #cine .sgx .sgp .no svg{stroke:#8a7a6c}
#cine .sgx .sgk{position:relative;width:132px;height:132px;border-radius:50%;background:#f3ead9;display:flex;align-items:center;justify-content:center;color:#4f1728;box-shadow:0 0 0 14px rgba(184,134,11,.12)}
#cine .sgx .sgk svg,#intro #cine .sgx .sgk svg{width:62px;height:62px;stroke:#4f1728}
#cine .sgx .sgk i{position:absolute;top:12px;width:9px;height:9px;border-radius:50%;background:rgba(133,115,117,.45)}
#cine .sgx .sgk i:nth-of-type(1){left:44px}#cine .sgx .sgk i:nth-of-type(2){left:62px}#cine .sgx .sgk i:nth-of-type(3){left:80px}
#cine .qK .sgm b{font-size:31px;line-height:1.15;margin-top:30px}
#cine .sgx .kbar{width:260px;height:8px;border-radius:4px;background:#e6dccb;margin:22px 0 8px;overflow:hidden}
#cine .sgx .kbar u{display:block;width:56%;height:100%;border-radius:4px;background:linear-gradient(135deg,#d4a017,#b8860b)}
/* el modal de dos niveles para pedir un cambio (P04b) */
#cine .mvel{position:absolute;left:0;top:0;right:0;bottom:0;z-index:3;background:rgba(29,28,23,.45);opacity:0;visibility:hidden}
#cine .msh{position:absolute;left:0;right:0;bottom:0;z-index:4;background:#fef9f1;border-radius:32px 32px 0 0;padding:26px 24px 34px;opacity:0;visibility:hidden}
#cine .msh h5{font:400 26px 'DM Serif Display',serif;margin:0 0 4px}#cine .msh small{font-size:14px;color:#5b4a3d}
#cine .mop{margin-top:14px;padding:16px 18px;border-radius:20px;background:#fff;box-shadow:0 2px 10px rgba(29,28,23,.06);display:flex;flex-direction:column;gap:3px}
#cine .mop b{font-size:18px}
#cine .mfi{margin-top:10px;padding:13px 16px;border-radius:18px;background:#fff;display:flex;justify-content:space-between;align-items:center;font-size:16px}
#cine .mfi i{font-style:normal;font-weight:800;color:#5b4a3d}
#cine .mfi b{display:block}#cine .mfi .mel{display:block;font-size:12.5px;color:#a03a30;opacity:0;visibility:hidden}
#cine .mqt{display:inline-flex;align-items:center;gap:10px;flex:none}
#cine .mqt u{width:34px;height:34px;border-radius:50%;background:#efe6d6;color:#4f1728;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:22px;font-weight:700}
#cine .mqt i{min-width:18px;text-align:center}#cine .mqt .q1{opacity:0;visibility:hidden;position:absolute}
#cine .qcar{position:absolute;left:0;top:0;right:0;bottom:0;z-index:4;background:#fef9f1;padding:70px 24px 0;opacity:0;visibility:hidden}
#cine .qcar h5{font:400 30px 'DM Serif Display',serif;margin:0 0 2px}#cine .qcar small{font-size:15px;color:#5b4a3d}
#cine .qcar .qadd{position:absolute;left:24px;right:24px;bottom:106px;padding:13px 16px;border-radius:18px;background:#eef0e2;color:#4c5630;font-size:16px;opacity:0;visibility:hidden}
#cine .qcar .mcf{position:absolute;left:24px;right:24px;bottom:36px;height:56px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;opacity:0;visibility:hidden}
#cine .msh .mcf{margin-top:16px;height:56px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff}
#cine .mto{position:absolute;left:20px;right:20px;top:58px;z-index:5;padding:14px 18px;border-radius:18px;background:#2a2420;color:#fff;font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;opacity:0;visibility:hidden}
#cine .mto.t2{background:#fff;color:#1a1a1a;box-shadow:0 16px 40px rgba(0,0,0,.3)}
#cine .mto svg,#intro #cine .mto svg{width:22px;height:22px;stroke:#4f1728}
/* la espera del mesero: «Orden de la mesa» */
#cine .qE .eh{position:absolute;left:26px;top:66px;font:400 30px 'DM Serif Display',serif}
#cine .qE .eav{position:absolute;left:26px;right:26px;top:128px;display:flex;justify-content:space-between}
#cine .qE .eav>span{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;font-weight:600}
#cine .qE .eav .av{margin:0;width:62px;height:62px;font-size:24px;box-shadow:0 0 0 3px #fef9f1,0 0 0 5.5px #b8860b}
#cine .qE .eav i{position:absolute;right:-2px;top:44px;width:22px;height:22px;border-radius:50%;background:#15803d;display:flex;align-items:center;justify-content:center}
#cine .qE .eav i svg,#intro #cine .qE .eav i svg{width:13px;height:13px;stroke:#fff}
#cine .qE .ebar{position:absolute;left:26px;right:26px;top:236px;height:10px;border-radius:5px;background:linear-gradient(135deg,#d4a017,#b8860b)}
#cine .qE .ebt{position:absolute;left:26px;top:254px;font-size:13.5px;font-weight:700;color:#8a6508}
#cine .qE .ecall{position:absolute;left:24px;right:24px;top:290px;padding:14px 16px;border-radius:20px;display:flex;align-items:center;gap:13px;background:#fff;box-shadow:0 8px 24px rgba(79,23,40,.1)}
#cine .qE .ecall.e2{background:#f6ecd2;box-shadow:none;opacity:0;visibility:hidden}
#cine .qE .eic{flex:none;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6b2d3e,#4f1728);display:flex;align-items:center;justify-content:center}
#cine .qE .e2 .eic{background:linear-gradient(135deg,#d4a017,#b8860b)}
#cine .qE .eic svg,#intro #cine .qE .eic svg{width:22px;height:22px;stroke:#fff}
#cine .qE .ecall b{display:block;font-size:16px;color:#4f1728}#cine .qE .e2 b{color:#8a6508}#cine .qE .ecall small{font-size:13px;color:#5b4a3d;line-height:1.25}
#cine .eord{position:absolute;left:24px;right:24px;top:404px}
#cine .eord h5{font:400 22px 'DM Serif Display',serif;margin:0 0 10px}
#cine .edsh{display:flex;align-items:center;gap:12px;padding:10px 14px 10px 10px;border-radius:20px;background:#fff;box-shadow:0 2px 10px rgba(29,28,23,.05);font-size:16px;font-weight:600}
#cine .edsh img{width:56px;height:56px;border-radius:14px;object-fit:cover;background:#2a1d17}
/* tablero: la solicitud de cambio, con «Rechazar» y «Aceptar» */
#cine .pgran{position:absolute;left:146px;top:318px;width:108px;height:108px;border-radius:50%;background:#66713d;box-shadow:0 14px 34px rgba(40,50,20,.4);display:flex;align-items:center;justify-content:center;z-index:2;opacity:0;visibility:hidden}
#cine .pgran svg,#intro #cine .pgran svg{width:60px;height:60px;stroke:#fff}
#cine .pvelo{position:absolute;left:0;top:0;right:0;bottom:0;z-index:1;background:rgba(26,18,16,.5);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);opacity:0;visibility:hidden}
#cine .psol{position:absolute;left:18px;right:18px;top:300px;height:196px;z-index:2;padding:20px 20px 0;border-radius:24px;background:#fff;box-shadow:0 12px 34px rgba(20,10,8,.4);display:flex;flex-direction:column;gap:8px;opacity:0;visibility:hidden}
#cine .psol b{font-size:20px}#cine .psol span{font-size:17px;font-weight:600;color:#4f1728;line-height:1.2}
#cine .psol div{position:absolute;left:20px;right:20px;bottom:20px;display:flex;gap:10px}
#cine .psol div i{flex:1;height:52px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:17px;font-weight:700}
/* tablero: la comanda como lista con casillas y «Todo servido» */
#cine .pserv{position:absolute;left:0;top:0;right:0;bottom:0;z-index:3;background:#fef9f1;padding:66px 24px 0;opacity:0;visibility:hidden}
#cine .pserv h5{font:400 30px 'DM Serif Display',serif;margin:0}#cine .pserv small{position:relative;display:block;height:20px;font-size:15px;color:#5b4a3d}
#cine .pserv small i{position:absolute;left:0;top:0;font-style:normal}#cine .pserv small .v1,#cine .pvb .v1{opacity:0;visibility:hidden}
#cine .pvr{margin-top:10px;padding:13px 14px;border-radius:18px;background:#fff;box-shadow:0 2px 10px rgba(29,28,23,.05);display:flex;align-items:center;gap:12px;font-size:16px;font-weight:600}
#cine .pvr u{flex:none;width:26px;height:26px;border-radius:8px;box-shadow:inset 0 0 0 2px #b9a98f;display:flex;align-items:center;justify-content:center;text-decoration:none}
#cine .pvr u svg,#intro #cine .pvr u svg{width:16px;height:16px;stroke:#fff;opacity:0}
#cine .pvr span{margin-left:auto;font-size:13px;font-weight:500;color:#5b4a3d}
#cine .pvb{position:absolute;left:26px;right:26px;bottom:36px;height:66px;border-radius:999px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;font-size:22px;font-weight:700}
#cine .pvb i{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:8px;font-style:normal}
#cine .psol .pr{background:#efe6d6;color:#4f1728}#cine .psol .pa{background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff}
#cine .psol em{position:absolute;left:0;right:0;bottom:32px;text-align:center;font-style:normal;font-size:20px;font-weight:800;opacity:0;visibility:hidden}
#cine .psol em.si{color:#4c5630}#cine .psol em.no{color:#a03a30}
/* en «Abierta»: los cuatro teléfonos, en pequeño, con el estado de su orden */
#cine .mnrow{position:absolute;left:60px;top:256px;display:flex;gap:16px;z-index:4;opacity:0;visibility:hidden}
#cine .mnph{position:relative;width:92px;height:172px;border-radius:18px;background:#fef9f1;box-shadow:0 0 0 4px #100c0a,0 0 0 5.5px #3a322d;color:#1a1a1a}
#cine .mnph>span{position:absolute;left:20px;top:30px;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center}
#cine .mnph>span.mnk{background:#f3ead9}#cine .mnph>span.mns{background:linear-gradient(135deg,#6b2d3e,#4f1728)}
#cine .mnph svg,#intro #cine .mnph svg{width:27px;height:27px;stroke:#4f1728}#cine .mnph .mns svg,#intro #cine .mnph .mns svg{stroke:#fff}
#cine .mnph b{position:absolute;left:4px;right:4px;top:92px;text-align:center;font-size:12.5px;line-height:1.12}
#cine .mnph small{position:absolute;left:0;right:0;bottom:11px;text-align:center;font-size:12px;font-weight:700;color:#5b4a3d}
#cine .mnph>span.mnc{background:linear-gradient(135deg,#d4a017,#b8860b)}#cine .mnph .mnc svg,#intro #cine .mnph .mnc svg{stroke:#fff}
#cine .mnph .mns,#cine .mnph .mnc{opacity:0;visibility:hidden}
/* la lupa de los cierres: quién, qué botón toca y qué pasa */
#cine .lupa.lu6{left:500px;top:112px;width:262px;height:262px}
#cine .lq{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:0 22px;color:#1a1a1a;opacity:0;visibility:hidden}
#cine .lq small{font-size:20px;font-weight:700;color:#5b4a3d;letter-spacing:.08em;text-transform:uppercase}
#cine .lq .lb{padding:15px 22px;border-radius:999px;font-size:21px;font-weight:700;line-height:1.15}
#cine .lq .lb.d{background:linear-gradient(135deg,#d4a017,#b8860b);color:#fff}#cine .lq .lb.s{background:#efe6d6;color:#4f1728}
#cine .lq em{font-style:normal;font-size:19px;font-weight:700;line-height:1.2;color:#4c5630;opacity:0;visibility:hidden}
/* tablero: cuántas cuentas van cerradas */
#cine .pcc{position:absolute;left:0;right:0;top:628px;display:flex;align-items:center;justify-content:center;gap:9px;font-size:17px;font-weight:600;color:#4f1728;opacity:0;visibility:hidden}
#cine .pcc i{position:relative;width:20px;height:20px;border-radius:50%;background:#e6dccb}
#cine .pcc u{position:absolute;left:0;top:0;width:20px;height:20px;border-radius:50%;background:#66713d;opacity:0;visibility:hidden}
/* la cuenta: cuatro teléfonos en cuadrícula, cada uno en su espacio, con su lupa al lado */
#cine .celda{position:absolute;width:660px;height:412px;overflow:hidden;opacity:0;visibility:hidden}
#cine .celda.cq0{left:40px;top:128px}#cine .celda.cq1{left:716px;top:128px}#cine .celda.cq2{left:40px;top:556px}#cine .celda.cq3{left:716px;top:556px}
#cine .ctt{opacity:0;visibility:hidden;position:absolute;left:262px;right:16px;top:20px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;color:#fef9f1}
#cine .ctt .cnm{display:flex;align-items:center;gap:14px;font:400 40px 'DM Serif Display',serif}#cine .ctt .cnm .foto{width:58px;height:58px}
#cine .ctt .crow{display:flex;align-items:baseline;gap:10px;width:300px;font-size:20px;color:rgba(254,249,241,.8)}
#cine .ctt .crow b,#cine .ctt .crow .vp{margin-left:auto;font-weight:700;color:#fdc34d}
#cine .vv.vp{width:70px;height:26px;text-align:right}#cine .vv.vp i{left:auto;right:0;font-size:20px;font-weight:700}
/* cruz de líneas doradas entre los cuatro */
#cine .dvc{position:absolute;z-index:1;opacity:0;visibility:hidden}
#cine .dvc.dvv{left:707px;top:128px;width:2px;height:840px;background:linear-gradient(180deg,rgba(253,195,77,0),rgba(253,195,77,.6) 14%,rgba(253,195,77,.6) 86%,rgba(253,195,77,0));transform-origin:50% 50%}
#cine .dvc.dvh{left:40px;top:547px;width:1336px;height:2px;background:linear-gradient(90deg,rgba(253,195,77,0),rgba(253,195,77,.6) 10%,rgba(253,195,77,.6) 90%,rgba(253,195,77,0));transform-origin:50% 50%}
/* la cifra que viaja por la tubería */
#cine .vj{position:absolute;left:0;top:0;z-index:5;margin:-22px 0 0 -44px;width:88px;height:44px;border-radius:22px;background:linear-gradient(135deg,#d4a017,#b8860b);color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(10,6,4,.45);opacity:0;visibility:hidden}
#cine .vj i{position:absolute;font-style:normal;opacity:0;visibility:hidden}
#cine .vv{position:relative;display:inline-block;width:74px;height:1.25em;vertical-align:bottom;text-align:left}
#cine .vv i{position:absolute;left:0;top:0;font-style:normal;font-weight:800;white-space:nowrap;opacity:0;visibility:hidden}
#cine .vv.vt{width:370px;height:84px}#cine .vv.vt i{font:400 76px/1.1 'DM Serif Display',serif;color:#fef9f1}
#cine .cnt4{position:absolute;left:608px;top:448px;width:200px;height:200px;border-radius:50%;background:#fef9f1;color:#4f1728;box-shadow:0 0 0 4px rgba(253,195,77,.9),0 0 0 12px rgba(23,18,16,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;z-index:3;opacity:0;visibility:hidden}
#cine .cnt4 svg,#intro #cine .cnt4 svg{width:60px;height:60px}
#cine .cnt4 .vv.vm{height:24px;width:190px}#cine .cnt4 .vv.vm i{font:700 17px 'DM Sans',sans-serif;color:#8a6508}
#cine .cnt4 svg,#intro #cine .cnt4 svg{width:52px;height:52px}
#cine .cnt4 .vv{width:150px;height:42px}#cine .cnt4 .vv i{left:0;right:0;text-align:center;font:400 34px 'DM Serif Display',serif}
#cine .gq{position:absolute;left:262px;top:262px;max-width:372px;padding:15px 20px;border-radius:24px;background:rgba(23,18,16,.88);color:#fef9f1;font-size:23px;font-style:italic;line-height:1.25;box-shadow:0 0 0 1.5px rgba(253,195,77,.34);transform-origin:0 50%;opacity:0;visibility:hidden}
#cine .gqf{position:absolute;left:300px;top:240px;font-size:110px;line-height:1;transform-origin:50% 80%;opacity:0;visibility:hidden}
#intro #cine svg.repa{position:absolute;left:0;top:0;width:1920px;height:1080px;fill:none;stroke:#fdc34d;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;opacity:.85;pointer-events:none}
#cine .qest{display:inline-flex;align-items:center;gap:8px;margin-top:12px;padding:8px 16px;border-radius:999px;background:#eef0e2;color:#4c5630;font-size:17px;font-weight:700}
#cine .qest svg,#intro #cine .qest svg{width:18px;height:18px;stroke:#4c5630}
#cine .qin{position:absolute;left:0;right:0;top:0;padding:58px 26px 0}
#cine .qhero{margin-top:18px;height:120px;border-radius:26px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fef9f1;padding:22px 24px}
#cine .qhero b{display:block;font:400 34px 'DM Serif Display',serif}#cine .qhero small{font-size:15px;opacity:.8}
#cine .qC .kcta span{position:relative;padding-right:46px}
#cine .qC .kcta span i{margin-left:auto}
#cine .qlike{position:absolute;right:0;top:9px;width:30px;height:30px;border-radius:50%;font-size:26px;line-height:30px;text-align:center;color:#d9cbb4}
#cine .qlike u{position:absolute;inset:0;text-decoration:none;color:#9b2c4a}
#cine .qseg{margin-left:auto;position:relative;display:flex;border-radius:999px;background:#eadfcd;flex:none}
#cine .qseg i{position:relative;z-index:1;width:58px;height:44px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:14px;font-weight:700;color:#5b4a3d}
#cine .qseg svg,#intro #cine .qseg svg{width:24px;height:24px}
#cine .qseg .qsel{position:absolute;left:58px;top:0;width:58px;height:44px;border-radius:999px;background:#4f1728}
#cine .qseg i.qp{color:#5b4a3d}
#cine .qC .kinv{margin-top:12px}
#cine .sec.sx{position:relative;height:36px}
#cine .sec.sx h4{position:absolute;left:0;top:0;white-space:nowrap}
#cine .tj .csec{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#b8860b;margin-bottom:4px}
#cine .pOrden .ped{margin-top:10px;padding:9px 12px}
#cine .pRes .cings{margin-top:14px}#cine .pRes .cing{padding:7px 13px}
/* la carta: lo agotado se ve atenuado */
#cine .cfila.cagot{opacity:.42}
#cine .cfila .cag{margin-left:auto;padding:5px 10px;border-radius:999px;background:#ece4d6;color:#5b4a3d;font-size:13px;font-weight:700;white-space:nowrap}
/* mi cuenta (Fase 3) e invitar a alguien (versión 1.1): dibujadas; el pago se hace con el mesero */
#cine .kcta{margin-top:14px;display:flex;flex-direction:column}
#cine .kcta span{display:flex;justify-content:space-between;height:48px;align-items:center;font-size:19px;color:#1a1a1a}
#cine .kcta span i,#cine .kprop i,#cine .ktot i{font-style:normal;font-weight:600}
#cine .kcta .cinv{color:#6b2d3e}#cine .cpar{position:relative;width:80px;height:24px}#cine .cpar u{position:absolute;right:0;top:0;text-decoration:none;white-space:nowrap;opacity:0;visibility:hidden}
#cine .kprop{position:relative;margin-top:10px;display:flex;align-items:center;gap:8px;height:48px}
#cine .kprop b{font-size:19px;font-weight:600;margin-right:6px}
#cine .kprop .cpc{padding:8px 13px;border-radius:999px;background:#f3e9da;font-size:15px;font-weight:600;white-space:nowrap}
#cine .kprop .cpc.on{background:#4f1728;color:#fff}
#cine .kprop i,#cine .ktot i{position:absolute;right:0;font-size:19px}
#cine .kinv{margin-top:14px;padding:14px 16px;border-radius:22px;background:#f8f1e5;display:flex;align-items:center;gap:12px}
#cine .kinv .av{width:40px;height:40px;font-size:18px;background:#7a2f45;box-shadow:none}
#cine .kinv b{display:block;font-size:17px}#cine .kinv small{font-size:14px;color:#5b4a3d}
#cine .ktog{margin-left:auto;position:relative;width:52px;height:30px;border-radius:15px;background:#d9cbb4;flex:none}
#cine .ktog u{position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff}
#cine .tsec{margin:18px 0 4px;font:400 22px 'DM Serif Display',serif;color:#4f1728}
#cine .topc{margin-top:10px;height:72px;padding:0 20px;border-radius:22px;background:#f8f1e5;display:flex;flex-direction:column;justify-content:center}
#cine .topc b{font-size:18px}#cine .topc small{font-size:14px;color:#5b4a3d}
#cine .tdat{margin-top:14px;padding:6px 18px;border-radius:22px;background:#f8f1e5;display:flex;flex-direction:column}
#cine .tdat span{display:flex;justify-content:space-between;align-items:center;height:46px;font-size:15px;color:#5b4a3d}
#cine .tdat span i{font-style:normal;font-weight:700;font-size:16px;color:#1a1a1a}
#cine .tcp{position:relative;margin-top:14px;height:52px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 2px #4f1728;color:#4f1728;font-size:17px;font-weight:700}
#cine .tcp i{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;font-style:normal}#cine .tcp .c1{opacity:0;visibility:hidden;color:#4c5630}
#cine .tcp svg,#intro #cine .tcp svg{width:20px;height:20px;stroke:#4c5630}
#cine .ppg{position:absolute;left:26px;right:26px;bottom:30px;height:104px;background:#fef9f1;box-shadow:0 0 0 12px #fef9f1;z-index:2;opacity:0;visibility:hidden}
#cine .ppg .pn{position:relative;height:26px;font-size:19px;font-weight:700;color:#4f1728}
#cine .ppg .pn i,#cine .ppg .pm i{position:absolute;left:0;top:0;font-style:normal;white-space:nowrap;opacity:0;visibility:hidden}
#cine .ppg .pm{position:absolute;right:0;top:50px;width:170px;height:22px;font-size:16px;font-weight:600;color:#5b4a3d}#cine .ppg .pm i{left:auto;right:0}
#cine .ppg .pbar{margin-top:6px;height:10px;border-radius:999px;background:#eee4d3;overflow:hidden}
#cine .ppg .pbar u{display:block;height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,#66713d,#8a9a55);transform-origin:0 50%}
#cine .ppg .pinv{margin-top:12px;font-size:16px;font-weight:600;color:#5b4a3d}
#cine .ppg .pve{position:absolute;left:0;right:0;bottom:0;height:56px;border-radius:999px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;font-size:19px;font-weight:700;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden}
#cine .bill{position:absolute;left:1262px;top:716px;width:78px;height:38px;border-radius:6px;background:linear-gradient(135deg,#8fae7c,#5f8050);box-shadow:5px -5px 0 #7c9c69,0 6px 14px rgba(0,0,0,.35);opacity:0;visibility:hidden}
#cine .bill::after{content:"";position:absolute;left:28px;top:8px;width:22px;height:22px;border-radius:50%;background:rgba(254,249,241,.55)}
#cine .ktot{position:relative;margin-top:16px;height:44px;display:flex;align-items:center}
#cine .ktot b{font-family:'DM Serif Display',serif;font-weight:400;font-size:28px;color:#4f1728}
#cine .ktot i{font-size:26px;color:#4f1728}
/* la pantalla de mesa del mesero (prototipo, grupo «mesero», detalle de mesa): Mesa 7 y su pista de cuatro estados */
#cine .mesaP{display:flex;align-items:center;gap:14px;margin-top:20px}
#cine .mesaP h4{font-size:44px}
#cine .mesaP .mst{position:relative;flex:1;height:36px}
#cine .mesaP .mst i{position:absolute;left:0;top:0;padding:7px 14px;border-radius:999px;font-style:normal;font-size:16px;font-weight:700;white-space:nowrap;opacity:0}
#cine .mst .m0,#cine .mst .m3{background:#eef0e2;color:#4c5630}#cine .mst .m1{background:#f6ecd2;color:#7a5a08}#cine .mst .m2{background:#f3e1e6;color:#6b2d3e}
#cine .pista{position:relative;margin:20px 0 0 30px}
#cine .pista::before{content:"";position:absolute;left:30px;top:46px;bottom:46px;width:4px;border-radius:2px;background:#eadfcd}
#cine .ps{position:relative;height:96px;display:flex;align-items:center;gap:16px;padding:0 12px}
#cine .ps .pbg{position:absolute;inset:5px 0;border-radius:26px;background:#fff;box-shadow:0 12px 26px rgba(79,23,40,.12);opacity:0}
#cine .ps .pc{position:relative;width:40px;height:40px;border-radius:50%;background:#fef9f1;box-shadow:inset 0 0 0 3px #d9cbb4;flex:none}
#cine .ps .pc i{position:absolute;inset:0;border-radius:50%;opacity:0;display:flex;align-items:center;justify-content:center}
#cine .ps .pc .pca{background:#4f1728;box-shadow:0 0 0 6px rgba(79,23,40,.16)}
#cine .ps .pc .pok{background:#66713d}
#cine .ps .pc svg,#intro #cine .ps .pc svg{width:22px;height:22px}
#cine .ps .pt{position:relative}
#cine .ps .pt b{display:block;font-size:25px;font-weight:700;color:#1a1a1a}
#cine .ps .pt small{font-size:16px;color:#5b4a3d}
#cine .pnota{position:absolute;left:26px;right:26px;bottom:116px;height:26px}
#cine .pnota span{position:absolute;left:0;right:0;text-align:center;font-size:17px;font-weight:600;color:#5b4a3d;opacity:0}
#cine .pbt{position:absolute;left:26px;right:26px;bottom:36px;height:66px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:22px;font-weight:700;color:#fff;opacity:0}
#cine .pbt.b0,#cine .pbt.b1{background:linear-gradient(135deg,#6b2d3e,#4f1728)}#cine .pbt.b2{background:linear-gradient(135deg,#c9961a,#a87a08)}#cine .pbt.b3{background:#66713d}
#cine .pbt svg,#intro #cine .pbt svg{width:22px;height:22px}
#intro .barras{gap:10px;bottom:14px}
#intro .barras i{height:2px;background:rgba(255,255,255,.16)}
#intro .barras i b{background:rgba(243,213,138,.7)}
#intro .barras .btn,#intro > .ictl:not(.barras) .btn{background:transparent;color:rgba(254,249,241,.62);padding:6px 10px;font-size:13px}
#intro .barras .btn:hover,#intro > .ictl:not(.barras) .btn:hover{background:rgba(255,255,255,.12);color:#fff}
#intro .ipuerta{position:absolute;left:0;top:0;right:0;bottom:0;z-index:20;background:rgba(12,9,8,.5);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;pointer-events:none}
#intro .ipuerta[hidden]{display:none}
#intro .ipuerta button{pointer-events:auto;cursor:pointer;border:0;font-family:'DM Sans',sans-serif}
#intro .ipuerta .ipv{min-height:64px;padding:0 44px;border-radius:999px;background:#fef9f1;color:#4f1728;font-size:24px;font-weight:700;box-shadow:0 18px 44px rgba(8,4,3,.55)}
#intro .ipuerta .ips{min-height:44px;padding:0 18px;background:none;color:#fef9f1;font-size:18px;font-weight:600;text-decoration:underline;text-underline-offset:4px}
#intro .ipuerta button:focus-visible{outline:3px solid #fdc34d;outline-offset:4px}
#intro .icta{transition:opacity .7s ease}
#intro .icta[hidden]{display:flex;opacity:0;pointer-events:none}
`;
const palabras = l => l.split(/(\*[^*]+\*)/).filter(Boolean).map(tr => { const em = tr.startsWith("*"), tx = em ? tr.slice(1, -1) : tr; return (/^ /.test(tx) ? " " : "") + tx.split(" ").filter(Boolean).map(p => `<span class="cw">${em ? "<em>" + esc(p) + "</em>" : esc(p)}</span>`).join(" ") + (/ $/.test(tx) ? " " : ""); }).join("");
const ico = {
  no: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6.5"/><path d="M3.5 3.5l9 9"/></svg>`,
  tel: `<svg viewBox="0 0 16 16" fill="none" stroke="#6b2d3e" stroke-width="1.6"><rect x="4" y="1.5" width="8" height="13" rx="2"/><path d="M7 12.2h2"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  pez: `<svg viewBox="0 0 24 24"><path d="M3 12c3-4 9-5 13-1l4-3-1 4 1 4-4-3c-4 4-10 3-13-1z" fill="#c9472c"/><circle cx="7" cy="11.5" r="1" fill="#fff"/></svg>`,
  chile: `<svg viewBox="0 0 24 24"><path d="M6 6c2 0 3 1 3 3 0 5 4 9 10 10-7 2-13-2-14-9 0-2 0-4 1-4z" fill="#8f2a1c"/><path d="M6 6c0-2 1-3 3-3" stroke="#4f8a2e" stroke-width="2" fill="none"/></svg>`,
  ajo: `<svg viewBox="0 0 24 24"><path d="M12 4c-5 4-7 8-6 11 1 3 4 5 6 5s5-2 6-5c1-3-1-7-6-11z" fill="#f3ead8" stroke="#c9b48e"/><path d="M12 4v16M9 8c-1 4-1 8 1 12M15 8c1 4 1 8-1 12" stroke="#c9b48e" fill="none"/></svg>`,
  limon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#7dae3a"/><circle cx="12" cy="12" r="6" fill="#d7ec8a"/><path d="M12 6v12M6 12h12M8 8l8 8M16 8l-8 8" stroke="#b9d66a" stroke-width="1.2"/></svg>`,
  cilantro: `<svg viewBox="0 0 24 24"><path d="M12 21V11" stroke="#3f7a26" stroke-width="2"/><circle cx="12" cy="8" r="4" fill="#4f8a2e"/><circle cx="7.5" cy="12" r="3.4" fill="#5f9a36"/><circle cx="16.5" cy="12" r="3.4" fill="#3f7a26"/></svg>`,
  chispa: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z" fill="#b8860b"/></svg>`,
};
const sb = (osc = false) => `<div class="sb${osc ? " osc" : ""}"><b>9:41</b><i></i><u></u></div>`;
const cab = (mia = false) => `<div class="cab"><span class="lg">L</span>La Ceiba${mia ? `<span class="mia">Mi mesa <span class="av ca">A</span><span class="av cs">S</span><span class="av cd">D</span><span class="av cc">C</span><span class="bd">1</span></span>` : ""}</div>`;
const cRen = (img, nom, pr, no = "") => `<div class="cfila${no ? " cfuera" : ""}"><img src="${CI("plato-" + img)}" alt=""><div><b>${nom}</b><small>${pr}</small></div>${no ? `<span class="cno">${no}</span>` : ""}</div>`;
const cTarj = (img, nom, pr, porq) => `<div class="tj"><div class="fo"><img src="${CI("plato-" + img)}" alt=""></div><div class="ctx"><b>${nom}</b><small>${porq}</small><span class="cpr">${pr}</span></div></div>`;

const torno = () => `<div class="torno"><i class="som"></i><i class="aro360"></i>
  <div class="capa" style="transform:scaleY(.5)"><img src="${CI("torno-plato")}" alt=""></div>
  ${[0, 1, 2, 3].map(k => `<div class="capa k${k}" style="transform:translateY(-${k * 3}px) scaleY(.5)"><div class="gir"><img src="${CI("torno-pez")}" alt=""></div></div>`).join("")}
  <div class="capa k4" style="transform:translateY(-12px) scaleY(.5)"><div class="gir"><img src="${CI("torno-pez")}" alt=""><img src="${CI("torno-adorno")}" alt=""></div></div>
  <div class="brillo"><i></i></div><span class="g360">360°</span><i class="luz"></i></div>`;
const listos = (cl) => `<div class="cs cx ${cl}">${sb()}${cab(true)}<div class="listos"><h4>La mesa está lista</h4><div class="avs">${[["ca", "A"], ["cs", "S"], ["cd", "D"], ["cc", "C"]].map(([c, l]) => `<span><span class="av ${c}">${l}</span><em>${ico.ok}</em></span>`).join("")}</div><div class="barra"></div><p>4 de 4 listos</p><p>Ya avisamos al mesero</p></div></div>`;

const pantallas = () => `
<div class="cs visor"><img src="${CI("visor")}" alt="">${sb(true)}<div class="ret"><i></i><i></i><i></i><i></i></div><div class="det">La Ceiba <em>· abrir la carta</em></div><div class="cam"><i></i></div></div>
<div class="cs cx bien">${sb()}${cab()}
  <div class="hola"><span class="av ca">A</span><h4>Hola de nuevo, Ana</h4></div><p class="bsub">Estás en la mesa 7</p>
  <div class="bperf">${ico.ok}<div><b>Tu perfil y tus restricciones están listos</b><small>sin cacahuate</small></div></div>
  <div class="btn2 v bver">Ver el menú</div></div>
<div class="cs menu">${sb()}<img class="ccap" src="${CAP.menu}" alt=""></div>
<div class="cs cx pHola">${sb()}${cab()}
  <div class="hola"><span class="av ca">A</span><h4>Hola, Ana</h4></div>
  <div class="carga"><span>Afilando los cuchillos…</span><span>Calentando el comal…</span><span>Probando la salsa…</span></div>
  <div class="cchips"><span class="cchip">${ico.ok}Perfil de Ana</span><span class="cchip">${ico.no}sin cacahuate</span></div>
  <div class="tel">${ico.tel}Tus restricciones, guardadas en tu perfil</div>
  <div class="clista">${cRen("aguachile", "Aguachile verde", "$210")}${cRen("enchiladas", "Enchiladas suizas", "$165", "cacahuate")}${cRen("pescado", "Pescado a la talla", "$245")}${cRen("mole", "Mole negro", "$190", "cacahuate")}${cRen("ensalada", "Ensalada de betabel", "$140")}<div class="cfila cagot"><img src="${CI("plato-tacos")}" alt=""><div><b>Tacos de pescado</b><small>$175</small></div><span class="cag">agotado</span></div></div>
  <div class="clisto">${ico.ok}Listo: tu carta</div>
</div>
<div class="cs cx pTop3">${sb()}${cab(true)}
  <div class="sec sx"><h4 class="sx0"><span class="es">✦</span> Para ti</h4><h4 class="sx1">Platos fuertes</h4><h4 class="sx2">Postres</h4><h4 class="sx3">Bebidas</h4></div>
  <div class="porq">${ico.tel}Por los restaurantes que has visitado y tus me gusta</div>
  <div class="tira"><div class="rail">${cTarj("pescado", "Pescado a la talla", "$245", "♥ Le diste me gusta al zarandeado")}${cTarj("aguachile", "Aguachile verde", "$210", "Has visitado 3 marisquerías")}${cTarj("ensalada", "Ensalada de betabel", "$140", "♥ Te gustó una ensalada parecida")}${cTarj("res", "Arrachera", "$230", "Para compartir")}${cTarj("tacos", "Tacos de pescado", "$175", "Del mar")}${cTarj("flan", "Flan de la casa", "$85", "El favorito de la casa")}${cTarj("jamaica", "Agua de jamaica", "$45", "Hecha en casa")}${cTarj("limonada", "Limonada", "$45", "Con hierbabuena")}</div></div>
  <div class="sec"><h4>La carta</h4></div>
  <div class="cats"><span>Para empezar</span><span>Del mar</span><span>Postres</span></div>
  <div class="clista">${cRen("tacos", "Tacos de pescado", "$175")}${cRen("flan", "Flan de la casa", "$85")}</div>
</div>
<div class="cs cx pPlato">${torno()}
  ${sb(true)}<span class="vuelta">← La carta</span>
  <div class="ficha"><h4>Pescado a la talla</h4><div class="cpr">$245</div>
    <div class="cings"><span class="cing">${ico.pez}Huachinango</span><span class="cing">${ico.chile}Guajillo</span><span class="cing">${ico.ajo}Ajo</span><span class="cing">${ico.limon}Limón</span><span class="cing">${ico.cilantro}Cilantro</span></div>
    <div class="reco">${ico.chispa} Recomendado porque te gustaron <b>los tacos de pescado</b> en otros restaurantes.<div class="tel">${ico.tel}Por tu perfil y tus me gusta</div></div>
  </div>
  <div class="agr">Agregar a mi orden · $245</div>
  <div class="caviso"><img src="${CI("plato-pescado")}" alt="">En tu mesa: Pescado a la talla</div>
  <i class="vuela"><img src="${CI("plato-pescado")}" alt=""></i>
  <div class="cabp"><span class="mia">Mi mesa <span class="av ca">A</span><span class="av cs">S</span><span class="av cd">D</span><span class="av cc">C</span><span class="bd">1</span></span></div>
</div>
<div class="cs cx pAviso">${sb()}${cab(true)}
  <div class="avisoT">${ico.chispa}<span>Llegaste hace poco a Carta: aún sé poco de tus gustos.</span></div>
  <div class="sec"><h4>Platos fuertes</h4></div>
  <div class="clista">${cRen("res", "Arrachera", "$230")}${cRen("tacos", "Tacos de pescado", "$175")}${cRen("aguachile", "Aguachile verde", "$210")}</div>
</div>
<div class="cs cx pRes"><div class="hero"><img src="${CI("plato-res")}" alt=""></div>${sb(true)}<span class="vuelta">← La carta</span>
  <div class="ficha"><h4>Arrachera</h4><div class="cpr">$230</div><div class="cings"><span class="cing">Arrachera</span><span class="cing">Cebollitas asadas</span><span class="cing">Guacamole</span><span class="cing">Tortillas de maíz</span></div><div class="reco">A la parrilla, jugosa y al término que pidas. Alcanza para compartir.</div></div>
  <div class="btn2 o">Enviar a Carlos</div><div class="btn2 v">Agregar a mi orden</div>
  <div class="toast">${ico.ok}Se la enviaste a Carlos</div>
</div>
${listos("pListosA")}
<i class="halo"></i><i class="toque"></i>`;

const pantallasB = () => `
<div class="cs cx pCarlos">${sb()}${cab(true)}
  <div class="hola"><span class="av cc">C</span><h4>Hola, Carlos</h4></div>
  <div class="clista">${cRen("tacos", "Tacos de pescado", "$175")}${cRen("aguachile", "Aguachile verde", "$210")}${cRen("flan", "Flan de la casa", "$85")}</div>
  <div class="reco2"><div class="de"><span class="av ca">A</span>Ana te recomienda</div><div class="pl"><img src="${CI("plato-res")}" alt=""><div><b>Arrachera</b><br><small>$230</small></div></div><div class="me">Me encanta</div></div>
  <div class="toast">${ico.ok}Arrachera, en tu orden</div>
  <div class="btn2 v conf">Confirmar mi orden · $230</div>
</div>
${listos("pListosB")}
<i class="halo"></i><i class="toque"></i>`;

/* los cuatro de la mesa en el ciclo: [capas de la mano, inicial, color del avatar, nombre, lo que pidió] (cifras de ejemplo) */
const QUIEN = [["ana", "A", "ca", "Ana", [["Pescado a la talla", 245], ["Flan de la casa", 85]]], ["sofia", "S", "cs", "Sofía", [["Ensalada de betabel", 140], ["Limonada", 40]]],
  ["diego", "D", "cd", "Diego", [["Aguachile verde", 210], ["Cerveza", 60], ["Guacamole de la casa", 145], ["Pastel tres leches", 95]]], ["carlos", "C", "cc", "Carlos", [["Arrachera", 230], ["Flan de la casa", 85]]]];
const QSOFIA = QUIEN[1][4].reduce((a, x) => a + x[1], 0), QPARTE = Math.round(QSOFIA / 3);
const icoGente = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="8" r="3.4"/><circle cx="16.5" cy="9" r="2.8"/><path d="M1.5 19c.6-4 3-6 6.5-6s5.900 2 6.500 6z"/><path d="M15.500 19c-.2-2.200-.9-3.900-2.100-5.100.9-.6 1.900-.900 3.100-.900 2.800 0 4.700 1.700 5.200 6z"/></svg>`;
const icoCub = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v7a2 2 0 0 0 4 0V3M9 3v18M17 3c-2 2-3 5-3 8h3v10"/></svg>`;
const icoSar = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h13v1a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M16 12.500l5.500-2.500"/></svg>`;
const PLATO_DE = ["plato-pescado", "plato-ensalada", "plato-aguachile", "plato-res"];
/* las tres solicitudes de cambio mientras la orden está en cocina: quién (índice de QUIEN), qué dice, las filas del modal, la tarjeta del mesero, qué contesta y si la acepta */
const SOLIC = [
  {k: 2, dice: "Se me antojó un guacamole.", carta: [["Guacamole de la casa", 145], ["Sopa de tortilla", 110], ["Queso fundido", 135], ["Tostadas de atún", 165]], tarjeta: "+1 Guacamole de la casa", mesero: "Sí se puede. Ahorita se lo traigo.", acepta: true},
  {k: 0, dice: "Mejor quiero los camarones.", filas: [["Pescado a la talla", "1", "1 → 0", "menos"], ["Camarones al ajillo", "0", "0 → 1", "mas"]], tarjeta: "−1 Pescado a la talla · +1 Camarones al ajillo", mesero: "Ya no es posible: su pescado ya se está preparando.", acepta: false, responde: "No hay problema, muchas gracias."},
  {k: 3, dice: "Mejor sin el agua de jamaica.", filas: [["Arrachera", "1"], ["Agua de jamaica", "1", "1 → 0", "menos"]], tarjeta: "−1 Agua de jamaica", mesero: "Ése sí: cocina todavía no lo prepara.", acepta: true}];
/* lo que el mesero marca como servido cuando trae la comida */
const SERVIDOS = [["Pescado a la talla", "Ana"], ["Ensalada de betabel", "Sofía"], ["Aguachile verde", "Diego"], ["Guacamole de la casa", "Diego"], ["Arrachera", "Carlos"]];
const pantEspera = (k) => `<div class="cs cx qE">${sb()}<div class="eh">Orden de la mesa</div>
  <div class="eav">${QUIEN.map(u => `<span><span class="av ${u[2]}">${u[1]}</span><i>${ico.ok}</i>${u[3]}</span>`).join("")}</div>
  <div class="ebar"></div><div class="ebt">Los cuatro, listos</div>
  <div class="ecall e1"><span class="eic">${icoCub}</span><div><b>Llamando a tu mesero…</b><small>Confirmará la orden de la mesa y la enviará a cocina.</small></div></div>
  <div class="ecall e2"><span class="eic">${icoCub}</span><div><b>¡Tu mesero va en camino!</b><small>Confirmará la orden completa y la enviará a cocina.</small></div></div>
  <div class="eord"><h5>Tu orden</h5><div class="edsh"><img src="${CI(PLATO_DE[k])}" alt="">${QUIEN[k][4][0][0]}</div></div></div>`;
const pantLista = (k) => `<div class="cs cx qL">${sb()}${cab(true)}<div class="eord"><h5>Tu orden</h5><div class="edsh"><img src="${CI(PLATO_DE[k])}" alt="">${QUIEN[k][4][0][0]}</div></div><div class="lst">${ico.ok}Lista</div><div class="lesp">Esperando a la mesa…</div></div>`;
const pantCocina = (sol) => `<div class="cs cx qK sgx">${sb()}<div class="sgc"><i>Carta</i><span>Mesa 7</span></div>
  <div class="sgp"><span><u>${ico.ok}</u>Orden enviada</span><em></em><span class="act"><u>${icoSar}</u>En cocina</span><em class="no"></em><span class="no"><u>${icoCub}</u>Servida</span></div>
  <div class="sgm"><span class="sgk">${icoSar}<i></i><i></i><i></i></span><b>Tu comida se<br>está preparando</b><div class="kbar"><u></u></div></div>
  <div class="sgb"><div class="sb1">Llamar al mesero</div>${sol && sol.carta ? `<div class="sb1">Agregar otro platillo o postre</div>` : ""}</div>
  ${sol && sol.carta ? `<div class="qcar"><h5>La carta</h5><small>Para empezar</small>${sol.carta.map(([n, pr], j) => `<div class="mfi${j ? "" : " gua"}"><b>${n}</b><i>$${pr}</i></div>`).join("")}<div class="qadd">En tu orden · <b>${sol.tarjeta}</b></div><div class="mcf">Confirmar con el mesero</div></div>` : ""}
  ${sol && sol.filas ? `<div class="mvel"></div><div class="msh m1"><h5>¿Qué deseas hacer?</h5><div class="mop"><b>Modificar orden</b><small>Añadir, eliminar o ajustar cantidades</small></div></div>
  <div class="msh m2"><h5>Modificar orden</h5><small>Ajusta cantidades — en cero se elimina</small>${sol.filas.map(([n, c0, c1, cl], j) => `<div class="mfi mq${j} ${cl || ""}"><div><b>${n}</b>${cl === "menos" ? `<small class="mel">Se eliminará de tu orden</small>` : ""}</div><span class="mqt"><u>−</u><i class="q0">${c0}</i>${c1 ? `<i class="q1">${c1}</i>` : ""}<u>+</u></span></div>`).join("")}<div class="mcf">Confirmar con el mesero</div></div>` : ""}
  ${sol ? `<div class="mto t1">Solicitud enviada a tu mesero</div><div class="mto t2">${icoCub}Tu mesero va en camino</div>` : ""}</div>`;
/* el seguimiento de la orden, como en el prototipo (P04b, estado «servida») */
const pantSeg = () => `<div class="cs cx qS sgx">${sb()}<div class="sgc"><i>Carta</i><span>Mesa 7</span></div>
  <div class="sgp"><span><u>${ico.ok}</u>Orden enviada</span><em></em><span><u>${ico.ok}</u>En cocina</span><em></em><span class="act"><u>${icoCub}</u>Servida</span></div>
  <div class="sgm"><span class="sgi">${icoCub}</span><b>Comida entregada</b><em>¡Disfruta tu comida!</em></div>
  <div class="sgt">✓ Flan de la casa, pedido</div>
  <div class="sgb"><div class="sb1">Llamar al mesero</div><div class="sb1">Agregar otro platillo o postre</div><div class="sb2">Cerrar mi cuenta</div></div>
  <div class="sgw"><span><i></i>Tu cuenta está cerrada · esperando a los demás…</span><div class="sb1">Volver a abrir cuenta</div></div></div>`;
/* la cuenta de cada quien: su propina, y su total cuando lo de Sofía se reparte entre 1, entre 2 y entre 3 */
const ENTRA = [1, 0, 2, 3], PROP = [10, 10, 20, 15];
const DICE = ["Sofi, nosotros te invitamos, es tu cumpleaños.", "¡Ay, muchas gracias, amigos!", "Sí, nosotros te invitamos.", "Sí, nosotros te invitamos."];
const pesoF = n => "$" + (Number.isInteger(n) ? n : n.toFixed(2));
const consumoQ = k => QUIEN[k][4].reduce((a, x) => a + x[1], 0);
const totalDe = (k, n) => { const base = k === 1 ? (n ? 0 : consumoQ(k)) : consumoQ(k) + (n >= ENTRA[k] ? QSOFIA / n : 0); return base + Math.round(base * PROP[k] / 100); };
const totalCelda = (k) => {
  const pasos = k === 1 ? [0, 1] : [0, 1, 2, 3].filter(n => n === 0 || n >= ENTRA[k]);
  return `<div class="ctt"><div class="cnm"><span class="foto"><img src="${CI(QUIEN[k][0] + "-cabeza")}" alt=""></span>${QUIEN[k][3]}</div><span class="vv vt">${pasos.map(n => `<i class="w${n}">${pesoF(totalDe(k, n))}</i>`).join("")}</span>
    <div class="crow"><span>${k === 1 ? "Consumo" : "Parte de Sofía"}</span>${k === 1 ? `<b>${pesoF(consumoQ(k))}</b>` : `<span class="vv vp">${pasos.map(n => `<i class="w${n}">${n ? pesoF(QSOFIA / n) : "$0"}</i>`).join("")}</span>`}</div>
    <div class="crow"><span>Propina</span><b>${PROP[k]} %</b></div></div>`;
};
/* el reparto como tuberías: de Sofía al centro y del centro al total de cada quien (coordenadas del cuadro) */
const TUBO = {s: [[978, 266], [708, 266], [708, 548]], 0: [[708, 548], [708, 266], [548, 266]], 2: [[708, 548], [708, 694], [548, 694]], 3: [[708, 548], [708, 694], [966, 694]]};
const tuboD = k => "M" + TUBO[k].map(p => p.join(" ")).join(" L");
const ACCIONES = [["Ana", "d", "Cerrar mi cuenta", "✓ Tu cuenta está cerrada"], ["Diego", "s", "Agregar otro platillo o postre", ""], ["Carlos", "s", "Agregar otro platillo o postre", "✓ Flan de la casa, pedido"],
  ["Diego", "s", "Agregar otro platillo o postre", "✓ Pastel de tres leches, pedido"], ["Sofía y Diego", "d", "Cerrar mi cuenta", "✓ Sus cuentas están cerradas"], ["Carlos", "d", "Cerrar mi cuenta", "✓ Tu cuenta está cerrada"],
  ["Ana", "d", "Solicitar factura", "✓ Solicitud enviada a La Ceiba. La factura la emite el restaurante."]];
/* el teléfono de Diego al pagar por transferencia (visión): elige el método y Carta le pone los datos del restaurante. Datos de ejemplo. */
const pantallasT = () => { const tot = pesoF(totalDe(2, 3)); return `
<div class="cs cx tM">${cab(true)}<div class="qhero"><b>Pagar mi cuenta</b><small>Diego · Mesa 7</small></div>
  <div class="ktot"><b>Total</b><i>${tot}</i></div><h5 class="tsec">¿Cómo quieres pagar?</h5>
  <div class="topc"><b>Terminal</b><small>El mesero la trae a la mesa</small></div><div class="topc ttr"><b>Transferencia</b><small>Te mostramos los datos de La Ceiba</small></div><div class="topc"><b>Efectivo</b><small>Le pagas al mesero</small></div>
  <div class="tel">${ico.tel}Carta no cobra: le pagas al restaurante</div>${sb()}</div>
<div class="cs cx tD">${cab(true)}<div class="qhero"><b>Transferencia</b><small>Datos de La Ceiba</small></div>
  <div class="tdat"><span>Beneficiario<i>La Ceiba</i></span><span>Banco<i>Banco de ejemplo</i></span><span>CLABE<i>0000 0000 1234 5678 90</i></span><span>Monto<i>${tot}</i></span><span>Concepto<i>Mesa 7 · Diego</i></span></div>
  <div class="tcp"><i class="c0">Copiar CLABE</i><i class="c1">${ico.ok}CLABE copiada</i></div>
  <div class="tel">${ico.tel}Datos de ejemplo. El mesero valida tu pago.</div><div class="btn2 v tya">Ya transferí</div><div class="mto tav">${icoCub}Avisamos a Javier: él valida tu pago</div>${sb()}</div>
<i class="halo"></i><i class="toque"></i>`; };
const pantallasQ = (k) => {
  const [, , av, nom, pl] = QUIEN[k], sub = pl.reduce((a, x) => a + x[1], 0), esS = k === 1;
  const filas = (like) => pl.map(([n, pr]) => `<span>${n}<i>$${pr}</i>${like ? `<em class="qlike">♥<u class="qlk">♥</u></em>` : ""}</span>`).join("");
  const t0 = pesoF(totalDe(k, 0)).slice(1), t1 = pesoF(totalDe(k, 3)).slice(1);
  return `
${pantLista(k)}${pantEspera(k)}${pantCocina(null)}${pantSeg()}
<div class="cs qC"><div class="qin">${cab(true)}<div class="qhero"><b>Mi cuenta</b><small>${nom} · Mesa 7</small></div>
  <div class="kcta">${filas(true)}</div>
  <div class="kprop"><b>Propina</b>${[10, 15, 20].map(x => `<span class="cpc${x === PROP[k] ? " on" : ""}">${x} %</span>`).join("")}</div>
  ${esS ? `<div class="kinv qinvS"><span class="av cs">S</span><div><b>Hoy te invitan</b><small>Ana, Diego y Carlos</small></div></div>`
    : `<div class="kinv"><span class="av cs">S</span><div><b>Invitar a Sofía</b></div><span class="qseg"><u class="qsel"></u><i>100 %</i><i class="qp">${icoGente}</i><i>%</i></span></div><div class="kcta"><span class="cinv">Tu parte de lo de Sofía<i class="cpar">${[1, 2, 3].map(n => `<u class="w${n}">${pesoF(QSOFIA / n)}</u>`).join("")}</i></span></div>`}
  <div class="ktot"><b>Total</b><i class="cv0">$${t0}</i>${esS ? `<i class="cv1">$${t1}</i>` : [1, 2, 3].map(n => `<i class="cv1 w${n}">${pesoF(totalDe(k, n))}</i>`).join("")}</div>
  <div class="tel">${ico.tel}El pago se hace con el mesero</div></div><div class="btn2 v qll">Llamar al mesero</div>${sb()}</div>
<i class="halo"></i><i class="toque"></i>`;
};

/* el teléfono del mesero en primer plano (acto 4): el aviso con la pantalla bloqueada y la comanda */
const pantallasM = () => `
<div class="cs bloq">${sb(true)}<div class="hr">9:41</div><div class="fe">jueves</div>
  <div class="noti"><div class="ap"><i>C</i>Carta · ahora</div><b>Mesa 7: Pedidos listos</b><div class="ya">Ya voy</div></div>
</div>
<div class="cs cx pOrden">${sb()}<div class="cab"><span class="lg">L</span>La Ceiba<span class="pjav"><span class="foto"><img src="${CI("mesero-cabeza")}" alt=""></span>Javier</span></div>
  <div class="mesa7"><h4>Mesa 7</h4><span>Lista para ordenar</span></div>
  <div class="ped"><img src="${CI("plato-pescado")}" alt=""><div><b>Ana</b><span>Pescado a la talla</span></div></div>
  <div class="ped"><img src="${CI("plato-ensalada")}" alt=""><div><b>Sofía</b><span>Ensalada de betabel</span></div></div>
  <div class="ped"><img src="${CI("plato-aguachile")}" alt=""><div><b>Diego</b><span>Aguachile verde</span></div></div>
  <div class="ped"><img src="${CI("plato-res")}" alt=""><div><b>Carlos</b><span>Arrachera</span></div></div>
  <div class="btn2 v">Atender comanda</div>
</div>
<i class="halo"></i><i class="toque"></i>`;

/* el teléfono del mesero en el recuadro del acto 5: Mesa 7 y su pista de cuatro estados; el estado activo cambia cuando él toca */
/* el orden en que las cuentas quedan saldadas: Sofía va invitada ($0), Ana paga en la terminal, Diego por transferencia y Carlos en efectivo */
const PAGAN = [1, 0, 2, 3];
const FASES = [["Cuenta abierta"], ["Cuenta cerrada"], ["Pagada"], ["Mesa limpia"]];
const pantallasP = () => `
<div class="cs cx pMesa">${sb()}<div class="cab"><span class="lg">L</span>La Ceiba<span class="pjav"><span class="foto"><img src="${CI("mesero-cabeza")}" alt=""></span>Javier</span></div>
  <div class="mesaP"><h4>Mesa 7</h4><span class="mst"><i class="m0">Abierta</i><i class="m1">Cuenta cerrada</i><i class="m2">Pagada</i><i class="m3">Libre</i></span></div>
  <div class="pista">${FASES.map(([n], k) => `<div class="ps ps${k}"><i class="pbg"></i><span class="pc"><i class="pca"></i><i class="pok">${ico.ok}</i></span><span class="pt"><b>${n}</b></span></div>`).join("")}</div>
  <div class="pnota"><span class="n0">4 comensales</span><span class="n1">Las cuatro cuentas, cerradas</span><span class="n2">Falta limpiar la mesa</span><span class="n3">Lista para otros comensales</span></div>
  <i class="pgran">${ico.ok}</i><div class="pvelo"></div>${SOLIC.map((x, i) => `<div class="psol so${i}"><b>Solicitud de cambio</b><span>${x.tarjeta}</span><div><i class="pr">Rechazar</i><i class="pa">Aceptar</i></div><em class="${x.acepta ? "si" : "no"}">${x.acepta ? "✓ Aceptada" : "✕ Rechazada"}</em></div>`).join("")}
  <div class="pserv"><h5>Mesa 7 · Comanda</h5><small><i class="v0">0 de ${SERVIDOS.length} servidos</i><i class="v1">${SERVIDOS.length} de ${SERVIDOS.length} servidos</i></small>${SERVIDOS.map(([n, q]) => `<div class="pvr"><u>${ico.ok}</u>${n}<span>${q}</span></div>`).join("")}<div class="pvb"><i class="v0">Todo servido</i><i class="v1">✓ Platos servidos</i></div></div>
  <div class="pcc"><span>Cuentas cerradas</span>${[0, 1, 2, 3].map(n => `<i><u class="pd${n}"></u></i>`).join("")}</div>
  <div class="ppg"><div class="pn">${[1, 2, 3, 4].map(n => `<i class="w${n}">${n} de 4 comensales pagaron</i>`).join("")}<span class="pm">${[1, 2, 3, 4].map(n => `<i class="w${n}">${pesoF(PAGAN.slice(0, n).reduce((a, k) => a + totalDe(k, 3), 0))} de ${pesoF(PAGAN.reduce((a, k) => a + totalDe(k, 3), 0))}</i>`).join("")}</span></div>
    <div class="pbar"><u></u></div><div class="pinv">Sofía: invitada</div><div class="pve pv0">Validar transferencia · ${pesoF(totalDe(2, 3))}</div><div class="pve pv1">Validar efectivo · ${pesoF(totalDe(3, 3))}</div></div>
  <div class="pbt b0">Cerrar cuenta</div><div class="pbt b1">Validar pago</div><div class="pbt b2">Marcar mesa limpia</div><div class="pbt b3">${ico.ok}Mesa libre</div>
</div>
<i class="halo"></i><i class="toque"></i>`;

/* El resaltado antes de un toque: busca lo que hay bajo el punto (x, y) de la pantalla del teléfono A y copia su caja y su radio.
   Las medidas son las de la maqueta (sin la escala ni el giro del teléfono), más lo que GSAP haya desplazado a sus contenedores. */
const TOQUES = [], HALO_AIRE = 3, HALO_ENTERO = ".tj, .cfila, .qlike, .kinv, .topc", HALO_FIJA = {};
function haloCaja(pan, el) {
  let x = 0, y = 0;
  for (let n = el; n && n !== pan; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  for (let n = el; n && n !== pan; n = n.parentElement) { x += +gsap.getProperty(n, "x") || 0; y += +gsap.getProperty(n, "y") || 0; }
  const c = getComputedStyle(el), r = Math.min(parseFloat(c.borderTopLeftRadius) || 0, el.offsetWidth / 2, el.offsetHeight / 2);
  return {x, y, w: el.offsetWidth, h: el.offsetHeight, r};
}
function haloPon(A, x, y) {
  const ag = document.querySelector("#cine " + A); if (!ag) return;
  const pan = ag.querySelector(".pan"), h = ag.querySelector(".halo"); if (!pan || !h) return;
  /* el punto de la maqueta llevado a la ventana: el propio resaltado, sin tamaño, puesto en (x, y) */
  h.style.left = x + "px"; h.style.top = y + "px"; h.style.width = "0px"; h.style.height = "0px";
  const rh = h.getBoundingClientRect(), px = rh.left, py = rh.top;
  const pila = document.elementsFromPoint(px, py).filter(e => pan.contains(e) && e !== pan && e.parentElement !== pan && !e.classList.contains("toque") && !e.classList.contains("halo"));
  const pinta = e => { const c = getComputedStyle(e); return (c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent") || c.backgroundImage !== "none" || parseFloat(c.borderTopLeftRadius) > 0 || c.boxShadow !== "none"; };
  let el = pila[0]; if (!el) return;
  const fija = HALO_FIJA[A + "|" + x + "|" + y]; /* lo que se toca dentro de una captura (una imagen) no tiene elemento propio: su caja se declara */
  const cerca = el.closest(HALO_ENTERO);
  if (cerca && pan.contains(cerca) && cerca !== pan) el = cerca;
  else { while (!pinta(el) && el.parentElement && el.parentElement.parentElement !== pan && pan.contains(el.parentElement)) el = el.parentElement;
    if (el.offsetWidth * el.offsetHeight > 0.45 * pan.offsetWidth * pan.offsetHeight) el = pila[0]; }
  if (fija) { const [fx, fy, fw, fh, fr] = fija; h.style.left = (fx - HALO_AIRE) + "px"; h.style.top = (fy - HALO_AIRE) + "px"; h.style.width = (fw + 2 * HALO_AIRE) + "px"; h.style.height = (fh + 2 * HALO_AIRE) + "px"; h.style.borderRadius = (fr + HALO_AIRE) + "px"; h.__obj = el; h.__fija = fija; return; }
  h.__fija = null;
  const b = haloCaja(pan, el);
  h.style.left = (b.x - HALO_AIRE) + "px"; h.style.top = (b.y - HALO_AIRE) + "px"; h.style.width = (b.w + 2 * HALO_AIRE) + "px"; h.style.height = (b.h + 2 * HALO_AIRE) + "px"; h.style.borderRadius = (b.r ? b.r + HALO_AIRE : 0) + "px";
  h.__obj = el;
}
/* una capa de apoyo/cine en su caja; orig = punto de giro en coordenadas del cuadro */
const K = (n, cl = "") => { const c = CAPAS[n]; return `<img class="k k-${n}${cl ? " " + cl : ""}" src="${c[0]}" alt="" style="left:${c[1]}px;top:${c[2]}px;width:${c[3]}px;height:${c[4]}px">`; };
const orig = (n, x, y) => `${x - CAPAS[n][1]}px ${y - CAPAS[n][2]}px`;
const BRAZOS = {ana: ["brazo", "brazo-cel", "brazo-copa", "brazo-carta"], carlos: ["brazo", "brazo-cel", "brazo-copa", "brazo-carta"], sofia: ["brazos", "brazos-cel", "brazos-carta"], diego: ["brazos", "brazos-cel", "brazos-carta"],
  mesero: ["brazos", "brazos-carta", "brazos-cel", "brazos-terminal", "brazos-trapo", "brazos-libreta", "brazos-tableta", "brazos-cuenta", "brazos-platos"]};
/* un teléfono en su mano: dorso, marco con sus pantallas, pulgar y yemas, y el índice de la otra mano */
const agarre = (cl, quien, pant, nom = "") => `<div class="agarre ${cl}">${K(quien + "-mano-atras")}<div class="cel"><div class="pan">${pant}</div></div>${K(quien + "-mano-frente")}${K(quien + "-dedo", "dedo")}${nom ? `<span class="nom">${nom}</span>` : ""}</div>`;

function cineHtml() {
  const bz = q => BRAZOS[q].map(v => K(`${q}-${v}`, "bz")).join("");
  const sala = `<div class="sala"><div class="pfon">${K("fondo")}</div><div class="pfig">` +
    K("ana-silla") + K("carlos-silla") + `<i class="silu"></i>` +
    `<div class="gp gm">${K("mesero-cabeza")}${K("mesero-cuerpo")}</div><div class="gp gS">${K("sofia-cabeza")}${K("sofia-cuerpo")}</div><div class="gp gD">${K("diego-cabeza")}${K("diego-cuerpo")}</div>` +
    `<div class="gp gA">${K("ana-cabeza")}${K("ana-cuerpo")}</div><div class="gp gC">${K("carlos-cabeza")}${K("carlos-cuerpo")}</div>` + K("mesa") +
    `<div class="gp gS">${bz("sofia")}<span class="nmb" style="left:800px;top:828px">Sofía</span></div><div class="gp gD">${bz("diego")}<span class="nmb" style="left:1080px;top:828px">Diego</span></div>` +
    ["montaje", "ticket", "pastel", "sucia-migas", "sucia-a", "sucia-c", "sucia-vaso", "platillo-a", "platillo-c", "copa-a", "copa-c", "qr-brillo", "acrilico", "vela", "llama"].map(n => K(n)).join("") +
    `<div class="gp gm">${bz("mesero")}<span class="buzz"><i></i><i></i></span>${K("mesero-brazo-pluma", "bz")}<span class="nmb" style="left:1250px;top:522px">Javier</span></div><div class="gp gA">${bz("ana")}<span class="nmb" style="left:462px;top:890px">Ana</span></div><div class="gp gC">${bz("carlos")}<span class="nmb" style="left:1460px;top:890px">Carlos</span></div><i class="bill"></i>` +
    K("resplandor") + K("nuevos") + `</div></div>`;
  const cerca = `<div class="cerca"><div class="cfon">${K("cerca-fondo")}</div>${agarre("agA", "ana", pantallas() + pantEspera(0), "Ana")}${agarre("agC", "carlos", pantallasB() + pantEspera(3), "Carlos")}${agarre("agM", "mesero", pantallasM())}${SOLIC.map((x, i) => agarre("agY" + i, QUIEN[x.k][0], pantCocina(x) + `<i class="halo"></i><i class="toque"></i>`, QUIEN[x.k][3])).join("")}${agarre("agZ3", "sofia", pantSeg() + `<i class="halo"></i><i class="toque"></i>`, "Sofía")}${agarre("agZ4", "diego", pantSeg() + `<i class="halo"></i><i class="toque"></i>`, "Diego")}${agarre("agZ", "ana", pantSeg() + `<i class="halo"></i><i class="toque"></i>`, "Ana")}${agarre("agZ2", "carlos", pantSeg() + `<i class="halo"></i><i class="toque"></i>`, "Carlos")}${agarre("agT", "diego", pantallasT(), "Diego")}<svg class="repa" viewBox="0 0 1920 1080"><path class="rps" d="${tuboD("s")}"/><path class="rp1" d="${tuboD(0)}"/><path class="rp2" d="${tuboD(2)}"/><path class="rp3" d="${tuboD(3)}"/></svg>${QUIEN.map((u, k) => `<div class="celda cq${k}">${agarre("agQ agQ" + k, u[0], pantallasQ(k), u[3])}${totalCelda(k)}<div class="gq gq${k}">${DICE[k]}</div>${k === 1 ? `<div class="gqf">🥳</div>` : ""}</div>`).join("")}<i class="dvc dvv"></i><i class="dvc dvh"></i><div class="cnt4"><span>${icoGente}</span><b class="vv"><i class="w1">entre 1</i><i class="w2">entre 2</i><i class="w3">entre 3</i></b><small class="vv vm"><i class="w1">$180</i><i class="w2">$90 + $90</i><i class="w3">$60 + $60 + $60</i></small></div>${["s", 0, 2, 3].map(k => `<span class="vj vj${k}">${k === "s" ? "$180" : [1, 2, 3].filter(n => n >= ENTRA[k]).map(n => `<i class="w${n}">${pesoF(QSOFIA / n)}</i>`).join("")}</span>`).join("")}</div>`;
  const pip = `<div class="pip"><b class="pipt">Tablero del mesero</b><div class="reloj"><span class="x4 hd"></span><span class="esfera"><i class="hh"></i><i class="mm"></i></span></div>${agarre("agP", "mesero", pantallasP())}</div>`;
  const rot = TOMAS.map((t, i) => t[4].length ? `<div class="r ${t[5]} r${i}">${t[4].map(l => l[0] === "~" ? `<span class="cln ck">${palabras(l.slice(1))}</span>` : `<span class="cln">${palabras(l)}</span>`).join("")}</div>` : "").join("");
  /* un globo junto a la boca (x, y en el cuadro): lado "i" = el texto queda a la derecha de quien habla; "d" = a su izquierda;
     "a", "b" y "c" = encima de su cabeza, centrado, corrido a la izquierda o corrido a la derecha */
  const globo = (k, lado, x, y, tx, ancho = 0) => `<div class="globo gl-${lado} g${k}" style="${lado === "i" ? `left:${x + 30}px` : lado === "d" ? `right:${1920 - x + 30}px` : `left:${x}px`};top:${y}px;${ancho ? `max-width:${ancho}px;` : ""}transform-origin:${lado === "i" ? "0 50%" : lado === "d" ? "100% 50%" : lado === "a" ? "50% 100%" : lado === "b" ? "84% 100%" : "16% 100%"}">${tx}</div>`;
  const PDF = [["Para empezar", [["Guacamole de la casa", 145], ["Aguachile verde", 210], ["Tostadas de atún", 165], ["Sopa de tortilla", 110], ["Ensalada de betabel", 140], ["Queso fundido", 135]]],
    ["Platos fuertes", [["Pescado a la talla", 245], ["Mole negro", 190], ["Arrachera", 230], ["Enchiladas suizas", 165], ["Tacos de pescado", 175], ["Parrillada para compartir", 520], ["Pollo en pipián", 185], ["Camarones al ajillo", 260]]],
    ["Postres y bebidas", [["Flan de la casa", 85], ["Pastel de tres leches", 95], ["Agua de jamaica", 45], ["Limonada", 45], ["Café de olla", 40], ["Cerveza", 60]]]];
  const TICKET = [["2 Limonada", 90], ["1 Agua de jamaica", 45], ["1 Cerveza", 60], ["1 Guacamole", 145], ["1 Aguachile verde", 210], ["1 Pescado a la talla", 245], ["1 Ensalada betabel", 140], ["1 Arrachera", 230], ["1 Parrillada comp.", 520], ["1 Enchiladas suizas", 165], ["2 Flan de la casa", 170], ["1 Tres leches", 95], ["2 Café de olla", 80]];
  const lupas = `<div class="lupa lu1"><div class="lpdf"><h5>La Ceiba</h5>${PDF.map(([sc, pl]) => `<h6>${sc}</h6><div class="lcol">${pl.map(([nm, pr]) => `<p>${nm}<i>$${pr}</i></p>`).join("")}</div>`).join("")}</div></div>` +
    `<div class="lupa lu2"><div class="ltab"><b>Mesa 7</b><u style="width:70%"></u><u style="width:48%"></u><i class="ctab"></i><span>Cargando la orden…</span><em class="lok">✓ Orden enviada</em></div></div>` +
    `<div class="lupa lu3"><div class="ltk"><b>MESA 7</b>${TICKET.map(([nm, pr]) => `<p>${nm}<span>$${pr}</span></p>`).join("")}<p class="lt">TOTAL<span>$${TICKET.reduce((a, x) => a + x[1], 0)}</span></p></div></div>` +
    `<div class="lupa lu6">${ACCIONES.map(([q, c, b, r], i) => `<div class="lq q${i}"><small>${q}</small><span class="lb ${c}">${b}</span><em>${r}</em></div>`).join("")}</div>` +
    `<div class="mnrow">${QUIEN.map((u, k) => `<span class="mnph mn${k}"><span class="mnk">${icoSar}</span><span class="mns">${icoCub}</span><span class="mnc">${ico.ok}</span><b class="mnk">Se está preparando</b><b class="mns">Comida entregada</b><b class="mnc">Cuenta cerrada</b><small>${u[3]}</small></span>`).join("")}</div>${[1, 2, 3].map(k => `<i class="dvq" style="left:${50 + k * 378}px"></i>`).join("")}${QUIEN.map((u, k) => `<span class="nq" style="left:${64 + k * 378}px"><span class="foto"><img src="${CI(u[0] + "-cabeza")}" alt=""></span>${u[3]}</span>`).join("")}<i class="divi"></i><div class="hora"><span class="esfera"><i class="hh"></i><i class="mm"></i></span><b class="hd"></b></div>` +
    `<i class="lmarca lm1" style="left:1338px;top:640px"></i><i class="lmarca lm2" style="left:1244px;top:556px"></i><i class="lmarca lm3" style="left:1140px;top:782px"></i>`;
  const sobre = lupas + `<span class="estado lista eA" style="left:372px;top:340px">✓ Lista</span><span class="estado lista eS" style="left:726px;top:300px">✓ Lista</span><span class="estado elige eD" style="left:1000px;top:300px">Eligiendo…</span><span class="estado elige eC" style="left:1340px;top:340px">Eligiendo…</span>` +
    `<span class="estado vino eCom" style="left:112px;top:300px">✓ Comanda atendida</span><span class="estado vino ePago" style="left:112px;top:262px">✓ Pago validado</span><span class="estado lista eLibre" style="left:112px;top:262px">✓ Mesa 7, libre</span>`;
  return `<div id="cine" aria-hidden="true"><div class="cf"><i class="l1"></i><i class="l2"></i></div>
${sala}${cerca}${pip}${sobre}
<div class="grano"></div><div class="vin"></div><div class="franja fa"></div><div class="franja fb"></div>
${globo(1, "i", 1352, 278, "Buenas noches. Aquí está la carta.")}
${globo(10, "i", 506, 548, "¿Pedimos algo para compartir?", 240)}${globo(11, "b", 1080, 360, "¿La parrillada alcanza para cuatro?")}${globo(12, "d", 1414, 548, "Es el mismo menú, pero en PDF.", 230)}${globo(13, "a", 800, 360, "¿Y eso qué trae?")}
${globo(14, "c", 470, 412, "Los tacos de pescado, por favor.", 400)}${globo(15, "d", 1202, 278, "Se nos terminaron. Una disculpa.")}${globo(16, "c", 470, 412, "¿Y el mole?")}${globo(17, "d", 1202, 278, "¿Es alérgica a algo? Lleva cacahuate.")}
${globo(18, "c", 470, 412, "Sí… ¿y las enchiladas?", 400)}${globo(26, "c", 470, 412, "Espere… ¿llevan cacahuate?", 400)}${globo(27, "d", 1202, 278, "Déjeme pregunto en cocina.")}
${globo(19, "d", 1202, 278, "¿Eran dos aguachiles… o tres?")}${globo(20, "c", 1440, 412, "El mío sin cebolla.")}${globo(21, "i", 506, 548, "Yo cambié de opinión.", 240)}${globo(28, "d", 1202, 278, "Un momento… está cargando.")}${globo(31, "d", 1202, 278, "Muchas gracias por venir.") + globo(36, "d", 1202, 278, "Sí llevan cacahuate.") + globo(37, "d", 1414, 548, "Ya tardó, ¿no?", 240) + globo(38, "b", 1080, 360, "Yo ya tengo hambre.") + globo(39, "c", 470, 412, "¿Nos trae la cuenta, por favor?", 400) + globo(40, "d", 1202, 278, "Aquí usamos Carta: con el QR ven el menú y piden desde su teléfono.", 430) + globo(75, "c", 470, 412, "¡Espléndido! Yo ya tengo mi perfil hecho y todo.", 400)}
${globo(22, "b", 1080, 360, "¿Quién pidió las limonadas?")}${globo(23, "i", 506, 548, "A Sofi la invitamos: ¿entre tres?", 240)}${globo(24, "d", 1414, 548, "¿Y la propina?", 240)}
${globo(3, "i", 506, 548, "Ya pedí. ¿Tú qué vas a pedir?", 240)}${globo(4, "d", 1414, 548, "Estoy viendo, todavía no sé.", 240)}
${globo(5, "i", 1298, 278, "Para Ana, pescado a la talla.")}${globo(29, "i", 1298, 278, "Para Sofía, ensalada. Para Diego, aguachile.")}${globo(30, "i", 1298, 278, "Y para Carlos, arrachera.")}${globo(6, "i", 506, 548, "Sí, todo bien.", 240)}
${globo(25, "d", 1077, 390, "Con la terminal, cuando gusten.", 380)}${globo(7, "d", 1077, 390, "Todo pagado. ¡Muchas gracias!", 380)}
${SOLIC.map((x, i) => globo(60 + i, ["b", "c", "b"][i], [929, 404, 1250][i], [462, 500, 500][i], x.dice, 330) + globo(63 + i, "d", 1077, 390, x.mesero, 380)).join("") + globo(66, "c", 404, 500, SOLIC[1].responde, 330) + globo(70, "d", 1077, 390, "Provecho.") + globo(46, "c", 404, 500, "Yo ya quedé. Me gustó mucho.", 330) + globo(47, "b", 929, 462, "Deja veo si pido un postre.", 330) + globo(48, "b", 1250, 500, "Yo sí quiero un flan.") + globo(49, "b", 929, 462, "Y un pastel para la cumpleañera.", 330) + globo(50, "a", 688, 318, "¡Ay, amigos… muchas gracias!", 330) + globo(76, "c", 390, 500, "¡Feliz cumpleaños, Sofi!", 280) + globo(77, "b", 1262, 500, "¡Felicidades, Sofi! ¡Eeeh!", 270) + globo(78, "b", 929, 440, "¡Feliz cumpleaños a ti…!", 250) + globo(79, "b", 929, 462, "Yo, por transferencia.") + globo(80, "b", 1250, 500, "Yo pago en efectivo.") + globo(81, "d", 1077, 390, "Está completo. Validado.", 380) + globo(51, "c", 404, 500, "¿Facturan?") + globo(52, "d", 1077, 390, "Sí, se pide desde la aplicación.", 380) + globo(53, "c", 404, 500, "¡Gracias, buenas noches!") + globo(32, "b", 1250, 500, "¿Ya nadie va a pedir nada más?", 330)}${globo(33, "c", 404, 500, "No, todo bien.")}
${globo(71, "c", 404, 500, "¡No te creo!") + globo(72, "b", 1250, 500, "Ahí va otra vez con Cancún.", 330) + globo(73, "a", 688, 462, "¡Ay, Diego!") + globo(74, "b", 929, 462, "¡Ja, ja!") + globo(41, "a", 688, 462, "¿Han visto a Luis?") + globo(42, "b", 929, 462, "Fuimos a Cancún, estuvo muy bonito.", 330) + globo(43, "c", 404, 500, "¡Ja, ja, ja!") + globo(44, "b", 1250, 500, "¡Ja, ja!") + globo(45, "a", 688, 462, "¡Qué rico estuvo!") + globo(8, "c", 404, 500, "Prueba el pescado, está increíble.", 330)}${globo(9, "b", 1250, 500, "Y la arrachera. Hay que volver.", 330)}

${rot}
<div class="marca"><b>Carta</b><i></i><span>Tu menú, Tu Carta.</span></div></div>`;
}

function filmEscala() {
  const el = $("#intro"), f = $("#cine"); if (!f) return;
  const s = Math.min(el.clientWidth / 1920, el.clientHeight / 1080);
  f.style.transform = `translate(${(el.clientWidth - 1920 * s) / 2}px,${(el.clientHeight - 1080 * s) / 2}px) scale(${s})`;
}

/* posiciones de cada teléfono (su esquina superior izquierda en el cuadro de 1920×1080; el cuadro útil va de y=100 a y=980) */
const PA = {x: 1050, y: 128, rotation: -2.5, scale: 0.9}, PB = {x: 1030, y: 122, rotation: -1, scale: 0.92}, PC = {x: 1090, y: 132, rotation: 1.5, scale: 0.9};
const PF = {x: 300, y: 250, rotation: -1.5, scale: 0.8}, P2F = {x: 1262, y: 250, rotation: 1.5, scale: 0.8}, PM = {x: 1050, y: 128, rotation: -1.5, scale: 0.9}, PP = {x: 104, y: 62, rotation: 0, scale: 0.76};
/* donde espera el índice que toca (fuera del cuadro) y la cámara de la sala (escala y desplazamiento de las figuras; fs, fx, fy: el fondo) */
const REP = {x: 600, y: 1090}, REPC = {x: -200, y: 1090};
const C1 = {s: 1, x: 0, y: 0}, CA5 = {s: 0.86, x: 0, y: 151}, CSUC = {s: 1.25, x: -500, y: -340, fs: 1.14, fy: -30}, CBAR = {s: 1.5, x: -545, y: -170, fs: 1.3, fx: -250, fy: -40};
/* puntos de giro: el cuello y el codo de cada quien */
const GIRO = {"ana-cabeza": [456, 596], "carlos-cabeza": [1464, 596], "mesero-cabeza": [1250, 330], "sofia-cabeza": [800, 566], "diego-cabeza": [1080, 566], "ana-brazo": [470, 752], "ana-brazo-cel": [470, 752], "ana-brazo-copa": [470, 752], "carlos-brazo": [1450, 752], "carlos-brazo-cel": [1450, 752], "carlos-brazo-copa": [1450, 752], "copa-a": [806, 762]};

/* la línea de tiempo: estados iniciales con set en 0 y después tweens; buscar hacia atrás o adelante da el mismo cuadro */
function filmLinea() {
  TOQUES.length = 0;
  const g = window.gsap; if (!g) return null;
  const tl = g.timeline({paused: true}), f = $("#cine"), q = s => [...f.querySelectorAll(s)];
  const T = id => tomaIni(id);
  const entra = (sel, t, d = 0.5, de = {}, a = {}) => tl.fromTo(q(sel), {autoAlpha: 0, ...de}, {autoAlpha: 1, duration: d, ease: "power2.out", immediateRender: false, ...a}, t);
  const sale = (sel, t, d = 0.4, a = {}) => tl.to(q(sel), {autoAlpha: 0, duration: d, ease: "power2.in", ...a}, t);
  const pon = (sel, t, v) => tl.set(q(sel), {autoAlpha: v ? 1 : 0}, t);
  /* un corte funde el decorado entero: ninguna pieza se queda atrás */
  const corte = (de, a, t, d = 0.6) => { tl.to(q(de), {autoAlpha: 0, duration: d, ease: "power1.inOut"}, t); tl.fromTo(q(a), {autoAlpha: 0}, {autoAlpha: 1, duration: d, ease: "power1.inOut", immediateRender: false}, t); };
  const cam = (t, v, d = 1.2, ease = "power2.inOut") => { tl.to(q(".pfig"), {scale: v.s, x: v.x, y: v.y, duration: d, ease}, t); tl.to(q(".pfon"), {scale: v.fs || 1.04, x: v.fx || 0, y: v.fy || 0, duration: d, ease}, t); };
  const brazo = (quien, v, t, d = 0.22) => BRAZOS[quien].forEach(x => tl.to(q(`.k-${quien}-${x}`), {autoAlpha: x === v ? 1 : 0, duration: d, ease: "none"}, t));
  const cabeza = (quien, ang, t, d = 0.5) => tl.to(q(`.k-${quien}-cabeza`), {rotation: ang, duration: d, ease: "sine.inOut"}, t);
  const gesto = (quien, t, n = 3, ang = 10) => tl.to(q(`.k-${quien}-brazo`), {rotation: quien === "ana" ? -ang : ang, duration: 0.32, yoyo: true, repeat: 2 * n - 1, ease: "sine.inOut"}, t);
  const toque = (A, x, y, t) => {
    /* el resaltado sale 0.6 s antes; si el mismo teléfono se acaba de tocar, espera a que lo nuevo esté en pantalla */
    const prev = TOQUES.filter(o => o[0] === A && o[3] < t).reduce((m, o) => Math.max(m, o[3]), -9), d = clamp(t - prev - 0.45, 0.3, 0.62), fija = () => haloPon(A, x, y);
    TOQUES.push([A, x, y, t, d]);
    tl.fromTo(q(A + " .halo"), {autoAlpha: 0, scale: 1.12}, {autoAlpha: 1, scale: 1, duration: 0.2, ease: "power2.out", immediateRender: false, onStart: fija, onUpdate: fija}, t - d);
    tl.fromTo(q(A + " .halo"), {scale: 1}, {scale: 1.06, duration: (d - 0.24) / 2, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false, onUpdate: fija}, t - d + 0.2);
    tl.to(q(A + " .halo"), {autoAlpha: 0, duration: 0.2}, t + 0.02);
    tl.set(q(A + " .toque"), {left: x, top: y}, t - 0.01); tl.fromTo(q(A + " .toque"), {autoAlpha: 0.95, scale: 0.4}, {autoAlpha: 0, scale: 1.6, duration: 0.7, ease: "power2.out", immediateRender: false}, t); };
  const mueve = (A, x, y, t, d = 0.45) => tl.to(q(A + " .dedo"), {x, y, duration: d, ease: "power2.inOut"}, t);
  /* tocar: el índice llega, baja, deja su marca y se aparta a un lado del teléfono para dejar ver la pantalla; s = -1 si la mano entra por la izquierda */
  const toca = (A, x, y, t, s = 1) => { mueve(A, x + 16 * s, y + 46, t - 0.6, 0.45); tl.to(q(A + " .dedo"), {x, y, duration: 0.12, ease: "power1.in"}, t - 0.13); toque(A, x, y, t); tl.to(q(A + " .dedo"), {x: x + 14 * s, y: y + 40, duration: 0.2, ease: "power1.out"}, t + 0.1); tl.to(q(A + " .dedo"), {x: s > 0 ? 510 : -110, y: y + 80, duration: 0.5, ease: "power2.inOut"}, t + 0.3); };
  const retira = (A, t, R = REP, d = 0.6) => mueve(A, R.x, R.y, t, d);
  const GT = {};
  Object.entries(VOZ).forEach(([toma, ls]) => { const ix = TOMAS.findIndex(x => x[0] === toma); if (ix < 0) return; const i0 = T0[ix], i1 = T0[ix + 1], med = VOZ_TIEMPOS[toma] && VOZ_TIEMPOS[toma].length === ls.length ? VOZ_TIEMPOS[toma] : null;
    ls.forEach((l, i) => { const o = l[3]; if (!o || o.g === undefined) return; const m = med && med[i], ini = i0 + (m ? m[0] : l[0]);
      const sig = ls.slice(i + 1).find(x => x[1] === l[1] && x[3] && x[3].g !== undefined);
      GT[o.g] = [ini, m ? i0 + m[1] : o.fin ? i0 + o.fin : Math.min(ini + Math.max(1.3, l[2].replace(/\[[^\]]*\]\s*/g, "").length / 13), sig ? i0 + sig[0] - 0.1 : 1e9, i1 - 0.15), !!m]; }); });
  const globo = (k, t, fin) => { if (GT[k]) { t = GT[k][0]; fin = GT[k][1]; } entra(".g" + k, t, 0.45, {scale: 0.6}, {scale: 1, ease: "back.out(1.5)"}); sale(".g" + k, fin, 0.25); };
  const mira = (lado, tt) => tl.to(q(".k-mesero-cabeza"), {scaleX: -lado, duration: 0.3, ease: "power1.inOut"}, tt); /* 1 = hacia Carlos (derecha), -1 = hacia Ana */
  const pantalla = (sel, t, d = 0.4) => entra(sel, t, d, {scale: 0.97}, {scale: 1});
  const pulsoQR = (t, n = 1) => tl.fromTo(q(".k-qr-brillo"), {autoAlpha: 0, scale: 0.6}, {autoAlpha: 1, scale: 1.25, duration: 0.55, yoyo: true, repeat: 2 * n - 1, ease: "sine.inOut", immediateRender: false}, t);
  /* estado inicial */
  tl.set(q(".pfon, .k-ana-silla, .k-carlos-silla, .gp, .bz:not(.k-ana-brazo):not(.k-carlos-brazo):not(.k-mesero-brazos-carta):not(.k-sofia-brazos):not(.k-diego-brazos), .k-ticket, .k-pastel, .qlk, .qsel, .qinvS, .agQ .dedo, .lupa, .lmarca, .hora, .lok, .divi, .celda, .gq, .gqf, .cnt4, .qll, .cchip, .cs.pHola .tel, .pPlato .cing, .pPlato .reco, .pPlato .ficha h4, .pPlato .ficha .cpr, .sx1, .sx2, .sx3, .noti, .marca b, .marca i, .marca span, .cinv, .cv1, .k-mesa, .k-montaje, .k-copa-a, .k-copa-c, .k-acrilico, .k-vela, .k-llama, .k-resplandor, .k-qr-brillo, .k-sucia-migas, .k-sucia-a, .k-sucia-c, .k-sucia-vaso, .k-platillo-a, .k-platillo-c, .k-nuevos, .buzz, .cerca, .pip, .agarre:not(.agP), .pan>.cs:not(.pMesa), .nom, .r, .r .cw, .globo, .estado, .resu, .reloj, .marca, .conf, .pbt, .pnota span, .mst i, .pbg, .pca, .pok"), {autoAlpha: 0}, 0);
  tl.set(q(".sala"), {autoAlpha: 1}, 0);
  tl.set(q(".globo"), {yPercent: -50}, 0); tl.set(q(".globo.gl-a"), {xPercent: -50, yPercent: -100}, 0); tl.set(q(".globo.gl-b"), {xPercent: -84, yPercent: -100}, 0); tl.set(q(".globo.gl-c"), {xPercent: -16, yPercent: -100}, 0);
  const TODOS = ".k-ana-silla, .k-carlos-silla, .gA, .gC, .gS, .gD, .k-mesa, .k-montaje, .k-copa-a, .k-copa-c, .k-acrilico, .k-vela, .k-llama, .k-resplandor";
  tl.set(q(".pfig"), {scale: 1.1, x: -96, y: -100}, 0);
  tl.set(q(".pfon"), {scale: 1.04, x: 0, y: 0, transformOrigin: "50% 50%"}, 0);
  tl.set(q(".cfon"), {scale: 1.06, x: 0, y: 0, transformOrigin: "50% 50%"}, 0);
  tl.set(q(".gA, .gC, .gS, .gD, .gm"), {x: 0, y: 0, rotation: 0}, 0);
  tl.set(q(".gA"), {transformOrigin: "432px 852px"}, 0); tl.set(q(".gC"), {transformOrigin: "1488px 852px"}, 0); tl.set(q(".gm"), {transformOrigin: "1250px 800px"}, 0);
  tl.set(q(".gS"), {transformOrigin: "800px 800px"}, 0); tl.set(q(".gD"), {transformOrigin: "1080px 800px"}, 0);
  const inclina = (g, ang, tt, d = 0.7) => tl.to(q(g), {rotation: ang, duration: d, ease: "sine.inOut"}, tt);
  Object.entries(GIRO).forEach(([n, [x, y]]) => tl.set(q(".k-" + n), {transformOrigin: orig(n, x, y), rotation: 0}, 0));
  tl.set(q(".k-qr-brillo, .k-resplandor, .k-llama"), {transformOrigin: "50% 50%"}, 0);
  tl.set(q(".k-llama"), {transformOrigin: "50% 90%"}, 0);
  tl.set(q(".k-ana-brazo, .k-carlos-brazo, .k-mesero-brazos-carta, .k-sofia-brazos, .k-diego-brazos"), {autoAlpha: 1}, 0);
  tl.set(q(".agA"), PA, 0); tl.set(q(".agC"), P2F, 0); tl.set(q(".agM"), PM, 0); tl.set(q(".agP"), {...PP, autoAlpha: 1}, 0);
  tl.set(q(".agA .dedo, .agM .dedo, .agP .dedo"), REP, 0); tl.set(q(".agC .dedo"), REPC, 0);
  const PS = {x: 540, y: 196, rotation: -2, scale: 0.84};
  /* los cuatro teléfonos: en fila (pantallas del pedido) o en cuadrícula (la cuenta) */
  const FILA = k => ({left: 64 + k * 378, top: 150, width: 350, height: 830}), GEO = k => ({left: [40, 716][k % 2], top: [128, 556][k >> 1], width: 660, height: 412});
  const PQF = {x: 30, y: 72, rotation: 0, scale: 0.725};
  const PQ = k => ({x: 58, y: 30, rotation: 0, scale: 0.43});
  QUIEN.forEach((_, k) => tl.set(q(".agQ" + k), PQ(k), 0)); tl.set(q(".agZ, .agZ2, .agZ3, .agZ4, .agY0, .agY1, .agY2, .agT"), PS, 0); tl.set(q(".agT .dedo"), REP, 0); tl.set(q(".agY0 .dedo, .agY1 .dedo, .agZ3 .dedo, .agZ4 .dedo"), REP, 0); tl.set(q(".agY2 .dedo"), REPC, 0); tl.set(q(".agZ .dedo"), REP, 0); tl.set(q(".agZ2 .dedo"), REPC, 0);
  tl.set(q(".pMesa"), {autoAlpha: 1}, 0);
  /* la vela respira toda la película */
  tl.fromTo(q(".sgk i"), {y: 0, autoAlpha: 0.9}, {y: -12, autoAlpha: 0.3, duration: 0.8, yoyo: true, repeat: Math.ceil(TOT / 0.8), ease: "sine.inOut", stagger: 0.22}, 0);
  tl.fromTo(q(".k-llama"), {scaleY: 0.94, scaleX: 1.04}, {scaleY: 1.1, scaleX: 0.95, duration: 0.31, yoyo: true, repeat: Math.ceil(TOT / 0.31), ease: "sine.inOut"}, 0);
  tl.fromTo(q(".k-resplandor"), {scale: 0.97}, {scale: 1.04, duration: 0.47, yoyo: true, repeat: Math.ceil(TOT / 0.47), ease: "sine.inOut"}, 0);
  /* rótulos y etiquetas: entran palabra por palabra al empezar cada toma y salen al terminar */
  TOMAS.forEach((t, i) => {
    const t0 = T0[i], t1 = T0[i + 1];
    if (t[4].length) {
      const rr = t0 + (t[6] || 0);
      tl.set(q(".r" + i), {autoAlpha: 1}, rr + 0.25);
      tl.fromTo(q(".r" + i + " .cw"), {y: 36, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.14, immediateRender: false}, rr + 0.3);
      sale(".r" + i, t[7] ? t0 + t[7] : t1 - 0.45, 0.35);
    }
  });
  /* ===== acto 1 ===== */
  /* 1 · la mesa sola en el campo oscuro: la vela la enciende y el QR se anuncia */
  let t = T("mesa");
  tl.fromTo(q(".cf .l1"), {opacity: 0.5, scale: 0.92}, {opacity: 1, scale: 1.06, duration: 6, ease: "sine.inOut"}, t);
  entra(".k-mesa, .k-montaje, .k-copa-a, .k-copa-c", t + 0.3, 1.6, {}, {ease: "power1.out"});
  entra(".k-vela, .k-llama, .k-resplandor", t + 0.9, 1.2);
  cam(t, {s: 1.03, x: -28, y: -30}, 5.5, "power1.out");
  entra(".k-acrilico", t + 2.2, 0.9, {y: 16}, {y: 0, ease: "power3.out"});
  pulsoQR(t + 3.3, 1);
  /* 2 · aparece el salón; un cumpleaños: llegan los cuatro y el mesero les da la carta */
  t = T("cumple");
  entra(".pfon", t, 1.4, {}, {ease: "power1.inOut"});
  entra(".k-ana-silla, .k-carlos-silla", t + 0.2, 0.8);
  tl.fromTo(q(".gA"), {autoAlpha: 0, x: -90}, {autoAlpha: 1, x: 0, duration: 1.1, ease: "power3.out", immediateRender: false}, t + 0.4);
  tl.fromTo(q(".gS"), {autoAlpha: 0, y: 30}, {autoAlpha: 1, y: 0, duration: 1.0, ease: "power3.out", immediateRender: false}, t + 0.7);
  tl.fromTo(q(".gD"), {autoAlpha: 0, y: 30}, {autoAlpha: 1, y: 0, duration: 1.0, ease: "power3.out", immediateRender: false}, t + 1.0);
  entra(".hora", t + 2.6, 0.5, {y: -12}, {y: 0});
  cam(t, C1, 5.4, "sine.inOut");
  /* «…llegaron temprano. Bueno… casi.»: la silla de Carlos sigue vacía; la luz y la cámara la señalan y entonces llega él */
  const casi = t + 6.2, llega = casi + 0.9, sentado = llega + 1.5, m0 = GT[1] ? GT[1][0] : t + 9.7;
  entra(".silu", casi, 0.45, {scale: 0.7}, {scale: 1}); tl.to(q(".silu"), {scale: 1.08, duration: 0.35, yoyo: true, repeat: 1, ease: "sine.inOut"}, casi + 0.45); sale(".silu", sentado - 0.5, 0.6);
  cam(casi - 0.2, {s: 1.07, x: -170, y: -40}, 0.9, "power2.inOut"); cam(sentado - 0.3, C1, 1.5, "sine.inOut");
  cabeza("ana", 6, casi + 0.3); tl.to(q(".k-sofia-cabeza, .k-diego-cabeza"), {rotation: 4, duration: 0.5, ease: "sine.inOut"}, casi + 0.4);
  tl.fromTo(q(".gC"), {autoAlpha: 0, x: 300}, {autoAlpha: 1, x: 0, duration: 1.5, ease: "power2.out", immediateRender: false}, llega);
  tl.fromTo(q(".gC"), {y: 0}, {y: -9, duration: 0.19, yoyo: true, repeat: 5, ease: "sine.inOut", immediateRender: false}, llega + 0.1);
  cabeza("ana", 0, sentado + 0.2); tl.to(q(".k-sofia-cabeza, .k-diego-cabeza"), {rotation: 0, duration: 0.5, ease: "sine.inOut"}, sentado + 0.2);
  /* el mesero entra cuando Carlos ya se sentó */
  tl.fromTo(q(".gm"), {autoAlpha: 0, x: 200}, {autoAlpha: 1, x: 56, duration: 1.1, ease: "power2.out", immediateRender: false}, Math.max(sentado, m0 - 1.3));
  mira(1, m0 - 0.5); globo(1, m0, m0 + 2.4); inclina(".gm", -1.5, m0 - 0.3, 0.9);
  cabeza("ana", -5, m0); cabeza("carlos", 5, m0 + 0.2);
  /* ===== B · las problemáticas ===== */
  const habla = (k, t0, t1, quien, ang = 4) => { if (GT[k]) { t0 = GT[k][0]; t1 = GT[k][1]; } globo(k, t0, t1); if (quien === "mesero") { cabeza("mesero", ang, t0, 0.4); cabeza("mesero", 0, t1 - 0.2, 0.4); } else if (quien) { cabeza(quien, ang, t0, 0.35); cabeza(quien, -ang / 2, (t0 + t1) / 2, 0.35); cabeza(quien, 0, t1 - 0.2, 0.35); } };
  /* la lupa: entra junto a quien mira, con un aro sobre su pantalla o su papel */
  const lupa = (k, t0, t1) => { entra(".lu" + k, t0, 0.5, {scale: 0.5}, {scale: 1, ease: "back.out(1.5)"}); entra(".lm" + k, t0, 0.4, {scale: 1.6}, {scale: 1}); sale(".lu" + k + ", .lm" + k, t1, 0.35); };
  /* la pluma escribe: el trazo del renglón k avanza y la pluma lo sigue */
  const escribe = (k, t0, d = 0.9) => tl.fromTo(q(".k-mesero-brazo-pluma"), {rotation: 0, x: 0}, {rotation: 2.2, x: -5, duration: 0.1, yoyo: true, repeat: Math.round(d / 0.1) | 1, ease: "sine.inOut", immediateRender: false}, t0);
  const libreta = (on, tt) => tl.to(q(".k-mesero-brazo-pluma"), {autoAlpha: on ? 1 : 0, duration: 0.3}, tt);
  /* el reloj late cuando el tiempo salta */
  const pulsoHora = tt => tl.fromTo(q(".hora"), {scale: 1}, {scale: 1.3, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, tt);
  /* B1 · ponerse de acuerdo: unos con la carta de papel, otros con el PDF en el teléfono; es el mismo problema */
  t = T("b1") + 3.6;
  tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t); inclina(".gm", 0, t, 0.5);
  brazo("ana", "brazo-carta", t + 0.2); brazo("sofia", "brazos-carta", t + 0.3); brazo("diego", "brazos-cel", t + 0.4); brazo("carlos", "brazo-cel", t + 0.5);
  cabeza("ana", 8, t + 0.3); cabeza("carlos", -8, t + 0.6);
  habla(10, t + 0.8, t + 2.6, "ana", -6); inclina(".gA", 3, t + 0.8); inclina(".gA", 0, t + 2.5);
  habla(11, t + 2.7, t + 4.5, "diego", 5); inclina(".gD", -2, t + 2.7); inclina(".gD", 0, t + 4.4);
  lupa(1, t + 4.5, t + 9.0);
  tl.set(q(".lpdf"), {scale: 1.05, x: -130, y: -10}, t + 4.4);
  tl.to(q(".lpdf"), {scale: 1.6, x: -130, y: -170, duration: 0.8, ease: "power2.inOut"}, t + 5.3);
  tl.to(q(".lpdf"), {x: -470, y: -330, duration: 0.8, ease: "power2.inOut"}, t + 6.4);
  tl.to(q(".lpdf"), {x: -40, y: -430, duration: 0.9, ease: "power2.inOut"}, t + 7.5);
  habla(12, t + 4.9, t + 7.2, "carlos", 6); inclina(".gC", -3, t + 4.9); inclina(".gC", 0, t + 7.0);
  habla(13, t + 7.4, t + 9.1, "sofia", -5); inclina(".gS", 2, t + 7.4); inclina(".gS", 0, t + 9.0);
  /* B2 · el menú no la conoce: tres vueltas entre lo que hay y lo que Ana puede comer; el mesero hace lo correcto, el sistema no ayuda */
  t = T("b2") + 3.0;
  brazo("mesero", "brazos-libreta", t, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1, rotation: 0}, t);
  tl.fromTo(q(".gm"), {x: 200, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.9, ease: "power2.out", immediateRender: false}, t + 0.1); libreta(true, t + 0.9);
  brazo("sofia", "brazos", t + 0.3); brazo("carlos", "brazo", t + 0.4); brazo("diego", "brazos", t + 0.5); cabeza("carlos", 0, t + 0.4);
  habla(14, t + 1.0, t + 2.8, "ana", -4); inclina(".gA", 2, t + 1.0);
  habla(15, t + 3.0, t + 4.8, "mesero", -5); inclina(".gm", -2, t + 3.0); inclina(".gm", 0, t + 4.6);
  habla(16, t + 5.0, t + 6.2, "ana", 4);
  habla(17, t + 6.4, t + 8.5, "mesero", -5); inclina(".gm", -2, t + 6.4); inclina(".gm", 0, t + 8.3);
  habla(18, t + 8.7, t + 10.3, "ana", -4);
  escribe(0, t + 9.3, 1.0);
  habla(26, t + 10.6, t + 12.3, "ana", 6); inclina(".gA", 4, t + 10.6, 0.4);
  habla(27, t + 12.5, t + 14.2, "mesero", -5); inclina(".gA", 0, t + 12.6); brazo("ana", "brazo", t + 13.6);
  tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.7, ease: "power2.in"}, t + 14.3); pulsoHora(t + 15.0);
  cabeza("ana", 7, t + 14.8); cabeza("carlos", -7, t + 15.0); cabeza("ana", 0, t + 16.4); cabeza("carlos", 0, t + 16.5);
  tl.fromTo(q(".gm"), {x: 200, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out", immediateRender: false}, t + 16.1);
  habla(36, t + 16.7, t + 18.0, "mesero", -5);
  /* B3 · ordenar entre muchos: el mesero apunta a mano, orden por orden */
  t = T("b3") + 3.5;
  habla(19, t + 0.5, t + 2.6, "mesero", -6); escribe(1, t + 1.2, 1.0);
  mira(1, t + 2.7); habla(20, t + 2.8, t + 4.6, "carlos", 6); inclina(".gC", -3, t + 2.8); inclina(".gC", 0, t + 4.4); escribe(2, t + 3.4, 1.0);
  mira(-1, t + 4.7); habla(21, t + 4.8, t + 6.7, "ana", -6); inclina(".gA", 3, t + 4.8); inclina(".gA", 0, t + 6.5); escribe(3, t + 5.6, 0.9);
  cabeza("mesero", -7, t + 6.9, 0.3); cabeza("mesero", 5, t + 7.3, 0.3); cabeza("mesero", -6, t + 7.7, 0.3);
  /* B3 bis · o trae una tableta: la libreta desaparece, aparece la tableta y la lupa enseña su pantalla, cargando */
  t = T("b3t") + 2.7;
  libreta(false, t); brazo("mesero", "brazos-tableta", t + 0.1, 0.5);
  entra(".lu2", t + 0.7, 0.5, {scale: 0.5}, {scale: 1, ease: "back.out(1.5)"});
  tl.fromTo(q(".ltab .ctab"), {rotation: 0}, {rotation: 1980, duration: 5.8, ease: "none", immediateRender: false}, t + 0.7);
  habla(28, t + 1.3, t + 3.8, "mesero", -6);
  /* la espera: la orden por fin sale, el mesero se va y pasa el tiempo; platican, llegan los platos, comen y piden la cuenta */
  t = T("espera");
  tl.to(q(".ltab .ctab, .ltab span"), {autoAlpha: 0, duration: 0.25}, t + 0.9); entra(".ltab .lok", t + 1.0, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2.2)"});
  sale(".lu2, .lm2", t + 2.3, 0.35);
  tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 2.2); pulsoHora(t + 2.9);
  habla(37, t + 3.0, t + 4.6, "carlos", 6); inclina(".gC", -3, t + 3.0); inclina(".gC", 0, t + 4.5);
  habla(38, t + 4.7, t + 6.2, "diego", 5);
  brazo("mesero", "brazos", t + 5.0, 0.01);
  tl.fromTo(q(".gm"), {x: 200, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out", immediateRender: false}, t + 6.2);
  inclina(".gm", -3, t + 6.9, 0.5); inclina(".gm", 0, t + 7.8, 0.5);
  entra(".k-platillo-a, .k-platillo-c", t + 7.1, 0.6, {y: -18}, {y: 0, stagger: 0.25});
  tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 8.0); pulsoHora(t + 8.8);
  gesto("ana", t + 8.4, 3, 12); gesto("carlos", t + 8.7, 3, 10);
  cabeza("ana", 6, t + 8.4, 0.4); cabeza("ana", 0, t + 9.6, 0.4); cabeza("carlos", -6, t + 8.8, 0.4); cabeza("carlos", 0, t + 10.0, 0.4);
  cabeza("sofia", 5, t + 8.6); cabeza("sofia", 0, t + 9.8); cabeza("diego", -5, t + 9.0); cabeza("diego", 0, t + 10.2);
  habla(39, t + 10.5, t + 12.3, "ana", -5); inclina(".gA", 3, t + 10.5); inclina(".gA", 0, t + 12.2);
  /* la cuenta: el mesero agradece, deja un solo ticket para todos y se retira; la lupa lo amplía */
  t = T("ticket");
  brazo("mesero", "brazos-cuenta", t, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1, rotation: 0}, t);
  tl.fromTo(q(".gm"), {x: 200, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out", immediateRender: false}, t + 0.1);
  habla(31, t + 0.9, t + 2.7, "mesero", -5); inclina(".gm", -3, t + 1.6, 0.6); inclina(".gm", 0, t + 2.8, 0.5);
  brazo("mesero", "brazos", t + 2.4, 0.3); entra(".k-ticket", t + 2.4, 0.4, {y: -16}, {y: 0});
  tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 3.0);
  cabeza("ana", 8, t + 2.8); cabeza("carlos", -8, t + 3.0);
  lupa(3, t + 4.0, t + 8.2);
  tl.fromTo(q(".ltk"), {y: 14}, {y: -210, duration: 3.2, ease: "sine.inOut", immediateRender: false}, t + 4.6);
  /* B4 · la última: una sola cuenta y cada quien haciendo cuentas en su teléfono */
  t = T("b4") + 1.8;
  brazo("ana", "brazo-cel", t + 0.3); brazo("sofia", "brazos-cel", t + 0.4); brazo("diego", "brazos-cel", t + 0.5); brazo("carlos", "brazo-cel", t + 0.6);
  cabeza("ana", 7, t + 0.3); cabeza("carlos", -7, t + 0.6);
  habla(22, t + 1.0, t + 2.9, "diego", 5);
  habla(23, t + 3.0, t + 5.3, "ana", -5); inclina(".gA", 3, t + 3.0); inclina(".gA", 0, t + 5.2);
  habla(24, t + 5.4, t + 7.4, "carlos", 6); inclina(".gC", -3, t + 5.4); inclina(".gC", 0, t + 7.3);
  /* el giro: todo se apaga y queda la pregunta */
  t = T("pivote");
  sale(".sala", t - 0.5, 0.6);
  tl.set(q(".pfig"), {scale: 1, x: 0, y: 0}, t + 0.3); tl.set(q(".pfon"), {scale: 1.04, x: 0, y: 0}, t + 0.3);
  /* ===== C · Carta ===== */
  /* 3 · la misma mesa, ahora con el QR: Ana levanta su teléfono; la cámara se va a su mano (capturas reales) */
  { const tp = T("pivote"); tl.to(q(".hora"), {x: -706, y: 590, scale: 1.7, duration: 0.9, ease: "power3.inOut"}, tp + 1.0); tl.to(q(".hora"), {x: 0, y: 0, scale: 1, duration: 0.9, ease: "power3.inOut"}, tp + 5.0); }
  t = T("ofrece");
  tl.set(q(".k-ticket, .k-platillo-a, .k-platillo-c"), {autoAlpha: 0}, t - 0.1);
  brazo("ana", "brazo", t - 0.1, 0.01); brazo("carlos", "brazo", t - 0.1, 0.01); brazo("sofia", "brazos", t - 0.1, 0.01); brazo("diego", "brazos", t - 0.1, 0.01);
  brazo("mesero", "brazos", t - 0.1, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1, rotation: 0}, t - 0.1);
  tl.set(q(".k-ana-cabeza, .k-carlos-cabeza"), {rotation: 0}, t - 0.1);
  entra(".sala", t - 0.1, 0.5);
  tl.fromTo(q(".gm"), {x: 200, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.9, ease: "power2.out", immediateRender: false}, t + 0.3);
  habla(40, t + 1.2, t + 5.6, "mesero", -5); inclina(".gm", -2, t + 1.2, 0.6); inclina(".gm", 0, t + 5.4, 0.5);
  pulsoQR(t + 2.6, 1); cabeza("ana", 8, t + 2.6); cabeza("carlos", -8, t + 2.8); cabeza("ana", 0, t + 5.6); cabeza("carlos", 0, t + 5.8);
  /* Ana le contesta: ya usaba Carta; le enseña su teléfono */
  { const a0 = GT[75] ? GT[75][0] : t + 5.8, a1 = GT[75] ? GT[75][1] : t + 9.2;
    habla(75, a0, a1, "ana", -6); brazo("ana", "brazo-cel", a0 + 0.5); mira(-1, a0 + 0.1); inclina(".gA", 3, a0, 0.5); inclina(".gA", 0, a1 - 0.3, 0.5);
    tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, a1 - 0.5); }
  t = T("escanea");
  pulsoQR(t - 0.1, 1);
  brazo("ana", "brazo-cel", t + 0.1);
  cam(t + 0.2, {s: 2.3, x: -330, y: -1000, fs: 1.3, fx: 150}, 1.5, "power2.in");
  corte(".sala", ".cerca", t + 1.0, 0.7);
  tl.fromTo(q(".cfon"), {scale: 1.16}, {scale: 1.06, duration: 6.5, ease: "power1.out", immediateRender: false}, t + 1.0);
  pon(".cs.visor", t + 0.9, true);
  tl.fromTo(q(".agA"), {...PA, autoAlpha: 0, y: PA.y + 260}, {...PA, autoAlpha: 1, duration: 1.1, ease: "power3.out", immediateRender: false}, t + 1.1);
  tl.fromTo(q(".ret"), {scale: 1.6, autoAlpha: 0.4}, {scale: 1, autoAlpha: 1, duration: 0.9, ease: "power3.out", immediateRender: false}, t + 2.0);
  entra(".det", t + 3.0, 0.4, {y: 14}, {y: 0, ease: "back.out(2)"});
  toca(".agA", 200, 580, t + 3.8);
  entra(".cs.bien", t + 4.05, 0.35, {scale: 1.04}, {scale: 1});
  toca(".agA", 200, 800, t + 5.6);
  entra(".cs.menu", t + 5.9, 0.4, {scale: 1.04}, {scale: 1});
  retira(".agA", t + 6.6);
  /* ===== acto 2: el teléfono en la mano de Ana, con la mesa desenfocada detrás ===== */
  /* 4 · la carta se adapta a lo que Ana no come */
  t = T("filtra");
  tl.to(q(".agA"), {...PB, duration: 1.2, ease: "power3.inOut"}, t + 0.1);
  pantalla(".cs.pHola", t + 0.6, 0.45);
  const msj = q(".carga span");
  msj.forEach((m, k) => { tl.fromTo(m, {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false}, t + 1.0 + k * 1.0); if (k < msj.length - 1) tl.to(m, {autoAlpha: 0, y: -10, duration: 0.25}, t + 1.75 + k * 1.0); });
  entra(".cs.pHola .cchips .cchip", t + 1.4, 0.45, {scale: 0.7}, {scale: 1, ease: "back.out(2)", stagger: 0.25});
  entra(".cs.pHola .tel", t + 2.0, 0.4);
  entra(".cs.pHola .cfuera .cno", t + 4.6, 0.3, {scale: 0.6}, {scale: 1, stagger: 0.2});
  tl.to(q(".cs.pHola .cfuera"), {height: 0, autoAlpha: 0, duration: 0.6, ease: "power2.inOut", stagger: 0.15}, t + 5.6);
  tl.to(q(".carga span:last-child"), {autoAlpha: 0, duration: 0.3}, t + 6.3);
  entra(".clisto", t + 6.6, 0.5, {y: 30, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(1.8)"});
  /* 5 · su Top 3: el índice de su otra mano lo recorre y elige */
  t = T("top3");
  tl.to(q(".agA"), {...PC, duration: 1.0, ease: "power3.inOut"}, t);
  tl.to(q(".cfon"), {x: -40, duration: 1.4, ease: "power2.inOut"}, t);
  pantalla(".cs.pTop3", t + 0.1, 0.5);
  const sec = (de, a, tt) => { tl.to(q(".sx" + de), {autoAlpha: 0, y: -10, duration: 0.25}, tt); tl.fromTo(q(".sx" + a), {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false}, tt + 0.15); };
  const desliza = (x0, x1, riel, tt, d = 0.8) => { mueve(".agA", x0, 356, tt - 0.35, 0.3); tl.to(q(".agA .dedo"), {x: x1, duration: d, ease: "power2.inOut"}, tt); tl.to(q(".cs.pTop3 .rail"), {x: riel, duration: d, ease: "power2.inOut"}, tt); };
  tl.set(q(".cs.pTop3 .rail"), {x: 0}, t);
  desliza(318, 110, -702, t + 1.0, 0.7); sec(0, 1, t + 1.3); tl.to(q(".cs.pTop3 .porq"), {autoAlpha: 0, duration: 0.3}, t + 1.3);
  desliza(318, 130, -1170, t + 2.1, 0.7); sec(1, 2, t + 2.4);
  desliza(318, 150, -1420, t + 3.2, 0.6); sec(2, 3, t + 3.4);
  desliza(110, 330, 0, t + 4.4, 1.0); sec(3, 0, t + 4.9); tl.to(q(".cs.pTop3 .porq"), {autoAlpha: 1, duration: 0.3}, t + 5.1);
  toca(".agA", 130, 300, t + 6.6);
  /* 6 · al tocar, la tarjeta se expande, la hoja sube hasta tres cuartos y entran en orden nombre, precio, componentes y recomendación */
  t = T("plato");
  tl.to(q(".agA"), {...PB, duration: 1.0, ease: "power3.inOut"}, t);
  tl.to(q(".cfon"), {x: 0, duration: 1.2, ease: "power2.inOut"}, t);
  tl.set(q(".cs.pPlato .cabp, .cs.pPlato .vuela, .cs.pPlato .caviso"), {autoAlpha: 0}, t);
  tl.fromTo(q(".cs.pPlato"), {autoAlpha: 0, scale: 0.46, transformOrigin: "130px 300px"}, {autoAlpha: 1, scale: 1, duration: 0.6, ease: "power3.out", immediateRender: false}, t);
  tl.fromTo(q(".pPlato .ficha"), {y: 540}, {y: 0, duration: 0.7, ease: "power3.out", immediateRender: false}, t + 0.5);
  tl.fromTo(q(".torno .gir"), {rotation: 0}, {rotation: 360, duration: T("juntos") - T("plato"), ease: "none", immediateRender: false}, t);
  [0.6, 4.2, 7.8].forEach(d => tl.fromTo(q(".torno .brillo i"), {x: 0}, {x: 380, duration: 1.4, ease: "sine.inOut", immediateRender: false}, t + d));
  entra(".pPlato .ficha h4", t + 1.2, 0.45, {y: 16}, {y: 0});
  entra(".pPlato .ficha .cpr", t + 1.6, 0.4, {y: 12}, {y: 0});
  entra(".pPlato .cing", t + 2.0, 0.4, {y: 14, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(2)", stagger: 0.18});
  entra(".pPlato .reco", t + 3.3, 0.5, {y: 20}, {y: 0});
  /* 7 · «Agregar a mi orden»: toca y el platillo vuela a su mesa virtual */
  t = T("agrega");
  toca(".agA", 200, 798, t + 0.9);
  tl.to(q(".agr"), {scale: 0.96, duration: 0.12, yoyo: true, repeat: 1}, t + 0.9);
  entra(".cs.pPlato .cabp", t + 0.6, 0.3);
  tl.fromTo(q(".vuela"), {autoAlpha: 1, x: 0, scale: 1}, {x: 156, scale: 0.6, duration: 0.9, ease: "power1.in", immediateRender: false}, t + 1.1);
  tl.fromTo(q(".vuela"), {y: 0}, {y: -716, duration: 0.9, ease: "power2.out", immediateRender: false}, t + 1.1);
  tl.to(q(".vuela"), {autoAlpha: 0, duration: 0.15}, t + 1.95);
  tl.fromTo(q(".pPlato .mia .bd"), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)", immediateRender: false}, t + 2.0);
  entra(".cs.pPlato .caviso", t + 2.2, 0.4, {y: 20}, {y: 0, ease: "back.out(1.6)"});
  retira(".agA", t + 2.0);
  /* ===== acto 3: la mesa pide junta ===== */
  /* 8 · de vuelta al plano abierto: Ana ya pidió y deja el teléfono; Carlos sigue eligiendo, con la cara alumbrada por la pantalla */
  t = T("juntos") + 3.7;
  tl.set(q(".pfig"), {scale: 1.5, x: -330, y: -430}, t); tl.set(q(".pfon"), {scale: 1.2, x: 60, y: 0}, t);
  tl.set(q(".gm"), {autoAlpha: 0, rotation: 0}, t);
  brazo("ana", "brazo", t, 0.01); brazo("carlos", "brazo-cel", t, 0.01); brazo("sofia", "brazos", t, 0.01); brazo("diego", "brazos-cel", t, 0.01);
  tl.set(q(".k-ana-cabeza"), {rotation: 0}, t); tl.set(q(".k-carlos-cabeza"), {rotation: -7}, t);
  entra(".eS", t + 2.1, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"}); entra(".eD", t + 2.15, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"}); sale(".eS, .eD", t + 6.5, 0.3);
  corte(".cerca", ".sala", t, 0.7);
  cam(t + 0.1, C1, 2.0, "power2.out");
  sale(".agA", t + 0.7, 0.01);
  entra(".eA", t + 2.0, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  entra(".eC", t + 2.2, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  globo(3, t + 2.6, t + 4.5); gesto("ana", t + 2.6, 2, 8); cabeza("ana", 4, t + 2.6); inclina(".gA", 2.5, t + 2.5); inclina(".gA", 0, t + 4.4);
  globo(4, t + 4.7, t + 6.5); cabeza("carlos", 2, t + 4.7); cabeza("carlos", -7, t + 5.6);
  sale(".eA, .eC", t + 6.5, 0.3);
  /* 9 · Ana aún es nueva en Carta; elige una arrachera y se la manda a Carlos (visión); cada teléfono, en la mano de su dueño */
  t = T("recomienda");
  pon(".cs.pAviso", t, true); pon(".cs.pCarlos", t, true);
  tl.set(q(".agA"), {...PF, autoAlpha: 1}, t); tl.set(q(".agC"), {...P2F, autoAlpha: 1}, t);
  tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200}, t);
  corte(".sala", ".cerca", t, 0.7);
  tl.fromTo(q(".agA"), {y: PF.y + 90}, {y: PF.y, duration: 1.0, ease: "power3.out", immediateRender: false}, t);
  tl.fromTo(q(".agC"), {y: P2F.y + 120}, {y: P2F.y, duration: 1.1, ease: "power3.out", immediateRender: false}, t);
  entra(".nom", t + 0.8, 0.4); entra(".divi", t + 0.5, 0.7, {scaleY: 0}, {scaleY: 1, ease: "power2.out"}); sale(".divi", t + 6.1, 0.3);
  toca(".agA", 200, 312, t + 1.8);
  pantalla(".cs.pRes", t + 1.95, 0.35);
  toca(".agA", 200, 726, t + 3.3);
  entra(".cs.pRes .toast", t + 3.45, 0.35, {y: -14}, {y: 0});
  entra(".reco2", t + 3.95, 0.45, {y: 30, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.6)"});
  retira(".agA", t + 4.3);
  toca(".agC", 200, 498, t + 5.4, -1);
  sale(".reco2", t + 5.6, 0.3);
  entra(".cs.pCarlos .toast", t + 5.6, 0.35, {y: -14}, {y: 0});
  entra(".conf", t + 5.9, 0.4, {y: 20}, {y: 0});
  /* 10 · Carlos confirma: Carta llama al mesero */
  t = T("confirma");
  toca(".agC", 200, 800, t + 0.9, -1);
  pantalla(".cs.pListosB", t + 1.05, 0.4);
  pantalla(".cs.pListosA", t + 1.35, 0.4);
  retira(".agC", t + 1.9, REPC);
  /* 10b · a los cuatro les cambia la pantalla: «Orden de la mesa», llamando al mesero y «va en camino»; en ese instante, corte al teléfono de Javier */
  const SLOT = k => ({x: 64 + k * 378 + PQF.x, y: 150 + PQF.y, rotation: 0, scale: PQF.scale});
  const fila = (t0, t1, cls, cuales, lados) => { cuales.forEach(k => { tl.set(q(".cq" + k), {...FILA(k), overflow: "visible", background: "none", boxShadow: "none"}, t0); tl.set(q(".agQ" + k), {...PQF, autoAlpha: 1}, t0);
      tl.set(q(".agQ" + k + " .pan>.cs"), {autoAlpha: 0}, t0); tl.set(q(".agQ" + k + " " + cls), {autoAlpha: 1}, t0);
      tl.fromTo(q(".cq" + k), {autoAlpha: 0, x: lados && k === 0 ? -520 : lados && k === 3 ? 520 : 0, y: lados && (k === 0 || k === 3) ? 0 : 640}, {autoAlpha: 1, x: 0, y: 0, duration: 0.95, ease: "power3.out", immediateRender: false}, t0); });
    entra(".dvq", t0 + 1.0, 0.7, {scaleY: 0}, {scaleY: 1, ease: "power2.out", stagger: 0.1}); entra(".nq", t0 + 1.2, 0.45, {y: -12}, {y: 0, stagger: 0.08});
    sale(".celda, .dvq, .nq", t1, 0.4); };
  t = T("esperan");
  /* los teléfonos de Ana y de Carlos se hacen pequeños y se van a su lugar; suben los de Sofía y Diego; luego las líneas y los nombres */
  tl.to(q(".nom, .divi"), {autoAlpha: 0, duration: 0.3}, t);
  tl.to(q(".agA"), {...SLOT(0), duration: 0.8, ease: "power3.inOut"}, t + 0.05); tl.to(q(".agC"), {...SLOT(3), duration: 0.8, ease: "power3.inOut"}, t + 0.05);
  tl.set(q(".qE .e1"), {autoAlpha: 1}, t); tl.set(q(".qE .e2"), {autoAlpha: 0}, t);
  fila(t + 0.4, t + 2.85, ".qL", [1, 2], false); sale(".agA, .agC", t + 2.85, 0.35);
  [".agA", ".agQ1", ".agQ2", ".agC"].forEach(A => pantalla(A + " .qE", t + 1.35, 0.3));
  sale(".qE .e1", t + 2.1, 0.15); entra(".qE .e2", t + 2.2, 0.35, {scale: 0.9}, {scale: 1, ease: "back.out(2)"});
  /* ===== acto 4: el mesero ===== */
  /* 11 · el mesero, en otra parte del salón: le vibra el bolsillo (aviso con el teléfono bloqueado: visión), mira y dice «Ya voy» */
  t = T("avisa");
  pon(".cs.bloq", t, true); tl.set(q(".agM"), {...PM, autoAlpha: 0}, t);
  tl.to(q(".cfon"), {x: -160, duration: 1.2, ease: "power2.inOut"}, t);
  tl.fromTo(q(".agM"), {y: PM.y + 120, autoAlpha: 0}, {y: PM.y, autoAlpha: 1, duration: 0.4, ease: "power3.out", immediateRender: false}, t);
  entra(".noti", t + 0.7, 0.5, {y: -24, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.7)"});
  toca(".agM", 200, 400, t + 2.8);
  pantalla(".cs.pOrden", t + 3.0, 0.4);
  retira(".agM", t + 3.9, REP, 0.5);
  /* de vuelta a la mesa: el mesero llega con su teléfono en la mano */
  tl.set(q(".pfig"), {scale: 1.04, x: -38, y: -30}, t + 4.5); tl.set(q(".pfon"), {scale: 1.04, x: 0, y: 0}, t + 4.5);
  brazo("diego", "brazos", t + 4.5, 0.01); brazo("carlos", "brazo", t + 4.5, 0.01); brazo("mesero", "brazos-cel", t + 4.5, 0.01);
  tl.set(q(".k-carlos-cabeza, .k-mesero-cabeza"), {rotation: 0}, t + 4.5);
  tl.set(q(".gm"), {autoAlpha: 0, x: 240, rotation: 0}, t + 4.5);
  corte(".cerca", ".sala", t + 4.6, 0.6);
  sale(".agM", t + 5.2, 0.01);
  tl.to(q(".gm"), {autoAlpha: 1, x: 0, duration: 1.2, ease: "power2.out"}, t + 4.8);
  cam(t + 4.6, C1, 3.5, "sine.out");
  /* 12 · repasa la orden con ellos y la manda */
  t = T("llega");
  mira(1, t + 0.1); cabeza("mesero", 4, t + 0.4); inclina(".gm", -2.5, t + 0.3, 0.9); inclina(".gm", 0, t + 7.6, 0.8);
  globo(5, t + 0.5, t + 2.1); globo(29, t + 2.2, t + 4.4); globo(30, t + 4.5, t + 6.1);
  cabeza("ana", -4, t + 0.6, 0.4); cabeza("sofia", 4, t + 2.3, 0.4); cabeza("diego", -4, t + 3.3, 0.4); cabeza("carlos", 5, t + 4.6, 0.4);
  globo(6, t + 6.3, t + 7.7); cabeza("ana", -6, t + 6.3, 0.3); cabeza("ana", 2, t + 6.8, 0.3); cabeza("ana", -4, t + 7.2, 0.3);
  entra(".eCom", t + 7.8, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  /* 12b · al validar, los cuatro pasan al seguimiento: «Tu comida se está preparando» */
  t = T("cocina");
  sale(".eCom", t, 0.3); tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200, scaleX: 1.5}, t); corte(".sala", ".cerca", t, 0.5);
  tl.set(q(".qE .e1"), {autoAlpha: 0}, t); tl.set(q(".qE .e2"), {autoAlpha: 1}, t);
  fila(t + 0.2, t + 4.9, ".qE", [0, 1, 2, 3], true);
  QUIEN.forEach((_, k) => pantalla(".agQ" + k + " .qK", t + 2.4, 0.45));
  corte(".cerca", ".sala", t + 5.0, 0.5);
  /* ===== acto 5: el ciclo de la mesa, a cámara rápida; arriba a la derecha, el teléfono del mesero ===== */
  const a5 = T("abierta"), d5 = T("fin") - a5;
  const A = ".agP";
  /* el estado activo de la pista cambia cuando el mesero toca el botón */
  const fase = (k, tt) => {
    if (k > 0) tl.to(q(`.mst .m${k - 1}, .pnota .n${k - 1}, .pbt.b${k - 1}`), {autoAlpha: 0, duration: 0.3}, tt);
    tl.to(q(`.ps${k} .pbg, .ps${k} .pca`), {autoAlpha: 0, duration: 0.3}, tt);
    tl.fromTo(q(`.ps${k} .pok`), {autoAlpha: 0, scale: 0.4}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)", immediateRender: false}, tt + 0.1);
    if (k < 3) { tl.fromTo(q(`.ps${k + 1} .pbg`), {autoAlpha: 0, scale: 0.94}, {autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)", immediateRender: false}, tt + 0.1);
      tl.fromTo(q(`.ps${k + 1} .pca`), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.5)", immediateRender: false}, tt + 0.15); }
    entra(`.mst .m${k}, .pnota .n${k}`, tt + 0.2, 0.3);
    entra(`.pbt.b${k}`, tt + 0.35, 0.35, {y: 14}, {y: 0});
  };
  const pulsa = (k, tt) => { toca(A, 200, 800, tt); tl.to(q(`.pbt.b${k}`), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, tt); retira(A, tt + 0.9); };
  t = a5;
  sale(".eCom", t, 0.3);
  cam(t + 0.1, CA5, 1.4);
  tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 0.1);
  tl.fromTo(q(".pip"), {autoAlpha: 0, x: 60}, {autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out", immediateRender: false}, t + 0.6);
  fase(0, t + 0.6);
  entra(".reloj", t + 0.6, 0.4);
  sale(".hora", a5 + 0.3, 0.3);
  /* la hora de la mesa (minutos desde las 8:00 pm) en cada punto de la película; entre puntos corre pareja */
  const HORA = [[T("cumple") + 2.6, 0], [T("b2"), 3], [T("b2") + 17.1, 6], [T("b2") + 18.7, 18], [T("b3t"), 21], [T("espera") + 2.6, 23], [T("espera") + 4.6, 50], [T("espera") + 8.4, 55], [T("espera") + 10.4, 100],
    [T("b4"), 104], [T("pivote") + 2.0, 108], [T("pivote") + 4.8, 0], [a5, 14], [a5 + 6.6, 26], [a5 + 44, 58], [a5 + 52, 76], [T("cierres"), 80], [T("cierres") + 18.5, 86], [T("cierres") + 21.9, 100], [T("cuenta"), 108], [T("fin"), 128]];
  const hds = q(".hd"), hhs = q(".esfera .hh"), mms = q(".esfera .mm");
  const pintaHora = () => {
    const s = tl.time(); let m = HORA[0][1];
    for (let i = 0; i < HORA.length; i++) if (s >= HORA[i][0]) { const [a, ma] = HORA[i], sig = HORA[i + 1]; m = sig ? ma + (sig[1] - ma) * Math.min(1, (s - a) / (sig[0] - a)) : ma; }
    const mi = Math.floor(m), tx = `${8 + Math.floor(mi / 60)}:${String(mi % 60).padStart(2, "0")} pm`;
    hds.forEach(h => { if (h.textContent !== tx) h.textContent = tx; });
    hhs.forEach(h => { h.style.transform = `rotate(${(1200 + m) * 0.5}deg)`; }); mms.forEach(h => { h.style.transform = `rotate(${m * 6}deg)`; });
  };
  tl.eventCallback("onUpdate", pintaHora); pintaHora();
  /* 13 · abierta: plática de amigos y risas mientras corre el reloj; el mesero sirve; siguen platicando y comiendo */
  const rie = (quien, tt, n = 7) => tl.to(q(`.k-${quien}-cabeza`), {y: -6, duration: 0.11, yoyo: true, repeat: n, ease: "sine.inOut"}, tt);
  t += 2.0;
  habla(41, t + 1.3, t + 3.0, "sofia", -5); inclina(".gS", 2, t + 1.3); inclina(".gS", 0, t + 2.9);
  cabeza("ana", -5, t + 1.5); cabeza("carlos", 5, t + 1.7);
  habla(42, t + 3.1, t + 5.3, "diego", 5); inclina(".gD", -2, t + 3.1); inclina(".gD", 0, t + 5.2); gesto("carlos", t + 3.4, 2, 10);
  const tr = GT[43] ? GT[43][0] : t + 5.4;
  const risa = (k, quien, d0) => { const g = GT[k] || [d0, d0 + 1.2]; rie(quien, g[0], 2 * Math.max(3, Math.round((g[1] - g[0]) / 0.22)) - 1); };
  [71, 72, 73, 74].forEach(k => globo(k, tr - 3, tr - 1.5)); if (GT[74]) risa(74, "diego", 0);
  globo(43, tr, tr + 1.2); globo(44, tr + 0.2, tr + 1.3); risa(43, "ana", tr); risa(44, "carlos", tr + 0.2); rie("sofia", tr + 0.1, 5);
  inclina(".gA", 3, tr, 0.3); inclina(".gA", 0, tr + 1.1, 0.4); inclina(".gC", -3, tr + 0.2, 0.3); inclina(".gC", 0, tr + 1.2, 0.4);
  /* los cuatro teléfonos, en pequeño, con su estado; y tres solicitudes de cambio antes de que llegue la comida */
  entra(".mnrow", t + 1.0, 0.5, {y: -12}, {y: 0});
  SOLIC.forEach((x, i) => { const r = t + 9.6 + [0, 12.2, 29.4][i], d = [2.7, 0.5, 1.7][i], cu = r + 1.9 + d, f = (6.4 - d) / 6.4, en = v => cu + v * f;
    const quien = QUIEN[x.k][0], A = ".agY" + i, s = x.k === 3 ? -1 : 1, cel = x.k === 0 || x.k === 3 ? "brazo-cel" : "brazos-cel", sin = x.k === 0 || x.k === 3 ? "brazo" : "brazos";
    brazo(quien, cel, r + d); habla(60 + i, r + 0.1 + d, r + 1.8 + d, quien, 5);
    tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200, scaleX: 1.5}, cu); tl.set(q(A + " .qK"), {autoAlpha: 1}, cu);
    tl.set(q(A + " .mvel, " + A + " .msh, " + A + " .mto, " + A + " .qcar, " + A + " .qadd, " + A + " .qcar .mcf, " + A + " .q1, " + A + " .mel"), {autoAlpha: 0}, cu); tl.set(q(A + " .q0"), {autoAlpha: 1}, cu);
    corte(".sala", ".cerca", cu, 0.5);
    tl.fromTo(q(A), {...PS, autoAlpha: 0, y: PS.y + 200}, {...PS, autoAlpha: 1, duration: 0.7, ease: "power3.out", immediateRender: false}, cu); entra(A + " .nom", cu + 0.5, 0.3);
    let tc;
    if (x.carta) { /* agrega: del seguimiento a la carta, toca el platillo, se suma a su orden y confirma con el mesero */
      toca(A, 200, 802, en(1.4), s); pantalla(A + " .qcar", en(1.4) + 0.15, 0.4);
      toca(A, 200, 160, en(2.8), s); tl.to(q(A + " .gua"), {backgroundColor: "#eef0e2", duration: 0.25}, en(2.8) + 0.05); entra(A + " .qadd", en(2.8) + 0.2, 0.35, {y: 14}, {y: 0}); entra(A + " .qcar .mcf", en(2.8) + 0.3, 0.35, {y: 14}, {y: 0});
      tc = en(4.4); toca(A, 200, 802, tc, s); sale(A + " .qcar", tc + 0.15, 0.25);
    } else { /* cambia o quita: el modal con sus platillos y los botones de menos y más */
      toca(A, 200, 802, en(1.2), s); entra(A + " .mvel", en(1.2) + 0.1, 0.3); entra(A + " .m1", en(1.2) + 0.15, 0.35, {y: 60}, {y: 0});
      toca(A, 200, 790, en(2.1), s); sale(A + " .m1", en(2.1) + 0.1, 0.15); entra(A + " .m2", en(2.1) + 0.2, 0.35, {y: 60}, {y: 0});
      x.filas.forEach(([, , c1, cl], j) => { if (!c1) return; const tt = en(3.1 + (cl === "mas" ? 0.75 : 0)), y = 866 - 34 - 56 - 16 - (x.filas.length - j) * 60 + 28;
        toca(A, cl === "mas" ? 343 : 257, y, tt, s); sale(A + " .mq" + j + " .q0", tt + 0.05, 0.1); entra(A + " .mq" + j + " .q1", tt + 0.12, 0.3, {scale: 0.6}, {scale: 1, ease: "back.out(2.5)"}); tl.set(q(A + " .mq" + j + " .q1"), {position: "static"}, tt + 0.1);
        tl.to(q(A + " .mq" + j), {backgroundColor: cl === "mas" ? "#eef0e2" : "#f7e4e1", duration: 0.25}, tt + 0.1); if (cl === "menos") { entra(A + " .mq" + j + " .mel", tt + 0.2, 0.3); tl.to(q(A + " .mq" + j + " b"), {color: "#8a4a44", duration: 0.2}, tt + 0.1); } });
      tc = en(4.7); toca(A, 200, 804, tc, s); sale(A + " .m2, " + A + " .mvel", tc + 0.15, 0.25);
    }
    entra(A + " .t1", tc + 0.3, 0.3, {y: -14}, {y: 0}); sale(A + " .t1", tc + 0.85, 0.15); entra(A + " .t2", tc + 0.95, 0.3, {y: -14}, {y: 0});
    /* en el tablero: el fondo se desenfoca y se atenúa; sólo queda la solicitud con sus botones */
    tl.set(q(".so" + i + " div"), {autoAlpha: 1}, r + 7.3); entra(".pvelo", r + 7.4, 0.4); entra(".so" + i, r + 7.5, 0.45, {y: 30}, {y: 0, ease: "back.out(1.6)"});
    brazo("mesero", "brazos-cel", r + 8.1, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1, rotation: 0}, r + 8.1);
    corte(".cerca", ".sala", r + 8.3, 0.5); sale(A, r + 8.8, 0.01);
    tl.fromTo(q(".gm"), {x: 220, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out", immediateRender: false}, r + 8.4);
    habla(63 + i, r + 9.0, r + 10.7, "mesero", -5); mira(x.k === 0 ? -1 : 1, r + 8.9);
    toca(".agP", x.acepta ? 290 : 110, 450, r + 10.5); sale(".so" + i + " div", r + 10.6, 0.15); entra(".so" + i + " em", r + 10.7, 0.3, {scale: 0.6}, {scale: 1, ease: "back.out(2)"}); retira(".agP", r + 11.2);
    sale(".so" + i + ", .pvelo", r + 11.5, 0.3);
    if (x.responde) habla(66, r + 10.9, r + 12.1, quien, -5);
    tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.7, ease: "power2.in"}, r + 11.4); brazo(quien, sin, r + 11.6); });
  t += 48.2;
  brazo("mesero", "brazos-platos", t + 5.0, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1, rotation: 0}, t + 5.0);
  tl.fromTo(q(".gm"), {x: 220, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.9, ease: "power2.out", immediateRender: false}, t + 6.4);
  habla(70, t + 7.3, t + 8.6, "mesero", -5); inclina(".gm", -3, t + 7.4, 0.5); inclina(".gm", 0, t + 8.3, 0.5);
  entra(".k-platillo-a, .k-platillo-c", t + 7.7, 0.6, {y: -18}, {y: 0, stagger: 0.25}); brazo("mesero", "brazos-cel", t + 8.1, 0.3);
  cabeza("ana", 5, t + 7.6); cabeza("carlos", -5, t + 7.8);
  tl.set(q(".pserv .v0"), {autoAlpha: 1}, t + 8.3); tl.set(q(".pserv .v1, .pvr u svg"), {autoAlpha: 0}, t + 8.3); tl.set(q(".pvr u"), {backgroundColor: "rgba(0,0,0,0)"}, t + 8.3);
  entra(".pserv", t + 8.5, 0.45, {y: 40}, {y: 0}); cabeza("mesero", -8, t + 8.6);
  toca(".agP", 200, 797, t + 10.0); tl.to(q(".pvr u"), {backgroundColor: "#66713d", boxShadow: "inset 0 0 0 2px #66713d", duration: 0.2, stagger: 0.08}, t + 10.1); tl.to(q(".pvr u svg"), {autoAlpha: 1, duration: 0.2, stagger: 0.08}, t + 10.1);
  sale(".pserv .v0", t + 10.4, 0.15); entra(".pserv .v1", t + 10.55, 0.3); retira(".agP", t + 10.7);
  tl.to(q(".mnph .mnk"), {autoAlpha: 0, duration: 0.25}, t + 10.8); entra(".mnph .mns", t + 11.0, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)", stagger: 0.08});
  sale(".pserv", t + 11.6, 0.35); tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 11.3);
  t += 3.0;
  globo(8, t + 8.7, t + 10.5); inclina(".gA", 3, t + 8.7); inclina(".gA", 0, t + 10.4);
  gesto("ana", t + 8.8, 3, 12); cabeza("ana", -4, t + 8.8, 0.4); cabeza("ana", 2, t + 9.4, 0.4); cabeza("ana", -3, t + 10.0, 0.4);
  globo(9, t + 10.6, t + 12.3); inclina(".gC", -3, t + 10.6); inclina(".gC", 0, t + 12.2, 0.5);
  brazo("carlos", "brazo-copa", t + 10.3); pon(".k-copa-c", t + 10.35, false);
  tl.fromTo(q(".k-carlos-brazo-copa"), {rotation: 0}, {rotation: 14, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, t + 10.6);
  brazo("carlos", "brazo", t + 11.7); pon(".k-copa-c", t + 11.8, true); gesto("carlos", t + 11.9, 2, 10);
  brazo("ana", "brazo-copa", t + 10.9); pon(".k-copa-a", t + 10.95, false);
  tl.fromTo(q(".k-ana-brazo-copa"), {rotation: 0}, {rotation: -14, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, t + 11.2);
  brazo("ana", "brazo", t + 12.3); pon(".k-copa-a", t + 12.4, true);
  cabeza("sofia", 5, t + 9.0); cabeza("sofia", -3, t + 10.2); cabeza("diego", -5, t + 9.6); cabeza("diego", 3, t + 11.0);
  habla(45, t + 12.6, t + 14.2, "sofia", -5); inclina(".gS", 2, t + 12.6); inclina(".gS", 0, t + 14.0);
  /* 14 · las cuentas se cierran una por una, con la mesa todavía abierta: cada quien saca su teléfono y la lupa enseña lo que hace */
  const accion = (i, t0, t1, tp) => { entra(".lu6", t0, 0.45, {scale: 0.5}, {scale: 1, ease: "back.out(1.5)"}); pon(".lq.q" + i, t0, true); tl.to(q(".lq.q" + i + " .lb"), {scale: 0.9, duration: 0.13, yoyo: true, repeat: 1}, tp);
    if (ACCIONES[i][3]) entra(".lq.q" + i + " em", tp + 0.25, 0.35, {y: 8}, {y: 0}); sale(".lu6", t1, 0.3); pon(".lq.q" + i, t1 + 0.31, false); };
  const cerro = (n, tt) => { entra(".pcc .pd" + n, tt, 0.35, {scale: 0.3}, {scale: 1, ease: "back.out(3)"}); tl.to(q(".mn" + n + " .mns"), {autoAlpha: 0, duration: 0.2}, tt); entra(".mn" + n + " .mnc", tt + 0.15, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2.4)"}); };
  t = T("cierres");
  tl.to(q(".k-platillo-a, .k-platillo-c, .k-montaje"), {autoAlpha: 0, duration: 0.5}, t); entra(".k-sucia-a, .k-sucia-c", t, 0.5);
  entra(".pcc", t + 0.4, 0.4);
  brazo("ana", "brazo-cel", t + 0.4); habla(46, t + 0.5, t + 2.4, "ana", -5);
  /* en primer plano: la pantalla de seguimiento entera, en la mano de quien la usa; el tablero se queda a la derecha */
  const primer = (A, t0, t1) => { tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200, scaleX: 1.5}, t0); tl.set(q(A + " .qS, " + A + " .sgb"), {autoAlpha: 1}, t0); tl.set(q(A + " .sgw, " + A + " .sgt"), {autoAlpha: 0}, t0);
    corte(".sala", ".cerca", t0, 0.6); tl.fromTo(q(A), {...PS, autoAlpha: 0, y: PS.y + 200}, {...PS, autoAlpha: 1, duration: 0.9, ease: "power3.out", immediateRender: false}, t0); entra(A + " .nom", t0 + 0.7, 0.4);
    corte(".cerca", ".sala", t1, 0.6); sale(A, t1 + 0.6, 0.01); };
  primer(".agZ", t + 2.9, t + 7.0);
  toca(".agZ", 200, 800, t + 5.2); tl.to(q(".agZ .sb2"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, t + 5.2);
  sale(".agZ .sgb", t + 5.4, 0.25); entra(".agZ .sgw", t + 5.6, 0.4, {y: 12}, {y: 0}); cerro(0, t + 5.7); brazo("ana", "brazo", t + 6.8);
  t += 4.3;
  brazo("diego", "brazos-cel", t + 3.7); habla(47, t + 3.8, t + 5.7, "diego", 5);
  accion(1, t + 4.3, t + 6.2, t + 5.2);
  brazo("carlos", "brazo-cel", t + 6.3); habla(48, t + 6.4, t + 8.1, "carlos", 6);
  primer(".agZ2", t + 8.2, t + 11.2);
  toca(".agZ2", 200, 734, t + 9.6, -1); tl.to(q(".agZ2 .sgb .sb1:nth-child(2)"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, t + 9.6);
  entra(".agZ2 .sgt", t + 9.9, 0.4, {y: -12}, {y: 0}); brazo("carlos", "brazo", t + 11.0);
  t += 2.8;
  habla(49, t + 9.2, t + 11.2, "diego", 5);
  { const p0 = GT[49] ? GT[49][0] : t + 9.2; /* Javier ya viene con el pastel cuando Diego lo anuncia */
    brazo("mesero", "brazos", p0 - 0.5, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1, rotation: 0}, p0 - 0.5);
    tl.fromTo(q(".gm"), {x: 220, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out", immediateRender: false}, p0 - 0.4);
    inclina(".gm", -3, p0 + 0.3, 0.4); inclina(".gm", 0, p0 + 1.0, 0.4);
    entra(".k-pastel", p0 + 0.5, 0.6, {y: -18}, {y: 0});
    tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.7, ease: "power2.in"}, p0 + 1.3); }
  { const c0 = GT[76] ? GT[76][0] : t + 12.9, c1 = Math.max(GT[76] ? GT[76][1] : c0 + 2.2, GT[77] ? GT[77][1] : 0, GT[78] ? GT[78][1] : 0), vueltas = 2 * Math.max(2, Math.round((c1 - c0) / 0.56)) - 1;
    habla(76, c0, c1, "ana", -6); habla(77, c0 + 0.3, c1, "carlos", 6); habla(78, c0 + 0.6, c1, "diego", 5);
    brazo("ana", "brazo-copa", c0 - 0.1); brazo("carlos", "brazo-copa", c0); brazo("diego", "brazos", c0 - 0.1);
    tl.fromTo(q(".k-ana-brazo-copa, .k-carlos-brazo-copa"), {y: 0}, {y: -22, duration: 0.28, yoyo: true, repeat: vueltas, ease: "sine.inOut", immediateRender: false}, c0 + 0.1);
    tl.fromTo(q(".k-diego-brazos"), {y: 0, rotation: 0}, {y: -16, rotation: 3, duration: 0.28, yoyo: true, repeat: vueltas, ease: "sine.inOut", immediateRender: false}, c0 + 0.2);
    ["ana", "carlos", "diego"].forEach((n, j) => rie(n, c0 + 0.2 + j * 0.15, vueltas));
    inclina(".gA", 3, c0, 0.4); inclina(".gC", -3, c0 + 0.1, 0.4); inclina(".gA, .gC", 0, c1, 0.5);
    brazo("ana", "brazo", c1 + 0.3); brazo("carlos", "brazo", c1 + 0.35); brazo("diego", "brazos-cel", c1 + 1.2);
    tl.to(q(".k-copa-a, .k-copa-c"), {autoAlpha: 0, duration: 0.15}, c0 - 0.1); tl.to(q(".k-copa-a, .k-copa-c"), {autoAlpha: 1, duration: 0.15}, c1 + 0.35); /* la copa está en su mano mientras brindan */
    const s0 = GT[50] ? GT[50][0] : c1 - 0.4, s1 = GT[50] ? GT[50][1] : s0 + 2.2;
    habla(50, s0, s1, "sofia", -5); rie("sofia", s1 - 0.9, 5); tl.fromTo(q(".k-sofia-brazos"), {y: 0}, {y: -10, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false}, s0 + 0.1); }
  t += 2.8; /* la mesa le canta a Sofía antes de que los demás cierren */
  /* los demás cierran uno por uno, cada quien en primer plano; las miniaturas siguen a la vista y la suya pasa a «Cuenta cerrada» */
  const cierra = (A, n, t0) => { primer(A, t0, t0 + 3.0); toca(A, 200, 800, t0 + 1.7, A === ".agZ2" ? -1 : 1); tl.to(q(A + " .sb2"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, t0 + 1.7);
    sale(A + " .sgb", t0 + 1.9, 0.25); entra(A + " .sgw", t0 + 2.1, 0.4, {y: 12}, {y: 0}); cerro(n, t0 + 2.2); };
  brazo("sofia", "brazos-cel", t + 15.0); cierra(".agZ3", 1, t + 15.3); brazo("sofia", "brazos", t + 18.4);
  cierra(".agZ4", 2, t + 19.0); brazo("diego", "brazos", t + 22.1); brazo("carlos", "brazo-cel", t + 22.2);
  habla(32, t + 22.4, t + 24.3, "carlos", 6); inclina(".gC", -3, t + 22.4); inclina(".gC", 0, t + 24.2);
  habla(33, t + 24.4, t + 25.6, "ana", -5);
  cierra(".agZ2", 3, t + 25.8); fase(1, t + 28.3); sale(".pcc", t + 29.0, 0.3); brazo("carlos", "brazo", t + 28.9);
  /* con las cuatro cerradas, las miniaturas se juntan y desaparecen */
  [0, 1, 2, 3].forEach(k => tl.to(q(".mn" + k), {x: (1.5 - k) * 108, duration: 0.5, ease: "power2.in"}, t + 29.3)); tl.to(q(".mnrow"), {scale: 0.3, autoAlpha: 0, duration: 0.4, ease: "back.in(1.6)"}, t + 29.8);
  /* 14c · la cuenta de cada quien, en cuadrícula: el seguimiento se va y entra «Mi cuenta»; invitan a Sofía y su cuenta se reparte entre 1, entre 2 y entre 3 */
  t = T("cuenta");
  tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200, scaleX: 1.5}, t);
  corte(".sala", ".cerca", t, 0.7); t -= 0.4;
  QUIEN.forEach((_, k) => { tl.set(q(".cq" + k), {...GEO(k), x: 0, y: 0, overflow: "hidden", clearProps: "background,boxShadow"}, t); tl.set(q(".agQ" + k + " .qE, .agQ" + k + " .qK"), {autoAlpha: 0}, t); tl.set(q(".agQ" + k + " .qS, .agQ" + k + " .sgw"), {autoAlpha: 1}, t); tl.set(q(".agQ" + k + " .sgb"), {autoAlpha: 0}, t); tl.set(q(".agQ" + k), {...PQ(k), autoAlpha: 1}, t);
    entra(".cq" + k, t + 2.9 + k * 0.12, 0.6, {y: 40}, {y: 0, ease: "power3.out"}); });
  QUIEN.forEach((_, k) => pantalla(".agQ" + k + " .qC", t + 4.3 + k * 0.15, 0.45));
  tl.to(q(".agQ .qin"), {y: -150, duration: 0.9, ease: "power2.inOut", stagger: 0.1}, t + 5.0);
  QUIEN.forEach((_, k) => { const tt = t + 5.9 + k * 0.15; toque(".agQ" + k, 359, 114, tt); tl.fromTo(q(".agQ" + k + " .qlk"), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)", stagger: 0.25, immediateRender: false}, tt + 0.05); });
  entra(".dvv", t + 2.9, 0.7, {scaleY: 0}, {scaleY: 1, ease: "power2.out"}); entra(".dvh", t + 3.1, 0.7, {scaleX: 0}, {scaleX: 1, ease: "power2.out"});
  entra(".ctt", t + 3.2, 0.4); entra(".celda .w0", t + 3.4, 0.4, {y: 10}, {y: 0});
  tl.fromTo(q(".agQ .cpc.on"), {scale: 1}, {scale: 1.3, duration: 0.25, yoyo: true, repeat: 1, stagger: 0.2, immediateRender: false}, t + 6.5);
  const dice = (k, t0, t1) => { const g = GT["q" + k]; if (g) { t0 = g[0]; if (g[2]) t1 = g[1]; } entra(".gq" + k, t0, 0.45, {scale: 0.6}, {scale: 1, ease: "back.out(1.5)"}); if (t1) sale(".gq" + k, t1, 0.25); };
  /* la cifra viaja por su tubería, tramo a tramo */
  const viaja = (sel, pts, t0, d = 0.65) => { tl.set(q(sel), {x: pts[0][0], y: pts[0][1]}, t0 - 0.01); entra(sel, t0, 0.25, {scale: 0.5}, {scale: 1});
    pts.slice(1).forEach((p, j) => tl.to(q(sel), {x: p[0], y: p[1], duration: d, ease: "power1.inOut"}, t0 + 0.25 + j * d)); const fin = t0 + 0.25 + (pts.length - 1) * d; sale(sel, fin, 0.2, {scale: 0.5}); return fin; };
  const tubo = (c, tt) => tl.to(q(".rp" + c), {strokeDashoffset: 0, duration: 0.7, ease: "power2.out"}, tt);
  tl.set(q(".repa path"), {strokeDasharray: 900, strokeDashoffset: 900}, 0);
  /* al llegar la cifra, cambian la parte de Sofía y el total de esa persona */
  const suma = (k, n, tt) => { tl.to(q(".cq" + k + " .vt i:not(.w" + n + "), .cq" + k + " .vp i:not(.w" + n + ")"), {autoAlpha: 0, duration: 0.15}, tt); entra(".cq" + k + " .w" + n, tt + 0.15, 0.4, {y: 12}, {y: 0, ease: "back.out(2)"});
    if (k !== 1) { tl.to(q(".agQ" + k + " .cpar u:not(.w" + n + "), .agQ" + k + " .ktot i:not(.w" + n + ")"), {autoAlpha: 0, duration: 0.15}, tt); entra(".agQ" + k + " .cpar .w" + n + ", .agQ" + k + " .ktot .w" + n, tt + 0.15, 0.4, {scale: 0.7}, {scale: 1, ease: "back.out(2)"}); } };
  const invita = (k, tt) => { const yk = 292 + (QUIEN[k][4].length - 2) * 48, Z = 1.3, A = ".agQ" + k; /* la tarjeta «Invitar a Sofía» baja un renglón por platillo */
    tl.to(q(".cq" + k + " .ctt"), {autoAlpha: 0, duration: 0.25}, tt - 1.15);
    tl.to(q(A), {scale: Z * PQ(k).scale / 0.43, x: 330 - 200 * Z, y: 150 - yk * Z, duration: 0.5, ease: "power3.inOut"}, tt - 1.1);
    toque(A, 271, yk, tt); entra(A + " .qsel", tt + 0.05, 0.3, {scale: 0.6}, {scale: 1, ease: "back.out(2)"}); tl.to(q(A + " .qp"), {color: "#fff", duration: 0.2}, tt + 0.05);
    tl.set(q(A + " .cpar u"), {autoAlpha: 0}, tt + 0.25); tl.set(q(A + " .cpar .w" + ENTRA[k]), {autoAlpha: 1}, tt + 0.28); entra(A + " .cinv", tt + 0.3, 0.35, {x: -12}, {x: 0});
    tl.to(q(A), {...PQ(k), duration: 0.5, ease: "power3.inOut"}, tt + 0.8); tl.to(q(".cq" + k + " .ctt"), {autoAlpha: 1, duration: 0.3}, tt + 1.15); return tt + 0.9; };
  const centro = (n, tt) => { if (n > 1) sale(".cnt4 .w" + (n - 1), tt, 0.15); entra(".cnt4 .w" + n, tt + 0.15, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2.4)"}); if (n > 1) tl.fromTo(q(".cnt4"), {scale: 1}, {scale: 1.12, duration: 0.2, yoyo: true, repeat: 1, immediateRender: false}, tt); };
  const reparte = (n, tt) => { let fin = tt; [0, 2, 3].filter(k => ENTRA[k] <= n).forEach(k => { tl.set(q(".vj" + k + " i"), {autoAlpha: 0}, tt - 0.02); tl.set(q(".vj" + k + " .w" + n), {autoAlpha: 1}, tt - 0.01); fin = viaja(".vj" + k, TUBO[k], tt); suma(k, n, fin); }); return fin; };
  /* entre 1 · Ana invita: los $180 de Sofía salen de su total, van al centro y de ahí al total de Ana */
  /* el toque cae al final de su frase y la cifra sale cuando el teléfono vuelve a su lugar, a tiempo para «entre uno», «entre dos» y «entre tres» */
  dice(0, t + 7.4); const s1 = invita(0, t + 9.6);
  tubo("s", s1); suma(1, 1, s1 + 0.3); const c1 = viaja(".vjs", TUBO.s, s1 + 0.2);
  entra(".cnt4", c1 - 0.2, 0.5, {scale: 0.4}, {scale: 1, ease: "back.out(1.8)"}); centro(1, c1); tubo(1, c1 + 0.5); reparte(1, c1 + 0.9);
  entra(".qinvS", s1 + 0.5, 0.5, {y: 14, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.7)"}); tl.to(q(".agQ1 .cv0"), {autoAlpha: 0, duration: 0.2}, s1 + 0.6); entra(".agQ1 .cv1", s1 + 0.75, 0.5, {scale: 0.5}, {scale: 1, ease: "back.out(2.6)"});
  /* entre 2 · Diego: el centro cambia a 90 y 90, y cada mitad viaja por su línea */
  dice(2, t + 14.8); const s2 = invita(2, t + 15.95); centro(2, s2); tubo(2, s2 + 0.3); reparte(2, s2 + 0.9);
  /* entre 3 · Carlos: 60, 60 y 60 */
  dice(3, t + 19.8); const s3 = invita(3, t + 20.9); centro(3, s3); tubo(3, s3 + 0.3); reparte(3, s3 + 0.9);
  /* Sofía agradece; después, sólo la fiesta */
  dice(1, t + 25.9, t + 29.5); entra(".gqf", t + 29.7, 0.6, {scale: 0.3, rotation: -20}, {scale: 1, rotation: 0, ease: "back.out(2.2)"});
  /* todos validan su total: aparece «Llamar al mesero» y lo tocan */
  entra(".agQ .qll", t + 30.0, 0.4, {y: 20}, {y: 0, stagger: 0.08});
  QUIEN.forEach((_, k) => toque(".agQ" + k, 200, 800, t + 31.2 + k * 0.12)); tl.to(q(".agQ .qll"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1, stagger: 0.12}, t + 31.2);
  /* 15 · pagada: pagan fuera de Carta (la terminal del restaurante) y el mesero valida el pago en su teléfono */
  t = T("pagada");
  brazo("ana", "brazo", t, 0.01); brazo("carlos", "brazo", t, 0.01); brazo("sofia", "brazos", t, 0.01); brazo("diego", "brazos", t, 0.01);
  corte(".cerca", ".sala", t, 0.7); sale(".cnt4, .gq, .gqf, .dvc, .vj", t + 0.2, 0.3); sale(".agQ, .celda, .ctt", t + 0.7, 0.01); tl.set(q(".repa path"), {strokeDashoffset: 900}, t + 0.7);
  brazo("ana", "brazo", t + 0.2); brazo("carlos", "brazo", t + 0.3); brazo("sofia", "brazos", t + 0.25); brazo("diego", "brazos", t + 0.35); cabeza("ana", -4, t + 0.3); cabeza("carlos", 4, t + 0.4);
  /* cada quien paga a su manera; en el tablero, «n de 4 comensales pagaron» hasta completar. Los momentos salen de las frases (GT) */
  const g0 = (k, d) => GT[k] ? GT[k][0] : t + d, g1 = (k, d) => GT[k] ? GT[k][1] : t + d;
  const pagaron = (n, tt) => { tl.to(q(".ppg .pn i, .ppg .pm i"), {autoAlpha: 0, duration: 0.15}, tt); entra(".ppg .w" + n, tt + 0.15, 0.35, {y: 8}, {y: 0, ease: "back.out(2)"});
    tl.to(q(".ppg .pbar u"), {scaleX: PAGAN.slice(0, n).reduce((a, k) => a + totalDe(k, 3), 0) / PAGAN.reduce((a, k) => a + totalDe(k, 3), 0), duration: 0.55, ease: "back.out(1.4)"}, tt + 0.1); };
  tl.set(q(".ppg .pbar u"), {scaleX: 0}, t); tl.set(q(".ppg .pinv, .ppg .pm"), {autoAlpha: 1}, t); tl.to(q(".pnota .n1, .pbt.b1"), {autoAlpha: 0, duration: 0.3}, t + 0.6); entra(".ppg", t + 0.8, 0.4, {y: 14}, {y: 0}); pagaron(1, t + 0.9);
  /* Ana: la terminal del restaurante. El mesero llega hasta su lado */
  const MA = -590, tA = g0(25, 2.9), fA = g1(25, 5.3);
  brazo("mesero", "brazos-terminal", t, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: -1, rotation: 0}, t); tl.set(q(".g25"), {x: MA}, t);
  tl.fromTo(q(".gm"), {x: 220, autoAlpha: 0}, {x: MA, autoAlpha: 1, duration: 1.6, ease: "power2.inOut", immediateRender: false}, t + 0.2);
  inclina(".gm", -3, tA, 0.6); globo(25, tA, fA); cabeza("ana", 6, tA + 0.2);
  tl.to(q(".k-ana-brazo"), {rotation: -20, duration: 0.45, ease: "power2.out"}, tA + 0.9);
  tl.fromTo(q(".buzz"), {autoAlpha: 0, scale: 0.5, x: 180, y: 0}, {autoAlpha: 1, scale: 1.1, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, tA + 1.5);
  tl.to(q(".k-ana-brazo"), {rotation: 0, duration: 0.45, ease: "power2.inOut"}, tA + 2.1); pagaron(2, tA + 1.9); inclina(".gm", 0, fA, 0.5); cabeza("ana", 0, fA);
  /* Diego: transferencia. En su teléfono, los datos del restaurante */
  const tD = g0(79, 5.6), tC = g0(80, 11.7), d0 = g1(79, 7.2) + 0.1, d1 = Math.max(d0 + 4.2, tC - 0.5), dd = d1 - d0, AT = ".agT";
  brazo("diego", "brazos-cel", tD - 0.1); habla(79, tD, g1(79, 7.2), "diego", 5);
  tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200, scaleX: 1.5}, d0); tl.set(q(AT + " .tM"), {autoAlpha: 1}, d0); tl.set(q(AT + " .tD, " + AT + " .tav, " + AT + " .c1"), {autoAlpha: 0}, d0); tl.set(q(AT + " .c0"), {autoAlpha: 1}, d0);
  corte(".sala", ".cerca", d0, 0.5); tl.fromTo(q(AT), {...PS, autoAlpha: 0, y: PS.y + 200}, {...PS, autoAlpha: 1, duration: 0.7, ease: "power3.out", immediateRender: false}, d0); entra(AT + " .nom", d0 + 0.5, 0.3);
  toca(AT, 200, 474, d0 + 0.2 * dd); pantalla(AT + " .tD", d0 + 0.2 * dd + 0.15, 0.4);
  toca(AT, 200, 534, d0 + 0.44 * dd); sale(AT + " .c0", d0 + 0.44 * dd + 0.05, 0.12); entra(AT + " .c1", d0 + 0.44 * dd + 0.15, 0.3, {scale: 0.8}, {scale: 1, ease: "back.out(2)"});
  const ty = d0 + 0.62 * dd, tx = Math.min(ty + 1.15, d1 - 0.55);
  toca(AT, 200, 800, ty); tl.to(q(AT + " .tya"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, ty); entra(AT + " .tav", ty + 0.2, 0.3, {y: -14}, {y: 0});
  /* en el Tablero aparece «Validar transferencia» y Javier lo toca: ahí sube el contador */
  sale(".ppg .pinv, .ppg .pm", ty + 0.2, 0.2); entra(".ppg .pv0", ty + 0.35, 0.35, {y: 14}, {y: 0, ease: "back.out(1.8)"});
  toca(A, 200, 808, tx); tl.to(q(".ppg .pv0"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, tx); retira(A, tx + 0.7); pagaron(3, tx + 0.15); sale(".ppg .pv0", tx + 0.35, 0.2);
  tl.set(q(".gm"), {x: 0, rotation: 0}, d0 + 1); brazo("mesero", "brazos", d0 + 1, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1}, d0 + 1);
  corte(".cerca", ".sala", d1, 0.5); sale(AT, d1 + 0.5, 0.01); brazo("diego", "brazos", d1 + 0.4);
  /* Carlos: efectivo. Entrega los billetes y Javier los valida en su teléfono */
  const tV = g0(81, 13.6), fV = g1(81, 17.0), tv = Math.max(tV + 1.2, fV - 0.75), tG = Math.max(g0(7, 17.6), tv + 1.0);
  habla(80, tC, g1(80, 13.3), "carlos", 6); tl.to(q(".k-carlos-brazo"), {rotation: 16, duration: 0.45, ease: "power2.out"}, tC + 0.6);
  tl.fromTo(q(".bill"), {autoAlpha: 0, x: 0, y: 0, rotation: -8, scale: 0.7}, {autoAlpha: 1, scale: 1, duration: 0.3, immediateRender: false}, tC + 0.8);
  tl.to(q(".bill"), {x: 46, y: -96, rotation: 6, duration: 0.6, ease: "power2.inOut"}, tC + 1.2); sale(".bill", tC + 1.85, 0.25, {scale: 0.7});
  tl.to(q(".k-carlos-brazo"), {rotation: 0, duration: 0.45, ease: "power2.inOut"}, tC + 1.9);
  entra(".ppg .pv1", tC + 1.5, 0.4, {y: 14}, {y: 0, ease: "back.out(1.8)"});
  brazo("mesero", "brazos-cel", tV - 0.3, 0.3); tl.to(q(".k-mesero-cabeza"), {scaleX: -1, duration: 0.3, ease: "power1.inOut"}, tV - 0.3); cabeza("mesero", -8, tV - 0.2); globo(81, tV, fV);
  toca(A, 200, 808, tv); tl.to(q(".ppg .pv1"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, tv); retira(A, tv + 0.9); pagaron(4, tv + 0.15);
  sale(".ppg", tv + 0.75, 0.25); fase(2, tv + 0.8);
  entra(".ePago", tv + 1.3, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  mira(-1, tG - 0.3); tl.to(q(".k-mesero-cabeza"), {scaleX: 1, duration: 0.3, ease: "power1.inOut"}, tG - 0.3); globo(7, tG, g1(7, 19.8)); cabeza("mesero", 0, tG);
  /* 15b · factura (visión, fuera de la v1): se pide desde la app y la emite el restaurante. Toma suelta: quitar su renglón de TOMAS la saca sin mover lo demás */
  if (TOMAS.some(x => x[0] === "factura")) {
    t = T("factura"); sale(".ePago", t, 0.3);
    habla(51, t + 0.4, t + 1.9, "ana", -5); mira(-1, t + 0.5); cabeza("mesero", 0, t + 0.5);
    habla(52, t + 2.1, t + 4.3, "mesero", -5);
    brazo("ana", "brazo-cel", t + 2.6);
    accion(6, t + 3.1, t + 6.6, t + 4.4); brazo("ana", "brazo", t + 6.5);
  }
  /* 16 · mesa sucia: se van, un vaso se cae; la cámara se acerca y el mesero retira todo */
  t = T("sucia");
  globo(53, t + 0.1, t + 1.4); cabeza("ana", -5, t + 0.1); cabeza("carlos", 5, t + 0.3); t += 1.0;
  sale(".ePago", t, 0.3);
  tl.to(q(".gA"), {x: -150, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 0.1);
  tl.to(q(".gC"), {x: 150, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 0.3);
  tl.to(q(".gS, .gD"), {y: 40, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 0.2); sale(".k-pastel", t + 0.2, 0.5);
  tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 0.2);
  tl.to(q(".k-copa-a"), {rotation: -78, duration: 0.45, ease: "power2.in"}, t + 0.7);
  sale(".k-copa-a", t + 1.1, 0.15); entra(".k-sucia-vaso", t + 1.05, 0.5); entra(".k-sucia-migas", t + 0.4, 0.4);
  cam(t + 0.6, CSUC, 1.6);
  sale(".k-sucia-a, .k-sucia-c", t + 5.2, 0.6); sale(".k-sucia-vaso, .k-sucia-migas", t + 5.5, 0.6);
  /* 17 · mesa limpia: la monta de nuevo, toca «Marcar mesa limpia» y la mesa queda libre; el QR se enciende y llegan otros dos */
  t = T("limpia");
  tl.set(q(".k-copa-a"), {rotation: 0}, t);
  entra(".k-montaje", t + 0.1, 0.5, {y: -14}, {y: 0}); entra(".k-copa-a", t + 0.4, 0.4, {y: -14}, {y: 0});
  brazo("mesero", "brazos-cel", t, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: -1, rotation: 0}, t);
  tl.fromTo(q(".gm"), {x: 220, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out", immediateRender: false}, t + 0.3); cabeza("mesero", -8, t + 1.0);
  pulsa(2, t + 1.7); fase(3, t + 1.8);
  [0, 1, 2, 3].forEach(k => tl.to(q(`.ps${k} .pok`), {x: 150, y: (1.5 - k) * 96, scale: 1.3, duration: 0.55, ease: "power2.in"}, t + 2.7));
  tl.to(q(".pista .pok"), {autoAlpha: 0, duration: 0.15}, t + 3.2); entra(".pgran", t + 3.2, 0.45, {scale: 0.4}, {scale: 1, ease: "back.out(2.2)"}); sale(".pgran", t + 4.2, 0.35, {scale: 0.6});
  tl.set(q(".pista .pok"), {x: 0, y: 0, scale: 1}, t + 3.4);
  tl.fromTo(q(".ps0 .pbg"), {autoAlpha: 0, scale: 0.94}, {autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)", immediateRender: false}, t + 4.4);
  tl.fromTo(q(".ps0 .pca"), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.5)", immediateRender: false}, t + 4.45);
  t += 1.8;
  pulsoQR(t + 3.1, 2);
  entra(".eLibre", t + 3.3, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 3.7);
  cam(t + 4.0, C1, 2.2);
  tl.to(q(".pip"), {autoAlpha: 0, x: 60, duration: 0.6, ease: "power2.in"}, t + 4.3);
  sale(".eLibre", t + 4.3, 0.3); sale(".reloj", t + 5.2, 0.4);
  tl.fromTo(q(".k-nuevos"), {autoAlpha: 0, x: -360}, {autoAlpha: 1, x: 0, duration: 1.9, ease: "power2.out", immediateRender: false}, t + 4.6);
  /* cierre */
  t = T("fin");
  sale(".sala", t + 0.1, 0.9);
  tl.set(q(".marca"), {autoAlpha: 1}, t + 1.1);
  tl.fromTo(q(".marca b, .marca i, .marca span"), {y: 24, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 1.0, ease: "power3.out", stagger: 0.3, immediateRender: false}, t + 1.1);
  tl.set({}, {}, TOT);
  return tl;
}

function cerrarIntro() { cancelAnimationFrame(rafI); if (vozAct) vozAct.pause(); $("#intro").hidden = true; document.body.style.overflow = ""; try { localStorage.setItem("carta-v9-intro", "1"); } catch (e) { /* ignorar */ } }
function pintaIntro() {
  const s = tI / 1000;
  if (tlF) tlF.time(s, false);
  const av = $("#intro .barras i b"); if (av) av.style.width = (100 * s / TOT) + "%";
  const bp = $("#introPausa"); if (bp) bp.textContent = pausaI ? "▶" : "❚❚";
  const cta = $("#introCta"); if (cta) cta.hidden = s < tomaIni("fin") + 2.6;
  vozSync();
}
function irActo(k) { vozSalto = true; tI = (REDUCE ? CLAVES[TOMAS.findIndex(t => t[1] === ACTOS[k][0])] : ACT_INI[k]) * 1000; pintaIntro(); }
function saltaI(ms) {
  vozSalto = true;
  if (REDUCE) { let e = 0; CLAVES.forEach((c, i) => { if (tI / 1000 >= c - 0.01) e = i; }); e = clamp(e + (ms > 0 ? 1 : -1), 0, TOMAS.length - 1); tI = CLAVES[e] * 1000; }
  else tI = clamp(tI + ms, 0, TOTI - 1);
  pintaIntro();
}
function muestraControles() { const el = $("#intro"); if (!el) return; el.classList.remove("quieto"); clearTimeout(ocultoT); ocultoT = setTimeout(() => el.classList.add("quieto"), 2600); }
function frameIntro(ts) {
  if ($("#intro").hidden) return;
  if (!pausaI) { tI += clamp(ts - ultI, 0, 100); if (tI >= TOTI) { tI = TOTI - 1; pausaI = true; } }
  ultI = ts; pintaIntro(); rafI = requestAnimationFrame(frameIntro);
}
function abrirIntro() {
  if (!$("#cineCss")) { const st = document.createElement("style"); st.id = "cineCss"; st.textContent = cineCss; document.head.appendChild(st); }
  const el = $("#intro");
  el.innerHTML = `${cineHtml()}<div id="introPuerta" class="ipuerta" hidden><button class="ipv" data-intro="consonido" autofocus>▶ Ver con sonido</button><button class="ips" data-intro="sinsonido">Ver sin sonido</button></div><div id="introCta" class="icta" hidden><button class="btn" data-intro="repetir">↻ Repetir</button><button class="btn gran" data-intro="saltar">Ver el informe</button></div>` +
    `<div class="ictl"><button class="btn" data-intro="saltar">Saltar ✕</button></div><div class="barras ictl"><i><b></b></i><button class="btn" data-intro="menos" aria-label="Atrás 3 segundos">−3 s</button><button class="btn" id="introPausa" data-intro="pausa" aria-label="Pausa o reanudar">❚❚</button><button class="btn" data-intro="mas" aria-label="Adelante 3 segundos">+3 s</button><button class="btn" id="introSon" data-intro="sonido" aria-label="Sonido">🔇</button>${BTN_PANTALLA}</div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; filmEscala();
  if (tlF) tlF.kill(); tlF = filmLinea();
  tI = REDUCE ? CLAVES[0] * 1000 : 0; pausaI = REDUCE;
  /* con voz, la película espera en su primer cuadro tras una puerta: el sonido sólo puede empezar con un gesto y no debe perderse el arranque.
     Si la página ya recibió un gesto (se reabre desde el informe), arranca con sonido directo. */
  const yaHuboGesto = !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
  puertaI = HAY_VOZ && !REDUCE && !yaHuboGesto; if (HAY_VOZ && !REDUCE && yaHuboGesto) vozLibre = true;
  if (puertaI) { pausaI = true; tI = 3000; /* de fondo, la mesa ya encendida con su título (la toma «mesa» a los 3 s); al elegir vuelve a 0 */ $("#introPuerta").hidden = false; $("#introPuerta .ipv").focus(); }
  ultI = performance.now(); pintaIntro(); muestraControles();
  cancelAnimationFrame(rafI); rafI = requestAnimationFrame(frameIntro);
  el.onpointermove = muestraControles; vozBoton();
  el.onclick = ev => {
    muestraControles(); const b = ev.target.closest("[data-intro]");
    if (puertaI) { /* con la puerta puesta sólo cuentan sus dos botones y «Saltar» */
      const a = b && b.dataset.intro; if (a === "saltar") cerrarIntro();
      else if (a === "consonido" || a === "sinsonido") { vozOn = a === "consonido"; vozLibre = true; vozSalto = true; tI = 0; pausaI = false; puertaI = false; $("#introPuerta").hidden = true; ultI = performance.now(); vozBoton(); pintaIntro(); }
      return; }
    vozLibre = true; /* el navegador sólo deja sonar después de un gesto */
    if (!b) { if (!ev.target.closest("button, .icta")) { pausaI = !pausaI; pintaIntro(); } return; } /* un clic en cualquier parte pausa o reanuda */
    const a = b.dataset.intro;
    if (a === "saltar") cerrarIntro();
    else if (a === "repetir") { vozSalto = true; tI = REDUCE ? CLAVES[0] * 1000 : 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro(); }
    else if (a === "pausa") { pausaI = !pausaI; pintaIntro(); }
    else if (a === "sonido") { vozOn = !vozOn; vozBoton(); pintaIntro(); }
    else if (a === "menos") saltaI(-3000); else if (a === "mas") saltaI(3000);
  };
}
window.addEventListener("resize", filmEscala);
document.addEventListener("fullscreenchange", () => setTimeout(filmEscala, 60));
document.addEventListener("keydown", e => {
  if ($("#intro").hidden || puertaI) return; /* con la puerta puesta, Enter o espacio sobre su botón ya hacen de clic */
  muestraControles(); vozLibre = true;
  if (e.key === "ArrowLeft") saltaI(-3000); else if (e.key === "ArrowRight") saltaI(3000);
  else if (/^[1-9]$/.test(e.key) && +e.key <= ACTOS.length - 1) irActo(+e.key - 1);
  else if (e.key === " " && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); pausaI = !pausaI; pintaIntro(); }
});
