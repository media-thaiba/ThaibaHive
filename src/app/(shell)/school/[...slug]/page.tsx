import { notFound, redirect } from "next/navigation";

interface SchoolCatchAllProps {
  params: Promise<{ slug?: string[] }>;
}

/**
 * School safety-net catch-all (Phase 1.5).
 *
 * All real routes live physically under school/. Legacy URLs are handled by
 * next.config.ts redirects (LEGACY_REDIRECTS). In case a request reaches here,
 * we safely bounce legacy school links to their canonical workspace paths.
 * Anything else truly does not exist and renders 404.
 */
export default async function SchoolCatchAll({ params }: SchoolCatchAllProps) {
  const { slug } = await params;
  const path = (slug || []).join("/");

  if (path === "circulars" || path.startsWith("circulars/")) {
    const sub = path.slice("circulars".length).replace(/^\//, "");
    redirect(sub ? `/my-work/circulars/${sub}` : "/my-work/circulars");
  }
  if (path === "events" || path.startsWith("events/")) {
    const sub = path.slice("events".length).replace(/^\//, "");
    redirect(sub ? `/my-work/events/${sub}` : "/my-work/events");
  }
  if (path === "polls" || path.startsWith("polls/")) {
    const sub = path.slice("polls".length).replace(/^\//, "");
    redirect(sub ? `/my-work/polls/${sub}` : "/my-work/polls");
  }
  if (path === "announcements" || path.startsWith("announcements/")) {
    const sub = path.slice("announcements".length).replace(/^\//, "");
    redirect(sub ? `/my-work/announcements/${sub}` : "/my-work/announcements");
  }

  notFound();
}
