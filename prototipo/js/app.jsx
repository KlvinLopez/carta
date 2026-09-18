// ═══════════════════════════════════════════════════════════
// CARTA · app.jsx — shell: login, 4 roles, admin web/móvil, tweaks
// ═══════════════════════════════════════════════════════════
const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "arVariant": "Inmersiva",
  "friendsReady": 2,
  "meseroEscenario": "Normal",
  "adminDensity": "Con datos"
}/*EDITMODE-END*/;

// ── Mapa de pantallas ──────────────────────────────────────
const SCREEN_MAP = {
  comensal: [
    { id:'p17a', code:'P17a', name:'Escaneo de QR' },
    { id:'p18a', code:'P18a', name:'Bienvenida · paso 1' },
    { id:'p18b', code:'P18b', name:'Preferencias · paso 2' },
    { id:'p18c', code:'P18c', name:'Carta+ · paso 3' },
    { id:'ar',   code:'P01',  name:'AR landing' },
    { id:'dish', code:'P02',  name:'Detalle de platillo' },
    { id:'menu', code:'P03',  name:'Menú completo' },
    { id:'pdf',  code:'P03b', name:'Carta PDF embebida' },
    { id:'group',code:'P04',  name:'Sesión grupal' },
    { id:'tracking', code:'P04b', name:'Preparación de la orden' },
    { id:'checkout', code:'P05', name:'Checkout y propina' },
    { id:'success',  code:'P05b', name:'Pago exitoso' },
    { id:'perfil',   code:'P22',  name:'Perfil del comensal' },
  ],
  mesero: [
    { id:'p19b',  code:'P19b', name:'Invitación al equipo' },
    { id:'p19a',  code:'P19a', name:'Registro de mesero' },
    { id:'mesas', code:'P06',  name:'Mis mesas y pedidos' },
    { id:'mesa',  code:'P07',  name:'Detalle de mesa' },
    { id:'perfil',  code:'P20', name:'Perfil portable' },
  ],
  capitan: [
    { id:'c-inicio',  code:'C01', name:'Inicio del turno' },
    { id:'c-mesas',   code:'C02', name:'Mesas y pedidos' },
    { id:'c-menu',    code:'C07', name:'Menú (activar/pausar)' },
    { id:'c-equipo',  code:'C04', name:'Mi brigada' },
    { id:'c-dispositivos', code:'C05', name:'Dispositivos · PIN' },
    { id:'c-rendimiento',  code:'C06', name:'Rendimiento' },
    { id:'c-perfil',       code:'C08', name:'Perfil portable' },
  ],
  admin: [
    { id:'onboarding', code:'P21', name:'Alta del restaurante' },
    { id:'dashboard',  code:'P09', name:'Dashboard' },
    { id:'menu',       code:'P10', name:'Mi menú (CRUD)' },
    { id:'orders',     code:'P11', name:'Pedidos' },
    { id:'analytics',  code:'P12', name:'Analytics' },
    { id:'performance',code:'P14', name:'Rendimiento del equipo' },
    { id:'team',       code:'P15', name:'Miembros del equipo' },
    { id:'devices',    code:'P16', name:'Dispositivos' },
    { id:'settings',   code:'P13', name:'Configuración' },
  ],
};
const ROLE_LABEL = { comensal:'Comensal', mesero:'Mesero', capitan:'Capitán', admin:'Admin' };
const ROLE_ICON = { comensal:'qr_code_scanner', mesero:'room_service', capitan:'groups', admin:'storefront' };
const TOTAL_SCREENS = Object.values(SCREEN_MAP).reduce((s,a) => s + a.length, 0) + 1;

