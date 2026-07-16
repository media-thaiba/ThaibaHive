export function calculateLateMinutes(
  checkInTime: Date,
  shiftStartTimeStr: string,
  gracePeriodMinutes: number
): { lateMinutes: number; status: "present" | "late" } {
  const [startH, startM] = shiftStartTimeStr.split(":").map(Number);
  const shiftStart = new Date(checkInTime);
  shiftStart.setHours(startH, startM, 0, 0);

  const graceEnd = new Date(
    shiftStart.getTime() + gracePeriodMinutes * 60000
  );

  if (checkInTime.getTime() > graceEnd.getTime()) {
    const lateMinutes = Math.floor((checkInTime.getTime() - shiftStart.getTime()) / 60000);
    return { lateMinutes, status: "late" };
  }

  return { lateMinutes: 0, status: "present" };
}
