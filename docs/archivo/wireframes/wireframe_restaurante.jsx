import { useState } from "react";

const COLORS = { primary: "#6B2D3E", accent: "#B8860B", bg: "#F5F0E8", card: "#FFFFFF", dark: "#1E1E1E", text: "#2D2D2D", muted: "#8B7B6B", green: "#22C55E", red: "#EF4444", yellow: "#F59E0B" };

const MOCK_DISHES = [
  { id: 1, name: "Tacos al Pastor", price: 85, views: 342, orders: 128, conversion: 37, category: "Plato Fuerte", status: "active", has3d: true },
  { id: 2, name: "Ensalada César", price: 120, views: 215, orders: 67, conversion: 31, category: "Ensalada", status: "active", has3d: false },
  { id: 3, name: "Salmón a la Parrilla", price: 220, views: 289, orders: 95, conversion: 33, category: "Plato Fuerte", status: "active", has3d: true },
  { id: 4, name: "Paella de Mariscos", price: 280, views: 178, orders: 34, conversion: 19, category: "Plato Fuerte", status: "active", has3d: false },
  { id: 5, name: "Guacamole", price: 65, views: 401, orders: 201, conversion: 50, category: "Entrada", status: "active", has3d: true },
  { id: 6, name: "Tiramisú", price: 95, views: 156, orders: 78, conversion: 50, category: "Postre", status: "paused", has3d: false },
];

const MOCK_TABLES = [
  { id: 1, members: 4, status: "ordering", items: 8, total: 720, time: "12 min" },
  { id: 2, members: 2, status: "browsing", items: 0, total: 0, time: "3 min" },
  { id: 3, members: 6, status: "calling_waiter", items: 14, total: 1850, time: "25 min" },
  { id: 4, members: 0, status: "empty", items: 0, total: 0, time: "-" },
  { id: 5, members: 3, status: "ordering", items: 5, total: 480, time: "8 min" },
  { id: 7, members: 1, status: "browsing", items: 0, total: 0, time: "1 min" },
];

const MOCK_ANALYTICS = {
  scansToday: 147,
  scansWeek: 892,
  topDish: "Guacamole",
  avgTime: "14 min",
  conversionRate: "34%",
  topAllergen: "lácteo (23%)",
  peakHour: "2:00 PM",
  premiumUsers: "18%",
};

const StatCard = ({ label, value, sub, color }) => (
  <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 140 }}>
    <p style={{ margin: 0, fontSize: 11, color: COLORS.muted, fontWeight: 500 }}>{label}</p>
    <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: color || COLORS.text }}>{value}</p>
    {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: COLORS.muted }}>{sub}</p>}
  </div>
);

const MiniBar = ({ value, max, color }) => (
  <div style={{ width: 60, height: 6, borderRadius: 3, background: "#EEE", overflow: "hidden" }}>
    <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color || COLORS.primary, borderRadius: 3 }} />
  </div>
);

// --- VIEWS ---

const DashboardView = () => (
  <div>
    <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Dashboard</h2>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
      <StatCard label="Escaneos hoy" value={MOCK_ANALYTICS.scansToday} sub="+12% vs ayer" color={COLORS.green} />
      <StatCard label="Escaneos semana" value={MOCK_ANALYTICS.scansWeek} sub="Meta: 1,000" />
      <StatCard label="Tasa conversión" value={MOCK_ANALYTICS.conversionRate} sub="vista → orden" color={COLORS.accent} />
      <StatCard label="Hora pico" value={MOCK_ANALYTICS.peakHour} sub="Más escaneos" />
    </div>

    <div style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: COLORS.text }}>Platillos más vistos vs ordenados</h3>
      {MOCK_DISHES.slice(0, 5).map(d => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #F5F5F5" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, width: 140, flexShrink: 0 }}>{d.name}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: COLORS.muted, width: 40 }}>{d.views} 👁</span>
              <MiniBar value={d.views} max={450} color={COLORS.primary + "60"} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 10, color: COLORS.muted, width: 40 }}>{d.orders} ✓</span>
              <MiniBar value={d.orders} max={450} color={COLORS.green} />
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: d.conversion >= 40 ? COLORS.green : d.conversion >= 25 ? COLORS.accent : COLORS.red }}>{d.conversion}%</span>
        </div>
      ))}
    </div>

    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Alergeno más filtrado</h3>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.primary }}>{MOCK_ANALYTICS.topAllergen}</p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.muted }}>23% de comensales con perfil filtran lácteo</p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Usuarios Premium</h3>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.accent }}>{MOCK_ANALYTICS.premiumUsers}</p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.muted }}>de tus comensales registrados</p>
      </div>
    </div>
  </div>
);

