import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
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
  text?: string;
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

  // Strip filler words (including common Singlish and Tamilish words as a fallback)
  const FILLERS = /\b(buy|get|find|search for|show me|show|want|need|looking for|i want|i need|give me|can you|please|help me find|i am looking for|i need to buy|i want to buy|mata|ekak|oni|ona|hoda|lassana|labeta|apata|tiyeda|tiyenawa|ganna|enakku|vendum|venum|pookal|nalla|laabamaana|irukkiṟathā|irukada)\b/gi;
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

  // Exact UI chip match → bypass LLM entirely
  const exactQuery = EXACT_CATEGORY_QUERIES[msg];
  if (exactQuery || isDirectCategory) {
    return {
      query: exactQuery || message.trim(),
      sort: "relevance",
      isDirectCategory: true,
    };
  }

  // Conversational query (English, Sinhala, Tamil, Singlish, Tanglish) → LLM translates to English
  try {
    const result = await generateText({
      model: google("gemini-1.5-flash"),
      system: "You are Kapruka's ultimate, human-like AI shopping companion. You chat like a highly emotionally intelligent, helpful Sri Lankan friend.\n" +
              "\n" +
              "1. YOUR PERSONA (HOW YOU SPEAK):\n" +
              "- You understand English, Sinhala, Tamil, and Singlish perfectly. \n" +
              "- You reply primarily in natural English mixed with friendly Singlish (e.g., \"machan\", \"bro\", \"aiyo\", \"ela\", \"superb\").\n" +
              "- Be empathetic and human. If someone says \"I forgot an anniversary\", react with urgency (\"Aiyo! Let's sort this out right now.\").\n" +
              "- Speak in short, punchy sentences. Never use robotic asterisks like *smiles*. \n" +
              "\n" +
              "2. THE SEARCH PROTOCOL (HOW YOU USE TOOLS) - CRITICAL:\n" +
              "When a user asks for an item, NEVER pass their conversational sentence into the `kapruka_search_products` tool. You MUST extract ONLY the pure English product noun.\n" +
              "- If user says: \"bro I need a mobile phone\" -> You pass ONLY \"smartphone\" or \"mobile phone\" to the tool.\n" +
              "- If user says: \"මට ලස්සන රතු පාට ගවුමක් ඕනේ\" -> You pass ONLY \"red dress\" to the tool.\n" +
              "- If user says: \"ammata podi cake ekak\" -> You pass ONLY \"cake\" to the tool.\n" +
              "\n" +
              "Talk to the user like a local friend, but search the database like a strict English machine.",
      messages: [{ role: "user", content: message }],
      tools: {
        kapruka_search_products: {
          description: "Search the Kapruka Sri Lanka store for products. The search keyword MUST be pure English — extract only the core product noun.",
          parameters: z.object({
            q: z.string().describe("CRITICAL: Only use pure English nouns (e.g., 'cake', 'smartphone'). DO NOT include conversational words like 'I need' or 'bro'. TRANSLATE Sinhala/Tamil inputs to English first."),
            sort: z.enum(["relevance", "price_asc", "price_desc", "rating", "newest"]).optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
          }),
        } as any,
      },
    });

    const conversationalText = result.text || "";
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
          text: conversationalText,
        };
      }
    } else {
      return {
        query: "",
        sort: "relevance",
        isDirectCategory: false,
        text: conversationalText,
      };
    }
  } catch (e) {
    console.error("LLM translation failed, falling back to fast regex:", e);
  }

  return fastAnalyse(message);
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT NORMALISATION & SORTING
───────────────────────────────────────────────────────────────────────────── */
function normaliseProducts(raw: any[]): any[] {
  return raw.map(p => {
    let priceVal = 0;
    if (p.price && typeof p.price === "object") {
      priceVal = p.price.amount ?? 0;
    } else {
      priceVal = typeof p.price === "number"
        ? p.price
        : parseFloat(String(p.price ?? p.Price ?? 0).replace(/[^0-9.]/g, "")) || 0;
    }

    const id = p.id ?? p.product_id ?? p.productId;
    const slug = p.slug ?? p.url_key ?? undefined;

    // Build best possible URL
    let url = p.url ?? p.product_url ?? p.link ?? undefined;
    if (!url && id) url = `https://www.kapruka.com/buyonline/${id}`;
    else if (!url && slug) url = `https://www.kapruka.com/products/${slug}`;

    return {
      id,
      name: p.name ?? p.title ?? p.product_name ?? "Unknown Product",
      price: priceVal,
      _numPrice: priceVal,
      originalPrice: p.originalPrice ?? p.original_price ?? p.mrp ?? p.compare_at_price?.amount ?? undefined,
      image: p.image_url ?? p.image ?? p.imageUrl ?? p.thumbnail ?? p.img ?? undefined,
      rating: p.rating ?? p.stars ?? undefined,
      reviewCount: p.reviewCount ?? p.review_count ?? p.reviews ?? undefined,
      category: p.category && typeof p.category === "object" ? p.category.name : (p.category ?? p.categoryName ?? undefined),
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
   MCP SEARCH — SDK primary (handles SSE streaming), fetch fallback
───────────────────────────────────────────────────────────────────────────── */
const MCP_URL = "https://mcp.kapruka.com/mcp";

/** Universally extract a product array from any MCP result shape */
function extractProducts(result: any): any[] {
  if (!result) return [];
  const text = result?.content?.[0]?.text ?? result?.content?.[0]?.value;
  if (text && typeof text === "string") {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.results)) return parsed.results;
      if (Array.isArray(parsed?.products)) return parsed.products;
      if (Array.isArray(parsed?.items)) return parsed.items;
    } catch { /* not JSON */ }
  }
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.results)) return result.results;
  if (Array.isArray(result?.products)) return result.products;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

