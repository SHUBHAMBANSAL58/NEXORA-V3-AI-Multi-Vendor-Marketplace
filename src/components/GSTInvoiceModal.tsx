import React, { useState, useEffect } from 'react';
import { X, Printer, Download, ShieldCheck, FileText, Gift, Eye, EyeOff } from 'lucide-react';
import { UserOrder, UserProfile } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { getIndianStateCode, getProductHsnCode } from '../utils/commerceFeatures.js';
import { PRODUCTS_CATALOG } from '../data/productsCatalog.js';

import { exportSingleOrderInvoicePdf } from '../utils/pdfInvoiceExporter.js';

interface GSTInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: UserOrder | null;
  user: UserProfile;
}

export const GSTInvoiceModal: React.FC<GSTInvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  user,
}) => {
  const [isMasked, setIsMasked] = useState<boolean>(order?.isGiftReceipt || false);

  useEffect(() => {
    setIsMasked(order?.isGiftReceipt || false);
  }, [order?.id, order?.isGiftReceipt]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
  const billingAddr = order.deliveryAddress || defaultAddr;

  // Financials in paise: total includes 18% GST
  const totalPaise = order.totalPaise;
  const taxablePaise = Math.round(totalPaise / 1.18);
  const gstPaise = totalPaise - taxablePaise;
  const cgstPaise = Math.round(gstPaise / 2);
  const sgstPaise = gstPaise - cgstPaise;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    exportSingleOrderInvoicePdf(user, order, { isGiftReceipt: isMasked });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`GST Tax Invoice for ${order.id}`}
        className="relative w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar (hidden on print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            {isMasked ? (
              <>
                <Gift className="w-4 h-4 text-purple-600" />
                <span className="text-purple-900">Official Gift Receipt & Packing Slip (Prices Masked)</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-cyan-600" />
                <span>Tax Invoice / Bill of Supply (GST Compliant)</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsMasked(!isMasked)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isMasked ? 'Reveal standard commercial prices' : 'Mask prices for gift recipient'}
            >
              {isMasked ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Show Commercial Prices</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-purple-600" />
                  <span>Mask as Gift Receipt</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice modal"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="flex-1 overflow-y-auto p-8 font-sans text-xs space-y-6 bg-white">
          {/* Gift Message Banner if present */}
          {order.giftMessage && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 flex items-start gap-3 text-purple-900">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-600 shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-xs uppercase tracking-wider text-purple-700">
                  Special Gift Presentation Note
                </p>
                <p className="text-xs text-purple-950 font-medium italic">
                  "{order.giftMessage}"
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900">
                NEXORA <span className="text-cyan-600 text-sm font-normal">COMMERCE</span>
              </div>
              <p className="font-semibold text-slate-700 mt-1">
                NEXORA HyperCommerce India Pvt Ltd
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Regal Building, Sansad Marg, Connaught Place<br />
                New Delhi, Delhi — 110001, India<br />
                <strong>GSTIN:</strong> 07AABCN8942K1Z9 · <strong>State Code:</strong> 07 (Delhi)
              </p>
            </div>

            <div className="text-right">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  isMasked
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                {isMasked ? 'GIFT RECEIPT · PRICES MASKED' : 'ORIGINAL FOR RECIPIENT'}
              </span>
              <p className="text-sm font-bold font-mono text-slate-900 mt-2">
                INVOICE #{order.id.replace('NEX-ORD', 'INV-2026')}
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Date: <strong className="text-slate-900">{order.date}</strong>
              </p>
              <p className="text-slate-600 text-[11px]">
                Order Ref: <strong className="font-mono text-slate-900">{order.id}</strong>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Columns */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Billed To &amp; Shipped To:
              </p>
              <p className="font-bold text-slate-900 text-xs">
                {billingAddr?.name || user.name}
              </p>
              <p className="text-slate-700 text-[11px] mt-0.5 leading-relaxed">
                {billingAddr?.street || '42, Barakhamba Road, Connaught Place'}<br />
                {billingAddr?.city || 'New Delhi'}, {billingAddr?.state || 'Delhi'} —{' '}
                <span className="font-mono font-semibold">{billingAddr?.pinCode || '110001'}</span>
              </p>
              <p className="text-slate-600 text-[11px] mt-1">
                Phone: {billingAddr?.phone || user.phone || '+91 98765 43210'} · Email: {user.email}
              </p>
            </div>

            <div className="border-l border-slate-200 pl-6 space-y-1 text-[11px] text-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Dispatch &amp; Payment Details:
              </p>
              <p>
                <strong>Courier Partner:</strong> {order.courierPartner || 'BlueDart Express Air'}
              </p>
              <p>
                <strong>AWB / Tracking Number:</strong>{' '}
                <span className="font-mono">{order.trackingNumber || 'BLD-84920481'}</span>
              </p>
              <p>
                <strong>Payment Mode:</strong> {isMasked ? 'Prepaid (Masked)' : order.paymentMethod}
              </p>
              <p>
                <strong>Place of Supply:</strong> {getIndianStateCode(billingAddr?.state)}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="p-3">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">HSN / SAC</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">GST Rate</th>
                  <th className="p-3 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {order.items.map((item, idx) => {
                  const catalogMatch = PRODUCTS_CATALOG.find(
                    (p) => p.title.trim().toLowerCase() === item.title.trim().toLowerCase()
                  );
                  const hsn = getProductHsnCode(catalogMatch?.categorySlug);
                  return (
                    <tr key={idx}>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-900">{item.title}</td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">{hsn}</td>
                      <td className="p-3 text-right font-mono">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">
                        {isMasked ? (
                          <span className="text-purple-700 font-semibold">[GIFT]</span>
                        ) : (
                          formatCurrencyINR(Math.round(item.pricePaise / 1.18))
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {isMasked ? '—' : '18%'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {isMasked ? (
                          <span className="text-purple-600 font-semibold">•••• [MASKED]</span>
                        ) : (
                          formatCurrencyINR(item.pricePaise * item.quantity)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Totals */}
          <div className="flex justify-end">
            {isMasked ? (
              <div className="w-96 p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Gift className="w-4 h-4 text-purple-600" />
                  <span>Sender Price Protection Active</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Price information has been concealed on this delivery voucher at the sender's request. For official manufacturer warranty registration, retain Order Ref <strong>{order.id}</strong>.
                </p>
              </div>
            ) : (
              <div className="w-72 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total Taxable Value:</span>
                  <span className="font-mono font-medium">{formatCurrencyINR(taxablePaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Central GST (CGST @ 9%):</span>
                  <span className="font-mono font-medium">{formatCurrencyINR(cgstPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>State GST (SGST @ 9%):</span>
                  <span className="font-mono font-medium">{formatCurrencyINR(sgstPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping & Freight:</span>
                  <span className="font-mono font-medium">FREE</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                  <span>Total Amount (Inclusive GST):</span>
                  <span className="font-mono text-cyan-600">{formatCurrencyINR(totalPaise)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Declaration and Digital Signature */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Declaration:</p>
              <p className="max-w-md">
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct under the Central Goods and Services Tax Act, 2017.
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-emerald-700 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Verified & Signed</span>
              </div>
              <p className="text-[10px] text-slate-600">For NEXORA HyperCommerce India Pvt Ltd</p>
              <p className="text-[10px] font-mono text-slate-600">Auth Signature Ref: #NX-DS-94021</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
