import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────────
   CATEGORY → KAPRUKA EXACT SEARCH TERM MAP
───────────────────────────────────────────────────────────────────────────── */
const EXACT_CATEGORY_QUERIES: Record<string, string> = {
  "birthday cake": "birthday cake", "wedding cake": "wedding cake",
  "chocolate cake": "chocolate cake", "fruit cake": "fruit cake", "cheese cake": "cheese cake",
  "rose bouquet": "rose flowers", "mixed flowers": "flower bouquet", "orchids": "orchid flowers",
  "sunflowers": "sunflower bouquet", "lily arrangement": "lily flowers",
  "chocolate gift box": "chocolate gift box", "dark chocolate": "dark chocolate",
  "milk chocolate box": "milk chocolate", "truffles": "chocolate truffles",
  "samsung galaxy": "samsung galaxy phone", "apple iphone": "apple iphone",
  "xiaomi": "xiaomi smartphone", "oneplus": "oneplus phone", "budget android phone": "android phone",
  "dslr camera": "dslr camera", "mirrorless camera": "mirrorless camera",
  "action camera": "action camera", "security camera": "security camera", "instant camera": "instant camera",
  "smart watch": "smart watch", "analog watch": "analog watch", "digital watch": "digital watch",
  "kids watch": "kids watch", "luxury watch": "luxury watch",
  "handbag": "ladies handbag", "backpack": "backpack bag", "travel bag": "travel bag",
  "laptop bag": "laptop bag", "school bag": "school bag",
  "sports shoes": "sports shoes", "formal shoes": "formal shoes",
  "casual sneakers": "casual sneakers", "sandals": "sandals", "kids shoes": "kids shoes",
  "gaming laptop": "gaming laptop", "business laptop": "business laptop",
  "budget laptop": "budget laptop", "macbook": "apple macbook", "chromebook": "chromebook",
  'smart tv 32"': "smart tv 32 inch", 'smart tv 43"': "smart tv 43 inch",
  'smart tv 55"': "smart tv 55 inch", "led tv": "led tv", "oled tv": "oled tv",
  "wireless headphones": "wireless headphones", "wired headphones": "wired headphones",
  "in-ear earbuds": "earbuds", "gaming headset": "gaming headset",
  "noise cancelling": "noise cancelling headphones",
  "gift hamper": "gift hamper", "birthday gift set": "birthday gift",
  "anniversary gift": "anniversary gift", "kids gift": "kids gift",
  "ipad": "apple ipad", "samsung tab": "samsung galaxy tab",
  "android tablet": "android tablet", "kids tablet": "kids tablet",
  "bluetooth speaker": "bluetooth speaker", "home theatre speaker": "home theatre speaker",
  "soundbar": "soundbar", "smart speaker": "smart speaker",
  "portable speaker": "portable bluetooth speaker",
  "men's perfume": "men perfume", "women's perfume": "women perfume",
  "unisex perfume": "unisex perfume", "gift set perfume": "perfume gift set",
  "silk saree": "silk saree", "cotton saree": "cotton saree",
  "georgette saree": "georgette saree", "designer saree": "designer saree", "batik saree": "batik saree",
  "educational toys": "educational toys", "action figures": "action figure toys",
  "board games": "board games", "soft toys": "soft toys",
  "remote control toys": "remote control toys",
  "flowers": "flowers", "smartphone": "smartphone",
  "women clothing": "women clothing", "books": "books",
  "laptop": "laptop", "flower bouquet": "flower bouquet",
};

/* ─────────────────────────────────────────────────────────────────────────────
   INTENT ANALYSIS — fast regex first, LLM fallback for non-English
───────────────────────────────────────────────────────────────────────────── */
type SortKey = "price_asc" | "price_desc" | "rating" | "newest" | "relevance";

interface Intent {
  query: string;
  sort: SortKey;
  maxPrice?: number;
  minPrice?: number;
  isDirectCategory: boolean;
}

const HAS_NON_ASCII = /[^\x00-\x7F]/;

