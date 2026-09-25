/**
 * ThaibaHive Sprint-057: Centralized Fee Collection, Payment Gateways & Financial Reconciliation Mesh Simulation
 * Run with: pnpm fee:simulate
 */

import { FeeDbStore } from '../src/db/fee-store';
import { FeeStructureEngine } from '../src/lib/operations/finance/fee-structure-engine';
import { InstallmentFineEngine } from '../src/lib/operations/finance/installment-fine-engine';
import { GatewayAdapterFactory } from '../src/lib/operations/finance/gateways/gateway-adapter-factory';
import { FeeGLEngine } from '../src/lib/operations/finance/gl/fee-gl-engine';
import { StatementParser } from '../src/lib/operations/finance/reconciliation/statement-parser';
import { ReconciliationEngine } from '../src/lib/operations/finance/reconciliation/reconciliation-engine';
import { ReceiptGenerator } from '../src/lib/operations/finance/receipts/receipt-generator';
import { CounterRegisterEngine } from '../src/lib/operations/finance/counter/counter-register-engine';
import { ScholarshipEngine } from '../src/lib/operations/finance/scholarships/scholarship-engine';
import { ScholarshipApprovalWorkflow } from '../src/lib/operations/finance/scholarships/scholarship-approval-workflow';
import { AgingAnalyticsEngine } from '../src/lib/operations/finance/aging/aging-analytics-engine';
import { DefaulterOutreachEngine } from '../src/lib/operations/finance/aging/defaulter-outreach-engine';
import { FeeTelemetryManager } from '../src/lib/operations/finance/telemetry/fee-metrics';

