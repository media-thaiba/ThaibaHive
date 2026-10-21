// In-process concurrency mutex lock to prevent parallel batch runs for the same institution & period
const activeLocks = new Set<string>();

export async function withPayrollBatchLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (activeLocks.has(key)) {
    throw new Error("Conflict: payroll batch generation already in progress for this period");
  }
  activeLocks.add(key);
  try {
    return await fn();
  } finally {
    activeLocks.delete(key);
  }
}
