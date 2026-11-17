import { UserAddress } from '../types/index.js';

export type CheckoutPaymentMethodType = 'upi' | 'card' | 'netbanking' | 'cod' | 'wallet';
export type CheckoutUpiAppId = 'gpay' | 'phonepe' | 'paytm' | 'cred';

export type VoiceCheckoutIntent =
  | 'select_address'
  | 'confirm_address'
  | 'select_payment'
  | 'confirm_payment'
  | 'confirm_both'
  | 'submit_payment'
  | 'unknown';

export interface VoiceCheckoutCommandOutcome {
  matched: boolean;
  intent: VoiceCheckoutIntent;
  transcript: string;
  addressId?: string;
  confirmAddress?: boolean;
  paymentMethod?: CheckoutPaymentMethodType;
  upiApp?: CheckoutUpiAppId;
  netbankingBank?: string;
  confirmPayment?: boolean;
  submitPayment?: boolean;
  feedbackMessage: string;
}

export const CHECKOUT_VOICE_HINTS: readonly string[] = [
  'Confirm address',
  'Deliver to Bengaluru',
  'Pay with UPI Google Pay',
  'Use Cash on Delivery',
  'Confirm payment method',
];

const ORDINAL_INDEX_WORDS: Record<string, number> = {
  first: 0,
  '1st': 0,
  one: 0,
  '1': 0,
  second: 1,
  '2nd': 1,
  two: 1,
  '2': 1,
  third: 2,
  '3rd': 2,
  three: 2,
  '3': 2,
  fourth: 3,
  '4th': 3,
  four: 3,
  '4': 3,
};

const BANK_MATCHERS: Array<{ pattern: RegExp; bankName: string }> = [
  { pattern: /\bhdfc\b/i, bankName: 'HDFC Bank' },
  { pattern: /\bicici\b/i, bankName: 'ICICI Bank' },
  { pattern: /\b(sbi|state bank)\b/i, bankName: 'State Bank of India' },
  { pattern: /\baxis\b/i, bankName: 'Axis Bank' },
  { pattern: /\bkotak\b/i, bankName: 'Kotak Bank' },
  { pattern: /\b(pnb|punjab national)\b/i, bankName: 'Punjab National Bank' },
  { pattern: /\bbaroda\b/i, bankName: 'Bank of Baroda' },
  { pattern: /\bcanara\b/i, bankName: 'Canara Bank' },
  { pattern: /\bindusind\b/i, bankName: 'IndusInd Bank' },
];

const PAYMENT_LABELS: Record<CheckoutPaymentMethodType, string> = {
  upi: 'UPI / QR Code',
  card: 'Credit / Debit Card',
  netbanking: 'Net Banking',
  cod: 'Cash on Delivery',
  wallet: 'NexWallet & Points',
};

function findMatchingAddress(
  normalizedTranscript: string,
  addresses: UserAddress[]
): UserAddress | undefined {
  if (addresses.length === 0) return undefined;

  // 1. Match explicit PIN code
  const pinMatch = normalizedTranscript.match(/\b(\d{6})\b/);
  if (pinMatch) {
    const byPin = addresses.find((addr) => addr.pinCode.trim() === pinMatch[1]);
    if (byPin) return byPin;
  }

  // 2. Match city, state, recipient name, or street words
  for (const addr of addresses) {
    const cityLower = addr.city.trim().toLowerCase();
    const stateLower = addr.state.trim().toLowerCase();
    const nameLower = addr.name.trim().toLowerCase();
    if (
      (cityLower.length >= 3 && normalizedTranscript.includes(cityLower)) ||
      (stateLower.length >= 3 && normalizedTranscript.includes(stateLower)) ||
      (nameLower.length >= 3 && normalizedTranscript.includes(nameLower))
    ) {
      return addr;
    }
    const streetTokens = addr.street
      .toLowerCase()
      .split(/[\s,.-]+/)
      .filter((tok) => tok.length >= 4);
    if (streetTokens.some((tok) => normalizedTranscript.includes(tok))) {
      return addr;
    }
  }

  // 3. Match ordinal reference like "address 2" or "second address"
  const addressOrdinalMatch = normalizedTranscript.match(
    /(?:address|option|number|#)\s*(first|1st|one|1|second|2nd|two|2|third|3rd|three|3|fourth|4th|four|4)\b|(first|1st|second|2nd|third|3rd|fourth|4th)\s+address\b/
  );
  if (addressOrdinalMatch) {
    const token = addressOrdinalMatch[1] || addressOrdinalMatch[2];
    const index = ORDINAL_INDEX_WORDS[token];
    if (typeof index === 'number' && addresses[index]) {
      return addresses[index];
    }
  }

  // 4. Default vs alternate shortcut ("home", "default", "office")
  if (/\b(default|primary|home)\b/.test(normalizedTranscript)) {
    return addresses.find((addr) => addr.isDefault) || addresses[0];
  }
  if (/\b(office|work|alternate|other)\b/.test(normalizedTranscript) && addresses.length > 1) {
    return addresses.find((addr) => !addr.isDefault) || addresses[1];
  }

  return undefined;
}

function detectPaymentCommand(normalizedTranscript: string): {
  paymentMethod?: CheckoutPaymentMethodType;
  upiApp?: CheckoutUpiAppId;
  netbankingBank?: string;
} {
  // UPI + UPI apps
  if (/\b(gpay|google pay)\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'upi', upiApp: 'gpay' };
  }
  if (/\b(phonepe|phone pe)\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'upi', upiApp: 'phonepe' };
  }
  if (/\bpaytm\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'upi', upiApp: 'paytm' };
  }
  if (/\bcred\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'upi', upiApp: 'cred' };
  }
  if (/\b(upi|qr code|vpa)\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'upi' };
  }

  // Wallet
  if (/\b(nexwallet|wallet|one tap|1 tap|1-tap)\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'wallet' };
  }

  // Cash on Delivery
  if (/\b(cash on delivery|cod|pay at doorstep|cash)\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'cod' };
  }

  // Credit / Debit Card
  if (/\b(card|credit card|debit card|visa|mastercard|rupay)\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'card' };
  }

  // Net Banking (+ specific bank names)
  for (const entry of BANK_MATCHERS) {
    if (entry.pattern.test(normalizedTranscript)) {
      return { paymentMethod: 'netbanking', netbankingBank: entry.bankName };
    }
  }
  if (/\b(net banking|netbanking|bank transfer)\b/.test(normalizedTranscript)) {
    return { paymentMethod: 'netbanking' };
  }

  return {};
}

