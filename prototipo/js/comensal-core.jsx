// ═══════════════════════════════════════════════════════════
// COMENSAL · Core AR — P01 landing (3 variantes) + P02 detalle
// ═══════════════════════════════════════════════════════════
const { useState, useEffect, useMemo } = React;

// ── Fondo de cámara compartido ─────────────────────────────
const CameraBG = ({ bright=false }) => (
  <div style={{ position:'absolute', inset:0 }}>
    <img src={IMGS.restaurante} alt="" onError={e=>e.target.style.display='none'}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
        filter:`brightness(${bright?0.62:0.5}) saturate(1.15)` }}/>
    <div style={{ position:'absolute', inset:0,
      background:'radial-gradient(ellipse at 50% 40%, rgba(79,23,40,0.12) 0%, rgba(13,10,9,0.72) 100%)' }}/>
  </div>
);

// ── Overlay de carga AR (wireframe shimmer) ────────────────
const ARLoading = () => (
  <div style={{ position:'absolute', inset:0, zIndex:40, display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', gap:20 }}>
    <div style={{ width:180, height:180, borderRadius:28, position:'relative', overflow:'hidden',
      border:'1.5px dashed rgba(255,255,255,0.45)' }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
        animation:'shimmerMove 1.1s linear infinite' }}/>
      <div style={{ position:'absolute', inset:24, borderRadius:9999, border:'1.5px dashed rgba(255,255,255,0.3)' }}/>
    </div>
    <div style={{ color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:500,
      animation:'pulseSoft 1.5s ease-in-out infinite' }}>Colocando platillos en tu mesa…</div>
  </div>
);

const useARReady = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 1100); return () => clearTimeout(t); }, []);
  return ready;
};

// ── Nav inferior comensal (dentro del sheet) ───────────────
const ComensalNav = ({ active, go, order }) => (
  <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', padding:'14px 32px 0' }}>
    {[
      { id:'ar', icon:'filter_center_focus', screen:'ar' },
      { id:'menu', icon:'menu_book', screen:'menu' },
      { id:'perfil', icon:'person', screen:'perfil' },
    ].map(n => {
      const on = active === n.id;
      return (
        <button key={n.id} onClick={() => go(n.screen)} {...pressFx} style={{
          background: on ? gradVino : 'transparent', border:'none', cursor:'pointer',
          borderRadius:9999, width: on ? 58 : 48, height: on ? 58 : 48, position:'relative',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: on ? '0 8px 24px rgba(79,23,40,0.35)' : 'none',
          transition:'all 250ms cubic-bezier(0.22,1.4,0.36,1)' }}>
          <Icon name={n.icon} size={on?26:24} color={on ? 'white' : C.muted} fill={on}/>
          {n.id==='menu' && order.length > 0 && (
            <div style={{ position:'absolute', top:4, right:4, background:C.dorado, color:'white',
              borderRadius:9999, minWidth:17, height:17, fontSize:10, fontWeight:700, padding:'0 4px',
              display:'flex', alignItems:'center', justifyContent:'center' }}>{order.length}</div>
          )}
        </button>
      );
    })}
  </div>
);

// ── Pill superior compartido ───────────────────────────────
const RestaurantPill = ({ light=false }) => (
  <div style={{ position:'absolute', top:64, left:'50%', transform:'translateX(-50%)', zIndex:20 }}>
    <div style={{ background:'rgba(254,249,241,0.9)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
      borderRadius:9999, padding:'9px 20px', display:'flex', alignItems:'center', gap:8,
      boxShadow:'0 8px 24px rgba(0,0,0,0.18)' }}>
      <Icon name="restaurant" size={15} color={C.primary}/>
      <span style={{ fontSize:13, fontWeight:600, color:C.primary }}>{RESTAURANT.name} · Mesa {RESTAURANT.mesa}</span>
    </div>
  </div>
);

// ── Avatares de grupo apilados ─────────────────────────────
const GroupStack = ({ go, ready }) => (
  <button onClick={() => go('group')} {...pressFx} style={{ position:'absolute', top:120, right:16, zIndex:20,
    background:'rgba(254,249,241,0.16)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
    border:'none', borderRadius:9999, padding:'10px 10px 12px', cursor:'pointer',
    display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'transform 150ms' }}>
    {GROUP.slice(1).map((p,i) => <Avatar key={p.id} person={p} size={44} ring={i < ready-1}/>)}
    <span style={{ fontSize:11, fontWeight:700, color:'white' }}>{Math.min(ready,4)}/4</span>
  </button>
);

