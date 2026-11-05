import { useState } from "react";

const THEMES = {
  vino: { primary: "#6B2D3E", accent: "#8B3A4F", bg: "#F5F0E8", card: "#FFFFFF", text: "#2D2D2D", muted: "#8B7B6B" },
  verde: { primary: "#3D5A3E", accent: "#4A6E4C", bg: "#F5F0E8", card: "#FFFFFF", text: "#2D2D2D", muted: "#8B7B6B" },
  azul: { primary: "#2C5F7C", accent: "#3A7A9E", bg: "#F5F0E8", card: "#FFFFFF", text: "#2D2D2D", muted: "#8B7B6B" },
  ocre: { primary: "#B8860B", accent: "#D4A017", bg: "#F5F0E8", card: "#FFFFFF", text: "#2D2D2D", muted: "#8B7B6B" },
  cafe: { primary: "#5C3A1E", accent: "#7A4E2D", bg: "#F5F0E8", card: "#FFFFFF", text: "#2D2D2D", muted: "#8B7B6B" },
};

const MENU_ITEMS = [
  { id: 1, name: "Tacos al Pastor", desc: "Cerdo marinado en achiote, piña, cilantro, cebolla. Tortilla de maíz.", price: 85, category: "Plato Fuerte", tags: ["cerdo"], allergens: [], calories: 320, spice: 2, popular: true, safe: "safe" },
  { id: 2, name: "Ensalada César con Pollo", desc: "Lechuga romana, pollo a la plancha, parmesano, crutones, aderezo César.", price: 120, category: "Ensalada", tags: ["pollo", "lácteo"], allergens: ["gluten", "lácteo"], calories: 280, spice: 0, popular: false, safe: "caution" },
  { id: 3, name: "Salmón a la Parrilla", desc: "Filete de salmón, espárragos, puré de papa, salsa de mantequilla.", price: 220, category: "Plato Fuerte", tags: ["pescado", "lácteo"], allergens: ["pescado", "lácteo"], calories: 450, spice: 0, popular: true, safe: "safe" },
  { id: 4, name: "Paella de Mariscos", desc: "Arroz bomba, camarones, mejillones, calamares, azafrán.", price: 280, category: "Plato Fuerte", tags: ["mariscos"], allergens: ["mariscos"], calories: 520, spice: 1, popular: false, safe: "avoid" },
  { id: 5, name: "Guacamole Tradicional", desc: "Aguacate, tomate, cebolla, chile serrano, limón, cilantro.", price: 65, category: "Entrada", tags: ["vegano"], allergens: [], calories: 180, spice: 2, popular: true, safe: "safe" },
  { id: 6, name: "Tiramisú", desc: "Mascarpone, café espresso, soletas, cacao.", price: 95, category: "Postre", tags: ["lácteo", "café"], allergens: ["gluten", "lácteo", "huevo"], calories: 380, spice: 0, popular: false, safe: "caution" },
  { id: 7, name: "Agua de Horchata", desc: "Arroz, canela, vainilla, leche. Refrescante y dulce.", price: 45, category: "Bebida", tags: ["lácteo"], allergens: ["lácteo"], calories: 150, spice: 0, popular: true, safe: "safe" },
  { id: 8, name: "Pozole Rojo", desc: "Caldo de chile guajillo, maíz pozolero, cerdo, lechuga, rábano.", price: 130, category: "Plato Fuerte", tags: ["cerdo"], allergens: [], calories: 410, spice: 3, popular: false, safe: "safe" },
];

const CATEGORIES = ["Todas", "Entrada", "Ensalada", "Plato Fuerte", "Postre", "Bebida"];

const SafeBadge = ({ level }) => {
  const colors = { safe: "#22C55E", caution: "#F59E0B", avoid: "#EF4444" };
  const labels = { safe: "Safe", caution: "Caution", avoid: "Avoid" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: colors[level], background: `${colors[level]}15`, padding: "2px 8px", borderRadius: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[level] }} />
      {labels[level]}
    </span>
  );
};

const SpiceLevel = ({ level }) => {
  if (!level) return null;
  return <span style={{ fontSize: 12 }}>{"🌶️".repeat(level)}</span>;
};

