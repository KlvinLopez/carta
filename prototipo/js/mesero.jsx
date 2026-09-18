// ═══════════════════════════════════════════════════════════
// MESERO — P19a/b onboarding · P20 perfil · P06 mesas · P07 detalle · P08 pedidos
// ═══════════════════════════════════════════════════════════
const { useState, useEffect } = React;

// ── Nav inferior mesero ────────────────────────────────────
const MeseroNav = ({ active, go }) => (
  <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:40,
    background:'rgba(254,249,241,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
    boxShadow:'0px -12px 32px rgba(29,28,23,0.08)', display:'flex', justifyContent:'space-around',
    padding:'10px 24px 26px' }}>
    {[
      { id:'mesas',   icon:'table_restaurant', label:'Mis mesas' },
      { id:'perfil',  icon:'person',           label:'Mi perfil' },
    ].map(n => {
      const on = active === n.id;
      return (
        <button key={n.id} onClick={() => go(n.id)} {...pressFx} style={{ background:'none', border:'none',
          cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:72 }}>
          <div style={{ width:46, height:30, borderRadius:9999, display:'flex', alignItems:'center',
            justifyContent:'center', background: on ? 'rgba(79,23,40,0.1)' : 'transparent', transition:'background 200ms' }}>
            <Icon name={n.icon} size={22} color={on ? C.primary : C.outline} fill={on}/>
          </div>
          <span style={{ fontSize:11, fontWeight: on?700:500, color: on ? C.primary : C.outline }}>{n.label}</span>
        </button>
      );
    })}
  </div>
);

// ═══ P19b · INVITACIÓN (mesero existente) ══════════════════
const WaiterInvite = ({ go }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden' }}>
    <div style={{ padding:'70px 28px 0', flex:1 }}>
      <div style={{ fontFamily:serif, fontStyle:'italic', fontSize:21, color:C.primary, marginBottom:24 }}>Carta</div>
      <div className="pop-in" style={{ background:'white', borderRadius:28, padding:'24px 22px',
        boxShadow:'0 16px 48px rgba(79,23,40,0.12)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:54, height:54, borderRadius:18, background:gradVino,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="restaurant" size={26} color="white"/>
          </div>
          <div>
            <div style={{ fontFamily:serif, fontSize:22, color:C.charcoal }}>{RESTAURANT.name}</div>
            <div style={{ fontSize:13, color:C.muted }}>{RESTAURANT.tagline} · CDMX</div>
          </div>
        </div>
        <div style={{ fontSize:15.5, lineHeight:'24px', color:C.charcoal, marginBottom:16 }}>
          Te invita a unirte a su equipo de piso como <b>mesero senior</b>.
        </div>
        <div style={{ background:C.surfaceLow, borderRadius:18, padding:'13px 16px', marginBottom:18 }}>
          {[['schedule','Turno','Mar – Dom · 13:00 a 22:00'],['payments','Propinas','100% directas vía Carta'],['table_restaurant','Zona','Terraza + salón principal']].map(([ic,l,v]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 0' }}>
              <Icon name={ic} size={17} color={C.dorado}/>
              <span style={{ fontSize:13, color:C.muted, width:64 }}>{l}</span>
              <span style={{ fontSize:13.5, fontWeight:600, color:C.charcoal }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Tu perfil viaja contigo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(184,134,11,0.1)',
          borderRadius:18, padding:'12px 14px', marginBottom:20 }}>
          <Avatar person={{ name:WAITER.name, emoji:WAITER.emoji, photo:WAITER.photo }} size={44} ring/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13.5, fontWeight:700, color:C.charcoal }}>{WAITER.name}</div>
            <div style={{ fontSize:12, color:'#8A6508', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <Icon name="star" size={13} color={C.dorado} fill/> {WAITER.rating} · {WAITER.reviews} reseñas viajan contigo
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:10 }}>
          <Btn variant="secondary" onClick={() => go('mesas')}>Rechazar</Btn>
          <Btn variant="primary" iconName="check" onClick={() => go('mesas')}>Aceptar y unirme</Btn>
        </div>
      </div>
      <div style={{ textAlign:'center', marginTop:22 }}>
        <button onClick={() => go('p19a')} style={{ background:'none', border:'none', cursor:'pointer',
          fontSize:13.5, color:C.muted }}>
          ¿Primera vez en Carta? <span style={{ color:C.dorado, fontWeight:700 }}>Crea tu perfil de mesero</span>
        </button>
      </div>
    </div>
  </div>
);

// ═══ P19a · REGISTRO (mesero nuevo) ════════════════════════
const WaiterRegister = ({ go }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [spec, setSpec] = useState(['Vinos','Mezcal']);
  const opts = ['Vinos','Mezcal','Mariscos','Grupos grandes','Cocina de autor','Postres','Café de especialidad'];
  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'60px 24px 6px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <IconBtn name="arrow_back" onClick={() => go('p19b')}/>
        <div>
          <div style={{ fontFamily:serif, fontSize:22, color:C.charcoal }}>Crea tu perfil de mesero</div>
          <div style={{ fontSize:12.5, color:C.muted }}>Es tuyo. Viaja contigo a cualquier restaurante.</div>
        </div>
      </div>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'14px 26px 0' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
          <div style={{ position:'relative' }}>
            <image-slot id="waiter-photo" shape="circle" placeholder="Tu foto"
              style={{ width:'104px', height:'104px' }}></image-slot>
            <div style={{ position:'absolute', bottom:0, right:0, width:32, height:32, borderRadius:9999,
              background:gradVino, display:'flex', alignItems:'center', justifyContent:'center',
              border:`3px solid ${C.surface}` }}>
              <Icon name="photo_camera" size={15} color="white"/>
            </div>
          </div>
        </div>
        <Field label="Nombre completo" value={name} onChange={setName} placeholder="Como te conocen tus mesas"/>
        <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+52 …" type="tel"/>
        <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:8 }}>Tus especialidades</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:18 }}>
          {opts.map(o => {
            const on = spec.includes(o);
            return <button key={o} onClick={() => setSpec(s => on ? s.filter(x=>x!==o) : [...s,o])} {...pressFx}
              style={{ border:'none', cursor:'pointer', borderRadius:9999, padding:'9px 16px', fontSize:13,
                fontWeight:600, fontFamily:sans, background: on ? gradVino : 'white',
                color: on ? 'white' : C.muted, boxShadow: on ? '0 6px 14px rgba(79,23,40,0.22)' : '0 2px 8px rgba(29,28,23,0.05)',
                transition:'all 180ms' }}>{o}</button>;
          })}
        </div>
        <div style={{ background:'rgba(184,134,11,0.1)', borderRadius:18, padding:'13px 16px', display:'flex',
          gap:11, alignItems:'flex-start', marginBottom:20 }}>
          <Icon name="badge" size={19} color={C.dorado} style={{ marginTop:1 }}/>
          <div style={{ fontSize:12.5, lineHeight:'19px', color:'#6B5410' }}>
            Tu rating y reseñas se acumulan en tu perfil, no en el restaurante. Si cambias de trabajo, tu reputación va contigo.
          </div>
        </div>
        <div style={{ height:16 }}/>
      </div>
      <div style={{ padding:'10px 24px 40px', flexShrink:0 }}>
        <Btn variant="primary" style={{ width:'100%' }} onClick={() => go('mesas')}>Crear mi perfil</Btn>
      </div>
    </div>
  );
};