// ── Overlay mapa de pantallas ──────────────────────────────
const ScreenMapOverlay = ({ route, jump, close, goLaunch }) => (
  <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(16,12,10,0.82)',
    backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', display:'flex', flexDirection:'column',
    padding:'36px 44px' }} onClick={close}>
    <div style={{ display:'flex', alignItems:'center', marginBottom:22 }}>
      <div>
        <div style={{ fontFamily:serif, fontSize:26, color:'white' }}>Mapa del prototipo</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginTop:2 }}>
          {TOTAL_SCREENS} pantallas · 4 roles · toca cualquiera para saltar
        </div>
      </div>
      <div style={{ flex:1 }}/>
      <button onClick={e => { e.stopPropagation(); goLaunch(); close(); }} style={{ display:'flex', alignItems:'center',
        gap:7, border:'none', cursor:'pointer', borderRadius:9999, padding:'8px 15px', marginRight:10,
        fontSize:12.5, fontWeight:600, fontFamily:sans, background:'rgba(255,255,255,0.12)', color:'white' }}>
        <Icon name="login" size={15} color="white"/> P00 · Login
      </button>
      <IconBtn name="close" dark onClick={close}/>
    </div>
    <div className="hide-scroll" style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:22, flex:1, overflow:'auto' }}>
      {['comensal','mesero','capitan','admin'].map(role => (
        <div key={role} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:11 }}>
            <div style={{ width:30, height:30, borderRadius:10, background:gradVino,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name={ROLE_ICON[role]} size={16} color="white"/>
            </div>
            <span style={{ fontSize:15, fontWeight:700, color:'white' }}>{ROLE_LABEL[role]}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>
              {role==='admin' ? 'Web + móvil' : 'iPhone'}
            </span>
          </div>
          {SCREEN_MAP[role].map(s => {
            const on = route.role===role && route.screen===s.id;
            return (
              <div key={s.id} onClick={() => { jump(role, s.id); close(); }} style={{
                display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:13,
                marginBottom:4, cursor:'pointer',
                background: on ? 'rgba(254,249,241,0.94)' : 'rgba(255,255,255,0.06)',
                transition:'background 150ms' }}
                onMouseEnter={e => { if(!on) e.currentTarget.style.background='rgba(255,255,255,0.13)'; }}
                onMouseLeave={e => { if(!on) e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}>
                <span style={{ fontSize:10, fontWeight:700, fontFamily:'ui-monospace, monospace',
                  background: on ? 'rgba(79,23,40,0.1)' : 'rgba(255,255,255,0.1)',
                  color: on ? C.primary : C.doradoLight, borderRadius:7, padding:'3px 6px', minWidth:40, textAlign:'center' }}>{s.code}</span>
                <span style={{ fontSize:12.5, fontWeight: on?700:400, color: on ? C.charcoal : 'rgba(255,255,255,0.85)' }}>{s.name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  </div>
);

// ── Chrome del prototipo ───────────────────────────────────
const PrototypeChrome = ({ route, setRole, openMap, jump, adminView, setAdminView }) => {
  const screens = route.role !== 'launch' ? SCREEN_MAP[route.role] : [];
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, height:56, zIndex:200, display:'flex',
      alignItems:'center', gap:12, padding:'0 20px',
      background:'rgba(20,15,12,0.75)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
      <div onClick={() => setRole('launch')} style={{ display:'flex', alignItems:'baseline', gap:8, cursor:'pointer' }}>
        <span style={{ fontFamily:serif, fontStyle:'italic', fontSize:21, color:'white' }}>Carta</span>
        <span style={{ fontSize:10.5, fontWeight:600, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Prototipo</span>
      </div>
      <div style={{ flex:1 }}/>
      {/* Selector de rol */}
      <div style={{ display:'flex', gap:3, background:'rgba(255,255,255,0.09)', borderRadius:9999, padding:3 }}>
        {['comensal','mesero','capitan','admin'].map(r => {
          const on = route.role === r;
          return (
            <button key={r} onClick={() => setRole(r)} style={{ border:'none', cursor:'pointer', borderRadius:9999,
              padding:'6px 14px', fontSize:12.5, fontWeight:600, fontFamily:sans,
              background: on ? C.surface : 'transparent', color: on ? C.primary : 'rgba(255,255,255,0.65)',
              transition:'all 180ms' }}>{ROLE_LABEL[r]}</button>
          );
        })}
      </div>
      {/* Toggle web/móvil (solo admin) */}
      {route.role === 'admin' && (
        <div style={{ display:'flex', gap:3, background:'rgba(255,255,255,0.09)', borderRadius:9999, padding:3 }}>
          {[['web','desktop_windows'],['movil','smartphone']].map(([v,ic]) => {
            const on = adminView === v;
            return (
              <button key={v} onClick={() => setAdminView(v)} title={v==='web' ? 'Vista web' : 'Vista móvil'}
                style={{ border:'none', cursor:'pointer', borderRadius:9999, width:34, height:28,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: on ? C.surface : 'transparent', transition:'all 180ms' }}>
                <Icon name={ic} size={16} color={on ? C.primary : 'rgba(255,255,255,0.65)'}/>
              </button>
            );
          })}
        </div>
      )}
      {/* Selector de pantalla */}
      {screens.length > 0 && (
        <select value={route.screen} onChange={e => jump(route.role, e.target.value)} style={{
          background:'rgba(255,255,255,0.09)', color:'white', border:'none', borderRadius:10,
          padding:'7px 10px', fontSize:12.5, fontWeight:500, cursor:'pointer', maxWidth:200 }}>
          {screens.map(s => <option key={s.id} value={s.id} style={{ color:C.charcoal }}>{s.code} — {s.name}</option>)}
        </select>
      )}
      <button onClick={openMap} {...pressFx} style={{ display:'flex', alignItems:'center', gap:7, border:'none',
        cursor:'pointer', borderRadius:9999, padding:'8px 15px', fontSize:12.5, fontWeight:600, fontFamily:sans,
        background:gradDorado, color:'white', boxShadow:'0 6px 18px rgba(184,134,11,0.35)' }}>
        <Icon name="map" size={15} color="white"/> Mapa
      </button>
    </div>
  );
};

// ── APP ────────────────────────────────────────────────────
const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem('carta-proto-route')||'{}'); } catch(e) { return {}; } }, []);
  const isValid = (role, screen) => !!(SCREEN_MAP[role] && SCREEN_MAP[role].some(s => s.id === screen));
  const [route, setRoute] = useState(() => isValid(saved.role, saved.screen)
    ? { role: saved.role, screen: saved.screen }
    : saved.role === 'launch' && saved.screen === 'gate' ? { role:'launch', screen:'gate' }
    : { role:'launch', screen:'scan' });
  const [mem, setMem] = useState(() => {
    const def = { comensal:'p17a', mesero:'p19b', capitan:'c-inicio', admin:'onboarding' };
    const m = saved.mem || {};
    const out = {};
    Object.keys(def).forEach(k => { out[k] = isValid(k, m[k]) ? m[k] : def[k]; });
    return out;
  });
  const [adminView, setAdminView] = useState(saved.adminView === 'movil' ? 'movil' : 'web');
  const [showMap, setShowMap] = useState(false);

  // Estado comensal
  const [order, setOrder] = useState(saved.order || [{ id:1, qty:1 }]);
  const [dish, setDish] = useState(null);
  const [dishFrom, setDishFrom] = useState('ar');
  // Estado mesero
  const [mesas, setMesas] = useState(() => mesasEscenario(t.meseroEscenario));
  const [mesaN, setMesaN] = useState(7);
  // Estado admin
  const [menuItems, setMenuItems] = useState(MENU_SEED);
  const [mesaFilter, setMesaFilter] = useState(null);
  const adminEmpty = t.adminDensity === 'Vacío';
  // Estado compartido entre apps
  const [orderStatus, setOrderStatus] = useState('armando'); // armando|enviada|preparando|servida
  const [waiterPerms, setWaiterPerms] = useState(WAITER_PERMS_DEFAULT);
  const [captainChoice, setCaptainChoice] = useState({ mode:'designar', who:'Carlos Ramírez' });
  const [capMesaOpen, setCapMesaOpen] = useState(null);
  const [modDraft, setModDraft] = useState(null);      // borrador de modificación del comensal
  const [modRequest, setModRequest] = useState(null);  // solicitud enviada al mesero
  const [cuentaState, setCuentaState] = useState('abierta'); // abierta | cerrada | pagando

  useEffect(() => { setMesas(mesasEscenario(t.meseroEscenario)); }, [t.meseroEscenario]);
  // Simula avance de cocina (el mesero también lo dispara desde su app)
  useEffect(() => {
    if (orderStatus==='enviada') { const x=setTimeout(()=>setOrderStatus('preparando'), 3500); return ()=>clearTimeout(x); }
    if (orderStatus==='preparando') { const x=setTimeout(()=>setOrderStatus('servida'), 7000); return ()=>clearTimeout(x); }
    if (orderStatus==='ampliacion') { const x=setTimeout(()=>setOrderStatus('servida'), 6000); return ()=>clearTimeout(x); }
  }, [orderStatus]);
  // Cierre de cuenta grupal: cuando el último integrante cierra → Pagando
  useEffect(() => {
    if (cuentaState === 'cerrada') {
      const x = setTimeout(() => {
        setCuentaState('pagando');
        setMesas(prev => prev.map(m => m.n===7 ? {...m, estado:'pagada', fase:'Pagando'} : m));
      }, 5000);
      return () => clearTimeout(x);
    }
  }, [cuentaState]);
  // El comensal salta a la pantalla de seguimiento cuando su orden avanza
  useEffect(() => {
    if (route.role==='comensal' && (orderStatus==='preparando' || orderStatus==='servida')
      && !['tracking','checkout','success'].includes(route.screen)) jump('comensal','tracking');
  }, [orderStatus]);
  useEffect(() => {
    localStorage.setItem('carta-proto-route', JSON.stringify({ ...route, mem, order, adminView }));
  }, [route, mem, order, adminView]);

  const jump = (role, screen) => {
    if (role !== 'launch' && !isValid(role, screen)) screen = SCREEN_MAP[role][0].id;
    if (screen === 'dish' && !dish) setDish(MENU_SEED[0]);
    if (screen === 'checkout' && !order.length) setOrder([{ id:1, qty:1 }]);
    setRoute({ role, screen });
    if (role !== 'launch') setMem(m => ({ ...m, [role]: screen }));
  };
  const go = screen => jump(route.role, screen);
  const setRole = role => role === 'launch' ? setRoute({ role:'launch', screen:'scan' }) : jump(role, mem[role]);
  const openDish = (d, from) => { setDish(d); setDishFrom(from || route.screen); go('dish'); };
  const updateMesa = (n, patch) => setMesas(prev => prev.map(m => m.n===n ? {...m, ...patch} : m));

  // ── Comensal ──
  const comensalScreen = () => {
    const props = { go, order, groupReady: t.friendsReady + 1 };
    switch (route.screen) {
      case 'p17a': return <LoginQR go={go}/>;
      case 'p18a': return <OnboardingBienvenida go={go}/>;
      case 'p18b': return <OnboardingPreferencias go={go}/>;
      case 'p18c': return <OnboardingPremium go={go}/>;
      case 'ar': {
        const AR = { 'Inmersiva':ARInmersiva, 'Editorial':AREditorial, 'Mínima':ARMinimal }[t.arVariant] || ARInmersiva;
        return <AR {...props} onDish={d => openDish(d,'ar')}/>;
      }
      case 'dish': {
        const d = dish || MENU_SEED[0];
        const inOrder = order.some(o => o.id === d.id);
        return <DishDetail dish={d} go={go} inOrder={inOrder} order={order} groupReady={t.friendsReady + 1}
          onBack={() => go(dishFrom==='dish' ? 'menu' : dishFrom)}
          onAddSide={s => setOrder(prev => prev.some(o=>o.id===s.id) ? prev : [...prev, { id:s.id, qty:1 }])}
          onAdd={qty => { setOrder(prev => inOrder ? prev.filter(o=>o.id!==d.id) : [...prev, { id:d.id, qty }]); }}/>;
      }
      case 'menu': return <FullMenu go={go} order={order} setOrder={setOrder} returnTo={modDraft ? 'tracking' : undefined} onDish={d => openDish(d,'menu')}/>;
      case 'pdf': return <PDFViewer go={go}/>;
      case 'group': return <GroupSession go={go} order={order} friendsReady={t.friendsReady} setOrderStatus={setOrderStatus} onDish={d => openDish(d,'group')}/>;
      case 'tracking': return <OrderTracking go={go} order={order} setOrder={setOrder} orderStatus={orderStatus} setOrderStatus={setOrderStatus}
        modDraft={modDraft} setModDraft={setModDraft} cuentaState={cuentaState} setCuentaState={setCuentaState}
        sendModRequest={ops => setModRequest({ status:'pendiente', changes:ops, from:'Comensal 1' })}
        cancelModRequest={() => setModRequest(null)}/>;
      case 'checkout': return <CheckoutV2 go={go} order={order}/>;
      case 'success': return <PaySuccess go={go} order={order} resetOrder={() => { setOrder([]); setOrderStatus('armando'); setCuentaState('abierta'); setModDraft(null); setModRequest(null); }}/>;
      case 'perfil': return <PerfilComensal go={go} order={order}/>;
      default: return <LoginQR go={go}/>;
    }
  };
  const comensalDark = ['p17a','ar','dish','pdf'].includes(route.screen);

  // ── Mesero ──
  const meseroScreen = () => {
    const mesa = mesas.find(m => m.n === mesaN) || mesas[2];
    switch (route.screen) {
      case 'p19b': return <WaiterInvite go={go}/>;
      case 'p19a': return <WaiterRegister go={go}/>;
      case 'mesas': return <MisMesas go={go} mesas={mesas} escenario={t.meseroEscenario} onMesa={n => { setMesaN(n); go('mesa'); }}/>;
      case 'mesa': return <DetalleMesa go={go} mesa={mesa} updateMesa={updateMesa} perms={waiterPerms} setOrderStatus={setOrderStatus}
        modRequest={modRequest} setModRequest={setModRequest}/>;
      case 'pedidos': return <MisMesas go={go} mesas={mesas} escenario={t.meseroEscenario} onMesa={n => { setMesaN(n); go('mesa'); }}/>;
      case 'perfil': return <WaiterProfile go={go}/>;
      default: return <WaiterInvite go={go}/>;
    }
  };
  const meseroDark = ['mesa','perfil'].includes(route.screen);

  // ── Capitán ──
  const capitanGo = screen => screen === 'perfil-mesero' ? jump('mesero','perfil') : go(screen);
  const capitanScreen = () => {
    switch (route.screen) {
      case 'c-inicio':  return <CapInicio go={capitanGo} mesas={mesas} openMesa={m => { setCapMesaOpen(m); jump('capitan','c-mesas'); }}/>;
      case 'c-mesas':   return <CapMesas go={capitanGo} mesas={mesas} escenario={t.meseroEscenario} updateMesa={updateMesa} perms={waiterPerms} setOrderStatus={setOrderStatus} initialMesa={capMesaOpen} clearInitial={() => setCapMesaOpen(null)}/>;
      case 'c-pedidos': return <CapMesas go={capitanGo} mesas={mesas} escenario={t.meseroEscenario} updateMesa={updateMesa} perms={waiterPerms} setOrderStatus={setOrderStatus} initialMesa={capMesaOpen} clearInitial={() => setCapMesaOpen(null)}/>;
      case 'c-menu': return <CapMenu go={capitanGo} items={menuItems} setItems={setMenuItems}/>;
      case 'c-equipo':  return <CapEquipo go={capitanGo} perms={waiterPerms} setPerms={setWaiterPerms}/>;
      case 'c-dispositivos': return <CapDispositivos go={capitanGo}/>;
      case 'c-rendimiento':  return <CapRendimiento go={capitanGo}/>;
      case 'c-perfil': return <CapPerfil go={capitanGo}/>;
      default: return <CapInicio go={capitanGo} mesas={mesas}/>;
    }
  };

  // ── Admin web ──
  const adminWebScreen = () => {
    if (route.screen === 'onboarding') return <RestaurantOnboarding onDone={c => { if (c) setCaptainChoice(c); go('dashboard'); }}/>;
    const inner = {
      dashboard:  <AdminDashboard empty={adminEmpty} setActive={go} escenario={t.meseroEscenario} goOrders={n => { setMesaFilter(n); go('orders'); }}/>,
      menu:       <AdminMenu empty={adminEmpty} items={menuItems} setItems={setMenuItems}/>,
      orders:     <AdminOrders empty={adminEmpty} escenario={t.meseroEscenario} mesas={mesas} updateMesa={updateMesa} perms={waiterPerms} setOrderStatus={setOrderStatus} mesaFilter={mesaFilter} clearFilter={() => setMesaFilter(null)}/>,
      analytics:  <AdminAnalytics empty={adminEmpty}/>,
      performance:<AdminPerformance empty={adminEmpty}/>,
      team:       <AdminTeam empty={adminEmpty}/>,
      devices:    <AdminDevices empty={adminEmpty}/>,
      settings:   <AdminSettings/>,
    }[route.screen] || null;
    return <AdminShell active={route.screen} setActive={go} ordersBadge={adminEmpty ? 0 : 3}>{inner}</AdminShell>;
  };

  // ── Admin móvil ──
  const adminMobScreen = () => {
    switch (route.screen) {
      case 'onboarding': return <RestaurantOnboarding compact onDone={c => { if (c) setCaptainChoice(c); go('dashboard'); }}/>;
      case 'dashboard': return <MobHome go={go} empty={adminEmpty} escenario={t.meseroEscenario}/>;
      case 'menu':      return <MobMenu go={go} empty={adminEmpty} items={menuItems} setItems={setMenuItems}/>;
      case 'orders':    return <MobOrders go={go} empty={adminEmpty} escenario={t.meseroEscenario} mesas={mesas} updateMesa={updateMesa} perms={waiterPerms} setOrderStatus={setOrderStatus}/>;
      case 'analytics': return <MobAnalytics go={go} empty={adminEmpty}/>;
      case 'performance': return <MobPerformance go={go}/>;
      case 'team':      return <MobTeam go={go}/>;
      case 'devices':   return <MobDevices go={go}/>;
      case 'settings':  return <MobConfig go={go}/>;
      default:          return <MobHome go={go} empty={adminEmpty}/>;
    }
  };

  const screenInfo = route.role !== 'launch'
    ? SCREEN_MAP[route.role].find(s => s.id === route.screen) : null;
  const adminMobile = route.role === 'admin' && adminView === 'movil';
  const label = screenInfo
    ? `${ROLE_LABEL[route.role]}${adminMobile ? ' móvil' : ''} · ${screenInfo.code} ${screenInfo.name}`
    : route.screen === 'gate' ? 'P00 Acceso a la mesa' : 'P17a Escaneo QR (inicio)';

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', paddingTop:56, position:'relative' }}>
      <PrototypeChrome route={route} setRole={setRole} jump={jump} openMap={() => setShowMap(true)}
        adminView={adminView} setAdminView={setAdminView}/>

      <div data-screen-label={label}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>
        {route.role === 'launch' && (route.screen === 'scan'
          ? <PhoneFrame statusDark><LoginQR onDone={() => setRoute({ role:'launch', screen:'gate' })}/></PhoneFrame>
          : <PhoneFrame><LoginGate pick={(role, screen) => screen ? jump(role, screen) : setRole(role)}/></PhoneFrame>)}
        {route.role === 'comensal' && <PhoneFrame statusDark={comensalDark}>{comensalScreen()}</PhoneFrame>}
        {route.role === 'mesero' && <PhoneFrame statusDark={meseroDark}>{meseroScreen()}</PhoneFrame>}
        {route.role === 'capitan' && <PhoneFrame>{capitanScreen()}</PhoneFrame>}
        {route.role === 'admin' && (adminMobile
          ? <PhoneFrame>{adminMobScreen()}</PhoneFrame>
          : <DesktopFrame>{adminWebScreen()}</DesktopFrame>)}
      </div>

      {showMap && <ScreenMapOverlay route={route} jump={jump} goLaunch={() => setRole('launch')} close={() => setShowMap(false)}/>}

      <TweaksPanel>
        <TweakSection label="Pantalla AR (P01)"/>
        <TweakRadio label="Variante" value={t.arVariant} options={['Inmersiva','Editorial','Mínima']}
          onChange={v => { setTweak('arVariant', v); if (route.role==='comensal') jump('comensal','ar'); }}/>
        <TweakSection label="Sesión grupal (P04)"/>
        <TweakSlider label="Amigos que ya confirmaron" value={t.friendsReady} min={0} max={3} step={1}
          onChange={v => setTweak('friendsReady', v)}/>
        <TweakSection label="Turno (Mesero · Capitán · Admin)"/>
        <TweakRadio label="Escenario del turno" value={t.meseroEscenario} options={['Tranquilo','Normal','Hora pico']}
          onChange={v => setTweak('meseroEscenario', v)}/>
        <TweakSection label="Admin (P09–P16)"/>
        <TweakRadio label="Densidad de datos" value={t.adminDensity} options={['Con datos','Vacío']}
          onChange={v => setTweak('adminDensity', v)}/>
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
