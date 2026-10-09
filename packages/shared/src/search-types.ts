export const SEARCHABLE_ENTITY_TYPES = [
  "students",
  "staff",
  "tasks",
  "events",
  "announcements",
  "daily-reports",
  "purchase-requests",
  "help-desk-tickets",
  "recognition",
  "asset-inventory",
  "circulars",
  "bookings",
  "polls",
  "comments",
  "media-assets",
] as const;

export type EntityType = (typeof SEARCHABLE_ENTITY_TYPES)[number];

export type EntityRouteStrategy = "native" | "handoff";

export const ENTITY_ROUTE_STRATEGY_MAP: Record<EntityType, EntityRouteStrategy> = {
  students: "native",
  staff: "native",
  tasks: "native",
  events: "native",
  announcements: "native",
  "daily-reports": "native",
  circulars: "native",
  polls: "native",
  "purchase-requests": "handoff",
  "help-desk-tickets": "native",
  bookings: "native",
  recognition: "native",
  comments: "native",
  "asset-inventory": "native",
  "media-assets": "native",
};

export interface SearchResultItem {
  id: string;
  entityType: EntityType;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  initials?: string;
  nativeRoute: string;
  webRoute: string;
  targetPath?: string;
  isWebOnly: boolean;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResult {
  students: SearchResultItem[];
  staff: SearchResultItem[];
  tasks: SearchResultItem[];
  events: SearchResultItem[];
  announcements: SearchResultItem[];
  "daily-reports": SearchResultItem[];
  "purchase-requests": SearchResultItem[];
  "help-desk-tickets": SearchResultItem[];
  recognition: SearchResultItem[];
  "asset-inventory": SearchResultItem[];
  circulars: SearchResultItem[];
  bookings: SearchResultItem[];
  polls: SearchResultItem[];
  comments: SearchResultItem[];
  "media-assets": SearchResultItem[];
  totalResults: number;
}
