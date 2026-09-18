// ═══════════════════════════════════════════════════════════
// ENTRADA — P17a escaneo (pantalla inicial) → Acceso a la mesa
// + portales de staff con login previo
// ═══════════════════════════════════════════════════════════
const { useState } = React;

const GoogleG = () => (
  <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-7-5.1l-3.9 3C3.1 21.3 7.2 24 12 24z"/><path fill="#FBBC05" d="M5 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3l-3.9-3C.4 8.3 0 10.1 0 12s.4 3.7 1.1 5.3l3.9-3z"/><path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.2 0 3.1 2.7 1.1 6.7l3.9 3c1-3 3.8-5 7-5z"/></svg>
);
const AppleLogo = () => (
  <svg width="15" height="17" viewBox="0 0 384 512"><path fill="#1D1C17" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
);

// ═══ ACCESO A LA MESA — puerta de entrada tras el QR ═══════
const LoginGate = ({ pick }) => {
  const [step, setStep] = useState('gate'); // gate | who | mesero | rest
  const [email, setEmail] = useState('');

  // ── ¿Cómo deseas ingresar? — tras iniciar sesión ──
  if (step === 'who') {
    return (
      <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'62px 24px 4px', display:'flex', alignItems:'center', gap:11, flexShrink:0 }}>
          <IconBtn name="arrow_back" onClick={() => setStep('gate')}/>
          <div>
            <div style={{ fontFamily:serif, fontSize:22, color:C.charcoal }}>¿Cómo deseas ingresar?</div>
            <div style={{ fontSize:12.5, color:C.muted }}>Elige tu tipo de cuenta</div>
          </div>
        </div>
        <div style={{ flex:1, padding:'18px 26px 0' }}>
          <button onClick={() => pick('comensal','p18a')} {...pressFx} style={{ display:'flex', alignItems:'center',
            gap:14, width:'100%', background:'white', border:'none', borderRadius:24, padding:'16px 18px',
            cursor:'pointer', textAlign:'left', boxShadow:'0 4px 14px rgba(79,23,40,0.07)',
            transition:'transform 150ms cubic-bezier(0.22,1.4,0.36,1)' }}>
            <div style={{ width:50, height:50, borderRadius:17, background:gradVino, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="restaurant" size={24} color="white"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15.5, fontWeight:700, color:C.charcoal, fontFamily:sans }}>Comensal registrado</div>
              <div style={{ fontSize:12.5, color:C.muted, marginTop:1 }}>Tu menú se personaliza con tus gustos</div>
            </div>
            <Icon name="chevron_right" size={20} color={C.outline}/>
          </button>
          <div style={{ display:'flex', gap:9, background:C.surfaceLow, borderRadius:16, padding:'12px 15px', marginTop:14 }}>
            <Icon name="info" size={16} color={C.muted} style={{ marginTop:1, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:C.muted, lineHeight:'18px' }}>
              Próximamente más tipos de cuenta. El personal del restaurante entra por su portal.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Portal de Meseros: login → 3 destinos según cuenta ──
  if (step === 'mesero' || step === 'rest') {
    const isMesero = step === 'mesero';
    return (
      <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'62px 24px 4px', display:'flex', alignItems:'center', gap:11, flexShrink:0 }}>
          <IconBtn name="arrow_back" onClick={() => setStep('gate')}/>
          <div>
            <div style={{ fontFamily:serif, fontSize:22, color:C.charcoal }}>
              {isMesero ? 'Portal de Meseros' : 'Socio de Restaurante'}
            </div>
            <div style={{ fontSize:12.5, color:C.muted }}>Inicia sesión para continuar</div>
          </div>
        </div>
        <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'14px 26px 30px' }}>
          <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.1em', color:C.muted, marginBottom:7 }}>CORREO O TELÉFONO</div>
          <input placeholder={isMesero ? 'carlos@correo.mx' : 'valeria@laceiba.mx'}
            style={{ width:'100%', background:'white', border:'none', borderRadius:18, padding:'14px 17px',
              fontSize:14.5, color:C.charcoal, marginBottom:10, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}/>
          <input type="password" placeholder="Contraseña" defaultValue="••••••••"
            style={{ width:'100%', background:'white', border:'none', borderRadius:18, padding:'14px 17px',
              fontSize:14.5, color:C.charcoal, marginBottom:16, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}/>

          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase',
            color:C.outline, margin:'6px 0 10px' }}>Elige cómo deseas comenzar · demo</div>
          {isMesero ? (
            <React.Fragment>
              {[
                { person:{ name:'Carlos Ramírez', emoji:'🧑‍💼', photo:WAITER.photo }, sub:'Con cuenta · en La Ceiba', dest:['mesero','mesas'], note:'P06' },
                { person:{ name:'Roberto García', emoji:'🧑', photo:'' }, sub:'Con cuenta · sin restaurante aún', dest:['mesero','p19b'], note:'P19b' },
              ].map(a => (
                <button key={a.note} onClick={() => pick(...a.dest)} {...pressFx} style={{ display:'flex', alignItems:'center',
                  gap:13, width:'100%', background:'white', border:'none', borderRadius:22, padding:'13px 16px',
                  marginBottom:10, cursor:'pointer', textAlign:'left', boxShadow:'0 4px 14px rgba(79,23,40,0.07)',
                  transition:'transform 150ms cubic-bezier(0.22,1.4,0.36,1)' }}>
                  {a.person.photo
                    ? <Avatar person={a.person} size={46} ring/>
                    : <div style={{ width:46, height:46, borderRadius:9999, background:C.surfaceHigh, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:C.muted }}>R</div>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.charcoal, fontFamily:sans }}>{a.person.name}</div>
                    <div style={{ fontSize:12.5, color:C.muted }}>{a.sub}</div>
                  </div>
                  <Icon name="chevron_right" size={19} color={C.outline}/>
                </button>
              ))}
              <button onClick={() => pick('mesero','p19a')} {...pressFx} style={{ display:'flex', alignItems:'center',
                justifyContent:'center', gap:8, width:'100%', background:C.surfaceLow, border:'none', borderRadius:9999,
                padding:'14px 0', fontSize:14, fontWeight:700, color:C.primary, cursor:'pointer', fontFamily:sans, marginTop:4 }}>
                <Icon name="person_add" size={17} color={C.primary}/> Aún no tengo cuenta — crear perfil
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <button onClick={() => pick('admin','dashboard')} {...pressFx} style={{ display:'flex', alignItems:'center',
                gap:13, width:'100%', background:'white', border:'none', borderRadius:22, padding:'13px 16px',
                marginBottom:10, cursor:'pointer', textAlign:'left', boxShadow:'0 4px 14px rgba(79,23,40,0.07)',
                transition:'transform 150ms cubic-bezier(0.22,1.4,0.36,1)' }}>
                <div style={{ width:46, height:46, borderRadius:9999, background:gradDorado, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'white' }}>V</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:C.charcoal, fontFamily:sans }}>Valeria Ruiz</div>
                  <div style={{ fontSize:12.5, color:C.muted }}>La Ceiba · cuenta existente</div>
                </div>
                <Icon name="chevron_right" size={19} color={C.outline}/>
              </button>
              <button onClick={() => pick('admin','onboarding')} {...pressFx} style={{ display:'flex', alignItems:'center',
                justifyContent:'center', gap:8, width:'100%', background:C.surfaceLow, border:'none', borderRadius:9999,
                padding:'14px 0', fontSize:14, fontWeight:700, color:C.primary, cursor:'pointer', fontFamily:sans, marginTop:4 }}>
                <Icon name="storefront" size={17} color={C.primary}/> Registrar mi restaurante
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    );
  }

  // ── Acceso a la mesa (scrollable) ──
  return (
    <div className="screen" style={{ position:'relative', background:C.surface, overflow:'hidden' }}>
      <div className="hide-scroll" style={{ height:'100%', overflowY:'auto' }}>
        {/* Hero */}
        <div style={{ position:'relative', height:250 }}>
          <img src={IMGS.finedining} alt="" onError={e=>e.target.style.display='none'}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
              filter:'brightness(0.6) saturate(1.15)' }}/>
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(180deg, rgba(13,10,9,0.3) 0%, rgba(13,10,9,0.1) 40%, #FEF9F1 100%)' }}/>
          <div style={{ position:'absolute', top:64, left:0, right:0, textAlign:'center' }}>
            <div style={{ fontFamily:serif, fontStyle:'italic', fontSize:34, color:'white', textShadow:'0 4px 16px rgba(0,0,0,0.4)' }}>Carta</div>
            <div style={{ fontSize:12, fontStyle:'italic', fontFamily:serif, color:'rgba(255,255,255,0.85)' }}>The Digital Sommelier</div>
          </div>
        </div>

        <div style={{ padding:'0 26px 36px', marginTop:-44, position:'relative' }}>
          {/* Tarjeta de mesa identificada */}
          <div className="pop-in" style={{ background:'white', borderRadius:28, padding:'20px 22px',
            boxShadow:'0 20px 48px rgba(79,23,40,0.14)', textAlign:'center' }}>
            <Chip tone="success" style={{ fontSize:11.5 }}>
              <Icon name="check_circle" size={13} color="#15803D" fill/> QR escaneado
            </Chip>
            <div style={{ fontFamily:serif, fontSize:30, color:C.primary, marginTop:10 }}>Mesa {RESTAURANT.mesa}</div>
            <div style={{ fontSize:13.5, color:C.muted, marginTop:2 }}>{RESTAURANT.name} · {RESTAURANT.tagline}</div>
            <Btn variant="primary" style={{ width:'100%', fontSize:17, marginTop:16, fontFamily:serif, fontStyle:'italic' }}
              onClick={() => pick('comensal','menu')}>Ver menú&nbsp;&nbsp;→</Btn>
            <div style={{ fontSize:12, color:C.outline, marginTop:10 }}>
              Sin registro — entrarás como <b style={{ color:C.muted }}>Comensal 1</b>
            </div>
          </div>

          {/* Login opcional */}
          <div style={{ textAlign:'center', fontSize:13, color:C.muted, margin:'22px 0 12px' }}>
            Inicia sesión para personalizar el menú para ti
          </div>
          <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.1em', color:C.muted, marginBottom:7 }}>CORREO O TELÉFONO</div>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@ejemplo.com o +52 000 0000"
            style={{ width:'100%', background:'white', border:'none', borderRadius:18, padding:'14px 17px',
              fontSize:14.5, color:C.charcoal, marginBottom:11, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}/>
          <Btn variant="secondary" style={{ width:'100%' }} onClick={() => setStep('who')}>Iniciar sesión</Btn>
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:C.surfaceHighest }}/>
            <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.14em', color:C.outline }}>O BIEN</span>
            <div style={{ flex:1, height:1, background:C.surfaceHighest }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['google', <GoogleG key="g"/>], ['apple', <AppleLogo key="a"/>]].map(([k, logo]) => (
              <button key={k} onClick={() => setStep('who')} {...pressFx} style={{ display:'flex', alignItems:'center',
                justifyContent:'center', gap:8, background:'white', border:'none', borderRadius:9999,
                padding:'13px 0', fontSize:14.5, fontWeight:600, color:C.charcoal, cursor:'pointer', fontFamily:sans,
                boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}>
                {logo} {k==='google' ? 'Google' : 'Apple'}
              </button>
            ))}
          </div>

          {/* Staff */}
          <div style={{ display:'flex', justifyContent:'center', gap:18, flexWrap:'wrap', marginTop:26 }}>
            <button onClick={() => setStep('rest')} style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:600, color:C.dorado, fontFamily:sans }}>Socio de Restaurante</button>
            <button onClick={() => setStep('mesero')} style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:600, color:C.dorado, fontFamily:sans }}>Portal de Meseros</button>
            <button style={{ background:'none', border:'none', fontSize:12.5, color:C.muted, fontFamily:sans }}>Privacidad</button>
          </div>
          <div style={{ textAlign:'center', fontSize:10, letterSpacing:'0.1em', color:C.outline, marginTop:14, textTransform:'uppercase' }}>
            © 2026 Carta Digital Sommelier · Elevando el arte de la mesa
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LoginGate });
