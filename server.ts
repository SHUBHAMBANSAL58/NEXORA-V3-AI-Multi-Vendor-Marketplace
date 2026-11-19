import crypto from 'node:crypto';
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
import {
  AuthRequest,
  createRateLimiter,
  requireAuth,
  requireRole,
} from './src/middleware/auth.ts';
import {
  getOrderOwnerUidByCode,
  getUserBulkInquiriesByUid,
  getUserOrdersByUid,
  saveUserBulkInquiry,
  saveUserOrder,
  updateUserOrderStateSql,
} from './src/db/orders.ts';
import { canUserAccessOrder, verifyRazorpayWebhookRequest } from './src/server/security.ts';
import { getOrCreateUser, getUserByUid, updateUserLoyaltyAndWallet } from './src/db/users.ts';
import {
  applyOrderWalletAndPoints,
  calculateAuthoritativeOrderPricing,
  getLoyaltyTier,
  validateGstin,
  validateIndianPinCode,
  validateNewsletterEmail,
} from './src/utils/commerceFeatures.js';

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
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        origin.endsWith('.run.app') ||
        origin.endsWith('.googleusercontent.com')
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Rate Limiters
const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

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
  quantity: z.number().int().positive().max(100),
});

const AddressSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20),
  street: z.string().min(2).max(240),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  pinCode: z.string().regex(/^[1-9][0-9]{5}$/, 'Valid 6-digit Indian PIN required'),
  isDefault: z.boolean().default(false),
});

const CreateOrderSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  itemsCount: z.number().int().positive(),
  totalPaise: z.number().int().nonnegative(),
  status: z.enum([
    'Processing',
    'Dispatched',
    'Out for Delivery',
    'Delivered',
    'Return Requested',
    'Returned',
    'Confirmed',
    'Shipped',
    'Cancelled',
  ]),
  trackingStage: z.enum([
    'Processing',
    'Dispatched',
    'Out for Delivery',
    'Delivered',
    'Return Requested',
    'Returned',
  ]),
  courierPartner: z.string().min(1),
  trackingNumber: z.string().min(1),
  estimatedDeliveryDate: z.string().min(1),
  paymentMethod: z.string().min(1),
  items: z.array(OrderItemSchema).min(1),
  deliveryAddress: AddressSchema.optional(),
  preferredDeliveryDate: z.string().optional(),
  orderNotes: z.string().max(400).optional(),
  isGiftReceipt: z.boolean().optional(),
  giftMessage: z.string().max(300).optional(),
  promoCode: z.string().max(40).optional(),
  walletDeductionPaise: z.number().int().nonnegative().optional(),
  pointsRedeemed: z.number().int().nonnegative().optional(),
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

const SellerOnboardSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(100),
  gstin: z.string().trim().min(15).max(15),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  email: z.string().email().optional(),
});

const SellerProductSchema = z.object({
  title: z.string().trim().min(3).max(140),
  brand: z.string().trim().min(2).max(80),
  categorySlug: z.string().trim().min(2).max(60),
  pricePaise: z.number().int().min(100),
  originalPricePaise: z.number().int().min(100).optional(),
  stock: z.number().int().min(0).max(100000),
  sku: z.string().trim().max(40).optional(),
  tagline: z.string().trim().max(180).optional(),
  description: z.string().trim().min(10).max(1500),
  image: z.string().trim().min(1),
  hsnCode: z.string().trim().max(16).optional(),
  sellerId: z.string().trim().optional(),
});

const SellerProductUpdateSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  pricePaise: z.number().int().min(100).optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  isPublished: z.boolean().optional(),
  tagline: z.string().trim().max(180).optional(),
  description: z.string().trim().min(10).max(1500).optional(),
  hsnCode: z.string().trim().max(16).optional(),
});

const WalletDepositSchema = z.object({
  amountPaise: z.number().int().min(10000).max(5000000), // ₹100 to ₹50,000 per deposit
});

const ReviewCreateSchema = z.object({
  productId: z.string().min(1),
  author: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  comment: z.string().trim().min(5).max(1000),
});

