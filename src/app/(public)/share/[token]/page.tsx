import { db } from "@/db";
import { mediaShareLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SharePageClient } from "./share-page-client";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const link = await db
    .select()
    .from(mediaShareLinks)
    .where(eq(mediaShareLinks.token, token))
    .get();

  if (!link || !link.isActive) {
    notFound();
  }

  const isExpired = !!(link.expiresAt && new Date(link.expiresAt) < new Date());
  const isLocked = !!(link.lockedUntil && new Date(link.lockedUntil) > new Date());
  const hasPassword = !!link.passwordHash;

  return (
    <SharePageClient
      token={token}
      hasPassword={hasPassword}
      isExpired={isExpired}
      isLocked={isLocked}
      assetId={link.assetId ?? null}
    />
  );
}

export function generateMetadata() {
  return {
    title: "Shared File — ThaibaHive",
    description: "Access a file shared via ThaibaHive Media",
    robots: "noindex",
  };
}
