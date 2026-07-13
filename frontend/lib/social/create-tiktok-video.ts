/**
 * Record a short vertical TikTok-style WebM from canvas (title + CTA + URL).
 * Produces a clean data:video/webm;base64,... URL the backend accepts.
 * Motion is intentional and obvious so the clip is clearly a video, not a still.
 */
export async function createTikTokPromoVideo(opts: {
  title: string;
  cta: string;
  websiteUrl: string;
  durationMs?: number;
}): Promise<string> {
  const durationMs = opts.durationMs ?? 5500;
  const width = 540;
  const height = 960;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // Keep in DOM — some browsers freeze captureStream on detached canvases.
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(canvas);

  try {
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) throw new Error("Canvas not supported in this browser.");

    paintFrame(ctx, width, height, opts, 0);

    // fps=0 + requestFrame is the reliable way to push every painted frame into the stream.
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
    const requestFrame = () => {
      try {
        track.requestFrame?.();
      } catch {
        /* unsupported */
      }
    };
    requestFrame();

    const mimeCandidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
    if (!mime) throw new Error("MediaRecorder WebM is not supported in this browser.");

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2_500_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const started = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      paintFrame(ctx, width, height, opts, t);
      requestFrame();
      if (now - started < durationMs) {
        raf = requestAnimationFrame(draw);
      }
    };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Video recording failed."));
      recorder.onstop = () => {
        if (!chunks.length) {
          reject(new Error("Video recording produced no data."));
          return;
        }
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
    });

    recorder.start(100);
    // Seed a few frames before the animation loop so duration isn't a single still.
    for (let i = 0; i < 3; i++) {
      paintFrame(ctx, width, height, opts, i * 0.02);
      requestFrame();
      await wait(32);
    }
    raf = requestAnimationFrame(draw);
    await wait(durationMs + 320);
    cancelAnimationFrame(raf);
    paintFrame(ctx, width, height, opts, 1);
    requestFrame();
    if (recorder.state === "recording") {
      try {
        recorder.requestData();
      } catch {
        /* older Safari */
      }
      recorder.stop();
    }
    stream.getTracks().forEach((t) => t.stop());

    const blob = await done;
    if (blob.size < 8_000) {
      throw new Error("Video recording looks too small — try again in Chrome/Edge.");
    }
    return normalizeVideoDataUrl(await blobToDataUrl(blob));
  } finally {
    canvas.remove();
  }
}

function normalizeVideoDataUrl(dataUrl: string): string {
  // codecs= may include commas (e.g. vp9,opus) — never parse with a brittle regex alone.
  const marker = ";base64,";
  const idx = dataUrl.indexOf(marker);
  if (!dataUrl.startsWith("data:") || idx < 0) {
    throw new Error(`Unexpected video data URL format: ${dataUrl.slice(0, 60)}`);
  }
  const header = dataUrl.slice(5, idx);
  const b64 = dataUrl.slice(idx + marker.length);
  const mimePart = header.split(";", 1)[0].toLowerCase();
  const mime = mimePart.startsWith("video/") ? mimePart : "video/webm";
  return `data:${mime};base64,${b64}`;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function paintFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: { title: string; cta: string; websiteUrl: string },
  t: number,
) {
  const enter = easeOutCubic(Math.min(1, t / 0.28));
  const sweep = (t * 2.2) % 1;
  const bob = Math.sin(t * Math.PI * 6) * 10;
  const ctaPulse = 1 + 0.06 * Math.sin(t * Math.PI * 8);

  // Moving background (Ken Burns + color shift) — must change every frame.
  const g = ctx.createLinearGradient(
    width * (0.1 + t * 0.35),
    0,
    width * (0.7 - t * 0.2),
    height,
  );
  g.addColorStop(0, "#0B1220");
  g.addColorStop(0.35 + t * 0.15, "#5B21B6");
  g.addColorStop(0.7, "#312E81");
  g.addColorStop(1, "#020617");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Floating orbs
  for (let i = 0; i < 4; i++) {
    const ox = ((0.15 + i * 0.22 + t * (0.35 + i * 0.08)) % 1.2) * width - width * 0.1;
    const oy = height * (0.18 + i * 0.18) + Math.sin(t * Math.PI * 2 + i) * 40;
    const r = 50 + i * 28 + bob;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.04 + i * 0.015})`;
    ctx.fill();
  }

  // Diagonal light sweep
  ctx.save();
  ctx.translate(width * sweep, -40);
  ctx.rotate(0.4);
  const shine = ctx.createLinearGradient(0, 0, 120, height);
  shine.addColorStop(0, "rgba(255,255,255,0)");
  shine.addColorStop(0.5, "rgba(255,255,255,0.14)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(-60, 0, 120, height * 1.4);
  ctx.restore();

  // Brand
  ctx.save();
  ctx.globalAlpha = enter;
  ctx.fillStyle = "#DDD6FE";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MENDELES", width / 2, 70 + (1 - enter) * -30);
  ctx.restore();

  // Title slides up + slight scale
  ctx.save();
  ctx.translate(width / 2, height * 0.36 + (1 - enter) * 80 + bob * 0.35);
  ctx.scale(0.92 + enter * 0.08, 0.92 + enter * 0.08);
  ctx.globalAlpha = enter;
  wrapFillText(ctx, opts.title || "Mendeles campaign", 0, 0, width - 80, 38, 5);
  ctx.restore();

  // CTA pulse
  const btnW = 320 * ctaPulse;
  const btnH = 56 * ctaPulse;
  const btnX = (width - btnW) / 2;
  const btnY = height * 0.7 + (1 - enter) * 60 + Math.sin(t * Math.PI * 4) * 6;
  ctx.save();
  ctx.globalAlpha = Math.min(1, enter + 0.15);
  ctx.shadowColor = "rgba(167,139,250,0.55)";
  ctx.shadowBlur = 24 + Math.sin(t * Math.PI * 8) * 10;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, btnX, btnY, btnW, btnH, 28);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#4C1D95";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((opts.cta || "Learn more").slice(0, 36), width / 2, btnY + btnH * 0.62);
  ctx.restore();

  ctx.fillStyle = "#E2E8F0";
  ctx.font = "16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.globalAlpha = enter;
  ctx.fillText((opts.websiteUrl || "https://mendeles.com").slice(0, 42), width / 2, btnY + btnH + 36);
  ctx.globalAlpha = 1;

  // Progress bar — proves continuous motion when playing
  const barPad = 28;
  const barY = height - 36;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  roundRect(ctx, barPad, barY, width - barPad * 2, 8, 4);
  ctx.fill();
  ctx.fillStyle = "#A78BFA";
  roundRect(ctx, barPad, barY, (width - barPad * 2) * t, 8, 4);
  ctx.fill();
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to encode video."));
    reader.readAsDataURL(blob);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapFillText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  const shown = lines.slice(0, maxLines);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.textAlign = "center";
  shown.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
}
