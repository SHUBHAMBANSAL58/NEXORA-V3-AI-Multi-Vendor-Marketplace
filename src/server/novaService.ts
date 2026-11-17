import { GoogleGenAI } from '@google/genai';
import { db, DBProduct } from './db.js';

export interface NovaChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface NovaChatResult {
  ok: true;
  reply: string;
  recommendedProductTitle?: string;
  model: string;
  mode: 'gemini-live' | 'offline-catalog-fallback';
}

export interface NovaChatError {
  ok: false;
  status: number;
  error: string;
}

function buildCatalogContext(products: DBProduct[]): string {
  const compactItems = products.map((p) => ({
    id: p.id,
    title: p.title,
    brand: p.brand,
    category: p.category,
    priceINR: Math.round(p.pricePaise / 100),
    stock: p.stock,
    rating: p.rating,
    hsn: p.hsnCode,
    seller: `${p.seller.storeName} (${p.seller.city})`,
  }));

  return JSON.stringify(compactItems);
}

function scoreCatalogProducts(queryText: string, products: DBProduct[]): DBProduct[] {
  const normalized = queryText.toLowerCase();
  const direct = products.filter((p) => normalized.includes(p.title.toLowerCase()));
  if (direct.length > 0) return direct;

  const keywords = normalized
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  const scored = products
    .map((product) => {
      const haystack = `${product.title} ${product.brand} ${product.category} ${product.tagline} ${product.tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (haystack.includes(kw)) score += 1;
      }
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating);

  return scored.map((s) => s.product);
}

export function buildOfflineCatalogReply(message: string, products: DBProduct[]): NovaChatResult {
  const matches = scoreCatalogProducts(message, products);
  const top = matches[0] || products[0];

  if (!top) {
    return {
      ok: true,
      reply:
        'NOVA Offline Catalog Search: No published items matched your query. Try browsing Audio, Keyboards, Timepieces, or Workspace categories.',
      model: 'catalog-keyword-engine',
      mode: 'offline-catalog-fallback',
    };
  }

  const secondary = matches[1];
  const priceStr = `₹${Math.round(top.pricePaise / 100).toLocaleString('en-IN')}`;
  const secondaryNote = secondary
    ? ` Also consider ${secondary.title} at ₹${Math.round(secondary.pricePaise / 100).toLocaleString('en-IN')} (${secondary.seller.city}).`
    : '';

  return {
    ok: true,
    reply: `${top.title} by ${top.brand} is available at ${priceStr} (18% GST inclusive) from ${top.seller.storeName} in ${top.seller.city} with ${top.stock} units in stock.${secondaryNote} Orders above ₹999 ship free via BlueDart Express with 7-day returns.`,
    recommendedProductTitle: top.title,
    model: 'catalog-keyword-engine',
    mode: 'offline-catalog-fallback',
  };
}

export async function generateNovaReply(
  message: string,
  history: NovaChatTurn[] = []
): Promise<NovaChatResult | NovaChatError> {
  const products = await db.getProducts({ includeUnpublished: false });
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return buildOfflineCatalogReply(message, products);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const model = 'gemini-4-hydrogen';

    const historyText = history
      .slice(-6)
      .map((turn) => `${turn.role === 'user' ? 'Customer' : 'NOVA'}: ${turn.text}`)
      .join('\n');

    const prompt = [
      'You are NOVA, the concise AI Shopping Concierge for NEXORA V3 (an Indian multi-vendor electronics & studio gear marketplace priced in INR ₹, inclusive of 18% GST).',
      'Rules:',
      '- Recommend only real products present in the catalog JSON below, quoting exact INR prices and verified seller cities.',
      '- Mention Pan-India Express Delivery (free above ₹999) and 7-day hassle-free returns when relevant.',
      '- Keep replies crisp (3-5 sentences max), accurate, and helpful. Never fabricate stock or specs.',
      '',
      `Verified Live Catalog JSON (${products.length} items): ${buildCatalogContext(products)}`,
      historyText ? `\nRecent Conversation:\n${historyText}` : '',
      `\nCustomer Question: ${message}`,
    ]
      .filter(Boolean)
      .join('\n');

    let responseText: string | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        responseText = response.text?.trim();
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : '';
        const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
        if (attempt === 0 && isTransient) {
          await new Promise((r) => setTimeout(r, 700));
          continue;
        }
        throw err;
      }
    }

    if (lastError) {
      throw lastError;
    }

    const reply = responseText;
    if (!reply) {
      return buildOfflineCatalogReply(message, products);
    }

    const recommended = scoreCatalogProducts(`${reply} ${message}`, products)[0];
    return {
      ok: true,
      reply,
      recommendedProductTitle: recommended?.title,
      model,
      mode: 'gemini-live',
    };
  } catch (err) {
    console.warn(
      '[NOVA] Gemini unavailable, serving offline catalog fallback:',
      err instanceof Error ? err.message : err
    );
    return buildOfflineCatalogReply(message, products);
  }
}
