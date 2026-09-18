// ═══════════════════════════════════════════════════════════
// CARTA — shared.jsx · tokens, componentes base y datos demo
// ═══════════════════════════════════════════════════════════
const { useState, useEffect, useRef, useMemo } = React;

// ── TOKENS ─────────────────────────────────────────────────
const C = {
  surface:    '#FEF9F1',
  surfaceLow: '#F5F0E8',
  surfaceHigh:'#ECE8E0',
  surfaceHighest:'#E7E2DA',
  white:      '#FFFFFF',
  primary:    '#4F1728',
  primaryCont:'#6B2D3E',
  dorado:     '#B8860B',
  doradoLight:'#FDC34D',
  charcoal:   '#1D1C17',
  muted:      '#524346',
  outline:    '#857375',
  error:      '#BA1A1A',
  success:    '#22C55E',
  info:       '#3B82F6',
  warning:    '#F59E0B',
  mesaLibre:  '#9CA3AF',
  morado:     '#8E44AD',
  rojoVivo:   '#DC2626',
};
const gradVino = `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryCont} 100%)`;
const gradDorado = `linear-gradient(135deg, ${C.dorado} 0%, #D4A017 100%)`;
const serif = "'DM Serif Display', Georgia, serif";
const sans = "'DM Sans', system-ui, sans-serif";
const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

// ── ICON ───────────────────────────────────────────────────
const Icon = ({ name, size=24, color, fill=false, weight, style={} }) => (
  <span className={`material-symbols-outlined ${fill?'filled':''}`}
    style={{ fontSize: size, ...(color ? { color } : {}),
      ...(weight ? { fontVariationSettings: `'FILL' ${fill?1:0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24` } : {}),
      ...style }}>{name}</span>
);

// ── BOTONES ────────────────────────────────────────────────
const pressFx = {
  onMouseDown: e => e.currentTarget.style.transform = 'scale(0.96)',
  onMouseUp:   e => e.currentTarget.style.transform = 'scale(1)',
  onMouseLeave:e => e.currentTarget.style.transform = 'scale(1)',
};
const Btn = ({ children, variant='primary', onClick, style={}, iconName, disabled }) => {
  const base = { border:'none', borderRadius:9999, padding:'14px 26px', fontFamily:sans,
    fontSize:16, fontWeight:600, cursor: disabled?'default':'pointer', display:'inline-flex', alignItems:'center',
    justifyContent:'center', gap:8, transition:'opacity 150ms, transform 120ms cubic-bezier(0.22,1.4,0.36,1)',
    opacity: disabled ? 0.45 : 1, ...style };
  const v = {
    primary:   { background: gradVino, color:'white' },
    secondary: { background: C.surfaceHigh, color: C.charcoal },
    ghost:     { background: 'transparent', color: C.primary },
    dorado:    { background: gradDorado, color:'white' },
    glass:     { background: 'rgba(254,249,241,0.14)', color:'white', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)' },
  };
  const iconColor = variant==='secondary' ? C.charcoal : variant==='ghost' ? C.primary : 'white';
  return <button style={{...base, ...v[variant]}} onClick={disabled?undefined:onClick} {...(disabled?{}:pressFx)}>
    {iconName && <Icon name={iconName} size={20} color={iconColor}/>}
    {children}
  </button>;
};

const IconBtn = ({ name, onClick, dark=false, size=42, iconSize=22, style={} }) => (
  <button onClick={onClick} {...pressFx} style={{
    background: dark ? 'rgba(255,255,255,0.14)' : 'rgba(29,28,23,0.06)',
    backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
    border:'none', borderRadius:9999, width:size, height:size, flexShrink:0,
    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
    transition:'transform 120ms cubic-bezier(0.22,1.4,0.36,1)', ...style }}>
    <Icon name={name} size={iconSize} color={dark ? 'white' : C.primary}/>
  </button>
);

// ── CHIPS / BADGES ─────────────────────────────────────────
const Chip = ({ children, tone='neutral', style={} }) => {
  const tones = {
    neutral: { background: C.surfaceHigh, color: C.muted },
    vino:    { background: 'rgba(79,23,40,0.09)', color: C.primary },
    dorado:  { background: 'rgba(184,134,11,0.14)', color: '#8A6508' },
    glass:   { background: 'rgba(254,249,241,0.16)', color: 'white', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' },
    success: { background: 'rgba(34,197,94,0.12)', color: '#15803D' },
    error:   { background: 'rgba(186,26,26,0.10)', color: C.error },
  };
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, borderRadius:9999,
    padding:'5px 12px', fontSize:13, fontWeight:500, fontFamily:sans, whiteSpace:'nowrap',
    ...tones[tone], ...style }}>{children}</span>;
};