// ═══ P01-A · AR INMERSIVA ══════════════════════════════════
const ARInmersiva = ({ go, onDish, order, groupReady }) => {
  const ready = useARReady();
  const [idx, setIdx] = useState(0);
  const dish = MENU_SEED[idx];
  const tops = MENU_SEED.filter(d => d.chef);
  return (
    <div className="screen" style={{ position:'relative', background:'#0D0A09', overflow:'hidden' }}>
      <CameraBG/>
      <RestaurantPill/>
      {!ready && <ARLoading/>}
      {ready && <GroupStack go={go} ready={groupReady}/>}

      {ready && (
        <div className="pop-in" style={{ position:'absolute', top:'21%', left:0, right:0, zIndex:10,
          display:'flex', flexDirection:'column', alignItems:'center' }}>
          {/* Platillo flotante */}
          <div onClick={() => onDish(dish)} style={{ cursor:'pointer', animation:'floaty 4s ease-in-out infinite' }}>
            <div style={{ width:218, height:218, borderRadius:9999, padding:6,
              background:'rgba(255,255,255,0.1)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
              border:'1.5px solid rgba(255,255,255,0.22)',
              boxShadow:'0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(184,134,11,0.25)' }}>
              <Photo src={dish.photo} emoji={dish.emoji} radius={9999} emojiSize={100}
                style={{ width:'100%', height:'100%' }}/>
            </div>
          </div>
          {/* Sombra en la mesa */}
          <div style={{ width:150, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.45)',
            filter:'blur(10px)', marginTop:10 }}/>
          <div style={{ marginTop:14, display:'flex', flexDirection:'column', alignItems:'center', gap:9 }}>
            {dish.chef && <ChefBadge/>}
            <div style={{ fontFamily:serif, fontSize:27, color:'white', textShadow:'0 4px 20px rgba(0,0,0,0.6)', textAlign:'center', padding:'0 40px' }}>{dish.name}</div>
            <div style={{ background:gradDorado, color:'white', borderRadius:9999, padding:'8px 26px',
              fontWeight:700, fontSize:19, boxShadow:'0 10px 28px rgba(184,134,11,0.45)' }}>{fmt(dish.price)}</div>
            <div style={{ display:'flex', gap:6 }}>
              {dish.chips.slice(0,3).map(c => <Chip key={c} tone="glass" style={{ fontSize:12 }}>{c}</Chip>)}
            </div>
          </div>
          {/* Flechas para cambiar platillo */}
          <div style={{ display:'flex', gap:180, marginTop:-190, pointerEvents:'none' }}>
            <IconBtn name="chevron_left" dark onClick={() => setIdx(i => (i+MENU_SEED.length-1)%MENU_SEED.length)} style={{ pointerEvents:'auto' }}/>
            <IconBtn name="chevron_right" dark onClick={() => setIdx(i => (i+1)%MENU_SEED.length)} style={{ pointerEvents:'auto' }}/>
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:30,
        background:C.surfaceLow, borderRadius:'32px 32px 0 0',
        boxShadow:'0px -20px 40px rgba(29,28,23,0.24)', paddingBottom:26 }}>
        <Grip/>
        <div style={{ padding:'0 24px 12px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <span style={{ fontFamily:serif, fontSize:19, color:C.primary }}>Top 3 del Chef</span>
          <button onClick={() => go('menu')} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:13, fontWeight:600, color:C.dorado }}>Ver menú completo →</button>
        </div>
        <div className="hide-scroll" style={{ display:'flex', gap:12, padding:'0 24px', overflowX:'auto' }}>
          {tops.map(d => (
            <div key={d.id} onClick={() => onDish(d)} {...pressFx} style={{ flexShrink:0, width:132, background:'white',
              borderRadius:18, padding:10, boxShadow:'0 2px 10px rgba(29,28,23,0.07)', cursor:'pointer',
              transition:'transform 150ms' }}>
              <Photo src={d.photo} emoji={d.emoji} radius={12} emojiSize={34} style={{ width:'100%', height:66, marginBottom:8 }}/>
              <div style={{ fontFamily:serif, fontSize:13.5, color:C.primary, marginBottom:3, lineHeight:1.25 }}>{d.name}</div>
              <div style={{ fontSize:13.5, fontWeight:600, color:C.charcoal }}>{fmt(d.price)}</div>
            </div>
          ))}
        </div>
        <ComensalNav active="ar" go={go} order={order}/>
      </div>
    </div>
  );
};

