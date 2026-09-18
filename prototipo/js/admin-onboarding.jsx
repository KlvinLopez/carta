// ═══════════════════════════════════════════════════════════
// ADMIN · Onboarding — alta del restaurante (7 pasos)
// Cuenta · Legales · Restaurante · Plan · Mesas/QR · Menú PDF · Equipo
// ═══════════════════════════════════════════════════════════
const { useState, useEffect, useRef } = React;

const WIZ_STEPS = [
  { id:'cuenta',      label:'Tu cuenta',        icon:'person' },
  { id:'legales',     label:'Datos legales',    icon:'gavel' },
  { id:'restaurante', label:'Tu restaurante',   icon:'storefront' },
  { id:'plan',        label:'Plan',             icon:'workspace_premium' },
  { id:'mesas',       label:'Mesas y QR',       icon:'qr_code_2' },
  { id:'menu',        label:'Tu menú',          icon:'picture_as_pdf' },
  { id:'equipo',      label:'Tu equipo',        icon:'groups' },
];

const COCINAS = ['Mexicana contemporánea','Oaxaqueña','Mariscos','Asador / Parrilla','Italiana','Japonesa',
  'Cocina de autor','Antojería','Cafetería','Panadería','Vegana / Plant-based','Bar / Coctelería'];

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// ── Rueda de tiempo con scroll-snap ────────────────────────
const TimeWheel = ({ values, value, onChange, pad2=true }) => {
  const ref = useRef(null);
  const ITEM = 36;
  useEffect(() => { if (ref.current) ref.current.scrollTop = Math.max(0, values.indexOf(value)) * ITEM; }, []);
  const onScroll = () => {
    const idx = Math.round(ref.current.scrollTop / ITEM);
    const v = values[Math.max(0, Math.min(values.length-1, idx))];
    if (v !== value) onChange(v);
  };
  return (
    <div ref={ref} onScroll={onScroll} className="hide-scroll" style={{ height:ITEM*3, width:50, overflowY:'auto',
      scrollSnapType:'y mandatory' }}>
      <div style={{ height:ITEM }}/>
      {values.map(v => (
        <div key={v} style={{ height:ITEM, scrollSnapAlign:'center', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:17, fontWeight: v===value?700:500, fontFamily:sans,
          color: v===value ? C.primary : C.outline, transition:'color 150ms' }}>
          {pad2 ? String(v).padStart(2,'0') : v}
        </div>
      ))}
      <div style={{ height:ITEM }}/>
    </div>
  );
};

const HORAS = Array.from({length:24}, (_,i) => i);
const MINS = [0,15,30,45];
const TimePicker = ({ t, onChange }) => (
  <div style={{ position:'relative', display:'flex', alignItems:'center', gap:2, background:C.surfaceLow,
    borderRadius:16, padding:'0 12px' }}>
    <div style={{ position:'absolute', left:8, right:8, top:'50%', height:36, transform:'translateY(-50%)',
      background:'rgba(184,134,11,0.12)', borderRadius:10, pointerEvents:'none' }}/>
    <TimeWheel values={HORAS} value={t.h} onChange={h => onChange({...t, h})}/>
    <span style={{ fontSize:18, fontWeight:700, color:C.primary, zIndex:1 }}>:</span>
    <TimeWheel values={MINS} value={t.m} onChange={m => onChange({...t, m})}/>
  </div>
);