const ChefBadge = ({ style={} }) => (
  <span style={{ background: gradDorado, color:'white', borderRadius:9999, padding:'4px 12px',
    fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, ...style }}>
    <Icon name="star" size={12} color="white" fill/> Especialidad del Chef
  </span>
);

// ── TOGGLE ─────────────────────────────────────────────────
const Toggle = ({ on, onChange, size=1 }) => (
  <div onClick={() => onChange(!on)} style={{ width:44*size, height:26*size, borderRadius:9999, cursor:'pointer',
    background: on ? C.dorado : C.surfaceHighest, position:'relative', transition:'background 200ms', flexShrink:0 }}>
    <div style={{ position:'absolute', top:3*size, left: on ? 21*size : 3*size, width:20*size, height:20*size,
      borderRadius:9999, background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.18)',
      transition:'left 220ms cubic-bezier(0.22,1.4,0.36,1)' }}/>
  </div>
);

// ── ESTRELLAS ──────────────────────────────────────────────
const Stars = ({ value=0, onChange, size=26, gap=6 }) => (
  <div style={{ display:'flex', gap }}>
    {[1,2,3,4,5].map(s => (
      <span key={s} onClick={onChange ? () => onChange(s) : undefined}
        style={{ cursor: onChange?'pointer':'default', transition:'transform 150ms',
          transform: s<=value ? 'scale(1)' : 'scale(0.92)' }}>
        <Icon name="star" size={size} fill={s<=value} color={s<=value ? C.dorado : C.surfaceHighest}/>
      </span>
    ))}
  </div>
);

// ── IMAGEN CON FALLBACK ────────────────────────────────────
const Photo = ({ src, emoji, style={}, radius=20, emojiSize=44 }) => {
  const [err, setErr] = useState(false);
  if (err || !src) return (
    <div style={{ background: C.surfaceHigh, display:'flex', alignItems:'center',
      justifyContent:'center', fontSize: emojiSize, borderRadius: radius, ...style }}>{emoji}</div>
  );
  return <img src={src} onError={() => setErr(true)} alt=""
    style={{ objectFit:'cover', borderRadius: radius, display:'block', ...style }}/>;
};

// ── AVATAR ─────────────────────────────────────────────────
const Avatar = ({ person, size=48, ring=false, dimmed=false, style={} }) => {
  const [err, setErr] = useState(false);
  const inner = err || !person.photo
    ? <div style={{ width:'100%', height:'100%', borderRadius:9999, background:C.surfaceHigh,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.44 }}>{person.emoji}</div>
    : <img src={person.photo} onError={() => setErr(true)} alt={person.name}
        style={{ width:'100%', height:'100%', borderRadius:9999, objectFit:'cover', display:'block' }}/>;
  return (
    <div style={{ width:size, height:size, borderRadius:9999, flexShrink:0, position:'relative',
      padding: ring ? 2.5 : 0, filter: dimmed ? 'grayscale(0.9) opacity(0.65)' : 'none',
      background: ring ? 'linear-gradient(45deg, #6B2D3E, #B8860B)' : 'transparent',
      transition:'filter 300ms', ...style }}>
      <div style={{ width:'100%', height:'100%', borderRadius:9999, overflow:'hidden',
        border: `2px solid ${C.surface}` }}>{inner}</div>
    </div>
  );
};

// ── SHEET GRIP ─────────────────────────────────────────────
const Grip = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
    <div style={{ width:40, height:5, borderRadius:9999, background:'rgba(79,23,40,0.22)' }}/>
  </div>
);

// ── STATUS BAR iOS ─────────────────────────────────────────
const StatusBar = ({ dark=false }) => {
  const col = dark ? 'white' : C.charcoal;
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, height:47, zIndex:60,
      display:'flex', alignItems:'flex-end', justifyContent:'space-between',
      padding:'0 30px 6px', pointerEvents:'none' }}>
      <span style={{ fontSize:15, fontWeight:600, color:col, fontFamily:sans, letterSpacing:'-0.01em' }}>9:41</span>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <Icon name="signal_cellular_alt" size={15} color={col}/>
        <Icon name="wifi" size={15} color={col}/>
        <Icon name="battery_full" size={17} color={col} style={{ transform:'rotate(90deg)' }}/>
      </div>
    </div>
  );
};

