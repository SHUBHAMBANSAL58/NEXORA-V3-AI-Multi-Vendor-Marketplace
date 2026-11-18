import { jsPDF } from 'jspdf';
import { UserOrder, UserProfile } from '../types/index.js';
import {
  calculatePurchaseHistorySummary,
  getIndianStateCode,
  getProductHsnCode,
} from './commerceFeatures.js';
import { PRODUCTS_CATALOG } from '../data/productsCatalog.js';

export interface NormalizedPdfOrderItem {
  title: string;
  hsnCode: string;
  gstRateLabel: string;
  quantity: number;
  unitPriceFormatted: string;
  taxableFormatted: string;
  cgstFormatted: string;
  sgstFormatted: string;
  gstFormatted: string;
  lineTotalFormatted: string;
}

export interface NormalizedPdfOrder {
  id: string;
  invoiceNumber: string;
  date: string;
  status: string;
  trackingStage: string;
  courierPartner: string;
  trackingNumber: string;
  paymentMethod: string;
  placeOfSupply: string;
  isGiftReceipt: boolean;
  taxableFormatted: string;
  cgstFormatted: string;
  sgstFormatted: string;
  gstFormatted: string;
  totalFormatted: string;
  items: NormalizedPdfOrderItem[];
}

export interface PdfOrderHistoryDocumentData {
  generatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddressLine: string;
  gstin: string;
  totalOrders: number;
  totalItems: number;
  totalSpentPaise: number;
  totalTaxablePaise: number;
  totalGstPaise: number;
  totalSpentFormatted: string;
  totalTaxableFormatted: string;
  totalGstFormatted: string;
  orders: NormalizedPdfOrder[];
}

/**
 * Resolves the Indian HSN code for a purchased line item using catalog metadata and category keyword fallback.
 */
export function resolveOrderItemHsnCode(item: {
  title: string;
  hsnCode?: string;
}): string {
  if (item.hsnCode && /^[0-9]{4,8}$/.test(item.hsnCode.trim())) {
    return item.hsnCode.trim();
  }

  const normalizedTitle = (item.title || '').trim().toLowerCase();
  const exactMatch = PRODUCTS_CATALOG.find(
    (p) => p.title.trim().toLowerCase() === normalizedTitle
  );
  if (exactMatch) {
    return getProductHsnCode(exactMatch.categorySlug);
  }

  const partialMatch = PRODUCTS_CATALOG.find(
    (p) =>
      normalizedTitle.includes(p.title.trim().toLowerCase()) ||
      p.title.trim().toLowerCase().includes(normalizedTitle)
  );
  if (partialMatch) {
    return getProductHsnCode(partialMatch.categorySlug);
  }

  if (/keyboard|keycap|mouse|trackpad|switch/.test(normalizedTitle)) {
    return getProductHsnCode('keyboards');
  }
  if (/phone|smartphone|tablet|ipad|mobile|5g|camera|drone|vr/.test(normalizedTitle)) {
    return getProductHsnCode('smartphones');
  }
  if (/watch|chronograph|timepiece|wearable/.test(normalizedTitle)) {
    return getProductHsnCode('timepieces');
  }
  if (/desk|chair|lightbar|stand|lamp|monitor|shelf|pad/.test(normalizedTitle)) {
    return getProductHsnCode('workspace');
  }
  if (/charger|gan|adapter|cable|hub|dock|powerbank/.test(normalizedTitle)) {
    return getProductHsnCode('accessories');
  }
  return getProductHsnCode('audio');
}

/**
 * Formats paise as ASCII-safe Indian Rupee string for standard PDF fonts (e.g. "Rs. 34,999.00").
 * Standard PDF Helvetica lacks the Unicode U+20B9 Rupee glyph, so using "Rs." avoids garbled characters.
 */
export function formatPdfCurrencyINR(paise: number): string {
  const rupees = Math.round(paise) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `Rs. ${formatted}`;
}