const CouponUpsertSchema = z.object({
  code: z.string().trim().min(3).max(32),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().int().positive(),
  minSpendPaise: z.number().int().nonnegative().optional().default(0),
  description: z.string().trim().min(4).max(160),
  isActive: z.boolean().optional().default(true),
});

const CategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional(),
  hsnDefault: z.string().trim().max(16).optional(),
  gstRate: z.number().int().min(0).max(28).optional(),
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
      razorpayMode: process.env.RAZORPAY_KEY_SECRET ? 'live-hmac-ready' : 'sandbox-demo',
    },
    message: 'NEXORA Full-Stack Foundation is operational.',
  });
});

// 1b. Authenticated Current User Context (Role + Seller ID + Loyalty/Wallet)
apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sqlUser = await getUserByUid(req.user!.uid);
    const sellerProfile = req.sellerId ? await db.getSellerById(req.sellerId) : null;
    return res.json({
      success: true,
      data: {
        uid: req.user!.uid,
        email: req.user!.email,
        displayName: req.user!.name || sqlUser?.displayName || 'NEXORA Member',
        role: req.userRole || 'customer',
        loyaltyPoints: sqlUser?.loyaltyPoints ?? 0,
        tier: sqlUser?.tier ?? 'Silver',
        walletBalancePaise: sqlUser?.walletBalancePaise ?? 500000,
        sellerProfile,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load profile.',
    });
  }
});

// 2. Orchestrator State (Command Center — read-only telemetry + admin protected writes)
apiRouter.get('/orchestrator/state', (_req: Request, res: Response) => {
  const state = orchestrator.getState();
  res.json({
    success: true,
    data: state,
    message: 'Orchestrator state retrieved successfully.',
  });
});

// 3. Trigger 4-Agent Task Workflow (Protected: Admin only)
apiRouter.post(
  '/orchestrator/run',
  writeLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
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
      await db.appendAuditLog({
        actorEmail: req.user?.email || 'admin@nexora.shop',
        actorRole: 'admin',
        action: 'ORCHESTRATOR_RUN',
        targetType: 'orchestrator',
        targetId: task.id,
        details: `Triggered workflow: ${title} (${priority})`,
      });
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
  }
);

// 4. NOVA AI Server-Side Gemini Endpoint (Live Gemini + Transparent Offline Catalog Fallback)
apiRouter.post('/nova/chat', aiLimiter, async (req: Request, res: Response) => {
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
      mode: result.mode,
    },
  });
});

// 4b. Public Active Coupons & Reviews & Newsletter Subscription
apiRouter.get('/coupons/active', async (_req: Request, res: Response) => {
  const coupons = await db.getCoupons(false);
  res.json({ success: true, data: coupons });
});

apiRouter.get('/reviews', async (req: Request, res: Response) => {
  const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
  const reviews = await db.getReviews(productId);
  res.json({ success: true, data: reviews, total: reviews.length });
});

apiRouter.post('/reviews', writeLimiter, async (req: Request, res: Response) => {
  const parsed = ReviewCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid review payload.',
    });
  }
  const created = await db.createReview(parsed.data);
  return res.status(201).json({ success: true, data: created });
});

apiRouter.post('/newsletter', writeLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const check = validateNewsletterEmail(email);
  if (!check.valid) {
    return res.status(400).json({ success: false, error: check.error });
  }
  const outcome = await db.addNewsletterSubscriber(email);
  return res.status(201).json({
    success: true,
    data: {
      email: email.trim().toLowerCase(),
      alreadySubscribed: outcome.alreadySubscribed,
      voucherCode: 'FESTIVE500',
    },
  });
});

// 4c. Razorpay Order Creation, Signature Verification & Webhook
apiRouter.post('/payments/create-order', writeLimiter, (req: Request, res: Response) => {
  const amountPaise = Number(req.body?.amountPaise);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    return res.status(400).json({ success: false, error: 'Valid positive amountPaise required.' });
  }
  const isLiveKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  return res.json({
    success: true,
    data: {
      razorpayOrderId: `order_nxr_${Date.now().toString(36)}`,
      amountPaise: Math.round(amountPaise),
      currency: 'INR',
      mode: isLiveKeys ? 'live' : 'sandbox-demo',
    },
  });
});

