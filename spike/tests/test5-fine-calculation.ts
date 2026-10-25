import { calculateLateReturnFine, HostelSettings } from "../src/fines.js";

export function runTest5(): {
  totalCases: number;
  passedCases: number;
  allPassed: boolean;
  results: Array<{ name: string; passed: boolean; details: string }>;
} {
  const defaultSettings: HostelSettings = {
    lateFineRatePerDayMinor: 5000, // ₹50.00
    gracePeriodMinutes: 60,
    roundingRule: "ceil",
  };

  const expectedTime = "2026-10-25T10:00:00.000Z";

  const addMinutes = (baseIso: string, mins: number): string => {
    return new Date(new Date(baseIso).getTime() + mins * 60 * 1000).toISOString();
  };

  const cases = [
    {
      name: "Missing settings throws error",
      run: () => {
        try {
          calculateLateReturnFine(expectedTime, addMinutes(expectedTime, 120), null as any);
          return { passed: false, details: "Expected error for missing settings, but none thrown." };
        } catch (e: any) {
          const ok = e.message.includes("Hostel settings not configured");
          return { passed: ok, details: `Caught expected error: ${e.message}` };
        }
      },
    },
    {
      name: "On-time arrival (early by 10 mins) returns 0 fine",
      run: () => {
        const res = calculateLateReturnFine(expectedTime, addMinutes(expectedTime, -10), defaultSettings);
        const ok = res.daysLate === 0 && res.totalAmountMinor === 0;
        return { passed: ok, details: `daysLate=${res.daysLate}, amount=${res.totalAmountMinor}` };
      },
    },
    {
      name: "Late equals grace period (exactly 60 mins late) returns 0 fine",
      run: () => {
        const res = calculateLateReturnFine(expectedTime, addMinutes(expectedTime, 60), defaultSettings);
        const ok = res.daysLate === 0 && res.totalAmountMinor === 0;
        return { passed: ok, details: `daysLate=${res.daysLate}, amount=${res.totalAmountMinor}` };
      },
    },
    {
      name: "Grace plus 1 minute (61 mins late) gives exactly 1 day fine",
      run: () => {
        const res = calculateLateReturnFine(expectedTime, addMinutes(expectedTime, 61), defaultSettings);
        const ok = res.daysLate === 1 && res.totalAmountMinor === 5000;
        return { passed: ok, details: `daysLate=${res.daysLate}, amount=${res.totalAmountMinor}` };
      },
    },
    {
      name: "Exactly 24h past grace (60 + 1440 mins = 1500 mins late) gives 1 day fine",
      run: () => {
        const res = calculateLateReturnFine(expectedTime, addMinutes(expectedTime, 1500), defaultSettings);
        const ok = res.daysLate === 1 && res.totalAmountMinor === 5000;
        return { passed: ok, details: `daysLate=${res.daysLate}, amount=${res.totalAmountMinor}` };
      },
    },
    {
      name: "24h plus 1 minute past grace with 'ceil' (1501 mins late) gives 2 days fine",
      run: () => {
        const res = calculateLateReturnFine(expectedTime, addMinutes(expectedTime, 1501), defaultSettings);
        const ok = res.daysLate === 2 && res.totalAmountMinor === 10000;
        return { passed: ok, details: `daysLate=${res.daysLate}, amount=${res.totalAmountMinor}` };
      },
    },
    {
      name: "24h plus 1 minute past grace with 'floor' (1501 mins late) gives 1 day fine",
      run: () => {
        const floorSettings: HostelSettings = { ...defaultSettings, roundingRule: "floor" };
        const res = calculateLateReturnFine(expectedTime, addMinutes(expectedTime, 1501), floorSettings);
        const ok = res.daysLate === 1 && res.totalAmountMinor === 5000;
        return { passed: ok, details: `daysLate=${res.daysLate}, amount=${res.totalAmountMinor}` };
      },
    },
    {
      name: "Replay idempotency: repeated calculation yields byte-identical result",
      run: () => {
        const time = addMinutes(expectedTime, 2000);
        const res1 = calculateLateReturnFine(expectedTime, time, defaultSettings);
        const res2 = calculateLateReturnFine(expectedTime, time, defaultSettings);
        const ok =
          res1.daysLate === res2.daysLate &&
          res1.ratePerDayMinor === res2.ratePerDayMinor &&
          res1.totalAmountMinor === res2.totalAmountMinor;
        return { passed: ok, details: `res1=${JSON.stringify(res1)}, res2=${JSON.stringify(res2)}` };
      },
    },
  ];

  const results = cases.map((c) => {
    const outcome = c.run();
    return { name: c.name, passed: outcome.passed, details: outcome.details };
  });

  const passedCases = results.filter((r) => r.passed).length;

  return {
    totalCases: cases.length,
    passedCases,
    allPassed: passedCases === cases.length,
    results,
  };
}
