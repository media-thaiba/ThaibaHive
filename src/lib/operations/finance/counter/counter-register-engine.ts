import crypto from 'crypto';
import { FeeDbStore } from '../../../../db/fee-store';
import {
  FeeCounterRegisterItem,
  PaymentMethod,
} from '../types';

export interface ShiftSummary {
  register: FeeCounterRegisterItem;
  expectedCashInDrawer: number;
  totalCollectedAllModes: number;
  paymentCount: number;
  isBalanced: boolean;
}

export class CounterRegisterEngine {
  private store: FeeDbStore;

  constructor(store?: FeeDbStore) {
    this.store = store || FeeDbStore.getInstance();
  }

  /**
   * Opens a new cashier shift drawer
   */
  public async openShift(
    institutionId: string,
    cashierId: string,
    counterName: string,
    openingFloat: number
  ): Promise<FeeCounterRegisterItem> {
    const existingOpen = await this.store.listCounterRegisters(institutionId, 'open');
    const cashierAlreadyOpen = existingOpen.find((r) => r.cashierId === cashierId);
    if (cashierAlreadyOpen) {
      throw new Error(`Cashier ${cashierId} already has an active open shift on counter ${cashierAlreadyOpen.counterName}`);
    }

    const register: FeeCounterRegisterItem = {
      id: `shift_${crypto.randomUUID()}`,
      institutionId,
      cashierId,
      counterName,
      openingFloat,
      closingCashDeclared: null,
      systemCashTotal: 0,
      systemPosTotal: 0,
      systemChequeTotal: 0,
      cashDropsTotal: 0,
      varianceAmount: 0,
      status: 'open',
      openedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.store.openCounterRegister(register);
    return register;
  }

  /**
   * Records a payment to the active cashier shift.
   * Totals are persisted immediately so they survive restarts and remain
   * consistent with the DB row used for close-variance reporting.
   *
   * A paymentId is required so the shift total is anchored to a real,
   * completed fee payment row — preventing manual inflation of shift
   * totals without a corresponding payment ledger entry.
   */
  public async recordShiftTransaction(
    shiftId: string,
    method: PaymentMethod,
    amount: number,
    paymentId: string,
    institutionId?: string
  ): Promise<FeeCounterRegisterItem> {
    const shift = await this.store.getCounterRegisterById(shiftId, institutionId);
    if (!shift || shift.status !== 'open') {
      throw new Error(`Shift ${shiftId} is not active or open`);
    }

    const payment = await this.store.getPaymentById(paymentId, institutionId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found — cannot record against shift`);
    }
    if (payment.paymentStatus !== 'completed') {
      throw new Error(`Payment ${paymentId} is not completed (status: ${payment.paymentStatus})`);
    }
    if (Math.round((payment.netAmount || payment.amount || 0) * 100) / 100 !== amount) {
      throw new Error(`Payment ${paymentId} amount does not match recorded shift amount`);
    }
    if (payment.counterRegisterId && payment.counterRegisterId !== shiftId) {
      throw new Error(`Payment ${paymentId} is already assigned to a different shift`);
    }

    if (method === 'cash') {
      shift.systemCashTotal += amount;
    } else if (method === 'pos_card') {
      shift.systemPosTotal += amount;
    } else if (method === 'cheque' || method === 'dd') {
      shift.systemChequeTotal += amount;
    }

    shift.updatedAt = new Date().toISOString();
    await this.store.updateCounterRegisterTotals(
      shift.id,
      {
        systemCashTotal: shift.systemCashTotal,
        systemPosTotal: shift.systemPosTotal,
        systemChequeTotal: shift.systemChequeTotal,
        cashDropsTotal: shift.cashDropsTotal,
        updatedAt: shift.updatedAt,
      },
      institutionId
    );
    return shift;
  }

  /**
   * Performs an intermediate cash drop (e.g. sending excess cash to campus vault)
   */
  public async recordCashDrop(
    shiftId: string,
    dropAmount: number,
    _authorizedSupervisorId: string,
    institutionId?: string
  ): Promise<FeeCounterRegisterItem> {
    const shift = await this.store.getCounterRegisterById(shiftId, institutionId);
    if (!shift || shift.status !== 'open') {
      throw new Error(`Shift ${shiftId} is not active or open`);
    }

    const currentCashInDrawer = shift.openingFloat + shift.systemCashTotal - shift.cashDropsTotal;
    if (dropAmount > currentCashInDrawer) {
      throw new Error(`Cash drop amount (₹${dropAmount}) exceeds current cash in drawer (₹${currentCashInDrawer})`);
    }

    shift.cashDropsTotal += dropAmount;
    shift.updatedAt = new Date().toISOString();
    await this.store.updateCounterRegisterTotals(
      shift.id,
      {
        systemCashTotal: shift.systemCashTotal,
        systemPosTotal: shift.systemPosTotal,
        systemChequeTotal: shift.systemChequeTotal,
        cashDropsTotal: shift.cashDropsTotal,
        updatedAt: shift.updatedAt,
      },
      institutionId
    );
    return shift;
  }

  /**
   * Closes the shift with cashier's declared physical cash count and calculates variance
   */
  public async closeShift(
    shiftId: string,
    closingCashDeclared: number,
    supervisorId?: string,
    supervisorNotes?: string,
    institutionId?: string
  ): Promise<ShiftSummary> {
    const shift = await this.store.getCounterRegisterById(shiftId, institutionId);
    if (!shift || shift.status !== 'open') {
      throw new Error(`Shift ${shiftId} is not active or open`);
    }

    const expectedCash = shift.openingFloat + shift.systemCashTotal - shift.cashDropsTotal;
    const variance = Math.round((closingCashDeclared - expectedCash) * 100) / 100;

    const closed = await this.store.closeCounterRegister(
      shiftId,
      closingCashDeclared,
      supervisorId,
      supervisorNotes,
      institutionId
    );
    if (!closed) {
      throw new Error(`Shift ${shiftId} is not active or open`);
    }

    const totalAll = shift.systemCashTotal + shift.systemPosTotal + shift.systemChequeTotal;
    const paymentCount = await this.store.countShiftTransactions(shiftId, institutionId);

    return {
      register: closed,
      expectedCashInDrawer: expectedCash,
      totalCollectedAllModes: totalAll,
      paymentCount,
      isBalanced: variance === 0,
    };
  }
}