function fastAnalyse(message: string): Intent {
  const msg = message.toLowerCase().trim();

  // Sort detection
  let sort: SortKey = "relevance";
  if (/\b(cheap|cheapest|lowest price|budget|affordable)\b/.test(msg)) sort = "price_asc";
  else if (/\b(expensive|highest price|premium|luxury|most expensive)\b/.test(msg)) sort = "price_desc";
  else if (/\b(best rated|top rated|highest rated|most popular|best quality)\b/.test(msg)) sort = "rating";
  else if (/\b(newest|latest|new arrival|recent)\b/.test(msg)) sort = "newest";

  // Price extraction
  let maxPrice: number | undefined;
  let minPrice: number | undefined;
  const underMatch = msg.match(/under\s+(?:rs\.?\s*|lkr\s*)?([\d,]+)/i);
  const aboveMatch = msg.match(/above\s+(?:rs\.?\s*|lkr\s*)?([\d,]+)/i);
  const betweenMatch = msg.match(/between\s+(?:rs\.?\s*|lkr\s*)?([\d,]+)\s+and\s+(?:rs\.?\s*|lkr\s*)?([\d,]+)/i);
  if (underMatch) maxPrice = parseInt(underMatch[1].replace(/,/g, ""));
  if (aboveMatch) minPrice = parseInt(aboveMatch[1].replace(/,/g, ""));
  if (betweenMatch) {
    minPrice = parseInt(betweenMatch[1].replace(/,/g, ""));
    maxPrice = parseInt(betweenMatch[2].replace(/,/g, ""));
  }

  // Strip filler words
  const FILLERS = /\b(buy|get|find|search for|show me|show|want|need|looking for|i want|i need|give me|can you|please|help me find|i am looking for|i need to buy|i want to buy)\b/gi;
  const SORT_WORDS = /\b(cheap|cheapest|affordable|budget|premium|luxury|expensive|best rated|top rated|popular|newest|latest|recent|best quality)\b/gi;
  const PRICE_PHRASES = /(?:under|above|below|between)\s+(?:rs\.?\s*|lkr\s*)?[\d,]+(?:\s+and\s+(?:rs\.?\s*|lkr\s*)?[\d,]+)?/gi;

  let query = message
    .replace(FILLERS, " ")
    .replace(SORT_WORDS, " ")
    .replace(PRICE_PHRASES, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!query) query = message.trim();
  return { query, sort, maxPrice, minPrice, isDirectCategory: false };
}

