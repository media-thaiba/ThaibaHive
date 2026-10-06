import { redirect, notFound } from "next/navigation";
import { WORKSPACE_REDIRECTS } from "@/lib/navigation/workspace-redirects";

export default async function AdminRedirectPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const target = WORKSPACE_REDIRECTS[`/admin/${slug.join("/")}`];
  if (!target) notFound();
  redirect(target);
}
