// ═══════════════════════════════════════════════════════════
// COMENSAL · Onboarding — P17a QR · P18a/b/c (v2 según refs)
// ═══════════════════════════════════════════════════════════
const { useState, useEffect } = React;

// ── Header de pasos compartido ─────────────────────────────
const StepHeader = ({ step, onBack }) => (
  <div style={{ padding:'62px 26px 4px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      {onBack && <IconBtn name="arrow_back" size={34} iconSize={17} onClick={onBack}/>}
      <div style={{ display:'flex', gap:6 }}>
        {[1,2,3].map(s => <div key={s} style={{ width:9, height:9, borderRadius:9999,
          background: s < step ? C.primary : s === step ? C.dorado : C.surfaceHighest, transition:'all 300ms' }}/>)}
      </div>
    </div>
    <span style={{ fontFamily:serif, fontStyle:'italic', fontSize:15, color:C.charcoal }}>Paso {step} de 3</span>
  </div>
);

// ── P17a · Entrada por QR de mesa ──────────────────────────
const LoginQR = ({ go, onDone }) => {
  const [found, setFound] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFound(true), 1400); return () => clearTimeout(t); }, []);
  // Como pantalla inicial: al identificar la mesa avanza solo al acceso
  useEffect(() => {
    if (found && onDone) { const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }
  }, [found]);
  return (
    <div className="screen" style={{ position:'relative', background:'#0D0A09', overflow:'hidden' }}>
      <img src={IMGS.restaurante} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%',
        objectFit:'cover', filter:'brightness(0.5) saturate(1.1)' }} onError={e=>e.target.style.display='none'}/>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(13,10,9,0.82) 100%)' }}/>

      <div style={{ position:'absolute', top:64, left:0, right:0, textAlign:'center', zIndex:10 }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontSize:30, color:'white' }}>Carta</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)', marginTop:2 }}>Apunta al QR de tu mesa</div>
      </div>

      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-54%)', width:230, height:230, zIndex:10 }}>
        {[{t:0,l:0,bt:3,bl:3},{t:0,r:0,bt:3,br:3},{b:0,l:0,bb:3,bl:3},{b:0,r:0,bb:3,br:3}].map((p,i) => (
          <div key={i} style={{ position:'absolute', width:44, height:44,
            top:p.t, left:p.l, right:p.r, bottom:p.b,
            borderTop: p.bt ? `3px solid ${found ? C.doradoLight : 'white'}` : 'none',
            borderLeft: p.bl ? `3px solid ${found ? C.doradoLight : 'white'}` : 'none',
            borderRight: p.br ? `3px solid ${found ? C.doradoLight : 'white'}` : 'none',
            borderBottom: p.bb ? `3px solid ${found ? C.doradoLight : 'white'}` : 'none',
            borderRadius:14, transition:'border-color 400ms',
            animation: found ? 'none' : 'reticlePulse 1.6s ease-in-out infinite' }}/>
        ))}
        <div style={{ position:'absolute', inset:44, display:'flex', alignItems:'center', justifyContent:'center',
          opacity: found ? 1 : 0.35, transition:'opacity 400ms' }}>
          <div style={{ background:'rgba(255,255,255,0.92)', borderRadius:16, padding:14 }}>
            <QRBlock size={104} seed={7}/>
          </div>
        </div>
      </div>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 24px 44px', zIndex:20 }}>
        {found ? (
          <div className="sheet-up" style={{ background:'rgba(254,249,241,0.94)', backdropFilter:'blur(24px)',
            WebkitBackdropFilter:'blur(24px)', borderRadius:32, padding:'22px 24px 24px',
            boxShadow:'0px -20px 40px rgba(29,28,23,0.25)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:gradVino,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="restaurant" size={24} color="white"/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:serif, fontSize:21, color:C.primary }}>{RESTAURANT.name}</div>
                <div style={{ fontSize:13, color:C.muted }}>{RESTAURANT.tagline} · Mesa {RESTAURANT.mesa}</div>
              </div>
              <Chip tone="success"><Icon name="check_circle" size={14} color="#15803D" fill/> QR válido</Chip>
            </div>
            <Btn variant="primary" style={{ width:'100%', fontSize:17 }} onClick={() => onDone ? onDone() : go('p18a')}>
              {onDone ? 'Continuar' : 'Ver menú'}</Btn>
            <div style={{ textAlign:'center', fontSize:12.5, color:C.muted, marginTop:12 }}>
              Sin descarga. Sin registro. Inmediato.
            </div>
          </div>
        ) : (
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.75)', fontSize:14,
            animation:'pulseSoft 1.6s ease-in-out infinite' }}>Buscando el código de tu mesa…</div>
        )}
      </div>
    </div>
  );
};

