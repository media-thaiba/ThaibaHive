export interface ReceiptTemplateData {
  receiptNumber: string;
  receiptDate: string;
  institutionName: string;
  institutionAddress: string;
  studentName: string;
  studentRollNumber: string;
  programGrade: string;
  academicYear: string;
  paymentMethod: string;
  transactionReference: string;
  payerName?: string;
  items: Array<{
    name: string;
    amount: number;
    tax?: number;
    total: number;
  }>;
  grossAmount: number;
  fineAmount: number;
  discountAmount: number;
  netPaidAmount: number;
  amountInWords: string;
  balanceDueAmount: number;
  receiptHash: string;
  signature: string;
  qrSvg: string;
}

export function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (amount === 0) return 'Zero Rupees Only';

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      str += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  const integerPart = Math.floor(amount);
  let output = '';

  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundred = rem;

  if (crore > 0) output += convertGroup(crore) + ' Crore ';
  if (lakh > 0) output += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) output += convertGroup(thousand) + ' Thousand ';
  if (hundred > 0) output += convertGroup(hundred) + ' ';

  return (output.trim() || 'Zero') + ' Rupees Only';
}

export function renderReceiptHtml(data: ReceiptTemplateData): string {
  const rows = data.items
    .map(
      (item, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 500;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${item.amount.toLocaleString('en-IN')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${(item.tax || 0).toLocaleString('en-IN')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 600;">₹${item.total.toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fee Receipt - ${data.receiptNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; margin: 0; padding: 20px; background: #fff; }
    .receipt-box { max-width: 800px; margin: 0 auto; border: 1px solid #CBD5E1; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1E3A8A; padding-bottom: 16px; margin-bottom: 20px; }
    .inst-title { font-size: 22px; font-weight: 700; color: #1E3A8A; margin: 0; }
    .inst-sub { font-size: 12px; color: #64748B; margin-top: 4px; }
    .receipt-badge { background: #1E3A8A; color: #fff; padding: 6px 14px; border-radius: 4px; font-weight: 600; font-size: 14px; text-transform: uppercase; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 13px; }
    .meta-card { background: #F8FAFC; padding: 12px; border-radius: 6px; border: 1px solid #E2E8F0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-label { color: #64748B; font-weight: 500; }
    .meta-value { font-weight: 600; color: #0F172A; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #F1F5F9; color: #334155; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #CBD5E1; }
    .totals-box { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-table { width: 320px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand-total { font-size: 16px; font-weight: 700; color: #1E3A8A; border-top: 2px solid #1E3A8A; padding-top: 8px; margin-top: 4px; }
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 16px; margin-top: 20px; }
    .qr-container { width: 100px; height: 100px; }
    .crypto-stamp { font-size: 10px; color: #64748B; font-family: monospace; max-width: 450px; }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <div>
        <h1 class="inst-title">${data.institutionName}</h1>
        <div class="inst-sub">${data.institutionAddress}</div>
      </div>
      <div style="text-align: right;">
        <span class="receipt-badge">Official Fee Receipt</span>
        <div style="margin-top: 8px; font-size: 13px; font-weight: 600;">No: ${data.receiptNumber}</div>
        <div style="font-size: 12px; color: #64748B;">Date: ${data.receiptDate}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-value">${data.studentName}</span></div>
        <div class="meta-row"><span class="meta-label">Roll Number:</span><span class="meta-value">${data.studentRollNumber}</span></div>
        <div class="meta-row"><span class="meta-label">Program/Grade:</span><span class="meta-value">${data.programGrade}</span></div>
        <div class="meta-row"><span class="meta-label">Academic Year:</span><span class="meta-value">${data.academicYear}</span></div>
      </div>
      <div class="meta-card">
        <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-value" style="text-transform: uppercase;">${data.paymentMethod}</span></div>
        <div class="meta-row"><span class="meta-label">Transaction Ref:</span><span class="meta-value">${data.transactionReference}</span></div>
        <div class="meta-row"><span class="meta-label">Paid By:</span><span class="meta-value">${data.payerName || data.studentName}</span></div>
        <div class="meta-row"><span class="meta-label">Payment Status:</span><span class="meta-value" style="color: #059669;">CONFIRMED</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Fee Component Particulars</th>
          <th style="text-align: right;">Base Amount</th>
          <th style="text-align: right;">Tax</th>
          <th style="text-align: right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <div style="max-width: 400px; font-size: 12px; color: #334155;">
        <strong>Amount in Words:</strong><br>
        <em>${data.amountInWords}</em>
      </div>
      <div class="totals-table">
        <div class="totals-row"><span>Gross Subtotal:</span><span>₹${data.grossAmount.toLocaleString('en-IN')}</span></div>
        ${data.fineAmount > 0 ? `<div class="totals-row" style="color: #DC2626;"><span>Late Fine Paid:</span><span>+ ₹${data.fineAmount.toLocaleString('en-IN')}</span></div>` : ''}
        ${data.discountAmount > 0 ? `<div class="totals-row" style="color: #059669;"><span>Concession / Discount:</span><span>- ₹${data.discountAmount.toLocaleString('en-IN')}</span></div>` : ''}
        <div class="totals-row grand-total"><span>Total Net Paid:</span><span>₹${data.netPaidAmount.toLocaleString('en-IN')}</span></div>
        <div class="totals-row" style="font-size: 11px; color: #64748B; margin-top: 4px;"><span>Outstanding Balance:</span><span>₹${data.balanceDueAmount.toLocaleString('en-IN')}</span></div>
      </div>
    </div>

    <div class="footer">
      <div class="qr-container">
        ${data.qrSvg}
      </div>
      <div class="crypto-stamp">
        <div><strong>Cryptographic Receipt Signature (HMAC-SHA256):</strong></div>
        <div style="word-break: break-all; color: #475569;">${data.signature}</div>
        <div style="margin-top: 4px;"><strong>Document Hash:</strong> ${data.receiptHash}</div>
        <div style="margin-top: 2px; color: #059669;">Verified by ThaibaHive FinanceOS Cryptographic Mesh</div>
      </div>
      <div style="text-align: center; width: 140px;">
        <div style="border-bottom: 1px dashed #94A3B8; height: 36px; margin-bottom: 4px;"></div>
        <div style="font-size: 11px; color: #64748B; font-weight: 600;">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
