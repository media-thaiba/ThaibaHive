/**
 * Time of Use (TOU) Tariff Schedule Model
 */

export interface TouTier {
  name: 'peak' | 'shoulder' | 'off_peak' | 'super_off_peak';
  startHour: number; // 0..23
  endHour: number; // 0..24
  ratePerKwh: number;
}

export interface TariffRateStructure {
  tariffId: string;
  name: string;
  provider: string;
  currency: string;
  demandChargePerKwMonth: number;
  feedInTariffPerKwh: number;
  touTiers: TouTier[];
  weekendRatePerKwh?: number;
}

export class TimeOfUseSchedule {
  public static getDefaultCampusTariff(): TariffRateStructure {
    return {
      tariffId: 'tariff_campus_commercial_tou',
      name: 'Campus Time-Of-Use Commercial Rate',
      provider: 'Metro Electric Utility',
      currency: 'USD',
      demandChargePerKwMonth: 16.50, // $16.50 per peak kW
      feedInTariffPerKwh: 0.055, // $0.055 per exported kWh
      touTiers: [
        { name: 'off_peak', startHour: 0, endHour: 7, ratePerKwh: 0.075 },
        { name: 'shoulder', startHour: 7, endHour: 14, ratePerKwh: 0.160 },
        { name: 'peak', startHour: 14, endHour: 20, ratePerKwh: 0.320 },
        { name: 'shoulder', startHour: 20, endHour: 23, ratePerKwh: 0.160 },
        { name: 'off_peak', startHour: 23, endHour: 24, ratePerKwh: 0.075 },
      ],
      weekendRatePerKwh: 0.090,
    };
  }

  /**
   * Get applicable rate for a specific hour of day and weekday/weekend
   */
  public static getRateForHour(
    hourOfDay: number,
    tariff: TariffRateStructure = this.getDefaultCampusTariff(),
    isWeekend: boolean = false
  ): { ratePerKwh: number; tierName: string } {
    if (isWeekend && tariff.weekendRatePerKwh !== undefined) {
      return { ratePerKwh: tariff.weekendRatePerKwh, tierName: 'weekend_off_peak' };
    }

    const hr = Math.floor(hourOfDay) % 24;
    for (const tier of tariff.touTiers) {
      if (hr >= tier.startHour && hr < tier.endHour) {
        return { ratePerKwh: tier.ratePerKwh, tierName: tier.name };
      }
    }

    // Default fallback
    return { ratePerKwh: 0.15, tierName: 'shoulder' };
  }
}
