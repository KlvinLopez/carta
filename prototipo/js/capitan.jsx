// ═══════════════════════════════════════════════════════════
// CAPITÁN DE MESEROS — C01 inicio · C02 mesas · C03 pedidos ·
// C04 equipo · C05 dispositivos · C06 rendimiento
// ═══════════════════════════════════════════════════════════
const { useState } = React;

const CAPTAIN = {
  name:'Diana Cortés', emoji:'👩‍💼', rating:4.9,
  photo:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop',
};

// Perfil portable de la capitana — mismo contrato que WAITER
const CAPTAIN_PROFILE = {
  name: CAPTAIN.name, emoji: CAPTAIN.emoji, photo: CAPTAIN.photo, rating: CAPTAIN.rating,
  badge:'Capitana de sala', reviews:186, years:9, languages:['Español','Inglés','Francés'],
  specialties:['Gestión de brigada','Servicio fine dining','Grupos grandes','Manejo de crisis'],
  history:[
    { rest:'La Ceiba', role:'Capitana de sala', period:'2023 — hoy', rating:4.9 },
    { rest:'Corazón de Maguey', role:'Jefa de rango', period:'2019 — 2023', rating:4.8 },
    { rest:'Café Toscano', role:'Mesera → Capitana', period:'2015 — 2019', rating:4.6 },
  ],
  reviewsList:[
    { who:'Mesa 6 · hoy', stars:5, tags:['Liderazgo','Atenta'], text:'Coordinó una cena de 12 personas sin un solo tropiezo.' },
    { who:'Brigada · esta semana', stars:5, tags:['Mentora'], text:'Nos apoya en horas pico y enseña con paciencia.' },
    { who:'Mesa 2 · mar 7 jul', stars:4, tags:['Resolutiva'], text:'Resolvió un cambio de orden complicado al momento.' },
  ],
};

const CapNav = ({ active, go }) => (
  <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:40,
    background:'rgba(254,249,241,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
    boxShadow:'0px -12px 32px rgba(29,28,23,0.08)', display:'flex', justifyContent:'space-around',
    padding:'10px 14px 26px' }}>
    {[
      { id:'c-inicio',  icon:'space_dashboard',  label:'Inicio' },
      { id:'c-mesas',   icon:'table_restaurant', label:'Mesas' },
      { id:'c-menu',    icon:'restaurant_menu',  label:'Menú' },
      { id:'c-equipo',  icon:'groups',           label:'Equipo' },
      { id:'c-perfil',  icon:'person',           label:'Perfil' },
    ].map(n => {
      const on = active === n.id || (n.id==='c-equipo' && ['c-dispositivos','c-rendimiento'].includes(active)) || (n.id==='c-mesas' && active==='c-pedidos');
      return (
        <button key={n.id} onClick={() => go(n.id)} {...pressFx} style={{ background:'none', border:'none',
          cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:54 }}>
          <div style={{ width:46, height:30, borderRadius:9999, display:'flex', alignItems:'center',
            justifyContent:'center', background: on ? 'rgba(79,23,40,0.1)' : 'transparent', transition:'background 200ms' }}>
            <Icon name={n.icon} size={22} color={on ? C.primary : C.outline} fill={on}/>
          </div>
          <span style={{ fontSize:10.5, fontWeight: on?700:500, color: on ? C.primary : C.outline }}>{n.label}</span>
        </button>
      );
    })}
  </div>
);

// Asignaciones mesero ↔ mesa (fuente compartida en shared.jsx)
const ASIGN_SEED = ASIGN_MESAS;
const shortName = n => n ? n.split(' ')[0] + ' ' + n.split(' ')[1][0] + '.' : '';
const avatarOf = n => TEAM.find(t => t.name === n) || { name:n||'', emoji:'🧑', photo:'' };