// ═══ P06 · MIS MESAS ═══════════════════════════════════════
const estadoMesa = {
  libre:  { dot:C.mesaLibre, label:'Libre',  bg:C.surfaceLow },
  activa: { dot:C.success,   label:'Activa', bg:'white', anim:'pulseDot 1.4s ease-in-out infinite' },
  alerta: { dot:C.rojoVivo,  label:'Alerta', bg:'white', anim:'ripple 1.2s ease-out infinite' },
  pagada: { dot:C.morado,    label:'Pagando', bg:'white' },
};

const MESAS_DE_CARLOS = Object.entries(ASIGN_MESAS).filter(([,w]) => w === 'Carlos Ramírez').map(([n]) => +n);
const MisMesas = ({ go, mesas, onMesa, escenario='Normal' }) => {
  const [vista, setVista] = useState('mesas');      // mesas | pedidos
  const [soloMias, setSoloMias] = useState(true);
  const mesasVisibles = soloMias ? mesas.filter(m => MESAS_DE_CARLOS.includes(m.n)) : mesas;
  const activas = mesasVisibles.filter(m => m.estado !== 'libre').length;
  const alertas = mesas.filter(m => m.estado === 'alerta');
  const [swapOpen, setSwapOpen] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const alertaActiva = alertas.find(m => !dismissed.includes(m.n));
  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div style={{ padding:'60px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Avatar person={{ name:WAITER.name, emoji:WAITER.emoji, photo:WAITER.photo }} size={48} ring/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:serif, fontSize:23, color:C.charcoal }}>Hola, Carlos</div>
            <div style={{ fontSize:12.5, color:C.muted }}>{RESTAURANT.name} · turno de tarde</div>
          </div>
          <div style={{ display:'flex', gap:3, background:C.surfaceHigh, borderRadius:9999, padding:3 }}>
            {[[true,'Mías'],[false,'Todas']].map(([v,l]) => {
              const on = soloMias === v;
              return (
                <button key={l} onClick={() => setSoloMias(v)} style={{ border:'none', cursor:'pointer',
                  borderRadius:9999, padding:'6px 13px', fontSize:11.5, fontWeight:700, fontFamily:sans,
                  background: on ? 'white' : 'transparent', color: on ? C.primary : C.muted,
                  boxShadow: on ? '0 2px 8px rgba(29,28,23,0.09)' : 'none', transition:'all 180ms' }}>{l}</button>
              );
            })}
          </div>
        </div>
        {/* Indicadores del turno */}
        <div style={{ background:'white', borderRadius:18, padding:'11px 16px', margin:'14px 0 0',
          display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
          {[['payments','$2,140 hoy'],['receipt_long','9 órdenes'],['timer','4.2 min prom.']].map(([ic,l]) => (
            <span key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:C.muted }}>
              <Icon name={ic} size={15} color={C.dorado}/>{l}
            </span>
          ))}
        </div>
        {alertaActiva && (
          <div className="pop-in" style={{ marginTop:14, background:gradVino, borderRadius:20,
            padding:'12px 16px', display:'flex', alignItems:'center', gap:11,
            boxShadow:'0 10px 26px rgba(79,23,40,0.3)' }}>
            <Icon name="notifications_active" size={20} color="white"/>
            <div onClick={() => onMesa(alertaActiva.n)} style={{ flex:1, cursor:'pointer' }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:'white' }}>
                Mesa {alertaActiva.n} — {alertaActiva.fase?.toLowerCase() || 'necesita atención'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.72)' }}>{alertaActiva.min} min · toca para atender</div>
            </div>
            <button onClick={() => setDismissed(d => [...d, alertaActiva.n])} {...pressFx} style={{ display:'flex',
              alignItems:'center', gap:5, background:'rgba(255,255,255,0.18)', border:'none', cursor:'pointer',
              borderRadius:9999, padding:'7px 13px', fontSize:12, fontWeight:700, color:'white', fontFamily:sans,
              whiteSpace:'nowrap', transition:'transform 130ms' }}>
              <Icon name="check" size={14} color="white" weight={700}/> Atendida
            </button>
          </div>
        )}
        {/* Toggle Mesas | Pedidos */}
        <div style={{ display:'flex', gap:3, background:C.surfaceHigh, borderRadius:9999, padding:3, margin:'16px 0 0' }}>
          {[['mesas','table_restaurant','Mesas'],['pedidos','receipt_long','Pedidos']].map(([v,ic,l]) => {
            const on = vista === v;
            return (
              <button key={v} onClick={() => setVista(v)} {...pressFx} style={{ flex:1, display:'flex', alignItems:'center',
                justifyContent:'center', gap:7, border:'none', cursor:'pointer', borderRadius:9999, padding:'9px 0',
                fontSize:13, fontWeight:700, fontFamily:sans, background: on ? gradVino : 'transparent',
                color: on ? 'white' : C.muted, boxShadow: on ? '0 6px 16px rgba(79,23,40,0.22)' : 'none', transition:'all 180ms' }}>
                <Icon name={ic} size={16} color={on ? 'white' : C.muted}/>{l}
              </button>
            );
          })}
        </div>
        {vista === 'mesas' ? (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', margin:'14px 0 12px' }}>
            <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>{soloMias ? 'Tus mesas asignadas' : 'Todas las mesas'}</span>
            <span style={{ fontSize:12.5, color:C.muted }}>{activas} de {mesasVisibles.length} ocupadas</span>
          </div>
        ) : <div style={{ height:12 }}/>}
      </div>

      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
        {vista === 'pedidos' ? (
          <OrderFlowList key={soloMias ? 'mios' : 'todos'} variant={soloMias ? 'mesero' : 'capitan'} escenario={escenario}/>
        ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {mesasVisibles.map(m => {
            const e = estadoMesa[m.estado];
            const libre = m.estado === 'libre';
            return (
              <div key={m.n} onClick={() => !libre && onMesa(m.n)} {...(libre?{}:pressFx)} style={{
                background:e.bg, borderRadius:24, padding:'16px 16px 14px', cursor: libre?'default':'pointer',
                boxShadow: libre ? 'none' : '0 4px 16px rgba(79,23,40,0.08)',
                transition:'transform 150ms', position:'relative', overflow:'hidden' }}>
                {m.estado==='alerta' && <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:gradVino }}/>}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontFamily:serif, fontSize:20, color: libre ? C.outline : C.primary }}>Mesa {m.n}</span>
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:C.muted }}>
                    <span style={{ width:9, height:9, borderRadius:9999, background:e.dot,
                      animation: e.anim || 'none' }}/>
                    {e.label}
                  </span>
                </div>
                {libre ? (
                  <div style={{ fontSize:12.5, color:C.outline, paddingBottom:6 }}>Lista para recibir</div>
                ) : (
                  <React.Fragment>
                    <div style={{ fontSize:12.5, color:C.muted }}>{m.pax} personas · {m.min} min</div>
                    <div style={{ fontSize:12, fontWeight:600, marginTop:3,
                      color: m.estado==='alerta' ? C.rojoVivo : m.estado==='pagada' ? C.morado : C.dorado }}>{m.fase}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:9 }}>
                      <div>
                        <span style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{m.total ? fmt(m.total) : '—'}</span>
                        {m.estado === 'pagada' && <div style={{ fontSize:11, fontWeight:600, color:'#8A6508', marginTop:2 }}>
                          + {fmt(m.propina != null ? m.propina : Math.round(m.total*0.15))} propina
                        </div>}
                      </div>
                      {m.grupo && <Chip tone="vino" style={{ fontSize:10.5, padding:'3px 9px' }}>
                        <Icon name="group" size={12} color={C.primary}/> grupal</Chip>}
                    </div>
                  </React.Fragment>
                )}
              </div>
            );
          })}
        </div>
        )}
        <div style={{ height:120 }}/>
      </div>
      {/* Cambio de sesión — tablet compartida */}
      <button onClick={() => setSwapOpen(true)} {...pressFx} title="Cambiar sesión de mesero" style={{
        position:'absolute', right:20, bottom:104, zIndex:45, width:56, height:56, borderRadius:9999,
        border:'none', background:gradVino, cursor:'pointer', display:'flex', alignItems:'center',
        justifyContent:'center', boxShadow:'0 14px 32px rgba(79,23,40,0.4)', transition:'transform 150ms' }}>
        <Icon name="switch_account" size={25} color="white"/>
      </button>
      {swapOpen && <PinSwapModal device={{ name:'Esta tablet · iPad Salón', sesion:WAITER.name }}
        onClose={() => setSwapOpen(false)} onDone={() => setSwapOpen(false)}/>}
      <MeseroNav active="mesas" go={go}/>
    </div>
  );
};

