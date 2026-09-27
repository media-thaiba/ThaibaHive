import { redirect } from "next/navigation";

export default function PublicEnquiryPage() {
  redirect("/portal/tgcis?action=enquiry");
}