const MenuView = () => {
  const [showUpload, setShowUpload] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.text }}>Mi Menú</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowUpload(!showUpload)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: COLORS.primary, color: "white", border: "none" }}>
            + Importar PDF
          </button>
          <button style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "white", color: COLORS.primary, border: `1px solid ${COLORS.primary}30` }}>
            + Agregar platillo
          </button>
        </div>
      </div>

      {showUpload && (
        <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, border: `2px dashed ${COLORS.primary}30`, textAlign: "center" }}>
          <p style={{ fontSize: 28, margin: "0 0 8px" }}>📄</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, margin: 0 }}>Arrastra tu menú en PDF aquí</p>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "4px 0 12px" }}>OCR + Gemma 4 extraerán platillos, precios y descripciones automáticamente</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#F0F0F0", borderRadius: 6 }}>
              <span style={{ fontSize: 12 }}>1.</span><span style={{ fontSize: 11, color: COLORS.muted }}>Upload PDF</span>
            </div>
            <span style={{ color: COLORS.muted }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#F0F0F0", borderRadius: 6 }}>
              <span style={{ fontSize: 12 }}>2.</span><span style={{ fontSize: 11, color: COLORS.muted }}>OCR</span>
            </div>
            <span style={{ color: COLORS.muted }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#F0F0F0", borderRadius: 6 }}>
              <span style={{ fontSize: 12 }}>3.</span><span style={{ fontSize: 11, color: COLORS.muted }}>AI Parse</span>
            </div>
            <span style={{ color: COLORS.muted }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: `${COLORS.green}15`, borderRadius: 6 }}>
              <span style={{ fontSize: 12 }}>4.</span><span style={{ fontSize: 11, color: COLORS.green }}>Revisar</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "white", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F0F0F0" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: COLORS.muted, fontSize: 11 }}>Platillo</th>
              <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: COLORS.muted, fontSize: 11 }}>Precio</th>
              <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: COLORS.muted, fontSize: 11 }}>3D</th>
              <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: COLORS.muted, fontSize: 11 }}>Status</th>
              <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: COLORS.muted, fontSize: 11 }}>Vistas</th>
              <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: COLORS.muted, fontSize: 11 }}>Conv.</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DISHES.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid #F8F8F8", cursor: "pointer" }}>
                <td style={{ padding: "10px 14px" }}>
                  <p style={{ margin: 0, fontWeight: 500, color: COLORS.text }}>{d.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: COLORS.muted }}>{d.category}</p>
                </td>
                <td style={{ textAlign: "center", fontWeight: 600, color: COLORS.primary }}>${d.price}</td>
                <td style={{ textAlign: "center" }}>
                  {d.has3d ? <span style={{ color: COLORS.green }}>✓</span> : <span style={{ fontSize: 11, color: COLORS.muted, cursor: "pointer", textDecoration: "underline" }}>Solicitar</span>}
                </td>
                <td style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, fontWeight: 500,
                    background: d.status === "active" ? `${COLORS.green}15` : `${COLORS.yellow}15`,
                    color: d.status === "active" ? COLORS.green : COLORS.yellow
                  }}>{d.status === "active" ? "Activo" : "Pausado"}</span>
                </td>
                <td style={{ textAlign: "center", fontSize: 12, color: COLORS.muted }}>{d.views}</td>
                <td style={{ textAlign: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: d.conversion >= 40 ? COLORS.green : d.conversion >= 25 ? COLORS.accent : COLORS.red }}>
                    {d.conversion}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TablesView = () => (
  <div>
    <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Mesas en Vivo</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {MOCK_TABLES.map(t => {
        const statusColors = { empty: "#CCC", browsing: COLORS.accent, ordering: COLORS.primary, calling_waiter: COLORS.red };
        const statusLabels = { empty: "Vacía", browsing: "Navegando", ordering: "Armando orden", calling_waiter: "🔔 Mesero!" };
        return (
          <div key={t.id} style={{
            background: "white", borderRadius: 12, padding: 16,
            border: t.status === "calling_waiter" ? `2px solid ${COLORS.red}` : "1px solid #F0F0F0",
            opacity: t.status === "empty" ? 0.5 : 1
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Mesa {t.id}</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColors[t.status] }} />
            </div>
            <span style={{
              fontSize: 10, padding: "3px 8px", borderRadius: 10, fontWeight: 600,
              background: `${statusColors[t.status]}15`, color: statusColors[t.status]
            }}>{statusLabels[t.status]}</span>
            {t.status !== "empty" && (
              <div style={{ marginTop: 10 }}>
                <p style={{ margin: "2px 0", fontSize: 11, color: COLORS.muted }}>👥 {t.members} comensales · ⏱ {t.time}</p>
                {t.items > 0 && <p style={{ margin: "2px 0", fontSize: 11, color: COLORS.muted }}>🍽 {t.items} items · ${t.total.toLocaleString()} MXN</p>}
              </div>
            )}
            {t.status === "calling_waiter" && (
              <button style={{ marginTop: 8, width: "100%", padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", background: COLORS.red, color: "white", border: "none" }}>
                Atender mesa
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const AdsView = () => (
  <div>
    <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Promociones & Ads</h2>
    <div style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Crear nueva promoción</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: COLORS.muted, display: "block", marginBottom: 4 }}>Platillo a promover</label>
          <select style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13 }}>
            <option>Seleccionar platillo...</option>
            {MOCK_DISHES.map(d => <option key={d.id}>{d.name} (${d.price})</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: COLORS.muted, display: "block", marginBottom: 4 }}>Tipo de promo</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["Destacar en menú", "2x1", "Descuento %", "Combo"].map(p => (
              <button key={p} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", background: "white", border: "1px solid #DDD", color: COLORS.text }}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: COLORS.muted, display: "block", marginBottom: 4 }}>Presupuesto diario</label>
          <input type="text" placeholder="$50 MXN/día" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <button style={{ padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: COLORS.primary, color: "white", border: "none" }}>
          Lanzar promoción
        </button>
      </div>
    </div>

    <div style={{ background: "white", borderRadius: 12, padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Promociones activas</h3>
      <div style={{ padding: "12px", background: `${COLORS.green}08`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.text }}>🔥 Salmón a la Parrilla — 2x1</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.muted }}>$50/día · 3 días activo · 23 clicks · 8 órdenes extra</p>
        </div>
        <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10, background: `${COLORS.green}15`, color: COLORS.green, fontWeight: 600 }}>Activa</span>
      </div>
    </div>
  </div>
);

const SettingsView = () => (
  <div>
    <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Configuración</h2>
    <div style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Tema visual</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { name: "Vino", color: "#6B2D3E" },
          { name: "Verde", color: "#3D5A3E" },
          { name: "Azul", color: "#2C5F7C" },
          { name: "Ocre", color: "#B8860B" },
          { name: "Café", color: "#5C3A1E" },
        ].map(t => (
          <div key={t.name} style={{ textAlign: "center", cursor: "pointer" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: t.color, border: t.name === "Vino" ? "3px solid #2D2D2D" : "2px solid transparent" }} />
            <p style={{ margin: "4px 0 0", fontSize: 10, color: COLORS.muted }}>{t.name}</p>
          </div>
        ))}
      </div>
    </div>
    <div style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Logo del restaurante</h3>
      <div style={{ width: 80, height: 80, borderRadius: 12, border: "2px dashed #DDD", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <span style={{ fontSize: 11, color: COLORS.muted, textAlign: "center" }}>+ Subir<br/>logo</span>
      </div>
      <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8 }}>Tu logo aparecerá dentro del icono de Carta en la app y en los QR de tus mesas.</p>
    </div>
    <div style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>QR de mesas</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5, 7].map(n => (
          <div key={n} style={{ width: 80, height: 80, borderRadius: 8, background: "#F8F8F8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #EEE" }}>
            <div style={{ width: 40, height: 40, background: `${COLORS.primary}15`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: COLORS.primary }}>QR</span>
            </div>
            <span style={{ fontSize: 10, color: COLORS.muted, marginTop: 4 }}>Mesa {n}</span>
          </div>
        ))}
        <div style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #DDD", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <span style={{ fontSize: 20, color: COLORS.muted }}>+</span>
        </div>
      </div>
    </div>
    <div style={{ background: "white", borderRadius: 12, padding: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Plan actual</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ padding: "4px 12px", borderRadius: 8, background: `${COLORS.accent}15`, color: COLORS.accent, fontWeight: 600, fontSize: 12 }}>Plan Gratis</span>
        <button style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", background: COLORS.primary, color: "white", border: "none" }}>
          Upgrade a Pro ($249/mes)
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN LAYOUT ---

export default function RestaurantPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "menu", label: "Menú", icon: "🍽" },
    { id: "tables", label: "Mesas", icon: "🪑" },
    { id: "ads", label: "Promos", icon: "📣" },
    { id: "settings", label: "Config", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: COLORS.dark, padding: "20px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <rect x="10" y="6" width="28" height="36" rx="3" stroke="white" strokeWidth="2.5" fill="none" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "white", fontFamily: "Georgia, serif" }}>Carta</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Panel Restaurante</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 12px 0" }}>
          <p style={{ margin: "0 8px 8px", fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>La Trattoria</p>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
              fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", marginBottom: 2, textAlign: "left",
              background: activeTab === tab.id ? "rgba(255,255,255,0.1)" : "transparent",
              color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.5)"
            }}>
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
              {tab.id === "tables" && MOCK_TABLES.some(t => t.status === "calling_waiter") && (
                <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: COLORS.red }} />
              )}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "0 12px" }}>
          <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Plan: <span style={{ color: COLORS.accent }}>Gratis</span></p>
            <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Upgrade para analytics avanzados</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        <div style={{ maxWidth: 900 }}>
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "menu" && <MenuView />}
          {activeTab === "tables" && <TablesView />}
          {activeTab === "ads" && <AdsView />}
          {activeTab === "settings" && <SettingsView />}
        </div>
      </div>
    </div>
  );
}