// ── Horarios por día ───────────────────────────────────────
const HorarioPorDia = () => {
  const [dias, setDias] = useState(DIAS.map(d => ({ d, abierto: d!=='Miércoles', open:{h:13,m:0}, close:{h:23,m:0} })));
  const [editIdx, setEditIdx] = useState(null);
  const fmtT = t => `${String(t.h).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`;
  const set = (i, patch) => setDias(arr => arr.map((x,j) => j===i ? {...x, ...patch} : x));
  return (
    <div style={{ background:'white', borderRadius:20, padding:'6px 16px', boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
      {dias.map((day,i) => (
        <div key={day.d} style={{ borderBottom: i<6 ? '1px solid rgba(91,74,61,0.07)' : 'none', padding:'11px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ flex:1, fontSize:14, fontWeight:600, color: day.abierto ? C.charcoal : C.outline }}>{day.d}</span>
            {day.abierto ? (
              <button onClick={() => setEditIdx(editIdx===i ? null : i)} {...pressFx} style={{ display:'flex', alignItems:'center',
                gap:6, background: editIdx===i ? gradVino : C.surfaceLow, border:'none', cursor:'pointer', borderRadius:9999,
                padding:'6px 13px', fontSize:12.5, fontWeight:600, fontFamily:sans, color: editIdx===i ? 'white' : C.charcoal }}>
                <Icon name="schedule" size={14} color={editIdx===i ? 'white' : C.muted}/>
                {fmtT(day.open)} – {fmtT(day.close)}
              </button>
            ) : (
              <span style={{ fontSize:12.5, fontWeight:600, color:C.outline, fontStyle:'italic' }}>Cerrado</span>
            )}
            <Toggle on={day.abierto} onChange={v => { set(i, {abierto:v}); if (!v && editIdx===i) setEditIdx(null); }}/>
          </div>
          {editIdx===i && day.abierto && (
            <div className="sheet-up" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16,
              padding:'12px 0 6px', animationDuration:'200ms' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:C.muted, marginBottom:5 }}>ABRE</div>
                <TimePicker t={day.open} onChange={open => set(i, {open})}/>
              </div>
              <Icon name="arrow_forward" size={16} color={C.outline} style={{ marginTop:16 }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:C.muted, marginBottom:5 }}>CIERRA</div>
                <TimePicker t={day.close} onChange={close => set(i, {close})}/>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Listón diagonal ────────────────────────────────────────
const Ribbon = () => (
  <div style={{ position:'absolute', top:0, right:0, width:104, height:104, overflow:'hidden', pointerEvents:'none', zIndex:2 }}>
    <div style={{ position:'absolute', top:18, right:-30, transform:'rotate(45deg)', background:gradDorado,
      color:'white', fontSize:9, fontWeight:800, letterSpacing:'0.05em', padding:'4px 34px', textAlign:'center',
      boxShadow:'0 4px 10px rgba(184,134,11,0.4)' }}>30 DÍAS GRATIS</div>
  </div>
);

const RestaurantOnboarding = ({ onDone, compact=false }) => {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState('Master Chef');
  const [mesas, setMesas] = useState(12);
  const [cocinas, setCocinas] = useState(['Mexicana contemporánea','Oaxaqueña']);
  const [menuPhase, setMenuPhase] = useState('ask');   // ask | loading | review
  const [loadMsg, setLoadMsg] = useState(0);
  const [sendOpen, setSendOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [captain, setCaptain] = useState({ mode:'none', who:null });
  const [copied, setCopied] = useState(false);
  const [planPhase, setPlanPhase] = useState('pick');   // pick | pay
  const next = () => step < WIZ_STEPS.length-1 ? setStep(step+1) : onDone(captain);
  const atStart = step===0 && planPhase==='pick' && menuPhase==='ask';
  const goBack = () => {
    if (step === 3 && planPhase === 'pay') return setPlanPhase('pick');
    if (step === 5 && menuPhase !== 'ask') return setMenuPhase('ask');
    if (step > 0) setStep(step - 1);
  };
  const toggleCocina = c => setCocinas(s => s.includes(c) ? s.filter(x=>x!==c) : [...s, c]);

  // Carga simulada del menú PDF
  const LOAD_MSGS = ['Extrayendo platillos…','Leyendo precios y descripciones…','Sazonando los datos…','Organizando por categorías…'];
  useEffect(() => {
    if (menuPhase !== 'loading') return;
    const rot = setInterval(() => setLoadMsg(m => (m+1) % LOAD_MSGS.length), 800);
    const done = setTimeout(() => { setMenuPhase('review'); clearInterval(rot); }, 3400);
    return () => { clearInterval(rot); clearTimeout(done); };
  }, [menuPhase]);

  const guardarQR = () => { setSavedToast(true); setTimeout(() => { setSavedToast(false); next(); }, 1100); };

  const stepTitle = { fontFamily:serif, fontSize: compact?26:30, color:C.charcoal, marginBottom:6 };
  const stepSub = { fontSize:14, color:C.muted, marginBottom: compact?18:24 };
  const cardMax = compact ? '100%' : 640;

  return (
    <div style={{ display:'flex', flexDirection: compact ? 'column' : 'row', height:'100%', background:C.surface }}>
      {!compact && (
      <div style={{ width:340, background:gradVino, padding:'36px 32px', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <button onClick={goBack} {...pressFx} style={{ display:'flex', alignItems:'center', gap:9, width:'fit-content',
          background:'rgba(255,255,255,0.12)', border:'none', borderRadius:9999, padding:'9px 16px',
          cursor: atStart ? 'default' : 'pointer', opacity: atStart ? 0.4 : 1, transition:'opacity 200ms' }}>
          <Icon name="arrow_back" size={17} color="white"/>
          <span style={{ fontSize:13, fontWeight:600, color:'white', fontFamily:sans }}>Regresar</span>
        </button>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:4, lineHeight:'20px' }}>
          Tu restaurante en AR,<br/>listo en 10 minutos.
        </div>
        <div style={{ marginTop:36, flex:1 }}>
          {WIZ_STEPS.map((s,i) => {
            const done = i < step, on = i === step;
            return (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:14, marginBottom:4, padding:'9px 12px',
                borderRadius:14, background: on ? 'rgba(255,255,255,0.12)' : 'transparent', transition:'background 250ms' }}>
                <div style={{ width:32, height:32, borderRadius:9999, flexShrink:0,
                  background: done ? C.dorado : on ? 'white' : 'rgba(255,255,255,0.12)',
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all 250ms' }}>
                  {done ? <Icon name="check" size={16} color="white" weight={700}/>
                    : <Icon name={s.icon} size={16} color={on ? C.primary : 'rgba(255,255,255,0.6)'}/>}
                </div>
                <div>
                  <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.45)' }}>Paso {i+1}</div>
                  <div style={{ fontSize:13.5, fontWeight: on?700:500, color: on||done ? 'white' : 'rgba(255,255,255,0.6)' }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:'rgba(255,255,255,0.09)', borderRadius:16, padding:'13px 15px' }}>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.8)', lineHeight:'19px' }}>
            "Subimos la carta un martes; el sábado el ticket promedio ya era 14% más alto."
          </div>
          <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.5)', marginTop:8 }}>— Corazón de Maguey, Oaxaca</div>
        </div>
      </div>
      )}
      {compact && (
        <div style={{ background:gradVino, padding:'52px 22px 16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <button onClick={goBack} {...pressFx} style={{ display:'flex', alignItems:'center', justifyContent:'center',
              width:34, height:34, borderRadius:9999, border:'none', background:'rgba(255,255,255,0.14)',
              cursor: atStart ? 'default' : 'pointer', opacity: atStart ? 0.4 : 1 }}>
              <Icon name="arrow_back" size={17} color="white"/>
            </button>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>Paso {step+1} de {WIZ_STEPS.length}</span>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {WIZ_STEPS.map((s,i) => (
              <div key={s.id} style={{ flex:1, height:5, borderRadius:9999,
                background: i<=step ? C.doradoLight : 'rgba(255,255,255,0.2)', transition:'background 300ms' }}/>
            ))}
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding: compact ? '18px 18px 34px' : '44px 56px', position:'relative' }}>
        {/* 0 · CUENTA */}
        {step === 0 && (
          <div className="screen" style={{ maxWidth:460, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Crea tu cuenta</div>
            <div style={stepSub}>Serás la administradora de tu restaurante en Carta.</div>
            <Field label="Nombre completo" placeholder="Valeria Ruiz" value="Valeria Ruiz"/>
            <Field label="Correo" placeholder="tú@turestaurante.mx" value="valeria@laceiba.mx" type="email"/>
            <Field label="Contraseña" placeholder="Mínimo 8 caracteres" value="••••••••••" type="password"/>
            <div style={{ display:'flex', gap:10, alignItems:'center', background:C.surfaceLow, borderRadius:14,
              padding:'11px 14px', marginBottom:22 }}>
              <Icon name="phone_iphone" size={17} color={C.muted}/>
              <span style={{ fontSize:12.5, color:C.muted }}>Te enviaremos un código por SMS para confirmar.</span>
            </div>
            <Btn variant="primary" style={{ width:'100%' }} onClick={next}>Continuar</Btn>
          </div>
        )}

        {/* 1 · LEGALES */}
        {step === 1 && (
          <div className="screen" style={{ maxWidth:460, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Datos legales</div>
            <div style={stepSub}>Para depositarte las ventas necesitamos tu información fiscal.</div>
            <Field label="Razón social" value="La Ceiba Cocina de Origen S.A. de C.V." placeholder="Como aparece en tu constancia"/>
            <Field label="RFC" value="LCO190412AB3" placeholder="12 o 13 caracteres"/>
            <Field label="Dirección fiscal" value="Córdoba 234, Roma Norte, 06700 CDMX"/>
            <div style={{ display:'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap:12 }}>
              <Field label="CLABE (para SPEI)" value="0121 8000 1234 5648 21"/>
              <Field label="Régimen" value="601 — General"/>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center', background:C.surfaceLow, borderRadius:14,
              padding:'11px 14px', marginBottom:22 }}>
              <Icon name="lock" size={16} color={C.muted}/>
              <span style={{ fontSize:12.5, color:C.muted }}>Cifrado de extremo a extremo. Solo el SAT y tú.</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn variant="primary" style={{ flex:1 }} onClick={next}>Continuar</Btn>
            </div>
          </div>
        )}

        {/* 2 · RESTAURANTE */}
        {step === 2 && (
          <div className="screen" style={{ maxWidth:cardMax, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Tu restaurante</div>
            <div style={stepSub}>Así te verán los comensales al escanear el QR.</div>
            <div style={{ display:'flex', flexDirection: compact ? 'column' : 'row', gap:16, marginBottom:18 }}>
              <image-slot id="onb-rest-photo" shape="rounded" radius="20" placeholder="Foto de portada"
                style={{ width: compact ? '100%' : '200px', height:'132px', flexShrink:0 }}></image-slot>
              <div style={{ flex:1 }}>
                <Field label="Nombre del restaurante" value="La Ceiba"/>
                <Field label="Lema" value="Cocina de origen" style={{ marginBottom:0 }}/>
              </div>
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:9 }}>
              Tipo de cocina <span style={{ color:C.outline, fontWeight:500 }}>· elige todas las que apliquen</span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:22 }}>
              {COCINAS.map(c => {
                const on = cocinas.includes(c);
                return (
                  <button key={c} onClick={() => toggleCocina(c)} {...pressFx} style={{ display:'flex', alignItems:'center',
                    gap:6, border:'none', cursor:'pointer', borderRadius:9999, padding:'9px 15px', fontSize:13, fontWeight:600,
                    fontFamily:sans, background: on ? gradVino : C.surfaceLow, color: on ? 'white' : C.charcoal,
                    boxShadow: on ? '0 6px 14px rgba(79,23,40,0.2)' : 'none', transition:'all 180ms' }}>
                    {on && <Icon name="check" size={15} color="white"/>}{c}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:9 }}>Horarios de atención</div>
            <HorarioPorDia/>
            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <Btn variant="primary" style={{ flex:1 }} onClick={next}>Continuar</Btn>
            </div>
          </div>
        )}

        {/* 3 · PLAN */}
        {step === 3 && planPhase === 'pick' && (
          <div className="screen" style={{ maxWidth:cardMax, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Elige tu plan</div>
            <div style={stepSub}>Sin permanencia. La comisión de 1.8% por venta ya está incluida en todos.</div>
            <div style={{ display:'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap:12 }}>
              {[
                { n:'Chef', p:'Gratis', ribbon:false, d:'Empieza sin costo', f:['Hasta 10 mesas','3 meseros','Menú AR + pagos','Con anuncios'] },
                { n:'Master Chef', p:'$799', per:true, ribbon:true, d:'Para servicio completo', f:['Mesas ilimitadas','20 meseros','Sin anuncios','Sesiones grupales','Analytics completo'] },
              ].map(pl => {
                const on = plan === pl.n;
                return (
                  <div key={pl.n} onClick={() => setPlan(pl.n)} style={{ background: on ? gradVino : 'white',
                    borderRadius:22, padding:'20px 17px 17px', cursor:'pointer', position:'relative', overflow:'hidden',
                    boxShadow: on ? '0 20px 44px rgba(79,23,40,0.32)' : '0 4px 16px rgba(79,23,40,0.06)',
                    transform: on && !compact ? 'translateY(-4px)' : 'none', transition:'all 250ms cubic-bezier(0.22,1.2,0.36,1)' }}>
                    {pl.ribbon && <Ribbon/>}
                    <div style={{ fontSize:15, fontWeight:700, color: on ? 'white' : C.charcoal }}>{pl.n}</div>
                    <div style={{ fontFamily:serif, fontSize:27, color: on ? 'white' : C.primary, margin:'6px 0 2px', lineHeight:1.1 }}>
                      {pl.p}{pl.per && <span style={{ fontSize:12, fontFamily:sans, opacity:0.7 }}> /mes</span>}
                    </div>
                    <div style={{ fontSize:12, color: on ? 'rgba(255,255,255,0.7)' : C.muted, marginBottom:12 }}>{pl.d}</div>
                    {pl.f.map(f => (
                      <div key={f} style={{ display:'flex', gap:6, alignItems:'center', padding:'2.5px 0' }}>
                        <Icon name="check" size={13} color={on ? C.doradoLight : C.dorado}/>
                        <span style={{ fontSize:12, color: on ? 'rgba(255,255,255,0.85)' : C.muted }}>{f}</span>
                      </div>
                    ))}
                    <button onClick={e => { e.stopPropagation(); setPlan(pl.n); pl.n==='Master Chef' ? setPlanPhase('pay') : next(); }} {...pressFx} style={{ width:'100%',
                      marginTop:14, border:'none', cursor:'pointer', borderRadius:9999, padding:'11px 0', fontSize:13.5,
                      fontWeight:700, fontFamily:sans, transition:'transform 130ms',
                      background: on ? 'white' : C.surfaceLow, color: on ? C.primary : C.charcoal }}>
                      Empezar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3b · PAGO DEL PLAN */}
        {step === 3 && planPhase === 'pay' && (
          <div className="screen" style={{ maxWidth:460, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Método de pago</div>
            <div style={stepSub}>Hoy no se cobra nada — tu prueba dura 30 días.</div>
            <div style={{ background:gradVino, borderRadius:22, padding:'16px 20px', marginBottom:16,
              display:'flex', alignItems:'center', gap:12, boxShadow:'0 14px 32px rgba(79,23,40,0.25)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'white' }}>Plan {plan}</div>
                <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.7)' }}>Primer cargo: 8 de agosto de 2026</div>
              </div>
              <div style={{ fontFamily:serif, fontSize:24, color:'white' }}>$799<span style={{ fontSize:12, fontFamily:sans, opacity:0.7 }}>/mes</span></div>
            </div>
            <Field label="Titular de la tarjeta" value="Valeria Ruiz"/>
            <div style={{ background:'white', borderRadius:18, padding:'14px 16px', display:'flex', gap:12,
              alignItems:'center', marginBottom:16, boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
              <Icon name="credit_card" size={20} color={C.primary}/>
              <input placeholder="Número de tarjeta" defaultValue="4242 4242 4242 4242" style={{ flex:1, minWidth:0, border:'none', fontSize:14, color:C.charcoal, background:'transparent' }}/>
              <input placeholder="MM/AA" defaultValue="04/28" style={{ width:52, border:'none', fontSize:14, color:C.charcoal, background:'transparent' }}/>
              <input placeholder="CVC" defaultValue="123" style={{ width:36, border:'none', fontSize:14, color:C.charcoal, background:'transparent' }}/>
            </div>
            <div style={{ display:'flex', gap:9, alignItems:'center', background:C.surfaceLow, borderRadius:14,
              padding:'11px 14px', marginBottom:18 }}>
              <Icon name="lock" size={16} color={C.muted}/>
              <span style={{ fontSize:12, color:C.muted }}>Cancela cuando quieras desde Configuración. Sin permanencia.</span>
            </div>
            <Btn variant="dorado" style={{ width:'100%' }} onClick={() => { setPlanPhase('pick'); next(); }}>
              Iniciar 30 días gratis
            </Btn>
          </div>
        )}

        {/* 4 · MESAS Y QR */}
        {step === 4 && (
          <div className="screen" style={{ maxWidth:560, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Configura tus mesas</div>
            <div style={stepSub}>Generamos un QR único por mesa. Guárdalos, imprímelos y pégalos — eso es todo.</div>
            <div style={{ display:'flex', alignItems:'center', gap:16, background:'white', borderRadius:20,
              padding:'16px 20px', boxShadow:'0 4px 16px rgba(79,23,40,0.06)', marginBottom:20 }}>
              <span style={{ fontSize:14.5, fontWeight:600, color:C.charcoal, flex:1 }}>¿Cuántas mesas tienes?</span>
              <IconBtn name="remove" onClick={() => setMesas(m => Math.max(1, m-1))}/>
              <span style={{ fontFamily:serif, fontSize:30, color:C.primary, width:52, textAlign:'center' }}>{mesas}</span>
              <IconBtn name="add" onClick={() => setMesas(m => Math.min(40, m+1))}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap:10, marginBottom:22 }}>
              {Array.from({length: Math.min(8, mesas)}).map((_,i) => (
                <div key={i} className="pop-in" style={{ background:'white', borderRadius:16, padding:'12px 10px 12px',
                  textAlign:'center', boxShadow:'0 2px 10px rgba(29,28,23,0.06)', animationDelay:`${i*40}ms` }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}><QRBlock size={62} seed={i+3}/></div>
                  <div style={{ fontSize:12.5, fontWeight:700, color:C.primary }}>Mesa {i+1}</div>
                </div>
              ))}
              {mesas > 8 && (
                <div style={{ gridColumn: compact ? 'span 2' : 'span 4', textAlign:'center', fontSize:12.5, color:C.muted }}>
                  … y {mesas-8} más
                </div>
              )}
            </div>
            <Btn variant="primary" style={{ width:'100%' }} iconName="send" onClick={() => setSendOpen(true)}>Enviar mis QRs</Btn>
          </div>
        )}

        {/* 5 · MENÚ PDF */}
        {step === 5 && menuPhase === 'ask' && (
          <div className="screen" style={{ maxWidth:520, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Sube tu menú</div>
            <div style={stepSub}>¿Ya tienes tu menú en PDF? Lo leemos y creamos tus platillos automáticamente.</div>
            <div onClick={() => setMenuPhase('loading')} style={{ border:`2px dashed ${C.dorado}80`, borderRadius:24,
              padding:'40px 24px', textAlign:'center', cursor:'pointer', background:'rgba(184,134,11,0.05)',
              transition:'background 180ms' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(184,134,11,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(184,134,11,0.05)'}>
              <div style={{ width:64, height:64, borderRadius:9999, background:'white', margin:'0 auto 14px',
                display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 18px rgba(29,28,23,0.08)' }}>
                <Icon name="upload_file" size={30} color={C.primary}/>
              </div>
              <div style={{ fontSize:15.5, fontWeight:700, color:C.charcoal }}>Arrastra tu menú en PDF aquí</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>o toca para buscar el archivo · PDF, JPG o PNG</div>
            </div>
            <button onClick={next} {...pressFx} style={{ display:'block', width:'100%', background:'none', border:'none',
              cursor:'pointer', marginTop:18, fontSize:13.5, fontWeight:700, color:C.muted, fontFamily:sans }}>
              Omitir — lo hago después
            </button>
          </div>
        )}
        {step === 5 && menuPhase === 'loading' && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', padding:'0 40px', textAlign:'center' }}>
            <div style={{ position:'relative', width:130, height:130 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:9999, background:'rgba(184,134,11,0.12)',
                animation:'ringPulse 1.8s ease-out infinite' }}/>
              <div style={{ position:'absolute', inset:16, borderRadius:9999, background:C.surfaceLow,
                display:'flex', alignItems:'center', justifyContent:'center', animation:'floaty 3s ease-in-out infinite' }}>
                <Icon name="restaurant_menu" size={54} color={C.primary}/>
              </div>
            </div>
            <div style={{ fontFamily:serif, fontSize:26, color:C.charcoal, marginTop:28 }}>Leyendo tu menú</div>
            <div key={loadMsg} className="pop-in" style={{ fontSize:14.5, color:C.dorado, fontWeight:600, marginTop:8, animationDuration:'300ms' }}>
              {LOAD_MSGS[loadMsg]}
            </div>
            <div style={{ width:'100%', maxWidth:280, marginTop:22 }}>
              <div style={{ height:8, borderRadius:9999, background:C.surfaceHigh, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:9999, background:gradDorado, animation:'cookFill 3.4s ease-in-out forwards' }}/>
              </div>
            </div>
          </div>
        )}
        {step === 5 && menuPhase === 'review' && (
          <div className="screen" style={{ maxWidth:cardMax, animationDuration:'220ms', height:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <Icon name="check_circle" size={24} color={C.success} fill/>
              <div style={{ fontFamily:serif, fontSize: compact?24:28, color:C.charcoal }}>Detectamos {MENU_SEED.length} platillos</div>
            </div>
            <div style={stepSub}>Revisa y ajusta lo que quieras. Las fotos las agregas después para generar el 3D.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {MENU_SEED.map(d => (
                <div key={d.id} style={{ background:'white', borderRadius:18, padding:'13px 16px',
                  boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <input defaultValue={d.name} style={{ flex:1, border:'none', background:'transparent', fontFamily:serif,
                      fontSize:16, color:C.primary, fontWeight:400 }}/>
                    <div style={{ display:'flex', alignItems:'center', background:C.surfaceLow, borderRadius:10, padding:'5px 10px' }}>
                      <span style={{ fontSize:13, color:C.muted }}>$</span>
                      <input defaultValue={d.price} style={{ width:42, border:'none', background:'transparent', textAlign:'right',
                        fontSize:14, fontWeight:700, color:C.charcoal, fontFamily:sans }}/>
                    </div>
                    <span style={{ background:'rgba(184,134,11,0.13)', color:'#8A6508', borderRadius:8, padding:'4px 9px',
                      fontSize:10.5, fontWeight:700 }}>{d.cat}</span>
                  </div>
                  <input defaultValue={d.desc} style={{ width:'100%', border:'none', background:'transparent',
                    fontSize:12.5, color:C.muted, fontFamily:sans }}/>
                  <Complementos cat={d.cat} collapsible/>
                </div>
              ))}
            </div>
            <Btn variant="primary" style={{ width:'100%' }} iconName="arrow_forward" onClick={next}>Confirmar menú y continuar</Btn>
          </div>
        )}

        {/* 6 · EQUIPO */}
        {step === 6 && (
          <div className="screen" style={{ maxWidth:cardMax, animationDuration:'220ms', height:'auto' }}>
            <div style={stepTitle}>Invita a tu equipo</div>
            <div style={stepSub}>Cada mesero escanea el QR desde su teléfono y crea su propio perfil.</div>
            <div style={{ display:'flex', flexDirection: compact ? 'column' : 'row', gap:16, marginBottom:22 }}>
              <div style={{ background:'white', borderRadius:22, padding:'18px', textAlign:'center', flexShrink:0,
                boxShadow:'0 4px 16px rgba(79,23,40,0.07)' }}>
                <div style={{ background:C.surfaceLow, borderRadius:16, padding:14, display:'inline-block' }}>
                  <QRBlock size={compact?120:132} seed={23}/>
                </div>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, justifyContent:'center' }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:C.muted, marginBottom:6 }}>ENLACE DE INVITACIÓN</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'white', borderRadius:14,
                    padding:'11px 14px', boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}>
                    <Icon name="link" size={16} color={C.muted}/>
                    <span style={{ flex:1, fontSize:13, color:C.charcoal, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>carta.mx/unirse/la-ceiba</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:C.muted, marginBottom:6 }}>CÓDIGO</div>
                  <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }} {...pressFx}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%', background:'white', border:'none',
                    cursor:'pointer', borderRadius:14, padding:'11px 14px', boxShadow:'0 2px 8px rgba(29,28,23,0.05)', transition:'transform 130ms' }}>
                    <span style={{ flex:1, textAlign:'left', fontFamily:'ui-monospace, monospace', fontSize:18, fontWeight:700,
                      letterSpacing:'0.18em', color:C.primary }}>CEIBA-7Q</span>
                    <Icon name={copied ? 'check' : 'content_copy'} size={17} color={copied ? C.success : C.dorado}/>
                    <span style={{ fontSize:12.5, fontWeight:700, color: copied ? C.success : C.dorado }}>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:11, alignItems:'flex-start', background:'rgba(79,23,40,0.06)',
              borderRadius:20, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ width:38, height:38, borderRadius:9999, background:'white', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="admin_panel_settings" size={18} color={C.primary}/>
              </div>
              <span style={{ fontSize:12.5, color:C.muted, lineHeight:'19px' }}>
                De forma predeterminada, <b style={{ color:C.primary }}>el Administrador también actúa como Capitán</b> del
                restaurante. Más adelante podrás asignar este rol a otro miembro del equipo desde Configuración.
              </span>
            </div>
            <div style={{ display:'flex', gap:9, background:'rgba(184,134,11,0.1)', borderRadius:14,
              padding:'11px 14px', marginBottom:16 }}>
              <Icon name="pin" size={16} color={C.dorado} style={{ marginTop:1, flexShrink:0 }}/>
              <span style={{ fontSize:12, color:'#6B5410', lineHeight:'18px' }}>
                Cada mesero crea su <b>PIN de 4 dígitos</b> al unirse — con él entra a las tablets compartidas del restaurante.
              </span>
            </div>
            <Btn variant="dorado" style={{ width:'100%', fontSize:16 }} iconName="celebration" onClick={() => onDone(captain)}>
              Abrir mi restaurante en Carta
            </Btn>
          </div>
        )}

        {/* Toast guardado */}
        {savedToast && (
          <div className="pop-in" style={{ position:'absolute', left:'50%', bottom:30, transform:'translateX(-50%)', zIndex:60,
            background:C.charcoal, borderRadius:14, padding:'12px 20px', display:'flex', alignItems:'center', gap:10,
            boxShadow:'0 16px 40px rgba(0,0,0,0.3)', whiteSpace:'nowrap' }}>
            <Icon name="check_circle" size={18} color={C.doradoLight} fill/>
            <span style={{ fontSize:13.5, color:'white', fontWeight:600 }}>QRs enviados</span>
          </div>
        )}

        {/* Sheet enviar */}
        {sendOpen && (
          <div style={{ position:'absolute', inset:0, zIndex:80, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            <div onClick={() => setSendOpen(false)} style={{ position:'absolute', inset:0,
              background:'rgba(29,28,23,0.4)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
            <div className="sheet-up" style={{ position:'relative', width:'100%', maxWidth:440, background:C.surface,
              borderRadius:'28px 28px 0 0', padding:'0 24px 30px', boxShadow:'0px -24px 60px rgba(29,28,23,0.3)' }}>
              <Grip/>
              <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginBottom:2 }}>Enviar los QRs</div>
              <div style={{ fontSize:12.5, color:C.muted, marginBottom:14 }}>Compártelos con tu equipo o tu imprenta.</div>
              {[['mail','Por correo','valeria@laceiba.mx'],['sms','Por WhatsApp / SMS','55 5264 1188'],['print','A la imprenta','Formato listo para imprimir']].map(([ic,t,d]) => (
                <div key={t} onClick={() => { setSendOpen(false); guardarQR(); }} {...pressFx} style={{ display:'flex', alignItems:'center',
                  gap:13, background:'white', borderRadius:18, padding:'12px 15px', marginBottom:9, cursor:'pointer',
                  boxShadow:'0 2px 8px rgba(29,28,23,0.04)', transition:'transform 130ms' }}>
                  <div style={{ width:42, height:42, borderRadius:13, background:C.surfaceLow, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={ic} size={20} color={C.primary}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{t}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{d}</div>
                  </div>
                  <Icon name="chevron_right" size={19} color={C.outline}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { RestaurantOnboarding });
