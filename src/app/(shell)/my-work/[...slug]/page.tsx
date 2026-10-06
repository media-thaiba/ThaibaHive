import { redirect, notFound } from "next/navigation";
import { WORKSPACE_REDIRECTS } from "@/lib/navigation/workspace-redirects";

export default async function MyWorkRedirectPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const target = WORKSPACE_REDIRECTS[`/my-work/${slug.join("/")}`];
  if (!target) notFound();
  redirect(target);
}