// ═══ P07 · DETALLE DE MESA ═════════════════════════════════
const DetalleMesa = ({ go, mesa, updateMesa, perms = WAITER_PERMS_DEFAULT, setOrderStatus, embedded = false, onBack, modRequest, setModRequest }) => {
  const [items, setItems] = useState(() => {
    const WHO7 = ['Ana','Diego','Sofía'];
    const servido = !!mesa && (mesa.fase === 'Platos servidos' || mesa.estado === 'pagada');
    return itemsDeMesa(mesa ? mesa.n : 7).map((it,i) => ({ ...it,
      who: mesa && mesa.n === 7 ? (WHO7[i] || 'Mesa') : `Comensal ${i+1}`,
      listo: servido, cancelado:false }));
  });
  const [notified, setNotified] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addFor, setAddFor] = useState(null);        // platillo esperando "¿para quién?"
  const [closed, setClosed] = useState(mesa && mesa.estado === 'pagada');
  const [paidPct, setPaidPct] = useState(mesa && mesa.estado === 'pagada' ? 100 : 0);
  const [cashVal, setCashVal] = useState(mesa && mesa.estado === 'pagada');
  const [undo, setUndo] = useState(false);
  const [serveUndo, setServeUndo] = useState(false);
  const [serveSnap, setServeSnap] = useState([]);
  const [modSel, setModSel] = useState({});
  // El pago avanza solo: 3 comensales pagan desde su teléfono (0→75%)
  useEffect(() => {
    if (closed && paidPct < 75) { const x = setTimeout(() => setPaidPct(p => Math.min(75, p+25)), 1500); return () => clearTimeout(x); }
  }, [closed, paidPct]);
  if (!mesa) return null;
  const e = estadoMesa[mesa.estado];
  const served = items.filter(i=>i.listo).length;
  const allServed = items.filter(i=>!i.cancelado).every(i => i.listo);
  const canEdit = perms.addItems || perms.removeItems || perms.editQty || perms.editPrice;
  const orderTotal = items.filter(i=>!i.cancelado).reduce((s,it) => s + it.precio*it.q, 0);
  const setQty = (i, d) => setItems(arr => arr.map((x,j) => j===i ? {...x, q:Math.max(1, x.q+d)} : x));
  const setPrecio = (i, v) => setItems(arr => arr.map((x,j) => j===i ? {...x, precio:Math.max(0, +v||0)} : x));
  const removeItem = i => setItems(arr => arr.filter((_,j) => j!==i));
  const addItem = (d, who) => { setItems(arr => [...arr, { n:d.name, q:1, who, listo:false, precio:d.price, cancelado:false }]); setAddFor(null); setAddOpen(false); };
  const cashAmount = Math.round(orderTotal * 0.25);
  const nPaid = Math.round(paidPct / 25);
  const paidDone = paidPct >= 100;
  const cleanReady = paidDone && cashVal;
  // Cerrar orden: cancela pendientes y abre el cobro, con ventana de deshacer
  const cerrarOrden = () => {
    setItems(arr => arr.map(x => x.listo ? x : {...x, cancelado:true}));
    setClosed(true); setUndo(true);
    updateMesa(mesa.n, { estado:'pagada', fase:'Cobrando' });
    setTimeout(() => setUndo(false), 5000);
  };
  const deshacer = () => {
    setItems(arr => arr.map(x => ({...x, cancelado:false})));
    setClosed(false); setPaidPct(0); setCashVal(false); setUndo(false);
    updateMesa(mesa.n, { estado:'activa', fase:'Platos servidos' });
  };
  const limpiar = () => { updateMesa(mesa.n, { estado:'libre', pax:0, min:0, total:0, fase:undefined }); if (setOrderStatus) setOrderStatus('armando'); onBack ? onBack() : go('mesas'); };

  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      {/* Header vino */}
      <div style={{ background:gradVino, padding:'58px 24px 20px', borderRadius:'0 0 36px 36px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <IconBtn name="arrow_back" dark onClick={() => go('mesas')}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:serif, fontSize:26, color:'white' }}>Mesa {mesa.n}</div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.72)' }}>
              {mesa.pax} personas · {mesa.min} min en mesa
            </div>
          </div>
          <span style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.14)',
            backdropFilter:'blur(10px)', borderRadius:9999, padding:'7px 14px', fontSize:12.5, fontWeight:600, color:'white' }}>
            <span style={{ width:8, height:8, borderRadius:9999,
              background: { activa:'#22C55E', alerta:'#FDC34D', pagada:C.morado }[mesa.estado] || 'white',
              animation: ['activa','alerta','pagada'].includes(mesa.estado) ? 'pulseSoft 1.4s ease-in-out infinite' : 'none' }}/>
            {e.label}
          </span>
        </div>
        {mesa.grupo && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:16 }}>
            <div style={{ display:'flex' }}>
              {GROUP.slice(1).map((p,i) => (
                <div key={p.id} style={{ marginLeft: i>0 ? -10 : 0 }}>
                  <Avatar person={p} size={36}/>
                </div>
              ))}
            </div>
            <span style={{ fontSize:12.5, color:'rgba(255,255,255,0.8)' }}>Sesión grupal · 3 de 4 confirmaron</span>
          </div>
        )}
      </div>

      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'18px 24px 0' }}>
        {mesa.estado === 'alerta' && (
          <div style={{ background:'rgba(186,26,26,0.08)', borderRadius:18, padding:'12px 15px',
            display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
            <Icon name="warning" size={19} color={C.error}/>
            <div style={{ fontSize:13, color:C.error, fontWeight:600, flex:1 }}>{mesa.fase} · {mesa.min} min</div>
            {notified
              ? <span className="pop-in" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:'#15803D' }}>
                  <Icon name="check_circle" size={15} color="#15803D" fill/> Notificación enviada a cocina
                </span>
              : <button onClick={() => updateMesa(mesa.n, { estado:'activa', fase: mesa.fase==='Demorada' ? 'Orden en cocina' : 'Platos servidos' })} {...pressFx} style={{ background:C.error, color:'white', border:'none', borderRadius:9999,
                  padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                  <Icon name="check" size={13} color="white" weight={700}/> Atendida</button>}
          </div>
        )}
        {/* Solicitud de modificación del comensal — el mesero decide */}
        {modRequest && modRequest.status === 'pendiente' && (
          <div className="pop-in" style={{ background:'white', borderRadius:22, padding:'14px 16px', marginBottom:14,
            boxShadow:'0 8px 24px rgba(79,23,40,0.12)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
              <div style={{ width:36, height:36, borderRadius:9999, background:'rgba(184,134,11,0.14)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="edit_note" size={19} color={C.dorado}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:C.charcoal }}>Solicitud de cambio · {modRequest.from}</div>
                <div style={{ fontSize:11.5, color:C.muted }}>Tú decides qué aplicar — puedes aceptar todo, parte o nada</div>
              </div>
            </div>
            {modRequest.changes.map((c,i) => (
              <div key={i} onClick={() => setModSel(s => ({...s, [i]: s[i]===false ? true : false}))} style={{ display:'flex',
                alignItems:'center', gap:10, padding:'7px 4px', cursor:'pointer' }}>
                <div style={{ width:22, height:22, borderRadius:7, flexShrink:0,
                  background: modSel[i]!==false ? C.success : C.surfaceHighest,
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'background 180ms' }}>
                  {modSel[i]!==false && <Icon name="check" size={14} color="white" weight={700}/>}
                </div>
                <span style={{ fontSize:13.5, color:C.charcoal, opacity: modSel[i]===false ? 0.5 : 1 }}>{c}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:9, marginTop:10 }}>
              <Btn variant="secondary" style={{ flex:1, fontSize:13, padding:'11px 10px' }}
                onClick={() => setModRequest({ ...modRequest, status:'rechazada' })}>Rechazar</Btn>
              <Btn variant="primary" style={{ flex:1.3, fontSize:13, padding:'11px 10px' }}
                onClick={() => {
                  modRequest.changes.forEach((c,i) => {
                    if (modSel[i] === false) return;
                    const mm = c.match(/^([+\u2212-])(\d+)\s(.+)$/);
                    if (!mm) return;
                    const sign = mm[1] === '+' ? 1 : -1, q = +mm[2], name = mm[3];
                    setItems(arr => {
                      const idx = arr.findIndex(x => x.n === name && !x.cancelado);
                      if (sign > 0) {
                        if (idx >= 0) return arr.map((x,j) => j===idx ? {...x, q:x.q+q} : x);
                        const d = MENU_SEED.find(dd => dd.name === name);
                        return [...arr, { n:name, q, who:'Comensal 1', listo:false, precio:d?d.price:0, cancelado:false }];
                      }
                      if (idx < 0) return arr;
                      return arr.map((x,j) => j===idx ? {...x, q:x.q-q} : x).filter(x => x.q > 0);
                    });
                  });
                  setModRequest({ ...modRequest, status:'aceptada' });
                }}>
                Aceptar ({modRequest.changes.filter((_,i)=>modSel[i]!==false).length} de {modRequest.changes.length})
              </Btn>
            </div>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>Orden</span>
          {canEdit
            ? <button onClick={() => setEditing(v=>!v)} {...pressFx} style={{ display:'flex', alignItems:'center', gap:6,
                background: editing ? gradVino : C.surfaceHigh, border:'none', cursor:'pointer', borderRadius:9999,
                padding:'7px 14px', fontSize:12.5, fontWeight:700, fontFamily:sans, color: editing ? 'white' : C.primary }}>
                <Icon name={editing ? 'check' : 'edit'} size={15} color={editing ? 'white' : C.primary}/>
                {editing ? 'Listo' : 'Editar orden'}
              </button>
            : <span style={{ fontSize:12.5, color:C.muted }}>{served} de {items.length} servidos</span>}
        </div>
        {editing && (
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:10 }}>
            {perms.editQty && <Chip tone="success" style={{ fontSize:11 }}><Icon name="check" size={12} color="#15803D"/> Cantidades</Chip>}
            {perms.removeItems && <Chip tone="success" style={{ fontSize:11 }}><Icon name="check" size={12} color="#15803D"/> Eliminar</Chip>}
            {perms.editPrice
              ? <Chip tone="success" style={{ fontSize:11 }}><Icon name="check" size={12} color="#15803D"/> Precios</Chip>
              : <Chip tone="error" style={{ fontSize:11 }}><Icon name="lock" size={12} color={C.error}/> Precios (sin permiso)</Chip>}
          </div>
        )}
        <div style={{ background:'white', borderRadius:24, padding:'4px 16px', boxShadow:'0 4px 16px rgba(79,23,40,0.06)', marginBottom: editing && perms.addItems ? 10 : 16 }}>
          {items.map((it,i) => editing ? (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 0',
              borderBottom: i<items.length-1 ? '1px solid rgba(91,74,61,0.07)' : 'none' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.charcoal }}>{it.n}</div>
                <div style={{ fontSize:11.5, color:C.muted }}>para {it.who}</div>
                {it.alergia && <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:'0.04em', color:C.error,
                  marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                  <Icon name="warning" size={12} color={C.error}/> ALERGIA: {it.alergia.toUpperCase()} — sin este ingrediente</div>}
              </div>
              {perms.editQty ? (
                <div style={{ display:'flex', alignItems:'center', gap:2, background:C.surfaceLow, borderRadius:9999, padding:3 }}>
                  <IconBtn name="remove" size={28} iconSize={15} onClick={() => setQty(i,-1)} style={{ background:'transparent' }}/>
                  <span style={{ width:18, textAlign:'center', fontSize:14, fontWeight:700, color:C.charcoal }}>{it.q}</span>
                  <IconBtn name="add" size={28} iconSize={15} onClick={() => setQty(i,1)} style={{ background:'transparent' }}/>
                </div>
              ) : <span style={{ fontSize:13, color:C.muted }}>×{it.q}</span>}
              {perms.editPrice
                ? <div style={{ display:'flex', alignItems:'center', background:C.surfaceLow, borderRadius:12, padding:'6px 10px' }}>
                    <span style={{ fontSize:13, color:C.muted }}>$</span>
                    <input value={it.precio} onChange={ev => setPrecio(i, ev.target.value.replace(/\D/g,''))}
                      style={{ width:44, border:'none', background:'transparent', fontSize:13.5, fontWeight:700, color:C.charcoal, textAlign:'right', fontFamily:sans }}/>
                  </div>
                : <span style={{ fontSize:14, fontWeight:700, color:C.charcoal, width:56, textAlign:'right' }}>{fmt(it.precio*it.q)}</span>}
              {perms.removeItems && <IconBtn name="delete" size={34} iconSize={17} onClick={() => removeItem(i)} style={{ background:'transparent' }}/>}
            </div>
          ) : (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 0',
              borderBottom: i<items.length-1 ? '1px solid rgba(91,74,61,0.07)' : 'none' }}>
              <button onClick={() => setItems(arr => arr.map((x,j) => j===i ? {...x, listo:!x.listo} : x))}
                {...pressFx} style={{ width:28, height:28, borderRadius:9999, border:'none', cursor:'pointer',
                  background: it.listo ? C.success : C.surfaceHigh, display:'flex', alignItems:'center',
                  justifyContent:'center', transition:'all 200ms', flexShrink:0 }}>
                {it.listo && <Icon name="check" size={16} color="white" weight={700}/>}
              </button>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14.5, fontWeight:600, color:C.charcoal,
                  textDecoration: it.listo ? 'line-through' : 'none',
                  opacity: it.listo ? 0.55 : 1 }}>{it.q>1?`${it.q}× `:''}{it.n}</div>
                <div style={{ fontSize:11.5, color:C.muted }}>para {it.who}</div>
                {it.alergia && <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:'0.04em', color:C.error,
                  marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                  <Icon name="warning" size={12} color={C.error}/> ALERGIA: {it.alergia.toUpperCase()} — sin este ingrediente</div>}
              </div>
              {!it.listo && <Chip style={{ fontSize:11, padding:'3px 10px' }}>en cocina</Chip>}
            </div>
          ))}
        </div>
        {editing && perms.addItems && (
          <button onClick={() => setAddOpen(true)} {...pressFx} style={{ display:'flex', alignItems:'center',
            justifyContent:'center', gap:8, width:'100%', marginBottom:16, background:'transparent',
            border:`1.5px dashed ${C.outline}66`, borderRadius:16, padding:'12px 0', fontSize:13.5, fontWeight:700,
            color:C.primary, cursor:'pointer', fontFamily:sans }}>
            <Icon name="add" size={17} color={C.primary}/> Agregar producto
          </button>
        )}

        <div style={{ background:C.surfaceLow, borderRadius:20, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13.5, color:C.muted }}>Total de la mesa</span>
            <span style={{ fontFamily:serif, fontSize:22, color:C.primary }}>{fmt(orderTotal)}</span>
          </div>
          {mesa.estado === 'pagada' && (
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
              <span style={{ fontSize:12.5, fontWeight:700, color:'#8A6508' }}>Propina</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#8A6508' }}>+ {fmt(mesa.propina != null ? mesa.propina : Math.round(orderTotal*0.15))}</span>
            </div>
          )}
        </div>
        <div style={{ height:130 }}/>
      </div>

      {/* Acciones */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 20px 96px',
        background:'rgba(254,249,241,0.94)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        boxShadow:'0px -16px 36px rgba(29,28,23,0.1)' }}>
        {!closed ? (
          <div style={{ display:'flex', gap:10 }}>
            {!allServed ? (
              <Btn variant="secondary" style={{ flex:1, fontSize:14.5, padding:'14px 10px' }} iconName="room_service"
                onClick={() => { setServeSnap(items.map(x=>x.listo));
                  setItems(arr => arr.map(x => x.cancelado ? x : {...x, listo:true}));
                  if (setOrderStatus) setOrderStatus('servida'); updateMesa(mesa.n, { estado:'activa', fase:'Platos servidos' });
                  setServeUndo(true); setTimeout(() => setServeUndo(false), 5000); }}>
                Todo servido
              </Btn>
            ) : (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                background:'rgba(34,197,94,0.12)', borderRadius:9999 }}>
                <Icon name="check_circle" size={17} color="#15803D" fill/>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#15803D' }}>Platos servidos</span>
              </div>
            )}
            <Btn variant="primary" style={{ flex:1.15, fontSize:14.5, padding:'14px 10px' }} iconName="receipt_long"
              onClick={cerrarOrden}>
              Cerrar cuenta
            </Btn>
          </div>
        ) : cleanReady ? (
          <Btn variant="dorado" style={{ width:'100%', fontSize:16 }} iconName="cleaning_services" onClick={limpiar}>
            Marcar mesa limpia
          </Btn>
        ) : (
          <div>
            {/* Indicador de pago — no interactivo, como '3 de 4 listos' */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:7 }}>
              <span style={{ fontSize:13, fontWeight:700, color: paidDone ? C.dorado : C.primary }}>
                {nPaid} de 4 comensales pagaron
              </span>
              <span style={{ fontSize:12, color:C.muted }}>{fmt(Math.round(orderTotal*paidPct/100))} de {fmt(orderTotal)}</span>
            </div>
            <div style={{ height:10, borderRadius:9999, background:C.surfaceLow, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${paidPct}%`, borderRadius:9999,
                background: paidDone ? gradDorado : 'linear-gradient(90deg,#15803D,#22C55E)',
                transition:'width 550ms cubic-bezier(0.22,1.2,0.36,1)' }}/>
            </div>
            {paidPct >= 75 && !cashVal ? (
              <button onClick={() => { setPaidPct(100); setCashVal(true); }} {...pressFx} style={{ width:'100%', marginTop:11,
                height:46, borderRadius:9999, border:'none', cursor:'pointer', background:gradVino, color:'white',
                fontSize:13.5, fontWeight:700, fontFamily:sans, display:'flex', alignItems:'center', justifyContent:'center',
                gap:8, transition:'transform 130ms' }}>
                <Icon name="account_balance_wallet" size={18} color="white"/>
                Validar efectivo / transferencia · {fmt(cashAmount)}
              </button>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:9 }}>
                <span style={{ width:7, height:7, borderRadius:9999, background:C.dorado,
                  animation:'pulseSoft 1.2s ease-in-out infinite' }}/>
                <span style={{ fontSize:12, color:C.muted }}>Cobro en curso · pagos desde el teléfono de cada comensal</span>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Toast deshacer */}
      {undo && (
        <div className="pop-in" style={{ position:'absolute', left:20, right:20, bottom:160, zIndex:70,
          background:C.charcoal, borderRadius:16, padding:'12px 14px 12px 18px', display:'flex', alignItems:'center', gap:12,
          boxShadow:'0 16px 40px rgba(0,0,0,0.3)' }}>
          <Icon name="receipt_long" size={18} color={C.doradoLight}/>
          <span style={{ flex:1, fontSize:13, color:'white' }}>Cuenta cerrada · pendientes cancelados</span>
          <button onClick={deshacer} {...pressFx} style={{ background:'rgba(255,255,255,0.16)', border:'none',
            borderRadius:9999, padding:'7px 15px', fontSize:12.5, fontWeight:700, color:'white', cursor:'pointer', fontFamily:sans }}>
            Deshacer
          </button>
        </div>
      )}
      {serveUndo && (
        <div className="pop-in" style={{ position:'absolute', left:20, right:20, bottom:160, zIndex:70,
          background:C.charcoal, borderRadius:16, padding:'12px 14px 12px 18px', display:'flex', alignItems:'center', gap:12,
          boxShadow:'0 16px 40px rgba(0,0,0,0.3)' }}>
          <Icon name="room_service" size={17} color={C.doradoLight}/>
          <span style={{ flex:1, fontSize:13, color:'white' }}>Todos los platos marcados como servidos</span>
          <button onClick={() => { setItems(arr => arr.map((x,i) => ({...x, listo: serveSnap[i] !== undefined ? serveSnap[i] : x.listo}))); setServeUndo(false); }}
            {...pressFx} style={{ background:'rgba(255,255,255,0.16)', border:'none', borderRadius:9999,
            padding:'7px 15px', fontSize:12.5, fontWeight:700, color:'white', cursor:'pointer', fontFamily:sans }}>
            Deshacer
          </button>
        </div>
      )}
      {/* Sheet agregar producto — 2 pasos */}
      {addOpen && (
        <div style={{ position:'absolute', inset:0, zIndex:90 }}>
          <div onClick={() => { setAddOpen(false); setAddFor(null); }} style={{ position:'absolute', inset:0,
            background:'rgba(29,28,23,0.42)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
          <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:C.surface,
            borderRadius:'32px 32px 0 0', padding:'0 22px 30px', maxHeight:'72%', display:'flex', flexDirection:'column',
            boxShadow:'0px -24px 60px rgba(29,28,23,0.3)' }}>
            <Grip/>
            {addFor ? (
              <React.Fragment>
                <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:14 }}>
                  <IconBtn name="arrow_back" size={34} iconSize={17} onClick={() => setAddFor(null)}/>
                  <Photo src={addFor.photo} emoji={addFor.emoji} radius={11} emojiSize={20} style={{ width:42, height:42 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{addFor.name}</div>
                    <div style={{ fontSize:12, color:C.muted }}>¿Para quién es este platillo?</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {['Ana','Diego','Sofía','Mesa'].map(who => (
                    <button key={who} onClick={() => addItem(addFor, who)} {...pressFx} style={{ display:'flex', alignItems:'center',
                      gap:8, background:'white', border:`1.5px solid ${C.surfaceHighest}`, cursor:'pointer', borderRadius:9999,
                      padding:'11px 18px', fontSize:14, fontWeight:600, fontFamily:sans, color:C.charcoal, transition:'transform 130ms' }}>
                      <Icon name={who==='Mesa' ? 'groups' : 'person'} size={17} color={C.primary}/>{who}
                    </button>
                  ))}
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginBottom:2 }}>Agregar producto</div>
                <div style={{ fontSize:12.5, color:C.muted, marginBottom:12 }}>A la orden de la mesa {mesa.n}</div>
                <div className="hide-scroll" style={{ overflowY:'auto' }}>
                  {MENU_SEED.filter(d => d.active).map(d => (
                    <div key={d.id} onClick={() => setAddFor(d)} {...pressFx} style={{ display:'flex', alignItems:'center', gap:12,
                      background:'white', borderRadius:18, padding:'9px 13px', marginBottom:8, cursor:'pointer',
                      boxShadow:'0 2px 8px rgba(29,28,23,0.04)', transition:'transform 150ms' }}>
                      <Photo src={d.photo} emoji={d.emoji} radius={11} emojiSize={20} style={{ width:42, height:42, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13.5, fontWeight:600, color:C.charcoal }}>{d.name}</div>
                        <div style={{ fontSize:11.5, color:C.muted }}>{d.cat}</div>
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:C.primary }}>{fmt(d.price)}</span>
                      <Icon name="chevron_right" size={20} color={C.outline}/>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      )}
      {!embedded && <MeseroNav active="mesas" go={go}/>}
    </div>
  );
};

// ═══ P08 · MIS PEDIDOS — flujo de un toque ═════════════════
const PEDIDOS_FLOW = [
  { id:1, lugar:'Mesa 4',      icon:'table_restaurant', pax:4, min:1,  estado:'pendiente', extra:true,  propina:0, items:['2× Tres Leches de Fresa','1× Agua de Jamaica'], total:275, mesero:'Carlos Ramírez' },
  { id:2, lugar:'Mesa 7',      icon:'table_restaurant', pax:4, min:6,  estado:'en cocina', grupo:true,  propina:0, items:['1× Costilla de Res 12 h','1× Aguachile Verde'], total:530, mesero:'Carlos Ramírez' },
  { id:3, lugar:'Barra',       icon:'local_bar',        pax:1, min:2,  estado:'pendiente', propina:0,   items:['2× Mezcal de la Casa','1× Agua de Jamaica'], total:325, mesero:'Mariana López' },
  { id:4, lugar:'Mesa 12',     icon:'table_restaurant', pax:3, min:10, estado:'en cocina', demorado:true, alergia:'Mariscos', propina:0, items:['3× Tacos al Pastor','2× Agua de Jamaica'], total:345, mesero:'Carlos Ramírez' },
  { id:5, lugar:'Mesa 9',      icon:'table_restaurant', pax:2, min:12, estado:'pagada',    extra:true,  propina:42, items:['1× Mole Negro de la Casa'], total:265, mesero:'Carlos Ramírez' },
];

const FLOW_META = {
  pendiente:   { stripe:C.warning,  chipBg:'rgba(245,158,11,0.15)',  chipColor:'#92600A', chipIcon:null,        label:'Por confirmar', cta:'Aceptar  →',       ctaBg:gradVino,   ctaColor:'white',    next:'en cocina' },
  'en cocina': { stripe:C.info,     chipBg:'rgba(59,130,246,0.12)',  chipColor:'#1D4ED8', chipIcon:'skillet',   label:'En cocina', cta:'Marcar servida  ✓', ctaBg:C.surfaceHigh, ctaColor:C.charcoal, next:'servida' },
  servida:     { stripe:C.success,  chipBg:'rgba(34,197,94,0.13)',   chipColor:'#15803D', chipIcon:'room_service', label:'Servida', cta:'Confirmar pago',   ctaBg:gradDorado, ctaColor:'white',    next:'pagada' },
  pagada:      { stripe:C.morado,   chipBg:'rgba(126,76,158,0.13)',  chipColor:C.morado,  chipIcon:'hourglass_top', label:'Pagando',  cta:'Marcar limpia',    ctaBg:'#22C55E',  ctaColor:'white',    next:'cerrada' },
  cerrada:     { stripe:C.mesaLibre, chipBg:C.surfaceHigh,           chipColor:C.muted,   chipIcon:'check',     label:'Cerrada',   cta:null },
};

const OrderFlowList = ({ variant='mesero', historial=false, escenario='Normal' }) => {
  const [orders, setOrders] = useState(() => pedidosEscenario(escenario));
  useEffect(() => { setOrders(pedidosEscenario(escenario)); }, [escenario]);
  const [filter, setFilter] = useState('Todos');
  const mine = variant==='mesero' ? orders.filter(o => o.mesero === WAITER.name) : orders;
  const abiertos = mine.filter(o => o.estado !== 'cerrada');
  const cerrados = mine.filter(o => o.estado === 'cerrada');
  const atender = (id, key) => setOrders(prev => prev.map(o => o.id===id ? {...o, [key]:false} : o));
  const advance = id => setOrders(prev => prev.map(o => {
    if (o.id !== id) return o;
    const next = FLOW_META[o.estado].next;
    return { ...o, estado: next, demorado: false, min: 0 };
  }));
  const filters = [
    ['Todos', abiertos.length], ['Pendientes', abiertos.filter(o=>o.estado==='pendiente').length],
    ['En cocina', abiertos.filter(o=>o.estado==='en cocina').length],
    ['Por cobrar', abiertos.filter(o=>['servida','pagada'].includes(o.estado)).length],
    ['Cerradas', cerrados.length],
  ];
  let list = historial || filter==='Cerradas' ? cerrados : abiertos;
  if (!historial) {
    if (filter==='Pendientes') list = abiertos.filter(o=>o.estado==='pendiente');
    if (filter==='En cocina')  list = abiertos.filter(o=>o.estado==='en cocina');
    if (filter==='Por cobrar') list = abiertos.filter(o=>['servida','pagada'].includes(o.estado));
  }
  return (
    <div>
      {!historial && (
        <div className="hide-scroll" style={{ display:'flex', gap:8, overflowX:'auto', margin:'0 -24px 12px', padding:'0 24px' }}>
          {filters.map(([f,n]) => (
            <button key={f} onClick={() => setFilter(f)} style={{ flexShrink:0, border:'none', cursor:'pointer',
              borderRadius:9999, padding:'8px 16px', fontSize:12.5, fontWeight:700, fontFamily:sans,
              background: filter===f ? gradVino : C.surfaceHigh, color: filter===f ? 'white' : C.muted,
              transition:'all 180ms' }}>{f} ({n})</button>
          ))}
        </div>
      )}
      {list.map(p => {
        const meta = FLOW_META[p.estado];
        return (
          <div key={p.id} style={{ position:'relative', background:'white', borderRadius:24, padding:'14px 16px 13px 21px',
            marginBottom:12, boxShadow:'0 4px 16px rgba(79,23,40,0.06)', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:12, bottom:12, width:5, borderRadius:'0 6px 6px 0',
              background: p.demorado ? C.error : meta.stripe, transition:'background 300ms' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
              <Icon name={p.icon} size={17} color={C.primary}/>
              <span style={{ fontFamily:serif, fontSize:17.5, color:C.primary }}>{p.lugar}</span>
              {p.pax > 0 && <span style={{ fontSize:11.5, color:C.muted, display:'flex', alignItems:'center', gap:3 }}>
                <Icon name="group" size={13} color={C.outline}/>{p.pax}</span>}
              <span style={{ fontSize:11.5, color:C.muted, display:'flex', alignItems:'center', gap:3 }}>
                <Icon name="schedule" size={13} color={C.outline}/>{p.min > 0 ? `${p.min} min` : 'ahora'}</span>
              <span style={{ flex:1 }}/>
              <span key={p.estado} className="pop-in" style={{ background:meta.chipBg, color:meta.chipColor,
                borderRadius:9999, padding:'4px 11px', fontSize:10.5, fontWeight:800, letterSpacing:'0.06em',
                textTransform:'uppercase', display:'flex', alignItems:'center', gap:4 }}>
                {meta.chipIcon && <Icon name={meta.chipIcon} size={12} color="currentColor"/>}{meta.label}
              </span>
            </div>
            <div style={{ fontSize:13, color:C.charcoal, lineHeight:'20px' }}>{p.items.join(', ')}
              {p.extra && <span style={{ background:C.surfaceHigh, color:C.muted, borderRadius:7, padding:'2px 7px',
                fontSize:9.5, fontWeight:800, letterSpacing:'0.06em', marginLeft:7, verticalAlign:'1px' }}>EXTRA</span>}
            </div>
            {p.cliente && <div style={{ fontSize:11.5, color:C.muted, marginTop:2 }}>Cliente: {p.cliente}</div>}
            {variant!=='mesero' && <div style={{ fontSize:11.5, color:C.muted, marginTop:2 }}>Atiende {p.mesero}</div>}
            {(p.demorado || p.llamo || (p.alergias && Object.keys(p.alergias).length > 0)) && (
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:8 }}>
                {p.demorado && <div style={{ background:C.error, color:'white', borderRadius:10, padding:'5px 6px 5px 11px',
                  fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:6 }}>
                  <Icon name="warning" size={13} color="white"/> DEMORADA · {p.min} MIN
                  <span style={{ flex:1 }}/>
                  <button onClick={() => atender(p.id, 'demorado')} {...pressFx} style={{ background:'rgba(255,255,255,0.22)',
                    border:'none', borderRadius:9999, padding:'5px 12px', fontSize:10, fontWeight:800, letterSpacing:'0.06em',
                    color:'white', cursor:'pointer', fontFamily:sans, display:'flex', alignItems:'center', gap:4 }}>
                    <Icon name="check" size={11} color="white" weight={700}/> ATENDIDA</button>
                </div>}
                {p.llamo && <div style={{ background:gradVino, color:'white', borderRadius:10, padding:'5px 6px 5px 11px',
                  fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:6 }}>
                  <Icon name="room_service" size={13} color="white"/> LLAMÓ AL MESERO
                  <span style={{ flex:1 }}/>
                  <button onClick={() => atender(p.id, 'llamo')} {...pressFx} style={{ background:'rgba(255,255,255,0.22)',
                    border:'none', borderRadius:9999, padding:'5px 12px', fontSize:10, fontWeight:800, letterSpacing:'0.06em',
                    color:'white', cursor:'pointer', fontFamily:sans, display:'flex', alignItems:'center', gap:4 }}>
                    <Icon name="check" size={11} color="white" weight={700}/> ATENDIDA</button>
                </div>}
                {p.alergias && Object.entries(p.alergias).map(([dish, al]) => (
                  <div key={dish} style={{ background:'rgba(186,26,26,0.08)', color:C.error, borderRadius:10,
                    padding:'6px 11px', fontSize:10.5, fontWeight:800, letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:6 }}>
                    <Icon name="warning" size={13} color={C.error}/> {dish.toUpperCase()} — ALERGIA: {al.toUpperCase()}</div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'8px 0 9px' }}>
              {p.estado==='pagada'
                ? <span style={{ fontSize:12, fontWeight:700, color:'#8A6508' }}>Propina {fmt(p.propina||0)}</span>
                : <span/>}
              <span style={{ fontFamily:serif, fontSize:19, color:'#8A6508' }}>{fmt(p.total)}</span>
            </div>
            {meta.cta && (
              <button key={meta.cta} onClick={() => advance(p.id)} {...pressFx} className="pop-in" style={{ width:'100%',
                border:'none', cursor:'pointer', borderRadius:15, padding:'12px 0', fontSize:12.5, fontWeight:800,
                letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:sans, background:meta.ctaBg,
                color:meta.ctaColor, transition:'transform 130ms', animationDuration:'250ms' }}>{meta.cta}</button>
            )}
          </div>
        );
      })}
      {list.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 30px', color:C.muted }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🧾</div>
          <div style={{ fontSize:14, fontWeight:600, color:C.charcoal }}>Nada por aquí</div>
          <div style={{ fontSize:12.5, marginTop:3 }}>Las órdenes cerradas quedan en "Cerradas".</div>
        </div>
      )}
    </div>
  );
};

const MisPedidos = ({ go }) => {
  const [viewAll, setViewAll] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  return (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
    <div style={{ padding:'62px 24px 0', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:serif, fontSize:26, color:C.charcoal }}>{viewAll ? 'Pedidos del turno' : 'Mis pedidos'}</div>
        <div style={{ display:'flex', gap:3, background:C.surfaceHigh, borderRadius:9999, padding:3 }}>
          {[['mios','Míos'],['todos','Brigada']].map(([k,l]) => {
            const on = viewAll === (k==='todos');
            return (
              <button key={k} onClick={() => setViewAll(k==='todos')} style={{ border:'none', cursor:'pointer',
                borderRadius:9999, padding:'6px 13px', fontSize:11.5, fontWeight:700, fontFamily:sans,
                background: on ? 'white' : 'transparent', color: on ? C.primary : C.muted,
                boxShadow: on ? '0 2px 8px rgba(29,28,23,0.09)' : 'none', transition:'all 180ms' }}>{l}</button>
            );
          })}
        </div>
      </div>
      {/* Stats del turno */}
      <div style={{ background:'white', borderRadius:18, padding:'11px 16px', margin:'12px 0 2px',
        display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
        {[['payments','$2,140 hoy'],['receipt_long','9 órdenes'],['timer','4.2 min prom.']].map(([ic,l]) => (
          <span key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:C.muted }}>
            <Icon name={ic} size={15} color={C.dorado}/>{l}
          </span>
        ))}
      </div>
    </div>
    <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'12px 24px 0' }}>
      <OrderFlowList key={viewAll ? 'todos' : 'mios'} variant={viewAll ? 'capitan' : 'mesero'}/>
      <div style={{ height:110 }}/>
    </div>
    {/* Cambio de sesión — tablet compartida */}
    <button onClick={() => setSwapOpen(true)} {...pressFx} title="Cambiar sesión de mesero" style={{
      position:'absolute', right:20, bottom:104, zIndex:45, width:56, height:56, borderRadius:9999,
      border:'none', background:gradVino, cursor:'pointer', display:'flex', alignItems:'center',
      justifyContent:'center', boxShadow:'0 14px 32px rgba(79,23,40,0.4)', transition:'transform 150ms' }}>
      <Icon name="switch_account" size={25} color="white"/>
    </button>
    {swapOpen && <PinSwapModal device={{ name:'Esta tablet · iPad Salón', sesion:WAITER.name }}
      onClose={() => setSwapOpen(false)} onDone={() => setSwapOpen(false)}/>}
    <MeseroNav active="pedidos" go={go}/>
  </div>
  );
};

// ═══ P20 · PERFIL PORTABLE ═════════════════════════════════
const WaiterProfile = ({ go, profile = WAITER, nav }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
    <div className="hide-scroll" style={{ flex:1, overflowY:'auto' }}>
      {/* Hero */}
      <div style={{ background:gradVino, padding:'64px 24px 26px', borderRadius:'0 0 40px 40px', textAlign:'center' }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:2 }}>
          <IconBtn name="edit" dark size={38} iconSize={17}/>
        </div>
        <div style={{ display:'flex', justifyContent:'center' }}>
          <Avatar person={{ name:profile.name, emoji:profile.emoji, photo:profile.photo }} size={104} ring/>
        </div>
        <div style={{ fontFamily:serif, fontSize:27, color:'white', marginTop:12 }}>{profile.name}</div>
        {profile.badge && <div style={{ fontSize:12, fontStyle:'italic', fontFamily:serif, color:'rgba(255,255,255,0.75)', marginTop:2 }}>{profile.badge}</div>}
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:6, marginTop:6 }}>
          <Icon name="star" size={17} color={C.doradoLight} fill/>
          <span style={{ fontSize:15.5, fontWeight:700, color:'white' }}>{profile.rating}</span>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.65)' }}>· {profile.reviews} reseñas · {profile.years} años</span>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:7, marginTop:12, flexWrap:'wrap' }}>
          {profile.languages.map(l => <Chip key={l} tone="glass" style={{ fontSize:12 }}>{l}</Chip>)}
          <Chip tone="glass" style={{ fontSize:12 }}>
            <Icon name="verified" size={13} color="white" fill/> Perfil verificado
          </Chip>
        </div>
      </div>

      <div style={{ padding:'20px 24px 0' }}>
        {/* Nota portable */}
        <div style={{ display:'flex', gap:11, background:'rgba(184,134,11,0.1)', borderRadius:18,
          padding:'12px 15px', marginBottom:20, alignItems:'center' }}>
          <Icon name="luggage" size={20} color={C.dorado}/>
          <div style={{ fontSize:12.5, lineHeight:'18px', color:'#6B5410' }}>
            <b>Este perfil es tuyo, no del restaurante.</b> Tu reputación te acompaña a donde trabajes.
          </div>
        </div>

        {/* Especialidades */}
        <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:10 }}>Especialidades</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:22 }}>
          {profile.specialties.map(s => <Chip key={s} tone="vino">{s}</Chip>)}
        </div>

        {/* Trayectoria */}
        <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:10 }}>Trayectoria</div>
        <div style={{ background:'white', borderRadius:24, padding:'6px 18px', boxShadow:'0 4px 16px rgba(79,23,40,0.06)', marginBottom:22 }}>
          {profile.history.map((h,i) => (
            <div key={h.rest} style={{ display:'flex', gap:13, padding:'13px 0',
              borderBottom: i<profile.history.length-1 ? '1px solid rgba(91,74,61,0.07)' : 'none' }}>
              <div style={{ width:40, height:40, borderRadius:14, flexShrink:0,
                background: i===0 ? gradVino : C.surfaceLow,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="restaurant" size={19} color={i===0 ? 'white' : C.muted}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{h.rest}</div>
                <div style={{ fontSize:12.5, color:C.muted }}>{h.role} · {h.period}</div>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:C.dorado, display:'flex', alignItems:'center', gap:3 }}>
                <Icon name="star" size={13} color={C.dorado} fill/>{h.rating}
              </span>
            </div>
          ))}
        </div>

        {/* Reseñas */}
        <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:10 }}>Reseñas de comensales</div>
        {profile.reviewsList.map((r,i) => (
          <div key={i} style={{ background:'white', borderRadius:22, padding:'14px 17px', marginBottom:10,
            boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12, color:C.muted }}>{r.who}</span>
              <Stars value={r.stars} size={14} gap={2}/>
            </div>
            <div style={{ fontSize:13.5, lineHeight:'20px', color:C.charcoal, marginBottom:8 }}>"{r.text}"</div>
            <div style={{ display:'flex', gap:6 }}>
              {r.tags.map(t => <Chip key={t} tone="dorado" style={{ fontSize:11, padding:'3px 10px' }}>{t}</Chip>)}
            </div>
          </div>
        ))}
        <div style={{ height:116 }}/>
      </div>
    </div>
    {nav !== undefined ? nav : <MeseroNav active="perfil" go={go}/>}
  </div>
);

Object.assign(window, { MeseroNav, WaiterInvite, WaiterRegister, MisMesas, DetalleMesa, MisPedidos, WaiterProfile, OrderFlowList, PEDIDOS_FLOW, FLOW_META });
