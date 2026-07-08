import ContentPage from "./ContentPage";

interface Release {
  version: string;
  date?: string;
  title?: string;
  notes: string[];
}

export const RELEASES: Release[] = [
  {
    version: "1.0.7",
    date: "2026-07-08",
    notes: [
      "Change XP and lvl up formula",
      "Allow .xx in Guess the Cost",
      "Changed win streak definition",
    ],
  },
  {
    version: "1.0.6",
    date: "2026-07-08",
    notes: [
      "Fixed community scores showing up with wrong stats",
      "Fixed local storage being preferred when logged in",
      "Public profiles now have viewable bonus stats and binders",
    ],
  },
  {
    version: "1.0.5",
    date: "2026-07-08",
    notes: [
      "Guess the cost warm ratio fixed",
      "Footer no longer goes above input on some browser",
    ],
  },
  {
    version: "1.0.4",
    date: "2026-07-08",
    notes: [
      "Improved the load times and performance of the binder page",
      "Improved deduce clues in classic",
    ],
  },
  {
    version: "1.0.3",
    date: "2026-07-08",
    notes: ["Zoom and silhouette mode balance changes"],
  },
  {
    version: "1.0.2",
    date: "2026-07-08",
    notes: ["Classic visual clarity changes"],
  },
  {
    version: "1.0.1",
    date: "2026-07-08",
    notes: [
      "Fixed a bug where daily results were sent on every refresh of the page",
    ],
  },
  {
    title: "Full Release!",
    version: "1.0.0",
    date: "2026-07-08",
    notes: [
      "Account page design improvements",
      "Card zoom no longer shows up on mobile on last guess",
      "Mythic supporters can now pick alternate art avatars",
      "Binder now follows account",
      "Various mobile bugfixes",
    ],
  },
  {
    version: "0.10.2",
    date: "2026-07-08",
    notes: [
      "Rate limiting implemented on results",
      "Added XSS safety",
      "Added intercepted request safety",
      "Ko-Fi donations now are properly converted",
      "Users can no longer archive to a future daily",
      "Verified emails can no longer be accidentally removed",
      "Footer is no longer duplicated on mobile",
      "Archive now scales with big numbers",
      "Changelog button how shows date of latest update",
      "Removed twitter support",
      "Account widget name and ring now consistent with account tier",
      "Account binder can no longer be spoofed",
      "Added mythic rare user ability to change flare colour",
    ],
  },
  {
    version: "0.10.1",
    date: "2026-07-08",
    notes: [
      "Fixed an issue where disabling access to local storage meant logged in users weren't able to save results",
    ],
  },
  {
    title: "Ko-Fi and supporters",
    version: "0.10.0",
    date: "2026-07-08",
    notes: [
      "Integration with Ko-Fi for automatic account tier upgrades",
      "Added supporter tiers explanations",
      "Added Ko-Fi buttons on main hub and account page",
      "The Creator Tier added",
      "Added binder collection to account",
      "About page covers more",
      "Small redesign tweaks",
    ],
  },
  {
    version: "0.9.3",
    date: "2026-07-08",
    notes: [
      "Changed terms and privacy policy to be a better fit for new account feature",
      "Same as above but for the about page",
    ],
  },
  {
    version: "0.9.2",
    date: "2026-07-08",
    notes: [
      "Added filters on usernames",
      "Added clearer deduction bounds fron x<3 to x-2",
      "Fixed unstyled archive button",
      "Fixed archive being broken if a commander goes out of top 500",
      "Account page now stores bonus game stats",
      "Added smoother loading",
      "Added colour pips for colour identities in grid (simic etc)",
      "Added giving up in grid",
    ],
  },
  {
    version: "0.9.1",
    date: "2026-07-08",
    notes: [
      "Fixed a leaderboard injection vulnerability",
      "Tidied up the game headers",
      "Added more space to leaderboards",
      "Made username choosing mandatory",
      "Fixed long-username bug",
      "Account page redesign",
      "Mythic supporters now have foil effects",
      "More free avatars for common users",
      "Tier colours are now used everywhere",
      "Fixed logging in on mobile",
      "Results screen shows XP earned",
      "Faster avatar picker doesn't load all 500 commander pictures at once",
      "Added disabling leaderboard visibility",
    ],
  },
  {
    title: "Welcome players!",
    version: "0.9.0",
    date: "2026-07-08",
    notes: [
      "Added the account system",
      "Added leaderboards",
      "Added cosmetic unlockables",
      "Design upgrades",
    ],
  },
  {
    version: "0.8.1",
    date: "2026-07-06",
    notes: ["Nicer looking back button"],
  },
  {
    version: "0.8.0",
    date: "2026-07-06",
    title: "Bonus modes and binder",
    notes: [
      "Added the grid mode",
      "Added the binder",
      "Improved archive design",
    ],
  },
  {
    version: "0.7.0",
    title: "Guess the cost",
    date: "2026-07-03",
    notes: [
      "Added the Guess the cost",
      "Added the games hub",
      "Commanderdle => Commandle",
    ],
  },
  {
    version: "0.6.0",
    title: "Performance upgrades",
    date: "2026-07-01",
    notes: [
      "Global solve stats",
      "Deduction row added",
      "Speeding up load times after bad speed test score",
    ],
  },
  {
    version: "0.5.0",
    title: "Mobile-friendly",
    date: "2026-06-30",
    notes: ["Smoother animations", "Better mobile layout"],
  },
  {
    version: "0.4.0",
    title: "New results screen",
    date: "2026-06-29",
    notes: [
      "Reworked results screen and the synergy-percentage popover",
      "Reduced-motion support for a calmer experience and honoring prefers-reduced-motion",
    ],
  },
  {
    version: "0.3.0",
    title: "Polish and archive",
    date: "2026-06-26",
    notes: [
      "Added puzzle archive",
      "Added stats panel",
      "Added next commander in...",
      "Added daily reminders",
      "Added share grinds",
      "Added some sick sound effects",
      "Added an install to home support for mobile",
    ],
  },
  {
    version: "0.2.0",
    title: "4 new daily modes",
    date: "2026-06-20",
    notes: [
      "Mana pips for colour identity instead of text",
      "Self-hosting card art",
      "Added skipping",
      "Guesses trimmed from six to five",
      "Added synergy mode",
      "Added zoom mode",
      "Added silhouette mode",
      "Added quote mode",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-06-17",
    notes: [
      "The very first Commandle game of classic grid with one hidden commander a day guess from clues",
    ],
  },
];

/** The newest release (RELEASES is maintained newest-first). */
export const LATEST_RELEASE = RELEASES[0];

/** Latest date formatted like "8 Jul 2026", or "" if the release has no date. */
export function formatReleaseDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ChangelogPage() {
  return (
    <ContentPage
      title="Commandle - Changelog"
      description="What's new in Commandle, the daily Magic: The Gathering commander guessing game. Release notes for every version, newest first."
      canonical="https://commandle.app/changelog"
    >
      <h2>Changelog</h2>
      {RELEASES.map((r) => (
        <section key={r.version} className="changelog-release">
          <h3>
            <span className="changelog-version">v{r.version}</span> {r.title}
            <span className="changelog-date">{r.date}</span>
          </h3>
          <ul>
            {r.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      ))}
    </ContentPage>
  );
}