// ═══ C01 · INICIO ══════════════════════════════════════════
const CapInicio = ({ go, mesas, openMesa }) => {
  const activas = mesas.filter(m => m.estado !== 'libre');
  const alertaRaw = mesas.find(m => m.estado === 'alerta');
  const [alertaOff, setAlertaOff] = useState(false);
  const alerta = alertaOff ? null : alertaRaw;
  const activos = TEAM.filter(t => t.estado==='activo');
  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'60px 24px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Avatar person={CAPTAIN} size={48} ring/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:serif, fontSize:23, color:C.charcoal }}>Hola, Diana</div>
            <div style={{ fontSize:12.5, color:C.muted }}>Capitana de sala · turno de tarde</div>
          </div>
          <Chip tone="vino" style={{ fontSize:11.5 }}>
            <span style={{ width:7, height:7, borderRadius:9999, background:C.success, display:'inline-block',
              animation:'pulseSoft 1.6s infinite' }}/> En turno
          </Chip>
        </div>

        {alerta && (
          <div className="pop-in" style={{ marginTop:14, background:gradVino, borderRadius:20,
            padding:'12px 16px', display:'flex', alignItems:'center', gap:11,
            boxShadow:'0 10px 26px rgba(79,23,40,0.3)' }}>
            <Icon name="notifications_active" size={20} color="white"/>
            <div onClick={() => go('c-mesas')} style={{ flex:1, cursor:'pointer' }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:'white' }}>Mesa {alerta.n} — {alerta.fase?.toLowerCase()}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.72)' }}>Atiende {shortName(ASIGN_SEED[alerta.n])} · {alerta.min} min</div>
            </div>
            <button onClick={() => setAlertaOff(true)} {...pressFx} style={{ display:'flex', alignItems:'center', gap:5,
              background:'rgba(255,255,255,0.18)', border:'none', cursor:'pointer', borderRadius:9999, padding:'7px 13px',
              fontSize:12, fontWeight:700, color:'white', fontFamily:sans, whiteSpace:'nowrap', transition:'transform 130ms' }}>
              <Icon name="check" size={14} color="white" weight={700}/> Atendida
            </button>
          </div>
        )}

        {/* KPIs del turno */}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          {[['table_restaurant', `${activas.length}/${mesas.length}`, 'mesas activas'],
            ['payments', '$815', 'propinas equipo'],
            ['star', '4.6', 'sat. del turno']].map(([ic,v,l]) => (
            <div key={l} style={{ flex:1, background:'white', borderRadius:20, padding:'13px 8px', textAlign:'center',
              boxShadow:'0 4px 14px rgba(79,23,40,0.06)' }}>
              <Icon name={ic} size={17} color={C.dorado}/>
              <div style={{ fontFamily:serif, fontSize:21, color:C.primary, marginTop:4 }}>{v}</div>
              <div style={{ fontSize:10, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Brigada en turno */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', margin:'20px 0 10px' }}>
          <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>Brigada en turno</span>
          <button onClick={() => go('c-rendimiento')} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:12.5, fontWeight:600, color:C.dorado, fontFamily:sans }}>Rendimiento →</button>
        </div>
        {activos.map(m => {
          const mesasDe = Object.entries(ASIGN_SEED).filter(([n,who]) => who===m.name &&
            mesas.find(x=>x.n===+n && x.estado!=='libre')).map(([n])=>n);
          return (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:20,
              padding:'11px 15px', marginBottom:9, boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
              <Avatar person={m} size={42} ring={m.top}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{m.name}</div>
                <div style={{ fontSize:11.5, color:C.muted }}>
                  {mesasDe.length ? `Mesas ${mesasDe.join(', ')}` : 'Sin mesas activas'}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.dorado }}>{fmt(m.propinas)}</div>
                <div style={{ fontSize:10.5, color:C.muted, display:'flex', alignItems:'center', gap:3, justifyContent:'flex-end' }}>
                  <Icon name="star" size={11} color={C.dorado} fill/>{m.sat}
                </div>
              </div>
            </div>
          );
        })}

        {/* Salón en vivo mini */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', margin:'18px 0 10px' }}>
          <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>Salón en vivo</span>
          <button onClick={() => go('c-mesas')} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:12.5, fontWeight:600, color:C.dorado, fontFamily:sans }}>Ver todas →</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:9 }}>
          {mesas.map(m => {
            const dot = { libre:C.mesaLibre, activa:C.success, alerta:C.rojoVivo, pagada:C.morado }[m.estado];
            return (
              <div key={m.n} onClick={() => m.estado==='libre' ? go('c-mesas') : (openMesa ? openMesa(m) : go('c-mesas'))}
                style={{ background: m.estado==='libre' ? C.surfaceLow : 'white',
                borderRadius:16, padding:'11px 12px', cursor:'pointer',
                boxShadow: m.estado==='libre' ? 'none' : '0 2px 10px rgba(29,28,23,0.05)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:serif, fontSize:15, color: m.estado==='libre' ? C.outline : C.primary }}>M{m.n}</span>
                  <span style={{ width:8, height:8, borderRadius:9999, background:dot,
                    animation: m.estado==='alerta' ? 'ripple 1.2s ease-out infinite' : m.estado==='activa' ? 'pulseDot 1.4s ease-in-out infinite' : 'none' }}/>
                </div>
                <div style={{ fontSize:10.5, color:C.muted, marginTop:3 }}>
                  {m.estado==='libre' ? 'Libre' : shortName(ASIGN_SEED[m.n])}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height:110 }}/>
      </div>
      <CapNav active="c-inicio" go={go}/>
    </div>
  );
};

// ═══ C02 · MESAS DEL SALÓN (+ reasignar) ═══════════════════
const CapMesas = ({ go, mesas, updateMesa, perms, setOrderStatus, initialMesa=null, clearInitial, escenario='Normal', nav, topPad=62 }) => {
  const [asign, setAsign] = useState(ASIGN_SEED);
  const [sheetFor, setSheetFor] = useState(null);
  const [pick, setPick] = useState(null);
  const [mode, setMode] = useState('atencion');   // atencion | admin
  const [vista, setVista] = useState('mesas');    // mesas | pedidos
  const [openMesa, setOpenMesa] = useState(initialMesa);
  const closeMesa = () => { setOpenMesa(null); if (clearInitial) clearInitial(); };
  const [qrOn, setQrOn] = useState({});
  const activos = TEAM.filter(t => t.estado==='activo');
  const eMeta = { libre:{dot:C.mesaLibre,label:'Libre'}, activa:{dot:C.success,label:'Activa',anim:'pulseDot 1.4s ease-in-out infinite'},
    alerta:{dot:C.rojoVivo,label:'Alerta',anim:'ripple 1.2s ease-out infinite'}, pagada:{dot:C.morado,label:'Pagando'} };
  // Modo Atención: abrir una mesa muestra el detalle completo (como el mesero)
  if (openMesa) {
    return (
      <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        <DetalleMesa embedded mesa={openMesa} updateMesa={updateMesa} perms={perms} setOrderStatus={setOrderStatus}
          go={closeMesa} onBack={closeMesa}/>
        {nav !== undefined ? nav : <CapNav active="c-mesas" go={go}/>}
      </div>
    );
  }
  const admin = mode === 'admin';
  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div style={{ padding:`${topPad}px 24px 0`, flexShrink:0 }}>
        <div style={{ fontFamily:serif, fontSize:26, color:C.charcoal }}>Mesas del salón</div>
        <div style={{ fontSize:12.5, color:C.muted, marginTop:2 }}>
          {vista==='pedidos' ? 'Pedidos en vivo de toda la brigada'
            : admin ? 'Asigna meseros y gestiona los QR del salón' : 'Toca una mesa para atenderla'}
        </div>
        {/* Indicadores del turno */}
        <div style={{ background:'white', borderRadius:18, padding:'11px 16px', margin:'12px 0 0',
          display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
          {[['payments','$4,820 hoy'],['receipt_long','23 órdenes'],['timer','5.1 min prom.']].map(([ic,l]) => (
            <span key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:C.muted }}>
              <Icon name={ic} size={15} color={C.dorado}/>{l}
            </span>
          ))}
        </div>
        {/* Toggle Mesas | Pedidos */}
        <div style={{ display:'flex', gap:3, background:C.surfaceHigh, borderRadius:9999, padding:3, margin:'12px 0 0' }}>
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
        {vista === 'mesas' && (
          <React.Fragment>
            {/* Toggle de modo */}
            <div style={{ display:'flex', gap:3, background:C.surfaceHigh, borderRadius:9999, padding:3, margin:'10px 0 8px' }}>
              {[['atencion','room_service','Servir'],['admin','tune','Gestionar']].map(([m,ic,l]) => {
                const on = mode === m;
                return (
                  <button key={m} onClick={() => setMode(m)} {...pressFx} style={{ flex:1, display:'flex', alignItems:'center',
                    justifyContent:'center', gap:7, border:'none', cursor:'pointer', borderRadius:9999, padding:'8px 0',
                    fontSize:12.5, fontWeight:700, fontFamily:sans, background: on ? 'white' : 'transparent',
                    color: on ? C.primary : C.muted, boxShadow: on ? '0 2px 8px rgba(29,28,23,0.09)' : 'none', transition:'all 180ms' }}>
                    <Icon name={ic} size={15} color={on ? C.primary : C.muted}/>{l}
                  </button>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:12, margin:'4px 0 4px' }}>
              {Object.entries(eMeta).map(([k,v]) => (
                <span key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}>
                  <span style={{ width:8, height:8, borderRadius:9999, background:v.dot }}/>{v.label}
                </span>
              ))}
            </div>
          </React.Fragment>
        )}
      </div>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'10px 24px 0' }}>
        {vista === 'pedidos' ? (
          <OrderFlowList variant="capitan" escenario={escenario}/>
        ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {mesas.map(m => {
            const e = eMeta[m.estado];
            const libre = m.estado === 'libre';
            const who = avatarOf(asign[m.n]);
            const onTap = () => admin
              ? (setSheetFor(m), setPick(asign[m.n]||null))
              : (!libre && setOpenMesa(m));
            return (
              <div key={m.n} onClick={onTap} {...pressFx} style={{
                background: libre ? C.surfaceLow : 'white', borderRadius:24, padding:'15px 15px 13px',
                cursor: (admin || !libre) ? 'pointer' : 'default',
                boxShadow: libre ? 'none' : '0 4px 16px rgba(79,23,40,0.08)', position:'relative', overflow:'hidden',
                transition:'transform 150ms' }}>
                {m.estado==='alerta' && <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:gradVino }}/>}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontFamily:serif, fontSize:19, color: libre ? C.outline : C.primary }}>Mesa {m.n}</span>
                  <span style={{ width:9, height:9, borderRadius:9999, background:e.dot,
                    animation: e.anim || 'none' }}/>
                </div>
                {libre ? (
                  <div style={{ fontSize:12, color:C.outline, marginBottom:8 }}>Disponible</div>
                ) : (
                  <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>{m.pax} pers · {m.min} min · {fmt(m.total)}</div>
                )}
                <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:C.surfaceLow,
                  borderRadius:9999, padding:'4px 11px 4px 4px' }}>
                  {asign[m.n]
                    ? <React.Fragment><Avatar person={who} size={22}/><span style={{ fontSize:11.5, fontWeight:600, color:C.charcoal }}>{shortName(asign[m.n])}</span></React.Fragment>
                    : <React.Fragment><Icon name="person_add" size={15} color={C.muted} style={{ margin:'3px 0 3px 6px' }}/><span style={{ fontSize:11.5, fontWeight:600, color:C.muted }}>Asignar</span></React.Fragment>}
                </div>
              </div>
            );
          })}
        </div>
        )}
        <div style={{ height:110 }}/>
      </div>

      {/* Sheet de reasignación */}
      {sheetFor && (
        <div style={{ position:'absolute', inset:0, zIndex:90 }}>
          <div onClick={() => setSheetFor(null)} style={{ position:'absolute', inset:0,
            background:'rgba(29,28,23,0.4)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
          <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:C.surface,
            borderRadius:'32px 32px 0 0', padding:'0 24px 34px', boxShadow:'0px -24px 60px rgba(29,28,23,0.3)' }}>
            <Grip/>
            <div style={{ fontFamily:serif, fontSize:21, color:C.charcoal }}>Mesa {sheetFor.n}</div>
            <div style={{ fontSize:12.5, color:C.muted, margin:'2px 0 14px' }}>Gestiona el acceso y quién la atiende</div>
            {/* QR de la mesa */}
            <div style={{ display:'flex', alignItems:'center', gap:12, background:C.surfaceLow, borderRadius:18,
              padding:'12px 15px', marginBottom:12 }}>
              <Icon name="qr_code_2" size={20} color={qrOn[sheetFor.n]===false ? C.outline : C.primary}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:C.charcoal }}>QR de la mesa</div>
                <div style={{ fontSize:11.5, color: qrOn[sheetFor.n]===false ? C.error : C.muted }}>
                  {qrOn[sheetFor.n]===false ? 'Desactivado — los comensales no pueden entrar' : 'Activo · listo para escanear'}
                </div>
              </div>
              <Toggle on={qrOn[sheetFor.n]!==false} onChange={v => setQrOn(q => ({...q, [sheetFor.n]: v}))}/>
            </div>
            {activos.map(w => {
              const on = pick === w.name;
              return (
                <div key={w.id} onClick={() => setPick(w.name)} style={{ display:'flex', alignItems:'center', gap:12,
                  background: on ? 'white' : 'transparent', borderRadius:18, padding:'10px 13px', cursor:'pointer',
                  boxShadow: on ? '0 4px 14px rgba(79,23,40,0.08)' : 'none', marginBottom:4 }}>
                  <Avatar person={w} size={40} ring={w.top}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{w.name}</div>
                    <div style={{ fontSize:11.5, color:C.muted }}>{w.mesas} mesas hoy · ★ {w.sat}</div>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:9999, border:`2px solid ${on ? C.primary : C.surfaceHighest}`,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {on && <div style={{ width:11, height:11, borderRadius:9999, background:C.primary }}/>}
                  </div>
                </div>
              );
            })}
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <Btn variant="secondary" style={{ flex:1 }} onClick={() => setSheetFor(null)}>Cancelar</Btn>
              <Btn variant="primary" style={{ flex:1.4 }} disabled={!pick}
                onClick={() => { setAsign(a => ({...a, [sheetFor.n]: pick})); setSheetFor(null); }}>
                Asignar mesa
              </Btn>
            </div>
          </div>
        </div>
      )}
      {nav !== undefined ? nav : <CapNav active="c-mesas" go={go}/>}
    </div>
  );
};