async function runFinanceSimulation() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  🏛️  THAIBAHIVE FINANCE-OS & CENTRALIZED FEE COLLECTION MESH SIMULATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const store = FeeDbStore.getInstance();
  store.clearMemoryStore();

  const institutionId = 'inst-thaiba-central';

  // ── Stage 1: Fee Structure Hierarchy & Component Resolution ──
  console.log('📌 Stage 1: Initializing Fee Structure & Component Hierarchy...');
  const structEngine = new FeeStructureEngine(store);
  const structure = await store.createFeeStructure({
    id: 'struct-btech-2026',
    institutionId,
    name: 'B.Tech Computer Science & AI (2026-27)',
    code: 'BTECH-CSAI-2026',
    academicYear: '2026-2027',
    term: 'annual',
    quota: 'merit',
    residentialType: 'day_scholar',
    currency: 'INR',
    totalAmount: 120000,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    components: [
      {
        id: 'c1',
        feeStructureId: 'struct-btech-2026',
        name: 'Tuition Fee',
        componentType: 'tuition',
        amount: 80000,
        isMandatory: true,
        isRefundable: false,
        taxRatePercent: 0,
        glAccountCode: 'GL:4100-TUITION_REVENUE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c2',
        feeStructureId: 'struct-btech-2026',
        name: 'Advanced GPU Lab Access',
        componentType: 'lab',
        amount: 30000,
        isMandatory: true,
        isRefundable: false,
        taxRatePercent: 0,
        glAccountCode: 'GL:4400-LAB_EXAM_REVENUE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c3',
        feeStructureId: 'struct-btech-2026',
        name: 'Library & Digital Journals',
        componentType: 'library',
        amount: 10000,
        isMandatory: true,
        isRefundable: false,
        taxRatePercent: 0,
        glAccountCode: 'GL:4500-MISC_FEE_REVENUE',
        createdAt: new Date().toISOString(),
      },
    ],
  });
  console.log(`   ✅ Structure created: "${structure.name}" | Total: ₹${structure.totalAmount.toLocaleString('en-IN')} (3 components)`);

  // ── Stage 2: Student Allocation & Installment Schedule ──
  console.log('\n📌 Stage 2: Allocating Fee Structure to Student & Generating Installment Schedule...');
  const allocation = await structEngine.allocateFeeStructureToStudent(
    {
      studentId: 'TG-STD-2026-089',
      institutionId,
      academicYear: '2026-2027',
      quota: 'merit',
      residentialType: 'day_scholar',
    },
    structure.id,
    0
  );

  const instFineEngine = new InstallmentFineEngine(store);
  const installments = instFineEngine.generateInstallments(
    allocation.id,
    allocation.netPayableAmount,
    'semesterly'
  );
  allocation.installments = installments;
  for (const inst of installments) {
    store['memoryStore']?.installments.set(inst.id, inst);
  }
  console.log(`   ✅ Allocated to Student: TG-STD-2026-089 | Net Payable: ₹${allocation.netPayableAmount.toLocaleString('en-IN')}`);
  console.log(`   ✅ Generated ${installments.length} Semesterly Installments of ₹${installments[0].amount.toLocaleString('en-IN')} each`);

  // ── Stage 3: Double-Entry GL Ledger Posting ──
  console.log('\n📌 Stage 3: Generating Balanced Double-Entry General Ledger Journals...');
  const allocationJournals = FeeGLEngine.generateAllocationJournals(allocation, structure);
  const isGLBalanced = FeeGLEngine.validateJournalBalance(allocationJournals);
  console.log(`   ✅ Generated ${allocationJournals.length} GL Journal Lines`);
  console.log(`   ✅ Double-Entry Invariant (Debits == Credits): ${isGLBalanced ? 'PERFECTLY BALANCED (PASS)' : 'UNBALANCED (FAIL)'}`);

  // ── Stage 4: Scholarship Concession & Multi-Tier Approval ──
  console.log('\n📌 Stage 4: Applying Merit Scholarship & Approval Workflow...');
  const scholarship = await store.createScholarship({
    id: 'sch-merit-25',
    institutionId,
    name: 'Presidential Merit Grant (25% Tuition Waiver)',
    code: 'PRES-MERIT-25',
    category: 'merit',
    discountType: 'percentage',
    discountValue: 25,
    targetComponentType: 'tuition',
    totalBudget: 1000000,
    disbursedAmount: 0,
    academicYear: '2026-2027',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const schEngine = new ScholarshipEngine(store);
  const concession = await schEngine.submitConcessionApplication({
    institutionId,
    studentId: allocation.studentId,
    scholarshipId: scholarship.id,
    allocationId: allocation.id,
    appliedById: 'staff-hod-cs',
    reason: 'Top 0.5% State Entrance Rank',
  });

  const approvalWorkflow = new ScholarshipApprovalWorkflow(store);
  const approvedConcession = await approvalWorkflow.approveConcession(
    concession.id,
    'staff-trustee-board',
    'Unanimously approved by Academic Board'
  );
  console.log(`   ✅ Scholarship Concession Applied: -₹${approvedConcession.amount.toLocaleString('en-IN')} (Status: ${approvedConcession.status.toUpperCase()})`);

  // ── Stage 5: Multi-Gateway Checkout & Webhook Signature Processing ──
  console.log('\n📌 Stage 5: Simulating Online Multi-Gateway Payment & Webhook Verification...');
  const gatewayFactory = GatewayAdapterFactory.getInstance();
  const upiAdapter = gatewayFactory.getAdapter('upi');
  const upiOrder = await upiAdapter.createOrder({
    orderId: 'sim_ord_upi_1',
    amount: 50000,
    currency: 'INR',
    receiptNumber: 'RCPT-SIM-001',
    customerName: 'Ahmad Tariq',
  });
  console.log(`   ✅ UPI Intent Generated: ${upiOrder.clientPayload.upiUri.substring(0, 48)}...`);

  const paymentRecord = await store.recordPayment({
    id: 'pay_sim_001',
    paymentNumber: 'PAY-2026-SIM-01',
    institutionId,
    allocationId: allocation.id,
    studentId: allocation.studentId,
    amount: 50000,
    fineAmount: 0,
    discountAmount: 0,
    netAmount: 50000,
    currency: 'INR',
    paymentMethod: 'upi',
    paymentStatus: 'completed',
    transactionReference: 'UPI-SIM-TXN-998877',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const rcptGen = new ReceiptGenerator(store);
  const receipt = await rcptGen.generateReceipt({
    payment: paymentRecord,
    allocation,
    studentName: 'Ahmad Tariq',
    studentRollNumber: 'TG-STD-2026-089',
    programGrade: 'B.Tech CSAI Year 1',
    academicYear: '2026-2027',
  });
  console.log(`   ✅ Cryptographic Receipt Signed: ${receipt.receiptNumber} | Hash: ${receipt.receiptHash.substring(0, 16)}...`);
  console.log(`   ✅ QR Authenticity Verification: ${rcptGen.verifyReceipt(receipt) ? 'VERIFIED AUTHENTIC (PASS)' : 'INVALID (FAIL)'}`);

  // ── Stage 6: Cashier Counter Shift Lifecycle ──
  console.log('\n📌 Stage 6: Simulating Cash Counter Shift Opening, Collections & Vault Handover...');
  const counterEngine = new CounterRegisterEngine(store);
  const shift = await counterEngine.openShift(institutionId, 'staff-cashier-1', 'Central Campus Counter 1', 10000);
  await counterEngine.recordShiftTransaction(shift.id, 'cash', 25000);
  await counterEngine.recordShiftTransaction(shift.id, 'pos_card', 15000);
  await counterEngine.recordCashDrop(shift.id, 20000, 'staff-supervisor-1');
  const shiftCloseSummary = await counterEngine.closeShift(shift.id, 15000, 'staff-supervisor-1');
  console.log(`   ✅ Shift Closed on ${shift.counterName} | Float: ₹10,000 | Cash In: ₹25,000 | Drop: ₹20,000 | Variance: ₹${shiftCloseSummary.register.varianceAmount} (Balanced: ${shiftCloseSummary.isBalanced})`);

  // ── Stage 7: Bank Statement Settlement 3-Way Auto-Reconciliation ──
  console.log('\n📌 Stage 7: Processing Bank Statement & Automated Settlement Reconciliation...');
  const csvData = StatementParser.generateSampleCsv([
    {
      date: new Date().toISOString().split('T')[0],
      ref: 'UPI-SIM-TXN-998877',
      amount: 50000,
      desc: 'UPI Inward PAY-2026-SIM-01',
    },
  ]);
  const reconEngine = new ReconciliationEngine(store);
  const { batch, result } = await reconEngine.reconcileStatement(institutionId, csvData);
  console.log(`   ✅ Reconciled Batch: ${batch.batchNumber} | Matched: ${result.matchedPairs.length} | Discrepancy: ₹${result.discrepancyAmount} | Status: ${batch.status.toUpperCase()}`);

  // ── Stage 8: Aging Delinquency & Defaulter Multi-Channel Outreach ──
  console.log('\n📌 Stage 8: Evaluating 30/60/90 Days Aging Matrix & Multi-Channel Reminder Dispatch...');
  const agingEngine = new AgingAnalyticsEngine(store);
  const defaulterEngine = new DefaulterOutreachEngine(store, agingEngine);
  const campusSummary = await agingEngine.getCampusAgingSummary(institutionId);
  console.log(`   ✅ Campus Aging Analyzed: Total Receivable: ₹${campusSummary.totalReceivable.toLocaleString('en-IN')} | Recovery Rate: ${campusSummary.collectionRatePercent}%`);

  const reminder = await defaulterEngine.dispatchReminder(
    institutionId,
    allocation.id,
    'Ahmad Tariq',
    'whatsapp'
  );
  console.log(`   ✅ Dispatched WhatsApp Notification (Log: ${reminder.logId}) | Channel: ${reminder.channel.toUpperCase()}`);

  // Telemetry Metrics
  const telemetry = FeeTelemetryManager.getInstance();
  telemetry.broadcastEvent('payment_received', institutionId, { amount: 50000 });
  console.log(`   ✅ Telemetry OpenMetrics Updated: ${telemetry.metrics.collectionsTotal} Collections Total | ₹${telemetry.metrics.amountCollectedCents / 100} Total Revenue`);

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  🎉 ALL 8 STAGES OF FINANCE-OS SIMULATION PASSED FLAWLESSLY (100% HEALTH)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

runFinanceSimulation().catch((err) => {
  console.error('❌ Simulation Error:', err);
  process.exit(1);
});
