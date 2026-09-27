import { redirect } from "next/navigation";

export default function PublicAffiliationPage() {
  redirect("/portal/tgcis?action=affiliation");
}
