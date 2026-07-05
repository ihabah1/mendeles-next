import { Link } from "@/lib/i18n/navigation";

export function DemoNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white px-5 py-4 text-right shadow-sm">
      <p className="text-sm font-bold text-amber-900">תצוגת בלוג לדוגמה</p>
      <p className="mt-1 text-sm leading-7 text-amber-800/90">
        אין עדיין מאמרים מפורסמים בפרודקשן. מוצגים מאמרי עריכה לדוגמה. לפרסום תוכן אמיתי —{" "}
        <Link href="/dashboard/workspace" className="font-semibold text-[#6F42F5] underline-offset-2 hover:underline">
          צרו ופרסמו מממשק העבודה
        </Link>
        .
      </p>
    </div>
  );
}