// ── P18a · Paso 1 · Bienvenida editorial ───────────────────
const OnboardingBienvenida = ({ go }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden' }}>
    <StepHeader step={1}/>
    <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'14px 28px 0' }}>
      <div className="pop-in" style={{ borderRadius:32, overflow:'hidden', boxShadow:'0 20px 48px rgba(29,28,23,0.16)' }}>
        <Photo src={MENU_SEED[7].photo} emoji="🍰" radius={0} emojiSize={72} style={{ width:'100%', height:250 }}/>
      </div>
      <div style={{ textAlign:'center', marginTop:26 }}>
        <div style={{ fontFamily:serif, fontSize:36, lineHeight:'42px', color:C.charcoal, letterSpacing:'-0.02em' }}>
          Tu menú, <span style={{ fontStyle:'italic' }}>Tu Carta.</span>
        </div>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontSize:16, color:C.primary, marginTop:12 }}>
          Elevando el arte de la mesa
        </div>
        <div style={{ fontSize:14.5, lineHeight:'23px', color:C.muted, marginTop:12, padding:'0 6px' }}>
          <span style={{ fontFamily:serif, fontStyle:'italic', color:C.primary }}>Carta</span> aprende
          tus gustos para mostrarte lo que más vas a disfrutar — en 3D, sobre tu mesa.
        </div>
      </div>
    </div>
    <div style={{ padding:'12px 26px 30px' }}>
      <Btn variant="primary" style={{ width:'100%', fontSize:17 }} onClick={() => go('p18b')}>Empezar&nbsp;&nbsp;→</Btn>
      <button onClick={() => go('menu')} style={{ display:'block', width:'100%', background:'none', border:'none',
        cursor:'pointer', marginTop:14, fontSize:11, fontWeight:700, letterSpacing:'0.16em',
        textTransform:'uppercase', color:C.muted, fontFamily:sans }}>
        Explorar sin cuenta
      </button>
    </div>
  </div>
);

// ── P18b · Paso 2 · Preferencias ───────────────────────────
const secLabelOb = { fontSize:11, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:C.muted, marginBottom:12 };