// ── CONFETTI ───────────────────────────────────────────────
const Confetti = ({ count=26 }) => {
  const pieces = useMemo(() => Array.from({length:count}).map((_,i) => ({
    left: Math.random()*100, delay: Math.random()*400, dur: 900 + Math.random()*800,
    color: [C.dorado, C.doradoLight, C.primaryCont, '#E8B4BC', C.success][i % 5],
    w: 5 + Math.random()*5, r: Math.random()*360,
  })), [count]);
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:80 }}>
      {pieces.map((p,i) => (
        <div key={i} style={{ position:'absolute', top:'30%', left:`${p.left}%`, width:p.w, height:p.w*1.4,
          background:p.color, borderRadius:2, transform:`rotate(${p.r}deg)`,
          animation:`confettiFall ${p.dur}ms ease-in ${p.delay}ms both` }}/>
      ))}
    </div>
  );
};

// ── DATOS DEMO ─────────────────────────────────────────────
const RESTAURANT = { name:'La Ceiba', tagline:'Cocina de origen', mesa:7, chef:'Chef Valeria Ruiz' };
const U = 'https://images.unsplash.com/';
const IMGS = {
  restaurante: U + 'photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
  finedining:  U + 'photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop',
};

const MENU_SEED = [
  { id:1, name:'Costilla de Res 12 h', cat:'Platos fuertes', price:320, emoji:'🥩',
    photo: U+'photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
    chips:['🥩 Res','🌿 Hierbas','🫒 Aceite de oliva'], spice:0, kcal:580, chef:true, orders:47, active:true,
    desc:'Res braseada 12 horas, puré de plátano macho y reducción de vino tinto con chocolate de metate.',
    maridaje:'🍷 Malbec argentino · 🥃 Mezcal espadín' },
  { id:2, name:'Aguachile Verde', cat:'Entradas', price:210, emoji:'🦐',
    photo: U+'photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop',
    chips:['🦐 Camarón','🌶️ Serrano','🥒 Pepino'], spice:3, kcal:240, chef:false, orders:38, active:true,
    desc:'Camarón curado en limón, chile serrano tatemado, pepino y cebolla morada. Frío y bravo.',
    maridaje:'🍺 Cerveza clara · 🥂 Espumoso brut' },
  { id:3, name:'Langostinos al Ajillo', cat:'Platos fuertes', price:380, emoji:'🦐',
    photo: U+'photo-1563379926898-05f4575a45d8?q=80&w=800&auto=format&fit=crop',
    chips:['🦐 Mariscos','🧄 Ajo confitado','🌿 Perejil'], spice:1, kcal:420, chef:true, orders:28, active:true,
    desc:'Langostinos en mantequilla de ajo confitado, guajillo tostado y pan de masa madre.',
    maridaje:'🍷 Albariño · 🍋 Limonada de hierbabuena' },
  { id:4, name:'Guacamole de Molcajete', cat:'Entradas', price:95, emoji:'🥑',
    photo: U+'photo-1523049673857-eb18f1d7b578?q=80&w=800&auto=format&fit=crop',
    chips:['🥑 Hass','🌶️ Serrano','🌱 Vegano'], spice:2, kcal:180, chef:false, orders:61, active:true,
    desc:'Aguacate Hass machacado al momento, jitomate riñón, cebolla morada y totopos de maíz azul.',
    maridaje:'🍹 Agua de jamaica · 🍺 Cerveza artesanal' },
  { id:5, name:'Tacos al Pastor', cat:'Platos fuertes', price:85, emoji:'🌮',
    photo: U+'photo-1551504734-5ee1c4a1479b?q=80&w=800&auto=format&fit=crop',
    chips:['🥩 Cerdo','🍍 Piña asada','🌿 Cilantro'], spice:2, kcal:320, chef:false, orders:52, active:true,
    desc:'Cerdo marinado en achiote 24 h, piña asada al trompo, cebolla y cilantro en tortilla nixtamalizada.',
    maridaje:'🍺 Cerveza oscura · 🍹 Agua de horchata' },
  { id:6, name:'Mole Negro de la Casa', cat:'Platos fuertes', price:265, emoji:'🍗',
    photo: U+'photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop',
    chips:['🌶️ Chilhuacle','🍫 Cacao','🧄 Ajo'], spice:1, kcal:510, chef:true, orders:24, active:true,
    desc:'32 ingredientes, 3 días de preparación. Pollo de rancho, arroz rojo y tortillas recién hechas.',
    maridaje:'🍷 Pinot noir · 🥃 Mezcal tobalá' },
  { id:7, name:'Esquites con Tuétano', cat:'Entradas', price:110, emoji:'🌽',
    photo: U+'photo-1476224203421-9ac39bcb3327?q=80&w=800&auto=format&fit=crop',
    chips:['🌽 Maíz criollo','🧀 Cotija','🌶️ Chile de árbol'], spice:2, kcal:290, chef:false, orders:33, active:true,
    desc:'Maíz criollo salteado en mantequilla de epazote, tuétano rostizado y queso Cotija añejo.',
    maridaje:'🍺 Cerveza ámbar · 🍹 Mezcalita de maracuyá' },
  { id:8, name:'Tres Leches de Fresa', cat:'Postres', price:115, emoji:'🍰',
    photo: U+'photo-1565958011703-44f9829ba187?q=80&w=800&auto=format&fit=crop',
    chips:['🥛 Lácteo','🍓 Fresa','🌾 Gluten'], spice:0, kcal:380, chef:false, orders:19, active:true,
    desc:'Bizcocho de vainilla bañado en tres leches, fresas maceradas y crema batida de rancho.',
    maridaje:'☕ Café de olla · 🥂 Moscato' },
  { id:9, name:'Agua de Jamaica', cat:'Bebidas', price:45, emoji:'🌺',
    photo: U+'photo-1556679343-c7306c1976bc?q=80&w=800&auto=format&fit=crop',
    chips:['🌺 Flor de jamaica','🌱 Vegano'], spice:0, kcal:90, chef:false, orders:44, active:true,
    desc:'Infusión fría de flor de jamaica de Ayoquezco, endulzada con piloncillo.',
    maridaje:'—' },
  { id:10, name:'Mezcal de la Casa', cat:'Bebidas', price:140, emoji:'🥃',
    photo: U+'photo-1514362545857-3bc16c4c7d1b?q=80&w=800&auto=format&fit=crop',
    chips:['🥃 Espadín','🍊 Naranja con sal de gusano'], spice:0, kcal:110, chef:false, orders:29, active:false,
    desc:'Mezcal espadín joven de pequeño productor. Servido con naranja y sal de gusano.',
    maridaje:'—' },
];
const CATS = ['Para ti','Todas','Entradas','Platos fuertes','Postres','Bebidas'];

