export type DemoLandingPage = {
  slug: string;
  nameKey: string;
  status: "published" | "draft";
  views: number;
  leads: number;
  conversion: number;
  theme: "indigo" | "emerald" | "amber";
};

export const DEMO_LANDING_PAGES: DemoLandingPage[] = [
  {
    slug: "design-services",
    nameKey: "designServices",
    status: "published",
    views: 512,
    leads: 18,
    conversion: 3.5,
    theme: "indigo",
  },
  {
    slug: "webinar-signup",
    nameKey: "webinarSignup",
    status: "published",
    views: 398,
    leads: 15,
    conversion: 3.8,
    theme: "emerald",
  },
  {
    slug: "summer-promo",
    nameKey: "summerPromo",
    status: "draft",
    views: 374,
    leads: 14,
    conversion: 3.7,
    theme: "amber",
  },
];

export function getDemoPage(slug: string) {
  return DEMO_LANDING_PAGES.find((p) => p.slug === slug);
}

export function landingPagePath(slug: string) {
  return `/p/${slug}` as const;
}
