import { redirect } from "next/navigation";

export default function LegacyGrievancesRedirect() {
  redirect("/my-work/complaints");
}