// Sesión grupal — Tú + 3
const GROUP = [
  { id:'tu',    name:'Tú',    emoji:'🙂', photo: U+'photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop', dishes:[] },
  { id:'ana',   name:'Ana',   emoji:'👩', photo: U+'photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop', dishes:[1,9] },
  { id:'diego', name:'Diego', emoji:'👨', photo: U+'photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop', dishes:[5,4] },
  { id:'sofia', name:'Sofía', emoji:'👧', photo: U+'photo-1438761681033-6461ffad8d80?q=80&w=300&auto=format&fit=crop', dishes:[2,8] },
];

// Mesero
const WAITER = {
  name:'Carlos Ramírez', emoji:'🧑‍💼', rating:4.8, reviews:214, years:6,
  photo: U+'photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
  languages:['Español','Inglés'], specialties:['Vinos','Mezcal','Mariscos','Grupos grandes'],
  history:[
    { rest:'La Ceiba', role:'Mesero senior', period:'2024 — hoy', rating:4.8 },
    { rest:'Corazón de Maguey', role:'Mesero', period:'2022 — 2024', rating:4.7 },
    { rest:'Café Toscano', role:'Runner → Mesero', period:'2020 — 2022', rating:4.5 },
  ],
  reviewsList:[
    { who:'Mesa 12 · hoy', stars:5, tags:['Atento','Conocedor'], text:'Nos recomendó el maridaje perfecto para el mole.' },
    { who:'Mesa 4 · ayer', stars:5, tags:['Eficiente'], text:'Rapidísimo aun con el lugar lleno.' },
    { who:'Mesa 9 · lun 4 may', stars:4, tags:['Atento'], text:'Muy amable con los niños.' },
  ],
};
const TEAM = [
  { id:1, name:'Carlos Ramírez', emoji:'🧑‍💼', photo: WAITER.photo, mesas:8, propinas:340, sat:4.8, tags:['Atento','Eficiente'], top:true,  estado:'activo' },
  { id:2, name:'Mariana López',  emoji:'👩‍🦰', photo: U+'photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop', mesas:6, propinas:280, sat:4.6, tags:['Conocedora','Atenta'], top:false, estado:'activo' },
  { id:3, name:'Luis Mendoza',   emoji:'👨‍🍳', photo: U+'photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop', mesas:5, propinas:195, sat:4.3, tags:['Eficiente'], top:false, estado:'activo' },
  { id:4, name:'Paola Estrada',  emoji:'👩', photo:'', mesas:0, propinas:0, sat:4.5, tags:['Atenta'], top:false, estado:'inactivo' },
];

