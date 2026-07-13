export const TOOL_SLUGS = [
  "net-salary",
  "mortgage",
  "password-checker",
  "speed-test",
  "qr-code",
  "background-remover",
  "file-converter",
  "ai-writer",
  "bmi-calories",
  "unit-converter",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

export type ToolMeta = {
  slug: ToolSlug;
  icon: string;
};

export const TOOLS: ToolMeta[] = [
  { slug: "net-salary", icon: "₪" },
  { slug: "mortgage", icon: "🏠" },
  { slug: "password-checker", icon: "🔐" },
  { slug: "speed-test", icon: "⚡" },
  { slug: "qr-code", icon: "▦" },
  { slug: "background-remover", icon: "🖼️" },
  { slug: "file-converter", icon: "📄" },
  { slug: "ai-writer", icon: "✨" },
  { slug: "bmi-calories", icon: "⚖️" },
  { slug: "unit-converter", icon: "🔄" },
];

export function isToolSlug(value: string): value is ToolSlug {
  return (TOOL_SLUGS as readonly string[]).includes(value);
}
