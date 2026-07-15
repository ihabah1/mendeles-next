export const PROMO_VIDEOS = [
  {
    id: "logo",
    src: "/videos/logo.mp4",
    labelKey: "logo",
    title: "Your brand, ready to grow",
  },
  {
    id: "landing-page",
    src: "/videos/landing-page.mp4",
    labelKey: "landingPage",
    title: "Landing page, assembled automatically",
  },
  {
    id: "seo-settings",
    src: "/videos/seo-settings.mp4",
    labelKey: "seoSettings",
    title: "Full SEO out of the box",
  },
] as const;

export type PromoVideoId = (typeof PROMO_VIDEOS)[number]["id"];