// Mesas del mesero por escenario (tweak) — totales derivados de PEDIDO_BASE
const mesasEscenario = (esc) => {
  const base = [
    { n:3,  pax:0, min:0,  estado:'libre',  total:0 },
    { n:5,  pax:4, min:38, estado:'activa', total:totalDeMesa(5),  fase:'Platos servidos' },
    { n:7,  pax:4, min:22, estado:'activa', total:totalDeMesa(7),  fase:'Orden en cocina', grupo:true },
    { n:9,  pax:2, min:71, estado:'pagada', total:totalDeMesa(9),  propina:Math.round(totalDeMesa(9)*0.15), fase:'Por limpiar' },
    { n:12, pax:3, min:35, estado:'alerta', total:totalDeMesa(12), fase:'Demorada' },
    { n:15, pax:0, min:0,  estado:'libre',  total:0 },
  ];
  if (esc === 'Tranquilo') return base.map(m => [5,7].includes(m.n) ? m : {...m, pax:0, min:0, estado:'libre', total:0, propina:0, fase:undefined, grupo:m.grupo});
  if (esc === 'Hora pico') return base.map(m => m.estado==='libre'
    ? { ...m, pax:m.n===3?2:5, min:m.n===3?4:12, estado: m.n===15?'alerta':'activa', total:totalDeMesa(m.n), fase: m.n===15?'Demorada':'Orden en cocina' }
    : m.n===9 ? {...m, estado:'alerta', fase:'Llamó al mesero', min:80 } : m);
  return base;
};

// Asignación mesero ↔ mesa — compartida por mesero, capitán y admin
const ASIGN_MESAS = { 3:'Mariana López', 5:'Carlos Ramírez', 7:'Carlos Ramírez', 9:'Carlos Ramírez', 12:'Mariana López', 15:'Luis Mendoza' };

// Pedidos derivados del MISMO escenario — una sola fuente de verdad para las 3 apps
const PEDIDO_BASE = {
  3:  { items:['2× Esquites con Tuétano','1× Guacamole de Molcajete'] },
  5:  { items:['2× Langostinos al Ajillo','1× Guacamole de Molcajete'] },
  7:  { items:['1× Costilla de Res 12 h','1× Aguachile Verde','2× Agua de Jamaica'], grupo:true, alergias:{ 'Costilla de Res 12 h':'Gluten' } },
  9:  { items:['1× Mole Negro de la Casa','2× Tres Leches de Fresa'] },
  12: { items:['3× Tacos al Pastor'], alergias:{ 'Tacos al Pastor':'Mariscos' } },
  15: { items:['2× Mezcal de la Casa','1× Agua de Jamaica'] },
};
// Items de una mesa con precio real del menú — misma orden en mesa, detalle y pedido
const itemsDeMesa = (n) => ((PEDIDO_BASE[n] || {}).items || []).map(s => {
  const mm = s.match(/^(\d+)×\s*(.+)$/);
  const q = mm ? +mm[1] : 1, name = mm ? mm[2] : s;
  const d = MENU_SEED.find(x => x.name === name);
  return { n:name, q, precio: d ? d.price : 0, alergia: ((PEDIDO_BASE[n]||{}).alergias||{})[name] };
});
const totalDeMesa = (n) => itemsDeMesa(n).reduce((s,it) => s + it.q*it.precio, 0);
const pedidosEscenario = (esc) => mesasEscenario(esc)
  .filter(m => m.estado !== 'libre')
  .map(m => {
    let estado = 'en cocina', demorado = false, llamo = false;
    if (m.estado === 'pagada') estado = 'pagada';
    else if (m.fase === 'Platos servidos') estado = 'servida';
    else if (m.fase === 'Demorada') demorado = true;
    else if (m.fase === 'Llamó al mesero') { estado = 'servida'; llamo = true; }
    else if (m.min <= 5) estado = 'pendiente';
    const b = PEDIDO_BASE[m.n] || { items:[] };
    return { id:m.n, lugar:`Mesa ${m.n}`, icon:'table_restaurant', pax:m.pax, min:m.min, estado, demorado, llamo,
      grupo:b.grupo, alergias:b.alergias, propina: estado==='pagada' ? (m.propina || Math.round(m.total*0.15)) : 0,
      items:b.items, total:m.total, mesero: ASIGN_MESAS[m.n] };
  });