// --- SCREENS ---

const SplashScreen = ({ theme, restaurantName, onScan }) => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: theme.bg, padding: 24, textAlign: "center" }}>
    <div style={{ width: 80, height: 80, borderRadius: 16, background: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="6" width="28" height="36" rx="3" stroke="white" strokeWidth="2.5" fill="none" />
        <path d="M10 6 L24 6 L24 14 L18 10 L10 14 Z" fill="white" opacity="0.6" />
      </svg>
    </div>
    <h1 style={{ fontSize: 28, fontWeight: 700, color: theme.primary, margin: 0, fontFamily: "Georgia, serif" }}>Carta</h1>
    <p style={{ fontSize: 13, color: theme.muted, margin: "4px 0 24px" }}>{restaurantName}</p>
    <button onClick={onScan} style={{ background: theme.primary, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 16px ${theme.primary}40` }}>
      Escanear QR de mesa
    </button>
    <p style={{ fontSize: 11, color: theme.muted, marginTop: 16 }}>Sin descarga. Sin registro. Inmediato.</p>
  </div>
);

const MenuScreen = ({ theme, capa, items, onSelectItem, onRegister, onUpgrade, order, onCallWaiter, groupMembers, onShare }) => {
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [search, setSearch] = useState("");

  const filtered = items.filter(item => {
    const catMatch = selectedCategory === "Todas" || item.category === selectedCategory;
    const searchMatch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const orderTotal = order.reduce((sum, id) => sum + (items.find(i => i.id === id)?.price || 0), 0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: theme.bg }}>
      {/* Header */}
      <div style={{ background: theme.primary, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontFamily: "Georgia, serif" }}>La Trattoria del Centro</h2>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>Mesa 7 {capa >= 1 && groupMembers > 0 ? `· ${groupMembers} en mesa` : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {capa === 0 && (
              <button onClick={onRegister} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
                Unirse a mesa
              </button>
            )}
            {capa === 1 && (
              <button onClick={onUpgrade} style={{ background: "#F59E0B", color: "#2D2D2D", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Premium $29/mes
              </button>
            )}
            {capa === 2 && (
              <span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 8, fontSize: 11 }}>★ Premium</span>
            )}
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ padding: "12px 16px 0" }}>
        <input
          type="text"
          placeholder={capa === 2 ? "🔮 Pregúntame algo... \"algo picante pero ligero\"" : "Buscar platillo..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.primary}30`, fontSize: 14, background: "white", boxSizing: "border-box", outline: "none" }}
        />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 0", scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none",
              background: selectedCategory === cat ? theme.primary : "white",
              color: selectedCategory === cat ? "white" : theme.text,
              boxShadow: selectedCategory === cat ? `0 2px 8px ${theme.primary}30` : "0 1px 3px rgba(0,0,0,0.08)"
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ad banner (Capa 0 & 1 only) */}
      {capa < 2 && (
        <div style={{ margin: "0 16px 8px", padding: "8px 12px", background: `${theme.primary}08`, borderRadius: 8, border: `1px dashed ${theme.primary}20`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: theme.primary }}>🔥 Chef's Special</p>
            <p style={{ margin: 0, fontSize: 11, color: theme.muted }}>Salmón a la Parrilla — 2x1 hoy</p>
          </div>
          <span style={{ fontSize: 9, color: theme.muted }}>Ad</span>
        </div>
      )}

      {/* AI Suggestion (Capa 2 only) */}
      {capa === 2 && (
        <div style={{ margin: "0 16px 8px", padding: "10px 14px", background: `linear-gradient(135deg, ${theme.primary}10, ${theme.primary}05)`, borderRadius: 10, border: `1px solid ${theme.primary}15` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: theme.primary }}>✨ Gemma sugiere para ti</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: theme.text }}>Basado en tus visitas anteriores: te gustan los sabores intensos y las porciones medianas. Hoy te recomiendo el <strong>Pozole Rojo</strong>.</p>
        </div>
      )}

      {/* Menu Items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        {filtered.map(item => {
          const inOrder = order.includes(item.id);
          return (
            <div key={item.id} onClick={() => onSelectItem(item)} style={{
              background: "white", borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer",
              border: inOrder ? `2px solid ${theme.primary}` : "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.15s ease"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.text }}>{item.name}</h3>
                    {item.popular && <span style={{ fontSize: 9, background: `${theme.primary}15`, color: theme.primary, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>TOP 3</span>}
                    {capa === 2 && <SafeBadge level={item.safe} />}
                  </div>
                  <p style={{ margin: "4px 0", fontSize: 12, color: theme.muted, lineHeight: 1.4 }}>{item.desc}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: theme.primary }}>${item.price}</span>
                    {item.allergens.length > 0 && (
                      <span style={{ fontSize: 10, color: "#EF4444", background: "#FEF2F2", padding: "2px 6px", borderRadius: 4 }}>
                        ⚠ {item.allergens.join(", ")}
                      </span>
                    )}
                    <SpiceLevel level={item.spice} />
                    {capa === 2 && <span style={{ fontSize: 10, color: theme.muted }}>{item.calories} kcal</span>}
                  </div>
                </div>
                {/* Placeholder for 3D/photo */}
                <div style={{ width: 64, height: 64, borderRadius: 10, background: `${theme.primary}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 10, color: theme.primary, textAlign: "center" }}>3D<br/>AR</span>
                </div>
              </div>
              {/* Action buttons for Capa 1+ */}
              {capa >= 1 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, borderTop: "1px solid #F3F3F3", paddingTop: 10 }}>
                  <button onClick={e => { e.stopPropagation(); onSelectItem(item, "order"); }} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: inOrder ? `${theme.primary}10` : theme.primary,
                    color: inOrder ? theme.primary : "white",
                    border: inOrder ? `1px solid ${theme.primary}` : "none"
                  }}>
                    {inOrder ? "✓ En tu orden" : "+ Agregar"}
                  </button>
                  <button onClick={e => { e.stopPropagation(); onShare(item); }} style={{
                    padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                    background: "transparent", border: `1px solid ${theme.primary}30`, color: theme.primary
                  }}>
                    Compartir
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom bar: Order summary (Capa 1+) */}
      {capa >= 1 && order.length > 0 && (
        <div style={{ padding: "12px 16px", background: "white", borderTop: "1px solid #EEE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text }}>{order.length} platillo{order.length > 1 ? "s" : ""} · ${orderTotal} MXN</p>
            <p style={{ margin: 0, fontSize: 11, color: theme.muted }}>Tu orden personal</p>
          </div>
          <button onClick={onCallWaiter} style={{ background: theme.primary, color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Llamar mesero
          </button>
        </div>
      )}
    </div>
  );
};

const ItemDetailModal = ({ theme, item, capa, onClose, onAddToOrder, inOrder }) => {
  if (!item) return null;
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "75%", overflowY: "auto", padding: "20px 20px 24px" }}>
        {/* 3D viewer placeholder */}
        <div style={{ width: "100%", height: 180, borderRadius: 14, background: `linear-gradient(135deg, ${theme.primary}08, ${theme.primary}15)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 28, margin: 0 }}>🍽️</p>
            <p style={{ fontSize: 12, color: theme.primary, fontWeight: 500, margin: "8px 0 0" }}>Vista AR 3D</p>
            <p style={{ fontSize: 10, color: theme.muted }}>model-viewer · Toca para girar</p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: theme.text }}>{item.name}</h2>
          <span style={{ fontSize: 22, fontWeight: 700, color: theme.primary }}>${item.price}</span>
        </div>

        <p style={{ color: theme.muted, fontSize: 14, lineHeight: 1.5, margin: "8px 0 12px" }}>{item.desc}</p>

        {/* Tags row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {item.allergens.length > 0 && item.allergens.map(a => (
            <span key={a} style={{ fontSize: 11, background: "#FEF2F2", color: "#EF4444", padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>⚠ {a}</span>
          ))}
          {item.popular && <span style={{ fontSize: 11, background: `${theme.primary}10`, color: theme.primary, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>🏆 Top 3</span>}
          <SpiceLevel level={item.spice} />
        </div>

        {/* Premium nutrition info */}
        {capa === 2 && (
          <div style={{ background: "#F8F8F8", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: theme.text }}>Información nutricional</p>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.primary }}>{item.calories}</p>
                <p style={{ margin: 0, fontSize: 10, color: theme.muted }}>kcal</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <SafeBadge level={item.safe} />
                <p style={{ margin: "4px 0 0", fontSize: 10, color: theme.muted }}>Tu perfil</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {capa >= 1 ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onAddToOrder} style={{
              flex: 1, padding: "14px 0", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
              background: inOrder ? "white" : theme.primary,
              color: inOrder ? theme.primary : "white",
              border: inOrder ? `2px solid ${theme.primary}` : "none"
            }}>
              {inOrder ? "✓ En tu orden" : "Agregar a mi orden"}
            </button>
            <button style={{ padding: "14px 18px", borderRadius: 12, fontSize: 15, cursor: "pointer", background: "transparent", border: `1px solid ${theme.primary}30`, color: theme.primary }}>
              📤
            </button>
          </div>
        ) : (
          <div style={{ padding: "12px", background: `${theme.primary}08`, borderRadius: 10, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: theme.primary }}>Tus amigos están compartiendo platillos.</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: theme.primary }}>Únete a la mesa con 1 tap →</p>
          </div>
        )}
      </div>
    </div>
  );
};

