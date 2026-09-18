// ═══════════════════════════════════════════════════════════
// ADMIN MÓVIL 1 — nav + inicio + menú + pedidos + analytics
// ═══════════════════════════════════════════════════════════
const { useState } = React;

const AdminMobNav = ({ active, go }) => {
  const map = { team:'settings', devices:'settings', performance:'settings' };
  const cur = map[active] || active;
  return (
    <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:40,
      background:'rgba(254,249,241,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      boxShadow:'0px -12px 32px rgba(29,28,23,0.08)', display:'flex', justifyContent:'space-around',
      padding:'10px 8px 26px' }}>
      {[
        { id:'dashboard', icon:'space_dashboard', label:'Inicio' },
        { id:'menu',      icon:'restaurant_menu', label:'Menú' },
        { id:'orders',    icon:'receipt_long',    label:'Pedidos' },
        { id:'analytics', icon:'monitoring',      label:'Analytics' },
        { id:'settings',  icon:'settings',        label:'Config' },
      ].map(n => {
        const on = cur === n.id;
        return (
          <button key={n.id} onClick={() => go(n.id)} {...pressFx} style={{ background:'none', border:'none',
            cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:58 }}>
            <div style={{ width:44, height:30, borderRadius:9999, display:'flex', alignItems:'center',
              justifyContent:'center', background: on ? 'rgba(79,23,40,0.1)' : 'transparent', transition:'background 200ms' }}>
              <Icon name={n.icon} size={21} color={on ? C.primary : C.outline} fill={on}/>
            </div>
            <span style={{ fontSize:10, fontWeight: on?700:500, letterSpacing:'0.06em', textTransform:'uppercase',
              color: on ? C.primary : C.outline }}>{n.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const MobTop = ({ title, onBack, right }) => (
  <div style={{ padding:'58px 20px 8px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
    {onBack ? <IconBtn name="arrow_back" size={38} iconSize={19} onClick={onBack}/> : <div style={{ width:4 }}/>}
    <div style={{ flex:1, fontFamily:serif, fontSize:23, color:C.primary, textAlign: onBack ? 'center' : 'left' }}>{title}</div>
    {right || <div style={{ position:'relative' }}>
      <IconBtn name="notifications" size={38} iconSize={19}/>
      <span style={{ position:'absolute', top:6, right:7, width:8, height:8, borderRadius:9999, background:C.dorado }}/>
    </div>}
  </div>
);

const MobScreen = ({ nav, go, children, label }) => (
  <div className="screen" data-screen-label={label} style={{ background:C.surface, display:'flex',
    flexDirection:'column', overflow:'hidden', position:'relative' }}>
    {children}
    <AdminMobNav active={nav} go={go}/>
  </div>
);

// ═══ INICIO (móvil) ════════════════════════════════════════
const MobHome = ({ go, empty, escenario='Normal' }) => {
  const [dismissed, setDismissed] = useState([]);
  const mesasH = mesasEscenario(escenario);
  const occ = mesasH.filter(m => m.estado !== 'libre').length;
  const paxTotal = mesasH.reduce((s,m) => s + (m.pax||0), 0);
  const tops = MENU_SEED.filter(d=>d.active).sort((a,b)=>b.orders-a.orders).slice(0,4);
  const alerts = [
    { id:'inv', stripe:gradDorado, icon:'local_fire_department', color:'#C2410C',
      text:'Costilla de Res casi agotada — quedan 3 porciones', link:'Ver inventario', to:'menu' },
    { id:'rev', stripe:'linear-gradient(180deg,#22C55E,#15803D)', icon:'reviews', color:'#15803D',
      text:'Nueva reseña ★★★★★ — "Increíble experiencia AR"', link:'Leer comentario', to:'analytics' },
  ].filter(a => !dismissed.includes(a.id));
  return (
    <MobScreen nav="dashboard" go={go} label="Admin móvil · Inicio">
      <div style={{ padding:'58px 20px 8px', display:'flex', alignItems:'center', gap:11, flexShrink:0 }}>
        <div style={{ width:40, height:40, borderRadius:9999, background:gradVino,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="restaurant" size={19} color="white"/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:serif, fontSize:20, color:C.primary, lineHeight:1.1 }}>{RESTAURANT.name}</div>
          <div style={{ fontSize:10.5, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:C.muted }}>The Digital Sommelier</div>
        </div>
        <div style={{ position:'relative' }}>
          <IconBtn name="notifications" size={38} iconSize={19}/>
          <span style={{ position:'absolute', top:6, right:7, width:8, height:8, borderRadius:9999, background:C.error }}/>
        </div>
      </div>

      {empty ? (
        <EmptyState icon="restaurant_menu" title="Trae tu primer platillo"
          body="Sube tu primer platillo o importa tu carta en PDF y míralo en la mesa de tus comensales."
          cta="Nuevo platillo" onCta={() => go('menu')}/>
      ) : (
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'4px 20px 0' }}>
        {/* Quick actions */}
        <div style={{ background:'white', borderRadius:9999, padding:'12px 10px', display:'flex',
          justifyContent:'space-around', boxShadow:'0 6px 20px rgba(79,23,40,0.07)' }}>
          {[['restaurant_menu','Menú','menu'],['receipt_long','Pedidos','orders'],['monitoring','Analytics','analytics'],['groups','Equipo','team']].map(([ic,l,to]) => (
            <button key={l} onClick={() => go(to)} {...pressFx} style={{ background:'none', border:'none', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ width:46, height:46, borderRadius:9999, background:C.surfaceLow,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name={ic} size={20} color={C.primary}/>
              </div>
              <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:C.muted }}>{l}</span>
            </button>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'18px 2px 10px' }}>
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted }}>
            Hoy, miércoles 8 de julio
          </span>
          {alerts.length > 0 && <span style={{ width:8, height:8, borderRadius:9999, background:C.error,
            animation:'pulseSoft 1.6s infinite' }}/>}
        </div>

        {/* Alertas */}
        {alerts.map(a => (
          <div key={a.id} style={{ position:'relative', background:'white', borderRadius:22, padding:'13px 15px 13px 20px',
            marginBottom:10, boxShadow:'0 4px 14px rgba(29,28,23,0.05)', overflow:'hidden', display:'flex', gap:11 }}>
            <div style={{ position:'absolute', left:0, top:10, bottom:10, width:5, borderRadius:'0 6px 6px 0', background:a.stripe }}/>
            <Icon name={a.icon} size={19} color={a.color} style={{ marginTop:2, flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13.5, color:C.charcoal, lineHeight:'19px' }}>{a.text}</div>
              <button onClick={() => go(a.to)} style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                fontSize:12.5, fontWeight:700, color:C.dorado, textDecoration:'underline', marginTop:5, fontFamily:sans }}>{a.link}</button>
            </div>
            <button onClick={() => setDismissed(d=>[...d,a.id])} style={{ background:'none', border:'none',
              cursor:'pointer', height:'fit-content' }}>
              <Icon name="close" size={16} color={C.outline}/>
            </button>
          </div>
        ))}

        {/* Venta del día + satisfacción */}
        <div style={{ display:'flex', gap:11, marginTop:4 }}>
          <div style={{ flex:1.15, background:gradVino, borderRadius:28, padding:'16px 18px',
            boxShadow:'0 14px 32px rgba(79,23,40,0.28)' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase',
              color:'rgba(255,255,255,0.65)' }}>Venta del día</div>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginTop:6 }}>
              <span style={{ fontFamily:serif, fontSize:27, color:'white' }}>$12,480</span>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.72)' }}>↗ 8%</span>
            </div>
          </div>
          <div style={{ flex:1, background:'white', borderRadius:28, padding:'16px 18px', boxShadow:'0 4px 14px rgba(29,28,23,0.05)' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted }}>Satisfacción</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:6 }}>
              <span style={{ fontFamily:serif, fontSize:27, color:C.charcoal }}>4.7</span>
              <Icon name="star" size={15} color={C.dorado} fill/>
            </div>
            <div style={{ fontSize:10, fontStyle:'italic', color:C.outline, marginTop:2 }}>Prom. mensual: 4.5</div>
          </div>
        </div>

        {/* Actividad en vivo */}
        <div style={{ background:'white', borderRadius:28, padding:'18px 20px', marginTop:12,
          boxShadow:'0 4px 14px rgba(29,28,23,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>Actividad en vivo</span>
            <Chip tone="success" style={{ fontSize:10.5, padding:'3px 10px' }}>
              <span style={{ width:6, height:6, borderRadius:9999, background:C.success, display:'inline-block',
                animation:'pulseSoft 1.4s infinite' }}/> LIVE
            </Chip>
          </div>
          <div style={{ display:'flex', justifyContent:'space-around' }}>
            <div style={{ textAlign:'center' }}>
              <svg width="58" height="58" viewBox="0 0 58 58">
                <circle cx="29" cy="29" r="24" fill="none" stroke={C.surfaceHigh} strokeWidth="5"/>
                <circle cx="29" cy="29" r="24" fill="none" stroke={C.primary} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${(occ/mesasH.length)*151} 151`} transform="rotate(-90 29 29)"/>
                <text x="29" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.charcoal} fontFamily="DM Sans">{occ}/{mesasH.length}</text>
              </svg>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Mesas</div>
            </div>
            {[['group',String(paxTotal),'Comensales'],['timer','48m','Prom.']].map(([ic,v,l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ width:58, height:58, borderRadius:9999, background:C.surfaceLow,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
                  <Icon name={ic} size={16} color={C.primary}/>
                  <span style={{ fontSize:12, fontWeight:700, color:C.charcoal }}>{v}</span>
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Más pedidos hoy */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', margin:'18px 2px 10px' }}>
          <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>Más pedidos hoy</span>
          <button onClick={() => go('analytics')} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:12.5, fontWeight:600, color:C.dorado, fontFamily:sans }}>Ver todos</button>
        </div>
        <div className="hide-scroll" style={{ display:'flex', gap:11, overflowX:'auto', margin:'0 -20px', padding:'0 20px 4px' }}>
          {tops.map(d => (
            <div key={d.id} style={{ flexShrink:0, width:124, background:'white', borderRadius:22, padding:10,
              boxShadow:'0 4px 14px rgba(29,28,23,0.05)' }}>
              <Photo src={d.photo} emoji={d.emoji} radius={14} emojiSize={30} style={{ width:'100%', height:74, marginBottom:8 }}/>
              <div style={{ fontSize:12, fontWeight:600, color:C.charcoal, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.name}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:3 }}>
                <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>{d.orders}</span>
                <Icon name="trending_up" size={14} color={C.success}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height:104 }}/>
      </div>
      )}
    </MobScreen>
  );
};

// ═══ MI MENÚ (móvil) ═══════════════════════════════════════
const MobMenu = ({ go, empty, items, setItems, readOnly=false, embedded=false, title='Mi menú' }) => {
  const [cat, setCat] = useState('Todos');
  const [form, setForm] = useState(null);
  const cats = ['Todos','Entradas','Platos fuertes','Postres','Bebidas'];
  const list = cat==='Todos' ? items : items.filter(i => i.cat===cat);
  const toggle = id => setItems(prev => prev.map(p => p.id===id ? {...p, active:!p.active} : p));
  const save = f => {
    if (f.id) setItems(prev => prev.map(p => p.id===f.id ? {...p, ...f} : p));
    else setItems(prev => [...prev, { ...f, id: Math.max(0,...prev.map(p=>p.id))+1, orders:0, chips:[], spice:0, kcal:0, photo:'', maridaje:'—' }]);
    setForm(null);
  };
  const inner = (
    <React.Fragment>
      <MobTop title={title}/>
      {empty ? (
        <EmptyState icon="restaurant_menu" title="Trae tu primer platillo"
          body="Sube una foto y un precio — nosotros hacemos el resto." cta="Nuevo platillo" onCta={() => setForm('new')}/>
      ) : (
      <React.Fragment>
        <div style={{ padding:'2px 20px 0', flexShrink:0 }}>
          <div style={{ display:'flex', gap:9 }}>
            <div style={{ flex:1, background:C.surfaceHigh, borderRadius:16, padding:'11px 15px',
              display:'flex', alignItems:'center', gap:9 }}>
              <Icon name="search" size={18} color={C.outline}/>
              <span style={{ fontSize:13.5, color:C.outline }}>Buscar platillo…</span>
            </div>
            <IconBtn name="tune" size={44} iconSize={19}/>
          </div>
          <div style={{ display:'flex', gap:14, background:C.surfaceLow, borderRadius:14, padding:'9px 15px', margin:'10px 0 2px' }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:C.muted }}>{items.length} PLATILLOS</span>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'#15803D' }}>{items.filter(i=>i.active).length} ACTIVOS</span>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:C.error }}>{items.filter(i=>!i.active).length} PAUSADOS</span>
          </div>
          <div className="hide-scroll" style={{ display:'flex', gap:8, overflowX:'auto', margin:'10px -20px 0', padding:'0 20px' }}>
            {cats.map(c => {
              const n = c==='Todos' ? items.length : items.filter(i=>i.cat===c).length;
              return (
                <button key={c} onClick={() => setCat(c)} style={{ flexShrink:0, border:'none', cursor:'pointer',
                  borderRadius:9999, padding:'9px 17px', fontSize:13, fontWeight:700, fontFamily:sans,
                  background: cat===c ? gradVino : C.surfaceHigh, color: cat===c ? 'white' : C.muted,
                  transition:'all 180ms' }}>{c} ({n})</button>
              );
            })}
          </div>
        </div>
        <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'12px 20px 0' }}>
          {list.map(p => (
            <div key={p.id} onClick={readOnly ? undefined : () => setForm(p)} style={{ display:'flex', alignItems:'center', gap:13,
              background:'white', borderRadius:26, padding:'12px 15px', marginBottom:11, cursor: readOnly ? 'default' : 'pointer',
              boxShadow:'0 4px 14px rgba(29,28,23,0.05)', opacity: p.active ? 1 : 0.55, transition:'opacity 250ms' }}>
              <Photo src={p.photo} emoji={p.emoji} radius={16} emojiSize={26}
                style={{ width:64, height:64, flexShrink:0, filter: p.active ? 'none' : 'grayscale(0.9)' }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#8A6508' }}>{p.cat}</div>
                <div style={{ fontFamily:serif, fontSize:17, color: p.active ? C.primary : C.outline, margin:'1px 0 3px' }}>{p.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600,
                  color: p.active ? '#15803D' : C.error }}>
                  <span style={{ width:7, height:7, borderRadius:9999, background: p.active ? C.success : C.error }}/>
                  {p.active ? 'Disponible' : 'Pausado'}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                <span style={{ fontSize:16, fontWeight:700, color: p.active ? C.charcoal : C.outline }}>{fmt(p.price)}</span>
                <div onClick={e => e.stopPropagation()}><Toggle on={p.active} onChange={() => toggle(p.id)}/></div>
              </div>
            </div>
          ))}
          {/* Borrador */}
          {!readOnly && (
          <div onClick={() => setForm('new')} style={{ display:'flex', alignItems:'center', gap:13, borderRadius:26,
            padding:'12px 15px', marginBottom:11, cursor:'pointer', border:`1.5px dashed ${C.outline}55` }}>
            <div style={{ width:64, height:64, borderRadius:16, background:C.surfaceHigh, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="image" size={22} color={C.outline}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.outline }}>Sin categoría</div>
              <div style={{ fontFamily:serif, fontStyle:'italic', fontSize:17, color:C.outline, margin:'1px 0 3px' }}>Nuevo platillo</div>
              <div style={{ fontSize:11.5, fontWeight:600, color:C.outline, display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:9999, background:C.outline }}/> Borrador
              </div>
            </div>
            <span style={{ fontSize:16, fontWeight:700, color:C.outline }}>$0</span>
          </div>
          )}
          <div style={{ height:110 }}/>
        </div>
        {/* FAB */}
        {!readOnly && (
        <button onClick={() => setForm('new')} {...pressFx} style={{ position:'absolute', right:20, bottom:104, zIndex:45,
          width:58, height:58, borderRadius:9999, border:'none', background:gradVino, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 14px 32px rgba(79,23,40,0.4)',
          transition:'transform 150ms' }}>
          <Icon name="add" size={26} color="white" weight={600}/>
        </button>
        )}
      </React.Fragment>
      )}
      {form && !readOnly && <DishForm initial={form==='new' ? null : form} onSave={save} onClose={() => setForm(null)}/>}
    </React.Fragment>
  );
  if (embedded) return inner;
  return <MobScreen nav="menu" go={go} label="Admin móvil · Mi menú">{inner}</MobScreen>;
};

// ═══ PEDIDOS (móvil admin) ═════════════════════════════════
const MobOrders = ({ go, empty, escenario='Normal', mesas, updateMesa, perms, setOrderStatus }) => {
  if (empty) return (
    <MobScreen nav="orders" go={go} label="Admin móvil · Pedidos">
      <MobTop title="Pedidos"/>
      <EmptyState icon="receipt_long" title="Aún no hay pedidos"
        body="Cuando tus comensales escaneen el QR de su mesa, sus pedidos aparecerán aquí en vivo."/>
    </MobScreen>
  );
  // Misma operación que el capitán, con la nav del admin
  return <CapMesas go={() => {}} mesas={mesas} updateMesa={updateMesa} perms={perms} setOrderStatus={setOrderStatus}
    escenario={escenario} nav={<AdminMobNav active="orders" go={go}/>}/>;
};

// ═══ ANALYTICS (móvil) ═════════════════════════════════════
const MobAnalytics = ({ go, empty }) => {
  const [period, setPeriod] = useState('7 días');
  const week = [28,31,27,33,38,52,44];
  const maxW = Math.max(...week);
  const pts = week.map((v,i) => `${18 + i*(268/6)},${104 - (v/maxW)*86}`).join(' ');
  const platos = MENU_SEED.filter(d=>d.active).sort((a,b)=>b.orders-a.orders).slice(0,5);
  const maxP = platos[0].orders;
  return (
    <MobScreen nav="analytics" go={go} label="Admin móvil · Analytics">
      <MobTop title="Analytics"/>
      {empty ? (
        <EmptyState icon="monitoring" title="Tus datos están en camino"
          body="Con tus primeras órdenes verás conversión de AR a pedido, horas pico y comparativas."/>
      ) : (
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'2px 20px 0' }}>
        <div className="hide-scroll" style={{ display:'flex', gap:8, overflowX:'auto', margin:'0 -20px', padding:'0 20px' }}>
          {['Hoy','7 días','30 días','Personalizado'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ flexShrink:0, border:'none', cursor:'pointer',
              borderRadius:9999, padding:'8px 17px', fontSize:12.5, fontWeight:700, fontFamily:sans,
              background: period===p ? gradVino : C.surfaceHigh, color: period===p ? 'white' : C.muted }}>{p}</button>
          ))}
        </div>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', color:C.muted, margin:'10px 2px 12px' }}>
          1 – 8 JUL 2026
        </div>

        {/* Ingresos */}
        <div style={{ background:'white', borderRadius:26, padding:'16px 18px', boxShadow:'0 4px 14px rgba(29,28,23,0.05)' }}>
          <div style={{ fontSize:13, color:C.muted }}>Ingresos</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, margin:'2px 0 8px' }}>
            <span style={{ fontFamily:serif, fontSize:28, color:C.charcoal }}>$238,400</span>
            <span style={{ fontSize:12.5, fontWeight:700, color:'#15803D' }}>↑ 14%</span>
          </div>
          <svg width="100%" height="118" viewBox="0 0 300 118" preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
            <polygon points={`18,104 ${pts} ${18+6*(268/6)},104`} fill="rgba(79,23,40,0.06)"/>
            <circle cx={18 + 5*(268/6)} cy={104 - (52/maxW)*86} r="4" fill={C.dorado}/>
          </svg>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'0 6px' }}>
            {['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map(d => (
              <span key={d} style={{ fontSize:9, fontWeight:600, letterSpacing:'0.06em', color:C.outline }}>{d}</span>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:9, marginTop:11 }}>
          {[['Ticket prom.','$385','↑ 4%'],['Órdenes','619','↑ 12%'],['Comensales','1,847','↑ 8%']].map(([l,v,s]) => (
            <div key={l} style={{ flex:1, background:'white', borderRadius:20, padding:'12px 8px', textAlign:'center',
              boxShadow:'0 2px 10px rgba(29,28,23,0.04)' }}>
              <div style={{ fontSize:10, color:C.muted }}>{l}</div>
              <div style={{ fontFamily:serif, fontSize:18, color:C.charcoal, margin:'2px 0' }}>{v}</div>
              <div style={{ fontSize:10.5, fontWeight:700, color:'#15803D' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Rendimiento de platillos */}
        <div style={{ fontFamily:serif, fontSize:18, color:C.primary, margin:'20px 2px 10px' }}>Rendimiento de platillos</div>
        <div style={{ background:'white', borderRadius:24, padding:'16px 18px', boxShadow:'0 4px 14px rgba(29,28,23,0.05)' }}>
          {platos.map(p => (
            <div key={p.id} style={{ marginBottom:11 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12.5, color:C.charcoal }}>{p.name}</span>
                <span style={{ fontSize:12.5, fontWeight:700, color:C.charcoal }}>{p.orders}</span>
              </div>
              <div style={{ height:8, borderRadius:9999, background:C.surfaceLow, overflow:'hidden' }}>
                <div style={{ width:`${p.orders/maxP*100}%`, height:'100%', background:gradVino, borderRadius:9999 }}/>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:9, background:C.surfaceLow, borderRadius:16, padding:'11px 13px', marginTop:4 }}>
            <Icon name="lightbulb" size={16} color={C.dorado}/>
            <span style={{ fontSize:12, color:C.muted, lineHeight:'18px' }}>
              <b style={{ color:C.charcoal }}>Guacamole de Molcajete</b> genera 23% de tus ingresos este periodo.
            </span>
          </div>
        </div>

        {/* Insights */}
        <div style={{ fontFamily:serif, fontSize:18, color:C.primary, margin:'20px 2px 10px' }}>Insights de Carta</div>
        {[
          { icon:'visibility', tag:'BAJA CONVERSIÓN', tagBg:'rgba(184,134,11,0.15)', tagColor:'#8A6508',
            t:'Visto pero no pedido', body:<span>El <b>Mezcal de la Casa</b> tiene alto volumen de vistas en AR pero solo 17% de conversión. Considera revisar precio o descripción.</span> },
          { icon:'view_in_ar', tag:'ALTO IMPACTO', tagBg:'rgba(34,197,94,0.13)', tagColor:'#15803D',
            t:'Impacto del 3D/AR', body:<span>Los platillos con vista 3D se ordenan <b>2.4× más</b> y generan un ticket <b>31% mayor</b>.</span> },
        ].map(i => (
          <div key={i.t} style={{ background:'white', borderRadius:24, padding:'15px 17px', marginBottom:10,
            boxShadow:'0 4px 14px rgba(29,28,23,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
              <Icon name={i.icon} size={18} color={C.primary}/>
              <span style={{ flex:1, fontSize:14.5, fontWeight:700, color:C.charcoal }}>{i.t}</span>
              <span style={{ background:i.tagBg, color:i.tagColor, borderRadius:8, padding:'3px 8px',
                fontSize:9, fontWeight:800, letterSpacing:'0.08em' }}>{i.tag}</span>
            </div>
            <div style={{ fontSize:12.5, color:C.muted, lineHeight:'19px' }}>{i.body}</div>
          </div>
        ))}

        {/* Horas pico */}
        <div style={{ fontFamily:serif, fontSize:18, color:C.primary, margin:'20px 2px 10px' }}>Horas pico</div>
        <div style={{ background:'white', borderRadius:24, padding:'16px 18px', boxShadow:'0 4px 14px rgba(29,28,23,0.05)' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:84 }}>
            {SALES_DATA.map((v,i) => {
              const pct = v / Math.max(...SALES_DATA);
              return <div key={i} style={{ flex:1, borderRadius:9999, height:`${Math.round(pct*100)}%`,
                background: pct>0.8 ? C.primary : pct>0.5 ? 'rgba(79,23,40,0.45)' : C.surfaceHigh }}/>;
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:7 }}>
            {['9:00','13:00','17:00','22:00'].map(h => <span key={h} style={{ fontSize:9.5, color:C.outline }}>{h}</span>)}
          </div>
        </div>
        <div style={{ height:110 }}/>
      </div>
      )}
    </MobScreen>
  );
};

Object.assign(window, { AdminMobNav, MobTop, MobScreen, MobHome, MobMenu, MobOrders, MobAnalytics });
