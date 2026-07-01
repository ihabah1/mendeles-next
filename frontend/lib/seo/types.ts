export type SEOSettings = {
  site_name: string;
  default_title: string;
  default_description: string;
  default_keywords: string;
  default_author: string;
  default_language: string;
  robots_policy: string;
  canonical_base_url: string;
  default_og_image: string;
  default_twitter_image: string;
  organization_name: string;
  organization_logo: string;
  organization_url: string;
};

export type OpenGraphMeta = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  site_name: string;
  locale: string;
};

export type TwitterMeta = {
  card: string;
  title: string;
  description: string;
  image: string;
};

export type PageMetadata = {
  title: string;
  description: string;
  keywords: string;
  author: string;
  language: string;
  canonical: string;
  robots: string;
  open_graph: OpenGraphMeta;
  twitter: TwitterMeta;
};

export type BreadcrumbItem = {
  name: string;
  path: string;
  url?: string;
};

export type SEOIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type SEOValidationReport = {
  valid: boolean;
  score: number;
  issues: SEOIssue[];
  metadata?: PageMetadata;
  settings?: SEOSettings;
};

export type SEOStatus = {
  global: SEOValidationReport;
  homepage: SEOValidationReport;
  overall_score: number;
  ready_for_production: boolean;
};

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  locale?: string;
};

export type PageSEOInput = {
  title?: string;
  description?: string;
  keywords?: string;
  path: string;
  locale?: string;
  og_image?: string;
  og_type?: string;
  breadcrumbs?: BreadcrumbItem[];
};

export type SEOPublicBundle = {
  settings: SEOSettings;
  schemas: Record<string, unknown>[];
};
