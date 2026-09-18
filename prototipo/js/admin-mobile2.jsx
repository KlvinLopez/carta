// ═══════════════════════════════════════════════════════════
// ADMIN MÓVIL 2 — rendimiento + equipo + dispositivos (PIN) + config
// ═══════════════════════════════════════════════════════════
const { useState, useEffect } = React;

// ═══ PIN SWAP — cambio rápido de turno en tablet ═══════════
const PinSwapModal = ({ device, onClose, onDone }) => {
  const [who, setWho] = useState(null);
  const [pin, setPin] = useState('');
  const [ok, setOk] = useState(false);
  const activos = TEAM.filter(t => t.estado==='activo');
  useEffect(() => {
    if (pin.length === 4) {
      setOk(true);
      const t = setTimeout(() => onDone(who.name), 900);
      return () => clearTimeout(t);
    }
  }, [pin]);
  return (
    <div style={{ position:'absolute', inset:0, zIndex:130, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(29,28,23,0.45)',
        backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)' }}/>
      <div className="sheet-up" style={{ position:'relative', width:'100%', maxWidth:420, background:C.surface,
        borderRadius:'32px 32px 0 0', padding:'0 26px 30px', boxShadow:'0px -24px 60px rgba(29,28,23,0.35)' }}>
        <Grip/>
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <div style={{ fontFamily:serif, fontSize:21, color:C.charcoal }}>Cambio rápido de turno</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{device.name}</div>
        </div>

        {!who ? (
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
              color:C.muted, marginBottom:10 }}>¿Quién toma la tablet?</div>
            {activos.map(w => (
              <div key={w.id} onClick={() => setWho(w)} {...pressFx} style={{ display:'flex', alignItems:'center',
                gap:12, background:'white', borderRadius:18, padding:'11px 14px', marginBottom:8, cursor:'pointer',
                boxShadow:'0 2px 10px rgba(29,28,23,0.05)', transition:'transform 150ms',
                opacity: device.sesion === w.name ? 0.45 : 1 }}>
                <Avatar person={w} size={40} ring={w.top}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{w.name}</div>
                  <div style={{ fontSize:11.5, color:C.muted }}>
                    {device.sesion === w.name ? 'Sesión actual' : `★ ${w.sat} · ${w.mesas} mesas hoy`}
                  </div>
                </div>
                <Icon name="chevron_right" size={18} color={C.outline}/>
              </div>
            ))}
          </div>
        ) : ok ? (
          <div className="pop-in" style={{ textAlign:'center', padding:'22px 0 30px' }}>
            <div style={{ width:74, height:74, borderRadius:9999, background:gradVino, margin:'0 auto',
              display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 16px 40px rgba(79,23,40,0.35)' }}>
              <Icon name="check" size={36} color="white" weight={600}/>
            </div>
            <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginTop:14 }}>Turno cambiado</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>{who.name} ya opera esta tablet.</div>
          </div>
        ) : (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:11, background:'white', borderRadius:18,
              padding:'10px 14px', marginBottom:16, boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
              <Avatar person={who} size={38}/>
              <span style={{ flex:1, fontSize:14, fontWeight:700, color:C.charcoal }}>{who.name}</span>
              <button onClick={() => { setWho(null); setPin(''); }} style={{ background:'none', border:'none',
                cursor:'pointer', fontSize:12, fontWeight:700, color:C.dorado, fontFamily:sans }}>Cambiar</button>
            </div>
            <div style={{ textAlign:'center', fontSize:12.5, color:C.muted, marginBottom:12 }}>Ingresa tu PIN de 4 dígitos</div>
            <div style={{ display:'flex', justifyContent:'center', gap:14, marginBottom:18 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:16, height:16, borderRadius:9999, transition:'all 200ms',
                  background: i < pin.length ? C.primary : C.surfaceHighest,
                  transform: i === pin.length-1 ? 'scale(1.2)' : 'scale(1)' }}/>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:9, maxWidth:260, margin:'0 auto' }}>
              {[1,2,3,4,5,6,7,8,9,'',0,'back'].map((k,i) => k === '' ? <div key={i}/> : (
                <button key={i} {...pressFx}
                  onClick={() => k==='back' ? setPin(p => p.slice(0,-1)) : pin.length<4 && setPin(p => p + k)}
                  style={{ height:52, borderRadius:18, border:'none', cursor:'pointer', fontFamily:sans,
                    background: k==='back' ? 'transparent' : 'white', fontSize:19, fontWeight:600, color:C.charcoal,
                    boxShadow: k==='back' ? 'none' : '0 2px 8px rgba(29,28,23,0.06)',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'transform 120ms' }}>
                  {k==='back' ? <Icon name="backspace" size={20} color={C.muted}/> : k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ PIN PAD reutilizable ═══════════════════════════
const PinPad = ({ onComplete }) => {
  const [pin, setPin] = useState('');
  useEffect(() => {
    if (pin.length === 4) { const t = setTimeout(() => onComplete(pin), 350); return () => clearTimeout(t); }
  }, [pin]);
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'center', gap:14, marginBottom:18 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width:16, height:16, borderRadius:9999, transition:'all 200ms',
            background: i < pin.length ? C.primary : C.surfaceHighest,
            transform: i === pin.length-1 ? 'scale(1.2)' : 'scale(1)' }}/>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:9, maxWidth:260, margin:'0 auto' }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'back'].map((k,i) => k === '' ? <div key={i}/> : (
          <button key={i} {...pressFx}
            onClick={() => k==='back' ? setPin(p => p.slice(0,-1)) : pin.length<4 && setPin(p => p + k)}
            style={{ height:52, borderRadius:18, border:'none', cursor:'pointer', fontFamily:sans,
              background: k==='back' ? 'transparent' : 'white', fontSize:19, fontWeight:600, color:C.charcoal,
              boxShadow: k==='back' ? 'none' : '0 2px 8px rgba(29,28,23,0.06)',
              display:'flex', alignItems:'center', justifyContent:'center', transition:'transform 120ms' }}>
            {k==='back' ? <Icon name="backspace" size={20} color={C.muted}/> : k}
          </button>
        ))}
      </div>
    </div>
  );
};

