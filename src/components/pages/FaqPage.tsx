import ContentPage from "./ContentPage";

interface QA {
  q: string;
  a: React.ReactNode;
}

const FAQS: QA[] = [
  {
    q: "What is Commandle?",
    a: (
      <>
        It's a free daily guessing game for Magic: The Gathering Commander (EDH)
        fans. Every day there's one hidden commander to identify using clues
        about its colours, mana value, popularity, card art, flavour text and
        synergies. Want more help? Check the{" "}
        <a href="/how-to-play">how to play</a> guide.
      </>
    ),
  },
  {
    q: "How often do new puzzles drop?",
    a: (
      <>
        New puzzles for every mode go live daily at midnight your local time.
        Everyone gets the same commander that day, so you and your pod can flex
        together.
      </>
    ),
  },
  {
    q: "Can I play puzzles I missed?",
    a: (
      <>
        Ya. The <a href="/archive">puzzle archive</a> has every past day in
        every mode. Archive runs don't touch your daily streak.
      </>
    ),
  },
  {
    q: "What does 'Rank' mean?",
    a: (
      <>
        Rank is the commander's spot on{" "}
        <a href="https://edhrec.com" target="_blank" rel="noreferrer">
          EDHREC
        </a>
        , based on how many decks the community has registered with it at the
        helm. Rank #1 = the most-built commander of the past 2 years.
      </>
    ),
  },
  {
    q: "Which commanders can show up as answers?",
    a: (
      <>
        Any legendary that can legally sit in the command zone in EDH. To keep
        things fair and accessible, daily answers lean toward commanders people
        actually know.
      </>
    ),
  },
  {
    q: "What happens to my streak if I miss a day?",
    a: (
      <>
        You've got insurance. Every 10 days you play banks one streak freeze, and
        each missed day quietly spends one to keep your streak alive, so a
        busy Tuesday won't torch a 40-day run. Freezes only cover days you
        didn't play at all; a finished loss still ends a win streak. Your
        banked total shows with your stats.
      </>
    ),
  },
  {
    q: "Is my progress saved?",
    a: (
      <>
        Yep! Your guesses, results and streaks live locally in your browser, so
        you can close the tab and finish later. There's no account involved.
        Just heads up that clearing your browser data wipes your history.
      </>
    ),
  },
  {
    q: "Is Commandle free? How is it kept running?",
    a: (
      <>
        Yes! I keep the lights on with (hopefully!) low-key ads through
        Google AdSense and some cosmetics to accounts via Ko-fi
        donations. Check the <a href="/privacy">privacy policy</a> for how
        advertising cookies work and how to opt out of personalised ads.
      </>
    ),
  },
  {
    q: "Is this an official Wizards of the Coast product?",
    a: (
      <>
        Nope. Commandle is an unofficial, non-commercial fan project. It is not
        affiliated with, endorsed by, or produced by Wizards of the Coast.
        Magic: The Gathering and all card names and images are trademarks of and
        &copy; Wizards of the Coast LLC.
      </>
    ),
  },
  {
    q: "I found a bug or have an idea. How do I reach you?",
    a: (
      <>
        Go to my <a href="/contact">contact page</a>.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <ContentPage
      title="Commandle FAQ - frequently asked questions"
      description="Answers to common questions about Commandle - MTG Commander Guessing Game: how puzzles work, playing past days, how popularity is measured, etc."
      canonical="https://commandle.app/faq"
    >
      <h2>Frequently asked questions</h2>
      {FAQS.map(({ q, a }) => (
        <section key={q}>
          <h3>{q}</h3>
          <p>{a}</p>
        </section>
      ))}
    </ContentPage>
  );
}
