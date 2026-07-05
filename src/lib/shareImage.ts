import type { CellCode } from "./shareCode";

/**
 * Client-side renderer for the branded share card: a PNG of the result grid
 * dressed like the og-image (hero card art under a dark scrim, two-tone
 * Cinzel wordmark, editorial header block), sized for social feeds. Rendered on demand with <canvas> — no
 * server round-trip, works offline, and never spoils the answer.
 */

export interface ShareCardOpts {
  /** e.g. "Classic" */
  modeLabel: string;
  /** Daily puzzle number, or null for practice games. */
  puzzle: number | null;
  /** e.g. "4/6" or "X/6" */
  score: string;
  grid: CellCode[][];
  /** Hostname printed at the bottom, e.g. "commanderdle.com". */
  site: string;
}

const W = 1080;
const H = 1080;

// Palette mirrored from index.css custom properties + the og-image build.
const BG = "#08080a";
const PANEL = "rgba(22, 22, 25, 0.88)";
const LINE = "#2c2c34";
const TEXT = "#fafafc";
const DIM = "#e7e7ee";
const FLAME_1 = "#f6a01a";
const FLAME_2 = "#ee5f22";
const FLAME_3 = "#c01f1f";
const FLAME_SOFT = "#f3894a";

// Same hero art as the static og-image (The Ur-Dragon).
const HERO_ART = "/cards/art_crop_10d42b35-844f-4a64-9981-c6118d45e826.webp";

const CELL_FILL: Record<CellCode, string> = {
  0: "#26262d", // no match
  1: "#e3ab26", // partial
  2: "#38b461", // exact
  3: "#bd4150", // wrong (visual modes)
};

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

/** Soft radial ember glow, like the site's background orbs. */
function orb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: string,
  alpha: number,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Load the hero art; resolves null if it can't be fetched (offline, etc). */
function loadHeroArt(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = HERO_ART;
    // Don't hold the card hostage on a slow asset.
    setTimeout(() => resolve(null), 3000);
  });
}

export async function renderShareCard(opts: ShareCardOpts): Promise<Blob> {
  // Make sure the brand fonts are usable on the canvas before drawing.
  const [art] = await Promise.all([
    loadHeroArt(),
    Promise.all([
      document.fonts.load('900 120px "Cinzel"'),
      document.fonts.load('700 44px "Cinzel"'),
      document.fonts.load('600 30px "EB Garamond"'),
    ]).catch(() => {
      // Fonts unavailable — serif fallbacks below still read fine.
    }),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Hero art across the top (cover-fit), fading into the dark body — same
  // composition as the static og-image.
  if (art) {
    const bandH = 560;
    const scale = Math.max(W / art.naturalWidth, bandH / art.naturalHeight);
    const dw = art.naturalWidth * scale;
    const dh = art.naturalHeight * scale;
    ctx.drawImage(art, (W - dw) / 2, 0, dw, dh);
    const scrim = ctx.createLinearGradient(0, 0, 0, bandH + 60);
    scrim.addColorStop(0, "rgba(8, 8, 10, 0.30)");
    scrim.addColorStop(0.45, "rgba(8, 8, 10, 0.66)");
    scrim.addColorStop(0.8, "rgba(8, 8, 10, 0.94)");
    scrim.addColorStop(1, BG);
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, Math.max(bandH + 60, dh));
  } else {
    // Offline fallback: the site's ember orbs.
    orb(ctx, W * 0.22, H * 0.24, 440, "236, 90, 28", 0.22);
    orb(ctx, W * 0.82, H * 0.78, 480, "192, 31, 31", 0.2);
    orb(ctx, W * 0.65, H * 0.12, 380, "246, 160, 26", 0.14);
  }

  // Editorial header block, left-aligned like the og-image: accent bar,
  // small-caps tagline, two-tone wordmark, then the result line.
  const left = 84;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const bar = ctx.createLinearGradient(left, 0, left + 56, 0);
  bar.addColorStop(0, FLAME_1);
  bar.addColorStop(1, FLAME_3);
  ctx.fillStyle = bar;
  roundRect(ctx, left, 84, 56, 5, 3);
  ctx.fill();

  ctx.fillStyle = DIM;
  ctx.font = '600 27px "EB Garamond", Georgia, serif';
  ctx.fillText("THE DAILY MTG COMMANDER GUESSING GAME", left, 136);

  ctx.font = '900 118px "Cinzel", Georgia, serif';
  ctx.fillStyle = TEXT;
  ctx.fillText("Comman", left, 250);
  ctx.fillStyle = FLAME_2;
  ctx.fillText("dle", left + ctx.measureText("Comman").width, 250);

  const puzzleBit = opts.puzzle != null ? ` #${opts.puzzle}` : " (practice)";
  ctx.font = '700 44px "Cinzel", Georgia, serif';
  ctx.fillStyle = FLAME_SOFT;
  const modeText = `${opts.modeLabel}${puzzleBit}`;
  ctx.fillText(modeText, left, 322);
  ctx.fillStyle = TEXT;
  ctx.fillText(`  —  ${opts.score}`, left + ctx.measureText(modeText).width, 322);

  // Result grid in a rounded panel, sized to fit between header and footer.
  const headerBottom = 356;
  const footerTop = H - 108;
  const rows = opts.grid.length;
  const cols = Math.max(1, ...opts.grid.map((r) => r.length));
  const pad = 40;
  const maxPanelH = footerTop - headerBottom - 32;
  // cell + gap where gap = 0.14 * cell → solve against both axes.
  const cell = Math.min(
    92,
    (W - 240 - pad * 2) / (cols + (cols - 1) * 0.14),
    (maxPanelH - pad * 2) / (rows + (rows - 1) * 0.14),
  );
  const gap = Math.round(cell * 0.14);
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  const panelW = gridW + pad * 2;
  const panelH = gridH + pad * 2;
  const panelX = (W - panelW) / 2;
  const panelY = headerBottom + (footerTop - headerBottom - panelH) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(236, 90, 28, 0.30)";
  ctx.shadowBlur = 70;
  ctx.fillStyle = PANEL;
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(238, 95, 34, 0.75)";
  ctx.lineWidth = 2.5;
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.stroke();

  opts.grid.forEach((row, r) => {
    // Center shorter rows (visual modes have one cell per guess).
    const rowW = row.length * cell + (row.length - 1) * gap;
    const x0 = (W - rowW) / 2;
    row.forEach((code, c) => {
      const x = x0 + c * (cell + gap);
      const y = panelY + pad + r * (cell + gap);
      ctx.fillStyle = CELL_FILL[code];
      roundRect(ctx, x, y, cell, cell, Math.round(cell * 0.18));
      ctx.fill();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  // Footer: accent rule + site, centered.
  ctx.textAlign = "center";
  ctx.fillStyle = FLAME_1;
  ctx.font = '700 40px "Cinzel", Georgia, serif';
  ctx.fillText(opts.site, W / 2, H - 52);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
}

export type ImageShareOutcome = "shared" | "copied-image" | "downloaded";

/**
 * Push the rendered card out into the world, best channel first:
 * Web Share with the image attached (mobile) → PNG on the clipboard
 * (desktop Chrome/Edge/Safari) → plain download as a last resort.
 */
export async function shareCardImage(
  blob: Blob,
  text: string,
  filename: string,
): Promise<ImageShareOutcome> {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ text, files: [file] });
      return "shared";
    } catch {
      // Cancelled or failed — fall through.
    }
  }
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return "copied-image";
    } catch {
      // Clipboard blocked — fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
