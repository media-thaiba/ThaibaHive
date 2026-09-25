import { facilityStore } from '../../../db/facility-store';
import { FacilityContractorRegistryItem } from '../facility-types';

export interface ContractorDispatchResult {
  dispatched: boolean;
  contractor?: FacilityContractorRegistryItem;
  slaDeadlineHours: number;
  message: string;
}

export class ContractorDispatcher {
  public static async dispatchSpecialist(
    specialization: string,
    isEmergency: boolean,
    institutionId: string = 'global'
  ): Promise<ContractorDispatchResult> {
    const contractors = await facilityStore.listContractors(institutionId);
    const activeContractors = contractors.filter((c) => c.status === 'active');

    // Filter by specialization
    const eligible = activeContractors.filter((c) => {
      try {
        const specs = JSON.parse(c.specializationsJson);
        return Array.isArray(specs) && (specs.includes(specialization) || specs.includes('all'));
      } catch {
        return false;
      }
    });

    if (eligible.length === 0) {
      return {
        dispatched: false,
        slaDeadlineHours: 24,
        message: `No active registered contractors found for specialization '${specialization}'`,
      };
    }

    // Rank by performance rating descending, rate per hour ascending
    eligible.sort((a, b) => b.performanceRating - a.performanceRating || a.ratePerHour - b.ratePerHour);

    const chosen = eligible[0];
    const slaDeadlineHours = isEmergency ? chosen.slaEmergencyHours : chosen.slaRoutineHours;

    return {
      dispatched: true,
      contractor: chosen,
      slaDeadlineHours,
      message: `Dispatched external contractor '${chosen.companyName}' with ${slaDeadlineHours}h SLA deadline`,
    };
  }
}
