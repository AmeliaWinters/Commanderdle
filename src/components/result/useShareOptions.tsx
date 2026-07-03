import { useState, useEffect } from "react";
import type { Commander, Mode } from "../../types/commander";
import { puzzleNumber } from "../../lib/dailyAnswer";
import { shareOrCopy, shareOrigin } from "../../lib/share";
import { buildShareUrl, encodeGrid, MODE_LABEL } from "../../lib/shareCode";
import { buildGrid, buildGridCodes } from "../../lib/shareGrids";
import { buildDailyRecap } from "../../lib/dailyRecap";
import {
  renderShareCard,
  shareCardImage,
  type ImageShareOutcome,
} from "../../lib/shareImage";
import type { ShareOption } from "../ShareMenu";
import { FiType, FiImage, FiZap, FiList } from "react-icons/fi";

interface Args {
  status: "won" | "lost";
  answer: Commander;
  guesses: Commander[];
  mode: Mode;
  isDaily: boolean;
  score: string;
  countdown: string;
}

/**
 * All the ways a finished game can be shared — emoji-grid text, branded image
 * card, head-to-head challenge link, and the all-modes daily recap — bundled as
 * ready-to-render ShareMenu options with their copy/share feedback state.
 */
export function useShareOptions({
  status,
  answer,
  guesses,
  mode,
  isDaily,
  score,
  countdown,
}: Args): ShareOption[] {
  const [copied, setCopied] = useState(false);
  const [challenged, setChallenged] = useState(false);
  const [recapCopied, setRecapCopied] = useState(false);
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [imgSent, setImgSent] = useState<ImageShareOutcome | null>(null);

  const flash = (set: (v: boolean) => void) => {
    set(true);
    setTimeout(() => set(false), 2000);
  };

  // A shareable link that unfurls into a per-result preview card and drops the
  // recipient onto today's exact puzzle. Daily only — practice/archive have no shared day.
  const resultUrl = isDaily
    ? buildShareUrl(
        shareOrigin(),
        mode,
        puzzleNumber(),
        encodeGrid(buildGridCodes(mode, guesses, answer)),
      )
    : null;

  // Render the branded share card once per result. The object URL doubles as
  // an inline preview so players can see what they'd be posting.
  useEffect(() => {
    let alive = true;
    renderShareCard({
      modeLabel: MODE_LABEL[mode],
      puzzle: isDaily ? puzzleNumber() : null,
      score,
      grid: buildGridCodes(mode, guesses, answer),
      site: shareOrigin().replace(/^https?:\/\//, ""),
    }).then(
      (blob) => {
        if (alive) setImgBlob(blob);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, guesses.length, status]);

  const heading = isDaily
    ? `Commandle ${MODE_LABEL[mode]} #${puzzleNumber()} ${score}`
    : `Commandle ${MODE_LABEL[mode]} (practice) ${score}`;

  const shareImage = () => {
    if (!imgBlob) return;
    const text = resultUrl ? `${heading}\n${resultUrl}` : heading;
    const filename = isDaily
      ? `commandle-${mode}-${puzzleNumber()}.png`
      : `commandle-${mode}-practice.png`;
    shareCardImage(imgBlob, text, filename).then(
      (outcome) => {
        setImgSent(outcome);
        setTimeout(() => setImgSent(null), 2000);
      },
      () => {},
    );
  };

  const share = () => {
    const grid = buildGrid(mode, guesses, answer, status);
    // Daily results nudge a return visit with the countdown + a playable link.
    const footer = resultUrl ? `\n${resultUrl}` : "";
    const text = `${heading}\n${grid}${footer}`;
    shareOrCopy(text).then(
      () => flash(setCopied),
      () => {},
    );
  };

  // Head-to-head variant: same playable link, framed as a dare.
  const challenge = () => {
    if (!resultUrl) return;
    const verb = status === "won" ? `in ${score}` : "and it beat me";
    const text = `I played today's Commandle ${MODE_LABEL[mode]} ${verb} — think you can beat me?\n${resultUrl}`;
    shareOrCopy(text).then(
      () => flash(setChallenged),
      () => {},
    );
  };

  // Aggregated recap of every mode finished today (daily only).
  const recap = isDaily ? buildDailyRecap() : null;
  const shareRecap = () => {
    if (!recap) return;
    const text = `${recap}\nNext commander in ${countdown}\n${shareOrigin()}`;
    shareOrCopy(text).then(
      () => flash(setRecapCopied),
      () => {},
    );
  };

  const imageDone =
    imgSent === "shared"
      ? "Shared!"
      : imgSent === "copied-image"
        ? "Image copied!"
        : imgSent === "downloaded"
          ? "Saved!"
          : null;

  const options: ShareOption[] = [
    {
      key: "text",
      label: "Share as text",
      hint: "Emoji grid + link",
      icon: <FiType aria-hidden="true" />,
      done: copied ? "Copied!" : null,
      onSelect: share,
    },
  ];
  if (imgBlob)
    options.push({
      key: "image",
      label: "Share as image",
      hint: "Branded result card",
      icon: <FiImage aria-hidden="true" />,
      done: imageDone,
      onSelect: shareImage,
    });
  if (resultUrl)
    options.push({
      key: "challenge",
      label: "Challenge a friend",
      hint: "Dare them to beat you",
      icon: <FiZap aria-hidden="true" />,
      done: challenged ? "Copied!" : null,
      onSelect: challenge,
    });
  if (recap)
    options.push({
      key: "recap",
      label: "Share today's recap",
      hint: "Every mode you played",
      icon: <FiList aria-hidden="true" />,
      done: recapCopied ? "Copied!" : null,
      onSelect: shareRecap,
    });
  return options;
}
