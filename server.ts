import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { db } from './src/server/db.js';
import { orchestrator } from './src/server/orchestrator.js';
import { generateNovaReply } from './src/server/novaService.js';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  getUserBulkInquiriesByUid,
  getUserOrdersByUid,
  saveUserBulkInquiry,
  saveUserOrder,
} from './src/db/orders.ts';
import { getOrCreateUser, updateUserLoyaltyAndWallet } from './src/db/users.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers & Scoped CORS Middleware (iframe-compatible)
const allowedOrigins = new Set(
  [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.APP_URL,
  ].filter((origin): origin is string => Boolean(origin))
);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || origin.endsWith('.run.app') || origin.endsWith('.googleusercontent.com')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const NovaChatSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string(),
      })
    )
    .max(20)
    .optional(),
});

const OrderItemSchema = z.object({
  title: z.string().min(1),
  image: z.string().min(1),
  pricePaise: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

const CreateOrderSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  itemsCount: z.number().int().positive(),
  totalPaise: z.number().int().nonnegative(),
  status: z.enum(['Processing', 'Dispatched', 'Out for Delivery', 'Delivered', 'Return Requested', 'Returned', 'Confirmed', 'Shipped', 'Cancelled']),
  trackingStage: z.enum(['Processing', 'Dispatched', 'Out for Delivery', 'Delivered', 'Return Requested', 'Returned']),
  courierPartner: z.string().min(1),
  trackingNumber: z.string().min(1),
  estimatedDeliveryDate: z.string().min(1),
  paymentMethod: z.string().min(1),
  items: z.array(OrderItemSchema).min(1),
  preferredDeliveryDate: z.string().optional(),
  orderNotes: z.string().optional(),
  isGiftReceipt: z.boolean().optional(),
  giftMessage: z.string().optional(),
});

const CreateBulkInquirySchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  productTitle: z.string().min(1),
  brand: z.string().min(1),
  sellerStoreName: z.string().min(1),
  quantity: z.number().int().min(10),
  offeredUnitPaise: z.number().int().nonnegative(),
  standardPricePaise: z.number().int().nonnegative(),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(5),
  gstin: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().min(1),
  status: z.enum(['Pending Review', 'Accepted', 'Negotiation']),
});

const OrchestratorRunSchema = z.object({
  title: z.string().trim().min(3, 'Task title must be at least 3 characters').max(200),
  phase: z.string().trim().min(1).max(60).optional().default('PHASE 1'),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']).optional().default('HIGH'),
});

// ============================================================================
// REST API v1 ROUTES
// ============================================================================

const apiRouter = express.Router();

// 1. Health & Environment Status
apiRouter.get('/health', (_req: Request, res: Response) => {
  const dbStatus = db.getStatus();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '3.0.0',
      platform: 'NEXORA V3 — Premier Multi-Vendor Marketplace',
      market: 'India (₹ INR)',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      orchestrator: {
        agentsActive: 4,
        status: 'OPERATIONAL',
      },
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
    },
    message: 'NEXORA Full-Stack Foundation is operational.',
  });
});

// 2. Orchestrator State (Command Center)
apiRouter.get('/orchestrator/state', (_req: Request, res: Response) => {
  const state = orchestrator.getState();
  res.json({
    success: true,
    data: state,
    message: 'Orchestrator state retrieved successfully.',
  });
});

