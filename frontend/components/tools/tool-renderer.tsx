"use client";

import type { ToolSlug } from "@/lib/tools/catalog";
import { AiWriterTool } from "@/components/tools/ai-writer-tool";
import { BackgroundRemoverTool } from "@/components/tools/background-remover-tool";
import { BmiCaloriesTool } from "@/components/tools/bmi-calories-tool";
import { FileConverterTool } from "@/components/tools/file-converter-tool";
import { MortgageTool } from "@/components/tools/mortgage-tool";
import { NetSalaryTool } from "@/components/tools/net-salary-tool";
import { PasswordCheckerTool } from "@/components/tools/password-checker-tool";
import { QrCodeTool } from "@/components/tools/qr-code-tool";
import { SpeedTestTool } from "@/components/tools/speed-test-tool";
import { UnitConverterTool } from "@/components/tools/unit-converter-tool";

export function ToolRenderer({ slug, locale }: { slug: ToolSlug; locale: string }) {
  switch (slug) {
    case "net-salary":
      return <NetSalaryTool locale={locale} />;
    case "mortgage":
      return <MortgageTool locale={locale} />;
    case "password-checker":
      return <PasswordCheckerTool locale={locale} />;
    case "speed-test":
      return <SpeedTestTool locale={locale} />;
    case "qr-code":
      return <QrCodeTool locale={locale} />;
    case "background-remover":
      return <BackgroundRemoverTool locale={locale} />;
    case "file-converter":
      return <FileConverterTool locale={locale} />;
    case "ai-writer":
      return <AiWriterTool locale={locale} />;
    case "bmi-calories":
      return <BmiCaloriesTool locale={locale} />;
    case "unit-converter":
      return <UnitConverterTool locale={locale} />;
    default:
      return null;
  }
}
