import { AlumniProfileItem } from './types';

export type ViewerRole = 'super_admin' | 'admin' | 'alumni' | 'student' | 'public_anonymous';

export interface SanitizedAlumniProfile extends Partial<AlumniProfileItem> {
  isRedacted: boolean;
  visibilityNote?: string;
}

export class PrivacyConsentManager {
  /**
   * Sanitizes an alumni profile according to the viewer's role and the alumnus's privacy preferences.
   */
  public sanitizeProfile(
    profile: AlumniProfileItem,
    viewerRole: ViewerRole = 'public_anonymous',
    viewerId?: string
  ): SanitizedAlumniProfile {
    // Admins and the owner always have full visibility
    if (
      viewerRole === 'super_admin' ||
      viewerRole === 'admin' ||
      (viewerId && (profile.id === viewerId || profile.userId === viewerId))
    ) {
      return {
        ...profile,
        isRedacted: false,
      };
    }

    // If alumnus set profile to completely hidden
    if (profile.privacyConsentLevel === 'hidden') {
      return {
        id: profile.id,
        institutionId: profile.institutionId,
        firstName: profile.firstName,
        lastName: `${profile.lastName.charAt(0)}.`,
        graduationBatchYear: profile.graduationBatchYear,
        primaryDegree: profile.primaryDegree,
        primaryDepartment: profile.primaryDepartment,
        isVerified: profile.isVerified,
        status: profile.status,
        isRedacted: true,
        visibilityNote: 'This alumni profile is private.',
      };
    }

    // If alumnus set profile to alumni_only and viewer is anonymous or general student
    if (profile.privacyConsentLevel === 'alumni_only' && viewerRole === 'public_anonymous') {
      return {
        id: profile.id,
        institutionId: profile.institutionId,
        firstName: profile.firstName,
        lastName: `${profile.lastName.charAt(0)}.`,
        graduationBatchYear: profile.graduationBatchYear,
        primaryDegree: profile.primaryDegree,
        primaryDepartment: profile.primaryDepartment,
        currentIndustry: profile.currentIndustry,
        isVerified: profile.isVerified,
        status: profile.status,
        isRedacted: true,
        visibilityNote: 'Sign in as a student or alumni to view full profile.',
      };
    }

    // Standard field-level consent redactions
    const sanitized: SanitizedAlumniProfile = {
      ...profile,
      isRedacted: false,
    };

    if (!profile.showEmail) {
      sanitized.email = this.maskEmail(profile.email);
    }
    if (!profile.showPhone && profile.phone) {
      sanitized.phone = this.maskPhone(profile.phone);
    }
    if (!profile.showLocation) {
      sanitized.currentCity = undefined;
      sanitized.currentCountry = undefined;
    }
    if (!profile.showCompany) {
      sanitized.currentCompany = undefined;
      sanitized.currentDesignation = undefined;
    }

    return sanitized;
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.com';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : '***';
    return `${maskedName}@${domain}`;
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    return `${phone.substring(0, phone.length - 4)}****`;
  }
}

export const privacyConsentManager = new PrivacyConsentManager();
