export interface ResourceDemandProjection {
  department: string;
  projectedLabHoursNeeded: number;
  projectedClassroomsNeeded: number;
  projectedHpcComputeHours: number;
  capacitySurplusOrDeficit: number; // positive = surplus, negative = bottleneck
  bottleneckAlerts: string[];
}

/**
 * Federated Resource Demand Model forecasting campus physical & computing capacity requirements
 */
export class ResourceDemandModel {
  public static forecastDemand(
    enrolledStudentCount: number,
    courseCount: number,
    departmentName: string,
    activeHpcLaboratories: number = 2
  ): ResourceDemandProjection {
    const projectedLabHoursNeeded = Math.round(enrolledStudentCount * 2.5);
    const projectedClassroomsNeeded = Math.ceil(courseCount / 3);
    const projectedHpcComputeHours = Math.round(enrolledStudentCount * 5.0 * activeHpcLaboratories);

    const availableLabCapacity = 500; // standard hours
    const capacityDiff = availableLabCapacity - projectedLabHoursNeeded;

    const bottleneckAlerts: string[] = [];
    if (capacityDiff < 0) {
      bottleneckAlerts.push(`Lab capacity deficit of ${Math.abs(capacityDiff)} hours projected`);
    }
    if (projectedClassroomsNeeded > 20) {
      bottleneckAlerts.push(`High classroom demand (${projectedClassroomsNeeded} rooms) requires inter-campus booking`);
    }

    return {
      department: departmentName,
      projectedLabHoursNeeded,
      projectedClassroomsNeeded,
      projectedHpcComputeHours,
      capacitySurplusOrDeficit: capacityDiff,
      bottleneckAlerts,
    };
  }
}