/**
 * Parses a natural spoken or typed voice command into structured Checkout actions
 * for confirming delivery addresses and selecting/confirming payment methods.
 */
export function parseCheckoutVoiceCommand(
  rawTranscript: string,
  addresses: UserAddress[],
  currentMethod: CheckoutPaymentMethodType
): VoiceCheckoutCommandOutcome {
  const transcript = rawTranscript.trim();
  const normalized = transcript.toLowerCase().replace(/\s+/g, ' ');

  if (!normalized) {
    return {
      matched: false,
      intent: 'unknown',
      transcript,
      feedbackMessage: 'No voice input detected. Try saying "Confirm address" or "Pay with UPI".',
    };
  }

  const matchedAddress = findMatchingAddress(normalized, addresses);
  const detectedPayment = detectPaymentCommand(normalized);

  const hasConfirmVerb = /\b(confirm|verify|verified|approve|select|use|choose|lock|pick|switch|pay|deliver|ship)\b/.test(
    normalized
  );
  const mentionsAddress = /\b(address|location|pincode|pin code|deliver|shipping|ship to)\b/.test(
    normalized
  );
  const mentionsPayment = /\b(payment|method|pay via|pay with|pay by|billing|mode)\b/.test(
    normalized
  );
  const wantsSubmitOrder = /\b(pay now|place order|complete order|complete checkout|authorize payment|submit payment)\b/.test(
    normalized
  );
  const wantsConfirmAll = /\b(confirm both|confirm all|confirm everything|confirm checkout)\b/.test(
    normalized
  );

  // 1. Direct order completion command ("Pay now" / "Place order")
  if (wantsSubmitOrder) {
    const chosenMethod = detectedPayment.paymentMethod || currentMethod;
    return {
      matched: true,
      intent: 'submit_payment',
      transcript,
      addressId: matchedAddress?.id,
      confirmAddress: true,
      paymentMethod: detectedPayment.paymentMethod,
      upiApp: detectedPayment.upiApp,
      netbankingBank: detectedPayment.netbankingBank,
      confirmPayment: true,
      submitPayment: true,
      feedbackMessage: `Confirmed address & ${PAYMENT_LABELS[chosenMethod]}. Authorizing order...`,
    };
  }

  // 2. Combined address + payment confirmation
  if (
    wantsConfirmAll ||
    (matchedAddress && detectedPayment.paymentMethod) ||
    (mentionsAddress && mentionsPayment && hasConfirmVerb)
  ) {
    const activeAddr = matchedAddress || addresses.find((a) => a.isDefault) || addresses[0];
    const activeMethod = detectedPayment.paymentMethod || currentMethod;
    return {
      matched: true,
      intent: 'confirm_both',
      transcript,
      addressId: activeAddr?.id,
      confirmAddress: true,
      paymentMethod: detectedPayment.paymentMethod,
      upiApp: detectedPayment.upiApp,
      netbankingBank: detectedPayment.netbankingBank,
      confirmPayment: true,
      feedbackMessage: `Confirmed ${activeAddr ? `${activeAddr.city} (${activeAddr.pinCode})` : 'delivery address'} & ${PAYMENT_LABELS[activeMethod]}.`,
    };
  }

  // 3. Address selection or confirmation
  if (matchedAddress || (mentionsAddress && hasConfirmVerb)) {
    const targetAddr = matchedAddress || addresses.find((a) => a.isDefault) || addresses[0];
    return {
      matched: true,
      intent: matchedAddress ? 'select_address' : 'confirm_address',
      transcript,
      addressId: targetAddr?.id,
      confirmAddress: true,
      feedbackMessage: targetAddr
        ? `Delivery address confirmed: ${targetAddr.street}, ${targetAddr.city} (${targetAddr.pinCode}).`
        : 'Delivery address confirmed.',
    };
  }

  // 4. Payment method selection or confirmation
  if (detectedPayment.paymentMethod || (mentionsPayment && hasConfirmVerb)) {
    const chosenMethod = detectedPayment.paymentMethod || currentMethod;
    const extraDetail = detectedPayment.upiApp
      ? ` via ${detectedPayment.upiApp.toUpperCase()}`
      : detectedPayment.netbankingBank
      ? ` (${detectedPayment.netbankingBank})`
      : '';
    return {
      matched: true,
      intent: detectedPayment.paymentMethod ? 'select_payment' : 'confirm_payment',
      transcript,
      paymentMethod: detectedPayment.paymentMethod,
      upiApp: detectedPayment.upiApp,
      netbankingBank: detectedPayment.netbankingBank,
      confirmPayment: true,
      feedbackMessage: `Payment method confirmed: ${PAYMENT_LABELS[chosenMethod]}${extraDetail}.`,
    };
  }

  return {
    matched: false,
    intent: 'unknown',
    transcript,
    feedbackMessage: `Did not recognize "${transcript}". Try "Confirm address", "Deliver to Bengaluru", "Pay with UPI", or "Confirm payment".`,
  };
}
