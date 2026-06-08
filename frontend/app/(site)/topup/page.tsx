import { redirect } from "next/navigation";

export default function TopupRedirectPage() {
  redirect("/profile/topup");
}