const OnboardingPreferencias = ({ go }) => {
  const GRANULAR = ['🥩 Sin carnes rojas','🍗 Sin pollo','🐟 Sin pescado','🦐 Sin mariscos','🥛 Sin lácteos','🥚 Sin huevo','🌾 Sin gluten','🥜 Sin nueces','✡️ Kosher','☪️ Halal'];
  const DIETAS = [
    { id:'Vegetariano', e:'🥦', d:'Sin carnes ni pescados', set:['🥩 Sin carnes rojas','🍗 Sin pollo','🐟 Sin pescado','🦐 Sin mariscos'] },
    { id:'Vegano', e:'🌱', d:'Nada de origen animal', set:['🥩 Sin carnes rojas','🍗 Sin pollo','🐟 Sin pescado','🦐 Sin mariscos','🥛 Sin lácteos','🥚 Sin huevo'] },
    { id:'Pescetariano', e:'🐟', d:'Pescado sí, carnes no', set:['🥩 Sin carnes rojas','🍗 Sin pollo'] },
  ];
  const [sel, setSel] = useState([]);
  const [dietaSel, setDietaSel] = useState(null);
  const [preDieta, setPreDieta] = useState([]);
  const [spice, setSpice] = useState(2);
  const [favs, setFavs] = useState(['🧀 Queso','🍋 Cítricos']);
  const ingredientes = ['🍄 Hongos','🧀 Queso','🥑 Aguacate','🍋 Cítricos','🌿 Hierbas frescas','🍫 Chocolate','🌶️ Chiles','🐟 Pescado','🥩 Carnes rojas'];
  const ALL_DIET_ITEMS = [...new Set(DIETAS.flatMap(d => d.set))];
  // Selección rápida excluyente: al activar guardo el estado previo; al desactivar lo restauro completo.
  const toggleDieta = dt => {
    const isOn = dietaSel === dt.id;
    const base = dietaSel === null ? sel : preDieta;
    if (dietaSel === null) setPreDieta(sel);
    if (isOn) { setDietaSel(null); setSel(preDieta); }
    else { setDietaSel(dt.id); setSel([...new Set([...base, ...dt.set])]); }
  };
  const toggleSel = o => { setDietaSel(null); setSel(s => s.includes(o) ? s.filter(x=>x!==o) : [...s, o]); };
  const toggleFav = o => setFavs(s => s.includes(o) ? s.filter(x=>x!==o) : [...s, o]);
  const niveles = [['🥬','Nada'],['🌶️','Suave'],['🌶️','Medio'],['🌶️','Picoso'],['🔥','Extremo']];

  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <StepHeader step={2} onBack={() => go('p18a')}/>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'10px 28px 0' }}>
        <div style={{ fontFamily:serif, fontSize:32, lineHeight:'39px', color:C.primary, letterSpacing:'-0.015em' }}>
          ¿Cómo te gusta<br/>comer?
        </div>
        <div style={{ fontSize:14.5, color:C.muted, margin:'8px 0 22px' }}>
          Elige un estilo y ajusta el detalle. Lo puedes cambiar cuando quieras.
        </div>

        <div style={secLabelOb}>Selección rápida <span style={{ color:C.outline, fontWeight:600 }}>(Opcional)</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:20 }}>
          {DIETAS.map(dt => {
            const on = dietaSel === dt.id;
            return (
              <button key={dt.id} onClick={() => toggleDieta(dt)} {...pressFx} style={{ border:'none', cursor:'pointer',
                borderRadius:20, padding:'14px 8px 12px', fontFamily:sans, textAlign:'center',
                background: on ? gradVino : 'white',
                boxShadow: on ? '0 10px 24px rgba(79,23,40,0.28)' : '0 2px 10px rgba(29,28,23,0.05)',
                transition:'all 220ms cubic-bezier(0.22,1.4,0.36,1)' }}>
                <div style={{ fontSize:24 }}>{dt.e}</div>
                <div style={{ fontSize:12.5, fontWeight:700, color: on ? 'white' : C.charcoal, margin:'5px 0 2px' }}>{dt.id}</div>
                <div style={{ fontSize:9.5, lineHeight:'13px', color: on ? 'rgba(255,255,255,0.7)' : C.muted }}>{dt.d}</div>
              </button>
            );
          })}
        </div>

        <div style={secLabelOb}>Ajusta el detalle <span style={{ color:C.outline, fontWeight:600 }}>(Opcional)</span></div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:9, marginBottom:28 }}>
          {GRANULAR.map(o => {
            const on = sel.includes(o);
            return (
              <button key={o} onClick={() => toggleSel(o)} {...pressFx} style={{ border:'none', cursor:'pointer',
                borderRadius:9999, padding:'10px 17px', fontSize:13.5, fontWeight:600, fontFamily:sans,
                background: on ? gradVino : C.surfaceLow, color: on ? 'white' : C.charcoal,
                boxShadow: on ? '0 6px 16px rgba(79,23,40,0.25)' : 'none',
                transition:'all 200ms cubic-bezier(0.22,1.4,0.36,1)' }}>{o}</button>
            );
          })}
        </div>

        <div style={secLabelOb}>Nivel de picante</div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:28, padding:'0 2px' }}>
          {niveles.map(([e,l],i) => {
            const on = spice === i;
            return (
              <button key={l} onClick={() => setSpice(i)} {...pressFx} style={{ background:'none', border:'none',
                cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:0 }}>
                <div style={{ width:54, height:54, borderRadius:9999, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize: i===4 ? 24 : 22, background: on ? 'white' : C.surfaceLow,
                  outline: on ? `2.5px solid ${C.dorado}` : 'none', outlineOffset:2,
                  boxShadow: on ? '0 8px 20px rgba(184,134,11,0.25)' : 'none',
                  opacity: on ? 1 : 0.65, transform: on ? 'scale(1.08)' : 'scale(1)',
                  transition:'all 220ms cubic-bezier(0.22,1.4,0.36,1)' }}>
                  {i===3 ? '🌶️🌶️' : e}
                </div>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
                  color: on ? '#8A6508' : C.outline }}>{l}</span>
              </button>
            );
          })}
        </div>

        <div style={secLabelOb}>Tus ingredientes favoritos <span style={{ color:C.outline, fontWeight:600 }}>(Opcional)</span></div>
        <div style={{ background:C.surfaceLow, borderRadius:18, padding:'12px 16px', display:'flex',
          alignItems:'center', gap:10, marginBottom:14 }}>
          <Icon name="search" size={19} color={C.outline}/>
          <span style={{ fontSize:14, color:C.outline }}>Buscar ingrediente…</span>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:9 }}>
          {ingredientes.map(o => {
            const on = favs.includes(o);
            return (
              <button key={o} onClick={() => toggleFav(o)} {...pressFx} style={{ border:'none', cursor:'pointer',
                borderRadius:9999, padding:'10px 17px', fontSize:13.5, fontWeight:600, fontFamily:sans,
                background: on ? gradDorado : C.surfaceLow, color: on ? 'white' : C.charcoal,
                boxShadow: on ? '0 6px 16px rgba(184,134,11,0.3)' : 'none',
                transition:'all 200ms cubic-bezier(0.22,1.4,0.36,1)' }}>{o}</button>
            );
          })}
        </div>
        <div style={{ height:24 }}/>
      </div>
      <div style={{ padding:'12px 26px 30px' }}>
        <Btn variant="primary" style={{ width:'100%', fontSize:17 }} onClick={() => go('p18c')}>Siguiente&nbsp;&nbsp;→</Btn>
      </div>
    </div>
  );
};

