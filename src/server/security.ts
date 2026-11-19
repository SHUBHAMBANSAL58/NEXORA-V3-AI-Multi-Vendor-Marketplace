import crypto from 'node:crypto';

export interface WebhookVerificationResult {
  ok: boolean;
  status: number;
  error?: string;
}

/**
 * Verifies a Razorpay webhook HMAC-SHA256 signature with fail-closed behavior.
 * Never succeeds when secret or signature is missing.
 */
export function verifyRazorpayWebhookRequest(
  rawBody: unknown,
  signatureHeader: string | string[] | undefined,
  webhookSecret?: string
): WebhookVerificationResult {
  const secret = (webhookSecret || '').trim();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: 'Razorpay webhook secret not configured.',
    };
  }

  const providedSig = Array.isArray(signatureHeader)
    ? signatureHeader[0] || ''
    : signatureHeader || '';
  if (!providedSig) {
    return {
      ok: false,
      status: 401,
      error: 'Missing webhook signature header.',
    };
  }

  const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return {
      ok: false,
      status: 401,
      error: 'Invalid webhook signature.',
    };
  }

  return { ok: true, status: 200 };
}

/**
 * Checks whether an authenticated caller may mutate a customer order.
 */
export function canUserAccessOrder(params: {
  callerUid: string;
  callerRole?: string;
  sqlOwnerUid: string | null;
  callerSqlOrderIds: string[];
  orderId: string;
}): boolean {
  if (params.callerRole === 'admin') return true;
  if (params.sqlOwnerUid !== null) {
    return params.sqlOwnerUid === params.callerUid;
  }
  return params.callerSqlOrderIds.includes(params.orderId);
}
