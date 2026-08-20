import { SpaceAllocator, SpaceDescriptor, BookingRequirement } from '../../../operations/twin/ml/space-allocator';

describe('Autonomous Space Allocator', () => {
  const spaces: SpaceDescriptor[] = [
    { spaceId: 'HALL-A', name: 'Grand Auditorium', capacity: 200, spaceType: 'auditorium', hasWheelchairAccess: true },
    { spaceId: 'SEMINAR-1', name: 'Seminar Room 1', capacity: 25, spaceType: 'classroom', hasWheelchairAccess: true },
    { spaceId: 'LAB-1', name: 'Computer Lab 1', capacity: 40, spaceType: 'laboratory', hasWheelchairAccess: true },
  ];

  it('should detect underutilized room and propose right-sizing reallocation', () => {
    const bookings: BookingRequirement[] = [
      {
        bookingId: 'B-01',
        title: 'Philosophy Seminar',
        expectedAttendance: 18,
        spaceType: 'classroom',
        requiresWheelchairAccess: true,
        currentSpaceId: 'HALL-A', // 18 in 200 seat hall -> 9% utilization!
      },
    ];

    const result = SpaceAllocator.optimizeAllocations(spaces, bookings);
    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].fromSpaceId).toBe('HALL-A');
    expect(result.proposals[0].toSpaceId).toBe('SEMINAR-1');
    expect(result.proposals[0].utilizationGainPct).toBeGreaterThan(50);
  });
});
