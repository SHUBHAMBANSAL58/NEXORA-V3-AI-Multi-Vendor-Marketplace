import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  QrCode,
  CreditCard,
  Building2,
  Banknote,
  CheckCircle2,
  Lock,
  ArrowRight,
  Smartphone,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  CalendarCheck,
  AlertTriangle,
  FileText,
  Gift,
  Wallet,
  PlusCircle,
  Sparkles,
  Zap,
  Mic,
  MicOff,
  MapPin,
  Volume2,
} from 'lucide-react';
import { UserProfile, UserAddress } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import {
  getAvailableBusinessDays,
  isValidBusinessDeliveryDate,
} from '../utils/commerceFeatures.js';
import {
  parseCheckoutVoiceCommand,
} from '../utils/voiceCheckoutCommands.js';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  currentUser: UserProfile;
  onSuccess: (paymentInfo: {
    paymentId: string;
    method: string;
    deliveryAddress: UserAddress;
    preferredDeliveryDate?: string;
    orderNotes?: string;
    isGiftReceipt?: boolean;
    giftMessage?: string;
    walletDeductionPaise?: number;
    pointsRedeemed?: number;
  }) => void;
  onUpdateUserWallet?: (newBalancePaise: number) => void;
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

type PaymentMethodType = 'upi' | 'card' | 'netbanking' | 'cod' | 'wallet';

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  totalPaise,
  subtotalPaise,
  shippingPaise,
  currentUser,
  onSuccess,
  onUpdateUserWallet,
  getAuthHeaders,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('upi');
  const [upiId, setUpiId] = useState('shubham@okhdfcbank');
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'cred'>('gpay');
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);

  // NexWallet & Loyalty Points State
  const initialWalletPaise = currentUser.walletBalancePaise ?? 500000; // Default ₹5,000 for demo
  const [walletBalancePaise, setWalletBalancePaise] = useState<number>(initialWalletPaise);
  const [useNexPoints, setUseNexPoints] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  // 10 NexPoints = ₹1.00 (100 paise) => 1 point = 10 paise
  const maxPointsAvailable = Math.max(0, currentUser.loyaltyPoints || 0);
  const pointsDiscountPaise = Math.min(maxPointsAvailable * 10, totalPaise);
  const pointsToRedeem = useNexPoints
    ? Math.min(maxPointsAvailable, Math.ceil(pointsDiscountPaise / 10))
    : 0;

  const effectivePayablePaise = useNexPoints
    ? Math.max(0, totalPaise - pointsDiscountPaise)
    : totalPaise;

  const hasSufficientWalletBalance = walletBalancePaise >= effectivePayablePaise;

  const handleDepositFunds = async (depositAmountPaise: number) => {
    let nextBal = walletBalancePaise + depositAmountPaise;
    if (getAuthHeaders) {
      try {
        const headers = await getAuthHeaders();
        if (headers.Authorization) {
          const resp = await fetch('/api/v1/wallet/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ amountPaise: depositAmountPaise }),
          });
          if (resp.ok) {
            const payload = await resp.json();
            if (typeof payload?.data?.walletBalancePaise === 'number') {
              nextBal = payload.data.walletBalancePaise;
            }
          }
        }
      } catch {
        // fallback cleanly in local sandbox session
      }
    }
    setWalletBalancePaise(nextBal);
    if (onUpdateUserWallet) {
      onUpdateUserWallet(nextBal);
    }
    setDepositSuccessMsg(`Deposited ${formatCurrencyINR(depositAmountPaise)} into NexWallet!`);
    setTimeout(() => setDepositSuccessMsg(null), 3000);
  };

  // Gift Receipt State
  const [isGiftReceipt, setIsGiftReceipt] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [giftRecipientName, setGiftRecipientName] = useState('');

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4532 8912 3456 7890');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('883');
  const [cardName, setCardName] = useState(currentUser.name || 'Shubham Bansal');

  // Netbanking State
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Selectable Delivery Address State
  const fallbackAddress: UserAddress = {
    id: 'addr-default',
    name: currentUser.name,
    phone: currentUser.phone || '+91 98765 43210',
    street: 'Plot 12, Barakhamba Road',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110001',
    isDefault: true,
  };
  const availableAddresses: UserAddress[] =
    currentUser.addresses.length > 0 ? currentUser.addresses : [fallbackAddress];

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    (availableAddresses.find((a) => a.isDefault) || availableAddresses[0]).id
  );
  const selectedAddress: UserAddress =
    availableAddresses.find((a) => a.id === selectedAddressId) || availableAddresses[0];
  const alternateAddressCity =
    availableAddresses.find((addr) => addr.id !== selectedAddress.id)?.city ||
    availableAddresses.find((addr) => !addr.isDefault)?.city ||
    availableAddresses[0]?.city ||
    'New Delhi';
  const dynamicVoiceHints = [
    'Confirm address',
    `Deliver to ${alternateAddressCity}`,
    'Pay with UPI Google Pay',
    'Use Cash on Delivery',
  ];

  // Voice-Command Checkout State (Microphone SpeechRecognition + Manual Fallback)
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceCommandDraft, setVoiceCommandDraft] = useState<string>('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [voiceErrorMsg, setVoiceErrorMsg] = useState<string | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState<boolean>(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);

  // Delivery Preferences State
  const availableBusinessDays = React.useMemo(() => getAvailableBusinessDays(8), []);
  const [selectedDateString, setSelectedDateString] = useState<string>(
    availableBusinessDays[0]?.dateString || ''
  );
  const [customDateInput, setCustomDateInput] = useState<string>(
    availableBusinessDays[0]?.dateString || ''
  );
  const [dateValidationWarning, setDateValidationWarning] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);

  const handleSelectBusinessDay = (dateStr: string) => {
    setSelectedDateString(dateStr);
    setCustomDateInput(dateStr);
    setDateValidationWarning(null);
  };

  const handleCustomDateChange = (val: string) => {
    setCustomDateInput(val);
    const validation = isValidBusinessDeliveryDate(val);
    if (!validation.valid) {
      setDateValidationWarning(validation.reason || 'Invalid delivery date');
    } else {
      setDateValidationWarning(null);
      setSelectedDateString(val);
    }
  };

  const handleSnapToNextBusinessDay = () => {
    if (availableBusinessDays.length > 0) {
      handleSelectBusinessDay(availableBusinessDays[0].dateString);
    }
  };

  // Gateway Simulation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('Contacting Razorpay gateway...');
  const [isComplete, setIsComplete] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState('');

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsComplete(false);
      setIsProcessing(false);
      setPaymentValidationError(null);
      setWalletBalancePaise(currentUser.walletBalancePaise ?? 500000);
      setSelectedAddressId(
        (availableAddresses.find((a) => a.isDefault) || availableAddresses[0]).id
      );
      setAddressConfirmed(false);
      setPaymentConfirmed(false);
      setVoiceTranscript('');
      setVoiceFeedback(null);
      setVoiceErrorMsg(null);
    }
    if (!isOpen && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore speech stop errors
      }
      setIsMicListening(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentUser.walletBalancePaise]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isProcessing, onClose]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  const stopMicrophoneListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsMicListening(false);
  };

  const applyVoiceCommand = (rawPhrase: string) => {
    const trimmed = rawPhrase.trim();
    if (!trimmed) return;
    setVoiceTranscript(trimmed);
    setVoiceErrorMsg(null);

    const outcome = parseCheckoutVoiceCommand(trimmed, availableAddresses, selectedMethod);
    setVoiceFeedback(outcome.feedbackMessage);

    if (!outcome.matched) return;

    if (outcome.addressId) {
      setSelectedAddressId(outcome.addressId);
    }
    if (outcome.confirmAddress) {
      setAddressConfirmed(true);
    }
    if (outcome.paymentMethod) {
      setSelectedMethod(outcome.paymentMethod);
      setPaymentValidationError(null);
    }
    if (outcome.upiApp) {
      setSelectedApp(outcome.upiApp);
    }
    if (outcome.netbankingBank) {
      setSelectedBank(outcome.netbankingBank);
    }
    if (outcome.confirmPayment) {
      setPaymentConfirmed(true);
    }
    if (outcome.submitPayment) {
      stopMicrophoneListening();
      handlePay();
    }
  };

  const startMicrophoneListening = async () => {
    setVoiceErrorMsg(null);
    type SpeechRecognitionLike = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      continuous: boolean;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
      onerror: ((ev: { error?: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
      abort: () => void;
    };
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      setVoiceErrorMsg(
        'Browser Web Speech microphone API is unavailable in this environment. Use the voice command bar below to confirm address or payment.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecCtor();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const lastIndex = event.results.length - 1;
        if (lastIndex < 0) return;
        const resultItem = event.results[lastIndex];
        const spoken = resultItem?.[0]?.transcript || '';
        setVoiceTranscript(spoken);
        if (resultItem?.isFinal) {
          applyVoiceCommand(spoken);
        }
      };

      recognition.onerror = (event) => {
        setIsMicListening(false);
        const reason = event?.error || 'microphone-unavailable';
        setVoiceErrorMsg(
          `Microphone input interrupted (${reason}). You can retry or enter a voice phrase below.`
        );
      };

      recognition.onend = () => {
        setIsMicListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setIsMicListening(true);
      recognition.start();
    } catch {
      setIsMicListening(false);
      setVoiceErrorMsg(
        'Microphone permission was denied or unavailable. Use the command input below or grant mic permission.'
      );
    }
  };

  const handleToggleVoiceCheckout = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopMicrophoneListening();
        setVoiceErrorMsg(null);
      } else {
        void startMicrophoneListening();
      }
      return next;
    });
  };

  const validateSelectedMethod = (): string | null => {
    if (selectedMethod === 'upi') {
      const cleanedUpi = upiId.trim();
      if (!/^[\w.-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(cleanedUpi)) {
        return 'Enter a valid UPI ID (e.g. name@okhdfcbank).';
      }
    }
    if (selectedMethod === 'card') {
      const digits = cardNumber.replace(/\s+/g, '');
      if (!/^\d{12,19}$/.test(digits)) {
        return 'Enter a valid 12 to 19 digit card number.';
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.trim())) {
        return 'Enter card expiry in MM/YY format.';
      }
      if (!/^\d{3,4}$/.test(cardCvv.trim())) {
        return 'Enter a valid 3 or 4 digit CVV.';
      }
      if (cardName.trim().length < 2) {
        return 'Enter the cardholder name.';
      }
    }
    if (selectedMethod === 'wallet' && !hasSufficientWalletBalance) {
      return 'Insufficient NexWallet balance. Deposit funds to continue.';
    }
    return null;
  };

  const handlePay = () => {
    const validationError = validateSelectedMethod();
    if (validationError) {
      setPaymentValidationError(validationError);
      return;
    }
    setPaymentValidationError(null);

    // If date has validation warning, snap to valid business day first
    let activeDateStr = selectedDateString;
    if (dateValidationWarning) {
      activeDateStr = availableBusinessDays[0]?.dateString || '';
      setSelectedDateString(activeDateStr);
      setDateValidationWarning(null);
    }

    setIsProcessing(true);
    setProcessingStage('Connecting to Razorpay Sandbox Test Gateway...');

    const fallbackId = `pay_NEX_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const runGatewaySync = async (): Promise<string> => {
      if (!getAuthHeaders) return fallbackId;
      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) return fallbackId;
        const orderResp = await fetch('/api/v1/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ amountPaise: Math.max(100, effectivePayablePaise) }),
        });
        if (!orderResp.ok) return fallbackId;
        const orderPayload = await orderResp.json();
        const rzpOrderId = orderPayload?.data?.razorpayOrderId;

        const verifyResp = await fetch('/api/v1/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: fallbackId,
          }),
        });
        if (verifyResp.ok) {
          const verifyPayload = await verifyResp.json();
          return verifyPayload?.data?.paymentId || fallbackId;
        }
      } catch {
        // graceful sandbox fallback
      }
      return fallbackId;
    };

    const gatewayPromise = runGatewaySync();

    setTimeout(() => {
      if (selectedMethod === 'wallet') {
        setProcessingStage('Debiting NexWallet instant 1-tap balance...');
      } else {
        setProcessingStage('Authorizing simulated Razorpay sandbox payment...');
      }
    }, 600);

    setTimeout(async () => {
      const resolvedPaymentId = await gatewayPromise;
      setProcessingStage('Sandbox payment authorized!');
      setIsProcessing(false);
      setIsComplete(true);
      setCompletedPaymentId(resolvedPaymentId);

      const selectedDayObj = availableBusinessDays.find((d) => d.dateString === activeDateStr);
      const formattedDeliveryDate = selectedDayObj
        ? selectedDayObj.formattedFull
        : activeDateStr;

      const walletDeducted = selectedMethod === 'wallet' ? effectivePayablePaise : 0;
      if (walletDeducted > 0) {
        setWalletBalancePaise(Math.max(0, walletBalancePaise - walletDeducted));
      }

      // Trigger actual applet order confirmation after 900ms (single atomic balance deduction in parent)
      setTimeout(() => {
        const upiAppLabels: Record<'gpay' | 'phonepe' | 'paytm' | 'cred', string> = {
          gpay: 'Google Pay',
          phonepe: 'PhonePe',
          paytm: 'Paytm',
          cred: 'CRED Pay',
        };
        let methodLabel = `Razorpay Sandbox UPI (${upiAppLabels[selectedApp]})`;
        if (selectedMethod === 'card') methodLabel = `Razorpay Sandbox Card (${cardNumber.slice(-4)})`;
        if (selectedMethod === 'netbanking') methodLabel = `Razorpay Sandbox NetBanking (${selectedBank})`;
        if (selectedMethod === 'cod') methodLabel = 'Cash on Delivery (Pay at Doorstep)';
        if (selectedMethod === 'wallet') {
          methodLabel =
            pointsToRedeem > 0
              ? `NexWallet (1-Tap) + ${pointsToRedeem} NexPoints`
              : 'NexWallet Express (1-Tap)';
        }

        const compiledGiftMessage = isGiftReceipt
          ? giftMessage.trim()
            ? `${giftRecipientName.trim() ? `To: ${giftRecipientName.trim()} — ` : ''}${giftMessage.trim()}`
            : 'Sent with love via NEXORA'
          : undefined;

        onSuccess({
          paymentId: resolvedPaymentId,
          method: methodLabel,
          deliveryAddress: selectedAddress,
          preferredDeliveryDate: formattedDeliveryDate,
          orderNotes: orderNotes.trim() ? orderNotes.trim() : undefined,
          isGiftReceipt,
          giftMessage: compiledGiftMessage,
          walletDeductionPaise: walletDeducted > 0 ? walletDeducted : undefined,
          pointsRedeemed: pointsToRedeem > 0 ? pointsToRedeem : undefined,
        });
      }, 900);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Razorpay Secure Checkout"
        className="w-full max-w-2xl bg-white dark:bg-[#0c121e] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Top Header: Razorpay Official Merchant Banner */}
        <div className="bg-gradient-to-r from-[#0c2340] to-[#0a192f] text-white p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-blue-900/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 font-black text-lg font-mono shrink-0">
              N
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm tracking-tight text-white">NEXORA Retail India</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Verified Merchant
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">Razorpay Sandbox Test Checkout · Simulated Settlement</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isComplete && !isProcessing && (
              <button
                type="button"
                role="switch"
                aria-checked={voiceEnabled}
                data-testid="voice-checkout-toggle"
                onClick={handleToggleVoiceCheckout}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  voiceEnabled
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs'
                    : 'bg-white/10 text-slate-100 border-white/20 hover:bg-white/15'
                }`}
                aria-label="Toggle voice-command checkout"
              >
                {voiceEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                <span>Voice Checkout</span>
              </button>
            )}

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300 block">Total Payable</span>
              <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-cyan-400">
                {formatCurrencyINR(effectivePayablePaise)}
              </span>
              {useNexPoints && (
                <span className="text-[10px] font-mono text-emerald-400 block">
                  Saved {formatCurrencyINR(pointsDiscountPaise)} (NexPoints)
                </span>
              )}
            </div>

            {!isProcessing && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close checkout"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Interactive Voice-Command Bar (Visible when Voice Checkout Toggle is ON) */}
        {voiceEnabled && !isComplete && !isProcessing && (
          <div
            data-testid="voice-checkout-panel"
            className="px-4 sm:px-5 py-3 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 space-y-2.5 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isMicListening) {
                      stopMicrophoneListening();
                    } else {
                      void startMicrophoneListening();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    isMicListening
                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                      : 'bg-cyan-600 text-white hover:bg-cyan-500'
                  }`}
                >
                  {isMicListening ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      <span>Listening... Stop Mic</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Speak with Mic</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Confirm address &amp; payment hands-free
                </span>
              </div>

              {/* Explicit Confirmation Checkpoints (Icon + Text, never hue-only) */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span
                  data-testid="voice-address-status"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                    addressConfirmed
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{addressConfirmed ? 'Address Confirmed' : 'Address Pending'}</span>
                </span>
                <span
                  data-testid="voice-payment-status"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                    paymentConfirmed
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{paymentConfirmed ? 'Payment Confirmed' : 'Payment Pending'}</span>
                </span>
              </div>
            </div>

            {/* Spoken Transcript Input & Quick Voice Presets */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyVoiceCommand(voiceCommandDraft);
                setVoiceCommandDraft('');
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="text"
                value={voiceCommandDraft}
                onChange={(e) => setVoiceCommandDraft(e.target.value)}
                placeholder={`Say or type e.g. "Confirm address", "Deliver to ${alternateAddressCity}", "Pay with UPI"`}
                aria-label="Speak or type checkout voice command"
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-[11px] hover:bg-cyan-600 dark:hover:bg-cyan-400 whitespace-nowrap cursor-pointer transition-colors"
              >
                Confirm Command
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Try:</span>
              {dynamicVoiceHints.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => applyVoiceCommand(hint)}
                  className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-500 cursor-pointer transition-colors whitespace-nowrap"
                >
                  "{hint}"
                </button>
              ))}
            </div>

            {(voiceTranscript || voiceFeedback || voiceErrorMsg) && (
              <div className="space-y-1 pt-0.5">
                {voiceTranscript && (
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">
                    Transcript: <strong className="font-mono">"{voiceTranscript}"</strong>
                  </p>
                )}
                {voiceFeedback && (
                  <p
                    data-testid="voice-command-feedback"
                    className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300"
                  >
                    {voiceFeedback}
                  </p>
                )}
                {voiceErrorMsg && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    {voiceErrorMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Body / Gateway Process */}
        {isComplete ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sandbox Payment Authorized!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-1">Transaction ID: {completedPaymentId}</p>
            </div>
            {isGiftReceipt && (
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Gift Receipt activated: Prices masked on invoice and shipment slip.</span>
              </div>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300 max-w-sm">
              Your simulated sandbox order has been verified and registered on the NEXORA India Logistics Network. Generating order tracking...
            </p>
          </div>
        ) : isProcessing ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Processing Sandbox Transaction</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono animate-pulse">{processingStage}</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Please do not refresh or close this browser window.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 overflow-y-auto">
            
            {/* Left Nav: Payment Methods & Options */}
            <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-950/40 p-3 sm:p-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 px-2 block mb-2 font-bold">
                Payment Options
              </span>

              {/* NexWallet & Points Tab (Highlight) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('wallet');
                  setPaymentValidationError(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                  selectedMethod === 'wallet'
                    ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-400 dark:border-cyan-700 shadow-xs ring-1 ring-cyan-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-white">NexWallet & Points</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500 text-slate-950 shadow-2xs">
                      1-Tap
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Bal: {formatCurrencyINR(walletBalancePaise)}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('upi');
                  setPaymentValidationError(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                  selectedMethod === 'upi'
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4 text-cyan-500 shrink-0" />
                <div className="flex-1">
                  <div>UPI / QR Code</div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">GPay, PhonePe, Paytm, CRED</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('card');
                  setPaymentValidationError(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                  selectedMethod === 'card'
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-cyan-500 shrink-0" />
                <div className="flex-1">
                  <div>Credit / Debit Cards</div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">Visa, Mastercard, RuPay</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('netbanking');
                  setPaymentValidationError(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                  selectedMethod === 'netbanking'
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <div className="flex-1">
                  <div>Net Banking</div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">All Indian Scheduled Banks</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('cod');
                  setPaymentValidationError(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                  selectedMethod === 'cod'
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <div>Cash on Delivery</div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">Pay cash/UPI at doorstep</div>
                </div>
              </button>

              {/* GIFT RECEIPT TOGGLE */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="font-semibold text-[11px] text-purple-900 dark:text-purple-200">
                        Gift Receipt
                      </span>
                    </label>
                    <input
                      type="checkbox"
                      checked={isGiftReceipt}
                      onChange={(e) => setIsGiftReceipt(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                  </div>

                  {isGiftReceipt && (
                    <div className="space-y-1.5 pt-1 text-[10px] text-purple-800 dark:text-purple-300">
                      <p className="leading-tight">
                        Prices and payment particulars will be <strong>masked</strong> on the invoice, packing slip, and confirmation email.
                      </p>
                      <input
                        type="text"
                        value={giftRecipientName}
                        onChange={(e) => setGiftRecipientName(e.target.value)}
                        placeholder="Recipient Name (e.g. For Ananya)"
                        className="w-full px-2 py-1 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-[11px] text-slate-900 dark:text-white"
                      />
                      <textarea
                        rows={2}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Personal gift note (e.g. Happy Birthday! Enjoy the headphones...)"
                        className="w-full px-2 py-1 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-[11px] text-slate-900 dark:text-white resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address Selector & Confirmation */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono uppercase text-[9px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-500" />
                    <span>Delivering To</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddressConfirmed(true)}
                    className={`text-[10px] font-semibold cursor-pointer flex items-center gap-1 ${
                      addressConfirmed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-cyan-700 dark:text-cyan-400 hover:underline'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{addressConfirmed ? 'Confirmed' : 'Confirm Address'}</span>
                  </button>
                </div>

                {availableAddresses.length > 1 ? (
                  <select
                    aria-label="Select delivery address"
                    value={selectedAddress.id}
                    onChange={(e) => {
                      setSelectedAddressId(e.target.value);
                      setAddressConfirmed(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {availableAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.city} ({addr.pinCode}) · {addr.street}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {selectedAddress.name}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 truncate">
                      {selectedAddress.street}, {selectedAddress.city} - {selectedAddress.pinCode}
                    </p>
                  </>
                )}
              </div>

              {/* Preferred Delivery Date (Business Days Only) */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono uppercase text-[9px] text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-500" />
                    Preferred Delivery Date
                  </span>
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">
                    Mon–Fri Only
                  </span>
                </div>

                {/* Quick Business Day Chips */}
                <div className="grid grid-cols-2 gap-1.5">
                  {availableBusinessDays.slice(0, 4).map((day) => {
                    const isSelected = selectedDateString === day.dateString && !dateValidationWarning;
                    return (
                      <button
                        key={day.dateString}
                        type="button"
                        onClick={() => handleSelectBusinessDay(day.dateString)}
                        className={`px-2 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-600 font-semibold shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <div className="truncate font-medium">{day.displayLabel}</div>
                        <div className={`text-[9px] ${isSelected ? 'text-cyan-50' : 'text-slate-600 dark:text-slate-400'}`}>
                          {day.isFastest ? '⚡ Fastest' : day.dayOfWeek}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Picker & Validation */}
                <div className="pt-1">
                  <input
                    type="date"
                    min={availableBusinessDays[0]?.dateString}
                    value={customDateInput}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />

                  {dateValidationWarning && (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-300 space-y-1">
                      <div className="flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{dateValidationWarning}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSnapToNextBusinessDay}
                        className="font-bold underline text-cyan-700 dark:text-cyan-400 cursor-pointer block"
                      >
                        Select Next Business Day ({availableBusinessDays[0]?.displayLabel})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Notes / Special Delivery Instructions */}
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                {!showDeliveryNotes ? (
                  <button
                    type="button"
                    onClick={() => setShowDeliveryNotes(true)}
                    className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>+ Add Special Delivery Instructions / Notes</span>
                  </button>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400">
                      <span>Delivery Instructions</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeliveryNotes(false);
                          setOrderNotes('');
                        }}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Leave with building security, call upon doorstep arrival..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane: Method Details & Interactive Forms */}
            <div className="w-full md:w-7/12 p-4 sm:p-5 flex flex-col justify-between space-y-4">
              
              {/* TAB 0: NEXWALLET & LOYALTY POINTS */}
              {selectedMethod === 'wallet' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-cyan-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">NexWallet 1-Tap Checkout</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-emerald-500" /> Instant
                    </span>
                  </div>

                  {depositSuccessMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{depositSuccessMsg}</span>
                    </div>
                  )}

                  {/* Wallet Balance Hero Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-cyan-500/30 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        NexWallet Stored Cash
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        Zero Processing Fee
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-cyan-400">
                        {formatCurrencyINR(walletBalancePaise)}
                      </span>
                      <span className={`text-[11px] font-semibold ${hasSufficientWalletBalance ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {hasSufficientWalletBalance ? '● Sufficient for order' : 'Low balance'}
                      </span>
                    </div>

                    {/* Quick Deposit Buttons */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Quick Deposit:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDepositFunds(100000)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-white transition-colors cursor-pointer"
                        >
                          +₹1,000
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDepositFunds(250000)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-white transition-colors cursor-pointer"
                        >
                          +₹2,500
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDepositFunds(500000)}
                          className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                        >
                          +₹5,000
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Loyalty NexPoints Redemption Toggle */}
                  <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                            Redeem Loyalty NexPoints
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Available: <strong>{maxPointsAvailable} NexPoints</strong> (10 pts = ₹1.00)
                          </span>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={useNexPoints}
                        onChange={(e) => setUseNexPoints(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                    </div>

                    {useNexPoints && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold pt-1 border-t border-amber-200/50 dark:border-amber-800/50 flex justify-between">
                        <span>Instant Points Deduction:</span>
                        <span>- {formatCurrencyINR(pointsDiscountPaise)}</span>
                      </div>
                    )}
                  </div>

                  {/* 1-Tap Checkout Prompt */}
                  {hasSufficientWalletBalance ? (
                    <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-[11px] text-cyan-900 dark:text-cyan-200 flex items-center justify-between">
                      <span className="font-medium">
                        Instant 1-Tap Ready. No OTP or redirection required.
                      </span>
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        Remaining: {formatCurrencyINR(walletBalancePaise - effectivePayablePaise)}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <span>Shortfall of {formatCurrencyINR(effectivePayablePaise - walletBalancePaise)}.</span>
                      <button
                        type="button"
                        onClick={() => handleDepositFunds(effectivePayablePaise - walletBalancePaise)}
                        className="font-bold underline text-indigo-600 dark:text-indigo-400 cursor-pointer"
                      >
                        Auto-Deposit Deficit
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 1: UPI */}
              {selectedMethod === 'upi' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Scan QR or Pay with UPI ID</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">Zero Convenience Fee</span>
                  </div>

                  {/* QR Code Graphic Box */}
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-24 h-24 bg-white p-1.5 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                        <rect width="100" height="100" fill="white" />
                        <rect x="10" y="10" width="25" height="25" fill="#090d16" />
                        <rect x="15" y="15" width="15" height="15" fill="white" />
                        <rect x="18" y="18" width="9" height="9" fill="#06b6d4" />
                        <rect x="65" y="10" width="25" height="25" fill="#090d16" />
                        <rect x="70" y="15" width="15" height="15" fill="white" />
                        <rect x="73" y="18" width="9" height="9" fill="#06b6d4" />
                        <rect x="10" y="65" width="25" height="25" fill="#090d16" />
                        <rect x="15" y="70" width="15" height="15" fill="white" />
                        <rect x="18" y="73" width="9" height="9" fill="#06b6d4" />
                        <rect x="42" y="12" width="14" height="6" fill="#090d16" />
                        <rect x="42" y="24" width="8" height="12" fill="#090d16" />
                        <rect x="54" y="30" width="8" height="16" fill="#06b6d4" />
                        <rect x="42" y="55" width="20" height="8" fill="#090d16" />
                        <rect x="68" y="65" width="12" height="12" fill="#090d16" />
                        <rect x="82" y="78" width="8" height="12" fill="#06b6d4" />
                        <rect x="45" y="75" width="12" height="15" fill="#090d16" />
                      </svg>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Scan with any UPI App</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">Google Pay, PhonePe, Paytm, CRED, Amazon Pay or BHIM</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(
                          [
                            { id: 'gpay', label: 'GPay' },
                            { id: 'phonepe', label: 'PhonePe' },
                            { id: 'paytm', label: 'Paytm' },
                            { id: 'cred', label: 'CRED' },
                          ] as const
                        ).map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedApp(app.id)}
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold border transition-colors cursor-pointer ${
                              selectedApp === app.id
                                ? 'bg-cyan-600 text-white border-cyan-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-500'
                            }`}
                          >
                            {app.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Or Enter UPI ID */}
                  <div className="space-y-1.5">
                    <label htmlFor="razorpay-upi-input" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Or Enter Virtual Payment Address (UPI ID)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="razorpay-upi-input"
                        type="text"
                        value={upiId}
                        onChange={(e) => {
                          setUpiId(e.target.value);
                          if (paymentValidationError) setPaymentValidationError(null);
                        }}
                        placeholder="mobile@upi or user@okhdfcbank"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handlePay}
                        className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl hover:bg-cyan-600 dark:hover:bg-cyan-400 transition-colors cursor-pointer"
                      >
                        Verify & Pay
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Credit / Debit Card */}
              {selectedMethod === 'card' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Enter Card Details</span>
                    <div className="flex gap-1 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                      <span>Visa</span> · <span>Mastercard</span> · <span>RuPay</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-700 dark:text-slate-300">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 dark:text-slate-300">Valid Thru (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        maxLength={5}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 dark:text-slate-300">CVV / CVC</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        maxLength={4}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-700 dark:text-slate-300">Name on Card</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: NetBanking */}
              {selectedMethod === 'netbanking' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Select Bank</span>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Bank'].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-2.5 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                          selectedBank === bank
                            ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 font-bold text-cyan-700 dark:text-cyan-400'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] text-slate-700 dark:text-slate-300 block mb-1">Or choose other bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Bank">Kotak Mahindra Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                      <option value="Canara Bank">Canara Bank</option>
                      <option value="IndusInd Bank">IndusInd Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Tab 4: COD */}
              {selectedMethod === 'cod' && (
                <div className="space-y-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <Banknote className="w-4 h-4" />
                    <span>Cash on Delivery Available</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    You can pay in cash or via any UPI QR code scan to the delivery executive when your package reaches your doorstep at {selectedAddress.city} - {selectedAddress.pinCode}.
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    A confirmation OTP will be sent to {selectedAddress.phone} prior to delivery dispatch.
                  </p>
                </div>
              )}

              {/* Order Summary Delivery Preferences Preview */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CalendarCheck className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Scheduled Delivery Window</span>
                  </span>
                  <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                    {availableBusinessDays.find((d) => d.dateString === selectedDateString)?.formattedFull || selectedDateString}
                  </span>
                </div>

                {isGiftReceipt && (
                  <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 text-[10px] pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                    <Gift className="w-3 h-3 text-purple-500 shrink-0" />
                    <span>Gift Receipt Enabled: Prices will be masked on invoice & slips.</span>
                  </div>
                )}

                {orderNotes.trim() && (
                  <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400 text-[10px] pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                    <FileText className="w-3 h-3 shrink-0 mt-0.5 text-cyan-500" />
                    <span className="truncate">Notes: "{orderNotes}"</span>
                  </div>
                )}
              </div>

              {/* Price Breakdown Footer */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrencyINR(subtotalPaise)}</span>
                </div>
                {useNexPoints && (
                  <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400">
                    <span>Loyalty NexPoints Discount</span>
                    <span className="font-mono font-semibold">- {formatCurrencyINR(pointsDiscountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Express Shipping</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {shippingPaise === 0 ? 'FREE' : formatCurrencyINR(shippingPaise)}
                  </span>
                </div>

                {paymentValidationError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{paymentValidationError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={selectedMethod === 'wallet' && !hasSufficientWalletBalance}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer ${
                      selectedMethod === 'wallet'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                    } ${selectedMethod === 'wallet' && !hasSufficientWalletBalance ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {selectedMethod === 'wallet' ? (
                      <>
                        <Zap className="w-4 h-4 fill-white" />
                        <span>1-Tap Pay {formatCurrencyINR(effectivePayablePaise)}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pay {formatCurrencyINR(effectivePayablePaise)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
