"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Product {
  id?: string | number;
  product_id?: string | number;
  name: string;
  price: number | string;
  originalPrice?: number | string;
  image?: string;
  image_url?: string;
  imageUrl?: string;
  thumbnail?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  url?: string;
  link?: string;
  discount?: number | string;
  inStock?: boolean;
  _numPrice?: number;
}

type SortKey = "relevance" | "price_asc" | "price_desc" | "rating" | "newest";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: Product[];
  type?: "products" | "error" | "loading";
  sort?: SortKey;
  query?: string;
}

/* ─────────────────────────────────────────
   CSS-in-JS global styles
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #__next { height: 100%; overflow: hidden; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  textarea { field-sizing: content !important; resize: none; }
  a { text-decoration: none; }
  button { font-family: inherit; }

  @keyframes splashIn   { from { opacity:0; transform:scale(0.5); } 60% { transform:scale(1.06); } to { opacity:1; transform:scale(1); } }
  @keyframes splashText { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
  @keyframes splashOut  { to { opacity:0; transform:scale(1.07); } }
  @keyframes loadBar    { from { width:0 } to { width:100% } }
  @keyframes msgIn  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleIn{ from { opacity:0; transform:scale(0.93) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes dot    { 0%,80%,100% { transform:translateY(0); opacity:.4; } 40% { transform:translateY(-5px); opacity:1; } }
  @keyframes voiceRing { 0% { transform:scale(1); opacity:.8; } 100% { transform:scale(1.7); opacity:0; } }
  @keyframes float1 { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-8px); } }
  @keyframes float2 { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-6px); } }
  @keyframes float3 { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-10px); } }
  @keyframes cartBounce { 0%,100%{transform:scale(1)} 30%{transform:scale(1.3)} 60%{transform:scale(0.9)} }

  .splash-icon { animation: splashIn  0.8s cubic-bezier(.34,1.56,.64,1) 0.2s both; }
  .splash-text { animation: splashText 0.7s ease 0.9s both; }
  .splash-sub  { animation: splashText 0.7s ease 1.1s both; }
  .splash-bar  { animation: splashText 0.5s ease 1.4s both; }
  .splash-bar-fill { animation: loadBar 1.5s ease 1.5s both; }
  .splash-exit { animation: splashOut 0.7s ease forwards; }

  .msg-in  { animation: msgIn   0.28s ease both; }
  .scale-in{ animation: scaleIn 0.25s ease both; }

  .pill-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; border-radius:99px; font-size:13px; font-weight:500;
    border:1.5px solid #e2e8f0; background:#fff; color:#475569; cursor:pointer;
    transition:all .18s; white-space:nowrap;
  }
  .pill-btn:hover { border-color:#6366f1; color:#6366f1; background:#f5f3ff; }
  .pill-btn.active { border-color:#6366f1; color:#fff; background:#6366f1; }

  .sort-btn {
    padding:6px 13px; border-radius:99px; font-size:12px; font-weight:600;
    border:1.5px solid #e2e8f0; background:#fff; color:#64748b; cursor:pointer;
    transition:all .18s; white-space:nowrap; flex-shrink:0;
  }
  .sort-btn.active { border-color:#6366f1; color:#fff; background:#6366f1; }

  .product-card {
    background:#fff; border-radius:18px; border:1px solid #e8edf3;
    overflow:hidden; display:flex; flex-direction:column;
    transition:transform .22s, box-shadow .22s;
  }
  .product-card:hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(0,0,0,.1); }

  .send-btn {
    width:44px; height:44px; border-radius:14px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    background:linear-gradient(135deg,#6366f1,#7c3aed);
    color:#fff; font-size:20px; font-weight:700;
    box-shadow:0 4px 16px rgba(99,102,241,.35);
    transition:opacity .18s, transform .18s;
  }
  .send-btn:disabled { opacity:.4; cursor:not-allowed; box-shadow:none; background:#e2e8f0; color:#94a3b8; }
  .send-btn:not(:disabled):hover { transform:scale(1.06); }

  .input-bar {
    display:flex; align-items:flex-end; gap:8px;
    background:#fff; border-radius:20px; padding:8px 8px 8px 14px;
    border:2px solid #e2e8f0; transition:border-color .18s, box-shadow .18s;
  }
  .input-bar.focused { border-color:#6366f1; box-shadow:0 0 0 4px rgba(99,102,241,.12); }

  .icon-btn {
    width:36px; height:36px; border-radius:11px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center; font-size:17px;
    background:#f8fafc; transition:background .18s; flex-shrink:0;
  }
  .icon-btn:hover { background:#eef2ff; }
  .icon-btn.active { background:#fef2f2; }

  .cart-bounce { animation: cartBounce 0.4s ease; }

  @media (max-width: 640px) {
    .hide-mobile { display: none !important; }
    .mobile-full { width: 100% !important; }
  }
  @media (min-width: 641px) {
    .hide-desktop { display: none !important; }
  }
`;

/* ─────────────────────────────────────────
   Splash Screen
───────────────────────────────────────── */
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 3200);
    const t2 = setTimeout(() => onDone(), 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#06010f 0%,#0d0420 45%,#0a1228 100%)",
      overflow: "hidden",
    }} className={exiting ? "splash-exit" : ""}>
      <div style={{ position:"absolute", width:420, height:420, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.4) 0%,transparent 70%)", top:-100, left:-80, filter:"blur(80px)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(236,72,153,.25) 0%,transparent 70%)", bottom:-80, right:-60, filter:"blur(70px)", pointerEvents:"none" }} />

      <div className="splash-icon" style={{ width:96, height:96, borderRadius:28, background:"linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48, boxShadow:"0 0 80px rgba(99,102,241,.6),0 20px 50px rgba(99,102,241,.4)" }}>🛍️</div>

      <div className="splash-text" style={{ marginTop:44, textAlign:"center" }}>
        <h1 style={{ color:"#fff", fontSize:"clamp(24px,5.5vw,40px)", fontWeight:800, letterSpacing:"-0.02em", lineHeight:1.1 }}>
          Welcome to{" "}
          <span style={{ background:"linear-gradient(135deg,#818cf8,#c084fc,#f472b6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Kapruka AI</span>
        </h1>
      </div>
      <p className="splash-sub" style={{ marginTop:10, color:"rgba(255,255,255,.45)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.2em" }}>
        Your Smart Shopping Assistant
      </p>

      <div className="splash-bar" style={{ marginTop:52, width:48, height:2, background:"rgba(255,255,255,.1)", borderRadius:99, overflow:"hidden" }}>
        <div className="splash-bar-fill" style={{ height:"100%", background:"linear-gradient(90deg,#6366f1,#ec4899)", borderRadius:99 }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Product Card
───────────────────────────────────────── */
function ProductCard({ p, onAddToCart }: { p: Product; onAddToCart: (p: Product) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const [added, setAdded] = useState(false);
  const img = p.image || p.image_url || p.imageUrl || p.thumbnail;
  const numPrice = p._numPrice ?? (typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, "")) || 0);
  const displayPrice = numPrice > 0 ? numPrice.toLocaleString() : String(p.price);

  // Build the safest possible product URL
  const productUrl = p.url || p.link ||
    (p.product_id ? `https://www.kapruka.com/buyonline/${p.product_id}` : null) ||
    (p.id ? `https://www.kapruka.com/buyonline/${p.id}` : null) ||
    "https://www.kapruka.com";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="product-card" style={{ position: "relative" }}>
      {/* Image */}
      <div style={{ position:"relative", height:170, background:"#f1f5f9", overflow:"hidden" }}>
        {img && !imgErr ? (
          <img src={img} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform .3s" }}
            onError={() => setImgErr(true)}
            onMouseEnter={e => (e.currentTarget.style.transform="scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform="")}
          />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, color:"#cbd5e1" }}>🛍️</div>
        )}
        {p.discount && (
          <span style={{ position:"absolute", top:10, left:10, background:"#ef4444", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:99, zIndex:10 }}>-{p.discount}%</span>
        )}
        {p.inStock === false ? (
          <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,.72)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
            <span style={{ background:"#fff", border:"1px solid #e2e8f0", padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700, color:"#64748b" }}>Out of Stock</span>
          </div>
        ) : (
          /* Floating Circular Cart Action */
          <button onClick={handleAddToCart} title="Add to Cart" style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: added ? "#22c55e" : "#ffffff",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: added ? "#ffffff" : "#4f46e5",
            transition: "all 0.2s ease",
            zIndex: 15
          }}>
            {added ? "✓" : "🛒"}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding:"12px 14px 14px", display:"flex", flexDirection:"column", gap:6, flex:1 }}>
        {p.category && <span style={{ fontSize:10, fontWeight:700, color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.06em" }}>{p.category}</span>}
        <p style={{ fontSize:13, fontWeight:600, color:"#1e293b", lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", flex:1 }}>{p.name}</p>

        {/* Stars */}
        {p.rating != null && (
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ display:"flex", gap:1 }}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width={11} height={11} fill={s<=Math.round(p.rating!) ? "#fbbf24" : "#e2e8f0"} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            {p.reviewCount && <span style={{ fontSize:10, color:"#94a3b8" }}>({p.reviewCount})</span>}
          </div>
        )}

        {/* Price */}
        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
          <span style={{ fontSize:16, fontWeight:700, color:"#0f172a" }}>LKR {displayPrice}</span>
          {p.originalPrice && <span style={{ fontSize:11, color:"#94a3b8", textDecoration:"line-through" }}>LKR {p.originalPrice}</span>}
        </div>

        {/* Full-width View Button */}
        <a href={productUrl} target="_blank" rel="noopener noreferrer"
          style={{ display:"block", textAlign:"center", padding:"9px 0", borderRadius:10, fontSize:12, fontWeight:600, background:"#eef2ff", color:"#4f46e5", transition:"all .18s", marginTop:2 }}
          onMouseEnter={e => { (e.currentTarget.style.background="#4f46e5"); (e.currentTarget.style.color="#fff"); }}
          onMouseLeave={e => { (e.currentTarget.style.background="#eef2ff"); (e.currentTarget.style.color="#4f46e5"); }}
        >
          View on Kapruka →
        </a>
      </div>
    </div>
  );
}




/* ─────────────────────────────────────────
   Product Grid with Sort Bar
───────────────────────────────────────── */
function ProductGrid({ products, query, initialSort, onReSort, onAddToCart }: {
  products: Product[];
  query?: string;
  initialSort?: SortKey;
  onReSort: (q: string, s: SortKey) => void;
  onAddToCart: (p: Product) => void;
}) {
  const [sort, setSort] = useState<SortKey>(initialSort || "relevance");
  const [items, setItems] = useState<Product[]>(products);

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "relevance", label: "Best Match" },
    { key: "price_asc", label: "💰 Cheapest" },
    { key: "price_desc", label: "💎 Expensive" },
    { key: "rating", label: "⭐ Top Rated" },
    { key: "newest", label: "🆕 Newest" },
  ];

  const applySort = useCallback((s: SortKey) => {
    setSort(s);
    if (query) {
      // Re-fetch from API for proper server-side sort
      onReSort(query, s);
    } else {
      // Client-side sort fallback
      const sorted = [...products].map(p => ({
        ...p,
        _numPrice: p._numPrice ?? (typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, "")) || 0)
      }));
      if (s === "price_asc") sorted.sort((a, b) => (a._numPrice ?? 0) - (b._numPrice ?? 0));
      else if (s === "price_desc") sorted.sort((a, b) => (b._numPrice ?? 0) - (a._numPrice ?? 0));
      else if (s === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      else if (s === "newest") sorted.reverse();
      setItems(sorted);
    }
  }, [products, query, onReSort]);

  useEffect(() => {
    setItems(products);
    setSort(initialSort || "relevance");
  }, [products, initialSort]);

  return (
    <div style={{ width:"100%" }}>
      {/* Sort bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, gap:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>
          {items.length} result{items.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2, flex:1, justifyContent:"flex-end" }}>
          {SORTS.map(s => (
            <button key={s.key} className={`sort-btn${sort===s.key?" active":""}`} onClick={() => applySort(s.key)}>{s.label}</button>
          ))}
        </div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,190px),1fr))",
        gap: 12,
      }}>
        {items.map((p, i) => <ProductCard key={String(p.id ?? p.product_id ?? i)} p={p} onAddToCart={onAddToCart} />)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Typing / Loading Indicator
───────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="msg-in" style={{ display:"flex", alignItems:"flex-end", gap:10 }}>
      <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🤖</div>
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"18px 18px 18px 4px", padding:"12px 18px", display:"flex", alignItems:"center", gap:7, boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
        <span style={{ width:7,height:7,borderRadius:"50%",background:"#818cf8",display:"inline-block",animation:"dot 1.2s ease-in-out infinite" }} />
        <span style={{ width:7,height:7,borderRadius:"50%",background:"#818cf8",display:"inline-block",animation:"dot 1.2s ease-in-out .2s infinite" }} />
        <span style={{ width:7,height:7,borderRadius:"50%",background:"#818cf8",display:"inline-block",animation:"dot 1.2s ease-in-out .4s infinite" }} />
        <span style={{ fontSize:12, color:"#94a3b8", marginLeft:4 }}>Searching Kapruka…</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Message Bubble
───────────────────────────────────────── */
function MessageBubble({ msg, onSortChange, onAddToCart }: {
  msg: ChatMessage;
  onSortChange: (query: string, sort: SortKey) => void;
  onAddToCart: (p: Product) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div className="msg-in" style={{ display:"flex", alignItems:"flex-end", flexDirection: isUser ? "row-reverse" : "row", gap:10 }}>
      {!isUser && (
        <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, alignSelf:"flex-start", marginTop:2 }}>🤖</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth: isUser ? "78%" : "94%", width: isUser ? "auto" : "100%", alignItems: isUser ? "flex-end" : "flex-start" }}>
        {msg.text && (
          <div style={{
            padding:"11px 16px", fontSize:14, lineHeight:1.65, whiteSpace:"pre-wrap",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isUser ? "linear-gradient(135deg,#6366f1,#7c3aed)" : msg.type === "error" ? "#fef2f2" : "#fff",
            color: isUser ? "#fff" : msg.type === "error" ? "#991b1b" : "#1e293b",
            border: isUser ? "none" : msg.type === "error" ? "1px solid #fecaca" : "1px solid #e2e8f0",
            boxShadow: isUser ? "0 4px 16px rgba(99,102,241,.28)" : "0 1px 6px rgba(0,0,0,.06)",
          }}>
            {msg.text.replace(/\*\*/g, "")}
          </div>
        )}

        {/* Products */}
        {msg.products && msg.products.length > 0 && (
          <ProductGrid
            products={msg.products}
            query={msg.query}
            initialSort={msg.sort}
            onReSort={onSortChange}
            onAddToCart={onAddToCart}
          />
        )}

        {/* Empty state */}
        {msg.type === "products" && msg.products && msg.products.length === 0 && (
          <div style={{ padding:"14px 18px", background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:14, fontSize:13, color:"#9a3412" }}>
            😔 No products found. Try different keywords or browse categories below.
          </div>
        )}
      </div>
      {isUser && (
        <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#475569,#334155)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, alignSelf:"flex-start", marginTop:2 }}>👤</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Login Modal
───────────────────────────────────────── */
function LoginModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(15,23,42,.55)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div className="scale-in" style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:420, overflow:"hidden", boxShadow:"0 25px 70px rgba(0,0,0,.18)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", borderBottom:"1px solid #f1f5f9" }}>
          {(["signin","signup"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:"16px 0", fontSize:14, fontWeight:700, border:"none", cursor:"pointer", background:"transparent", color: tab===t ? "#6366f1" : "#94a3b8", borderBottom: tab===t ? "2px solid #6366f1" : "2px solid transparent", transition:"all .18s" }}>
              {t==="signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
          <button onClick={onClose} style={{ padding:"16px 18px", border:"none", background:"transparent", cursor:"pointer", color:"#94a3b8", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
          {tab==="signup" && (
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Full Name</label>
              <input type="text" placeholder="Your name" style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", fontSize:14, outline:"none" }} />
            </div>
          )}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Email</label>
            <input type="email" placeholder="you@example.com" style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", fontSize:14, outline:"none" }} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Password</label>
            <input type="password" placeholder="••••••••" style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", fontSize:14, outline:"none" }} />
          </div>
          <button onClick={() => { alert(tab==="signin" ? "Signed in!" : "Account created!"); onClose(); }} style={{
            border:"none", cursor:"pointer", padding:"14px 0", borderRadius:14, marginTop:4,
            background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"#fff",
            fontSize:15, fontWeight:700, boxShadow:"0 4px 18px rgba(99,102,241,.35)",
          }}>
            {tab==="signin" ? "Sign In" : "Create Account"}
          </button>
          <p style={{ textAlign:"center", fontSize:12, color:"#64748b" }}>
            {tab==="signin" ? "No account? " : "Have an account? "}
            <button onClick={() => setTab(tab==="signin"?"signup":"signin")} style={{ color:"#6366f1", fontWeight:700, border:"none", background:"none", cursor:"pointer" }}>
              {tab==="signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Image Search Modal
───────────────────────────────────────── */
function ImageSearchModal({ onClose, onSearch }: { onClose: () => void; onSearch: (q: string) => void }) {
  const [preview, setPreview] = useState<string|null>(null);
  const [analysing, setAnalysing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    setPreview(URL.createObjectURL(file));
    setAnalysing(true);
    // Use filename as query (best we can do without a Vision API key)
    setTimeout(() => {
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() || "product";
      onSearch(name);
      onClose();
    }, 1800);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(15,23,42,.6)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div className="scale-in" style={{ background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:520, boxShadow:"0 -8px 40px rgba(0,0,0,.16)", paddingBottom:"env(safe-area-inset-bottom)" }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, background:"#e2e8f0", borderRadius:99, margin:"14px auto 0" }} />
        <div style={{ padding:"18px 20px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <h2 style={{ fontSize:18, fontWeight:700, color:"#0f172a" }}>Search by Photo</h2>
              <p style={{ fontSize:12, color:"#94a3b8", marginTop:3 }}>Upload a product photo to find it on Kapruka</p>
            </div>
            <button onClick={onClose} style={{ border:"none", background:"#f1f5f9", cursor:"pointer", width:34, height:34, borderRadius:"50%", fontSize:16 }}>✕</button>
          </div>
          {preview ? (
            <div style={{ position:"relative", borderRadius:16, overflow:"hidden", height:200 }}>
              <img src={preview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              {analysing && (
                <div style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.65)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
                  <div style={{ width:34, height:34, border:"3px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
                  <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>Analysing image…</span>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{ border:"2px dashed #e2e8f0", borderRadius:16, height:180, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, cursor:"pointer", transition:"all .2s" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handle(f); }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor="#6366f1"); (e.currentTarget.style.background="#f5f3ff"); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor="#e2e8f0"); (e.currentTarget.style.background=""); }}
            >
              <span style={{ fontSize:36 }}>📷</span>
              <div style={{ textAlign:"center" }}>
                <p style={{ fontSize:14, fontWeight:600, color:"#475569" }}>Tap to upload or drag a photo</p>
                <p style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>PNG, JPG, WEBP supported</p>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} />
          <button onClick={() => fileRef.current?.click()} style={{
            width:"100%", marginTop:14, border:"none", cursor:"pointer", padding:"14px 0",
            borderRadius:14, fontSize:14, fontWeight:700,
            background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"#fff",
            boxShadow:"0 4px 16px rgba(99,102,241,.3)",
          }}>
            {preview ? "Choose Different Photo" : "Select from Camera / Gallery"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Notifications Panel
───────────────────────────────────────── */
function NotifPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200 }} onClick={onClose}>
      <div className="scale-in" style={{ position:"absolute", top:70, right:12, background:"#fff", borderRadius:18, boxShadow:"0 8px 40px rgba(0,0,0,.14)", border:"1px solid #e2e8f0", width:"min(320px, calc(100vw - 24px))", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>Notifications</span>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:"#94a3b8", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>No new notifications</p>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>We&apos;ll notify you when your orders update or new deals arrive.</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Cart Panel
───────────────────────────────────────── */
function CartPanel({ onClose, cart, onRemove }: { onClose: () => void; cart: Product[]; onRemove: (idx: number) => void }) {
  const total = cart.reduce((sum, item) => sum + (item._numPrice || 0), 0);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(15,23,42,.4)", backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div className="scale-in" style={{ position:"absolute", top:0, right:0, bottom:0, background:"#fff", width:"min(380px, 100vw)", boxShadow:"-8px 0 40px rgba(0,0,0,.1)", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc" }}>
          <span style={{ fontWeight:800, fontSize:16, color:"#0f172a", display:"flex", alignItems:"center", gap:8 }}>
            <span>🛒</span> Your Cart ({cart.length})
          </span>
          <button onClick={onClose} style={{ border:"none", background:"#e2e8f0", borderRadius:"50%", width:30, height:30, cursor:"pointer", color:"#475569", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:48, opacity:0.5, marginBottom:16 }}>🛍️</div>
              <h3 style={{ fontSize:16, color:"#1e293b", marginBottom:8 }}>Your cart is empty</h3>
              <p style={{ fontSize:13, color:"#64748b" }}>Search for products and add them here.</p>
              <button onClick={onClose} style={{ marginTop:24, padding:"10px 20px", background:"#f1f5f9", border:"none", borderRadius:12, fontWeight:600, color:"#475569", cursor:"pointer" }}>
                Start Shopping
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display:"flex", gap:12, paddingBottom:12, borderBottom:"1px solid #f1f5f9", alignItems:"center" }}>
                  <div style={{ width:56, height:56, borderRadius:8, background:"#f8fafc", overflow:"hidden", flexShrink:0 }}>
                    {(item.image || item.image_url || item.imageUrl || item.thumbnail) ? (
                      <img src={item.image || item.image_url || item.imageUrl || item.thumbnail} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }} />
                    ) : (
                      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🛍️</div>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:"#1e293b", lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{item.name}</p>
                    <p style={{ fontSize:13, fontWeight:700, color:"#6366f1", marginTop:3 }}>LKR {item._numPrice?.toLocaleString()}</p>
                  </div>
                  <button onClick={() => onRemove(idx)} style={{ border:"none", background:"#fef2f2", color:"#ef4444", borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div style={{ padding:20, borderTop:"1px solid #f1f5f9", background:"#fff" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:14, fontWeight:600, color:"#64748b" }}>Subtotal</span>
              <span style={{ fontSize:18, fontWeight:800, color:"#0f172a" }}>LKR {total.toLocaleString()}</span>
            </div>
            <a href="https://www.kapruka.com/cart" target="_blank" rel="noopener noreferrer" style={{
              display:"block", width:"100%", padding:"14px 0", borderRadius:14, fontSize:15, fontWeight:700,
              background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"#fff", textAlign:"center",
              boxShadow:"0 4px 16px rgba(99,102,241,.3)", textDecoration:"none",
            }}>
              Checkout on Kapruka →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Hero quick chips & cards
───────────────────────────────────────── */
const QUICK_CHIPS = [
  { e:"🎂", l:"Birthday Cakes", q:"birthday cake" },
  { e:"💐", l:"Flowers", q:"flowers" },
  { e:"🍫", l:"Chocolates", q:"chocolate gift box" },
  { e:"📱", l:"Phones", q:"smartphone" },
  { e:"👗", l:"Clothing", q:"women clothing" },
  { e:"🎁", l:"Gifts", q:"gift hamper" },
  { e:"📚", l:"Books", q:"books" },
  { e:"💻", l:"Laptops", q:"laptop" },
];

const HERO_CARDS = [
  { title:"Chocolate Gift Box", price:"LKR 3,500", image:"https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/pc00334/choc0v571p00076/choc0v571p00076_1.jpg", q:"chocolate gift box", anim:"float1" },
  { title:"Birthday Cake", price:"LKR 5,800", image:"https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/vendor/cake00ka00171/cake00ka00171_1.jpg", q:"birthday cake", anim:"float2" },
  { title:"Flowers Bouquet", price:"LKR 4,200", image:"https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/kapruka/flowers00t1558/flowers00t1558_1.jpg", q:"flower bouquet", anim:"float3" },
];

/* ─────────────────────────────────────────
   Main App
───────────────────────────────────────── */
export default function KaprukaChatApp() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showImgSearch, setShowImgSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cart, setCart] = useState<Product[]>([]);
  const [cartBounce, setCartBounce] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  /* ── API call ── */
  const doSearch = useCallback(async (query: string, forcedSort?: SortKey, isDirectCategory: boolean = false) => {
    if (!query.trim() || loading) return;
    const q = query.trim();
    setInput("");
    setLoading(true);

    const msgId = Date.now().toString();
    const aiId = (Date.now() + 1).toString();

    setMsgs(prev => [
      ...prev,
      { id: msgId, role: "user", text: q },
      { id: aiId, role: "assistant", text: "", type: "loading" },
    ]);

    try {
      const body = forcedSort || isDirectCategory
        ? { action: "search", query: q, sort: forcedSort, messages: [], isDirectCategory }
        : {
            messages: [
              ...msgs.map(m => ({ role: m.role, content: m.text, parts: [{ type:"text", text: m.text }] })),
              { role: "user", content: q, parts: [{ type:"text", text: q }] },
            ]
          };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Read as text first to avoid JSON parse crash
      const rawText = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${rawText.substring(0, 200)}`);

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Server returned invalid JSON");
      }

      const products: Product[] = Array.isArray(data.products) ? data.products : [];
      const count = products.length;
      let sortLabel = "";
      if (data.sort && data.sort !== "relevance") {
        const labels: Record<string, string> = { price_asc:"cheapest first", price_desc:"most expensive first", rating:"top rated first", newest:"newest first" };
        sortLabel = ` · sorted by ${labels[data.sort] || data.sort}`;
      }
      const text = count > 0
        ? `Found **${count}** results for "${data.query}"${sortLabel}:`
        : `No results found for "${data.query}". Try different keywords.`;

      setMsgs(prev => prev.map(m => m.id === aiId ? {
        ...m,
        text,
        type: "products",
        products,
        sort: data.sort || "relevance",
        query: data.query,
      } : m));
    } catch (err) {
      console.error(err);
      setMsgs(prev => prev.map(m => m.id === aiId ? {
        ...m,
        text: "⚠️ Something went wrong. Please check your connection and try again.",
        type: "error",
        products: [],
      } : m));
    } finally {
      setLoading(false);
    }
  }, [loading, msgs]);

  const handleReSort = useCallback((query: string, sort: SortKey) => {
    doSearch(query, sort);
  }, [doSearch]);

  const handleAddToCart = useCallback((p: Product) => {
    setCart(c => [...c, p]);
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 500);
  }, []);

  const handleRemoveFromCart = useCallback((idx: number) => {
    setCart(c => c.filter((_, i) => i !== idx));
  }, []);

  /* ── Voice ── */
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice search requires Chrome, Edge, or Safari browser.");
      return;
    }
    if (isListening) {
      recRef.current?.stop();
      setIsListening(false);
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.onstart = () => setIsListening(true);
      rec.onresult = (e: any) => {
        setIsListening(false);
        const transcript = e.results?.[0]?.[0]?.transcript;
        if (transcript) doSearch(transcript);
      };
      rec.onerror = (err: any) => {
        setIsListening(false);
        if (err.error === "not-allowed") alert("Please allow microphone access to use voice search.");
        else if (err.error !== "no-speech") console.error("Voice error:", err.error);
      };
      rec.onend = () => setIsListening(false);
      recRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSearch(input); }
  };

  const isEmpty = msgs.length === 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <div style={{ display:"flex", flexDirection:"column", height:"100dvh", background:"#f8fafc", overflow:"hidden" }}>

        {/* ── Header ── */}
        <header style={{
          flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"10px 12px", background:"rgba(255,255,255,.94)",
          backdropFilter:"blur(20px)", borderBottom:"1px solid #e8edf3",
          boxShadow:"0 1px 10px rgba(0,0,0,.05)", zIndex:50,
        }}>
          {/* Left Controls: Logo & Back Button */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {/* Back button (Only on mobile when in chat view) */}
            {!isEmpty && (
              <button onClick={() => setMsgs([])} title="Back to Home" style={{
                background:"#f1f5f9", border:"1px solid #e2e8f0", cursor:"pointer",
                width:34, height:34, borderRadius:10, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:16, marginRight:2
              }}>⬅️</button>
            )}

            {/* Logo */}
            <button onClick={() => setMsgs([])} style={{ display:"flex", alignItems:"center", gap:8, border:"none", background:"none", cursor:"pointer", padding:0 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 4px 12px rgba(99,102,241,.35)", flexShrink:0 }}>🛍️</div>
              <div style={{ textAlign:"left" }} className="hide-mobile">
                <div style={{ fontSize:15, fontWeight:800, color:"#0f172a", lineHeight:1.1 }}>
                  Kapruka <span style={{ background:"linear-gradient(135deg,#6366f1,#a78bfa,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>AI</span>
                </div>
              </div>
            </button>
          </div>

          {/* Right Controls: Visit Kapruka, Notifications, Cart, Sign In */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {/* Status light */}
            <div className="hide-mobile" style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", background:"#f1f5f9", borderRadius:99, border:"1px solid #e2e8f0", marginRight:4 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background: loading?"#f59e0b":"#22c55e", boxShadow: loading?"0 0 6px #f59e0b":"0 0 6px #22c55e" }} />
              <span style={{ fontSize:9, fontWeight:700, color:"#475569" }}>{loading?"SEARCHING…":"ONLINE"}</span>
            </div>
            {loading && <div className="hide-desktop" style={{ width:8, height:8, borderRadius:"50%", background:"#f59e0b", boxShadow:"0 0 8px #f59e0b", marginRight:4 }} />}

            {/* Visit Kapruka Link */}
            <a href="https://www.kapruka.com" target="_blank" rel="noopener noreferrer" title="Visit Kapruka.com" style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              background:"linear-gradient(135deg,#f97316,#ef4444)",
              color:"#fff", textDecoration:"none",
              width:34, height:34, borderRadius:10, fontSize:15,
              boxShadow:"0 3px 8px rgba(249,115,22,.25)", flexShrink:0,
              transition:"opacity .18s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity="0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity="1")}
            >
              🌐
            </a>

            {/* Notifications */}
            <button onClick={() => setShowNotif(v=>!v)} title="Notifications" style={{ background:"#f8fafc", border:"1px solid #e2e8f0", cursor:"pointer", width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
              🔔
            </button>

            {/* Cart */}
            <button onClick={() => setShowCart(true)} className={cartBounce ? "cart-bounce" : ""} title="Cart" style={{ position:"relative", background:"#f8fafc", border:"1px solid #e2e8f0", cursor:"pointer", width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
              🛒
              {cart.length > 0 && (
                <span style={{ position:"absolute", top:-5, right:-5, background:"#6366f1", color:"#fff", fontSize:8, fontWeight:800, padding:"1px 4px", borderRadius:99, minWidth:14, textAlign:"center", lineHeight:"12px", border:"1.5px solid #f8fafc" }}>
                  {cart.length}
                </span>
              )}
            </button>

            {/* Sign in */}
            <button onClick={() => setShowLogin(true)} title="Sign In" style={{
              background:"#0f172a", color:"#fff", border:"none", cursor:"pointer",
              padding:"7px 12px", borderRadius:10, fontSize:11, fontWeight:700, transition:"background .18s",
              display:"flex", alignItems:"center", gap:4
            }}
            onMouseEnter={e => (e.currentTarget.style.background="#6366f1")}
            onMouseLeave={e => (e.currentTarget.style.background="#0f172a")}
            >
              <span style={{ fontSize:13 }}>👤</span>
              <span className="hide-mobile">Sign In</span>
            </button>
          </div>
        </header>

        {/* ── Chat Area ── */}
        <main style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:18, maxWidth:860, margin:"0 auto", width:"100%" }}>
          {isEmpty ? (
            /* Welcome Screen */
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24, paddingTop:16, paddingBottom:32 }}>
              <div style={{ position:"relative" }}>
                <div style={{ width:76, height:76, borderRadius:22, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, boxShadow:"0 8px 32px rgba(99,102,241,.4)" }}>🛍️</div>
                <div style={{ position:"absolute", bottom:-4, right:-4, width:22, height:22, borderRadius:"50%", background:"#22c55e", border:"2px solid #f8fafc", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#14532d" }}>✓</div>
              </div>

              <div style={{ textAlign:"center" }}>
                <h2 style={{ fontSize:"clamp(20px,5vw,28px)", fontWeight:800, color:"#0f172a", lineHeight:1.2 }}>
                  Hey! I&apos;m your{" "}
                  <span style={{ background:"linear-gradient(135deg,#6366f1,#a78bfa,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Kapruka AI</span>
                </h2>
                <p style={{ marginTop:8, color:"#64748b", fontSize:14, lineHeight:1.6, maxWidth:340, margin:"8px auto 0" }}>
                  Search products, compare prices, find the perfect gift — just ask!
                </p>
                {/* Kapruka.com direct link */}
                <a href="https://www.kapruka.com" target="_blank" rel="noopener noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:14,
                    background:"linear-gradient(135deg,#f97316,#ef4444)",
                    color:"#fff", textDecoration:"none", padding:"9px 20px",
                    borderRadius:99, fontSize:13, fontWeight:700,
                    boxShadow:"0 4px 14px rgba(249,115,22,.35)", transition:"opacity .18s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity="0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity="1")}
                >
                  🌐 Visit kapruka.com
                </a>
              </div>

              {/* Quick chip pills */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:500 }}>
                {QUICK_CHIPS.map(c => (
                  <button key={c.q} onClick={() => doSearch(c.q, undefined, true)} className="pill-btn">
                    {c.e} {c.l}
                  </button>
                ))}
              </div>

              {/* Hero cards */}
              <div style={{ width:"100%", maxWidth:780 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>Trending now</span>
                  <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
                  {HERO_CARDS.map((h, i) => (
                    <button key={i} onClick={() => doSearch(h.q, undefined, true)} style={{
                      border:"1px solid #e8edf3", borderRadius:18, overflow:"hidden",
                      background:"#fff", cursor:"pointer", textAlign:"left", padding:0,
                      boxShadow:"0 2px 10px rgba(0,0,0,.06)", animation:`${h.anim} 3.5s ease-in-out ${i*0.7}s infinite`,
                      transition:"box-shadow .22s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow="0 14px 36px rgba(0,0,0,.13)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.06)")}
                    >
                      <div style={{ height:150, overflow:"hidden", background:"#f1f5f9" }}>
                        <img src={h.image} alt={h.title} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform .35s" }}
                          onMouseEnter={e => (e.currentTarget.style.transform="scale(1.07)")}
                          onMouseLeave={e => (e.currentTarget.style.transform="")}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }}
                        />
                      </div>
                      <div style={{ padding:"12px 14px" }}>
                        <p style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:3 }}>{h.title}</p>
                        <p style={{ fontSize:12, fontWeight:600, color:"#6366f1" }}>{h.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <>
              {msgs.map(m => {
                if (m.type === "loading") return <TypingIndicator key={m.id} />;
                return (
                  <MessageBubble key={m.id} msg={m} onSortChange={handleReSort} onAddToCart={handleAddToCart} />
                );
              })}
            </>
          )}
          <div ref={bottomRef} />
        </main>

        {/* ── Input Bar ── */}
        <footer style={{ flexShrink:0, padding:"10px 12px 12px", borderTop:"1px solid #e8edf3", background:"rgba(255,255,255,.96)", backdropFilter:"blur(20px)", paddingBottom:"calc(12px + env(safe-area-inset-bottom))" }}>
          <div style={{ maxWidth:860, margin:"0 auto" }}>
            <div className={`input-bar${focused?" focused":""}`}>
              {/* Voice */}
              <button onClick={startVoice} title={isListening?"Stop":"Voice search"} className={`icon-btn${isListening?" active":""}`} style={{ alignSelf:"flex-end", marginBottom:2, position:"relative" }}>
                {isListening && <span style={{ position:"absolute", inset:0, borderRadius:11, border:"2px solid #ef4444", animation:"voiceRing 1s ease-out infinite" }} />}
                🎤
              </button>

              {/* Photo */}
              <button onClick={() => setShowImgSearch(true)} title="Search by photo" className="icon-btn" style={{ alignSelf:"flex-end", marginBottom:2 }}>📷</button>

              {/* Textarea */}
              <textarea
                ref={textRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={loading || isListening}
                placeholder={isListening ? "🎤 Listening… speak now" : "Search products, ask for gifts, compare prices…"}
                style={{
                  flex:1, border:"none", outline:"none", background:"transparent",
                  fontSize:15, color:"#1e293b", lineHeight:1.55, padding:"6px 4px",
                  minHeight:32, maxHeight:180, fontFamily:"inherit",
                }}
              />

              {/* Send */}
              <button onClick={() => doSearch(input)} disabled={!input.trim() || loading} className="send-btn" style={{ alignSelf:"flex-end" }}>
                {loading
                  ? <span style={{ display:"inline-block", animation:"spin .7s linear infinite", fontSize:18 }}>⟳</span>
                  : "↑"}
              </button>
            </div>
            <p style={{ textAlign:"center", fontSize:10, color:"#94a3b8", marginTop:7 }}>
              🎤 Voice · 📷 Photo search · Press <kbd style={{ padding:"1px 5px", background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:4, fontSize:9 }}>Enter</kbd> to send
            </p>
          </div>
        </footer>
      </div>

      {/* Modals */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
      {showCart && <CartPanel onClose={() => setShowCart(false)} cart={cart} onRemove={handleRemoveFromCart} />}
      {showImgSearch && (
        <ImageSearchModal
          onClose={() => setShowImgSearch(false)}
          onSearch={q => { setShowImgSearch(false); doSearch(q); }}
        />
      )}
    </>
  );
}