async function analyseIntent(message: string, isDirectCategory = false): Promise<Intent> {
  const msg = message.toLowerCase().trim();

  // Exact UI chip match → bypass everything
  const exactQuery = EXACT_CATEGORY_QUERIES[msg];
  if (exactQuery || isDirectCategory) {
    return {
      query: exactQuery || message.trim(),
      sort: "relevance",
      isDirectCategory: true,
    };
  }

  // Pure ASCII → use fast regex, skip LLM call entirely
  if (!HAS_NON_ASCII.test(message)) {
    return fastAnalyse(message);
  }

  // Non-ASCII (Sinhala/Tamil) → use LLM for translation only
  try {
    const result = await generateText({
      model: google("gemini-1.5-flash"),
      system: "You are a local Sri Lankan Kapruka shopping agent. You speak English, Sinhala, Singlish, Tamil, and Tamilish. CRITICAL RULE: The Kapruka database ONLY understands English keywords. If a user asks for something in Sinhala or Tamil, you MUST translate the item into a short English keyword (e.g., 'toy') BEFORE calling the tool. NEVER pass Sinhala or Tamil characters into the 'q' parameter.",
      messages: [{ role: "user", content: message }],
      tools: {
        kapruka_search_products: {
          description: "Search Kapruka for products",
          parameters: z.object({
            q: z.string().describe("The translated English search query"),
            sort: z.enum(["relevance", "price_asc", "price_desc", "rating", "newest"]).optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
          }),
        } as any,
      },
    });

    if (result.toolCalls && result.toolCalls.length > 0) {
      const call: any = result.toolCalls[0];
      if (call.toolName === "kapruka_search_products") {
        const args = call.args || call.parameters || {};
        return {
          query: args.q || message.trim(),
          sort: args.sort || "relevance",
          minPrice: args.minPrice,
          maxPrice: args.maxPrice,
          isDirectCategory: false,
        };
      }
    }
  } catch (e) {
    console.error("LLM translation failed, falling back to raw text:", e);
  }

  return fastAnalyse(message);
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT NORMALISATION & SORTING
───────────────────────────────────────────────────────────────────────────── */
function normaliseProducts(raw: any[]): any[] {
  return raw.map(p => {
    const price =
      typeof p.price === "number"
        ? p.price
        : parseFloat(String(p.price ?? p.Price ?? 0).replace(/[^0-9.]/g, "")) || 0;

    const id = p.id ?? p.product_id ?? p.productId;
    const slug = p.slug ?? p.url_key ?? undefined;

    // Build best possible URL
    let url = p.url ?? p.product_url ?? p.link ?? undefined;
    if (!url && id) url = `https://www.kapruka.com/buyonline/${id}`;
    else if (!url && slug) url = `https://www.kapruka.com/products/${slug}`;

    return {
      id,
      name: p.name ?? p.title ?? p.product_name ?? "Unknown Product",
      price,
      _numPrice: price,
      originalPrice: p.originalPrice ?? p.original_price ?? p.mrp ?? undefined,
      image: p.image ?? p.image_url ?? p.imageUrl ?? p.thumbnail ?? p.img ?? undefined,
      rating: p.rating ?? p.stars ?? undefined,
      reviewCount: p.reviewCount ?? p.review_count ?? p.reviews ?? undefined,
      category: p.category ?? p.categoryName ?? undefined,
      url,
      discount: p.discount ?? p.discountPercent ?? undefined,
      inStock: p.inStock ?? p.in_stock ?? p.available ?? true,
    };
  });
}

function deduplicateProducts(products: any[]): any[] {
  const seen = new Set<string>();
  return products.filter(p => {
    const key = String(p.name || "").toLowerCase().trim().slice(0, 40) + String(p.price || "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortProducts(products: any[], sort: SortKey): any[] {
  const arr = [...products];
  switch (sort) {
    case "price_asc":  arr.sort((a, b) => (a._numPrice ?? 0) - (b._numPrice ?? 0)); break;
    case "price_desc": arr.sort((a, b) => (b._numPrice ?? 0) - (a._numPrice ?? 0)); break;
    case "rating":     arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
    case "newest":     arr.reverse(); break;
  }
  return arr;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MCP SEARCH — crash-proof with SSE + JSON-RPC fallbacks
───────────────────────────────────────────────────────────────────────────── */
const MCP_URL = "https://mcp.kapruka.com/mcp";
const HEADERS_BASE = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/event-stream",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KaprukaAgent/1.0",
};

/** Parse SSE stream for the first JSON-RPC result */
async function parseSSEResponse(text: string): Promise<any[]> {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload);
      // JSON-RPC result wrapper
      if (parsed?.result?.content?.[0]?.text) {
        const inner = JSON.parse(parsed.result.content[0].text);
        if (Array.isArray(inner)) return inner;
        if (Array.isArray(inner?.products)) return inner.products;
        if (Array.isArray(inner?.items)) return inner.items;
      }
      if (Array.isArray(parsed?.result)) return parsed.result;
      if (Array.isArray(parsed?.result?.products)) return parsed.result.products;
      if (Array.isArray(parsed?.products)) return parsed.products;
    } catch {
      // non-JSON SSE frame — skip
    }
  }
  return [];
}

/** Try initialise → tools/call flow to get a proper sessionId from MCP */
async function tryMCPWithSession(q: string): Promise<any[]> {
  // Step 1: Initialize
  const initRes = await fetch(MCP_URL, {
    method: "POST",
    headers: HEADERS_BASE,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "kapruka-ai", version: "1.0.0" },
      },
    }),
  });

  const initRaw = await initRes.text();
  let sessionId: string | undefined;

  // Check response header for session
  sessionId = initRes.headers.get("mcp-session-id") ??
              initRes.headers.get("x-session-id") ??
              initRes.headers.get("session-id") ??
              undefined;

  if (!sessionId) {
    try {
      const initData = JSON.parse(initRaw);
      sessionId = initData?.result?.sessionId ?? initData?.sessionId ?? undefined;
    } catch { /* SSE response */ }
  }

  if (!sessionId) {
    console.log("⚠️ No session ID from initialize, skipping session method");
    return [];
  }

  console.log("✅ Got MCP session:", sessionId);

  const toolHeaders: Record<string, string> = {
    ...HEADERS_BASE,
    "mcp-session-id": sessionId,
    "x-session-id": sessionId,
  };

  // Step 2: Send initialized notification (required by MCP spec)
  await fetch(MCP_URL, {
    method: "POST",
    headers: toolHeaders,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  }).catch(() => {/* ignore */});

  // Step 3: Call the search tool
  const toolRes = await fetch(MCP_URL, {
    method: "POST",
    headers: toolHeaders,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 2,
      params: { name: "kapruka_search_products", arguments: { q } },
    }),
  });

  const toolRaw = await toolRes.text();
  console.log("🔍 MCP tools/call status:", toolRes.status, "response length:", toolRaw.length);

  // Try JSON parse first
  try {
    const data = JSON.parse(toolRaw);
    if (data?.result?.content?.[0]?.text) {
      const inner = JSON.parse(data.result.content[0].text);
      if (Array.isArray(inner)) return inner;
      if (Array.isArray(inner?.products)) return inner.products;
    }
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.result?.products)) return data.result.products;
  } catch { /* not JSON */ }

  // Try SSE parse
  return parseSSEResponse(toolRaw);
}