// Pedidos (mesero + admin)
const PEDIDOS_SEED = [
  { id:101, mesa:7,  items:[{n:'Costilla de Res 12 h',q:1},{n:'Aguachile Verde',q:1},{n:'Agua de Jamaica',q:2}], total:565, estado:'en cocina', pax:4, min:8,  mesero:'Carlos Ramírez' },
  { id:102, mesa:5,  items:[{n:'Langostinos al Ajillo',q:2},{n:'Guacamole de Molcajete',q:1}], total:855, estado:'servido', pax:4, min:22, mesero:'Carlos Ramírez' },
  { id:103, mesa:12, items:[{n:'Tacos al Pastor',q:3}], total:255, estado:'demorado', pax:3, min:35, mesero:'Mariana López' },
  { id:104, mesa:9,  items:[{n:'Tres Leches de Fresa',q:2},{n:'Mole Negro de la Casa',q:1}], total:495, estado:'pagada', pax:2, min:71, mesero:'Carlos Ramírez' },
  { id:105, mesa:15, items:[{n:'Esquites con Tuétano',q:2},{n:'Guacamole de Molcajete',q:1}], total:315, estado:'en cocina', pax:3, min:4, mesero:'Luis Mendoza' },
];

const DEVICES_SEED = [
  { id:1, name:'iPad Barra — Recepción', tipo:'Del restaurante', owner:'Compartida · PIN', sesion:'Carlos Ramírez', last:'Activa ahora', estado:'autorizado', icon:'tablet_mac' },
  { id:2, name:'iPad Terraza', tipo:'Del restaurante', owner:'Compartida · PIN', sesion:'Mariana López', last:'Activa ahora', estado:'autorizado', icon:'tablet_mac' },
  { id:3, name:'iPhone 15 de Carlos', tipo:'Personal de mesero', owner:'Carlos Ramírez', last:'Activa ahora', estado:'autorizado', icon:'smartphone' },
  { id:4, name:'Galaxy S24 de Mariana', tipo:'Personal de mesero', owner:'Mariana López', last:'hace 12 min', estado:'autorizado', icon:'smartphone' },
  { id:5, name:'iPhone 13 de Luis', tipo:'Personal de mesero', owner:'Luis Mendoza', last:'ayer', estado:'bloqueado', icon:'smartphone' },
];

const SALES_HOURS = [9,10,11,12,13,14,15,16,17,18,19,20,21,22];
const SALES_DATA  = [800,1200,1800,3200,2400,1900,1500,2200,3800,4200,3600,2800,2100,1400];

// ── MARCOS DE DISPOSITIVO ──────────────────────────────────
const useFit = (w, h, pad=40) => {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const availH = window.innerHeight - pad*2 - 64;
      const availW = window.innerWidth - pad*2;
      setScale(Math.min(1, availH / h, availW / w));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [w, h, pad]);
  return scale;
};

const PhoneFrame = ({ children, statusDark=false }) => {
  const scale = useFit(390, 844, 16);
  return (
    <div style={{ transform:`scale(${scale})`, transformOrigin:'center center', flexShrink:0 }}>
      <div style={{ width:390, height:844, background:C.surface, borderRadius:54,
        overflow:'hidden', position:'relative',
        boxShadow:'0 48px 100px rgba(0,0,0,0.65), 0 0 0 11px #100C0A, 0 0 0 13px #3A322D' }}>
        {children}
        <StatusBar dark={statusDark}/>
        {/* Dynamic island */}
        <div style={{ position:'absolute', top:11, left:'50%', transform:'translateX(-50%)',
          width:118, height:34, borderRadius:9999, background:'#0A0806', zIndex:70 }}/>
        {/* Home indicator */}
        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
          width:130, height:5, borderRadius:9999, background: statusDark ? 'rgba(255,255,255,0.5)' : 'rgba(29,28,23,0.3)', zIndex:70 }}/>
      </div>
    </div>
  );
};

