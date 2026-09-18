// ═══════════════════════════════════════════════════════════
// COMENSAL · Extra — P22 perfil del comensal
// ═══════════════════════════════════════════════════════════

const PerfilComensal = ({ go, order }) => {
  const prefs = ['🥦 Vegetariano','🌶️ Picante medio','🧀 Queso','🍋 Cítricos','🍫 Chocolate'];
  const historial = [
    { id:1, stars:5, when:'Hoy · La Ceiba' },
    { id:2, stars:4, when:'Hoy · La Ceiba' },
    { id:8, stars:5, when:'12 jun · Corazón de Maguey' },
  ].map(h => ({ ...h, dish: MENU_SEED.find(m => m.id === h.id) }));
  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div className="hide-scroll" style={{ flex:1, overflowY:'auto' }}>
        {/* Hero */}
        <div style={{ background:gradVino, borderRadius:'0 0 40px 40px', padding:'70px 24px 24px', textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center' }}>
            <Avatar person={GROUP[0]} size={92} ring/>
          </div>
          <div style={{ fontFamily:serif, fontSize:26, color:'white', marginTop:10 }}>Alex Rivera</div>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.65)', marginTop:2 }}>alex@correo.mx · miembro desde jul 2026</div>
          <div style={{ display:'flex', justifyContent:'center', gap:7, marginTop:12, flexWrap:'wrap' }}>
            <Chip tone="glass" style={{ fontSize:12 }}><Icon name="star" size={13} color={C.doradoLight} fill/> Carta+ · prueba activa</Chip>
            <Chip tone="glass" style={{ fontSize:12 }}>12 platillos probados</Chip>
          </div>
        </div>

        <div style={{ padding:'20px 24px 0' }}>
          {/* Preferencias */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
            <span style={{ fontFamily:serif, fontSize:18, color:C.primary }}>Mis preferencias</span>
            <button onClick={() => go('p18b')} style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:700, color:C.dorado, fontFamily:sans }}>Editar</button>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:22 }}>
            {prefs.map(p => <Chip key={p} tone="vino">{p}</Chip>)}
          </div>

          {/* Historial */}
          <div style={{ fontFamily:serif, fontSize:18, color:C.primary, marginBottom:10 }}>Historial de platillos</div>
          {historial.map(h => (
            <div key={h.when + h.id} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:20,
              padding:'10px 14px 10px 10px', marginBottom:9, boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
              <Photo src={h.dish.photo} emoji={h.dish.emoji} radius={13} emojiSize={22} style={{ width:50, height:50, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.charcoal }}>{h.dish.name}</div>
                <div style={{ fontSize:11.5, color:C.muted, marginTop:1 }}>{h.when}</div>
              </div>
              <Stars value={h.stars} size={14} gap={2}/>
            </div>
          ))}

          {/* Carta+ */}
          <div style={{ background:'rgba(184,134,11,0.1)', borderRadius:22, padding:'14px 16px', margin:'16px 0 10px',
            display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:14, background:gradDorado, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="star" size={20} color="white" fill/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#8A6508' }}>Carta+ · 24 días de prueba</div>
              <div style={{ fontSize:12, color:C.muted }}>Sommelier AR y eventos exclusivos.</div>
            </div>
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:700,
              color:'#8A6508', fontFamily:sans }}>Administrar</button>
          </div>

          {/* Invitar */}
          <div style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:22,
            padding:'14px 16px', boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
            <div style={{ width:42, height:42, borderRadius:14, background:C.surfaceLow, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:19 }}>🎁</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>Invita y gana $50</div>
              <div style={{ fontSize:12, color:C.muted }}>Para ambos, en su próxima comida.</div>
            </div>
            <IconBtn name="ios_share" size={36} iconSize={17}/>
          </div>

          <button style={{ display:'block', margin:'18px auto 0', background:'none', border:'none', cursor:'pointer',
            fontSize:13, fontWeight:600, color:C.muted, fontFamily:sans }}>Cerrar sesión</button>
          <div style={{ height:120 }}/>
        </div>
      </div>

      {/* Nav inferior */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(254,249,241,0.92)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'0px -12px 32px rgba(29,28,23,0.08)',
        paddingBottom:14 }}>
        <ComensalNav active="perfil" go={go} order={order}/>
      </div>
    </div>
  );
};

Object.assign(window, { PerfilComensal });
