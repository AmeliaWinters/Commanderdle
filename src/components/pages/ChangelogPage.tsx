import ContentPage from "./ContentPage";

interface Release {
  version: string;
  date?: string;
  title?: string;
  notes: string[];
}

const RELEASES: Release[] = [
  {
    title: "Welcome players!",
    version: "0.9.0",
    date: "2026-07-08",
    notes: [
      "Added the account system",
      "Added leaderboards",
      "Added cosmetic unlockables",
      "Design upgrades",
      "Fixed archive being broken if a commander goes out of top 500",
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
    title: "Even more modes",
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
    title: "Loadin faster",
    date: "2026-07-01",
    notes: [
      "Global solve stats",
      "Deduction row added",
      "Speeding up load times after bad speed test score",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-06-30",
    notes: ["Smoother animations", "Better mobile layout"],
  },
  {
    version: "0.4.0",
    date: "2026-06-29",
    notes: [
      "Reworked results screen and the synergy-percentage popover",
      "Reduced-motion support for a calmer experience and honoring prefers-reduced-motion",
    ],
  },
  {
    version: "0.3.0",
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
    date: "2026-06-20",
    notes: [
      "Mana pips for colour identity instead of text",
      "Self-hosting card art",
      "Added skipping",
      "Guesses trimmed from six to five",
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