// ── P18c · Paso 3 · Carta+ ─────────────────────────────────
const OnboardingPremium = ({ go }) => (
  <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden' }}>
    <StepHeader step={3} onBack={() => go('p18b')}/>
    <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'12px 28px 0' }}>
      {/* Hero con badge glass */}
      <div className="pop-in" style={{ position:'relative', borderRadius:30, overflow:'hidden',
        boxShadow:'0 20px 48px rgba(29,28,23,0.18)' }}>
        <Photo src={IMGS.finedining} emoji="🥂" radius={0} emojiSize={60} style={{ width:'100%', height:170 }}/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(13,10,9,0.05), rgba(13,10,9,0.3))' }}/>
        <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
          display:'flex', alignItems:'center', gap:11, background:'rgba(254,249,241,0.82)',
          backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderRadius:9999, padding:'10px 22px 10px 10px' }}>
          <div style={{ width:38, height:38, borderRadius:9999, background:gradVino,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="star" size={18} color="white" fill/>
          </div>
          <div>
            <div style={{ fontFamily:serif, fontStyle:'italic', fontSize:18, color:C.primary, lineHeight:1 }}>Carta+</div>
            <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.16em', color:C.muted, marginTop:2 }}>PLAN PREMIUM</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign:'center', margin:'22px 0 20px' }}>
        <div style={{ fontFamily:serif, fontSize:33, lineHeight:'39px', color:C.primary, letterSpacing:'-0.015em' }}>
          ¿Quieres la<br/>experiencia completa?
        </div>
        <div style={{ display:'inline-block', background:C.surfaceLow, borderRadius:9999, padding:'8px 20px',
          fontSize:15.5, fontWeight:700, color:C.charcoal, marginTop:14 }}>$1 MXN / día</div>
        <div style={{ fontSize:12, color:C.muted, marginTop:7 }}>(Cargo mensual de $29 MXN · 1 mes gratis)</div>
      </div>

      <div style={{ background:C.surfaceLow, borderRadius:26, padding:'18px 18px 8px' }}>
        {[
          { icon:'auto_awesome', t:'IA personalizada',          d:'Experiencia adaptada a tus gustos.' },
          { icon:'restaurant',   t:'Eventos exclusivos',        d:'Catas y eventos especiales para miembros.' },
          { icon:'view_in_ar',   t:'Realidad Aumentada',        d:'Tus platillos en 3D sobre la mesa, siempre.' },
          { icon:'calendar_month', t:'Reservaciones prioritarias', d:'Asegura tu lugar en horas pico.' },
          { icon:'favorite',     t:'Carta Charity',             d:'Parte de tu suscripción dona comidas.' },
        ].map((b,i) => (
          <div key={b.t} className="pop-in" style={{ display:'flex', gap:14, alignItems:'flex-start',
            marginBottom:16, animationDelay:`${i*60}ms` }}>
            <div style={{ width:42, height:42, borderRadius:9999, background:'white', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(29,28,23,0.06)' }}>
              <Icon name={b.icon} size={19} color={C.primary}/>
            </div>
            <div>
              <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{b.t}</div>
              <div style={{ fontSize:12.5, color:C.muted, marginTop:1, lineHeight:'18px' }}>{b.d}</div>
            </div>
          </div>
        ))}
        <div style={{ textAlign:'center', fontFamily:serif, fontStyle:'italic', fontSize:13, color:C.muted, paddingBottom:10 }}>y más…</div>
      </div>
      <div style={{ height:18 }}/>
    </div>
    <div style={{ padding:'10px 26px 30px', display:'flex', flexDirection:'column', gap:10 }}>
      <Btn variant="dorado" style={{ width:'100%', fontSize:16 }} onClick={() => go('menu')}>Probar 1 mes gratis</Btn>
      <Btn variant="primary" style={{ width:'100%', fontSize:16 }} onClick={() => go('menu')}>Finalizar</Btn>
    </div>
  </div>
);

Object.assign(window, { LoginQR, OnboardingBienvenida, OnboardingPreferencias, OnboardingPremium, StepHeader });
