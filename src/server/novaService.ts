import { GoogleGenAI } from '@google/genai';
import { PRODUCTS_CATALOG } from '../data/productsCatalog.js';

export interface NovaChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface NovaChatResult {
  ok: true;
  reply: string;
  recommendedProductTitle?: string;
  model: string;
}

export interface NovaChatError {
  ok: false;
  status: number;
  error: string;
}

function buildCatalogContext(): string {
  const compactItems = PRODUCTS_CATALOG.slice(0, 36).map((p) => ({
    id: p.id,
    title: p.title,
    brand: p.brand,
    category: p.category,
    priceINR: Math.round(p.pricePaise / 100),
    stock: p.stock,
    rating: p.rating,
    seller: `${p.seller.storeName} (${p.seller.city})`,
  }));

  return JSON.stringify(compactItems);
}

function findRecommendedCatalogTitle(replyText: string, userMessage: string): string | undefined {
  const combined = `${replyText} ${userMessage}`.toLowerCase();
  const directMatch = PRODUCTS_CATALOG.find((p) => combined.includes(p.title.toLowerCase()));
  if (directMatch) return directMatch.title;

  const keywords = combined
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);

  let bestProduct: (typeof PRODUCTS_CATALOG)[number] | undefined;
  let bestScore = 0;

  for (const product of PRODUCTS_CATALOG) {
    const haystack = `${product.title} ${product.brand} ${product.category} ${product.tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  return bestScore >= 2 ? bestProduct?.title : undefined;
}

export async function generateNovaReply(
  message: string,
  history: NovaChatTurn[] = []
): Promise<NovaChatResult | NovaChatError> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      ok: false,
      status: 503,
      error:
        'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable live NOVA AI responses.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
      `Verified Catalog Snapshot JSON: ${buildCatalogContext()}`,
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
      return {
        ok: false,
        status: 502,
        error: 'Gemini returned an empty response. Please try rephrasing your question.',
      };
    }

    const recommendedProductTitle = findRecommendedCatalogTitle(reply, message);
    return {
      ok: true,
      reply,
      recommendedProductTitle,
      model,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown Gemini API error';
    const status =
      errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') ? 503 : 502;
    return {
      ok: false,
      status,
      error: `Live NOVA AI request failed: ${errorMessage}`,
    };
  }
}
