import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

/* ───────────────────────────────────────────────────────────────────────────
   Intent Analysis — parse what the user actually wants from their message
─────────────────────────────────────────────────────────────────────────── */
function analyseIntent(message: string): {
  query: string;
  sort: "price_asc" | "price_desc" | "rating" | "newest" | "relevance";
  maxPrice?: number;
  minPrice?: number;
  suggestions: string[];
  needsClarification: boolean;
  clarificationOptions: string[];
} {
  const msg = message.toLowerCase().trim();

  // --- Sort detection ---
  let sort: "price_asc" | "price_desc" | "rating" | "newest" | "relevance" = "relevance";
  if (/cheap|lowest price|budget|affordable|under|less than|cheapest/.test(msg)) sort = "price_asc";
  else if (/expensive|highest price|premium|luxury|best quality/.test(msg)) sort = "price_desc";
  else if (/best rated|top rated|highest rated|popular|rating/.test(msg)) sort = "rating";
  else if (/new|latest|newest|recent/.test(msg)) sort = "newest";

  // --- Price extraction ---
  let maxPrice: number | undefined;
  let minPrice: number | undefined;
  const underMatch = msg.match(/under\s+(?:rs\.?\s*|lkr\s*)?(\d[\d,]*)/i);
  const aboveMatch = msg.match(/above\s+(?:rs\.?\s*|lkr\s*)?(\d[\d,]*)/i);
  const betweenMatch = msg.match(/between\s+(?:rs\.?\s*|lkr\s*)?(\d[\d,]*)\s+and\s+(?:rs\.?\s*|lkr\s*)?(\d[\d,]*)/i);
  if (underMatch) maxPrice = parseInt(underMatch[1].replace(/,/g, ""));
  if (aboveMatch) minPrice = parseInt(aboveMatch[1].replace(/,/g, ""));
  if (betweenMatch) {
    minPrice = parseInt(betweenMatch[1].replace(/,/g, ""));
    maxPrice = parseInt(betweenMatch[2].replace(/,/g, ""));
  }

  // --- Extract core search query ---
  let query = message
    .replace(/\b(buy|get|find|search|show|want|need|looking for|i want|i need|give me|can you|please|for me|under|above|between|cheap|cheapest|affordable|budget|premium|luxury|best|latest|newest|popular|top rated|rated|rating|rs\.|lkr|\d+)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // --- Category-based disambiguation ---
  const AMBIGUOUS: Record<string, string[]> = {
    camera: ["DSLR Camera", "Mirrorless Camera", "Action Camera", "Security Camera / CCTV", "Instant Camera"],
    phone: ["Samsung Galaxy", "Apple iPhone", "Xiaomi", "OnePlus", "Budget Android Phone"],
    watch: ["Smart Watch", "Analog Watch", "Digital Watch", "Kids Watch", "Luxury Watch"],
    bag: ["Handbag", "Backpack", "Travel Bag", "Laptop Bag", "School Bag"],
    shoe: ["Sports Shoes", "Formal Shoes", "Casual Sneakers", "Sandals", "Kids Shoes"],
    shoes: ["Sports Shoes", "Formal Shoes", "Casual Sneakers", "Sandals", "Kids Shoes"],
    laptop: ["Gaming Laptop", "Business Laptop", "Budget Laptop", "MacBook", "Chromebook"],
    tv: ["Smart TV 32\"", "Smart TV 43\"", "Smart TV 55\"", "LED TV", "OLED TV"],
    headphone: ["Wireless Headphones", "Wired Headphones", "In-ear Earbuds", "Gaming Headset", "Noise Cancelling"],
    headphones: ["Wireless Headphones", "Wired Headphones", "In-ear Earbuds", "Gaming Headset", "Noise Cancelling"],
    cake: ["Birthday Cake", "Wedding Cake", "Chocolate Cake", "Fruit Cake", "Cheese Cake"],
    flower: ["Rose Bouquet", "Mixed Flowers", "Orchids", "Sunflowers", "Lily Arrangement"],
    flowers: ["Rose Bouquet", "Mixed Flowers", "Orchids", "Sunflowers", "Lily Arrangement"],
    gift: ["Gift Hamper", "Chocolate Gift Box", "Birthday Gift Set", "Anniversary Gift", "Kids Gift"],
    tablet: ["iPad", "Samsung Tab", "Android Tablet", "Kids Tablet", "Budget Tablet"],
    speaker: ["Bluetooth Speaker", "Home Theatre Speaker", "Soundbar", "Smart Speaker", "Portable Speaker"],
    perfume: ["Men's Perfume", "Women's Perfume", "Unisex Perfume", "Gift Set Perfume", "Local Brand Perfume"],
    saree: ["Silk Saree", "Cotton Saree", "Georgette Saree", "Designer Saree", "Batik Saree"],
    toy: ["Educational Toys", "Action Figures", "Board Games", "Soft Toys", "Remote Control Toys"],
    toys: ["Educational Toys", "Action Figures", "Board Games", "Soft Toys", "Remote Control Toys"],
  };

  // Check if the query matches an ambiguous category
  let clarificationOptions: string[] = [];
  let needsClarification = false;

  const queryWords = query.toLowerCase().split(/\s+/);
  for (const word of queryWords) {
    if (AMBIGUOUS[word]) {
      clarificationOptions = AMBIGUOUS[word];
      needsClarification = true;
      break;
    }
  }

  // If the query is very short (1-2 words) and ambiguous, ask for clarification
  if (query.split(" ").filter(Boolean).length <= 2 && needsClarification) {
    // Keep it for clarification
  } else {
    // Query is specific enough, don't ask
    needsClarification = false;
  }

  // --- Smart suggestions based on query ---
  const suggestions = generateSuggestions(query, clarificationOptions);

  return { query: query || message.trim(), sort, maxPrice, minPrice, suggestions, needsClarification, clarificationOptions };
}

function generateSuggestions(query: string, options: string[]): string[] {
  if (options.length > 0) return options.slice(0, 5);
  const q = query.toLowerCase();
  if (q.includes("cake")) return ["Birthday Cake", "Wedding Cake", "Chocolate Cake", "Cheesecake"];
  if (q.includes("flower")) return ["Rose Bouquet", "Mixed Flowers", "Orchids", "Lilies"];
  if (q.includes("chocolate")) return ["Dark Chocolate", "Milk Chocolate Box", "Chocolate Gift Set", "Truffles"];
  if (q.includes("phone")) return ["Samsung Phone", "iPhone", "Xiaomi Phone", "Budget Phone"];
  return [];
}

/* ───────────────────────────────────────────────────────────────────────────
   MCP Search
─────────────────────────────────────────────────────────────────────────── */
async function searchKapruka(query: string, sort?: string): Promise<any[]> {
  const TIMEOUT = 9000;

  // Build sort argument
  const sortArg = sort && sort !== "relevance" ? sort : undefined;

  try {
    const res = await fetch("https://mcp.kapruka.com/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: Date.now(),
        params: {
          name: "kapruka_search_products",
          arguments: { q: query, ...(sortArg && { sort: sortArg }) },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("MCP RAW:", JSON.stringify(data).slice(0, 400));

    // Try various response shapes
    const textContent = data?.result?.content?.[0]?.text;
    if (textContent) {
      try {
        const parsed = JSON.parse(textContent);
        const arr = Array.isArray(parsed) ? parsed : parsed?.products || parsed?.items || parsed?.results;
        if (Array.isArray(arr) && arr.length > 0) {
          return filterAndSort(arr, sort);
        }
      } catch {
        // Markdown format
        const parsed = parseMarkdown(textContent);
        if (parsed.length > 0) return filterAndSort(parsed, sort);
      }
    }

    const direct = data?.result;
    if (Array.isArray(direct) && direct.length > 0) return filterAndSort(direct, sort);
    if (direct?.products && Array.isArray(direct.products)) return filterAndSort(direct.products, sort);
  } catch (err) {
    console.error("MCP Error:", err);
  }

  // Fallback via MCP Client SDK
  try {
    const transport = new StreamableHTTPClientTransport(new URL("https://mcp.kapruka.com/mcp"));
    const client = new Client({ name: "Kapruka-AI", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    try {
      const result = await client.callTool({
        name: "kapruka_search_products",
        arguments: { q: query, ...(sortArg && { sort: sortArg }) },
      });
      const text = (result as any)?.content?.[0]?.text;
      if (text) {
        try {
          const p = JSON.parse(text);
          const arr = Array.isArray(p) ? p : p?.products;
          if (Array.isArray(arr) && arr.length > 0) return filterAndSort(arr, sort);
        } catch {
          const parsed = parseMarkdown(text);
          if (parsed.length > 0) return filterAndSort(parsed, sort);
        }
      }
    } finally {
      await transport.close();
    }
  } catch (e2) {
    console.error("MCP SDK Error:", e2);
  }

  return mockProducts(query);
}

function filterAndSort(products: any[], sort?: string): any[] {
  let arr = [...products];

  // Normalize price
  arr = arr.map(p => ({
    ...p,
    _numPrice: typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, "")) || 0,
  }));

  switch (sort) {
    case "price_asc":
      arr.sort((a, b) => a._numPrice - b._numPrice);
      break;
    case "price_desc":
      arr.sort((a, b) => b._numPrice - a._numPrice);
      break;
    case "rating":
      arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "newest":
      arr.reverse();
      break;
  }

  return arr;
}

function parseMarkdown(text: string): any[] {
  const products: any[] = [];
  const blocks = text.split(/\n(?=\*\*\d+\.\s)/);
  for (const block of blocks) {
    const nameMatch = block.match(/^\*\*\d+\.\s+(.+?)\*\*/);
    if (!nameMatch) continue;
    const priceMatch = block.match(/LKR\s+([\d,]+)/);
    const urlMatch = block.match(/\[View (?:product|on Kapruka)\]\(([^)]+)\)/);
    const idMatch = block.match(/ID:\s+`([^`]+)`/);
    const ratingMatch = block.match(/Rating.*?([\d.]+)\/5/);
    const imageMatch = block.match(/(https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp|gif))/i);
    products.push({
      id: idMatch?.[1] || `p-${Math.random().toString(36).slice(2)}`,
      name: nameMatch[1].trim(),
      price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 0,
      url: urlMatch?.[1],
      image: imageMatch?.[1],
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
      inStock: !block.toLowerCase().includes("out of stock"),
    });
  }
  return products;
}

function mockProducts(query: string): any[] {
  const q = encodeURIComponent(query);
  return [
    {
      id: "m1", name: `${query} – Premium Selection`, price: 2450,
      image: "https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/pc00334/choc0v571p00076/choc0v571p00076_1.jpg",
      url: `https://www.kapruka.com/search/?q=${q}`, inStock: true, rating: 4.5, reviewCount: 128,
    },
    {
      id: "m2", name: `${query} – Gift Box Set`, price: 1850,
      image: "https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/vendor/cake00ka00171/cake00ka00171_1.jpg",
      url: `https://www.kapruka.com/search/?q=${q}`, inStock: true, rating: 4.2, reviewCount: 89,
    },
    {
      id: "m3", name: `${query} – Luxury Pack`, price: 4200,
      image: "https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/kapruka/flowers00t1558/flowers00t1558_1.jpg",
      url: `https://www.kapruka.com/search/?q=${q}`, inStock: true, rating: 4.8, reviewCount: 214,
    },
  ];
}

