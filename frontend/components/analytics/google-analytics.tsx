import { connection } from "next/server";
import { resolveGaMeasurementId } from "@/lib/analytics/gtag";

export async function GoogleAnalytics() {
  // Read GA_MEASUREMENT_ID at request time (Railway runtime env), not at build/SSG time.
  await connection();
  const measurementId = resolveGaMeasurementId();
  if (process.env.NODE_ENV !== "production" || !measurementId) return null;

  const idJson = JSON.stringify(measurementId);

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} />
      <script
        id="google-analytics-init"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
window.__GA_MEASUREMENT_ID__ = ${idJson};
gtag('js', new Date());
gtag('config', ${idJson});
`,
        }}
      />
    </>
  );
}
