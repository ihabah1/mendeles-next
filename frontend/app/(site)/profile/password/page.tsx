import { redirect } from "next/navigation";

export default function ProfilePasswordPage() {
  redirect("/profile/details#password");
}