const DesktopFrame = ({ children }) => {
  const scale = useFit(1280, 832, 16);
  return (
    <div style={{ transform:`scale(${scale})`, transformOrigin:'center center', flexShrink:0 }}>
      <div style={{ width:1280, height:832, borderRadius:20, overflow:'hidden', position:'relative',
        boxShadow:'0 48px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }}>
        {/* Browser chrome */}
        <div style={{ height:44, background:'#2A2320', display:'flex', alignItems:'center', padding:'0 16px', gap:8 }}>
          <div style={{ display:'flex', gap:7 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width:11, height:11, borderRadius:9999, background:c }}/>)}
          </div>
          <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
            <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:8, padding:'5px 18px',
              fontSize:12, color:'rgba(255,255,255,0.55)', display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="lock" size={11} color="rgba(255,255,255,0.4)"/> admin.carta.mx/la-ceiba
            </div>
          </div>
          <div style={{ width:47 }}/>
        </div>
        <div style={{ height:788, background:C.surface, position:'relative', overflow:'hidden' }}>{children}</div>
      </div>
    </div>
  );
};

// ── HELPERS ────────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, type='text', textarea, style={} }) => (
  <div style={{ marginBottom:14, ...style }}>
    <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:6 }}>{label}</div>
    {textarea
      ? <textarea value={value} onChange={e=>onChange && onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width:'100%', background:C.white, border:'none', borderRadius:16, padding:'13px 16px',
            fontSize:15, color:C.charcoal, resize:'none', boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}/>
      : <input type={type} value={value} onChange={e=>onChange && onChange(e.target.value)} placeholder={placeholder}
          style={{ width:'100%', background:C.white, border:'none', borderRadius:16, padding:'13px 16px',
            fontSize:15, color:C.charcoal, boxShadow:'0 2px 8px rgba(29,28,23,0.05)' }}/>
    }
  </div>
);

const QRBlock = ({ size=96, dark=C.charcoal, light='transparent', seed=7 }) => {
  const cells = useMemo(() => {
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    return Array.from({length:121}).map(() => rnd() > 0.52);
  }, [seed]);
  return (
    <div style={{ width:size, height:size, display:'grid', gridTemplateColumns:'repeat(11,1fr)', gap:size*0.012 }}>
      {cells.map((on,i) => {
        const r = Math.floor(i/11), c = i%11;
        const corner = (r<3&&c<3)||(r<3&&c>7)||(r>7&&c<3);
        return <div key={i} style={{ background: corner||on ? dark : light, borderRadius:1 }}/>;
      })}
    </div>
  );
};

// ── PERMISOS DEL MESERO (definidos por el capitán) ─────────
const WAITER_PERMS_DEFAULT = { addItems:true, removeItems:true, editQty:true, editPrice:false };

// ── MARCAS DE PAGO — estilizadas con el DS (sin logos oficiales) ─
const PayMark = ({ id, size=1 }) => {
  const box = { width:44*size, height:30*size, borderRadius:8, display:'flex', alignItems:'center',
    justifyContent:'center', flexShrink:0, overflow:'hidden', position:'relative' };
  if (id === 'visa') return (
    <div style={{ ...box, background:gradVino }}>
      <div style={{ position:'absolute', top:6*size, left:6*size, right:6*size, height:5*size,
        borderRadius:2, background:'rgba(253,195,77,0.85)' }}/>
      <div style={{ position:'absolute', bottom:6*size, left:6*size, width:14*size, height:3*size,
        borderRadius:2, background:'rgba(255,255,255,0.55)' }}/>
    </div>
  );
  if (id === 'mc') return (
    <div style={{ ...box, background:C.surfaceHigh }}>
      <div style={{ width:14*size, height:14*size, borderRadius:9999, background:C.primary, opacity:0.9 }}/>
      <div style={{ width:14*size, height:14*size, borderRadius:9999, background:C.dorado, marginLeft:-5*size, opacity:0.9 }}/>
    </div>
  );
  if (id === 'transfer' || id === 'spei') return (
    <div style={{ ...box, background:gradDorado }}>
      <Icon name="sync_alt" size={18*size} color="#fff"/>
    </div>
  );
  return (
    <div style={{ ...box, background:C.primaryCont }}>
      <Icon name="payments" size={18*size} color="#fff"/>
    </div>
  );
};

