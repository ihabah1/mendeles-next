"use client";

import dynamic from "next/dynamic";
import type { ToolSlug } from "@/lib/tools/catalog";

function ToolLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading tool">
      <div className="h-5 w-2/5 rounded-full bg-slate-200" />
      <div className="h-12 w-full rounded-xl bg-slate-100" />
      <div className="h-12 w-3/4 rounded-xl bg-slate-100" />
      <div className="h-11 w-36 rounded-full bg-[#6F42F5]/20" />
    </div>
  );
}

const NetSalaryTool = dynamic(
  () => import("@/components/tools/net-salary-tool").then((module) => module.NetSalaryTool),
  { loading: ToolLoading },
);
const MortgageTool = dynamic(
  () => import("@/components/tools/mortgage-tool").then((module) => module.MortgageTool),
  { loading: ToolLoading },
);
const PasswordCheckerTool = dynamic(
  () => import("@/components/tools/password-checker-tool").then((module) => module.PasswordCheckerTool),
  { loading: ToolLoading },
);
const SpeedTestTool = dynamic(
  () => import("@/components/tools/speed-test-tool").then((module) => module.SpeedTestTool),
  { loading: ToolLoading },
);
const QrCodeTool = dynamic(
  () => import("@/components/tools/qr-code-tool").then((module) => module.QrCodeTool),
  { loading: ToolLoading },
);
const BackgroundRemoverTool = dynamic(
  () => import("@/components/tools/background-remover-tool").then((module) => module.BackgroundRemoverTool),
  { loading: ToolLoading },
);
const FileConverterTool = dynamic(
  () => import("@/components/tools/file-converter-tool").then((module) => module.FileConverterTool),
  { loading: ToolLoading },
);
const PdfViewerTool = dynamic(
  () => import("@/components/tools/pdf-viewer-tool").then((module) => module.PdfViewerTool),
  { loading: ToolLoading },
);
const PdfCreatorTool = dynamic(
  () => import("@/components/tools/pdf-creator-tool").then((module) => module.PdfCreatorTool),
  { loading: ToolLoading },
);
const PdfEditorTool = dynamic(
  () => import("@/components/tools/pdf-editor-tool").then((module) => module.PdfEditorTool),
  { loading: ToolLoading },
);
const PdfSignTool = dynamic(
  () => import("@/components/tools/pdf-sign-tool").then((module) => module.PdfSignTool),
  { loading: ToolLoading },
);
const LogoCreatorTool = dynamic(
  () => import("@/components/tools/logo-creator-tool").then((module) => module.LogoCreatorTool),
  { loading: ToolLoading },
);
const AiWriterTool = dynamic(
  () => import("@/components/tools/ai-writer-tool").then((module) => module.AiWriterTool),
  { loading: ToolLoading },
);
const BmiCaloriesTool = dynamic(
  () => import("@/components/tools/bmi-calories-tool").then((module) => module.BmiCaloriesTool),
  { loading: ToolLoading },
);
const UnitConverterTool = dynamic(
  () => import("@/components/tools/unit-converter-tool").then((module) => module.UnitConverterTool),
  { loading: ToolLoading },
);

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
    case "pdf-viewer":
      return <PdfViewerTool locale={locale} />;
    case "pdf-creator":
      return <PdfCreatorTool locale={locale} />;
    case "pdf-editor":
      return <PdfEditorTool locale={locale} />;
    case "pdf-sign":
      return <PdfSignTool locale={locale} />;
    case "logo-creator":
      return <LogoCreatorTool locale={locale} />;
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
