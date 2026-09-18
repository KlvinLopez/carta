// ═══════════════════════════════════════════════════════════
// COMENSAL · Flujo — P03 menú + PDF · P04 grupo · P05 checkout
// ═══════════════════════════════════════════════════════════
const { useState, useEffect, useMemo } = React;

// ═══ P03 · MENÚ COMPLETO ═══════════════════════════════════
const FullMenu = ({ go, onDish, order, setOrder, returnTo }) => {
  const [cat, setCat] = useState('Para ti');
  const [called, setCalled] = useState(false);
  useEffect(() => {
    if (called) { const t = setTimeout(() => setCalled(false), 5000); return () => clearTimeout(t); }
  }, [called]);
  const items = MENU_SEED.filter(d => d.active);
  const favId = items.reduce((a,b) => (b.orders||0) > (a.orders||0) ? b : a, items[0])?.id;
  const filtered = cat === 'Para ti' ? items.filter(d => d.chef || d.spice >= 2)
    : cat === 'Todas' ? items : items.filter(d => d.cat === cat);
  const total = order.reduce((s,o) => s + (MENU_SEED.find(m=>m.id===o.id)?.price||0) * o.qty, 0);
  const count = order.reduce((s,o) => s + o.qty, 0);
  const toggleDish = (dish) => setOrder(prev => prev.some(o=>o.id===dish.id)
    ? prev.filter(o=>o.id!==dish.id) : [...prev, {id:dish.id, qty:1}]);

  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      {/* Header glass sticky */}
      <div style={{ padding:'60px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <IconBtn name="arrow_back" onClick={() => go('ar')}/>
          <span style={{ fontFamily:serif, fontStyle:'italic', fontSize:21, color:C.primary }}>Carta</span>
          <div style={{ display:'flex', gap:8 }}>
            <IconBtn name="description" size={40} iconSize={19} onClick={() => go('pdf')}/>
            <button onClick={() => setCalled(true)} {...pressFx} title="Llamar al mesero" style={{ width:40, height:40,
              borderRadius:9999, border:'none', cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', background: called ? gradVino : 'rgba(29,28,23,0.06)',
              transition:'all 200ms' }}>
              <Icon name={called ? 'notifications_active' : 'notifications'} size={20} color={called ? 'white' : C.primary}/>
            </button>
          </div>
        </div>
        <div style={{ fontFamily:serif, fontSize:30, color:C.charcoal, letterSpacing:'-0.015em' }}>{RESTAURANT.name}</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
          Mesa {RESTAURANT.mesa}
          <span style={{ width:4, height:4, borderRadius:9999, background:C.dorado, display:'inline-block' }}/>
          <span onClick={() => go('group')} style={{ color:C.dorado, fontWeight:600, cursor:'pointer' }}>Sesión grupal activa</span>
        </div>
        <div style={{ marginTop:14, background:C.surfaceHigh, borderRadius:18, padding:'11px 16px',
          display:'flex', alignItems:'center', gap:10 }}>
          <Icon name="search" size={20} color={C.outline}/>
          <span style={{ fontSize:14, color:C.outline }}>Buscar platillos, ingredientes…</span>
          <Icon name="mic" size={18} color={C.outline} style={{ marginLeft:'auto' }}/>
        </div>
      </div>

      {/* Filtros */}
      <div className="hide-scroll" style={{ display:'flex', gap:8, padding:'14px 24px 4px', overflowX:'auto', flexShrink:0 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} {...pressFx} style={{ flexShrink:0, border:'none', cursor:'pointer',
            borderRadius:9999, padding:'8px 18px', fontSize:13.5, fontWeight:600, fontFamily:sans,
            background: cat===c ? (c==='Para ti' ? gradDorado : gradVino) : C.surfaceHigh,
            color: cat===c ? 'white' : C.muted, transition:'all 200ms',
            boxShadow: cat===c ? '0 6px 16px rgba(79,23,40,0.2)' : 'none' }}>
            {c === 'Para ti' ? '✦ Para ti' : c}
          </button>
        ))}
      </div>
      {cat === 'Para ti' && (
        <div style={{ padding:'8px 26px 0', fontSize:12, color:C.muted, flexShrink:0 }}>
          <span style={{ color:C.dorado, fontWeight:700 }}>✦</span> Según tus preferencias
        </div>
      )}

      {/* Lista */}
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'6px 24px 0' }}>
        {filtered.map(dish => {
          const inOrder = order.some(o => o.id === dish.id);
          return (
            <div key={dish.id} onClick={() => onDish(dish)} style={{ display:'flex', gap:14, padding:'16px 0', cursor:'pointer' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <Photo src={dish.photo} emoji={dish.emoji} radius={22} emojiSize={40} style={{ width:92, height:92 }}/>
                <div style={{ position:'absolute', top:-6, left:-6, display:'flex', flexDirection:'column', gap:5 }}>
                  {dish.chef && <div style={{ width:26, height:26, borderRadius:9999, background:'white',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 4px 12px rgba(29,28,23,0.16)' }}>
                    <Icon name="diamond" size={14} color={C.info} fill/>
                  </div>}
                  {dish.id === favId && <div style={{ width:26, height:26, borderRadius:9999, background:'white',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 4px 12px rgba(29,28,23,0.16)' }}>
                    <Icon name="star" size={15} color={C.dorado} fill/>
                  </div>}
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:serif, fontSize:17, color:C.primary, lineHeight:1.25 }}>{dish.name}</div>
                <div style={{ fontSize:13, color:C.muted, lineHeight:'19px', margin:'4px 0 8px',
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{dish.desc}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:16.5, fontWeight:700, color:C.charcoal }}>{fmt(dish.price)}</span>
                  <button onClick={e => { e.stopPropagation(); toggleDish(dish); }} {...pressFx} style={{
                    border:'none', cursor:'pointer', borderRadius:9999, width:36, height:36,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: inOrder ? gradVino : C.surfaceHigh,
                    boxShadow: inOrder ? '0 6px 14px rgba(79,23,40,0.3)' : 'none',
                    transition:'all 200ms cubic-bezier(0.22,1.4,0.36,1)' }}>
                    <Icon name={inOrder ? 'check' : 'add'} size={19} color={inOrder ? 'white' : C.muted}/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ height:110 }}/>
      </div>

      {/* Toast llamado al mesero */}
      {called && (
        <div className="pop-in" style={{ position:'absolute', left:20, right:20, bottom: count>0 ? 104 : 34, zIndex:70,
          background:C.charcoal, borderRadius:16, padding:'12px 14px 12px 16px', display:'flex', alignItems:'center', gap:11,
          boxShadow:'0 16px 40px rgba(0,0,0,0.3)' }}>
          <Icon name="room_service" size={18} color={C.doradoLight}/>
          <span style={{ flex:1, fontSize:13, color:'white' }}>Llamando a Carlos a tu mesa…</span>
          <button onClick={() => setCalled(false)} {...pressFx} style={{ background:'rgba(255,255,255,0.16)', border:'none',
            borderRadius:9999, padding:'7px 15px', fontSize:12.5, fontWeight:700, color:'white', cursor:'pointer', fontFamily:sans }}>
            Deshacer
          </button>
        </div>
      )}

      {/* Barra de orden */}
      {count > 0 && (
        <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 20px 30px',
          background:'rgba(254,249,241,0.9)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          boxShadow:'0px -16px 36px rgba(29,28,23,0.1)' }}>
          <Btn variant="primary" onClick={() => go(returnTo || 'group')} style={{ width:'100%', justifyContent:'space-between', fontSize:16 }}>
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Icon name="shopping_bag" size={19} color="white"/>
              {count} platillo{count>1?'s':''}
            </span>
            <span>{returnTo ? 'Volver a mi orden →' : fmt(total) + ' · revisar →'}</span>
          </Btn>
        </div>
      )}
    </div>
  );
};

// ═══ CARTA PDF EMBEBIDA ════════════════════════════════════
const PDFPage = ({ page }) => {
  const cats = ['Entradas','Platos fuertes','Postres','Bebidas'];
  const show = page === 1 ? cats.slice(0,2) : cats.slice(2);
  return (
    <div style={{ background:'white', borderRadius:6, padding:'34px 30px 30px', width:'100%',
      boxShadow:'0 12px 40px rgba(0,0,0,0.45)', color:'#2B2B2B', fontFamily:'Georgia, serif' }}>
      {page === 1 && (
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ fontSize:11, letterSpacing:'0.34em', textTransform:'uppercase', color:'#8A6508' }}>Cocina de origen</div>
          <div style={{ fontFamily:serif, fontSize:34, color:'#4F1728', margin:'6px 0 2px' }}>La Ceiba</div>
          <div style={{ fontSize:11.5, fontStyle:'italic', color:'#777' }}>Oaxaca de Juárez · est. 2019</div>
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'14px 28px 0' }}>
            <div style={{ flex:1, height:1, background:'#D8CFC0' }}/>
            <span style={{ color:'#B8860B', fontSize:13 }}>❦</span>
            <div style={{ flex:1, height:1, background:'#D8CFC0' }}/>
          </div>
        </div>
      )}
      {show.map(cat => (
        <div key={cat} style={{ marginBottom:20 }}>
          <div style={{ textAlign:'center', fontSize:13, letterSpacing:'0.22em', textTransform:'uppercase',
            color:'#4F1728', fontWeight:700, marginBottom:12 }}>{cat}</div>
          {MENU_SEED.filter(d => d.cat===cat).map(d => (
            <div key={d.id} style={{ marginBottom:11 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#2B2B2B', whiteSpace:'nowrap' }}>{d.name}</span>
                <span style={{ flex:1, borderBottom:'1.5px dotted #C9BFAE', transform:'translateY(-3px)' }}/>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#4F1728' }}>{d.price}</span>
              </div>
              <div style={{ fontSize:11, fontStyle:'italic', color:'#8A8378', marginTop:2, paddingRight:36 }}>
                {d.desc.split('.')[0]}.
              </div>
            </div>
          ))}
        </div>
      ))}
      <div style={{ textAlign:'center', fontSize:10, color:'#A9A093', marginTop:6 }}>
        {page === 1 ? 'Precios en pesos mexicanos · IVA incluido' : 'Propina no incluida · La Ceiba ❦ Cocina de origen'} — pág. {page} de 2
      </div>
    </div>
  );
};

const PDFViewer = ({ go }) => {
  const [zoom, setZoom] = useState(1);
  return (
    <div className="screen" style={{ background:'#211D1A', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Chrome del visor */}
      <div style={{ padding:'58px 18px 12px', display:'flex', alignItems:'center', gap:12,
        background:'rgba(20,17,15,0.9)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', zIndex:10 }}>
        <IconBtn name="close" dark onClick={() => go('menu')}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Carta-LaCeiba-2026.pdf</div>
          <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.5)' }}>La carta impresa del restaurante · 2 páginas</div>
        </div>
        <IconBtn name="ios_share" dark/>
      </div>

      {/* Páginas */}
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
        <div style={{ transform:`scale(${zoom})`, transformOrigin:'top center', transition:'transform 250ms',
          display:'flex', flexDirection:'column', gap:18 }}>
          <PDFPage page={1}/>
          <PDFPage page={2}/>
          <div style={{ height:90 }}/>
        </div>
      </div>

      {/* Controles */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 20px 32px',
        display:'flex', alignItems:'center', gap:10,
        background:'linear-gradient(180deg, transparent 0%, rgba(20,17,15,0.9) 45%)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:2, background:'rgba(255,255,255,0.12)',
          backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:9999, padding:4 }}>
          <IconBtn name="zoom_out" dark size={38} iconSize={19} onClick={() => setZoom(z => Math.max(0.8, +(z-0.1).toFixed(2)))} style={{ background:'transparent' }}/>
          <span style={{ fontSize:12.5, fontWeight:600, color:'white', width:42, textAlign:'center' }}>{Math.round(zoom*100)}%</span>
          <IconBtn name="zoom_in" dark size={38} iconSize={19} onClick={() => setZoom(z => Math.min(1.6, +(z+0.1).toFixed(2)))} style={{ background:'transparent' }}/>
        </div>
        <Btn variant="primary" style={{ flex:1, fontSize:14.5, padding:'13px 16px' }} iconName="view_in_ar"
          onClick={() => go('menu')}>Volver al menú interactivo</Btn>
      </div>
    </div>
  );
};

// ═══ P04 · SESIÓN GRUPAL ═══════════════════════════════════
const GroupSession = ({ go, onDish, order, friendsReady, setOrderStatus }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [openId, setOpenId] = useState('ana');
  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => { if (!order.length) setConfirmed(false); }, [order.length]);

  // Orden de confirmación de amigos: Ana → Sofía → Diego
  const friendOrder = ['ana','sofia','diego'];
  const readyIds = friendOrder.slice(0, friendsReady);
  const waiting = GROUP.filter(p => p.id!=='tu' && !readyIds.includes(p.id)).map(p => p.name);
  const waitingText = waiting.length > 2 ? 'Esperando a los demás' : `Esperando a ${waiting.join(' y ')}`;
  const readyCount = readyIds.length + (confirmed ? 1 : 0);
  const allReady = readyCount === 4;
  const soloFaltasTu = friendsReady === 3 && !confirmed;
  const [callPhase, setCallPhase] = useState(null);
  useEffect(() => {
    if (allReady) {
      setCallPhase('calling');
      const t = setTimeout(() => setCallPhase('coming'), 2200);
      if (setOrderStatus) setOrderStatus('enviada');
      return () => clearTimeout(t);
    }
    setCallPhase(null);
  }, [allReady]);
  const myTotal = order.reduce((s,o) => s + (MENU_SEED.find(m=>m.id===o.id)?.price||0)*o.qty, 0);

  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      {callPhase === 'coming' && <Confetti/>}
      <div style={{ padding:'60px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <IconBtn name="arrow_back" onClick={() => go('menu')}/>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {linkCopied && <Chip tone="success" className="pop-in" style={{ fontSize:12 }}>
              <Icon name="check" size={13} color="#15803D"/> Enlace copiado</Chip>}
            <IconBtn name="ios_share" onClick={() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2200); }}/>
          </div>
        </div>
        <div style={{ fontFamily:serif, fontSize:28, color:C.charcoal, letterSpacing:'-0.015em' }}>Orden de la mesa</div>
        <div style={{ fontSize:13.5, color:C.muted, marginTop:3 }}>
          Cada quien confirma la suya. Cuando estén los cuatro, llamamos al mesero.
        </div>
      </div>

      {/* Avatares + progreso */}
      <div style={{ padding:'18px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
          {GROUP.map(p => {
            const isReady = p.id==='tu' ? confirmed : readyIds.includes(p.id);
            const isOpen = openId === p.id;
            return (
              <button key={p.id} onClick={() => setOpenId(p.id)} {...pressFx} style={{
                background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column',
                alignItems:'center', gap:6, position:'relative', padding:0 }}>
                <div style={{ position:'relative', borderRadius:9999,
                  outline: isOpen ? `2.5px solid ${C.dorado}` : 'none', outlineOffset:3 }}>
                  <Avatar person={p} size={62} ring={isReady} dimmed={!isReady && p.id!=='tu'}/>
                  {isReady && <div className="pop-in" style={{ position:'absolute', bottom:-2, right:-2, width:22, height:22,
                    borderRadius:9999, background:C.success, border:`2.5px solid ${C.surface}`,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="check" size={13} color="white" weight={700}/>
                  </div>}
                </div>
                <span style={{ fontSize:12.5, fontWeight: isOpen?700:500, color: isOpen ? C.primary : C.muted }}>{p.name}</span>
              </button>
            );
          })}
        </div>
        <div style={{ background:C.surfaceLow, borderRadius:9999, height:10, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${readyCount*25}%`,
            background: allReady ? gradDorado : gradVino, borderRadius:9999,
            transition:'width 500ms cubic-bezier(0.22,1.2,0.36,1), background 400ms' }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, alignItems:'center' }}>
          <span style={{ fontSize:13.5, fontWeight:700, color: allReady ? C.dorado : C.primary }}>
            {readyCount} de 4 listos
          </span>
          {!allReady && (soloFaltasTu
            ? <span style={{ fontSize:12.5, fontWeight:700, color:'#8A6508' }}>✨ Solo faltas tú</span>
            : waiting.length > 0 && <span style={{ fontSize:12.5, color:C.muted }}>{waitingText}…</span>)}
        </div>
      </div>

      {allReady && (
        <div className="pop-in" style={{ margin:'14px 24px 0', borderRadius:20, flexShrink:0,
          background: callPhase==='calling' ? 'white' : 'rgba(184,134,11,0.12)',
          boxShadow: callPhase==='calling' ? '0 8px 24px rgba(79,23,40,0.1)' : 'none',
          padding:'13px 16px', display:'flex', alignItems:'center', gap:13, transition:'background 400ms' }}>
          {callPhase==='calling' ? (
            <React.Fragment>
              <div style={{ position:'relative', flexShrink:0, borderRadius:9999,
                animation:'ringPulse 1.3s ease-out infinite' }}>
                <Avatar person={{ name:'Carlos', emoji:'🧑‍💼', photo:WAITER.photo }} size={44} ring/>
              </div>
              <div>
                <div style={{ fontSize:14.5, fontWeight:700, color:C.primary }}>Llamando a tu mesero…</div>
                <div style={{ fontSize:12.5, color:C.muted }}>Carlos confirmará la orden de la mesa y la enviará a cocina.</div>
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div style={{ width:40, height:40, borderRadius:9999, background:gradDorado, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="room_service" size={20} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:14.5, fontWeight:700, color:'#8A6508' }}>¡Carlos va en camino!</div>
                <div style={{ fontSize:12.5, color:C.muted }}>Confirmará la orden completa y la enviará a cocina.</div>
              </div>
            </React.Fragment>
          )}
        </div>
      )}

      {/* Orden del seleccionado */}
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'16px 24px 0' }}>
        {GROUP.map(p => {
          if (p.id !== openId) return null;
          const dishes = p.id==='tu'
            ? order.map(o => ({ ...MENU_SEED.find(m=>m.id===o.id), qty:o.qty }))
            : p.dishes.map(id => ({ ...MENU_SEED.find(m=>m.id===id), qty:1 }));
          const t = dishes.reduce((s,d) => s + d.price*d.qty, 0);
          return (
            <div key={p.id} className="screen" style={{ animationDuration:'200ms' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>
                  {p.id==='tu' ? 'Tu orden' : `La orden de ${p.name}`}
                </span>
                {dishes.length > 0 && <span style={{ fontSize:15, fontWeight:700, color:C.charcoal }}>{fmt(t)}</span>}
              </div>
              {dishes.length === 0 && (
                <div style={{ background:C.surfaceLow, borderRadius:24, padding:'28px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:30, marginBottom:8 }}>🍽️</div>
                  <div style={{ fontSize:14.5, fontWeight:600, color:C.charcoal }}>
                    {p.id==='tu' ? 'Tu orden está vacía' : `${p.name} aún no elige`}
                  </div>
                  <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>
                    {p.id==='tu' ? 'Explora el menú y agrega algo rico.' : 'Dale una idea: comparte un platillo.'}
                  </div>
                  {p.id==='tu' && <Btn variant="secondary" style={{ marginTop:14, fontSize:14, padding:'10px 22px' }}
                    onClick={() => go('menu')}>Explorar el menú</Btn>}
                </div>
              )}
              {dishes.map(d => (
                <div key={d.id} onClick={() => onDish(MENU_SEED.find(m=>m.id===d.id))} style={{ display:'flex', gap:12,
                  alignItems:'center', background:'white', borderRadius:20, padding:'10px 14px 10px 10px',
                  marginBottom:10, boxShadow:'0 2px 10px rgba(29,28,23,0.05)', cursor:'pointer' }}>
                  <Photo src={d.photo} emoji={d.emoji} radius={14} emojiSize={26} style={{ width:54, height:54, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14.5, fontWeight:600, color:C.charcoal }}>{d.qty > 1 ? `${d.qty}× ` : ''}{d.name}</div>
                    <div style={{ fontSize:12, color:C.dorado, fontWeight:600, display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                      <Icon name="view_in_ar" size={13} color={C.dorado}/> Toca para verlo en 3D
                    </div>
                  </div>
                  <span style={{ fontSize:14.5, fontWeight:700, color:C.primary }}>{fmt(d.price*d.qty)}</span>
                </div>
              ))}
            </div>
          );
        })}
        <div style={{ height:120 }}/>
      </div>

      {/* CTA contextual */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 20px 30px',
        background:'rgba(254,249,241,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        boxShadow:'0px -16px 36px rgba(29,28,23,0.1)' }}>
        {allReady ? (
          <Btn variant="dorado" style={{ width:'100%', fontSize:16.5 }} iconName="skillet"
            onClick={() => go('tracking')}>Ver preparación de mi orden →</Btn>
        ) : confirmed ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:9 }}>
              <span style={{ width:8, height:8, borderRadius:9999, background:C.dorado,
                animation:'pulseSoft 1.2s ease-in-out infinite' }}/>
              <span style={{ fontSize:12.5, fontWeight:600, color:C.muted }}>Esperando a los demás…</span>
            </div>
            <Btn variant="secondary" style={{ width:'100%', fontSize:16 }} iconName="edit"
              onClick={() => { setConfirmed(false); go('menu'); }}>Cambiar orden</Btn>
          </div>
        ) : (
          <Btn variant="primary" disabled={!order.length} style={{ width:'100%', fontSize:16.5 }}
            onClick={() => { setConfirmed(true); setOpenId('tu'); }}>
            {order.length ? (soloFaltasTu ? `Confirmar — ¡solo faltas tú! · ${fmt(myTotal)}` : `Confirmar mi orden · ${fmt(myTotal)}`) : 'Agrega platillos para confirmar'}
          </Btn>
        )}
      </div>
    </div>
  );
};

// ═══ P04b · SEGUIMIENTO DE ORDEN (enviada → preparando → servida) ═══
const OrderTracking = ({ go, orderStatus, order, setOrder, modDraft, setModDraft, sendModRequest, cancelModRequest, cuentaState, setCuentaState, setOrderStatus }) => {
  const [help, setHelp] = useState(null);
  const [askMod, setAskMod] = useState(false);   // false | 'root' | 'edit'
  const [draftQty, setDraftQty] = useState({});  // { dishId: nueva cantidad }
  const [sentToast, setSentToast] = useState(false);
  const myTotal = order.reduce((s,o) => s + (MENU_SEED.find(m=>m.id===o.id)?.price||0)*o.qty, 0);
  const servida = orderStatus === 'servida';
  const ampliando = orderStatus === 'ampliacion';

  const STEPS = [
    { k:'enviada',    icon:'send',         label:'Orden enviada' },
    { k:'preparando', icon:'skillet',      label:'En cocina' },
    { k:'servida',    icon:'room_service', label:'Servida' },
  ];
  const curIdx = servida ? 2 : 1;

  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      {servida && <Confetti count={30}/>}
      <div style={{ padding:'60px 24px 0', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:serif, fontStyle:'italic', fontSize:20, color:C.primary }}>Carta</span>
        <Chip tone="vino"><Icon name="restaurant" size={13} color={C.primary}/> Mesa {RESTAURANT.mesa}</Chip>
      </div>

      {/* Stepper */}
      <div style={{ display:'flex', alignItems:'center', padding:'22px 34px 4px', flexShrink:0 }}>
        {STEPS.map((s,i) => (
          <React.Fragment key={s.k}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
              <div style={{ width:44, height:44, borderRadius:9999, display:'flex', alignItems:'center',
                justifyContent:'center', transition:'all 350ms',
                background: i <= curIdx ? gradVino : C.surfaceHigh,
                boxShadow: i === curIdx ? '0 8px 20px rgba(79,23,40,0.3)' : 'none' }}>
                <Icon name={i < curIdx ? 'check' : s.icon} size={21} color={i <= curIdx ? 'white' : C.outline} fill={i<curIdx}/>
              </div>
              <span style={{ fontSize:11, fontWeight: i===curIdx?700:500, color: i<=curIdx ? C.primary : C.outline }}>{s.label}</span>
            </div>
            {i < STEPS.length-1 && <div style={{ flex:1, height:3, borderRadius:9999, margin:'0 6px 20px',
              background: i < curIdx ? gradVino : C.surfaceHigh, transition:'background 400ms' }}/>}
          </React.Fragment>
        ))}
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 28px', textAlign:'center' }}>
        {servida ? (
          <React.Fragment>
            <div className="pop-in" style={{ width:120, height:120, borderRadius:9999, background:gradVino,
              display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 24px 56px rgba(79,23,40,0.35)' }}>
              <Icon name="restaurant" size={56} color="white"/>
            </div>
            <div className="pop-in" style={{ fontFamily:serif, fontSize:32, color:C.charcoal, marginTop:22, animationDelay:'100ms' }}>Comida entregada</div>
            <div className="pop-in" style={{ fontFamily:serif, fontStyle:'italic', fontSize:19, color:C.primary, marginTop:6, animationDelay:'180ms' }}>¡Disfruta tu comida!</div>
            <div className="pop-in" style={{ fontSize:14, color:C.muted, marginTop:10, animationDelay:'240ms', maxWidth:280 }}>
              Cuando termines, revisa tu cuenta y deja tu propina a Carlos.
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {/* Ilustración cocina */}
            <div style={{ position:'relative', width:150, height:150 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:9999, background:'rgba(184,134,11,0.12)',
                animation:'ringPulse 1.8s ease-out infinite' }}/>
              <div style={{ position:'absolute', inset:14, borderRadius:9999, background:C.surfaceLow,
                display:'flex', alignItems:'center', justifyContent:'center', animation:'floaty 3.5s ease-in-out infinite' }}>
                <Icon name="skillet" size={62} color={C.primary}/>
              </div>
              {/* Vapor */}
              {[0,1,2].map(i => (
                <div key={i} style={{ position:'absolute', top:8, left:`${58+i*18}px`, width:8, height:8,
                  borderRadius:9999, background:'rgba(133,115,117,0.35)',
                  animation:`floaty ${1.4+i*0.3}s ease-in-out infinite`, animationDelay:`${i*0.25}s` }}/>
              ))}
            </div>
            <div style={{ fontFamily:serif, fontSize:30, lineHeight:'37px', color:C.charcoal, marginTop:26, letterSpacing:'-0.015em' }}>
              {ampliando ? <React.Fragment>Ampliando<br/>tu orden</React.Fragment> : <React.Fragment>Tu comida se<br/>está preparando</React.Fragment>}
            </div>
            <div style={{ fontSize:14, color:C.muted, marginTop:10, maxWidth:300 }}>
              {ampliando
                ? 'Estamos notificando a Carlos para confirmar la ampliación de tu orden. Lo demás sigue su curso.'
                : 'Carlos confirmó tu orden y la mandó a cocina. Te avisamos en cuanto salga.'}
            </div>
            {/* Barra de progreso animada */}
            <div style={{ width:'100%', maxWidth:280, marginTop:24 }}>
              <div style={{ height:8, borderRadius:9999, background:C.surfaceHigh, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:9999, background:gradDorado,
                  animation:'cookFill 6s ease-in-out infinite' }}/>
              </div>
              <div style={{ fontSize:12, color:C.outline, marginTop:8 }}>Tiempo estimado · 12–15 min</div>
            </div>
          </React.Fragment>
        )}
      </div>

      <div style={{ padding:'0 24px 40px', flexShrink:0 }}>
        {servida ? (
          cuentaState === 'pagando' ? (
            <div>
              <div style={{ display:'flex', gap:9, alignItems:'center', background:'rgba(126,76,158,0.1)',
                borderRadius:16, padding:'11px 14px', marginBottom:12 }}>
                <Icon name="lock" size={17} color={C.morado}/>
                <span style={{ fontSize:12.5, color:C.muted, lineHeight:'18px' }}>
                  <b style={{ color:C.morado }}>Cuenta cerrada.</b> Ya no es posible agregar más platillos ni volver a abrir la cuenta.
                </span>
              </div>
              <Btn variant="dorado" style={{ width:'100%', fontSize:17 }} iconName="receipt_long"
                onClick={() => go('checkout')}>Ver mi cuenta · {fmt(myTotal)}</Btn>
            </div>
          ) : cuentaState === 'cerrada' ? (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, marginBottom:12 }}>
                <span style={{ width:8, height:8, borderRadius:9999, background:C.dorado,
                  animation:'pulseSoft 1.2s ease-in-out infinite' }}/>
                <span style={{ fontSize:12.5, color:C.muted }}>Tu cuenta está cerrada · esperando a los demás…</span>
              </div>
              <Btn variant="secondary" style={{ width:'100%', fontSize:16 }} iconName="lock_open"
                onClick={() => setCuentaState('abierta')}>Volver a abrir cuenta</Btn>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Btn variant="secondary" style={{ width:'100%', fontSize:15.5 }} iconName="restaurant_menu"
                onClick={() => { setModDraft({ mode:'add', snapshot: order.map(o=>({...o})) }); go('menu'); }}>
                Agregar otro platillo o postre</Btn>
              <Btn variant="dorado" style={{ width:'100%', fontSize:16 }} iconName="receipt_long"
                onClick={() => setCuentaState('cerrada')}>Cerrar cuenta</Btn>
            </div>
          )
        ) : modDraft ? (
          <Btn variant="primary" style={{ width:'100%', fontSize:16 }} iconName="room_service"
            onClick={() => {
              const before = modDraft.snapshot || [], after = order, ops = [];
              after.forEach(o => { const b = before.find(x=>x.id===o.id); const d = o.qty - (b?b.qty:0);
                if (d>0) ops.push(`+${d} ${(MENU_SEED.find(m=>m.id===o.id)||{}).name}`); });
              before.forEach(b => { const a = after.find(x=>x.id===b.id); const d = b.qty - (a?a.qty:0);
                if (d>0) ops.push(`−${d} ${(MENU_SEED.find(m=>m.id===b.id)||{}).name}`); });
              sendModRequest(ops.length ? ops : ['Cambios en la orden']);
              if (servida && setOrderStatus) setOrderStatus('ampliacion');
              setModDraft(null); setSentToast(true); setTimeout(() => setSentToast(false), 5000);
            }}>Confirmar con el mesero</Btn>
        ) : (
          <Btn variant="secondary" style={{ width:'100%', fontSize:16 }} iconName="room_service"
            onClick={() => setAskMod('root')}>Llamar al mesero</Btn>
        )}
      </div>

      {/* Modal de dos niveles */}
      {askMod && (
        <div style={{ position:'absolute', inset:0, zIndex:60, display:'flex', alignItems:'flex-end' }}>
          <div onClick={() => setAskMod(false)} style={{ position:'absolute', inset:0,
            background:'rgba(29,28,23,0.45)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }}/>
          <div className="sheet-up" style={{ position:'relative', width:'100%', background:C.surface,
            borderRadius:'32px 32px 0 0', padding:'0 24px 34px', maxHeight:'78%', overflowY:'auto',
            boxShadow:'0px -24px 60px rgba(29,28,23,0.35)' }}>
            <Grip/>
            {askMod === 'root' && (
              <React.Fragment>
                <div style={{ fontFamily:serif, fontSize:23, color:C.primary, textAlign:'center' }}>¿Qué deseas hacer?</div>
                <div style={{ fontSize:13.5, color:C.muted, textAlign:'center', margin:'6px 0 18px' }}>
                  Modifica tu orden o llama a Carlos directamente.
                </div>
                <button onClick={() => setAskMod('edit')} {...pressFx} style={{ display:'flex', alignItems:'center',
                  gap:13, width:'100%', background:'white', border:'none', cursor:'pointer', borderRadius:20,
                  padding:'14px 16px', marginBottom:10, textAlign:'left', boxShadow:'0 4px 14px rgba(79,23,40,0.07)',
                  transition:'transform 130ms' }}>
                  <div style={{ width:44, height:44, borderRadius:14, background:C.surfaceLow, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="edit_note" size={22} color={C.primary}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.charcoal }}>Modificar orden</div>
                    <div style={{ fontSize:12.5, color:C.muted }}>Añadir, eliminar o ajustar cantidades</div>
                  </div>
                  <Icon name="chevron_right" size={19} color={C.outline}/>
                </button>
                <button onClick={() => { setAskMod(false); setHelp('Carlos'); }} {...pressFx} style={{ display:'flex',
                  alignItems:'center', justifyContent:'center', gap:9, width:'100%', background:C.surfaceLow, border:'none',
                  cursor:'pointer', borderRadius:9999, padding:'14px 0', fontSize:14.5, fontWeight:700, color:C.primary,
                  fontFamily:sans, marginTop:4, transition:'transform 130ms' }}>
                  <Icon name="room_service" size={18} color={C.primary}/> Solo llamar al mesero
                </button>
              </React.Fragment>
            )}
            {askMod === 'edit' && (
              <React.Fragment>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <IconBtn name="arrow_back" size={34} iconSize={17} onClick={() => setAskMod('root')}/>
                  <div>
                    <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal }}>Modificar orden</div>
                    <div style={{ fontSize:12, color:C.muted }}>Ajusta cantidades — en cero se elimina</div>
                  </div>
                </div>
                <button onClick={() => { setAskMod(false); setModDraft({ mode:'add', snapshot: order.map(o=>({...o})) }); go('menu'); }}
                  {...pressFx} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%',
                  background:'transparent', border:`1.5px dashed ${C.outline}66`, borderRadius:16, padding:'12px 0',
                  fontSize:13.5, fontWeight:700, color:C.primary, cursor:'pointer', fontFamily:sans, margin:'10px 0 4px' }}>
                  <Icon name="add" size={17} color={C.primary}/> Añadir productos del menú
                </button>
                <div style={{ padding:'8px 0 4px' }}>
                  {order.map(o => {
                    const d = MENU_SEED.find(m=>m.id===o.id); if (!d) return null;
                    const q = draftQty[o.id] !== undefined ? draftQty[o.id] : o.qty;
                    const zero = q === 0;
                    const changed = q !== o.qty;
                    return (
                      <div key={o.id} style={{ display:'flex', alignItems:'center', gap:11, borderRadius:18,
                        padding:'11px 14px', marginBottom:8, transition:'all 200ms',
                        background: zero ? 'rgba(186,26,26,0.06)' : 'white',
                        boxShadow: zero ? 'none' : '0 2px 10px rgba(29,28,23,0.05)' }}>
                        <Photo src={d.photo} emoji={d.emoji} radius={11} emojiSize={18} style={{ width:40, height:40, flexShrink:0,
                          filter: zero ? 'grayscale(0.9) opacity(0.6)' : 'none' }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:600, transition:'all 200ms',
                            color: zero ? C.outline : C.charcoal,
                            textDecoration: zero ? 'line-through' : 'none' }}>{d.name}</div>
                          <div style={{ fontSize:11.5, color: zero ? C.error : changed ? '#8A6508' : C.muted, fontWeight: changed||zero ? 700 : 400 }}>
                            {zero ? 'Se eliminará de tu orden' : changed ? `${o.qty} → ${q}` : `${fmt(d.price)} c/u`}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:2, background:C.surfaceLow,
                          borderRadius:9999, padding:3, flexShrink:0 }}>
                          <IconBtn name="remove" size={28} iconSize={15} style={{ background:'transparent' }}
                            onClick={() => setDraftQty(r => ({...r, [o.id]: Math.max(0, q-1)}))}/>
                          <span style={{ width:18, textAlign:'center', fontSize:14, fontWeight:700,
                            color: zero ? C.error : C.charcoal }}>{q}</span>
                          <IconBtn name="add" size={28} iconSize={15} style={{ background:'transparent' }}
                            onClick={() => setDraftQty(r => ({...r, [o.id]: q+1}))}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Btn variant="primary" style={{ width:'100%' }}
                  disabled={!order.some(o => draftQty[o.id] !== undefined && draftQty[o.id] !== o.qty)}
                  onClick={() => {
                    const snapshot = order.map(o=>({...o}));
                    setOrder(prev => prev.map(o => draftQty[o.id] !== undefined ? {...o, qty:draftQty[o.id]} : o).filter(o => o.qty > 0));
                    setModDraft({ mode:'remove', snapshot });
                    setDraftQty({}); setAskMod(false);
                  }}>Aplicar cambios</Btn>
              </React.Fragment>
            )}
          </div>
        </div>
      )}

      {sentToast && (
        <div className="pop-in" style={{ position:'absolute', left:20, right:20, bottom:104, zIndex:55,
          background:C.charcoal, borderRadius:16, padding:'12px 14px 12px 18px', display:'flex', alignItems:'center', gap:12,
          boxShadow:'0 16px 40px rgba(0,0,0,0.3)' }}>
          <Icon name="send" size={16} color={C.doradoLight}/>
          <span style={{ flex:1, fontSize:13, color:'white' }}>Solicitud enviada a Carlos</span>
          <button onClick={() => { cancelModRequest(); setSentToast(false); }} {...pressFx} style={{
            background:'rgba(255,255,255,0.16)', border:'none', borderRadius:9999, padding:'7px 15px',
            fontSize:12.5, fontWeight:700, color:'white', cursor:'pointer', fontFamily:sans }}>Deshacer</button>
        </div>
      )}

      {help && (
        <div className="pop-in" style={{ position:'absolute', left:20, right:20, bottom:104, zIndex:50,
          background:'white', borderRadius:20, padding:'13px 16px', display:'flex', alignItems:'center', gap:12,
          boxShadow:'0 16px 40px rgba(79,23,40,0.2)' }}>
          <Avatar person={{ name:'Carlos', emoji:'🧑‍💼', photo:WAITER.photo }} size={40} ring/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13.5, fontWeight:700, color:C.charcoal }}>Carlos va en camino</div>
            <div style={{ fontSize:12, color:C.muted }}>Te atenderá en un momento.</div>
          </div>
          <IconBtn name="close" size={32} iconSize={16} onClick={() => setHelp(null)}/>
        </div>
      )}
    </div>
  );
};

// ═══ P05 · CHECKOUT / PAGO + PROPINA ═══════════════════════
const Checkout = ({ go, order }) => {
  const items = order.map(o => ({ ...MENU_SEED.find(m=>m.id===o.id), qty:o.qty }));
  const sub = items.reduce((s,d) => s + d.price*d.qty, 0);
  const [tip, setTip] = useState(15);
  const [customTip, setCustomTip] = useState('');
  const [dishRatings, setDishRatings] = useState({});
  const [waiterStars, setWaiterStars] = useState(5);
  const [tags, setTags] = useState(['Atento']);
  const tipAmt = customTip !== '' ? (+customTip || 0) : Math.round(sub * tip / 100);
  const total = sub + tipAmt;
  const toggleTag = t => setTags(x => x.includes(t) ? x.filter(y=>y!==t) : [...x, t]);

  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div style={{ padding:'60px 24px 12px', flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
        <IconBtn name="arrow_back" onClick={() => go('group')}/>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:serif, fontSize:24, color:C.charcoal }}>Tu cuenta</div>
          <div style={{ fontSize:12.5, color:C.muted }}>{RESTAURANT.name} · Mesa {RESTAURANT.mesa} · solo lo tuyo</div>
        </div>
        {/* Dispute discreto — esquina superior derecha */}
        <IconBtn name="flag" size={38} iconSize={18} style={{ background:'transparent' }}/>
      </div>

      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'4px 24px 0' }}>
        {/* Items + rating por platillo */}
        <div style={{ background:'white', borderRadius:24, padding:'6px 18px', boxShadow:'0 4px 16px rgba(79,23,40,0.06)' }}>
          {items.map((d,i) => (
            <div key={d.id} style={{ padding:'13px 0', borderBottom: i<items.length-1 ? '1px solid rgba(91,74,61,0.07)' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <Photo src={d.photo} emoji={d.emoji} radius={12} emojiSize={22} style={{ width:44, height:44, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14.5, fontWeight:600, color:C.charcoal }}>{d.qty>1?`${d.qty}× `:''}{d.name}</div>
                  <div style={{ marginTop:3 }}>
                    <Stars size={17} gap={3} value={dishRatings[d.id]||0}
                      onChange={v => setDishRatings(r => ({...r, [d.id]:v}))}/>
                  </div>
                </div>
                <span style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{fmt(d.price*d.qty)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Propina */}
        <div style={{ fontFamily:serif, fontSize:18, color:C.primary, margin:'22px 0 10px' }}>Propina para Carlos</div>
        <div style={{ display:'flex', gap:9 }}>
          {[10,15,20].map(t => (
            <button key={t} onClick={() => { setTip(t); setCustomTip(''); }} {...pressFx} style={{ flex:1, border:'none',
              cursor:'pointer', borderRadius:18, padding:'13px 0', fontSize:15.5, fontWeight:700, fontFamily:sans,
              background: (customTip==='' && tip===t) ? gradVino : 'white',
              color: (customTip==='' && tip===t) ? 'white' : C.charcoal,
              boxShadow: (customTip==='' && tip===t) ? '0 8px 20px rgba(79,23,40,0.25)' : '0 2px 8px rgba(29,28,23,0.05)',
              transition:'all 200ms cubic-bezier(0.22,1.4,0.36,1)' }}>{t}%</button>
          ))}
          <input value={customTip} onChange={e => setCustomTip(e.target.value.replace(/\D/g,''))}
            placeholder="Otra" style={{ width:74, border:'none', borderRadius:18, textAlign:'center',
              fontSize:14.5, fontWeight:600, background: customTip!=='' ? gradVino : 'white',
              color: customTip!=='' ? 'white' : C.charcoal, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}/>
        </div>
        <div style={{ fontSize:12.5, color:C.muted, marginTop:8, paddingLeft:4 }}>
          = {fmt(tipAmt)} directo a tu mesero
        </div>

        {/* Mesero */}
        <div style={{ background:'white', borderRadius:24, padding:'16px 18px', margin:'20px 0 0',
          boxShadow:'0 4px 16px rgba(79,23,40,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <Avatar person={{ name:'Carlos', emoji:'🧑‍💼', photo:WAITER.photo }} size={46} ring/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>¿Cómo te atendió Carlos?</div>
              <div style={{ fontSize:12, color:C.muted }}>Tu calificación viaja con su perfil</div>
            </div>
            <Stars size={20} gap={2} value={waiterStars} onChange={setWaiterStars}/>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {['Atento','Eficiente','Conocedor','Amable','Rápido','Paciente','Discreto','Buen humor','Recomendó bien'].map(t => (
              <button key={t} onClick={() => toggleTag(t)} {...pressFx} style={{ border:'none', cursor:'pointer',
                borderRadius:9999, padding:'8px 16px', fontSize:13, fontWeight:600, fontFamily:sans,
                background: tags.includes(t) ? 'rgba(184,134,11,0.16)' : C.surfaceLow,
                color: tags.includes(t) ? '#8A6508' : C.muted, transition:'all 180ms' }}>
                {tags.includes(t) ? '✓ ' : ''}{t}
              </button>
            ))}
          </div>
          <input placeholder="Déjale un mensaje (opcional)" style={{ width:'100%', background:C.surfaceLow,
            border:'none', borderRadius:14, padding:'11px 14px', fontSize:13.5, color:C.charcoal }}/>
        </div>

        {/* Totales */}
        <div style={{ background:C.surfaceLow, borderRadius:24, padding:'16px 20px', margin:'18px 0' }}>
          {[['Tu consumo', fmt(sub)], ['Propina', fmt(tipAmt)]].map(([l,v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
              <span style={{ fontSize:13.5, color:C.muted }}>{l}</span>
              <span style={{ fontSize:13.5, fontWeight:600, color:C.charcoal }}>{v}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:10 }}>
            <span style={{ fontFamily:serif, fontSize:19, color:C.primary }}>Total</span>
            <span style={{ fontFamily:serif, fontSize:26, color:C.primary }}>{fmt(total)} <span style={{ fontSize:14 }}>MXN</span></span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
            <Icon name="verified_user" size={14} color={C.success}/>
            <span style={{ fontSize:11.5, color:C.muted }}>Transacción segura</span>
          </div>
        </div>
        <div style={{ height:104 }}/>
      </div>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 20px 30px',
        background:'rgba(254,249,241,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        boxShadow:'0px -16px 36px rgba(29,28,23,0.1)', display:'flex', gap:10 }}>
        <button {...pressFx} style={{ background:'white', border:'none', borderRadius:9999, width:54, height:54,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
          boxShadow:'0 2px 10px rgba(29,28,23,0.08)', flexShrink:0 }}>
          <Icon name="account_balance" size={22} color={C.primary}/>
        </button>
        <Btn variant="primary" style={{ flex:1, fontSize:16.5 }} iconName="lock"
          onClick={() => go('success')}>Pagar {fmt(total)} MXN</Btn>
      </div>
    </div>
  );
};

// ═══ ÉXITO DE PAGO ═════════════════════════════════════════
const PaySuccess = ({ go, order, resetOrder }) => {
  const sub = order.reduce((s,o) => s + (MENU_SEED.find(m=>m.id===o.id)?.price||0)*o.qty, 0);
  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column',
      alignItems:'center', overflow:'hidden', position:'relative', padding:'0 28px' }}>
      <Confetti count={34}/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div className="pop-in" style={{ width:96, height:96, borderRadius:9999, background:gradVino,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 24px 56px rgba(79,23,40,0.35)' }}>
          <Icon name="check" size={48} color="white" weight={600}/>
        </div>
        <div className="pop-in" style={{ fontFamily:serif, fontSize:32, color:C.charcoal, marginTop:22,
          letterSpacing:'-0.015em', animationDelay:'120ms' }}>¡Buen provecho!</div>
        <div className="pop-in" style={{ fontSize:14.5, color:C.muted, marginTop:6, textAlign:'center', animationDelay:'200ms' }}>
          Pagaste {fmt(Math.round(sub*1.15))} MXN · Recibo enviado
        </div>
        {/* Invitar amigo — cross-promo viral */}
        <div className="pop-in" style={{ marginTop:30, background:'white', borderRadius:26, padding:'18px 20px',
          boxShadow:'0 12px 36px rgba(79,23,40,0.1)', width:'100%', animationDelay:'300ms' }}>
          <div style={{ display:'flex', gap:13, alignItems:'center', marginBottom:13 }}>
            <div style={{ width:46, height:46, borderRadius:16, background:'rgba(184,134,11,0.13)', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🎁</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:C.charcoal }}>Invita a un amigo a Carta</div>
              <div style={{ fontSize:12.5, color:C.muted, marginTop:1 }}>Ambos reciben $50 MXN en su próxima comida.</div>
            </div>
          </div>
          <Btn variant="dorado" style={{ width:'100%', fontSize:14.5, padding:'12px 20px' }} iconName="ios_share">
            Compartir mi código
          </Btn>
        </div>
      </div>
      <div style={{ padding:'0 0 44px', width:'100%' }}>
        <Btn variant="secondary" style={{ width:'100%' }} onClick={() => { resetOrder(); go('ar'); }}>
          Volver al inicio
        </Btn>
      </div>
    </div>
  );
};

Object.assign(window, { FullMenu, PDFViewer, PDFPage, GroupSession, OrderTracking, Checkout, PaySuccess });
