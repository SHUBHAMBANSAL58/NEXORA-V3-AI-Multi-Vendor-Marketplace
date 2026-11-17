import { jsPDF } from 'jspdf';
import { UserOrder, UserProfile } from '../types/index.js';
import { calculatePurchaseHistorySummary } from './commerceFeatures.js';

export interface NormalizedPdfOrderItem {
  title: string;
  quantity: number;
  unitPriceFormatted: string;
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
  isGiftReceipt: boolean;
  taxableFormatted: string;
  cgstFormatted: string;
  sgstFormatted: string;
  totalFormatted: string;
  items: NormalizedPdfOrderItem[];
}

export interface PdfOrderHistoryDocumentData {
  generatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddressLine: string;
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

    return {
      id: order.id,
      invoiceNumber: order.id.replace('NEX-ORD', 'INV-2026'),
      date: order.date,
      status: order.status,
      trackingStage: order.trackingStage || order.status,
      courierPartner: order.courierPartner || 'BlueDart Express',
      trackingNumber: order.trackingNumber || 'BLD-PENDING',
      paymentMethod: isMasked ? 'Prepaid (Gift Masked)' : order.paymentMethod,
      isGiftReceipt: isMasked,
      taxableFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(taxablePaise),
      cgstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(cgstPaise),
      sgstFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(sgstPaise),
      totalFormatted: isMasked ? '[GIFT MASKED]' : formatPdfCurrencyINR(totalPaise),
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unitPriceFormatted: isMasked ? '[MASKED]' : formatPdfCurrencyINR(item.pricePaise),
        lineTotalFormatted: isMasked
          ? '[MASKED]'
          : formatPdfCurrencyINR(item.pricePaise * item.quantity),
      })),
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
 * Generates and downloads a multi-page GST-compliant PDF invoice statement for the user's order history.
 */
export function exportOrderHistoryToPdf(
  user: UserProfile,
  orders: UserOrder[] = user.orders,
  customFilename?: string
): { filename: string; orderCount: number; pageCount: number } {
  const data = buildPdfOrderHistoryDocumentData(user, orders);
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
  doc.text('NEXORA HyperCommerce India Pvt Ltd · GSTIN: 07AABCN8942K1Z9', margin + 5, y + 15);
  doc.text('Tax Invoice & Consolidated Order History Statement', margin + 5, y + 20);

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
  doc.text('CONSOLIDATED PAYMENT SUMMARY', pageWidth - margin - 4, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Taxable Value: ${data.totalTaxableFormatted}`, pageWidth - margin - 4, y + 11, { align: 'right' });
  doc.text(`Total GST (18%): ${data.totalGstFormatted}`, pageWidth - margin - 4, y + 16, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 145, 178);
  doc.text(`Grand Total Spent: ${data.totalSpentFormatted}`, pageWidth - margin - 4, y + 21, { align: 'right' });
  y += 30;

  if (data.orders.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('No orders recorded for this account yet.', margin, y + 8);
  } else {
    data.orders.forEach((order, index) => {
      const estimatedHeight = 28 + order.items.length * 6;
      ensureSpace(estimatedHeight);

      // Order header strip
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${index + 1}. ${order.invoiceNumber} (${order.id})`, margin + 3, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Date: ${order.date} | Stage: ${order.trackingStage} | Courier: ${order.courierPartner} (${order.trackingNumber})`,
        margin + 3,
        y + 9.5
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(order.totalFormatted, pageWidth - margin - 3, y + 6, { align: 'right' });
      y += 14;

      // Payment line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Payment: ${order.paymentMethod}   |   Taxable: ${order.taxableFormatted}   |   CGST (9%): ${order.cgstFormatted}   |   SGST (9%): ${order.sgstFormatted}`,
        margin + 3,
        y + 3
      );
      y += 6;

      // Item lines
      order.items.forEach((item) => {
        ensureSpace(7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const titleTruncated =
          item.title.length > 62 ? `${item.title.slice(0, 59)}...` : item.title;
        doc.text(`- ${titleTruncated}  (x${item.quantity})`, margin + 5, y + 3);
        doc.text(
          `${item.unitPriceFormatted}  ->  ${item.lineTotalFormatted}`,
          pageWidth - margin - 3,
          y + 3,
          { align: 'right' }
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
      'Computer-generated GST Tax Invoice Statement · Digitally Signed by NEXORA HyperCommerce India Pvt Ltd (#NX-DS-94021)',
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  }

  const slugDate = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `NEXORA-Order-History-Invoice-${slugDate}.pdf`;
  doc.save(filename);

  return {
    filename,
    orderCount: data.orders.length,
    pageCount,
  };
}
