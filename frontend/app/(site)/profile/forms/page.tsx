import { redirect } from "next/navigation";

/** טפסים שלי הוסר — מפנה להיסטוריית רכישות */
export default function ProfileFormsRedirect() {
  redirect("/profile/orders");
}
