"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


import { useMemo, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

export function BmiCaloriesTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const [sex, setSex] = useState<"m" | "f">("m");
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [activity, setActivity] = useState(1.55);

  const result = useMemo(() => {
    const h = height / 100;
    const bmi = weight / (h * h);
    const bmr = sex === "m" ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
    const tdee = bmr * activity;
    let label = contentPack(locale) !== "he" ? "Normal" : "תקין";
    if (bmi < 18.5) label = contentPack(locale) !== "he" ? "Underweight" : "חסר משקל";
    else if (bmi >= 25 && bmi < 30) label = contentPack(locale) !== "he" ? "Overweight" : "עודף משקל";
    else if (bmi >= 30) label = contentPack(locale) !== "he" ? "Obesity" : "השמנה";
    return {
      bmi: Math.round(bmi * 10) / 10,
      label,
      bmr: Math.round(bmr),
      maintain: Math.round(tdee),
      lose: Math.round(tdee - 500),
      gain: Math.round(tdee + 300),
    };
  }, [sex, age, height, weight, activity, locale]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          {contentPack(locale) !== "he" ? "Sex" : "מין"}
          <select className="mt-1 w-full rounded-xl border px-3 py-2" value={sex} onChange={(e) => setSex(e.target.value as "m" | "f")}>
            <option value="m">{contentPack(locale) !== "he" ? "Male" : "זכר"}</option>
            <option value="f">{contentPack(locale) !== "he" ? "Female" : "נקבה"}</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          {contentPack(locale) !== "he" ? "Age" : "גיל"}
          <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={age} onChange={(e) => setAge(Number(e.target.value) || 0)} />
        </label>
        <label className="text-sm font-medium">
          {contentPack(locale) !== "he" ? "Height (cm)" : "גובה (ס״מ)"}
          <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={height} onChange={(e) => setHeight(Number(e.target.value) || 0)} />
        </label>
        <label className="text-sm font-medium">
          {contentPack(locale) !== "he" ? "Weight (kg)" : "משקל (ק״ג)"}
          <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={weight} onChange={(e) => setWeight(Number(e.target.value) || 0)} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        {contentPack(locale) !== "he" ? "Activity" : "רמת פעילות"}
        <select className="mt-1 w-full rounded-xl border px-3 py-2" value={activity} onChange={(e) => setActivity(Number(e.target.value))}>
          <option value={1.2}>{contentPack(locale) !== "he" ? "Sedentary" : "יושבני"}</option>
          <option value={1.375}>{contentPack(locale) !== "he" ? "Light" : "קלה"}</option>
          <option value={1.55}>{contentPack(locale) !== "he" ? "Moderate" : "בינונית"}</option>
          <option value={1.725}>{contentPack(locale) !== "he" ? "Active" : "גבוהה"}</option>
        </select>
      </label>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
        <p className="text-sm font-semibold text-slate-500">{copy.result}</p>
        <p className="mt-2 text-2xl font-extrabold text-[#6F42F5]">
          BMI {result.bmi} · {result.label}
        </p>
        <ul className="mt-3 space-y-1 text-slate-700">
          <li>
            BMR: {result.bmr} {contentPack(locale) !== "he" ? "kcal" : "קק״ל"}
          </li>
          <li>
            {contentPack(locale) !== "he" ? "Maintain" : "שמירה"}: {result.maintain}
          </li>
          <li>
            {contentPack(locale) !== "he" ? "Weight loss" : "ירידה"}: {result.lose}
          </li>
          <li>
            {contentPack(locale) !== "he" ? "Weight gain" : "עלייה"}: {result.gain}
          </li>
        </ul>
      </div>
    </div>
  );
}