const RegisterModal = ({ theme, onClose, onRegister }) => (
  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 28, margin: 20, maxWidth: 320, width: "100%", textAlign: "center" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: 0 }}>Únete a la mesa</h2>
      <p style={{ fontSize: 13, color: theme.muted, margin: "8px 0 20px" }}>Regístrate en 1 tap para compartir platillos, armar tu orden personal, y llamar al mesero con tu grupo.</p>
      <button onClick={() => onRegister("google")} style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", background: "white", border: "1px solid #DDD", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>G</span> Continuar con Google
      </button>
      <button onClick={() => onRegister("apple")} style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", background: "#000", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}></span> Continuar con Apple
      </button>
      <p style={{ fontSize: 10, color: theme.muted, marginTop: 12 }}>No guardamos tu email. Tu perfil vive en tu dispositivo.</p>
    </div>
  </div>
);

const UpgradeModal = ({ theme, onClose, onUpgrade }) => (
  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: 28, margin: 20, maxWidth: 340, width: "100%", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <span style={{ fontSize: 24, color: "white" }}>★</span>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: 0 }}>Carta Premium</h2>
      <p style={{ fontSize: 24, fontWeight: 700, color: theme.primary, margin: "8px 0" }}>$29 <span style={{ fontSize: 14, fontWeight: 400, color: theme.muted }}>MXN/mes</span></p>
      <p style={{ fontSize: 11, color: theme.muted, margin: "0 0 16px" }}>Menos de $1 peso al día</p>
      <div style={{ textAlign: "left", marginBottom: 20 }}>
        {["Asistente IA Gemma 4 personal", "Filtrado inteligente (semáforo)", "Sin anuncios, nunca", "Memoria cross-restaurant", "Cloud backup cifrado", "Invitado Extra: dona 1 comida/mes"].map(f => (
          <p key={f} style={{ margin: "6px 0", fontSize: 13, color: theme.text }}>
            <span style={{ color: "#22C55E", marginRight: 6 }}>✓</span>{f}
          </p>
        ))}
      </div>
      <button onClick={onUpgrade} style={{ width: "100%", padding: "14px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", background: theme.primary, color: "white", border: "none" }}>
        Iniciar prueba gratis
      </button>
      <p style={{ fontSize: 10, color: theme.muted, marginTop: 8 }}>$249 MXN/año (ahorra 28%)</p>
    </div>
  </div>
);