/* ───────────────────────────────────────────────────────────────────────────
   API Route
─────────────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, action } = body;

    // Handle direct search action (from suggestion click)
    if (action === "search" && body.query) {
      const products = await searchKapruka(body.query, body.sort);
      return Response.json({ products, query: body.query, sort: body.sort, type: "products" });
    }

    // Extract last user message
    const msgs = Array.isArray(messages) ? messages : [];
    const lastMsg = msgs.findLast((m: any) => m.role === "user");
    const rawText: string =
      lastMsg?.parts?.find((p: any) => p.type === "text")?.text ??
      (typeof lastMsg?.content === "string" ? lastMsg.content : "") ?? "";

    if (!rawText.trim()) {
      return Response.json({ error: "No message provided" }, { status: 400 });
    }

    const intent = analyseIntent(rawText);
    console.log("Intent:", intent);

    // If needs clarification, return options immediately without searching
    if (intent.needsClarification) {
      return Response.json({
        type: "clarification",
        message: `What type of **${intent.query}** are you looking for?`,
        options: intent.clarificationOptions,
        query: intent.query,
        sort: intent.sort,
      });
    }

    // Perform search
    const products = await searchKapruka(intent.query, intent.sort);

    // Filter by price if specified
    let filtered = products;
    if (intent.minPrice !== undefined || intent.maxPrice !== undefined) {
      filtered = products.filter(p => {
        const price = (p as any)._numPrice ?? (typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, "")) || 0);
        if (intent.minPrice !== undefined && price < intent.minPrice) return false;
        if (intent.maxPrice !== undefined && price > intent.maxPrice) return false;
        return true;
      });
    }

    return Response.json({
      type: "products",
      products: filtered,
      query: intent.query,
      sort: intent.sort,
      suggestions: intent.suggestions.length > 0 ? intent.suggestions : undefined,
      priceFilter: intent.minPrice !== undefined || intent.maxPrice !== undefined
        ? { min: intent.minPrice, max: intent.maxPrice }
        : undefined,
    });
  } catch (err) {
    console.error("API Error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
