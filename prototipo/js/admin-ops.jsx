// ═══════════════════════════════════════════════════════════
// ADMIN · Ops — P13 config · P14 rendimiento · P15 equipo · P16 dispositivos
// ═══════════════════════════════════════════════════════════
const { useState } = React;

// ═══ P14 · RENDIMIENTO DEL EQUIPO ══════════════════════════
const AdminPerformance = ({ empty }) => {
  if (empty) return (
    <div className="fade-in" style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 28px 20px' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Rendimiento del equipo</div>
      <EmptyState icon="trending_up" title="Sin turnos registrados aún"
        body="Invita a tu primer mesero desde Miembros del equipo. Su rendimiento aparecerá aquí desde el primer servicio."/>
    </div>
  );
  const activos = TEAM.filter(t => t.estado==='activo');
  const maxProp = Math.max(...activos.map(t=>t.propinas));
  return (
    <div className="hide-scroll screen" style={{ flex:1, overflowY:'auto', padding:'0 28px 26px', animationDuration:'200ms' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal, marginBottom:16 }}>Rendimiento del equipo</div>
      <div style={{ display:'flex', gap:14, marginBottom:16 }}>
        <KPI label="Propinas del turno" value="$815" sub="↑ 12% vs lunes pasado" icon="payments"/>
        <KPI label="Satisfacción equipo" value="4.6" sub="214 calificaciones" icon="star"/>
        <KPI label="Mesas por mesero" value="6.3" sub="Balanceado" icon="table_restaurant"/>
      </div>

      <div style={{ display:'flex', gap:16 }}>
        {/* Ranking propinas */}
        <div style={{ flex:1.3, background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
          <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:16 }}>Propinas de hoy</div>
          {activos.map(m => (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <Avatar person={m} size={40} ring={m.top}/>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:13.5, fontWeight:600, color:C.charcoal }}>
                    {m.name} {m.top && <Icon name="star" size={13} color={C.dorado} fill style={{ verticalAlign:'-2px' }}/>}
                  </span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.dorado }}>{fmt(m.propinas)}</span>
                </div>
                <div style={{ height:9, borderRadius:9999, background:C.surfaceLow, overflow:'hidden' }}>
                  <div style={{ width:`${m.propinas/maxProp*100}%`, height:'100%',
                    background: m.top ? gradDorado : gradVino, borderRadius:9999 }}/>
                </div>
              </div>
            </div>
          ))}
          <div style={{ fontSize:11.5, color:C.outline, marginTop:4 }}>Las propinas van 100% directas al mesero vía Carta.</div>
        </div>

        {/* Detalle */}
        <div style={{ flex:2, display:'flex', flexDirection:'column', gap:12 }}>
          {activos.map(m => (
            <div key={m.id} style={{ background:'white', borderRadius:20, padding:'14px 18px',
              boxShadow:'0 4px 16px rgba(79,23,40,0.06)', display:'flex', alignItems:'center', gap:16 }}>
              <Avatar person={m} size={46} ring={m.top}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{m.name}</div>
                <div style={{ display:'flex', gap:6, marginTop:5 }}>
                  {m.tags.map(t => <Chip key={t} tone="dorado" style={{ fontSize:10.5, padding:'2px 9px' }}>{t}</Chip>)}
                </div>
              </div>
              {[[m.sat,'satisfacción'],[m.mesas,'mesas hoy'],[fmt(m.propinas),'propinas']].map(([v,l]) => (
                <div key={l} style={{ textAlign:'center', minWidth:72 }}>
                  <div style={{ fontFamily:serif, fontSize:19, color:C.primary }}>{v}</div>
                  <div style={{ fontSize:10.5, color:C.muted }}>{l}</div>
                </div>
              ))}
              <Btn variant="secondary" style={{ fontSize:12, padding:'8px 15px' }} iconName="celebration">Reconocer</Btn>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══ P15 · MIEMBROS DEL EQUIPO ═════════════════════════════
const AdminTeam = ({ empty }) => {
  const estadoIcon = {
    activo:   <span style={{ width:9, height:9, borderRadius:9999, background:C.success, display:'inline-block' }}/>,
    inactivo: <Icon name="close" size={13} color={C.outline}/>,
  };
  if (empty) return (
    <div className="fade-in" style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 28px 20px' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Miembros del equipo</div>
      <EmptyState icon="group" title="Arma tu equipo de piso"
        body="Genera el QR de invitación. Cada mesero lo escanea desde su propio teléfono y crea su perfil — tú no llenas nada."
        cta="Generar QR de invitación"/>
    </div>
  );
  return (
    <div className="hide-scroll screen" style={{ flex:1, overflowY:'auto', padding:'0 28px 26px', animationDuration:'200ms' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div>
          <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Miembros del equipo</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>{TEAM.filter(t=>t.estado==='activo').length} activos en el turno de hoy</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        {/* Lista — activos arriba */}
        <div style={{ flex:2, display:'flex', flexDirection:'column', gap:10 }}>
          {[...TEAM].sort((a,b) => (b.estado==='activo') - (a.estado==='activo') || b.top - a.top).map(m => (
            <div key={m.id} style={{ background:'white', borderRadius:20, padding:'14px 18px',
              boxShadow:'0 4px 16px rgba(79,23,40,0.06)', display:'flex', alignItems:'center', gap:14,
              opacity: m.estado==='activo' ? 1 : 0.6 }}>
              <div style={{ position:'relative' }}>
                <Avatar person={m} size={48} ring={m.top} dimmed={m.estado!=='activo'}/>
                {m.top && <div style={{ position:'absolute', top:-4, right:-4, width:20, height:20, borderRadius:9999,
                  background:gradDorado, display:'flex', alignItems:'center', justifyContent:'center',
                  border:`2px solid ${C.surface}` }}>
                  <Icon name="star" size={11} color="white" fill/>
                </div>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{m.name}</span>
                  {m.top && <Chip tone="dorado" style={{ fontSize:10, padding:'2px 8px' }}>Top del mes</Chip>}
                </div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
                  {estadoIcon[m.estado]}
                  {m.estado==='activo' ? `En turno · ${m.mesas} mesas` : 'Fuera de turno'}
                  <span style={{ color:C.outline }}>·</span>
                  <Icon name="star" size={12} color={C.dorado} fill/> {m.sat}
                </div>
              </div>
              <Btn variant="secondary" style={{ fontSize:12, padding:'8px 15px' }}>Ver perfil</Btn>
              <IconBtn name="more_vert" size={34} iconSize={18} style={{ background:'transparent' }}/>
            </div>
          ))}
          <div style={{ display:'flex', gap:10, alignItems:'center', background:C.surfaceLow, borderRadius:16,
            padding:'11px 16px', marginTop:4 }}>
            <Icon name="account_tree" size={17} color={C.outline}/>
            <span style={{ fontSize:12, color:C.muted }}>
              ¿Manejas varias sucursales? La asignación de red se gestiona desde tu cuenta de franquicia.
            </span>
          </div>
        </div>

        {/* QR de invitación — el mesero escanea */}
        <div style={{ flex:1, background:'white', borderRadius:24, padding:'20px 20px 18px',
          boxShadow:'0 4px 16px rgba(79,23,40,0.07)', textAlign:'center' }}>
          <div style={{ fontFamily:serif, fontSize:17, color:C.primary, marginBottom:4 }}>Invitar mesero</div>
          <div style={{ fontSize:12.5, color:C.muted, lineHeight:'19px', marginBottom:14 }}>
            El mesero escanea este QR <b>desde su teléfono</b> y crea o vincula su propio perfil.
          </div>
          <div style={{ background:C.surfaceLow, borderRadius:20, padding:18, display:'flex',
            justifyContent:'center', marginBottom:12 }}>
            <div style={{ background:'white', borderRadius:14, padding:14, boxShadow:'0 4px 14px rgba(29,28,23,0.08)' }}>
              <QRBlock size={116} seed={23}/>
            </div>
          </div>
          <div style={{ fontSize:11.5, color:C.outline, marginBottom:14 }}>Expira en 24 h · un uso por mesero</div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="secondary" style={{ flex:1, fontSize:12.5, padding:'10px 12px' }} iconName="refresh">Renovar</Btn>
            <Btn variant="primary" style={{ flex:1, fontSize:12.5, padding:'10px 12px' }} iconName="ios_share">Compartir</Btn>
          </div>
          <div style={{ marginTop:16, background:'rgba(184,134,11,0.09)', borderRadius:14, padding:'10px 12px',
            display:'flex', gap:8, alignItems:'flex-start', textAlign:'left' }}>
            <Icon name="hourglass_top" size={15} color={C.dorado} style={{ marginTop:1 }}/>
            <span style={{ fontSize:11.5, color:'#6B5410', lineHeight:'17px' }}>
              <b>1 invitación pendiente</b> — enviada a Roberto G. hace 2 h.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══ P16 · DISPOSITIVOS AUTORIZADOS ════════════════════════
const AdminDevices = ({ empty }) => {
  const [devices, setDevices] = useState(DEVICES_SEED);
  const [configFor, setConfigFor] = useState(null);
  const toggleBlock = id => setDevices(prev => prev.map(d => d.id===id
    ? {...d, estado: d.estado==='bloqueado' ? 'autorizado' : 'bloqueado'} : d));
  const remove = id => setDevices(prev => prev.filter(d => d.id!==id));
  if (empty) return (
    <div className="fade-in" style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 28px 20px' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Dispositivos autorizados</div>
      <EmptyState icon="devices" title="Sin dispositivos aún"
        body="Cuando tu equipo se una, sus teléfonos y las tablets del restaurante aparecerán aquí para que las autorices."/>
    </div>
  );
  const grupos = [
    { t:'Del restaurante', d:'Tablets compartidas — cambio de mesero con PIN', items: devices.filter(d => d.tipo==='Del restaurante') },
    { t:'Personales de meseros', d:'Un dispositivo personal activo por mesero', items: devices.filter(d => d.tipo!=='Del restaurante') },
  ];
  return (
    <div className="hide-scroll screen" style={{ flex:1, overflowY:'auto', padding:'0 28px 26px', animationDuration:'200ms' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal }}>Dispositivos autorizados</div>
      <div style={{ fontSize:13, color:C.muted, margin:'2px 0 18px' }}>
        Controla qué equipos pueden operar mesas y cobrar en {RESTAURANT.name}.
      </div>
      {grupos.map(g => (
        <div key={g.t} style={{ marginBottom:22 }}>
          <div style={{ marginBottom:9 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em' }}>{g.t}</span>
            <span style={{ fontSize:12, color:C.outline, marginLeft:10 }}>{g.d}</span>
          </div>
          <div style={{ background:'white', borderRadius:22, boxShadow:'0 4px 16px rgba(79,23,40,0.06)' }}>
            {g.items.map((d,i) => (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                borderBottom: i<g.items.length-1 ? '1px solid rgba(91,74,61,0.06)' : 'none',
                opacity: d.estado==='bloqueado' ? 0.55 : 1 }}>
                <div style={{ width:44, height:44, borderRadius:14, flexShrink:0,
                  background: d.estado==='bloqueado' ? C.surfaceHigh : C.surfaceLow,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={d.icon} size={21} color={d.estado==='bloqueado' ? C.outline : C.primary}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.charcoal }}>{d.name}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>
                    {d.sesion
                      ? <span>Sesión actual: <span style={{ color:C.dorado, fontWeight:700 }}>{d.sesion}</span> · {d.last}</span>
                      : `${d.owner} · ${d.last}`}
                  </div>
                </div>
                {d.sesion && d.estado!=='bloqueado' && (
                  <Btn variant="secondary" style={{ fontSize:12, padding:'8px 14px' }} iconName="manage_accounts"
                    onClick={() => setConfigFor(d)}>Configurar</Btn>
                )}
                {d.estado==='bloqueado'
                  ? <Chip tone="error" style={{ fontSize:11.5 }}><Icon name="block" size={13} color={C.error}/> Bloqueado</Chip>
                  : <Chip tone="success" style={{ fontSize:11.5 }}><Icon name="verified_user" size={13} color="#15803D"/> Autorizado</Chip>}
                <Btn variant="secondary" style={{ fontSize:12, padding:'8px 14px' }}
                  onClick={() => toggleBlock(d.id)}>
                  {d.estado==='bloqueado' ? 'Reactivar' : 'Bloquear'}
                </Btn>
                <IconBtn name="delete" size={34} iconSize={17} style={{ background:'transparent' }}
                  onClick={() => remove(d.id)}/>
              </div>
            ))}
            {g.items.length===0 && <div style={{ padding:'18px', fontSize:13, color:C.muted, textAlign:'center' }}>Sin dispositivos en este grupo.</div>}
          </div>
        </div>
      ))}
      <div style={{ display:'flex', gap:10, alignItems:'center', background:C.surfaceLow, borderRadius:16, padding:'12px 16px' }}>
        <Icon name="pin" size={18} color={C.outline}/>
        <span style={{ fontSize:12.5, color:C.muted }}>
          En tablets compartidas, cada mesero entra con su PIN de 4 dígitos. El PIN se gestiona desde su perfil.
        </span>
      </div>
      {configFor && <DeviceConfigSheet device={configFor} desktop onClose={() => setConfigFor(null)}/>}
    </div>
  );
};

// ═══ P13 · CONFIGURACIÓN ═══════════════════════════════════
const AdminSettings = () => {
  const [notif, setNotif] = useState({ demoras:true, resenas:true, propinas:false, resumen:true });
  return (
    <div className="hide-scroll screen" style={{ flex:1, overflowY:'auto', padding:'0 28px 26px', animationDuration:'200ms' }}>
      <div style={{ fontFamily:serif, fontSize:25, color:C.charcoal, marginBottom:16 }}>Configuración</div>
      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        {/* Col 1 — perfil */}
        <div style={{ flex:1.2 }}>
          <div style={{ background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)', marginBottom:14 }}>
            <div style={{ fontFamily:serif, fontSize:16.5, color:C.primary, marginBottom:14 }}>Perfil del restaurante</div>
            <div style={{ display:'flex', gap:14, marginBottom:14 }}>
              <image-slot id="rest-logo" shape="rounded" radius="18" placeholder="Logo"
                style={{ width:'84px', height:'84px', flexShrink:0 }}></image-slot>
              <div style={{ flex:1 }}>
                <Field label="Nombre" value={RESTAURANT.name} style={{ marginBottom:10 }}/>
                <Field label="Lema" value={RESTAURANT.tagline} style={{ marginBottom:0 }}/>
              </div>
            </div>
            <Field label="Dirección" value="Córdoba 234, Roma Norte, CDMX"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Horario" value="13:00 – 23:00" style={{ marginBottom:0 }}/>
              <Field label="Mesas" value="16" style={{ marginBottom:0 }}/>
            </div>
          </div>
          {/* Notificaciones */}
          <div style={{ background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
            <div style={{ fontFamily:serif, fontSize:16.5, color:C.primary, marginBottom:10 }}>Notificaciones</div>
            {[['demoras','Demoras en cocina','Alerta inmediata si una mesa pasa de 25 min'],
              ['resenas','Reseñas nuevas','Cada calificación de comensal'],
              ['propinas','Propinas del equipo','Resumen al cierre del turno'],
              ['resumen','Resumen diario','Ventas y satisfacción, 23:30']].map(([k,t,d]) => (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.charcoal }}>{t}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{d}</div>
                </div>
                <Toggle on={notif[k]} onChange={v => setNotif(n => ({...n, [k]:v}))}/>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2 — pagos + plan */}
        <div style={{ flex:1 }}>
          <div style={{ background:gradVino, borderRadius:22, padding:'20px 22px', marginBottom:14,
            boxShadow:'0 16px 40px rgba(79,23,40,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontFamily:serif, fontSize:16.5, color:'white' }}>Pagos y comisión</span>
              <Icon name="verified_user" size={18} color={C.doradoLight}/>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontFamily:serif, fontSize:42, color:'white' }}>1.8%</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>por transacción</span>
            </div>
            <div style={{ margin:'10px 0 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>Transacciones del mes</span>
                <span style={{ fontSize:12, fontWeight:700, color:'white' }}>Te quedan 1,000 de 5,000</span>
              </div>
              <div style={{ height:8, borderRadius:9999, background:'rgba(255,255,255,0.15)', overflow:'hidden' }}>
                <div style={{ width:'80%', height:'100%', borderRadius:9999, background:gradDorado }}/>
              </div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:14, padding:'10px 13px', marginBottom:8,
              display:'flex', alignItems:'center', gap:10 }}>
              <Icon name="credit_card" size={17} color="white"/>
              <span style={{ fontSize:13, color:'white', flex:1 }}>Stripe · cuenta conectada</span>
              <Icon name="check_circle" size={16} color={C.doradoLight} fill/>
            </div>
            <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:14, padding:'10px 13px',
              display:'flex', alignItems:'center', gap:10 }}>
              <Icon name="account_balance" size={17} color="white"/>
              <span style={{ fontSize:13, color:'white', flex:1 }}>SPEI · CLABE terminación 4821</span>
              <Icon name="check_circle" size={16} color={C.doradoLight} fill/>
            </div>
          </div>

          <div style={{ background:'white', borderRadius:22, padding:'18px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontFamily:serif, fontSize:16.5, color:C.primary }}>Tu plan</span>
              <Chip tone="dorado">Pro</Chip>
            </div>
            <div style={{ fontSize:13, color:C.muted, lineHeight:'20px', marginBottom:12 }}>
              Menú AR ilimitado · sesiones grupales · analytics · hasta 20 meseros.
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
              <span style={{ fontFamily:serif, fontSize:26, color:C.charcoal }}>$249 <span style={{ fontSize:13, fontFamily:sans, color:C.muted }}>MXN/mes</span></span>
              <span style={{ fontSize:12, color:C.muted }}>Renueva 1 ago</span>
            </div>
            <Btn variant="secondary" style={{ width:'100%', fontSize:13.5, padding:'11px 20px' }}>Cambiar de plan</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AdminPerformance, AdminTeam, AdminDevices, AdminSettings });