export function buildPdfOrderHistoryDocumentData(
  user: UserProfile,
  orders: UserOrder[] = user.orders,
  generatedDate: Date = new Date()
): PdfOrderHistoryDocumentData {
  const defaultAddr =
    user.addresses.find((a) => a.isDefault) || user.addresses[0];
  const orderAddr =
    orders.length === 1 && orders[0]?.deliveryAddress ? orders[0].deliveryAddress : defaultAddr;

  const billingAddressLine = orderAddr
    ? `${orderAddr.street}, ${orderAddr.city}, ${orderAddr.state} - ${orderAddr.pinCode}`
    : 'Connaught Place, New Delhi, Delhi - 110001';

  const summary = calculatePurchaseHistorySummary(orders);
  const totalTaxablePaise = Math.round(summary.totalSpentPaise / 1.18);
  const totalGstPaise = Math.max(0, summary.totalSpentPaise - totalTaxablePaise);

  const normalizedOrders: NormalizedPdfOrder[] = orders.map((order) => {
    const isMasked = Boolean(order.isGiftReceipt);
    const totalPaise = order.totalPaise;
    const taxablePaise = Math.round(totalPaise / 1.18);
    const gstPaise = Math.max(0, totalPaise - taxablePaise);
    const cgstPaise = Math.round(gstPaise / 2);
    const sgstPaise = gstPaise - cgstPaise;
    const supplyAddr = order.deliveryAddress || defaultAddr;

    return {
      id: order.id,
      invoiceNumber: order.id.replace('NEX-ORD', 'INV-2026'),
      date: order.date,
      status: order.status,
      trackingStage: order.trackingStage || order.status,
      courierPartner: order.courierPartner || 'BlueDart Express',
      trackingNumber: order.trackingNumber || 'BLD-PENDING',
      paymentMethod: isMasked ? 'Prepaid (Gift Masked)' : order.paymentMethod,
      placeOfSupply: getIndianStateCode(supplyAddr?.state),
      isGiftReceipt: isMasked,
      taxableFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(taxablePaise),
      cgstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(cgstPaise),
      sgstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(sgstPaise),
      gstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(gstPaise),
      totalFormatted: isMasked ? '[GIFT MASKED]' : formatPdfCurrencyINR(totalPaise),
      items: order.items.map((item) => {
        const lineTotalPaise = Math.max(0, item.pricePaise * item.quantity);
        const itemTaxablePaise = Math.round(lineTotalPaise / 1.18);
        const itemGstPaise = Math.max(0, lineTotalPaise - itemTaxablePaise);
        const itemCgstPaise = Math.round(itemGstPaise / 2);
        const itemSgstPaise = itemGstPaise - itemCgstPaise;

        return {
          title: item.title,
          hsnCode: resolveOrderItemHsnCode(item),
          gstRateLabel: isMasked ? '-' : '18%',
          quantity: item.quantity,
          unitPriceFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(item.pricePaise),
          taxableFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(itemTaxablePaise),
          cgstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(itemCgstPaise),
          sgstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(itemSgstPaise),
          gstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(itemGstPaise),
          lineTotalFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(lineTotalPaise),
        };
      }),
    };
  });

  return {
    generatedAt: generatedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    customerName: user.name || 'NEXORA Customer',
    customerEmail: user.email,
    customerPhone: defaultAddr?.phone || user.phone || '+91 98765 43210',
    billingAddressLine,
    gstin: '07AABCN8942K1Z9',
    totalOrders: summary.orderCount,
    totalItems: summary.totalItemsPurchased,
    totalSpentPaise: summary.totalSpentPaise,
    totalTaxablePaise,
    totalGstPaise,
    totalSpentFormatted: formatPdfCurrencyINR(summary.totalSpentPaise),
    totalTaxableFormatted: formatPdfCurrencyINR(totalTaxablePaise),
    totalGstFormatted: formatPdfCurrencyINR(totalGstPaise),
    orders: normalizedOrders,
  };
}

/**
 * Generates and downloads a single or multi-page GST-compliant PDF tax invoice with HSN codes & GST breakup.
 */
