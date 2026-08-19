/**
 * Degraded Mode Policy and Request Shedding Controller
 * Sprint-038 / AGS-010
 */

export interface DegradedModePolicy {
  allowAuthenticatedStaff: boolean;
  allowMutations: boolean;
  shedPublicQueries: boolean;
  shedHeavyExports: boolean;
}

export class DegradedModeController {
  private static instance: DegradedModeController | null = null;
  private isDegraded: boolean = false;
  private reason: string = "";
  private activatedAt: number = 0;

  private policy: DegradedModePolicy = {
    allowAuthenticatedStaff: true,
    allowMutations: true,
    shedPublicQueries: true,
    shedHeavyExports: true,
  };

  public static getInstance(): DegradedModeController {
    if (!DegradedModeController.instance) {
      DegradedModeController.instance = new DegradedModeController();
    }
    return DegradedModeController.instance;
  }

  public activate(reason: string): void {
    this.isDegraded = true;
    this.reason = reason;
    this.activatedAt = Date.now();
  }

  public deactivate(): void {
    this.isDegraded = false;
    this.reason = "";
    this.activatedAt = 0;
  }

  public isActive(): boolean {
    return this.isDegraded;
  }

  public getStatus() {
    return {
      isDegraded: this.isDegraded,
      reason: this.reason,
      activatedAt: this.activatedAt,
      policy: this.policy,
    };
  }

  /**
   * Evaluates whether an incoming request should be shed during degraded mode.
   */
  public shouldShedRequest(role?: string, tier: string = "query"): { shed: boolean; reason?: string } {
    if (!this.isDegraded) {
      return { shed: false };
    }

    // Never shed super_admin or admin requests
    if (role === "super_admin" || role === "admin") {
      return { shed: false };
    }

    // Shed heavy export operations
    if (tier === "export" && this.policy.shedHeavyExports) {
      return { shed: true, reason: "Heavy export operations temporarily shed during gateway degraded mode" };
    }

    // Shed anonymous/public queries
    if (!role && tier === "public" && this.policy.shedPublicQueries) {
      return { shed: true, reason: "Public queries shed during high-load mitigation" };
    }

    return { shed: false };
  }
}
