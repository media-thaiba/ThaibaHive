import type { StaffRole } from "./roles";

export type CapabilityTier = 1 | 2 | 3; // 1: Native Mobile, 2: Mobile Quick View, 3: Web Only

export type CapabilityDomain =
  | "attendance"
  | "leaves"
  | "media"
  | "academic"
  | "finance"
  | "admin"
  | "services"
  | "operations"
  | "tasks"
  | "communication"
  | "system";

export type ServiceCategory =
  | "canteen"
  | "gate-pass"
  | "helpdesk"
  | "booking"
  | "attendance"
  | "media"
  | "leave"
  | "tasks"
  | "general";

export interface CapabilityDefinition {
  /** Canonical capability identifier: domain.resource.action */
  id: string;
  /** Human-readable title for UI */
  label: string;
  /** Detailed description */
  description: string;
  /** 1: Native Mobile, 2: Mobile Quick View, 3: Web Only */
  tier: CapabilityTier;
  /** Whether this action can be captured/queued offline */
  offlineSupported: boolean;
  /** Domain boundary */
  domain: CapabilityDomain;
  /** Mobile route path or null if Tier 3 Web-Only */
  mobileRoute: string | null;
  /** Primary web route path */
  webRoute: string;
  /** Whether triggering this on mobile requires Chrome Custom Tab handoff */
  requiresHandoff: boolean;
  /** Roles that implicitly hold this capability */
  impliedRoles?: StaffRole[];
  /** Whether this capability can be promoted as a Quick Action shortcut */
  quickAction?: boolean;
  /** Grouping category in the Services Catalog */
  serviceCategory?: ServiceCategory;
  /** Higher-level capabilities that imply this action */
  impliedBy?: string[];
}
