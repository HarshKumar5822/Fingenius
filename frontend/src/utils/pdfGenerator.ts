import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface PDFReportData {
  userName: string;
  userEmail: string;
  monthYear: string;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  moneyScore: number;
  healthLabel: string;
  needsSpent: number;
  needsTarget: number;
  wantsSpent: number;
  wantsTarget: number;
  savingsSpent: number;
  savingsTarget: number;
  investments: Array<{ name: string; type: string; currentValue: number }>;
  goals: Array<{ title: string; currentAmount: number; targetAmount: number }>;
  topExpenses: Array<{ description: string; category: string; amount: number; date: string }>;
}

export const generateFinancialPDFReport = (data: PDFReportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formatCurrency = (amount: number) => {
    return 'Rs. ' + amount.toLocaleString('en-IN');
  };

  // --- BRAND HEADER ---
  // Dark Indigo Banner Header
  doc.setFillColor(30, 27, 75); // Indigo 950
  doc.rect(0, 0, 210, 38, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FinGenius', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(199, 210, 254); // Indigo 200
  doc.text('MONTHLY FINANCIAL PERFORMANCE STATEMENT', 14, 26);

  // Date Right Stamp
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, h:mm a')}`, 196, 18, { align: 'right' });
  doc.text(`Period: ${data.monthYear}`, 196, 25, { align: 'right' });

  let startY = 45;

  // --- USER PROFILE STAMP ---
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(14, startY, 182, 18, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Account Holder: ${data.userName}`, 18, startY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Email: ${data.userEmail}`, 18, startY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(`Financial Health: ${data.healthLabel} (${data.moneyScore}/100)`, 190, startY + 11, { align: 'right' });

  startY += 26;

  // --- SECTION 1: EXECUTIVE CASH FLOW SUMMARY ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Executive Cash Flow & Balance Summary', 14, startY);

  startY += 4;

  autoTable(doc, {
    startY,
    head: [['Financial Metric', 'Amount', 'Status / Allocation']],
    body: [
      ['Recorded Monthly Income', formatCurrency(data.income), '100% Inflow Benchmark'],
      ['Total Monthly Expenses', formatCurrency(data.expenses), `${data.income > 0 ? Math.round((data.expenses / data.income) * 100) : 0}% Outflow`],
      ['Net Monthly Savings Balance', formatCurrency(data.balance), data.balance >= 0 ? 'Surplus (+)' : 'Deficit (-)'],
      ['Net Monthly Savings Rate', `${data.savingsRate}%`, data.savingsRate >= 20 ? 'Optimal (>= 20%)' : 'Needs Improvement'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 50 },
      2: { cellWidth: 62 },
    },
  });

  startY = (doc as any).lastAutoTable.finalY + 10;

  // --- SECTION 2: 50/30/20 BUDGET RULE BREAKDOWN ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. 50/30/20 Budget Allocation Breakdown', 14, startY);

  startY += 4;

  autoTable(doc, {
    startY,
    head: [['Budget Bucket', 'Target Ratio', 'Target Limit', 'Actual Spent/Saved', 'Adherence']],
    body: [
      ['Needs (Essential Living)', '50%', formatCurrency(data.needsTarget), formatCurrency(data.needsSpent), data.needsSpent <= data.needsTarget ? 'Within Target' : 'Overbudget'],
      ['Wants (Lifestyle & Shauk)', '30%', formatCurrency(data.wantsTarget), formatCurrency(data.wantsSpent), data.wantsSpent <= data.wantsTarget ? 'Within Target' : 'Overbudget'],
      ['Savings & Wealth Building', '20%', formatCurrency(data.savingsTarget), formatCurrency(data.savingsSpent), data.savingsSpent >= data.savingsTarget ? 'Target Achieved' : 'Shortfall'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  startY = (doc as any).lastAutoTable.finalY + 10;

  // --- SECTION 3: ASSETS & GOALS SUMMARY ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('3. Wealth Investments & Savings Goals', 14, startY);

  startY += 4;

  const invRows = data.investments.length > 0
    ? data.investments.map((inv) => [inv.name, inv.type.toUpperCase().replace('_', ' '), formatCurrency(inv.currentValue)])
    : [['No active investments registered.', '-', '-']];

  autoTable(doc, {
    startY,
    head: [['Investment Asset Name', 'Asset Type', 'Current Valuation']],
    body: invRows,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 },
  });

  startY = (doc as any).lastAutoTable.finalY + 10;

  // --- SECTION 4: TOP EXPENSES TABLE ---
  if (data.topExpenses && data.topExpenses.length > 0) {
    if (startY > 240) {
      doc.addPage();
      startY = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('4. Recent Top Transactions & Outflows', 14, startY);

    startY += 4;

    const expRows = data.topExpenses.map((t) => [
      t.description || 'Expense',
      t.category || 'General',
      formatCurrency(t.amount),
      t.date ? format(new Date(t.date), 'dd MMM yyyy') : '-',
    ]);

    autoTable(doc, {
      startY,
      head: [['Description', 'Category', 'Amount', 'Date']],
      body: expRows,
      theme: 'plain',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
    });
  }

  // --- FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('FinGenius Financial Intelligence Engine - Verified Digital Copy', 14, 287);
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }

  // Download PDF
  const filename = `FinGenius_Report_${data.userName.replace(/\s+/g, '_')}_${format(new Date(), 'MMM_yyyy')}.pdf`;
  doc.save(filename);
};