/** Method 1: Official MCP SDK — designed for streaming/SSE endpoints */
async function trySDKSearch(q: string, sort: SortKey): Promise<any[]> {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client(
    { name: "kapruka-ai", version: "2.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  const result = await client.callTool({
    name: "kapruka_search_products",
    arguments: {
      params: {
        q,
        limit: 30, // Show more product results (up to 30 instead of default 10)
        sort: sort === "relevance" ? undefined : sort,
        response_format: "json"
      }
    },
  });
  transport.close().catch(() => {});
  console.log("🔍 SDK call successful!");
  return extractProducts(result);
}

/** Method 2: Direct fetch with handshake and 15-second AbortSignal timeout */
async function tryFetchSearch(q: string, sort: SortKey): Promise<any[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const baseHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KaprukaAgent/1.0"
  };

  try {
    // 1. Initialize to obtain session ID
    const initRes = await fetch(MCP_URL, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1,
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "kapruka-ai-fetch", version: "2.0.0" }
        }
      }),
      signal: controller.signal
    });

    if (!initRes.ok) {
      console.error(`🚨 INIT HTTP ${initRes.status}`);
      clearTimeout(timer);
      return [];
    }

    const mcpSessionId = initRes.headers.get("mcp-session-id");
    if (!mcpSessionId) {
      console.error("🚨 Missing mcp-session-id header from initialize");
      clearTimeout(timer);
      return [];
    }

    // 2. Call the search tool with header and nested arguments
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        ...baseHeaders,
        "Mcp-Session-Id": mcpSessionId
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: 2,
        params: {
          name: "kapruka_search_products",
          arguments: {
            params: {
              q,
              limit: 30, // Show more product results (up to 30 instead of default 10)
              sort: sort === "relevance" ? undefined : sort,
              response_format: "json"
            }
          }
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timer);
    if (!response.ok) {
      console.error(`🚨 CALL HTTP ${response.status}`);
      return [];
    }

    const rawText = await response.text();
    console.log(`🔍 Fetch MCP status=${response.status} len=${rawText.length}`);

    // Try JSON
    try {
      const data = JSON.parse(rawText);
      const products = extractProducts(data?.result ?? data);
      if (products.length > 0) return products;
    } catch { /* not JSON */ }

    // Parse SSE frames
    for (const line of rawText.split("\n")) {
      if (!line.trim().startsWith("data:")) continue;
      const payload = line.trim().slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const frame = JSON.parse(payload);
        const products = extractProducts(frame?.result ?? frame);
        if (products.length > 0) return products;
      } catch { /* skip */ }
    }
    return [];
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") console.error("🚨 Fetch timed out after 15s");
    else console.error("🚨 Fetch error:", err.message);
    return [];
  }
}

async function searchKapruka(q: string, sort: SortKey = "relevance"): Promise<any[]> {
  console.log("🚀 Kapruka search:", q, "sort:", sort);
  let rawProducts: any[] = [];

  // Method 1: MCP SDK
  try {
    rawProducts = await trySDKSearch(q, sort);
    if (rawProducts.length > 0) console.log(`✅ SDK: ${rawProducts.length} products`);
  } catch (e) {
    console.error("⚠️ SDK failed:", e instanceof Error ? e.message : String(e));
  }

  // Method 2: Handshake fetch fallback
  if (rawProducts.length === 0) {
    try {
      rawProducts = await tryFetchSearch(q, sort);
      if (rawProducts.length > 0) console.log(`✅ Fetch: ${rawProducts.length} products`);
    } catch (e) {
      console.error("⚠️ Fetch failed:", e instanceof Error ? e.message : String(e));
    }
  }

  if (rawProducts.length === 0) {
    console.warn("⚠️ Both methods returned 0 products for:", q);
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
      text: intent.text,
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
