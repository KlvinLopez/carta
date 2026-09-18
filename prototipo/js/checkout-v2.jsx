// ═══════════════════════════════════════════════════════════
// P05 v2 · CHECKOUT — método de pago + invitar a un amigo
// ═══════════════════════════════════════════════════════════
const { useState } = React;

const PAY_METHODS = [
  { id:'visa', name:'Tarjeta de Crédito', sub:'Visa ···· 4521' },
  { id:'mc',   name:'Tarjeta de Débito',  sub:'Mastercard ···· 8830' },
  { id:'transfer', name:'Transferencia SPEI', sub:'CLABE interbancaria al confirmar', manual:true },
  { id:'cash', name:'Efectivo', sub:'Le pagas directo a Carlos', manual:true },
];

const secTitle = { fontFamily:serif, fontSize:19, color:C.primary, margin:'22px 0 10px' };
const microLabel = { fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted };

const CheckoutV2 = ({ go, order }) => {
  const items = order.map(o => ({ ...MENU_SEED.find(m=>m.id===o.id), qty:o.qty }));
  const sub = items.reduce((s,d) => s + d.price*d.qty, 0);
  const [orderOpen, setOrderOpen] = useState(false);
  const [tip, setTip] = useState(15);            // número | 0 (sin) | 'otra'
  const [customTip, setCustomTip] = useState('');
  const [tags, setTags] = useState(['Atento']);
  const [covers, setCovers] = useState({});   // { friendId: { mode:'100'|'half'|'custom', custom:'' } }
  const [dishRatings, setDishRatings] = useState({});
  const [dishNotes, setDishNotes] = useState({});
  const [method, setMethod] = useState(PAY_METHODS[0]);
  const [showMethods, setShowMethods] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpCalled, setHelpCalled] = useState(null);
  const nItems = items.reduce((s,d) => s + d.qty, 0);

  const tipAmt = tip==='otra' ? (+customTip || 0) : Math.round(sub * tip / 100);
  const friends = GROUP.filter(p => p.id!=='tu').map(p => ({
    ...p, consumo: p.dishes.reduce((s,id) => s + (MENU_SEED.find(m=>m.id===id)?.price||0), 0),
    dishesFull: p.dishes.map(id => MENU_SEED.find(m=>m.id===id)),
  }));
  const coverAmt = f => {
    const c = covers[f.id];
    if (!c) return 0;
    if (c.mode === '100') return f.consumo;
    if (c.mode === 'half') return Math.round(f.consumo / 2);
    return Math.min(f.consumo, +c.custom || 0);
  };
  const invitedFriends = friends.filter(f => covers[f.id]);
  const inviteAmt = invitedFriends.reduce((s,f) => s + coverAmt(f), 0);
  const yoInvito = invitedFriends.length === friends.length && invitedFriends.every(f => covers[f.id].mode === '100');
  const toggleFriend = id => setCovers(c => {
    const n = {...c};
    if (n[id]) delete n[id]; else n[id] = { mode:'100', custom:'' };
    return n;
  });
  const setYoInvito = () => setCovers(yoInvito ? {} : Object.fromEntries(friends.map(f => [f.id, { mode:'100', custom:'' }])));
  const total = sub + tipAmt + inviteAmt;
  const toggleTag = t => setTags(x => x.includes(t) ? x.filter(y=>y!==t) : [...x, t]);

  return (
    <div className="screen" style={{ background:C.surface, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div style={{ padding:'58px 20px 10px', flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
        <IconBtn name="arrow_back" onClick={() => go('group')}/>
        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontFamily:serif, fontSize:22, color:C.primary }}>Checkout</div>
          <div style={{ ...microLabel, fontSize:10 }}>Mesa {RESTAURANT.mesa} · {RESTAURANT.name}</div>
        </div>
        <IconBtn name="room_service" size={40} iconSize={19} onClick={() => setShowHelp(true)}/>
      </div>

      <div className="hide-scroll" style={{ flex:1, overflowY:'auto', padding:'2px 22px 0' }}>
        {/* Mi orden — colapsable */}
        <div style={{ background:'white', borderRadius:24, boxShadow:'0 4px 16px rgba(79,23,40,0.06)', overflow:'hidden' }}>
          <div onClick={() => setOrderOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:12,
            padding:'14px 18px', cursor:'pointer' }}>
            <div style={{ width:40, height:40, borderRadius:9999, background:gradVino, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="restaurant" size={18} color="white"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.charcoal }}>Mi orden</div>
              <div style={{ fontSize:12, color:C.muted }}>{nItems} platillo{nItems===1?'':'s'}</div>
            </div>
            <span style={{ fontFamily:serif, fontSize:19, color:C.primary }}>{fmt(sub)}</span>
            <Icon name="expand_more" size={20} color={C.outline}
              style={{ transform: orderOpen ? 'rotate(180deg)' : 'none', transition:'transform 250ms' }}/>
          </div>
          {orderOpen && (
            <div className="sheet-up" style={{ padding:'0 18px 14px', animationDuration:'220ms' }}>
              {items.map(d => (
                <div key={d.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0',
                  borderTop:'1px solid rgba(91,74,61,0.07)' }}>
                  <span style={{ fontSize:13.5, color:C.charcoal }}>{d.qty>1?`${d.qty}× `:''}{d.name}</span>
                  <span style={{ fontSize:13.5, fontWeight:600, color:C.muted }}>{fmt(d.price*d.qty)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mesero + propina */}
        <div style={{ background:'white', borderRadius:26, padding:'20px 20px 16px', marginTop:14,
          boxShadow:'0 4px 16px rgba(79,23,40,0.06)', textAlign:'center' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <Avatar person={{ name:'Carlos', emoji:'🧑‍💼', photo:WAITER.photo }} size={62} ring/>
            <div style={{ fontSize:15.5, fontWeight:700, color:C.charcoal, marginTop:12 }}>Carlos R.</div>
            <div style={{ fontSize:12, fontStyle:'italic', color:C.muted, marginTop:2 }}>"Gracias por permitirme guiar su experiencia hoy"</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginTop:14 }}>
            {[[10,'10%'],[15,'15%'],[20,'20%'],[0,'Sin propina'],['otra','Otra']].map(([v,l]) => {
              const on = tip === v;
              return (
                <button key={l} onClick={() => setTip(v)} {...pressFx} style={{ border:'none', cursor:'pointer',
                  borderRadius:9999, padding:'9px 17px', fontSize:13.5, fontWeight:700, fontFamily:sans,
                  background: on ? gradVino : C.surfaceLow, color: on ? 'white' : C.charcoal,
                  boxShadow: on ? '0 6px 16px rgba(79,23,40,0.25)' : 'none', transition:'all 180ms' }}>{l}</button>
              );
            })}
          </div>
          {tip === 'otra' && (
            <input autoFocus value={customTip} onChange={e => setCustomTip(e.target.value.replace(/\D/g,''))}
              placeholder="Monto en MXN" style={{ marginTop:10, width:150, textAlign:'center', background:C.surfaceLow,
                border:'none', borderRadius:14, padding:'10px 12px', fontSize:14, fontWeight:600, color:C.charcoal }}/>
          )}
          <div style={{ ...microLabel, marginTop:16 }}>Monto de propina</div>
          <div style={{ fontFamily:serif, fontSize:30, color:C.primary, marginTop:2 }}>{fmt(tipAmt)}</div>
          <div style={{ ...microLabel, margin:'16px 0 9px' }}>¿Qué tal el servicio?</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center' }}>
            {['Atento','Eficiente','Conocedor','Amable','Rápido','Recomendó bien'].map(t => (
              <button key={t} onClick={() => toggleTag(t)} {...pressFx} style={{ border:'none', cursor:'pointer',
                borderRadius:9999, padding:'7px 14px', fontSize:12, fontWeight:700, letterSpacing:'0.03em', fontFamily:sans,
                background: tags.includes(t) ? 'rgba(184,134,11,0.16)' : C.surfaceLow,
                color: tags.includes(t) ? '#8A6508' : C.muted, transition:'all 160ms' }}>
                {tags.includes(t) ? '✓ ' : ''}{t}
              </button>
            ))}
          </div>
          <input placeholder="Escribe un mensaje de agradecimiento…" style={{ width:'100%', marginTop:12,
            background:C.surfaceLow, border:'none', borderRadius:16, padding:'12px 15px', fontSize:13, color:C.charcoal }}/>
        </div>

        {/* Invitar a alguien */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
          <div style={secTitle}>¿Quién invita?</div>
          <button onClick={setYoInvito} {...pressFx} style={{ display:'flex', alignItems:'center', gap:6,
            border:'none', cursor:'pointer', borderRadius:9999, padding:'7px 14px', fontSize:12.5, fontWeight:700,
            fontFamily:sans, background: yoInvito ? gradDorado : 'rgba(184,134,11,0.14)',
            color: yoInvito ? 'white' : '#8A6508', transition:'all 200ms' }}>
            {yoInvito && <Icon name="check" size={14} color="white" weight={700}/>}
            Yo invito
          </button>
        </div>
        <div style={{ fontSize:12.5, color:C.muted, marginTop:-6, marginBottom:10 }}>
          Elige a uno o varios acompañantes, o asume la cuenta completa.
        </div>
        {friends.map(f => {
          const cover = covers[f.id];
          const on = !!cover;
          const amt = coverAmt(f);
          return (
            <div key={f.id} style={{ background: on ? 'white' : C.surfaceLow, borderRadius:22, marginBottom:10,
              boxShadow: on ? '0 8px 24px rgba(79,23,40,0.1)' : 'none', overflow:'hidden', transition:'all 250ms' }}>
              <div onClick={() => toggleFriend(f.id)} style={{ display:'flex', alignItems:'center',
                gap:12, padding:'12px 16px', cursor:'pointer' }}>
                <Avatar person={f} size={42}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{f.name}</div>
                  <div style={{ ...microLabel, fontSize:10 }}>Consumo: {fmt(f.consumo)}</div>
                </div>
                <div style={{ width:24, height:24, borderRadius:9999, display:'flex', alignItems:'center',
                  justifyContent:'center', background: on ? C.primary : C.surfaceHighest, transition:'background 200ms' }}>
                  {on && <Icon name="check" size={15} color="white" weight={700}/>}
                </div>
              </div>
              {on && (
                <div className="sheet-up" style={{ padding:'0 16px 14px', animationDuration:'240ms' }}>
                  {f.dishesFull.map(d => (
                    <div key={d.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0' }}>
                      <span style={{ fontSize:13, color:C.muted }}>{d.name}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:C.muted }}>{fmt(d.price)}</span>
                    </div>
                  ))}
                  <div style={{ ...microLabel, margin:'10px 0 8px' }}>¿Cuánto cubres tú?</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[['100','100%'],['half','La mitad'],['custom','Otro monto']].map(([m,l]) => (
                      <button key={m} onClick={() => setCovers(c => ({...c, [f.id]:{...c[f.id], mode:m}}))} {...pressFx}
                        style={{ flex:1, border:'none', cursor:'pointer', borderRadius:14, padding:'10px 0',
                        fontSize:13, fontWeight:700, fontFamily:sans,
                        background: cover.mode===m ? gradVino : C.surfaceLow, color: cover.mode===m ? 'white' : C.charcoal,
                        transition:'all 180ms' }}>{l}</button>
                    ))}
                  </div>
                  {cover.mode === 'custom' && (
                    <input autoFocus value={cover.custom} onChange={e => setCovers(c => ({...c, [f.id]:{...c[f.id], custom:e.target.value.replace(/\D/g,'')}}))}
                      placeholder={`Monto en MXN (máx. ${fmt(f.consumo)})`} style={{ width:'100%', marginTop:10,
                        background:C.surfaceLow, border:'none', borderRadius:14, padding:'11px 13px',
                        fontSize:13.5, fontWeight:600, color:C.charcoal }}/>
                  )}
                  {amt < f.consumo && (
                    <div style={{ display:'flex', gap:8, alignItems:'center', background:'rgba(184,134,11,0.1)',
                      borderRadius:14, padding:'9px 12px', marginTop:10 }}>
                      <Icon name="info" size={15} color={C.dorado}/>
                      <span style={{ fontSize:12, color:'#6B5410' }}>
                        Se resta de su cuenta: {f.name} pagará {fmt(f.consumo - amt)} en su teléfono.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Califica los platillos */}
        <div style={secTitle}>Califica tu experiencia</div>
        {items.map(d => (
          <div key={d.id} style={{ background:'white', borderRadius:20, padding:'11px 16px', marginBottom:9,
            boxShadow:'0 2px 10px rgba(29,28,23,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Photo src={d.photo} emoji={d.emoji} radius={11} emojiSize={18} style={{ width:38, height:38, flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:13.5, fontWeight:600, color:C.charcoal }}>{d.name}</span>
              <Stars size={18} gap={3} value={dishRatings[d.id]||0} onChange={v => setDishRatings(r => ({...r, [d.id]:v}))}/>
            </div>
            {(dishRatings[d.id]||0) > 0 && (
              <input className="sheet-up" value={dishNotes[d.id]||''} onChange={e => setDishNotes(n => ({...n, [d.id]:e.target.value}))}
                placeholder="¿Qué te pareció? Cuéntanos más…" style={{ width:'100%', marginTop:10, animationDuration:'220ms',
                  background:C.surfaceLow, border:'none', borderRadius:13, padding:'10px 13px', fontSize:12.5, color:C.charcoal }}/>
            )}
          </div>
        ))}

        {/* Método de pago */}
        <div onClick={() => setShowMethods(true)} style={{ display:'flex', alignItems:'center', gap:13,
          background:'white', borderRadius:22, padding:'14px 18px', marginTop:14, cursor:'pointer',
          boxShadow:'0 4px 16px rgba(79,23,40,0.06)' }}>
          <PayMark id={method.id}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.charcoal }}>{method.name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{method.sub}</div>
          </div>
          <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.08em', color:C.dorado }}>CAMBIAR</span>
        </div>

        {/* Resumen — tarjeta vino */}
        <div style={{ background:gradVino, borderRadius:26, padding:'18px 22px', margin:'14px 0',
          boxShadow:'0 20px 44px rgba(79,23,40,0.3)' }}>
          {[['Mi orden', fmt(sub)], ['Propina', fmt(tipAmt)],
            ...invitedFriends.map(f => [`Invitando a ${f.name}`, fmt(coverAmt(f)), true])].map(([l,v,gold]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
              <span style={{ fontSize:13, color: gold ? C.doradoLight : 'rgba(255,255,255,0.75)' }}>{l}</span>
              <span style={{ fontSize:13, fontWeight:600, color: gold ? C.doradoLight : 'white' }}>{v}</span>
            </div>
          ))}
          <div style={{ height:1, background:'rgba(255,255,255,0.16)', margin:'10px 0 12px' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ ...microLabel, color:'rgba(255,255,255,0.65)' }}>Total final</span>
            <span style={{ fontFamily:serif, fontSize:34, color:'white' }}>{fmt(total)} <span style={{ fontSize:15 }}>MXN</span></span>
          </div>
        </div>
        <div style={{ height:104 }}/>
      </div>

      {/* Barra de pago */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 20px 22px',
        background:'rgba(254,249,241,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        boxShadow:'0px -16px 36px rgba(29,28,23,0.1)' }}>
        <Btn variant="primary" style={{ width:'100%', fontSize:16.5 }} onClick={() => go('success')}>
          Pagar {fmt(total)}
        </Btn>
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:5, marginTop:9 }}>
          <Icon name="lock" size={12} color={C.outline}/>
          <span style={{ ...microLabel, fontSize:9.5, color:C.outline }}>Pago seguro</span>
        </div>
      </div>

      {/* Llamar al mesero / capitán */}
      {showHelp && (
        <div style={{ position:'absolute', inset:0, zIndex:110 }}>
          <div onClick={() => { setShowHelp(false); setHelpCalled(null); }} style={{ position:'absolute', inset:0,
            background:'rgba(29,28,23,0.4)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
          <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:C.surface,
            borderRadius:'32px 32px 0 0', padding:'0 24px 34px', boxShadow:'0px -24px 60px rgba(29,28,23,0.3)' }}>
            <Grip/>
            {helpCalled ? (
              <div className="pop-in" style={{ textAlign:'center', padding:'16px 0 20px' }}>
                <div style={{ width:64, height:64, borderRadius:9999, background:gradVino, margin:'0 auto',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="room_service" size={28} color="white"/>
                </div>
                <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginTop:12 }}>{helpCalled} va en camino</div>
                <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>Te ayudará a aclarar cualquier duda de tu cuenta.</div>
              </div>
            ) : (
              <React.Fragment>
                <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginBottom:2 }}>¿Dudas con tu cuenta?</div>
                <div style={{ fontSize:12.5, color:C.muted, marginBottom:12 }}>Llama a alguien del equipo a tu mesa.</div>
                {[{ n:'Carlos', sub:'Tu mesero', p:{ name:'Carlos', emoji:'🧑‍💼', photo:WAITER.photo } },
                  { n:'Diana', sub:'Capitana de sala', p:CAPTAIN }].map(o => (
                  <div key={o.n} onClick={() => { setHelpCalled(o.n); setTimeout(() => { setShowHelp(false); setHelpCalled(null); }, 1500); }}
                    {...pressFx} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:18,
                    padding:'10px 14px', marginBottom:8, cursor:'pointer', boxShadow:'0 2px 10px rgba(29,28,23,0.05)',
                    transition:'transform 150ms' }}>
                    <Avatar person={o.p} size={42} ring/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14.5, fontWeight:700, color:C.charcoal }}>{o.n}</div>
                      <div style={{ fontSize:12, color:C.muted }}>{o.sub}</div>
                    </div>
                    <Icon name="notifications_active" size={18} color={C.dorado}/>
                  </div>
                ))}
              </React.Fragment>
            )}
          </div>
        </div>
      )}

      {/* Sheet métodos de pago */}
      {showMethods && (
        <div style={{ position:'absolute', inset:0, zIndex:100 }}>
          <div onClick={() => setShowMethods(false)} style={{ position:'absolute', inset:0,
            background:'rgba(29,28,23,0.4)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }}/>
          <div className="sheet-up" style={{ position:'absolute', bottom:0, left:0, right:0, background:C.surface,
            borderRadius:'32px 32px 0 0', padding:'0 22px 34px', boxShadow:'0px -24px 60px rgba(29,28,23,0.3)' }}>
            <Grip/>
            <div style={{ fontFamily:serif, fontSize:20, color:C.charcoal, marginBottom:12 }}>Método de pago</div>
            {PAY_METHODS.map(m => {
              const on = method.id === m.id;
              return (
                <div key={m.id} onClick={() => { setMethod(m); setShowMethods(false); }} style={{ display:'flex',
                  alignItems:'center', gap:13, background: on ? 'white' : 'transparent', borderRadius:18,
                  padding:'12px 14px', cursor:'pointer', boxShadow: on ? '0 4px 14px rgba(79,23,40,0.08)' : 'none' }}>
                  <PayMark id={m.id}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14.5, fontWeight:600, color:C.charcoal }}>{m.name}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{m.sub}</div>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:9999, border:`2px solid ${on ? C.primary : C.surfaceHighest}`,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {on && <div style={{ width:11, height:11, borderRadius:9999, background:C.primary }}/>}
                  </div>
                </div>
              );
            })}
            <button {...pressFx} style={{ display:'flex', alignItems:'center', gap:9, background:'none', border:'none',
              cursor:'pointer', padding:'13px 14px 0', fontSize:13.5, fontWeight:700, color:C.dorado, fontFamily:sans }}>
              <Icon name="add" size={17} color={C.dorado}/> Agregar tarjeta nueva
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { CheckoutV2, PAY_METHODS });