// 3. Trigger 4-Agent Task Workflow
apiRouter.post('/orchestrator/run', async (req: Request, res: Response) => {
  const parsed = OrchestratorRunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: parsed.error.issues[0]?.message || 'Task title is required.',
      },
    });
  }

  try {
    const { title, phase, priority } = parsed.data;
    const task = await orchestrator.runTaskWorkflow(title, phase, priority);
    return res.json({
      success: true,
      data: task,
      message: `Task ${task.id} processed through Four-Agent workflow.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Orchestrator error';
    return res.status(500).json({
      success: false,
      error: { code: 'ORCHESTRATOR_ERROR', message: msg },
    });
  }
});

// 4. NOVA AI Server-Side Gemini Endpoint
apiRouter.post('/nova/chat', async (req: Request, res: Response) => {
  const parsed = NovaChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid NOVA chat payload.',
    });
  }

  const result = await generateNovaReply(parsed.data.message, parsed.data.history || []);
  if (!result.ok) {
    return res.status(result.status).json({
      success: false,
      error: result.error,
    });
  }

  return res.json({
    success: true,
    data: {
      reply: result.reply,
      recommendedProductTitle: result.recommendedProductTitle,
      model: result.model,
    },
  });
});

// 5. Authenticated Orders Persistence API (Cloud SQL PostgreSQL)
apiRouter.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await getUserOrdersByUid(req.user!.uid);
    return res.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

apiRouter.post('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid order payload.',
    });
  }

  try {
    let sqlUserId = req.sqlUserId;
    if (!sqlUserId) {
      const user = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.nexora.local`,
        req.user!.name || null
      );
      sqlUserId = user.id;
    }

    const saved = await saveUserOrder(sqlUserId, parsed.data);
    await db.createOrder(parsed.data);
    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save order.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// 6. Authenticated B2B Bulk Order Inquiries API (Cloud SQL PostgreSQL)
apiRouter.get('/bulk-inquiries', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const inquiries = await getUserBulkInquiriesByUid(req.user!.uid);
    return res.json({
      success: true,
      data: inquiries,
      total: inquiries.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bulk inquiries.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

apiRouter.post('/bulk-inquiries', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = CreateBulkInquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid bulk inquiry payload.',
    });
  }

  try {
    let sqlUserId = req.sqlUserId;
    if (!sqlUserId) {
      const user = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.nexora.local`,
        req.user!.name || null
      );
      sqlUserId = user.id;
    }

    const saved = await saveUserBulkInquiry(sqlUserId, parsed.data);
    await db.createBulkInquiry(parsed.data);
    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save bulk inquiry.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// 6b. Authenticated User Loyalty & Wallet Sync API (Cloud SQL PostgreSQL)
const AccountSyncSchema = z.object({
  loyaltyPoints: z.number().int().min(0).max(10000000),
  tier: z.enum(['Silver', 'Gold', 'Platinum']),
  walletBalancePaise: z.number().int().min(0).max(1000000000),
});

apiRouter.post('/account/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = AccountSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid account sync payload.',
    });
  }

  try {
    const updated = await updateUserLoyaltyAndWallet({
      uid: req.user!.uid,
      loyaltyPoints: parsed.data.loyaltyPoints,
      tier: parsed.data.tier,
      walletBalancePaise: parsed.data.walletBalancePaise,
    });
    return res.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync account state.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// 7. Products API
apiRouter.get('/products', async (req: Request, res: Response) => {
  const { category, search, brand, minPrice, maxPrice, minRating, sortBy } = req.query;
  const products = await db.getProducts({
    categorySlug: typeof category === 'string' ? category : undefined,
    search: typeof search === 'string' ? search : undefined,
    brand: typeof brand === 'string' ? brand : undefined,
    minPricePaise: minPrice ? Number(minPrice) : undefined,
    maxPricePaise: maxPrice ? Number(maxPrice) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    sortBy: typeof sortBy === 'string' ? (sortBy as any) : undefined,
  });

  res.json({
    success: true,
    data: products,
    total: products.length,
    message: 'Products retrieved from database.',
  });
});

// 8. Product by ID API
apiRouter.get('/products/:id', async (req: Request, res: Response) => {
  const product = await db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found.' },
    });
  }

  res.json({
    success: true,
    data: product,
    message: 'Product retrieved successfully.',
  });
});

// 9. Categories API
apiRouter.get('/categories', async (_req: Request, res: Response) => {
  const categories = await db.getCategories();
  res.json({
    success: true,
    data: categories,
    total: categories.length,
    message: 'Categories retrieved successfully.',
  });
});

// 10. Platform Configuration API
apiRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      brand: 'NEXORA',
      market: 'India',
      currency: 'INR',
      currencySymbol: '₹',
      gst: {
        hsnDefault: '85183000',
        standardRatePercent: 18,
        inclusivePricing: true,
      },
      payment: {
        provider: 'Razorpay',
        mode: 'TEST_MODE',
        codAvailable: true,
        freeShippingThresholdPaise: 99900,
      },
      aiAssistant: {
        name: 'NOVA',
        provider: 'Google Gemini (gemini-4-hydrogen)',
        groundedTools: ['catalogSnapshot', 'priceComparison', 'policyKnowledge'],
      },
    },
    message: 'Platform configuration loaded.',
  });
});

// JSON 404 handler for unknown /api/v1 endpoints
apiRouter.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Requested API endpoint does not exist.' },
  });
});

app.use('/api/v1', apiRouter);

// Safe JSON error handler for malformed payloads
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err === 'object' && 'type' in err && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Malformed JSON request body.' },
    });
  }
  return next(err);
});

// ============================================================================
// FRONTEND STATIC / DEV SERVER INTEGRATION
// ============================================================================

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXORA V3] Server running at http://localhost:${PORT}`);
    console.log(`[NEXORA V3] Mode: ${isProduction ? 'Production' : 'Development (Vite Middleware)'}`);
    console.log(`[NEXORA V3] API v1 available at http://localhost:${PORT}/api/v1/health`);
  });
}

startServer().catch((err) => {
  console.error('[NEXORA V3] Fatal server bootstrap failure:', err);
  process.exit(1);
});
