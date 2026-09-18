// ═══════════════════════════════════════════════════════════
// ADMIN · Core — shell + P09 dashboard · P10 menú · P11 pedidos · P12 analytics
// ═══════════════════════════════════════════════════════════
const { useState, useEffect, useMemo } = React;

const ADMIN_NAV = [
  { id:'dashboard',   icon:'space_dashboard', label:'Dashboard' },
  { id:'menu',        icon:'restaurant_menu', label:'Mi menú' },
  { id:'orders',      icon:'receipt_long',    label:'Pedidos' },
  { id:'analytics',   icon:'analytics',       label:'Analytics' },
  { id:'performance', icon:'trending_up',     label:'Rendimiento' },
  { id:'team',        icon:'group',           label:'Miembros del equipo' },
  { id:'devices',     icon:'devices',         label:'Dispositivos' },
  { id:'settings',    icon:'settings',        label:'Configuración' },
];

// ── SHELL ──────────────────────────────────────────────────
const AdminShell = ({ active, setActive, children, ordersBadge=0 }) => (
  <div style={{ display:'flex', height:'100%', background:C.surface }}>
    {/* Sidebar */}
    <div style={{ width:232, background:C.primary, display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'24px 22px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,0.14)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="restaurant" size={20} color="white"/>
          </div>
          <div>
            <div style={{ fontFamily:serif, fontStyle:'italic', fontSize:19, color:'white' }}>Carta</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:-3 }}>Panel del restaurante</div>
          </div>
        </div>
        <div style={{ marginTop:14, background:'rgba(255,255,255,0.09)', borderRadius:14, padding:'10px 13px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'white' }}>{RESTAURANT.name}</div>
          <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.55)', marginTop:1 }}>{RESTAURANT.tagline} · Plan Pro</div>
        </div>
      </div>
      <div className="hide-scroll" style={{ padding:'4px 12px', flex:1, overflowY:'auto' }}>
        {ADMIN_NAV.map(n => {
          const on = active === n.id;
          return (
            <div key={n.id} onClick={() => setActive(n.id)} style={{ display:'flex', alignItems:'center', gap:11,
              padding:'9.5px 13px', borderRadius:13, marginBottom:2, cursor:'pointer',
              background: on ? 'rgba(255,255,255,0.15)' : 'transparent', transition:'background 150ms' }}>
              <Icon name={n.icon} size={19} color={on ? 'white' : 'rgba(255,255,255,0.5)'} fill={on}/>
              <span style={{ fontSize:13.5, fontWeight: on?600:400, color: on ? 'white' : 'rgba(255,255,255,0.6)' }}>{n.label}</span>
              {n.id==='orders' && ordersBadge > 0 && <span style={{ marginLeft:'auto', background:C.dorado, color:'white',
                borderRadius:9999, minWidth:18, height:18, fontSize:10, fontWeight:700, padding:'0 5px',
                display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{ordersBadge}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ padding:'0 12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px',
          background:'rgba(255,255,255,0.08)', borderRadius:14 }}>
          <div style={{ width:32, height:32, borderRadius:9999, background:gradDorado,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white' }}>V</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12.5, fontWeight:600, color:'white' }}>Valeria Ruiz</div>
            <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.5)' }}>Dueña</div>
          </div>
          <Icon name="logout" size={16} color="rgba(255,255,255,0.4)"/>
        </div>
      </div>
    </div>

    {/* Main */}
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ height:60, display:'flex', alignItems:'center', padding:'0 28px', gap:12, flexShrink:0 }}>
        <div style={{ fontSize:14, color:C.outline }}>
          {RESTAURANT.name} <span style={{ margin:'0 6px' }}>/</span>
          <span style={{ fontWeight:600, color:C.charcoal }}>{ADMIN_NAV.find(n=>n.id===active)?.label}</span>
        </div>
        <div style={{ flex:1 }}/>
        <div style={{ background:C.surfaceLow, borderRadius:12, padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <Icon name="calendar_today" size={15} color={C.muted}/>
          <span style={{ fontSize:12.5, color:C.muted }}>lun 6 jul 2026</span>
        </div>
        <div style={{ position:'relative', cursor:'pointer' }}>
          <Icon name="notifications" size={22} color={C.primary}/>
          <div style={{ position:'absolute', top:-1, right:-1, width:8, height:8, borderRadius:9999, background:C.dorado }}/>
        </div>
      </div>
      {children}
    </div>
  </div>
);

// ── P22 · Empty state reusable ─────────────────────────────
const EmptyState = ({ icon='restaurant', title, body, cta, onCta, cta2, onCta2 }) => (
  <div className="pop-in" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', textAlign:'center', padding:'40px 30px' }}>
    <div style={{ width:112, height:112, borderRadius:9999, background:C.surfaceLow, display:'flex',
      alignItems:'center', justifyContent:'center', marginBottom:20, position:'relative' }}>
      <Icon name={icon} size={48} color={C.primaryCont}/>
      <div style={{ position:'absolute', bottom:2, right:2, width:34, height:34, borderRadius:9999,
        background:gradDorado, display:'flex', alignItems:'center', justifyContent:'center',
        border:`3px solid ${C.surface}` }}>
        <Icon name="add" size={18} color="white" weight={600}/>
      </div>
    </div>
    <div style={{ fontFamily:serif, fontSize:24, color:C.charcoal, marginBottom:8 }}>{title}</div>
    <div style={{ fontSize:14, color:C.muted, maxWidth:380, lineHeight:'22px', marginBottom:22 }}>{body}</div>
    <div style={{ display:'flex', gap:10 }}>
      {cta && <Btn variant="primary" iconName="add" onClick={onCta} style={{ fontSize:14.5, padding:'12px 24px' }}>{cta}</Btn>}
      {cta2 && <Btn variant="secondary" iconName="upload_file" onClick={onCta2} style={{ fontSize:14.5, padding:'12px 24px' }}>{cta2}</Btn>}
    </div>
  </div>
);

// ── KPI card ───────────────────────────────────────────────
const KPI = ({ label, value, sub, subUp=true, icon }) => (
  <div style={{ background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)', flex:1, minWidth:0 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
      <div style={{ fontSize:11, fontWeight:600, color:C.outline, letterSpacing:'0.05em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ width:32, height:32, borderRadius:10, background:C.surfaceLow,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name={icon} size={17} color={C.primary}/>
      </div>
    </div>
    <div style={{ fontFamily:serif, fontSize:29, color:C.primary, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:12, fontWeight:600, color: subUp ? '#15803D' : C.error, marginTop:6 }}>{sub}</div>}
  </div>
);

// ═══ P09 · DASHBOARD ═══════════════════════════════════════
const AdminDashboard = ({ empty, goOrders, setActive, escenario='Normal' }) => {
  const maxSale = Math.max(...SALES_DATA);
  const mesas = mesasEscenario(escenario);
  if (empty) return (
    <div className="fade-in" style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 28px 20px' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Buenos días, Valeria</div>
      <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>Lunes, 6 de julio de 2026</div>
      <EmptyState icon="restaurant_menu" title="Trae tu primer platillo"
        body="Tu restaurante ya existe en Carta. Sube tu primer platillo — o importa tu carta en PDF — y míralo en la mesa de tus comensales."
        cta="Nuevo platillo" onCta={() => setActive('menu')}
        cta2="Importar carta PDF" onCta2={() => setActive('menu')}/>
    </div>
  );
  return (
    <div className="hide-scroll screen" style={{ flex:1, overflowY:'auto', padding:'0 28px 26px', animationDuration:'200ms' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Buenos días, Valeria</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>Lunes, 6 de julio de 2026 · servicio de comida en curso</div>
        </div>
        {/* Quick actions — pequeñas */}
        <div style={{ display:'flex', gap:8 }}>
          {[['add','Platillo','menu'],['receipt_long','Pedidos','orders'],['qr_code_2','Invitar mesero','team']].map(([ic,l,to]) => (
            <button key={l} onClick={() => setActive(to)} {...pressFx} style={{ display:'flex', alignItems:'center', gap:6,
              background:'white', border:'none', borderRadius:9999, padding:'8px 15px', fontSize:12.5, fontWeight:600,
              color:C.primary, cursor:'pointer', boxShadow:'0 2px 8px rgba(29,28,23,0.06)', fontFamily:sans }}>
              <Icon name={ic} size={15} color={C.primary}/>{l}
            </button>
          ))}
        </div>
      </div>

      {/* Alertas — directamente bajo la fecha */}
      <div style={{ display:'flex', gap:10, margin:'14px 0 20px' }}>
        <div onClick={() => goOrders(12)} style={{ display:'flex', alignItems:'center', gap:9, background:gradVino,
          borderRadius:14, padding:'10px 16px', cursor:'pointer', boxShadow:'0 8px 20px rgba(79,23,40,0.25)' }}>
          <Icon name="warning" size={17} color={C.doradoLight}/>
          <span style={{ fontSize:13, fontWeight:600, color:'white' }}>Mesa 12 demorada en cocina · 35 min</span>
          <Icon name="chevron_right" size={16} color="rgba(255,255,255,0.7)"/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:9, background:'white',
          borderRadius:14, padding:'10px 16px', boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}>
          <Icon name="info" size={17} color={C.info}/>
          <span style={{ fontSize:13, fontWeight:500, color:C.muted }}>Mesa 9 espera que la marquen limpia</span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'flex', gap:14, marginBottom:18 }}>
        <KPI label="Ventas hoy" value="$12,480" sub="↑ 18% vs lunes pasado" icon="payments"/>
        <KPI label="Órdenes" value="47" sub="↑ 6 vs lunes pasado" icon="receipt_long"/>
        <KPI label="Satisfacción" value="4.7" sub="↑ 0.2 pts esta semana" icon="star"/>
        <KPI label="Duración promedio de mesa" value="48 min" sub="↓ 5 min vs semana pasada" icon="timer"/>
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        {/* Ventas por hora */}
        <div style={{ flex:2, background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontFamily:serif, fontSize:17, color:C.primary }}>Ventas por hora</span>
            <span style={{ fontSize:12, color:C.muted }}>Hoy · pico proyectado 20 h</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:110 }}>
            {SALES_DATA.map((v,i) => {
              const now = i === 9;
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                  <div style={{ width:'100%', borderRadius:'7px 7px 0 0',
                    height: Math.round(v/maxSale*96)+8,
                    background: now ? gradVino : v > 3000 ? 'rgba(184,134,11,0.55)' : C.surfaceHigh }}/>
                  {i%2===0 && <span style={{ fontSize:9.5, color:C.outline }}>{SALES_HOURS[i]}h</span>}
                </div>
              );
            })}
          </div>
        </div>
        {/* Top platillos */}
        <div style={{ flex:1, background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
          <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:14 }}>Top platillos</div>
          {MENU_SEED.filter(p=>p.active).sort((a,b)=>b.orders-a.orders).slice(0,4).map((p,i) => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:11 }}>
              <div style={{ width:26, height:26, borderRadius:9999, flexShrink:0,
                background: i===0 ? gradDorado : C.surfaceHigh, color: i===0 ? 'white' : C.muted,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>{i+1}</div>
              <Photo src={p.photo} emoji={p.emoji} radius={9} emojiSize={16} style={{ width:32, height:32, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:C.charcoal, whiteSpace:'nowrap',
                  overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.muted }}>{p.orders} órdenes hoy</div>
              </div>
              <span style={{ fontSize:12.5, fontWeight:700, color:C.primary }}>{fmt(p.price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mesas en vivo */}
      <div style={{ background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontFamily:serif, fontSize:17, color:C.primary }}>Mesas en vivo</span>
          <div style={{ display:'flex', gap:14 }}>
            {[['Libre',C.mesaLibre],['Activa',C.dorado],['Alerta',C.primary],['Pagando',C.morado]].map(([l,c]) => (
              <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:C.muted }}>
                <span style={{ width:8, height:8, borderRadius:9999, background:c }}/>{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:12 }}>
          {mesas.map(m => {
            const dot = { libre:C.mesaLibre, activa:C.dorado, alerta:C.primary, pagada:C.morado }[m.estado];
            return (
              <div key={m.n} onClick={() => m.estado!=='libre' && goOrders(m.n)} style={{
                background:C.surfaceLow, borderRadius:16, padding:'13px 14px',
                cursor: m.estado==='libre' ? 'default' : 'pointer', position:'relative', overflow:'hidden' }}>
                {m.estado==='alerta' && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:gradVino }}/>}
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontFamily:serif, fontSize:15.5, color: m.estado==='libre' ? C.outline : C.primary }}>Mesa {m.n}</span>
                  <span style={{ width:9, height:9, borderRadius:9999, background:dot, marginTop:4,
                    animation: m.estado==='alerta' ? 'pulseSoft 1.2s infinite' : 'none' }}/>
                </div>
                <div style={{ fontSize:11.5, color:C.muted }}>
                  {m.estado==='libre' ? 'Disponible' : `${m.pax} pers · ${m.min} min`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ═══ P10 · MI MENÚ (CRUD) ══════════════════════════════════
const DishForm = ({ initial, onSave, onClose }) => {
  const [f, setF] = useState(initial || { name:'', price:'', cat:'Platos fuertes', desc:'', emoji:'🍽️', chef:false, active:true });
  const set = (k,v) => setF(x => ({...x, [k]:v}));
  return (
    <div style={{ position:'absolute', inset:0, zIndex:100, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(29,28,23,0.35)',
        backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
      <div className="sheet-up" style={{ position:'relative', width:'min(400px, 100%)', background:C.surface, height:'100%',
        borderRadius:'28px 0 0 28px', boxShadow:'-24px 0 60px rgba(29,28,23,0.3)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'22px 24px 12px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:serif, fontSize:21, color:C.charcoal }}>{initial ? 'Editar platillo' : 'Nuevo platillo'}</div>
            <div style={{ fontSize:12, color:C.muted }}>Los cambios se publican al instante</div>
          </div>
          <IconBtn name="close" onClick={onClose}/>
        </div>
        <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'8px 24px' }}>
          <div style={{ marginBottom:16 }}>
            <image-slot id={`dish-photo-${initial?.id || 'new'}`} shape="rounded" radius="20"
              placeholder="Foto del platillo — arrastra aquí" style={{ width:'100%', height:'150px' }}></image-slot>
            <div style={{ fontSize:11.5, color:C.outline, marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
              <Icon name="view_in_ar" size={13} color={C.dorado}/>
              Con 8 fotos generamos el modelo 3D para AR (fotogrametría).
            </div>
          </div>
          <Field label="Nombre" value={f.name} onChange={v=>set('name',v)} placeholder="Ej. Mole negro de la casa"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Precio (MXN)" value={f.price} onChange={v=>set('price', v.replace(/\D/g,''))} placeholder="265"/>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:6 }}>Categoría</div>
              <select value={f.cat} onChange={e=>set('cat', e.target.value)} style={{ width:'100%', background:'white',
                border:'none', borderRadius:16, padding:'13px 12px', fontSize:14.5, color:C.charcoal,
                boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}>
                {['Entradas','Platos fuertes','Postres','Bebidas'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Field label="Descripción" value={f.desc} onChange={v=>set('desc',v)} textarea placeholder="Cuéntalo como lo contaría tu chef…"/>
          <Complementos cat={f.cat}/>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'white',
            borderRadius:18, padding:'13px 16px', marginBottom:12, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <Icon name="star" size={18} color={C.dorado} fill/>
              <span style={{ fontSize:14, fontWeight:600, color:C.charcoal }}>Especialidad del Chef</span>
            </div>
            <Toggle on={!!f.chef} onChange={v=>set('chef',v)}/>
          </div>
        </div>
        <div style={{ padding:'12px 24px 24px', display:'flex', gap:10 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex:1 }}>Cancelar</Btn>
          <Btn variant="primary" style={{ flex:1.4 }} disabled={!f.name || !f.price}
            onClick={() => onSave({ ...f, price:+f.price })}>Guardar platillo</Btn>
        </div>
      </div>
    </div>
  );
};

const PDFModal = ({ onClose }) => (
  <div style={{ position:'absolute', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(20,17,15,0.72)',
      backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }}/>
    <div className="pop-in" style={{ position:'relative', width:520, maxHeight:'88%', display:'flex', flexDirection:'column',
      background:'#211D1A', borderRadius:24, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.6)' }}>
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
        <Icon name="description" size={18} color="rgba(255,255,255,0.7)"/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:'white' }}>Carta-LaCeiba-2026.pdf</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Fuente del menú importado · 2 páginas</div>
        </div>
        <IconBtn name="close" dark size={36} iconSize={18} onClick={onClose}/>
      </div>
      <div className="hide-scroll" style={{ overflowY:'auto', padding:'4px 22px 22px', display:'flex', flexDirection:'column', gap:14 }}>
        <PDFPage page={1}/>
        <PDFPage page={2}/>
      </div>
    </div>
  </div>
);

const AdminMenu = ({ empty, items, setItems }) => {
  const [form, setForm] = useState(null);      // null | 'new' | dish
  const [showPDF, setShowPDF] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const toggle = id => setItems(prev => prev.map(p => p.id===id ? {...p, active:!p.active} : p));
  const save = f => {
    if (f.id) setItems(prev => prev.map(p => p.id===f.id ? {...p, ...f} : p));
    else setItems(prev => [...prev, { ...f, id: Math.max(0,...prev.map(p=>p.id))+1, orders:0, chips:[], spice:0, kcal:0, photo:'', maridaje:'—' }]);
    setForm(null);
  };
  if (empty) return (
    <div className="fade-in" style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 28px 20px' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Mi menú</div>
      <EmptyState icon="restaurant_menu" title="Trae tu primer platillo"
        body="Sube una foto y un precio — nosotros hacemos el resto. ¿Ya tienes carta impresa? Impórtala en PDF y la convertimos en menú AR."
        cta="Nuevo platillo" onCta={() => setForm('new')}
        cta2="Importar carta PDF"/>
      {form && <DishForm initial={null} onSave={save} onClose={() => setForm(null)}/>}
    </div>
  );
  return (
    <div className="screen" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', animationDuration:'200ms', position:'relative' }}>
      <div style={{ padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Mi menú</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>{items.filter(i=>i.active).length} platillos publicados · {items.filter(i=>!i.active).length} pausados</div>
        </div>
        <Btn variant="primary" iconName="add" style={{ fontSize:14, padding:'11px 20px' }}
          onClick={() => setForm('new')}>Nuevo platillo</Btn>
      </div>

      {/* Banner PDF importado */}
      <div style={{ margin:'14px 28px 0', background:'white', borderRadius:18, padding:'12px 16px',
        display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 10px rgba(29,28,23,0.05)', flexShrink:0 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:'rgba(186,26,26,0.08)', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="picture_as_pdf" size={19} color={C.error}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.charcoal }}>Menú importado de Carta-LaCeiba-2026.pdf</div>
          <div style={{ fontSize:12, color:C.muted }}>10 platillos detectados · los comensales también pueden ver el PDF original</div>
        </div>
        <button onClick={() => setShowPDF(true)} {...pressFx} style={{ background:C.surfaceHigh, border:'none',
          borderRadius:9999, padding:'8px 16px', fontSize:12.5, fontWeight:600, color:C.primary, cursor:'pointer', fontFamily:sans }}>
          Ver PDF
        </button>
      </div>

      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'16px 28px 26px' }}>
        {['Entradas','Platos fuertes','Postres','Bebidas'].map(cat => {
          const catItems = items.filter(p => p.cat === cat);
          if (!catItems.length) return null;
          return (
            <div key={cat} style={{ marginBottom:22 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase',
                letterSpacing:'0.07em', marginBottom:9 }}>{cat} · {catItems.length}</div>
              <div style={{ background:'white', borderRadius:22, boxShadow:'0 4px 16px rgba(79,23,40,0.06)', padding:'2px 0' }}>
                {catItems.map((p,i) => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', position:'relative',
                    borderBottom: i<catItems.length-1 ? '1px solid rgba(91,74,61,0.06)' : 'none',
                    opacity: p.active ? 1 : 0.55, transition:'opacity 250ms' }}>
                    <Photo src={p.photo} emoji={p.emoji} radius={13} emojiSize={22} style={{ width:48, height:48, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:14.5, fontWeight:600, color:C.charcoal }}>{p.name}</span>
                        {p.chef && <Icon name="star" size={15} color={C.dorado} fill/>}
                      </div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>{p.orders} órdenes este mes · modelo 3D {p.photo ? 'listo' : 'pendiente'}</div>
                    </div>
                    <span style={{ fontSize:14.5, fontWeight:700, color:C.primary, width:64, textAlign:'right' }}>{fmt(p.price)}</span>
                    <Toggle on={p.active} onChange={() => toggle(p.id)}/>
                    <div style={{ position:'relative' }}>
                      <IconBtn name="more_vert" size={34} iconSize={18} style={{ background:'transparent' }}
                        onClick={() => setMenuFor(menuFor===p.id ? null : p.id)}/>
                      {menuFor === p.id && (
                        <div className="pop-in" style={{ position:'absolute', right:0, top:38, zIndex:50, background:'white',
                          borderRadius:16, boxShadow:'0 16px 44px rgba(29,28,23,0.18)', padding:6, width:150 }}>
                          {[['edit','Editar', () => { setForm(p); setMenuFor(null); }],
                            ['delete','Eliminar', () => { setItems(prev => prev.filter(x=>x.id!==p.id)); setMenuFor(null); }]].map(([ic,l,fn]) => (
                            <div key={l} onClick={fn} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px',
                              borderRadius:11, cursor:'pointer', fontSize:13.5, fontWeight:500,
                              color: l==='Eliminar' ? C.error : C.charcoal }}
                              onMouseEnter={e=>e.currentTarget.style.background=C.surfaceLow}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <Icon name={ic} size={16} color={l==='Eliminar' ? C.error : C.muted}/>{l}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {form && <DishForm initial={form==='new' ? null : form} onSave={save} onClose={() => setForm(null)}/>}
      {showPDF && <PDFModal onClose={() => setShowPDF(false)}/>}
    </div>
  );
};

// ═══ P11 · PEDIDOS (dinámica) ══════════════════════════════
const AdminOrders = ({ empty, mesaFilter, clearFilter, escenario='Normal', mesas, updateMesa, perms, setOrderStatus }) => {
  if (empty) return (
    <div className="fade-in" style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 28px 20px' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Pedidos</div>
      <EmptyState icon="receipt_long" title="Aún no hay pedidos"
        body="Cuando tus comensales escaneen el QR de su mesa y ordenen, sus pedidos aparecerán aquí en vivo."/>
    </div>
  );
  const mesaInicial = mesaFilter ? (mesas||[]).find(m => m.n === mesaFilter && m.estado !== 'libre') || null : null;
  // Misma operación que el capitán: Servir/Gestionar, detalle de mesa embebido, pedidos en vivo
  return (
    <div className="screen" style={{ flex:1, display:'flex', justifyContent:'center', overflow:'hidden', animationDuration:'200ms' }}>
      <div style={{ width:470, height:'100%', position:'relative', overflow:'hidden' }}>
        <CapMesas go={() => {}} mesas={mesas} updateMesa={updateMesa} perms={perms} setOrderStatus={setOrderStatus}
          escenario={escenario} nav={null} topPad={10} initialMesa={mesaInicial} clearInitial={clearFilter}/>
      </div>
    </div>
  );
};

// ═══ P12 · ANALYTICS ═══════════════════════════════════════
const AdminAnalytics = ({ empty }) => {
  const maxSale = Math.max(...SALES_DATA);
  if (empty) return (
    <div className="fade-in" style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 28px 20px' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Analytics</div>
      <EmptyState icon="analytics" title="Tus datos están en camino"
        body="Con tus primeras órdenes verás conversión de AR a pedido, horas pico y comparativas semanales."/>
    </div>
  );
  return (
    <div className="hide-scroll screen" style={{ flex:1, overflowY:'auto', padding:'0 28px 26px', animationDuration:'200ms' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal, marginBottom:16 }}>Analytics</div>
      <div style={{ display:'flex', gap:14, marginBottom:16 }}>
        <KPI label="AR → Orden" value="68%" sub="↑ 12 pts vs menú QR anterior" icon="view_in_ar"/>
        <KPI label="Ticket promedio" value="$412" sub="↑ $58 con maridajes" icon="receipt"/>
        <KPI label="Recurrencia" value="34%" sub="Comensales Capa 1+" icon="repeat"/>
        <KPI label="Propina promedio" value="16%" sub="↑ 2 pts este mes" icon="volunteer_activism"/>
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        {/* Embudo */}
        <div style={{ flex:1, background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
          <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:16 }}>Embudo de hoy</div>
          {[['Escaneos de QR', 214, 1],['Vieron platillos en AR', 183, 0.86],['Agregaron a su orden', 152, 0.71],['Pagaron en Carta', 146, 0.68]].map(([l,v,pct],i) => (
            <div key={l} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:12.5, color:C.muted }}>{l}</span>
                <span style={{ fontSize:12.5, fontWeight:700, color:C.charcoal }}>{v}</span>
              </div>
              <div style={{ height:10, borderRadius:9999, background:C.surfaceLow, overflow:'hidden' }}>
                <div style={{ width:`${pct*100}%`, height:'100%', borderRadius:9999,
                  background: i===3 ? gradDorado : gradVino, opacity: 1 - i*0.14 }}/>
              </div>
            </div>
          ))}
        </div>
        {/* Heatmap */}
        <div style={{ flex:1.4, background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
          <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:16 }}>Horas pico</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:120 }}>
            {SALES_HOURS.map((h,i) => {
              const pct = SALES_DATA[i]/maxSale;
              const bg = pct>0.8 ? C.primary : pct>0.6 ? C.primaryCont : pct>0.4 ? 'rgba(184,134,11,0.6)' : C.surfaceHigh;
              return (
                <div key={h} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                  <div style={{ width:'100%', borderRadius:'6px 6px 0 0', height:Math.round(pct*96)+8, background:bg }}/>
                  <span style={{ fontSize:9.5, color:C.outline }}>{h}h</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparativa */}
      <div style={{ background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
        <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:14 }}>Esta semana vs la pasada</div>
        {[['Lun','$12,480','$10,560',0.85],['Mar','$9,320','$11,200',1.2],['Mié','$14,100','$10,800',0.77],['Jue','$11,670','$9,400',0.81],['Vie','$18,240','$16,900',0.93]].map(([d,cur,prev,r]) => (
          <div key={d} style={{ display:'flex', alignItems:'center', gap:14, marginBottom:10 }}>
            <span style={{ width:30, fontSize:12.5, fontWeight:700, color:C.muted }}>{d}</span>
            <div style={{ flex:1, height:11, background:C.surfaceLow, borderRadius:9999, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${Math.min(100, 100/r)}%`,
                background:gradVino, borderRadius:9999 }}/>
            </div>
            <span style={{ width:66, fontSize:12.5, fontWeight:700, color:C.primary, textAlign:'right' }}>{cur}</span>
            <span style={{ width:66, fontSize:12.5, color:C.outline, textAlign:'right' }}>{prev}</span>
          </div>
        ))}
        <div style={{ display:'flex', gap:16, marginTop:6, paddingLeft:44 }}>
          <span style={{ fontSize:11, color:C.muted }}><span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background:gradVino, marginRight:5, verticalAlign:'-1px' }}/>Esta semana</span>
          <span style={{ fontSize:11, color:C.muted }}><span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background:C.surfaceLow, marginRight:5, verticalAlign:'-1px' }}/>Semana pasada</span>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ADMIN_NAV, AdminShell, EmptyState, KPI, AdminDashboard, AdminMenu, AdminOrders, AdminAnalytics, DishForm, PDFModal });