export function exportOrderHistoryToPdf(
  user: UserProfile,
  orders: UserOrder[] = user.orders,
  customFilename?: string
): { filename: string; orderCount: number; pageCount: number } {
  const data = buildPdfOrderHistoryDocumentData(user, orders);
  const isSingleOrder = data.orders.length === 1;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  };

  // Top Brand Banner
  doc.setFillColor(12, 18, 30);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NEXORA V3', margin + 5, y + 9);
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NEXORA HyperCommerce India Pvt Ltd · GSTIN: ${data.gstin}`, margin + 5, y + 15);
  doc.text(
    isSingleOrder
      ? `Tax Invoice / Bill of Supply (${data.orders[0].invoiceNumber})`
      : 'Tax Invoice & Consolidated Order History Statement',
    margin + 5,
    y + 20
  );

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Issued: ${data.generatedAt}`, pageWidth - margin - 5, y + 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Orders: ${data.totalOrders} | Items: ${data.totalItems}`, pageWidth - margin - 5, y + 16, { align: 'right' });
  y += 30;

  // Customer Billing & Financial Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('BILLED TO / CUSTOMER DETAILS', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${data.customerName} (${data.customerEmail})`, margin + 4, y + 11);
  doc.text(`Phone: ${data.customerPhone}`, margin + 4, y + 16);
  const addressLines = doc.splitTextToSize(`Address: ${data.billingAddressLine}`, 102);
  doc.text(addressLines[0] || '', margin + 4, y + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isSingleOrder ? 'TAX INVOICE GST SUMMARY' : 'CONSOLIDATED PAYMENT SUMMARY', pageWidth - margin - 4, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Taxable Value: ${data.totalTaxableFormatted}`, pageWidth - margin - 4, y + 11, { align: 'right' });
  doc.text(`Total GST (18%): ${data.totalGstFormatted}`, pageWidth - margin - 4, y + 16, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 145, 178);
  doc.text(`Grand Total Paid: ${data.totalSpentFormatted}`, pageWidth - margin - 4, y + 21, { align: 'right' });
  y += 30;

  if (data.orders.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('No orders recorded for this account yet.', margin, y + 8);
  } else {
    data.orders.forEach((order, index) => {
      const estimatedHeight = 32 + order.items.length * 10;
      ensureSpace(estimatedHeight);

      // Order header strip
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 13, 1.5, 1.5, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${index + 1}. ${order.invoiceNumber} (${order.id})`, margin + 3, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Date: ${order.date} | Status: ${order.status} | Courier: ${order.courierPartner} (${order.trackingNumber})`,
        margin + 3,
        y + 10
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(order.totalFormatted, pageWidth - margin - 3, y + 6, { align: 'right' });
      y += 15;

      // Payment & GST breakup summary line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Payment: ${order.paymentMethod} | Supply: ${order.placeOfSupply}`,
        margin + 3,
        y + 3
      );
      y += 4.5;
      doc.text(
        `Order Tax Summary -> Taxable: ${order.taxableFormatted} | CGST (9%): ${order.cgstFormatted} | SGST (9%): ${order.sgstFormatted} | Total GST: ${order.gstFormatted}`,
        margin + 3,
        y + 3
      );
      y += 6.5;

      // Item-level lines with HSN code and per-item GST breakdown
      order.items.forEach((item) => {
        ensureSpace(11);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        const titleTruncated =
          item.title.length > 52 ? `${item.title.slice(0, 49)}...` : item.title;
        doc.text(`• ${titleTruncated}  [HSN: ${item.hsnCode}]  (Qty ${item.quantity})`, margin + 4, y + 3);
        doc.text(
          `${item.unitPriceFormatted} -> ${item.lineTotalFormatted}`,
          pageWidth - margin - 3,
          y + 3,
          { align: 'right' }
        );
        y += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.3);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `   GST (${item.gstRateLabel}): Taxable ${item.taxableFormatted} | CGST 9%: ${item.cgstFormatted} | SGST 9%: ${item.sgstFormatted} | Tax Total: ${item.gstFormatted}`,
          margin + 4,
          y + 2.8
        );
        y += 5.5;
      });

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
      y += 5;
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Computer-generated GST Tax Invoice · Digitally Signed by NEXORA HyperCommerce India Pvt Ltd (#NX-DS-94021)',
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  }

  const slugDate = new Date().toISOString().slice(0, 10);
  const filename =
    customFilename ||
    (isSingleOrder
      ? `NEXORA-Invoice-${data.orders[0].id}.pdf`
      : `NEXORA-Order-History-Invoice-${slugDate}.pdf`);
  doc.save(filename);

  return {
    filename,
    orderCount: data.orders.length,
    pageCount,
  };
}

/**
 * Exports a single order's GST Tax Invoice PDF including HSN codes & CGST/SGST breakup.
 */
export function exportSingleOrderInvoicePdf(
  user: UserProfile,
  order: UserOrder,
  options?: { isGiftReceipt?: boolean }
): { filename: string; orderCount: number; pageCount: number } {
  const effectiveOrder =
    options?.isGiftReceipt !== undefined
      ? { ...order, isGiftReceipt: options.isGiftReceipt }
      : order;

  return exportOrderHistoryToPdf(
    user,
    [effectiveOrder],
    `NEXORA-Invoice-${order.id}.pdf`
  );
}
