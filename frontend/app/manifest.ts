import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mendeles",
    short_name: "Mendeles",
    description: "AI-powered marketing, SEO, lead generation, and useful business tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#6F42F5",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
