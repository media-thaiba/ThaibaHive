/**
 * OCPP 1.6-J / 2.0.1 Gateway Adapter
 * Parses and validates EVSE charger protocol frames
 */

export interface OcppMessageFrame {
  messageTypeId: 2 | 3 | 4; // 2=CALL, 3=CALLRESULT, 4=CALLERROR
  uniqueId: string;
  action?: string;
  payload: any;
}

export interface OcppBootNotificationPayload {
  chargePointVendor: string;
  chargePointModel: string;
  chargePointSerialNumber?: string;
  firmwareVersion?: string;
  iccid?: string;
}

export interface OcppStartTransactionPayload {
  connectorId: number;
  idTag: string;
  meterStart: number; // Wh
  timestamp: string;
}

export interface OcppStopTransactionPayload {
  transactionId: number;
  idTag?: string;
  meterStop: number; // Wh
  timestamp: string;
  reason?: string;
}

export interface OcppMeterValuesPayload {
  connectorId: number;
  transactionId?: number;
  meterValue: Array<{
    timestamp: string;
    sampledValue: Array<{
      value: string;
      measurand?: 'Energy.Active.Import.Register' | 'Power.Active.Import' | 'Current.Import' | 'Voltage' | 'SoC';
      unit?: 'Wh' | 'kWh' | 'W' | 'kW' | 'A' | 'V' | 'Percent';
    }>;
  }>;
}

export class OcppGatewayAdapter {
  /**
   * Parse incoming raw JSON WebSocket message from EVSE
   */
  public static parseRawMessage(rawJson: string): OcppMessageFrame | null {
    try {
      const arr = JSON.parse(rawJson);
      if (!Array.isArray(arr) || arr.length < 3) return null;

      const messageTypeId = arr[0];
      const uniqueId = arr[1];

      if (messageTypeId === 2) {
        // CALL: [2, uniqueId, action, payload]
        return {
          messageTypeId: 2,
          uniqueId,
          action: arr[2],
          payload: arr[3] || {},
        };
      } else if (messageTypeId === 3) {
        // CALLRESULT: [3, uniqueId, payload]
        return {
          messageTypeId: 3,
          uniqueId,
          payload: arr[2] || {},
        };
      } else if (messageTypeId === 4) {
        // CALLERROR: [4, uniqueId, errorCode, errorDescription, errorDetails]
        return {
          messageTypeId: 4,
          uniqueId,
          payload: { errorCode: arr[2], errorDescription: arr[3], errorDetails: arr[4] },
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Format standard OCPP CallResult response
   */
  public static formatCallResult(uniqueId: string, payload: any): string {
    return JSON.stringify([3, uniqueId, payload]);
  }

  /**
   * Format standard OCPP Call request
   */
  public static formatCall(uniqueId: string, action: string, payload: any): string {
    return JSON.stringify([2, uniqueId, action, payload]);
  }

  /**
   * Extract power (kW), energy (kWh), and SoC (%) from OCPP MeterValues payload
   */
  public static extractMeterValues(payload: OcppMeterValuesPayload): {
    powerKw: number;
    energyKwh: number;
    socPercent?: number;
    voltageV?: number;
    currentA?: number;
  } {
    let powerKw = 0;
    let energyKwh = 0;
    let socPercent: number | undefined;
    let voltageV: number | undefined;
    let currentA: number | undefined;

    for (const mv of payload.meterValue || []) {
      for (const sample of mv.sampledValue || []) {
        const val = parseFloat(sample.value);
        if (isNaN(val)) continue;

        if (sample.measurand === 'Power.Active.Import' || sample.unit === 'W' || sample.unit === 'kW') {
          powerKw = sample.unit === 'W' ? val / 1000 : val;
        } else if (sample.measurand === 'Energy.Active.Import.Register' || sample.unit === 'Wh' || sample.unit === 'kWh') {
          energyKwh = sample.unit === 'Wh' ? val / 1000 : val;
        } else if (sample.measurand === 'SoC' || sample.unit === 'Percent') {
          socPercent = val;
        } else if (sample.measurand === 'Voltage' || sample.unit === 'V') {
          voltageV = val;
        } else if (sample.measurand === 'Current.Import' || sample.unit === 'A') {
          currentA = val;
        }
      }
    }

    return {
      powerKw: Number(powerKw.toFixed(2)),
      energyKwh: Number(energyKwh.toFixed(2)),
      socPercent,
      voltageV,
      currentA,
    };
  }
}