// ── COMPLEMENTOS RECOMENDADOS (Entradas / Platos fuertes) ───
const Complementos = ({ cat, collapsible=false }) => {
  const [open, setOpen] = useState(!collapsible);
  const [bebidas, setBebidas] = useState([]);
  const [postres, setPostres] = useState([]);
  const [ings, setIngs] = useState(['Tortillas hechas a mano']);
  const [nuevoIng, setNuevoIng] = useState('');
  if (!['Entradas','Platos fuertes'].includes(cat)) return null;
  const toggle = (list, setList, name) => setList(l => l.includes(name) ? l.filter(x=>x!==name) : [...l, name]);
  const micro = { fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted, margin:'10px 0 7px' };
  const chipStyle = on => ({ border:'none', cursor:'pointer', borderRadius:9999, padding:'7px 13px', fontSize:12,
    fontWeight:600, fontFamily:sans, background: on ? gradVino : C.surfaceLow, color: on ? 'white' : C.charcoal,
    transition:'all 160ms' });
  if (!open) return (
    <button onClick={() => setOpen(true)} {...pressFx} style={{ display:'flex', alignItems:'center', gap:7,
      background:'none', border:'none', cursor:'pointer', padding:'8px 0 0', fontSize:12, fontWeight:700,
      color:C.dorado, fontFamily:sans }}>
      <Icon name="add_circle" size={15} color={C.dorado}/> Complementos recomendados (opcional)
    </button>
  );
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:13, fontWeight:600, color:C.muted }}>
          Complementos recomendados <span style={{ color:C.outline, fontWeight:500 }}>(Opcional)</span>
        </span>
        {collapsible && <button onClick={() => setOpen(false)} style={{ background:'none', border:'none',
          cursor:'pointer', fontSize:11.5, fontWeight:700, color:C.muted, fontFamily:sans }}>Ocultar</button>}
      </div>
      <div style={{ background:C.surfaceLow, borderRadius:18, padding:'4px 15px 13px' }}>
        <div style={micro}>Bebidas</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {MENU_SEED.filter(d => d.cat==='Bebidas').map(d => (
            <button key={d.id} onClick={() => toggle(bebidas, setBebidas, d.name)} {...pressFx}
              style={chipStyle(bebidas.includes(d.name))}>{bebidas.includes(d.name) ? '✓ ' : ''}{d.name}</button>
          ))}
        </div>
        <div style={micro}>Postres</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {MENU_SEED.filter(d => d.cat==='Postres').map(d => (
            <button key={d.id} onClick={() => toggle(postres, setPostres, d.name)} {...pressFx}
              style={chipStyle(postres.includes(d.name))}>{postres.includes(d.name) ? '✓ ' : ''}{d.name}</button>
          ))}
        </div>
        <div style={micro}>Ingredientes</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:9 }}>
          {ings.map(ing => (
            <span key={ing} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white',
              borderRadius:9999, padding:'6px 8px 6px 13px', fontSize:12, fontWeight:600, color:C.charcoal }}>
              {ing}
              <span onClick={() => setIngs(l => l.filter(x=>x!==ing))} style={{ cursor:'pointer', display:'inline-flex' }}>
                <Icon name="close" size={13} color={C.outline}/>
              </span>
            </span>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={nuevoIng} onChange={e => setNuevoIng(e.target.value)} placeholder="Agregar ingrediente…"
            onKeyDown={e => { if (e.key==='Enter' && nuevoIng.trim()) { setIngs(l => [...l, nuevoIng.trim()]); setNuevoIng(''); } }}
            style={{ flex:1, background:'white', border:'none', borderRadius:12, padding:'9px 13px', fontSize:12.5, color:C.charcoal }}/>
          <button onClick={() => { if (nuevoIng.trim()) { setIngs(l => [...l, nuevoIng.trim()]); setNuevoIng(''); } }}
            {...pressFx} style={{ border:'none', cursor:'pointer', borderRadius:12, width:36, height:36,
            background:gradVino, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="add" size={18} color="white"/>
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, {
  C, gradVino, gradDorado, serif, sans, fmt, pressFx,
  Icon, Btn, IconBtn, Chip, ChefBadge, Toggle, Stars, Photo, Avatar, Grip, StatusBar, Confetti,
  RESTAURANT, IMGS, MENU_SEED, CATS, GROUP, WAITER, TEAM, mesasEscenario, PEDIDOS_SEED, DEVICES_SEED,
  SALES_HOURS, SALES_DATA, useFit, PhoneFrame, DesktopFrame, Field, QRBlock, PayMark, WAITER_PERMS_DEFAULT, Complementos,
  ASIGN_MESAS, PEDIDO_BASE, pedidosEscenario, itemsDeMesa, totalDeMesa,
});
