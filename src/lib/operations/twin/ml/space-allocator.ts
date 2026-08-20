export interface SpaceDescriptor {
  spaceId: string;
  name: string;
  capacity: number;
  spaceType: string;
  hasWheelchairAccess: boolean;
  specialEquipment?: string[];
}

export interface BookingRequirement {
  bookingId: string;
  title: string;
  expectedAttendance: number;
  spaceType: string;
  requiresWheelchairAccess: boolean;
  requiredEquipment?: string[];
  currentSpaceId: string;
}

export interface ReallocationProposal {
  bookingId: string;
  title: string;
  expectedAttendance: number;
  fromSpaceId: string;
  toSpaceId: string;
  fromUtilizationPct: number;
  toUtilizationPct: number;
  utilizationGainPct: number;
  reason: string;
}

export class SpaceAllocator {
  public static optimizeAllocations(
    spaces: SpaceDescriptor[],
    bookings: BookingRequirement[]
  ): {
    proposals: ReallocationProposal[];
    totalUtilizationGainPct: number;
  } {
    const spaceMap = new Map<string, SpaceDescriptor>();
    for (const s of spaces) spaceMap.set(s.spaceId, s);

    const proposals: ReallocationProposal[] = [];
    let totalGain = 0;

    for (const booking of bookings) {
      const currentSpace = spaceMap.get(booking.currentSpaceId);
      if (!currentSpace) continue;

      const currentUtil = (booking.expectedAttendance / currentSpace.capacity) * 100;

      // Check if space is grossly mismatched (< 40% utilized or > 100% capacity)
      if (currentUtil < 40 || currentUtil > 100) {
        // Find best-fitting alternative space
        const candidates = spaces.filter((s) => {
          if (s.spaceId === booking.currentSpaceId) return false;
          if (s.capacity < booking.expectedAttendance) return false; // Must fit
          if (booking.requiresWheelchairAccess && !s.hasWheelchairAccess) return false;
          return true;
        });

        // Sort candidates by tightness of fit (closest to 80% target utilization)
        candidates.sort((a, b) => {
          const utilA = booking.expectedAttendance / a.capacity;
          const utilB = booking.expectedAttendance / b.capacity;
          return Math.abs(0.80 - utilA) - Math.abs(0.80 - utilB);
        });

        if (candidates.length > 0) {
          const bestSpace = candidates[0];
          const newUtil = (booking.expectedAttendance / bestSpace.capacity) * 100;
          const gain = newUtil - currentUtil;

          if (gain > 15 || currentUtil > 100) {
            proposals.push({
              bookingId: booking.bookingId,
              title: booking.title,
              expectedAttendance: booking.expectedAttendance,
              fromSpaceId: currentSpace.spaceId,
              toSpaceId: bestSpace.spaceId,
              fromUtilizationPct: Number(currentUtil.toFixed(1)),
              toUtilizationPct: Number(newUtil.toFixed(1)),
              utilizationGainPct: Number(gain.toFixed(1)),
              reason: currentUtil < 40
                ? `Right-sizing small class (${booking.expectedAttendance}) from oversized room (${currentSpace.capacity} seats) to ${bestSpace.name} (${bestSpace.capacity} seats)`
                : `Relieving room overcrowding (capacity exceeded by ${booking.expectedAttendance - currentSpace.capacity})`,
            });
            totalGain += Math.max(0, gain);
          }
        }
      }
    }

    const avgGain = proposals.length > 0 ? Number((totalGain / proposals.length).toFixed(1)) : 0;
    return {
      proposals,
      totalUtilizationGainPct: avgGain,
    };
  }
}
