import type { CellCode } from "./shareCode";

/**
 * Client-side renderer for the branded share card: a PNG of the result grid
 * dressed in the site's flame identity (dark panel, ember glows, Cinzel
 * heading), sized for social feeds. Rendered on demand with <canvas> — no
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

// Palette mirrored from index.css custom properties.
const BG = "#0b0b0d";
const PANEL = "#161619";
const LINE = "#2c2c34";
const TEXT = "#f4f4f6";
const DIM = "#9b9ba6";
const FLAME_1 = "#f6a01a";
const FLAME_2 = "#ec5a1c";
const FLAME_3 = "#c01f1f";

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

export async function renderShareCard(opts: ShareCardOpts): Promise<Blob> {
  // Make sure the brand fonts are usable on the canvas before drawing.
  try {
    await Promise.all([
      document.fonts.load('700 80px "Cinzel"'),
      document.fonts.load('500 40px "EB Garamond"'),
    ]);
  } catch {
    // Fonts unavailable — serif fallbacks below still read fine.
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  // Background + ember orbs.
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  orb(ctx, W * 0.22, H * 0.24, 440, "236, 90, 28", 0.22);
  orb(ctx, W * 0.82, H * 0.78, 480, "192, 31, 31", 0.2);
  orb(ctx, W * 0.65, H * 0.12, 380, "246, 160, 26", 0.14);

  // Flame-gradient heading, mirroring the site logo (Comman + dle).
  const grad = ctx.createLinearGradient(0, 150, W, 260);
  grad.addColorStop(0, FLAME_1);
  grad.addColorStop(1, FLAME_3);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = grad;
  ctx.font = '700 96px "Cinzel", Georgia, serif';
  ctx.fillText("COMMANDLE", W / 2, 190);

  // Mode + puzzle number + score.
  ctx.fillStyle = TEXT;
  ctx.font = '700 52px "Cinzel", Georgia, serif';
  const puzzleBit = opts.puzzle != null ? ` #${opts.puzzle}` : " (practice)";
  ctx.fillText(`${opts.modeLabel}${puzzleBit}  —  ${opts.score}`, W / 2, 286);

  // Result grid, centered in a rounded panel.
  const rows = opts.grid.length;
  const cols = Math.max(1, ...opts.grid.map((r) => r.length));
  const cell = Math.min(96, 620 / cols, 560 / Math.max(rows, 1));
  const gap = Math.round(cell * 0.14);
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  const pad = 44;
  const panelW = gridW + pad * 2;
  const panelH = gridH + pad * 2;
  const panelX = (W - panelW) / 2;
  const panelY = 340 + (560 - panelH) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(236, 90, 28, 0.35)";
  ctx.shadowBlur = 60;
  ctx.fillStyle = PANEL;
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = FLAME_2;
  ctx.lineWidth = 3;
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

  // Footer.
  ctx.fillStyle = DIM;
  ctx.font = 'italic 500 40px "EB Garamond", Georgia, serif';
  ctx.fillText("Guess the daily MTG commander", W / 2, H - 116);
  ctx.fillStyle = FLAME_1;
  ctx.font = '700 44px "Cinzel", Georgia, serif';
  ctx.fillText(opts.site, W / 2, H - 56);

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