apiRouter.post('/payments/verify', writeLimiter, (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return res.json({
      success: true,
      data: {
        verified: true,
        mode: 'sandbox-demo',
        paymentId: razorpay_payment_id || `pay_demo_${Date.now().toString(36)}`,
      },
    });
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Missing Razorpay verification fields.' });
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected !== razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Razorpay signature mismatch.' });
  }
  return res.json({
    success: true,
    data: { verified: true, mode: 'live', paymentId: razorpay_payment_id },
  });
});

apiRouter.post('/webhooks/razorpay', (req: Request, res: Response) => {
  const result = verifyRazorpayWebhookRequest(
    req.body,
    req.headers['x-razorpay-signature'],
    process.env.RAZORPAY_WEBHOOK_SECRET
  );
  if (!result.ok) {
    return res.status(result.status).json({ success: false, error: result.error });
  }
  return res.json({ success: true, received: true });
});

// 5. Authenticated Orders Persistence API (Authoritative Pricing + Cloud SQL PostgreSQL)
apiRouter.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sqlOrders = await getUserOrdersByUid(req.user!.uid);
    const repoOrders = await db.getOrders();
    const mergedMap = new Map(sqlOrders.map((o) => [o.id, o]));
    for (const o of repoOrders) {
      if (mergedMap.has(o.id)) {
        mergedMap.set(o.id, { ...mergedMap.get(o.id)!, ...o });
      }
    }
    const orders = Array.from(mergedMap.values());
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

