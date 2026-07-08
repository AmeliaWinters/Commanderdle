/**
 * Dynamic social-preview image for a shared result. Renders a branded 1200×630 PNG showing
 * the mode, puzzle number, score, and the spoiler-free colour grid — the Framed/Wordle-style
 * card that makes every shared link a rich preview.
 *
 * Runs as a Cloudflare Pages Function (edge, stateless). `workers-og` (satori + resvg wasm)
 * turns the HTML string below into a PNG. This can only be exercised on a real Pages deploy
 * or via `wrangler pages dev`, not the plain Vite dev server.
 */
import { ImageResponse } from "workers-og";
import {
  decodeGrid,
  deriveResult,
  isShareMode,
  isValidGridCode,
  MODE_LABEL,
  type CellCode,
} from "../../../../src/lib/shareCode";

interface Params {
  mode: string;
  puzzle: string;
  grid: string;
}

const CELL_COLOR: Record<CellCode, string> = {
  0: "#2c2c34", // grey / none
  1: "#e3ab26", // amber / partial
  2: "#38b461", // green / exact
  3: "#bd4150", // red / visual-wrong
};

/**
 * Fetch the Cinzel display font once per isolate (legacy UA forces TTF over woff2). Resilient:
 * on any failure or a >4s stall it resolves null so the image still renders (satori's default
 * font) rather than hanging or erroring the request.
 */
let cinzelPromise: Promise<ArrayBuffer | null> | null = null;
function loadCinzel(): Promise<ArrayBuffer | null> {
  if (!cinzelPromise) {
    cinzelPromise = (async () => {
      try {
        const timeout = new Promise<null>((r) =>
          setTimeout(() => r(null), 4000),
        );
        const load = (async () => {
          const css = await (
            await fetch(
              "https://fonts.googleapis.com/css2?family=Cinzel:wght@900",
              {
                headers: { "User-Agent": "Mozilla/4.0" },
              },
            )
          ).text();
          const url = css.match(/https:\/\/[^)]+\.ttf/)?.[0];
          if (!url) return null;
          return (await fetch(url)).arrayBuffer();
        })();
        return await Promise.race([load, timeout]);
      } catch {
        return null;
      }
    })();
  }
  return cinzelPromise;
}

function gridMarkup(rows: CellCode[][], round: boolean): string {
  const size = rows.length > 4 || (rows[0]?.length ?? 0) > 3 ? 46 : 62;
  // Visual modes are a single pip row - draw circles; classic keeps rounded squares.
  const radius = round ? size / 2 : 10;
  const cells = (row: CellCode[]) =>
    row
      .map(
        (c) =>
          `<div style="display:flex;width:${size}px;height:${size}px;border-radius:${radius}px;background:${CELL_COLOR[c]};"></div>`,
      )
      .join("");
  return rows
    .map((row) => `<div style="display:flex;gap:8px;">${cells(row)}</div>`)
    .join("");
}

export const onRequest = async (context: {
  params: Params;
}): Promise<Response> => {
  const { mode, puzzle, grid } = context.params;
  if (!isShareMode(mode)) return new Response("Bad mode", { status: 400 });
  if (!isValidGridCode(grid)) return new Response("Bad grid", { status: 400 });

  const rows = decodeGrid(grid);
  const { won, score } = deriveResult(mode, grid);
  const label = MODE_LABEL[mode];
  const accent = won ? "#38b461" : "#ec5a1c";

  // satori requires every element to declare display:flex, a single root, and no stray
  // whitespace text siblings — so give every div display:flex and strip whitespace between tags.
  const html = `
    <div style="display:flex;flex-direction:column;width:1200px;height:630px;background:linear-gradient(160deg,#141419,#08080a);color:#f4f4f6;font-family:'Cinzel';">
      <div style="display:flex;width:1200px;height:10px;background:linear-gradient(90deg,#f6a01a,#ec5a1c,#c01f1f);"></div>
      <div style="display:flex;flex-direction:column;flex:1;padding:58px 72px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;flex-direction:column;">
            <div style="display:flex;font-size:32px;color:#9b9ba6;">COMMANDLE · ${label.toUpperCase()}</div>
            <div style="display:flex;font-size:82px;font-weight:900;color:#fafafc;">Puzzle #${puzzle}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;width:186px;height:186px;border-radius:26px;background:${accent};color:#0b0b0d;font-size:${score.length > 3 ? 60 : 74}px;font-weight:900;">${score}</div>
        </div>
        <div style="display:flex;flex:1;align-items:center;justify-content:center;">
          <div style="display:flex;flex-direction:column;gap:8px;">${gridMarkup(rows, mode !== "classic")}</div>
        </div>
        <div style="display:flex;justify-content:center;font-size:30px;color:#9b9ba6;">commandle.app</div>
      </div>
    </div>`;

  const markup = html.replace(/>\s+</g, "><").trim();

  const cinzel = await loadCinzel();
  return new ImageResponse(markup, {
    width: 1200,
    height: 630,
    fonts: cinzel
      ? [{ name: "Cinzel", data: cinzel, weight: 900, style: "normal" }]
      : undefined,
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
};
