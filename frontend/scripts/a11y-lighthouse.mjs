import { execSync } from "node:child_process";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const PAGES = ["/", "/accessibility", "/login"];

async function run() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox"] });

  try {
    for (const path of PAGES) {
      const url = `${BASE_URL.replace(/\/$/, "")}${path}`;
      const result = await lighthouse(url, {
        logLevel: "error",
        output: "json",
        onlyCategories: ["accessibility"],
        port: chrome.port,
      });

      const score = Math.round((result?.lhr.categories.accessibility?.score ?? 0) * 100);
      const audits = result?.lhr.audits ?? {};
      const failed = Object.values(audits).filter(
        (audit) =>
          audit.score !== null &&
          audit.score < 1 &&
          audit.scoreDisplayMode !== "informative" &&
          audit.scoreDisplayMode !== "manual",
      );

      console.log(`\nLighthouse Accessibility — ${path}: ${score}/100`);
      for (const audit of failed) {
        console.log(`  - ${audit.title}`);
      }

      if (score < 90) {
        process.exitCode = 1;
      }
    }
  } finally {
    try {
      await chrome.kill();
    } catch {
      // Windows may block temp dir cleanup; audits already completed.
    }
  }
}

if (process.env.SKIP_LIGHTHOUSE !== "1") {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  console.log("SKIP_LIGHTHOUSE=1 — lighthouse audit skipped");
}