apiRouter.post('/orders', writeLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid order payload.',
    });
  }

  try {
    if (parsed.data.deliveryAddress) {
      const pinCheck = validateIndianPinCode(parsed.data.deliveryAddress.pinCode);
      if (!pinCheck.valid) {
        return res.status(400).json({ success: false, error: pinCheck.error });
      }
    }

    // Recompute authoritative unit prices from live repository catalog (reject price tampering)
    const verifiedItems: Array<{
      title: string;
      image: string;
      pricePaise: number;
      quantity: number;
    }> = [];
    for (const item of parsed.data.items) {
      const catalogMatch = await db.findProductByTitle(item.title);
      if (catalogMatch) {
        if (catalogMatch.stock < item.quantity) {
          return res.status(409).json({
            success: false,
            error: `Insufficient stock for ${catalogMatch.title} (${catalogMatch.stock} left).`,
          });
        }
        // Allow variant price within catalog band or exact catalog price
        const authoritativePrice = catalogMatch.variants?.some((v) => v.pricePaise === item.pricePaise)
          ? item.pricePaise
          : catalogMatch.pricePaise;
        verifiedItems.push({ ...item, pricePaise: authoritativePrice });
      } else {
        verifiedItems.push(item);
      }
    }

    const couponMap = await db.getCouponMap();
    const pricing = calculateAuthoritativeOrderPricing(
      verifiedItems.map((i) => ({ unitPricePaise: i.pricePaise, quantity: i.quantity })),
      parsed.data.promoCode,
      couponMap
    );

    const authoritativeOrder = {
      ...parsed.data,
      items: verifiedItems,
      totalPaise: pricing.totalPaise,
      discountPaise: pricing.discountPaise,
      gstPaise: pricing.gstPaise,
      promoCode: pricing.appliedPromoCode,
      paymentMode: (process.env.RAZORPAY_KEY_SECRET ? 'live' : 'sandbox-demo') as 'live' | 'sandbox-demo',
    };

    let sqlUserId = req.sqlUserId;
    if (!sqlUserId) {
      const user = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.nexora.local`,
        req.user!.name || null
      );
      sqlUserId = user.id;
    }

    const sqlUser = await getUserByUid(req.user!.uid);
    const walletAndPoints = applyOrderWalletAndPoints({
      currentWalletPaise: sqlUser?.walletBalancePaise ?? 500000,
      currentPoints: sqlUser?.loyaltyPoints ?? 0,
      orderTotalPaise: authoritativeOrder.totalPaise,
      walletDeductionPaise: Math.min(
        sqlUser?.walletBalancePaise ?? 500000,
        parsed.data.walletDeductionPaise || 0
      ),
      pointsRedeemed: parsed.data.pointsRedeemed || 0,
    });

    const saved = await saveUserOrder(sqlUserId, authoritativeOrder);
    await db.createOrder(authoritativeOrder);
    await updateUserLoyaltyAndWallet({
      uid: req.user!.uid,
      loyaltyPoints: walletAndPoints.nextPoints,
      tier: walletAndPoints.nextTier,
      walletBalancePaise: walletAndPoints.nextWalletPaise,
    });

    return res.status(201).json({
      success: true,
      data: saved,
      account: {
        loyaltyPoints: walletAndPoints.nextPoints,
        tier: walletAndPoints.nextTier,
        walletBalancePaise: walletAndPoints.nextWalletPaise,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save order.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

async function verifyCallerOwnsOrder(req: AuthRequest, orderId: string): Promise<{ allowed: boolean; status?: number; error?: string }> {
  if (req.userRole === 'admin') return { allowed: true };
  const sqlOwnerUid = await getOrderOwnerUidByCode(orderId);
  let callerOrderIds: string[] = [];
  try {
    const callerOrders = await getUserOrdersByUid(req.user!.uid);
    callerOrderIds = callerOrders.map((o) => o.id);
  } catch {
    callerOrderIds = [];
  }

  const repoOrder = await db.getOrderById(orderId);
  if (!repoOrder && sqlOwnerUid === null && !callerOrderIds.includes(orderId)) {
    return { allowed: false, status: 404, error: 'Order not found.' };
  }

  const allowed = canUserAccessOrder({
    callerUid: req.user!.uid,
    callerRole: req.userRole,
    sqlOwnerUid,
    callerSqlOrderIds: callerOrderIds,
    orderId,
  });
  if (!allowed) {
    return { allowed: false, status: 403, error: 'You do not have permission to modify this order.' };
  }
  return { allowed: true };
}

// 5b. Customer Order Self-Service Cancellation & Return Request
apiRouter.post('/orders/:id/cancel', writeLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id;
  const ownership = await verifyCallerOwnsOrder(req, orderId);
  if (!ownership.allowed) {
    return res.status(ownership.status || 403).json({ success: false, error: ownership.error });
  }

  const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
    ? req.body.reason.trim().slice(0, 200)
    : 'Cancelled by customer before dispatch';

  const result = await db.cancelOrder(orderId, reason);
  if (!result.ok || !result.order) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Could not cancel order.',
    });
  }

  await updateUserOrderStateSql(orderId, {
    status: 'Cancelled',
    cancelledAt: result.order.cancelledAt || new Date().toISOString(),
    cancellationReason: reason,
  });

  await db.appendAuditLog({
    actorEmail: req.user?.email || req.user!.uid,
    actorRole: req.userRole || 'customer',
    action: 'ORDER_CANCELLED',
    targetType: 'order',
    targetId: orderId,
    details: reason,
  });

  return res.json({ success: true, data: result.order });
});

apiRouter.post('/orders/:id/return', writeLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id;
  const ownership = await verifyCallerOwnsOrder(req, orderId);
  if (!ownership.allowed) {
    return res.status(ownership.status || 403).json({ success: false, error: ownership.error });
  }

  const existingOrder = await db.getOrderById(orderId);
  if (!existingOrder) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }
  if (
    existingOrder.status === 'Cancelled' ||
    existingOrder.status === 'Return Requested' ||
    existingOrder.status === 'Returned'
  ) {
    return res.status(400).json({
      success: false,
      error: `Return cannot be requested for order in status "${existingOrder.status}".`,
    });
  }

  const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
    ? req.body.reason.trim().slice(0, 240)
    : 'Size / specification mismatch';

  const pickupDate = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const returnInfo = {
    requestedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    reason,
    rmaNumber: `RMA-${orderId.slice(-5).toUpperCase()}`,
    pickupScheduledDate: pickupDate,
    refundStatus: 'Pending Pickup' as const,
  };

  const updated = await db.requestOrderReturn(orderId, returnInfo);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  await updateUserOrderStateSql(orderId, {
    status: 'Return Requested',
    trackingStage: 'Return Requested',
    returnInfoJson: returnInfo,
  });

  return res.json({ success: true, data: updated });
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

apiRouter.post('/bulk-inquiries', writeLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
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

// 6b. Bounded Wallet Deposit & Server-Recomputed Profile Sync
apiRouter.post('/wallet/deposit', writeLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = WalletDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Deposit must be between ₹100 and ₹50,000.',
    });
  }
  try {
    const user = await getUserByUid(req.user!.uid);
    const nextWallet = (user?.walletBalancePaise ?? 500000) + parsed.data.amountPaise;
    const points = user?.loyaltyPoints ?? 0;
    const updated = await updateUserLoyaltyAndWallet({
      uid: req.user!.uid,
      loyaltyPoints: points,
      tier: getLoyaltyTier(points),
      walletBalancePaise: nextWallet,
    });
    return res.json({ success: true, data: updated });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Wallet top-up failed.',
    });
  }
});

const AccountSyncSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
});

apiRouter.post('/account/sync', writeLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = AccountSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid account sync payload.',
    });
  }

  try {
    const updated = await getOrCreateUser(
      req.user!.uid,
      req.user!.email || `${req.user!.uid}@users.nexora.local`,
      parsed.data.displayName || req.user!.name || null
    );
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

// ============================================================================
// MULTI-VENDOR SELLER CENTRAL API (/api/v1/seller/*)
// ============================================================================

apiRouter.post('/seller/onboard', writeLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = SellerOnboardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid seller onboarding details.',
    });
  }

  const gstCheck = validateGstin(parsed.data.gstin);
  if (!gstCheck.valid) {
    return res.status(400).json({ success: false, error: gstCheck.error });
  }

  const email = parsed.data.email || req.user!.email || `${req.user!.uid}@seller.nexora.local`;
  const seller = await db.onboardSeller({
    ...parsed.data,
    email,
  });

  await db.appendAuditLog({
    actorEmail: email,
    actorRole: 'seller',
    action: 'SELLER_ONBOARD_APPLICATION',
    targetType: 'seller',
    targetId: seller.id,
    details: `${seller.storeName} (${seller.gstin}) applied for verified vendor status.`,
  });

  return res.status(201).json({ success: true, data: seller });
});

apiRouter.get(
  '/seller/dashboard',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: AuthRequest, res: Response) => {
    const requestedSellerId =
      typeof req.query.sellerId === 'string' && req.userRole === 'admin'
        ? req.query.sellerId
        : req.sellerId || 's-tech-1';
    const seller = await db.getSellerById(requestedSellerId);
    const products = await db.getProducts({ sellerId: requestedSellerId, includeUnpublished: true });
    const orders = await db.getOrdersForSeller(requestedSellerId);
    const inquiries = await db.getBulkInquiries();
    const sellerInquiries = seller
      ? inquiries.filter((inq) => inq.sellerStoreName === seller.storeName)
      : inquiries;

    return res.json({
      success: true,
      data: {
        seller,
        products,
        orders,
        bulkInquiries: sellerInquiries,
      },
    });
  }
);

apiRouter.post(
  '/seller/products',
  writeLimiter,
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: AuthRequest, res: Response) => {
    const parsed = SellerProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid product payload.',
      });
    }
    const targetSellerId =
      req.userRole === 'admin' && parsed.data.sellerId
        ? parsed.data.sellerId
        : req.sellerId || 's-tech-1';
    const created = await db.createSellerProduct({
      ...parsed.data,
      sellerId: targetSellerId,
    });
    await db.appendAuditLog({
      actorEmail: req.user?.email || 'seller@nexora.shop',
      actorRole: req.userRole || 'seller',
      action: 'PRODUCT_CREATED',
      targetType: 'product',
      targetId: created.id,
      details: `${created.title} listed at ₹${Math.round(created.pricePaise / 100)} (${created.stock} qty)`,
    });
    return res.status(201).json({ success: true, data: created });
  }
);

apiRouter.patch(
  '/seller/products/:id',
  writeLimiter,
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: AuthRequest, res: Response) => {
    const parsed = SellerProductUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid update payload.',
      });
    }
    const existing = await db.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    if (req.userRole !== 'admin' && req.sellerId && existing.sellerId !== req.sellerId) {
      return res.status(403).json({ success: false, error: 'You can only edit your own store SKUs.' });
    }
    const updated = await db.updateProduct(req.params.id, parsed.data);
    return res.json({ success: true, data: updated });
  }
);

apiRouter.delete(
  '/seller/products/:id',
  writeLimiter,
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: AuthRequest, res: Response) => {
    const existing = await db.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    if (req.userRole !== 'admin' && req.sellerId && existing.sellerId !== req.sellerId) {
      return res.status(403).json({ success: false, error: 'Forbidden for this seller SKU.' });
    }
    await db.deleteProduct(req.params.id);
    return res.json({ success: true });
  }
);

apiRouter.patch(
  '/seller/orders/:id/status',
  writeLimiter,
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: AuthRequest, res: Response) => {
    const nextStage = req.body?.trackingStage;
    if (!nextStage) {
      return res.status(400).json({ success: false, error: 'trackingStage is required.' });
    }
    if (req.userRole !== 'admin') {
      const sellerOrders = await db.getOrdersForSeller(req.sellerId || '');
      if (!sellerOrders.some((o) => o.id === req.params.id)) {
        return res.status(403).json({
          success: false,
          error: 'You can only update orders containing your store products.',
        });
      }
    }
    const result = await db.updateOrderStage(req.params.id, nextStage);
    if (!result.ok || !result.order) {
      return res.status(400).json({ success: false, error: result.error });
    }
    await updateUserOrderStateSql(req.params.id, {
      status: result.order.status,
      trackingStage: result.order.trackingStage,
    });
    return res.json({ success: true, data: result.order });
  }
);

apiRouter.patch(
  '/seller/inquiries/:id',
  writeLimiter,
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: AuthRequest, res: Response) => {
    const status = req.body?.status;
    if (!['Pending Review', 'Accepted', 'Negotiation'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid inquiry status.' });
    }
    const existing = await db.getBulkInquiryById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }
    if (req.userRole !== 'admin') {
      const seller = await db.getSellerById(req.sellerId || '');
      if (!seller || existing.sellerStoreName !== seller.storeName) {
        return res.status(403).json({
          success: false,
          error: 'You can only respond to inquiries addressed to your store.',
        });
      }
    }
    const updated = await db.updateBulkInquiryStatus(req.params.id, status);
    return res.json({ success: true, data: updated });
  }
);

// ============================================================================
// ADMIN GOVERNANCE API (/api/v1/admin/*)
// ============================================================================

apiRouter.get(
  '/admin/overview',
  requireAuth,
  requireRole('admin'),
  async (_req: AuthRequest, res: Response) => {
    const overview = await db.getAdminOverview();
    const sellers = await db.getSellers();
    const products = await db.getProducts({ includeUnpublished: true });
    const orders = await db.getOrders();
    const coupons = await db.getCoupons(true);
    const auditLogs = await db.getAuditLogs();
    return res.json({
      success: true,
      data: { overview, sellers, products, orders, coupons, auditLogs },
    });
  }
);

apiRouter.patch(
  '/admin/sellers/:id',
  writeLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    const { status, commissionRate } = req.body || {};
    const updated = await db.updateSellerGovernance(req.params.id, {
      ...(status ? { status, isVerified: status === 'approved' } : {}),
      ...(commissionRate !== undefined ? { commissionRate: Number(commissionRate) } : {}),
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Seller not found.' });
    }
    await db.appendAuditLog({
      actorEmail: req.user?.email || 'admin@nexora.shop',
      actorRole: 'admin',
      action: 'SELLER_GOVERNANCE_UPDATED',
      targetType: 'seller',
      targetId: updated.id,
      details: `${updated.storeName} -> status=${updated.status}, commission=${updated.commissionRate}%`,
    });
    return res.json({ success: true, data: updated });
  }
);

apiRouter.patch(
  '/admin/products/:id/moderation',
  writeLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    const isPublished = Boolean(req.body?.isPublished);
    const updated = await db.updateProduct(req.params.id, { isPublished });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    await db.appendAuditLog({
      actorEmail: req.user?.email || 'admin@nexora.shop',
      actorRole: 'admin',
      action: isPublished ? 'PRODUCT_PUBLISHED' : 'PRODUCT_UNPUBLISHED',
      targetType: 'product',
      targetId: updated.id,
      details: `${updated.title} visibility set to ${isPublished}`,
    });
    return res.json({ success: true, data: updated });
  }
);

apiRouter.post(
  '/admin/categories',
  writeLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    const parsed = CategoryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid category payload.',
      });
    }
    const created = await db.createCategory(parsed.data);
    await db.appendAuditLog({
      actorEmail: req.user?.email || 'admin@nexora.shop',
      actorRole: 'admin',
      action: 'CATEGORY_CREATED',
      targetType: 'category',
      targetId: created.slug,
      details: `Created category ${created.name} (HSN ${created.hsnDefault})`,
    });
    return res.status(201).json({ success: true, data: created });
  }
);

apiRouter.post(
  '/admin/coupons',
  writeLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    const parsed = CouponUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid coupon payload.',
      });
    }
    const coupon = await db.upsertCoupon(parsed.data);
    await db.appendAuditLog({
      actorEmail: req.user?.email || 'admin@nexora.shop',
      actorRole: 'admin',
      action: 'COUPON_UPSERTED',
      targetType: 'coupon',
      targetId: coupon.code,
      details: `${coupon.code}: ${coupon.description} (active=${coupon.isActive})`,
    });
    return res.status(201).json({ success: true, data: coupon });
  }
);

apiRouter.patch(
  '/admin/orders/:id/status',
  writeLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: AuthRequest, res: Response) => {
    const nextStage = req.body?.trackingStage;
    const result = await db.updateOrderStage(req.params.id, nextStage);
    if (!result.ok || !result.order) {
      return res.status(400).json({ success: false, error: result.error });
    }
    await updateUserOrderStateSql(req.params.id, {
      status: result.order.status,
      trackingStage: result.order.trackingStage,
    });
    await db.appendAuditLog({
      actorEmail: req.user?.email || 'admin@nexora.shop',
      actorRole: 'admin',
      action: 'ORDER_STAGE_UPDATED',
      targetType: 'order',
      targetId: req.params.id,
      details: `Order moved to ${nextStage}`,
    });
    return res.json({ success: true, data: result.order });
  }
);

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

// 9b. Public Sellers Directory API
apiRouter.get('/sellers', async (_req: Request, res: Response) => {
  const sellers = await db.getSellers();
  res.json({
    success: true,
    data: sellers,
    total: sellers.length,
    message: 'Verified sellers retrieved successfully.',
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
        mode: process.env.RAZORPAY_KEY_SECRET ? 'LIVE_MODE' : 'SANDBOX_DEMO_MODE',
        codAvailable: true,
        freeShippingThresholdPaise: 99900,
      },
      aiAssistant: {
        name: 'NOVA',
        provider: 'Google Gemini (gemini-4-hydrogen)',
        groundedTools: ['liveCatalogSnapshot', 'priceComparison', 'policyKnowledge'],
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
  if (
    err &&
    typeof err === 'object' &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.parse.failed'
  ) {
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