// ═══ CONFIG DE TABLET — quién puede usarla + PIN ════════
const DeviceConfigSheet = ({ device, onClose, desktop=false }) => {
  const [allowed, setAllowed] = useState(() => Object.fromEntries(TEAM.map(t => [t.name, t.estado==='activo'])));
  const [pinFor, setPinFor] = useState(null);
  const [pinDone, setPinDone] = useState(false);
  const all = TEAM.every(t => allowed[t.name]);
  const setAll = v => setAllowed(Object.fromEntries(TEAM.map(t => [t.name, v])));
  const content = (
    <React.Fragment>
      {pinFor ? (
        pinDone ? (
          <div className="pop-in" style={{ textAlign:'center', padding:'20px 0 26px' }}>
            <div style={{ width:70, height:70, borderRadius:9999, background:gradVino, margin:'0 auto',
              display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 16px 40px rgba(79,23,40,0.35)' }}>
              <Icon name="check" size={34} color="white" weight={600}/>
            </div>
            <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginTop:12 }}>PIN actualizado</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>{pinFor.name} ya puede usarlo en esta tablet.</div>
          </div>
        ) : (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:14 }}>
              <IconBtn name="arrow_back" size={34} iconSize={17} onClick={() => setPinFor(null)}/>
              <Avatar person={pinFor} size={38}/>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>Nuevo PIN para {pinFor.name.split(' ')[0]}</div>
                <div style={{ fontSize:11.5, color:C.muted }}>4 dígitos · solo para {device.name}</div>
              </div>
            </div>
            <PinPad onComplete={() => { setPinDone(true); setTimeout(() => { setPinFor(null); setPinDone(false); }, 1300); }}/>
          </div>
        )
      ) : (
        <React.Fragment>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal }}>{device.name}</div>
              <div style={{ fontSize:12.5, color:C.muted, margin:'2px 0 14px' }}>
                Configura quién puede usar esta tablet. Toca un perfil para cambiar su PIN.
              </div>
            </div>
            {desktop && <IconBtn name="close" size={36} iconSize={18} onClick={onClose}/>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, background:C.surfaceLow, borderRadius:18,
            padding:'12px 15px', marginBottom:10 }}>
            <Icon name="groups" size={19} color={C.primary}/>
            <span style={{ flex:1, fontSize:14, fontWeight:700, color:C.charcoal }}>Todos los meseros</span>
            <Toggle on={all} onChange={setAll}/>
          </div>
          {TEAM.map(w => (
            <div key={w.id} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:18,
              padding:'9px 13px', marginBottom:7, boxShadow:'0 2px 8px rgba(29,28,23,0.04)' }}>
              <div onClick={() => allowed[w.name] && setPinFor(w)} style={{ display:'flex', alignItems:'center', gap:11,
                flex:1, cursor: allowed[w.name] ? 'pointer' : 'default', opacity: allowed[w.name] ? 1 : 0.5,
                transition:'opacity 200ms' }}>
                <Avatar person={w} size={38} ring={w.top}/>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:C.charcoal }}>{w.name}</div>
                  <div style={{ fontSize:11, color:C.dorado, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                    <Icon name="pin" size={12} color={C.dorado}/> Cambiar PIN
                  </div>
                </div>
              </div>
              <Toggle on={!!allowed[w.name]} onChange={v => setAllowed(a => ({...a, [w.name]:v}))}/>
            </div>
          ))}
        </React.Fragment>
      )}
    </React.Fragment>
  );
  if (desktop) return (
    <div style={{ position:'absolute', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(29,28,23,0.4)',
        backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)' }}/>
      <div className="pop-in hide-scroll" style={{ position:'relative', width:440, maxHeight:'86%', overflowY:'auto',
        background:C.surface, borderRadius:28, padding:'24px 26px', boxShadow:'0 40px 100px rgba(0,0,0,0.4)' }}>
        {content}
      </div>
    </div>
  );
  return (
    <div style={{ position:'absolute', inset:0, zIndex:120, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(29,28,23,0.45)',
        backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)' }}/>
      <div className="sheet-up" style={{ position:'relative', width:'100%', maxWidth:420, background:C.surface,
        borderRadius:'32px 32px 0 0', padding:'0 24px 30px', boxShadow:'0px -24px 60px rgba(29,28,23,0.35)' }}>
        <Grip/>
        <div style={{ height:6 }}/>
        {content}
      </div>
    </div>
  );
};

// ═══ DISPOSITIVOS (móvil) ══════════════════════════════════
const MDEVICES = [
  { id:1, name:'iPad Air · Salón principal', tipo:'rest', icon:'tablet_mac', sesion:'Carlos Ramírez', desde:'13:42', on:true },
  { id:2, name:'iPad Mini · Terraza', tipo:'rest', icon:'tablet_mac', sesion:'Mariana López', desde:'12:05', on:true },
  { id:3, name:'iPhone 15 · Carlos R.', tipo:'personal', icon:'smartphone', online:true, on:true },
  { id:4, name:'Galaxy S24 · Mariana L.', tipo:'personal', icon:'smartphone', online:true, on:true },
  { id:5, name:'iPhone 13 · Luis M.', tipo:'personal', icon:'smartphone', online:false, on:false, nota:'Bloqueado el 4 jul, 16:30 por administrador' },
];

const MobDevices = ({ go, onBack }) => {
  const [devs, setDevs] = useState(MDEVICES);
  const [configFor, setConfigFor] = useState(null);
  const toggle = id => setDevs(prev => prev.map(d => d.id===id ? {...d, on:!d.on} : d));
  const activosN = devs.filter(d=>d.on).length;
  const inner = (
    <React.Fragment>
      <MobTop title="Dispositivos" onBack={onBack || (go ? () => go('settings') : undefined)}
        right={<IconBtn name="add" size={38} iconSize={19}/>}/>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'2px 20px 0' }}>
        {/* Resumen */}
        <div style={{ background:'white', borderRadius:22, padding:'14px 10px', display:'flex',
          boxShadow:'0 4px 14px rgba(29,28,23,0.05)', marginBottom:18 }}>
          {[[activosN,'ACTIVOS','#15803D'],[devs.length-activosN,'BLOQUEADOS',C.error],[4,'EN TURNO',C.charcoal]].map(([v,l,c],i) => (
            <div key={l} style={{ flex:1, textAlign:'center',
              borderLeft: i>0 ? '1px solid rgba(91,74,61,0.1)' : 'none' }}>
              <div style={{ fontFamily:serif, fontSize:23, color:c }}>{v}</div>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', color:C.muted }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted }}>Del restaurante</div>
        <div style={{ fontSize:12, fontStyle:'italic', color:C.outline, margin:'3px 0 10px' }}>
          Cualquier mesero autorizado puede entrar con su PIN.
        </div>
        {devs.filter(d=>d.tipo==='rest').map(d => (
          <div key={d.id} style={{ background:'white', borderRadius:24, padding:'14px 16px', marginBottom:11,
            boxShadow:'0 4px 14px rgba(29,28,23,0.05)', opacity: d.on ? 1 : 0.55 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:C.surfaceLow, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name={d.icon} size={21} color={C.primary}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{d.name}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>
                  Sesión actual: <span style={{ color:C.dorado, fontWeight:700 }}>{d.sesion}</span> · desde {d.desde}
                </div>
              </div>
              <Toggle on={d.on} onChange={() => toggle(d.id)}/>
            </div>
            {d.on && (
              <button onClick={() => setConfigFor(d)} {...pressFx} style={{ display:'flex', alignItems:'center',
                justifyContent:'center', gap:8, width:'100%', marginTop:11, background:C.surfaceLow, border:'none',
                borderRadius:14, padding:'10px 0', fontSize:12.5, fontWeight:700, color:C.primary, cursor:'pointer',
                fontFamily:sans, transition:'transform 130ms' }}>
                <Icon name="manage_accounts" size={16} color={C.primary}/> Configurar acceso y PIN
              </button>
            )}
          </div>
        ))}

        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted, marginTop:8 }}>Personales de meseros</div>
        <div style={{ fontSize:12, fontStyle:'italic', color:C.outline, margin:'3px 0 10px' }}>
          Solo el mesero asignado puede usar su dispositivo.
        </div>
        {devs.filter(d=>d.tipo==='personal').map(d => (
          <div key={d.id} style={{ background:'white', borderRadius:22, padding:'12px 16px', marginBottom:10,
            boxShadow:'0 4px 14px rgba(29,28,23,0.05)', opacity: d.on ? 1 : 0.6, position:'relative', overflow:'hidden' }}>
            {!d.on && <div style={{ position:'absolute', left:0, top:8, bottom:8, width:4, borderRadius:'0 4px 4px 0', background:C.error }}/>}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:13, background:C.surfaceLow, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name={d.icon} size={19} color={d.on ? C.primary : C.outline}/>
              </div>
              <span style={{ flex:1, fontSize:13.5, fontWeight:700, color:C.charcoal }}>{d.name}</span>
              <span style={{ width:8, height:8, borderRadius:9999, background: d.online ? C.success : C.error }}/>
              <Toggle on={d.on} onChange={() => toggle(d.id)}/>
            </div>
            {d.nota && !d.on && <div style={{ fontSize:11, color:C.error, marginTop:7, paddingLeft:52 }}>{d.nota}</div>}
          </div>
        ))}

        {/* Cómo funciona el PIN */}
        <div style={{ background:'rgba(79,23,40,0.06)', borderRadius:22, padding:'15px 17px', margin:'8px 0',
          display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ width:36, height:36, borderRadius:9999, background:'white', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="sync_alt" size={17} color={C.primary}/>
          </div>
          <div>
            <div style={{ fontSize:13.5, fontWeight:700, color:C.primary, marginBottom:4 }}>¿Cómo funciona el flujo PIN?</div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:'19px' }}>
              El cambio de turno se hace directo en la tablet: el mesero toca el botón de cambio de sesión,
              elige su nombre y entra con su PIN. Aquí solo configuras quién tiene acceso y sus PINs.
            </div>
          </div>
        </div>
        <div style={{ height:110 }}/>
      </div>
      {configFor && <DeviceConfigSheet device={configFor} onClose={() => setConfigFor(null)}/>}
    </React.Fragment>
  );
  if (!go) return inner; // embebido (capitán)
  return <MobScreen nav="devices" go={go} label="Admin móvil · Dispositivos">{inner}</MobScreen>;
};

// ═══ RENDIMIENTO DEL EQUIPO (móvil) ════════════════════════
const PERF = [
  { name:'Carlos Ramírez', propinas:1240, sat:4.8, mesas:22, avg:'18 min', top:true, stripe:gradDorado,
    tags:[['Atento',18],['Eficiente',14],['Conocedor',9]],
    nota:{ icon:'workspace_premium', color:'#8A6508', bg:'rgba(184,134,11,0.1)', text:'Su ticket promedio es 28% mayor que el resto del equipo — excelente upsell.' } },
  { name:'Mariana López', propinas:980, sat:4.5, mesas:18, avg:'21 min', stripe:null,
    tags:[['Amable',12],['Rápida',10]],
    nota:{ icon:'thumb_up', color:C.muted, bg:C.surfaceLow, text:'Consistente en calidad. Oportunidad de mejorar tiempo.' } },
  { name:'Luis Mendoza', propinas:420, sat:3.8, mesas:12, avg:'34 min', slow:true, stripe:'linear-gradient(180deg,#BA1A1A,#7F1D1D)',
    tags:[['Lento',6],['Amable',5]],
    nota:{ icon:'priority_high', color:C.error, bg:'rgba(186,26,26,0.07)', text:'Tiempo de atención 40% más lento — considerar capacitación.' } },
];

const MobPerformance = ({ go, onBack }) => {
  const [period, setPeriod] = useState('7 días');
  const inner = (
    <React.Fragment>
      <MobTop title="Equipo · Rendimiento" onBack={onBack || (go ? () => go('settings') : undefined)}
        right={<IconBtn name="ios_share" size={38} iconSize={18}/>}/>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'2px 20px 0' }}>
        <div className="hide-scroll" style={{ display:'flex', gap:8, overflowX:'auto', margin:'0 -20px', padding:'0 20px' }}>
          {['Hoy','7 días','30 días','Turno actual'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ flexShrink:0, border:'none', cursor:'pointer',
              borderRadius:9999, padding:'8px 16px', fontSize:12.5, fontWeight:700, fontFamily:sans,
              background: period===p ? gradVino : C.surfaceHigh, color: period===p ? 'white' : C.muted }}>{p}</button>
          ))}
        </div>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', color:C.muted, margin:'10px 2px 12px' }}>
          1 – 8 JUL 2026
        </div>
        <div style={{ background:'white', borderRadius:22, padding:'14px 10px', display:'flex',
          boxShadow:'0 4px 14px rgba(29,28,23,0.05)', marginBottom:16 }}>
          {[['$4,820','PROPINAS',C.dorado],['★ 4.6','RATING',C.charcoal],['4','ACTIVOS',C.charcoal]].map(([v,l,c],i) => (
            <div key={l} style={{ flex:1, textAlign:'center', borderLeft: i>0 ? '1px solid rgba(91,74,61,0.1)' : 'none' }}>
              <div style={{ fontFamily:serif, fontSize:21, color:c }}>{v}</div>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.1em', color:C.muted }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily:serif, fontSize:18, color:C.primary, marginBottom:11 }}>Rendimiento individual</div>
        {PERF.map(m => {
          const person = TEAM.find(t => t.name === m.name) || { name:m.name, emoji:'🧑' };
          return (
            <div key={m.name} style={{ position:'relative', background:'white', borderRadius:26, padding:'16px 17px 14px 21px',
              marginBottom:12, boxShadow:'0 4px 14px rgba(29,28,23,0.05)', overflow:'hidden' }}>
              {m.stripe && <div style={{ position:'absolute', left:0, top:12, bottom:12, width:5, borderRadius:'0 6px 6px 0', background:m.stripe }}/>}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ position:'relative' }}>
                  <Avatar person={person} size={48} ring={m.top}/>
                  {m.top && <span style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%)',
                    background:gradDorado, color:'white', fontSize:8, fontWeight:800, letterSpacing:'0.08em',
                    borderRadius:9999, padding:'2px 7px' }}>TOP</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:C.charcoal }}>{m.name.split(' ')[0]} {m.name.split(' ')[1][0]}.</div>
                  <div style={{ fontSize:12, color: m.slow ? C.error : C.muted, marginTop:1 }}>
                    ★ {m.sat} · {m.mesas} mesas
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:serif, fontSize:21, color: m.slow ? C.error : C.dorado }}>{fmt(m.propinas)}</div>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:C.muted }}>PROPINAS</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'11px 0' }}>
                {m.tags.map(([t,n]) => (
                  <Chip key={t} tone={m.top ? 'dorado' : 'neutral'} style={{ fontSize:11, padding:'4px 11px' }}>{t} ×{n}</Chip>
                ))}
                <Chip tone={m.slow ? 'error' : 'neutral'} style={{ fontSize:11, padding:'4px 11px' }}>
                  <Icon name="timer" size={12} color="currentColor"/> {m.avg}
                </Chip>
              </div>
              <div style={{ display:'flex', gap:9, background:m.nota.bg, borderRadius:14, padding:'9px 12px' }}>
                <Icon name={m.nota.icon} size={15} color={m.nota.color} style={{ marginTop:1, flexShrink:0 }}/>
                <span style={{ fontSize:11.5, color:C.muted, lineHeight:'17px' }}>{m.nota.text}</span>
              </div>
            </div>
          );
        })}

        {/* Sugerencias */}
        <div style={{ background:gradVino, borderRadius:26, padding:'17px 19px', marginBottom:11,
          boxShadow:'0 16px 36px rgba(79,23,40,0.28)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <Icon name="auto_awesome" size={16} color={C.doradoLight}/>
            <span style={{ fontFamily:serif, fontSize:17, color:'white' }}>Sugerencia de bono</span>
          </div>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.78)', lineHeight:'19px', marginBottom:12 }}>
            Reconocimiento extraordinario para Carlos R. por su alto desempeño esta semana.
          </div>
          <button {...pressFx} style={{ width:'100%', background:'white', border:'none', borderRadius:9999,
            padding:'12px 0', fontSize:12, fontWeight:800, letterSpacing:'0.1em', color:C.primary,
            cursor:'pointer', fontFamily:sans }}>REGISTRAR BONO</button>
        </div>
        <div style={{ background:C.surfaceLow, borderRadius:26, padding:'17px 19px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <Icon name="school" size={17} color={C.primary}/>
            <span style={{ fontFamily:serif, fontSize:17, color:C.charcoal }}>Upskilling recomendado</span>
          </div>
          <div style={{ fontSize:12.5, color:C.muted, lineHeight:'19px', marginBottom:12 }}>
            Taller de agilidad operativa y manejo de flujo en horas pico para Luis M.
          </div>
          <button {...pressFx} style={{ width:'100%', background:'white', border:'none', borderRadius:9999,
            padding:'12px 0', fontSize:12, fontWeight:800, letterSpacing:'0.1em', color:C.charcoal,
            cursor:'pointer', fontFamily:sans }}>PROGRAMAR CAPACITACIÓN</button>
        </div>
        <div style={{ height:110 }}/>
      </div>
    </React.Fragment>
  );
  if (!go) return inner;
  return <MobScreen nav="performance" go={go} label="Admin móvil · Rendimiento">{inner}</MobScreen>;
};

// ═══ MIEMBROS DEL EQUIPO (móvil) ═══════════════════════════
const MobTeam = ({ go }) => (
  <MobScreen nav="team" go={go} label="Admin móvil · Equipo">
    <MobTop title="Miembros del equipo" onBack={() => go('settings')}/>
    <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'2px 20px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:11 }}>
        <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>Meseros activos</span>
        <span style={{ fontSize:12, color:C.muted }}>{TEAM.length} registrados</span>
      </div>
      {TEAM.map(m => (
        <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:9999,
          padding:'9px 14px 9px 9px', marginBottom:9, boxShadow:'0 2px 10px rgba(29,28,23,0.05)',
          opacity: m.estado==='activo' ? 1 : 0.55 }}>
          <div style={{ position:'relative' }}>
            <Avatar person={m} size={46} ring={m.top} dimmed={m.estado!=='activo'}/>
            <span style={{ position:'absolute', bottom:1, left:3, width:11, height:11, borderRadius:9999,
              border:`2px solid white`, background: m.estado==='activo' ? C.success : C.error }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{m.name.split(' ')[0]} {m.name.split(' ')[1][0]}.</div>
            <div style={{ fontSize:12, color:C.dorado, fontWeight:700 }}>★ {m.sat}</div>
          </div>
          <IconBtn name="close" size={36} iconSize={16}/>
        </div>
      ))}

      <div style={{ textAlign:'center', fontFamily:serif, fontSize:20, color:C.primary, margin:'24px 0 12px' }}>Invitar nuevo mesero</div>
      <div style={{ background:C.surfaceLow, borderRadius:28, padding:'18px 20px', textAlign:'center' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.16em', color:C.muted, marginBottom:12 }}>CÓDIGO DE INVITACIÓN ACTIVO</div>
        <div style={{ background:'white', borderRadius:20, padding:16, display:'inline-block', boxShadow:'0 6px 20px rgba(29,28,23,0.08)' }}>
          <QRBlock size={128} seed={23}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, margin:'12px 0 14px' }}>
          <Icon name="schedule" size={14} color={C.dorado}/>
          <span style={{ fontSize:12.5, fontWeight:700, color:'#8A6508' }}>Expira en 23:47:12</span>
        </div>
        <Btn variant="primary" style={{ width:'100%', fontSize:14, padding:'12px 0' }} iconName="refresh">Regenerar QR</Btn>
        <Btn variant="secondary" style={{ width:'100%', fontSize:14, padding:'12px 0', marginTop:8 }} iconName="share">Enviar por WhatsApp</Btn>
      </div>

      <div style={{ textAlign:'center', margin:'20px 0 10px' }}>
        <div style={{ fontFamily:serif, fontSize:16, color:C.charcoal }}>¿El QR no funcionó?</div>
        <div style={{ fontSize:12.5, color:C.muted, marginTop:2 }}>Envía un código directo por mensaje</div>
      </div>
      <div style={{ display:'flex', gap:9 }}>
        <div style={{ background:'white', borderRadius:16, padding:'12px 14px', fontSize:14, fontWeight:600,
          color:C.charcoal, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}>+52</div>
        <input placeholder="Número de teléfono" style={{ flex:1, background:'white', border:'none', borderRadius:16,
          padding:'12px 15px', fontSize:14, color:C.charcoal, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}/>
      </div>
      <Btn variant="primary" style={{ width:'100%', marginTop:10, fontSize:14 }}>Enviar código SMS</Btn>
      <div style={{ height:110 }}/>
    </div>
  </MobScreen>
);

// ═══ CONFIGURACIÓN (móvil) ═════════════════════════════════
const MobConfig = ({ go }) => {
  const secs = [
    { t:'Mi carta', rows:[['palette','Tema y colores'],['description','Nombre y descripción'],['schedule','Horarios'],['location_on','Ubicación']] },
    { t:'Códigos QR y mesas', rows:[['qr_code_2','Mis códigos QR','16 mesas'],['table_restaurant','Gestionar mesas'],['nfc','NFC tags']] },
    { t:'Equipo', rows:[['group','Miembros del equipo','3 activos','team'],['trending_up','Rendimiento del equipo',null,'performance'],['devices','Dispositivos','5','devices'],['shield_person','Roles y permisos']] },
    { t:'Suscripción y facturación', rows:[['credit_card','Mi plan','Pro · $249/mes'],['receipt','Facturación'],['auto_awesome','Upgrade a Enterprise','PRO']] },
    { t:'Soporte', rows:[['help','Centro de ayuda'],['bug_report','Reportar problema'],['support_agent','Contactar soporte']] },
  ];
  return (
    <MobScreen nav="settings" go={go} label="Admin móvil · Configuración">
      <div style={{ padding:'58px 20px 8px', textAlign:'center', flexShrink:0 }}>
        <div style={{ fontFamily:serif, fontSize:23, color:C.primary }}>Configuración</div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted, marginTop:2 }}>
          Gestiona tu restaurante y herramientas
        </div>
      </div>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'6px 20px 0' }}>
        {/* Perfil */}
        <div style={{ background:'white', borderRadius:26, padding:'16px 18px', boxShadow:'0 4px 14px rgba(29,28,23,0.05)', marginBottom:8 }}>
          <div style={{ display:'flex', gap:13, alignItems:'center' }}>
            <div style={{ width:52, height:52, borderRadius:9999, background:'rgba(184,134,11,0.14)', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="wine_bar" size={23} color={C.dorado}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:15.5, fontWeight:700, color:C.charcoal }}>{RESTAURANT.name}</span>
                <Chip tone="dorado" style={{ fontSize:9, padding:'2px 8px', fontWeight:800, letterSpacing:'0.06em' }}>PLAN PRO</Chip>
              </div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Cocina de origen · Roma Norte, CDMX</div>
            </div>
          </div>
          <button {...pressFx} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 0 0',
            fontSize:13, fontWeight:700, color:C.primary, fontFamily:sans }}>Editar perfil →</button>
        </div>

        {secs.map(sec => (
          <div key={sec.t}>
            <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase',
              color:C.muted, margin:'16px 4px 8px' }}>{sec.t}</div>
            <div style={{ background:'white', borderRadius:24, boxShadow:'0 4px 14px rgba(29,28,23,0.05)', overflow:'hidden' }}>
              {sec.rows.map(([ic,l,badge,to],i) => (
                <div key={l} onClick={to ? () => go(to) : undefined} style={{ display:'flex', alignItems:'center', gap:13,
                  padding:'13px 17px', cursor:'pointer',
                  borderTop: i>0 ? '1px solid rgba(91,74,61,0.06)' : 'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surfaceLow}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{ width:36, height:36, borderRadius:9999, background:C.surfaceLow, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={ic} size={17} color={l.includes('Upgrade') ? C.dorado : C.primary}/>
                  </div>
                  <span style={{ flex:1, fontSize:14, fontWeight:600, color: l.includes('Upgrade') ? '#8A6508' : C.charcoal }}>{l}</span>
                  {badge && <Chip tone={badge==='PRO' ? 'dorado' : 'neutral'} style={{ fontSize:10.5, padding:'3px 10px' }}>{badge}</Chip>}
                  <Icon name="chevron_right" size={17} color={C.outline}/>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ textAlign:'center', fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:C.outline,
          textTransform:'uppercase', margin:'18px 0' }}>
          Carta v1.0.0 · Hecho con <Icon name="favorite" size={10} color={C.primary} fill style={{ verticalAlign:'-1px' }}/> en México
        </div>
        <div style={{ height:96 }}/>
      </div>
    </MobScreen>
  );
};

Object.assign(window, { PinSwapModal, PinPad, DeviceConfigSheet, MobDevices, MobPerformance, MobTeam, MobConfig, MDEVICES });
