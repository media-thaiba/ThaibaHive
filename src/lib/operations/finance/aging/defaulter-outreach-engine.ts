import { FeeDbStore } from '../../../../db/fee-store';
import { AgingAnalyticsEngine, StudentAgingAnalysis } from './aging-analytics-engine';
import {
  FeeDefaulterLogItem,
  OutreachChannel,
  DefaulterAction,
} from '../types';

export interface ReminderDispatchResult {
  logId: string;
  studentId: string;
  channel: OutreachChannel;
  actionTaken: DefaulterAction;
  messageText: string;
  paymentDeepLink: string;
  dispatchedAt: string;
}

export class DefaulterOutreachEngine {
  private store: FeeDbStore;
  private agingEngine: AgingAnalyticsEngine;

  constructor(store?: FeeDbStore, agingEngine?: AgingAnalyticsEngine) {
    this.store = store || FeeDbStore.getInstance();
    this.agingEngine = agingEngine || new AgingAnalyticsEngine(this.store);
  }

  /**
   * Constructs dynamic payment reminder messages tailored to overdue severity
   */
  public formatReminderMessage(
    studentName: string,
    amountDue: number,
    daysOverdue: number,
    dueDate: string,
    paymentLink: string
  ): { title: string; body: string } {
    if (daysOverdue <= 0) {
      return {
        title: 'Upcoming Fee Due Reminder',
        body: `Dear Parent/Student, a fee installment of ₹${amountDue.toLocaleString('en-IN')} for ${studentName} is due on ${dueDate}. Pay conveniently using the link: ${paymentLink}`,
      };
    }

    if (daysOverdue <= 30) {
      return {
        title: 'Fee Payment Overdue Notice',
        body: `Dear Parent, fee payment of ₹${amountDue.toLocaleString('en-IN')} for ${studentName} is overdue by ${daysOverdue} days. Please clear the balance to avoid late fines: ${paymentLink}`,
      };
    }

    if (daysOverdue <= 60) {
      return {
        title: 'Urgent Fee Clearance Warning',
        body: `URGENT: Fee payment of ₹${amountDue.toLocaleString('en-IN')} for ${studentName} is ${daysOverdue} days overdue. Clearance is required before term exam hall tickets are generated: ${paymentLink}`,
      };
    }

    return {
      title: 'Final Administrative Demand Notice',
      body: `FINAL NOTICE: Overdue balance of ₹${amountDue.toLocaleString('en-IN')} for ${studentName} (${daysOverdue} days overdue). Please contact the finance office immediately or pay online: ${paymentLink}`,
    };
  }

  /**
   * Dispatches a payment reminder via WhatsApp / SMS / Email
   */
  public async dispatchReminder(
    institutionId: string,
    allocationId: string,
    studentName: string,
    channel: OutreachChannel = 'whatsapp',
    asOfDateString?: string
  ): Promise<ReminderDispatchResult> {
    const allocation = await this.store.getAllocationById(allocationId, institutionId);
    if (!allocation) {
      throw new Error(`Allocation ${allocationId} not found`);
    }

    const aging = this.agingEngine.evaluateStudentAging(allocation, asOfDateString);
    const paymentLink = `https://portal.thaiba.edu/fees/pay?allocId=${allocation.id}&studentId=${allocation.studentId}`;
    const formatted = this.formatReminderMessage(
      studentName,
      allocation.balanceAmount,
      aging.daysOverdue,
      aging.oldestDueDate,
      paymentLink
    );

    let action: DefaulterAction = 'reminder_sent';
    if (aging.shouldBlockHallTicket) action = 'hall_ticket_blocked';
    if (aging.agingBucket === '90_plus') action = 'escalated_to_principal';

    const log: FeeDefaulterLogItem = {
      id: `def_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      institutionId,
      studentId: allocation.studentId,
      allocationId: allocation.id,
      agingDays: aging.daysOverdue,
      agingBucket: aging.agingBucket,
      overdueAmount: allocation.balanceAmount,
      riskScore: aging.riskScore,
      actionTaken: action,
      channel,
      dispatchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await this.store.logDefaulterAction(log);

    return {
      logId: log.id,
      studentId: allocation.studentId,
      channel,
      actionTaken: action,
      messageText: formatted.body,
      paymentDeepLink: paymentLink,
      dispatchedAt: log.dispatchedAt,
    };
  }
}
