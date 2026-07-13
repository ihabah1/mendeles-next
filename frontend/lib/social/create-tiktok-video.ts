/**
 * Record a short vertical TikTok-style WebM from canvas (title + CTA + URL).
 */
export async function createTikTokPromoVideo(opts: {
  title: string;
  cta: string;
  websiteUrl: string;
  durationMs?: number;
}): Promise<string> {
  const durationMs = opts.durationMs ?? 4500;
  const width = 540;
  const height = 960;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");

  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";
  if (!mime) throw new Error("MediaRecorder WebM is not supported in this browser.");

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const started = performance.now();
  let raf = 0;

  const draw = (now: number) => {
    const t = (now - started) / durationMs;
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);

    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#111827");
    g.addColorStop(0.45, "#4C1D95");
    g.addColorStop(1, "#0F172A");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.12, 80 + pulse * 20, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.08 + pulse * 0.04})`;
    ctx.fill();

    ctx.fillStyle = "#DDD6FE";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MENDELES", width / 2, 90);

    wrapFillText(ctx, opts.title || "Mendeles campaign", width / 2, height * 0.38, width - 80, 36, 5);

    const btnW = 320;
    const btnH = 56;
    const btnX = (width - btnW) / 2;
    const btnY = height * 0.72;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, btnX, btnY, btnW, btnH, 28);
    ctx.fill();
    ctx.fillStyle = "#4C1D95";
    ctx.font = "bold 20px Arial, sans-serif";
    ctx.fillText((opts.cta || "Learn more").slice(0, 36), width / 2, btnY + 36);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "16px Arial, sans-serif";
    ctx.fillText((opts.websiteUrl || "https://mendeles.com").slice(0, 42), width / 2, btnY + 90);

    if (now - started < durationMs) {
      raf = requestAnimationFrame(draw);
    }
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video recording failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start(100);
  raf = requestAnimationFrame(draw);
  await wait(durationMs + 120);
  cancelAnimationFrame(raf);
  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());

  const blob = await done;
  return blobToDataUrl(blob);
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
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
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