const SharedDishToast = ({ theme, item, onDismiss }) => {
  if (!item) return null;
  return (
    <div style={{ position: "absolute", top: 80, left: 16, right: 16, background: "white", borderRadius: 12, padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 15, display: "flex", alignItems: "center", gap: 10 }} onClick={onDismiss}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${theme.primary}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>📤</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: theme.text }}>Ana compartió un platillo</p>
        <p style={{ margin: 0, fontSize: 11, color: theme.muted }}>"{item.name}" — toca para ver</p>
      </div>
      <span style={{ fontSize: 10, color: theme.muted }}>ahora</span>
    </div>
  );
};

// --- MAIN APP ---

export default function CartaWireframe() {
  const [currentTheme, setCurrentTheme] = useState("vino");
  const [capa, setCapa] = useState(-1); // -1 = splash
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [order, setOrder] = useState([]);
  const [sharedDish, setSharedDish] = useState(null);

  const theme = THEMES[currentTheme];

  const handleScan = () => setCapa(0);
  const handleRegister = () => { setShowRegister(false); setCapa(1); };
  const handleUpgrade = () => { setShowUpgrade(false); setCapa(2); };

  const handleSelectItem = (item, action) => {
    if (action === "order" && capa >= 1) {
      setOrder(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
      return;
    }
    setSelectedItem(item);
  };

  const handleAddToOrder = () => {
    if (selectedItem) {
      setOrder(prev => prev.includes(selectedItem.id) ? prev.filter(id => id !== selectedItem.id) : [...prev, selectedItem.id]);
    }
  };

  const handleShare = (item) => {
    setSharedDish(item);
    setTimeout(() => setSharedDish(null), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#E8E4DC", minHeight: "100vh", padding: "20px 0" }}>
      {/* Theme selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", justifyContent: "center", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>Tema:</span>
          {Object.entries(THEMES).map(([name, t]) => (
            <button key={name} onClick={() => setCurrentTheme(name)} style={{
              width: 28, height: 28, borderRadius: "50%", background: t.primary, border: currentTheme === name ? "3px solid #2D2D2D" : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s"
            }} title={name} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>Capa:</span>
          {[["Splash", -1], ["0", 0], ["1", 1], ["2", 2]].map(([label, val]) => (
            <button key={val} onClick={() => { setCapa(val); setOrder(val < 1 ? [] : order); }} style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: capa === val ? "#2D2D2D" : "white", color: capa === val ? "white" : "#2D2D2D",
              border: "1px solid #CCC"
            }}>{label}</button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 11, color: "#888", margin: "0 0 12px", textAlign: "center" }}>
        Wireframe interactivo — Experiencia del comensal · {capa === -1 ? "Splash" : `Capa ${capa}`} · Tema {currentTheme}
      </p>

      {/* Phone frame */}
      <div style={{
        width: 375, height: 750, borderRadius: 40, background: "#1A1A1A", padding: "12px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        position: "relative"
      }}>
        {/* Screen */}
        <div style={{ width: "100%", height: "100%", borderRadius: 30, overflow: "hidden", background: theme.bg, position: "relative" }}>
          {/* Status bar */}
          <div style={{ height: 44, background: capa === -1 ? theme.bg : theme.primary, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", color: capa === -1 ? "#333" : "white" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>9:41</span>
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ fontSize: 11 }}>📶</span>
              <span style={{ fontSize: 11 }}>🔋</span>
            </div>
          </div>

          {/* Content area */}
          <div style={{ height: "calc(100% - 44px)", position: "relative" }}>
            {capa === -1 ? (
              <SplashScreen theme={theme} restaurantName="La Trattoria del Centro" onScan={handleScan} />
            ) : (
              <MenuScreen
                theme={theme}
                capa={capa}
                items={MENU_ITEMS}
                onSelectItem={handleSelectItem}
                onRegister={() => setShowRegister(true)}
                onUpgrade={() => setShowUpgrade(true)}
                order={order}
                onCallWaiter={() => alert("🔔 Mesero notificado — Mesa 7 lista para ordenar")}
                groupMembers={capa >= 1 ? 3 : 0}
                onShare={handleShare}
              />
            )}

            {/* Modals */}
            {selectedItem && (
              <ItemDetailModal
                theme={theme}
                item={selectedItem}
                capa={capa}
                onClose={() => setSelectedItem(null)}
                onAddToOrder={handleAddToOrder}
                inOrder={order.includes(selectedItem.id)}
              />
            )}
            {showRegister && <RegisterModal theme={theme} onClose={() => setShowRegister(false)} onRegister={handleRegister} />}
            {showUpgrade && <UpgradeModal theme={theme} onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} />}
            {sharedDish && <SharedDishToast theme={theme} item={sharedDish} onDismiss={() => setSharedDish(null)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