// ═══ P01-B · AR EDITORIAL ══════════════════════════════════
const AREditorial = ({ go, onDish, order, groupReady }) => {
  const ready = useARReady();
  const [idx, setIdx] = useState(0);
  const dish = MENU_SEED[idx];
  return (
    <div className="screen" style={{ position:'relative', background:C.surface, overflow:'hidden',
      display:'flex', flexDirection:'column' }}>
      {/* Viewport AR superior */}
      <div style={{ height:'52%', position:'relative', overflow:'hidden' }}>
        <CameraBG bright/>
        <RestaurantPill/>
        {!ready && <ARLoading/>}
        {ready && (
          <div className="pop-in" onClick={() => onDish(dish)} style={{ position:'absolute', top:'54%', left:'50%',
            transform:'translate(-50%,-50%)', cursor:'pointer', zIndex:10 }}>
            <div style={{ width:186, height:186, borderRadius:9999, padding:5, animation:'floaty 4s ease-in-out infinite',
              background:'rgba(255,255,255,0.12)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
              border:'1.5px solid rgba(255,255,255,0.25)', boxShadow:'0 32px 64px rgba(0,0,0,0.5)' }}>
              <Photo src={dish.photo} emoji={dish.emoji} radius={9999} emojiSize={84} style={{ width:'100%', height:'100%' }}/>
            </div>
          </div>
        )}
        {ready && <GroupStack go={go} ready={groupReady}/>}
      </div>

      {/* Panel editorial */}
      <div className="sheet-up" style={{ flex:1, background:C.surface, borderRadius:'36px 36px 0 0', marginTop:-36,
        position:'relative', zIndex:20, boxShadow:'0px -20px 40px rgba(29,28,23,0.16)',
        display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <Grip/>
        <div style={{ padding:'2px 30px 0', flex:1, overflow:'hidden' }}>
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase',
            color:C.dorado, marginBottom:8 }}>Frente a ti</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div style={{ fontFamily:serif, fontSize:30, lineHeight:'36px', color:C.charcoal, letterSpacing:'-0.015em' }}>{dish.name}</div>
            <div style={{ fontFamily:serif, fontSize:26, color:C.primary, flexShrink:0 }}>{fmt(dish.price)}</div>
          </div>
          <div style={{ fontSize:14, lineHeight:'22px', color:C.muted, margin:'10px 0 14px',
            display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{dish.desc}</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {dish.chips.map(c => <Chip key={c}>{c}</Chip>)}
          </div>
        </div>
        <div style={{ padding:'10px 24px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <IconBtn name="chevron_left" onClick={() => setIdx(i => (i+MENU_SEED.length-1)%MENU_SEED.length)}/>
            <Btn variant="primary" style={{ flex:1 }} onClick={() => onDish(dish)}>Ver de cerca</Btn>
            <IconBtn name="chevron_right" onClick={() => setIdx(i => (i+1)%MENU_SEED.length)}/>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:12 }}>
            {MENU_SEED.slice(0,8).map((_,i) => <div key={i} style={{ width: i===idx%8?18:6, height:6,
              borderRadius:9999, background: i===idx%8 ? C.primary : C.surfaceHighest, transition:'all 250ms' }}/>)}
          </div>
        </div>
        <div style={{ paddingBottom:24 }}>
          <ComensalNav active="ar" go={go} order={order}/>
        </div>
      </div>
    </div>
  );
};

// ═══ P01-C · AR MÍNIMA ═════════════════════════════════════
const ARMinimal = ({ go, onDish, order, groupReady }) => {
  const ready = useARReady();
  const [idx, setIdx] = useState(0);
  const dish = MENU_SEED[idx];
  return (
    <div className="screen" style={{ position:'relative', background:'#0D0A09', overflow:'hidden' }}>
      <CameraBG/>
      <RestaurantPill/>
      {!ready && <ARLoading/>}

      {ready && (
        <div className="pop-in" style={{ position:'absolute', top:'26%', left:0, right:0, display:'flex',
          flexDirection:'column', alignItems:'center', zIndex:10 }}>
          {/* Retícula */}
          <div onClick={() => onDish(dish)} style={{ position:'relative', cursor:'pointer' }}>
            <div style={{ width:230, height:230, borderRadius:9999, border:'1.5px solid rgba(255,255,255,0.35)',
              animation:'reticlePulse 2.4s ease-in-out infinite', position:'absolute', inset:0 }}/>
            <div style={{ width:230, height:230, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:196, height:196, borderRadius:9999, overflow:'hidden',
                animation:'floaty 4s ease-in-out infinite', boxShadow:'0 36px 70px rgba(0,0,0,0.55)' }}>
                <Photo src={dish.photo} emoji={dish.emoji} radius={9999} emojiSize={90} style={{ width:'100%', height:'100%' }}/>
              </div>
            </div>
          </div>
          <div style={{ marginTop:20, textAlign:'center' }}>
            <div style={{ fontFamily:serif, fontSize:24, color:'white', textShadow:'0 4px 16px rgba(0,0,0,0.5)' }}>{dish.name}</div>
            <div style={{ fontSize:15, color:'rgba(255,255,255,0.75)', marginTop:4 }}>{fmt(dish.price)} · toca para ver de cerca</div>
          </div>
        </div>
      )}

      {ready && <GroupStack go={go} ready={groupReady}/>}

      {/* Carrusel pill inferior */}
      <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:30, padding:'0 0 30px' }}>
        <div className="hide-scroll" style={{ display:'flex', gap:10, padding:'0 24px 18px', overflowX:'auto' }}>
          {MENU_SEED.filter(d=>d.active).map((d,i) => {
            const on = MENU_SEED.indexOf(d) === idx;
            return (
              <button key={d.id} onClick={() => setIdx(MENU_SEED.indexOf(d))} {...pressFx} style={{
                flexShrink:0, display:'flex', alignItems:'center', gap:9, border:'none', cursor:'pointer',
                background: on ? 'rgba(254,249,241,0.94)' : 'rgba(254,249,241,0.18)',
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                borderRadius:9999, padding:'7px 16px 7px 7px', transition:'all 220ms cubic-bezier(0.22,1.4,0.36,1)' }}>
                <div style={{ width:34, height:34, borderRadius:9999, overflow:'hidden', flexShrink:0 }}>
                  <Photo src={d.photo} emoji={d.emoji} radius={9999} emojiSize={18} style={{ width:'100%', height:'100%' }}/>
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:13, fontWeight:600, color: on ? C.primary : 'white', whiteSpace:'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize:12, color: on ? C.muted : 'rgba(255,255,255,0.7)' }}>{fmt(d.price)}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:14 }}>
          <IconBtn name="menu_book" dark size={52} onClick={() => go('menu')}/>
          <button onClick={() => onDish(dish)} {...pressFx} style={{ background:gradVino, border:'none',
            borderRadius:9999, width:64, height:64, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', boxShadow:'0 12px 32px rgba(79,23,40,0.45)', transition:'transform 150ms' }}>
            <Icon name="view_in_ar" size={28} color="white"/>
          </button>
          <IconBtn name="person" dark size={52} onClick={() => go('perfil')}/>
        </div>
      </div>
    </div>
  );
};

// ═══ P02 · DETALLE DE PLATILLO ═════════════════════════════
const DishDetail = ({ dish, onBack, onAdd, inOrder, go, order=[], onAddSide, groupReady=3 }) => {
  const [qty, setQty] = useState(1);
  const [sendOpen, setSendOpen] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [viewMode, setViewMode] = useState('3d'); // 3d | ar
  const pairings = useMemo(() => {
    const pool = MENU_SEED.filter(d => d.active && d.id !== dish.id);
    return [pool.find(d => d.cat === 'Entradas'), pool.find(d => d.cat === 'Bebidas'), pool.find(d => d.cat === 'Postres')].filter(Boolean);
  }, [dish.id]);
  return (
    <div className="screen" style={{ position:'relative', background:'#0A0808', overflow:'hidden' }}>
      {viewMode === 'ar' ? (
        <CameraBG/>
      ) : (
        <React.Fragment>
          <img src={dish.photo} alt="" onError={e=>e.target.style.display='none'}
            style={{ position:'absolute', inset:0, width:'100%', height:'60%', objectFit:'cover',
              filter:'brightness(0.42) saturate(1.2) blur(18px)', transform:'scale(1.2)' }}/>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 24%, rgba(79,23,40,0.32) 0%, rgba(10,8,8,0.95) 68%)' }}/>
        </React.Fragment>
      )}

      <div style={{ position:'absolute', top:58, left:20, right:20, zIndex:30, display:'flex',
        justifyContent:'space-between', alignItems:'center' }}>
        <IconBtn name="arrow_back" dark onClick={onBack}/>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {dish.chef && <ChefBadge/>}
          {/* Toggle Vista 3D / Realidad Aumentada */}
          <div style={{ display:'flex', gap:3, background:'rgba(254,249,241,0.16)', backdropFilter:'blur(16px)',
            WebkitBackdropFilter:'blur(16px)', borderRadius:9999, padding:3 }}>
            {[['3d','deployed_code','Vista 3D'],['ar','view_in_ar','Realidad Aumentada']].map(([m,ic,tt]) => {
              const on = viewMode === m;
              return (
                <button key={m} title={tt} onClick={() => setViewMode(m)} {...pressFx} style={{ border:'none',
                  cursor:'pointer', borderRadius:9999, width:38, height:32, display:'flex', alignItems:'center',
                  justifyContent:'center', background: on ? C.surface : 'transparent',
                  transition:'all 180ms' }}>
                  <Icon name={ic} size={17} color={on ? C.primary : 'rgba(255,255,255,0.8)'}/>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sesión grupal flotante */}
      {go && <GroupStack go={go} ready={groupReady}/>}

      {/* Hero */}
      <div className="pop-in" style={{ position:'absolute', top:'12%', left:'50%', transform:'translateX(-50%)', zIndex:10,
        display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:252, height:252, borderRadius:9999, padding:7, animation:'floaty 4.5s ease-in-out infinite',
          background:'rgba(255,255,255,0.09)', border:'1.5px solid rgba(255,255,255,0.2)',
          boxShadow:'0 48px 90px rgba(0,0,0,0.6), 0 0 80px rgba(184,134,11,0.2)' }}>
          <Photo src={dish.photo} emoji={dish.emoji} radius={9999} emojiSize={110} style={{ width:'100%', height:'100%' }}/>
        </div>
        <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:8,
          background:'rgba(254,249,241,0.14)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
          borderRadius:9999, padding:'8px 18px' }}>
          <Icon name={viewMode==='ar' ? 'view_in_ar' : '360'} size={18} color="white"/>
          <span style={{ fontSize:13, color:'white', fontWeight:500 }}>
            {viewMode==='ar' ? 'Muévete alrededor · está en tu mesa' : 'Arrastra para girar · tamaño real'}
          </span>
        </div>
      </div>

      {/* Sheet */}
      <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:C.surfaceLow,
        borderRadius:'40px 40px 0 0', maxHeight:'54%', display:'flex', flexDirection:'column',
        boxShadow:'0px -24px 60px rgba(29,28,23,0.3)', zIndex:20 }}>
        <Grip/>
        <div className="hide-scroll" style={{ overflowY:'auto', padding:'0 28px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, marginBottom:8 }}>
            <div style={{ fontFamily:serif, fontSize:29, lineHeight:'35px', color:C.primary, letterSpacing:'-0.015em' }}>{dish.name}</div>
            <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal, flexShrink:0 }}>{fmt(dish.price)}</div>
          </div>
          <p style={{ fontSize:14, color:C.muted, lineHeight:'22px', marginBottom:14 }}>{dish.desc}</p>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
            {dish.chips.map(c => <Chip key={c}>{c}</Chip>)}
            {dish.spice > 0 && <Chip>{'🌶️'.repeat(dish.spice)} {['','Suave','Medio','Bravo'][dish.spice]}</Chip>}
            <Chip>{dish.kcal} kcal</Chip>
          </div>
          {dish.maridaje !== '—' && (
            <div style={{ background:'white', borderRadius:18, padding:'13px 16px', marginBottom:18,
              boxShadow:'0 2px 10px rgba(29,28,23,0.06)', display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'rgba(184,134,11,0.12)', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="wine_bar" size={19} color={C.dorado}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.dorado, letterSpacing:'0.04em', textTransform:'uppercase' }}>Maridaje del sommelier</div>
                <div style={{ fontSize:13.5, color:C.muted, marginTop:2 }}>{dish.maridaje}</div>
              </div>
            </div>
          )}

          {/* Para acompañar */}
          <div style={{ display:'flex', alignItems:'center', gap:8, margin:'2px 0 10px', flexWrap:'wrap' }}>
            <span style={{ fontFamily:serif, fontSize:17, color:C.primary }}>Para acompañar</span>
            <Chip tone="dorado" style={{ fontSize:10.5, padding:'3px 10px' }}>
              <Icon name="star" size={12} color="#8A6508" fill/> Sugerencia del chef
            </Chip>
          </div>
          <div className="hide-scroll" style={{ display:'flex', gap:10, overflowX:'auto', margin:'0 -28px 18px', padding:'0 28px' }}>
            {pairings.map(p => {
              const added = order.some(o => o.id === p.id);
              return (
                <div key={p.id} style={{ flexShrink:0, width:150, background:'white', borderRadius:18, padding:9,
                  boxShadow:'0 2px 10px rgba(29,28,23,0.06)' }}>
                  <Photo src={p.photo} emoji={p.emoji} radius={12} emojiSize={26} style={{ width:'100%', height:64, marginBottom:7 }}/>
                  <div style={{ fontSize:12.5, fontWeight:600, color:C.charcoal, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:5 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.primary }}>{fmt(p.price)}</span>
                    <button onClick={() => onAddSide && onAddSide(p)} {...pressFx} style={{ width:30, height:30, borderRadius:9999,
                      border:'none', cursor:'pointer', background: added ? gradVino : C.surfaceHigh,
                      display:'flex', alignItems:'center', justifyContent:'center', transition:'all 200ms' }}>
                      <Icon name={added ? 'check' : 'add'} size={16} color={added ? 'white' : C.muted}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {/* Stepper */}
            <div style={{ display:'flex', alignItems:'center', gap:4, background:'white', borderRadius:9999,
              padding:5, boxShadow:'0 2px 10px rgba(29,28,23,0.07)' }}>
              <IconBtn name="remove" size={36} iconSize={18} onClick={() => setQty(q => Math.max(1, q-1))}/>
              <span style={{ width:24, textAlign:'center', fontSize:16, fontWeight:700, color:C.charcoal }}>{qty}</span>
              <IconBtn name="add" size={36} iconSize={18} onClick={() => setQty(q => q+1)}/>
            </div>
            <Btn variant={inOrder ? 'secondary' : 'primary'} style={{ flex:1 }}
              iconName={inOrder ? 'check' : 'add_shopping_cart'}
              onClick={() => onAdd(qty)}>
              {inOrder ? 'En tu orden' : `Agregar · ${fmt(dish.price * qty)}`}
            </Btn>
            <IconBtn name="send" size={48} iconSize={20} onClick={() => setSendOpen(true)}
              style={{ background:'white', boxShadow:'0 2px 10px rgba(29,28,23,0.08)' }}/>
          </div>
        </div>
      </div>

      {/* Enviar a un comensal */}
      {sendOpen && (
        <div style={{ position:'absolute', inset:0, zIndex:60 }}>
          <div onClick={() => { setSendOpen(false); setSentTo(null); }} style={{ position:'absolute', inset:0,
            background:'rgba(13,10,9,0.5)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
          <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:C.surface,
            borderRadius:'32px 32px 0 0', padding:'0 24px 34px', boxShadow:'0px -24px 60px rgba(29,28,23,0.35)' }}>
            <Grip/>
            {sentTo ? (
              <div className="pop-in" style={{ textAlign:'center', padding:'18px 0 22px' }}>
                <div style={{ width:66, height:66, borderRadius:9999, background:gradVino, margin:'0 auto',
                  display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 16px 36px rgba(79,23,40,0.35)' }}>
                  <Icon name="send" size={28} color="white"/>
                </div>
                <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginTop:12 }}>¡Enviado a {sentTo}!</div>
                <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>Le llegará como recomendación tuya, con vista 3D.</div>
              </div>
            ) : (
              <React.Fragment>
                <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginBottom:2 }}>Enviar a un comensal</div>
                <div style={{ fontSize:12.5, color:C.muted, marginBottom:12 }}>Recomiéndale "{dish.name}" a alguien de tu mesa.</div>
                {GROUP.filter(p => p.id !== 'tu').map(p => (
                  <div key={p.id} onClick={() => { setSentTo(p.name); setTimeout(() => { setSendOpen(false); setSentTo(null); }, 1400); }}
                    {...pressFx} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:18,
                    padding:'10px 14px', marginBottom:8, cursor:'pointer', boxShadow:'0 2px 10px rgba(29,28,23,0.05)',
                    transition:'transform 150ms' }}>
                    <Avatar person={p} size={42}/>
                    <span style={{ flex:1, fontSize:14.5, fontWeight:600, color:C.charcoal }}>{p.name}</span>
                    <Icon name="send" size={17} color={C.dorado}/>
                  </div>
                ))}
              </React.Fragment>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { CameraBG, ARLoading, ComensalNav, RestaurantPill, ARInmersiva, AREditorial, ARMinimal, DishDetail });