/** Direct JSON-RPC call without session (simplest approach) */
async function tryDirectCall(q: string): Promise<any[]> {
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: HEADERS_BASE,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 1,
      params: { name: "kapruka_search_products", arguments: { q } },
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    console.error(`🚨 HTTP Error [${response.status}]:`, rawText.substring(0, 400));
    return [];
  }

  // Try JSON
  try {
    const data = JSON.parse(rawText);
    if (data?.result?.content?.[0]?.text) {
      try {
        const inner = JSON.parse(data.result.content[0].text);
        if (Array.isArray(inner)) return inner;
        if (Array.isArray(inner?.products)) return inner.products;
        if (Array.isArray(inner?.items)) return inner.items;
      } catch (e) {
        console.error("🚨 Failed to parse inner product text:", data.result.content[0].text.substring(0, 200));
      }
    }
    if (data?.result?.products) return data.result.products;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.products)) return data.products;
    return [];
  } catch {
    // SSE fallback
    console.log("ℹ️ Response is SSE, parsing as event-stream…");
    return parseSSEResponse(rawText);
  }
}

async function searchKapruka(q: string, sort: SortKey = "relevance"): Promise<any[]> {
  console.log("🚀 Kapruka search:", q, "sort:", sort);

  let rawProducts: any[] = [];

  // Method 1: Initialize then call (proper MCP session flow)
  try {
    rawProducts = await tryMCPWithSession(q);
    if (rawProducts.length > 0) console.log(`✅ Session method: ${rawProducts.length} products`);
  } catch (e) {
    console.error("⚠️ Session method failed:", e instanceof Error ? e.message : e);
  }

  // Method 2: Direct JSON-RPC call
  if (rawProducts.length === 0) {
    try {
      rawProducts = await tryDirectCall(q);
      if (rawProducts.length > 0) console.log(`✅ Direct method: ${rawProducts.length} products`);
    } catch (e) {
      console.error("⚠️ Direct method failed:", e instanceof Error ? e.message : e);
    }
  }

  if (rawProducts.length === 0) {
    console.log("⚠️ MCP returned 0 products for query:", q);
    return [];
  }

  const normed = normaliseProducts(rawProducts);
  const deduped = deduplicateProducts(normed);
  return sortProducts(deduped, sort);
}

/* ─────────────────────────────────────────────────────────────────────────────
   API ROUTE
───────────────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages, action, query: bodyQuery, sort: bodySort, isDirectCategory, minPrice, maxPrice } = body;

    // ── Direct search action (chip click / re-sort) ────────────────────────
    if (action === "search" && bodyQuery) {
      const sort: SortKey = bodySort ?? "relevance";
      const q = EXACT_CATEGORY_QUERIES[String(bodyQuery).toLowerCase()] ?? bodyQuery;
      let products = await searchKapruka(q, sort);

      // Price filter
      if (minPrice != null || maxPrice != null) {
        products = products.filter(p => {
          if (minPrice != null && (p._numPrice ?? 0) < minPrice) return false;
          if (maxPrice != null && (p._numPrice ?? 0) > maxPrice) return false;
          return true;
        });
      }

      return Response.json({ type: "products", products, query: q, sort });
    }

    // ── Conversational message ─────────────────────────────────────────────
    const msgs = Array.isArray(messages) ? messages : [];
    const lastMsg = msgs.findLast((m: any) => m.role === "user");
    const rawText: string =
      lastMsg?.parts?.find((p: any) => p.type === "text")?.text ??
      (typeof lastMsg?.content === "string" ? lastMsg.content : "") ?? "";

    if (!rawText.trim()) {
      return Response.json({ error: "No message" }, { status: 400 });
    }

    const intent = await analyseIntent(rawText, Boolean(isDirectCategory));

    let products = await searchKapruka(intent.query, intent.sort);

    // Price filter
    if (intent.minPrice != null || intent.maxPrice != null) {
      products = products.filter(p => {
        if (intent.minPrice != null && (p._numPrice ?? 0) < intent.minPrice) return false;
        if (intent.maxPrice != null && (p._numPrice ?? 0) > intent.maxPrice) return false;
        return true;
      });
    }

    return Response.json({
      type: "products",
      products,
      query: intent.query,
      sort: intent.sort,
      priceFilter:
        intent.minPrice != null || intent.maxPrice != null
          ? { min: intent.minPrice, max: intent.maxPrice }
          : undefined,
    });
  } catch (err) {
    console.error("API error:", err);
    return Response.json({ error: "Server error", details: String(err) }, { status: 500 });
  }
}
