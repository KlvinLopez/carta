/* ===== la historia con scroll: cada capítulo ocupa la pantalla (pregunta, una visual grande, el hallazgo); el detalle, en «ver más» ===== */
const CAPS = [
  {id: "mercado2", q: "¿Cuántos negocios hay en México?"},
  {id: "linea", q: "¿Cuántos están en línea?"},
  {id: "pagar", q: "¿Cuánto puede pagar un restaurante por software?"},
  {id: "matriz", q: "¿Qué existe y a qué precio?"},
  {id: "precio", q: "¿Cuánto cobran ellos frente a nosotros?"},
  {id: "topes", q: "¿Qué damos nosotros por ese precio?"},
  {id: "disco", q: "¿Qué nos limita?"},
  {id: "sostiene", q: "¿Cómo se sostiene?"},
];
let capObs = null;
function montaCaps() {
  const host = $("#caps");
  host.innerHTML = CAPS.map((c, i) => `<section class="cap" id="cap-${c.id}" data-cap="${c.id}"><div class="capn">${i + 1}<small> de ${CAPS.length}</small></div><h2 class="capq">${esc(c.q)}</h2><div class="capley leyenda"></div><div class="capcuerpo"></div><p class="caphall insight"></p><details class="mas"><summary>Ver cifras, notas y fuentes</summary><div class="capcif"></div><p class="nota capnota"></p><div class="capfu"></div></details></section>`).join("");
  capObs = new IntersectionObserver(es => es.forEach(en => {
    const c = CAPS.find(x => x.id === en.target.dataset.cap); if (!c) return;
    c.visible = en.isIntersecting;
    if (en.isIntersecting) { if (!c.montado) montaCap(c); else if (c.sucio) pintaCap(c); }
  }), {rootMargin: "120px 0px 120px 0px"});
  CAPS.forEach(c => { c.sec = $("#cap-" + c.id); c.sucio = true; capObs.observe(c.sec); });
}
function montaCap(c) {
  const d = DET[c.id]; if (!d) return;
  c.montado = true; d.enCap = true;
  $(".capnota", c.sec).textContent = d.nota || "";
  $(".capfu", c.sec).innerHTML = d.fu ? fuentes(d.fu) : "";
  d.montar($(".capcuerpo", c.sec), c.sec);
  pintaCap(c);
  if (d.arranca) d.arranca();
}
function pintaCap(c) {
  const d = DET[c.id]; if (!d || !c.montado) return;
  c.sucio = false;
  const o = d.actualizar ? d.actualizar() : null; if (!o) return;
  if (o.cifras) $(".capcif", c.sec).innerHTML = cifras(o.cifras);
  if (o.leyenda) $(".capley", c.sec).innerHTML = o.leyenda;
  const h = $(".caphall", c.sec);
  h.innerHTML = o.puntos ? `<b>Hallazgo.</b> ${o.puntos[0]}` : o.insight ? `<b>Hallazgo.</b> ${esc(o.insight)}` : "";
}
function pintaCaps() { CAPS.forEach(c => { c.sucio = true; if (c.visible && c.montado) pintaCap(c); }); }
function irCap(id) { const s = $("#cap-" + id); if (s) s.scrollIntoView({behavior: REDUCE ? "auto" : "smooth", block: "start"}); }
