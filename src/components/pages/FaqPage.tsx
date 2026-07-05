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
        Commandle is a free daily guessing game for <em>Magic: The Gathering</em>{" "}
        Commander (EDH) fans. Each day there is one hidden commander to identify
        using clues about its colours, mana value, popularity, card art, flavour
        text and synergies. See the <a href="/how-to-play">how to play</a> guide
        for the full rules.
      </>
    ),
  },
  {
    q: "How often are new puzzles released?",
    a: (
      <>
        A brand-new puzzle for every mode goes live each day at midnight in your
        local time. Everyone in the same day plays the same commander, so you
        can compare results with friends.
      </>
    ),
  },
  {
    q: "Can I play puzzles I missed?",
    a: (
      <>
        Yes. The <a href="/archive">puzzle archive</a> lets you play back any
        past day in any mode. Archive puzzles don&rsquo;t affect your daily
        streak, so you can practise freely.
      </>
    ),
  },
  {
    q: "What does “popularity” mean?",
    a: (
      <>
        Popularity refers to a commander&rsquo;s rank on{" "}
        <a href="https://edhrec.com" target="_blank" rel="noreferrer">
          EDHREC
        </a>
        , based on how many decks the community has registered with that
        commander in charge. A rank of #1 means it is the most-built commander.
      </>
    ),
  },
  {
    q: "Which commanders can appear as answers?",
    a: (
      <>
        Answers are drawn from the pool of legendary creatures (and other cards)
        that can legally be a Commander in the EDH format. To keep the game
        fair, daily answers favour reasonably well-known commanders rather than
        the most obscure printings, though the pool is large and varied.
      </>
    ),
  },
  {
    q: "Is my progress saved?",
    a: (
      <>
        Yes &mdash; your guesses, results and streaks are stored locally in your
        browser, so you can close the tab and come back to finish. Nothing is
        tied to an account, and clearing your browser data will reset your
        history.
      </>
    ),
  },
  {
    q: "Is Commandle free? How is it funded?",
    a: (
      <>
        Commandle is completely free to play. Running costs are covered by
        unobtrusive advertising served through Google AdSense. See our{" "}
        <a href="/privacy">privacy policy</a> for how advertising cookies are
        used and how to opt out of personalised ads.
      </>
    ),
  },
  {
    q: "Is this an official Wizards of the Coast product?",
    a: (
      <>
        No. Commandle is an unofficial, non-commercial fan project. It is not
        affiliated with, endorsed by or produced by Wizards of the Coast.{" "}
        <em>Magic: The Gathering</em> and all card names and images are
        trademarks of and &copy; Wizards of the Coast LLC.
      </>
    ),
  },
  {
    q: "I found a bug or have a suggestion. How do I get in touch?",
    a: (
      <>
        We&rsquo;d love to hear it. Email{" "}
        <a href="mailto:anonylunt@gmail.com">anonylunt@gmail.com</a> with any
        bugs, feedback or feature ideas.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <ContentPage
      title="Commandle FAQ — frequently asked questions"
      description="Answers to common questions about Commandle, the daily Magic: The Gathering commander guessing game: how puzzles work, playing past days, how popularity is measured, and more."
      canonical="https://commandle.com/faq"
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