// ═══ C03 · PEDIDOS DEL TURNO ═══════════════════════════════
const CapPedidos = ({ go }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
    <div style={{ padding:'62px 24px 0', flexShrink:0 }}>
      <div style={{ fontFamily:serif, fontSize:26, color:C.charcoal }}>Pedidos del turno</div>
      <div style={{ fontSize:12.5, color:C.muted, marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ width:8, height:8, borderRadius:9999, background:C.success, display:'inline-block',
          animation:'pulseSoft 1.6s infinite' }}/> En vivo · toda la brigada
      </div>
    </div>
    <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'10px 24px 0' }}>
      <OrderFlowList variant="capitan"/>
      <div style={{ height:110 }}/>
    </div>
    <CapNav active="c-pedidos" go={go}/>
  </div>
);

// ═══ C04 · EQUIPO ══════════════════════════════════════════
const CapEquipo = ({ go, perms = WAITER_PERMS_DEFAULT, setPerms }) => {
  const [showQR, setShowQR] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const permRows = [
    { k:'addItems',    icon:'add_shopping_cart', t:'Agregar productos',   d:'Añadir platillos a una orden en curso' },
    { k:'removeItems', icon:'remove_shopping_cart', t:'Eliminar productos', d:'Quitar platillos de la orden' },
    { k:'editQty',     icon:'exposure',         t:'Modificar cantidades', d:'Cambiar el número de porciones' },
    { k:'editPrice',   icon:'sell',             t:'Modificar precios',    d:'Ajustar el precio de un platillo' },
  ];
  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div style={{ padding:'62px 24px 0', flexShrink:0, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:serif, fontSize:26, color:C.charcoal }}>Mi brigada</div>
          <div style={{ fontSize:12.5, color:C.muted, marginTop:2 }}>{TEAM.filter(t=>t.estado==='activo').length} activos · {TEAM.length} registrados</div>
        </div>
        <IconBtn name="qr_code_2" onClick={() => setShowQR(s=>!s)}/>
      </div>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'14px 24px 0' }}>
        {showQR && (
          <div className="pop-in" style={{ background:'white', borderRadius:24, padding:'18px 20px', marginBottom:14,
            boxShadow:'0 8px 24px rgba(79,23,40,0.1)', display:'flex', gap:16, alignItems:'center' }}>
            <div style={{ background:C.surfaceLow, borderRadius:16, padding:10, flexShrink:0 }}>
              <QRBlock size={86} seed={23}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>Invitar mesero</div>
              <div style={{ fontSize:11.5, color:C.muted, lineHeight:'17px', margin:'3px 0 8px' }}>
                Lo escanea desde su teléfono. Expira en 24 h.
              </div>
              <Btn variant="secondary" style={{ fontSize:12, padding:'8px 16px' }} iconName="ios_share">Compartir</Btn>
            </div>
          </div>
        )}
        {[...TEAM].sort((a,b) => (b.estado==='activo') - (a.estado==='activo')).map(m => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:20,
            padding:'12px 15px', marginBottom:9, boxShadow:'0 2px 10px rgba(29,28,23,0.05)',
            opacity: m.estado==='activo' ? 1 : 0.55 }}>
            <Avatar person={m} size={44} ring={m.top} dimmed={m.estado!=='activo'}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{m.name}</span>
                {m.top && <Icon name="star" size={13} color={C.dorado} fill/>}
              </div>
              <div style={{ fontSize:11.5, color:C.muted, marginTop:1 }}>
                {m.estado==='activo' ? `En turno · ${m.mesas} mesas · ★ ${m.sat}` : 'Fuera de turno'}
              </div>
            </div>
            <button onClick={() => go('perfil-mesero')} {...pressFx} style={{ background:C.surfaceHigh, border:'none',
              borderRadius:9999, padding:'7px 13px', fontSize:11.5, fontWeight:600, color:C.primary, cursor:'pointer', fontFamily:sans }}>
              Perfil
            </button>
          </div>
        ))}
        {/* Links */}
        {[['devices','Dispositivos del turno','iPads compartidas y teléfonos','c-dispositivos'],
          ['trending_up','Rendimiento individual','Propinas, tiempos y reseñas','c-rendimiento']].map(([ic,t,d,to]) => (
          <div key={to} onClick={() => go(to)} {...pressFx} style={{ display:'flex', alignItems:'center', gap:13,
            background:C.surfaceLow, borderRadius:20, padding:'14px 16px', marginTop:10, cursor:'pointer',
            transition:'transform 150ms' }}>
            <div style={{ width:40, height:40, borderRadius:14, background:'white', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name={ic} size={19} color={C.primary}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{t}</div>
              <div style={{ fontSize:11.5, color:C.muted }}>{d}</div>
            </div>
            <Icon name="chevron_right" size={19} color={C.outline}/>
          </div>
        ))}
        {/* Permisos de edición */}
        <div onClick={() => setShowPerms(true)} {...pressFx} style={{ display:'flex', alignItems:'center', gap:13,
          background:C.surfaceLow, borderRadius:20, padding:'14px 16px', marginTop:10, cursor:'pointer',
          transition:'transform 150ms' }}>
          <div style={{ width:40, height:40, borderRadius:14, background:'white', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="admin_panel_settings" size={19} color={C.primary}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>Permisos de edición de órdenes</div>
            <div style={{ fontSize:11.5, color:C.muted }}>
              {permRows.filter(r => perms[r.k]).length} de 4 activos para tus meseros
            </div>
          </div>
          <Icon name="chevron_right" size={19} color={C.outline}/>
        </div>
        <div style={{ height:110 }}/>
      </div>
      {/* Sheet permisos */}
      {showPerms && (
        <div style={{ position:'absolute', inset:0, zIndex:90 }}>
          <div onClick={() => setShowPerms(false)} style={{ position:'absolute', inset:0,
            background:'rgba(29,28,23,0.42)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
          <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:C.surface,
            borderRadius:'32px 32px 0 0', padding:'0 24px 30px', boxShadow:'0px -24px 60px rgba(29,28,23,0.3)' }}>
            <Grip/>
            <div style={{ fontFamily:serif, fontSize:21, color:C.charcoal }}>Permisos del mesero</div>
            <div style={{ fontSize:12.5, color:C.muted, margin:'2px 0 14px' }}>
              Define qué pueden editar tus meseros en una orden. Aplica a toda la brigada.
            </div>
            {permRows.map(r => (
              <div key={r.k} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:18,
                padding:'12px 14px', marginBottom:8, boxShadow:'0 2px 8px rgba(29,28,23,0.04)' }}>
                <div style={{ width:40, height:40, borderRadius:13, background:C.surfaceLow, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={r.icon} size={19} color={C.primary}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{r.t}</div>
                  <div style={{ fontSize:11.5, color:C.muted }}>{r.d}</div>
                </div>
                <Toggle on={!!perms[r.k]} onChange={v => setPerms && setPerms(p => ({...p, [r.k]:v}))}/>
              </div>
            ))}
            {perms.editPrice && (
              <div style={{ display:'flex', gap:9, background:'rgba(184,134,11,0.1)', borderRadius:14, padding:'11px 14px', marginTop:2 }}>
                <Icon name="warning" size={16} color={C.dorado}/>
                <span style={{ fontSize:11.5, color:'#6B5410', lineHeight:'17px' }}>
                  Modificar precios es un permiso sensible. Se registra quién hace cada cambio.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      <CapNav active="c-equipo" go={go}/>
    </div>
  );
};

// ═══ C05 / C06 · wrappers móviles (reusan admin-mobile2) ═══
const CapDispositivos = ({ go }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
    <MobDevices onBack={() => go('c-equipo')}/>
    <CapNav active="c-dispositivos" go={go}/>
  </div>
);
const CapRendimiento = ({ go }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
    <MobPerformance onBack={() => go('c-equipo')}/>
    <CapNav active="c-rendimiento" go={go}/>
  </div>
);

// ═══ C07 · MENÚ DEL TURNO (solo activar/pausar) ════════
const CapMenu = ({ go, items, setItems }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
    <MobMenu embedded readOnly items={items} setItems={setItems} title="Menú del turno"/>
    <CapNav active="c-menu" go={go}/>
  </div>
);

// ═══ C08 · PERFIL PORTABLE DE LA CAPITANA ══════════════════
const CapPerfil = ({ go }) => (
  <WaiterProfile go={go} profile={CAPTAIN_PROFILE} nav={<CapNav active="c-perfil" go={go}/>}/>
);

Object.assign(window, { CAPTAIN, CAPTAIN_PROFILE, CapNav, CapInicio, CapMesas, CapPedidos, CapEquipo, CapDispositivos, CapRendimiento, CapMenu, CapPerfil });
