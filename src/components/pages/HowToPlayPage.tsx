import ContentPage from "./ContentPage";

export default function HowToPlayPage() {
  return (
    <ContentPage
      title="How to play Commandle — rules, clues and strategy"
      description="A complete guide to playing Commandle, the daily Magic: The Gathering commander guessing game. Learn every mode, what the colour clues mean, and tips to solve the puzzle in fewer guesses."
      canonical="https://commandle.com/how-to-play"
    >
      <h2>How to play Commandle</h2>

      <section>
        <p>
          The goal is simple: identify the day&rsquo;s hidden{" "}
          <em>Magic: The Gathering</em> commander in as few guesses as possible.
          Type the name of any legendary creature into the box &mdash; the game
          autocompletes from the full pool of eligible commanders &mdash; and
          each guess gives you feedback that narrows down the answer. Everyone
          plays the same puzzle each day, and your progress is saved in your
          browser so you can come back and finish later.
        </p>
      </section>

      <section>
        <h3>Classic mode: reading the clues</h3>
        <p>
          In Classic mode you have <strong>six guesses</strong>. Every guess is
          compared to the answer across five columns, and each cell is coloured:
        </p>
        <ul>
          <li>
            <strong>🟩 Green</strong> &mdash; an exact match for that attribute.
          </li>
          <li>
            <strong>🟨 Amber</strong> &mdash; partially right. For colour
            identity it means you share some but not all colours; for a number
            it means you&rsquo;re close.
          </li>
          <li>
            <strong>⬛ Grey</strong> &mdash; no match at all.
          </li>
          <li>
            <strong>▲ / ▼ arrows</strong> &mdash; on the Mana Value, Popularity
            and Price columns an arrow tells you whether the true answer is
            higher or lower than your guess.
          </li>
        </ul>
        <p>
          The five columns are <strong>colour identity</strong>,{" "}
          <strong>card type</strong>, <strong>mana value</strong>,{" "}
          <strong>popularity</strong> (the commander&rsquo;s EDHREC rank, where
          #1 is the most-built commander of all time) and{" "}
          <strong>price</strong> (the approximate market price of the card).
        </p>
      </section>

      <section>
        <h3>The art and clue modes</h3>
        <p>
          The other daily modes give you a different kind of clue and usually
          five guesses:
        </p>
        <ul>
          <li>
            <strong>Silhouette</strong> shows the card art heavily blurred; it
            sharpens with each wrong guess.
          </li>
          <li>
            <strong>Zoom</strong> starts on an extreme close-up crop of the art
            and widens the view every time you miss.
          </li>
          <li>
            <strong>Synergy</strong> reveals the cards most associated with the
            commander on EDHREC, one more with every wrong guess.
          </li>
          <li>
            <strong>Quote</strong> shows the flavour text printed on the card,
            unlocking extra hints (colour identity, stat total, release year)
            as you miss.
          </li>
        </ul>
        <p>
          In the art and clue modes you can also <strong>skip</strong> a guess
          to reveal the next hint without spending one of your named guesses.
        </p>
      </section>

      <section>
        <h3>Tips to solve in fewer guesses</h3>
        <ul>
          <li>
            <strong>Open wide.</strong> Start with a well-known, mid-range
            commander to quickly triangulate colour identity and popularity
            before committing.
          </li>
          <li>
            <strong>Follow the arrows.</strong> The higher/lower arrows on mana
            value and popularity are the fastest way to halve the remaining
            field &mdash; treat it like a binary search.
          </li>
          <li>
            <strong>Lock colours first.</strong> Once you have a green colour
            identity, only guess commanders that share exactly those colours.
          </li>
          <li>
            <strong>Use the card pool peek.</strong> After a few misses the game
            lets you view the shortlist of remaining candidates &mdash; a big
            help on the tougher modes.
          </li>
          <li>
            <strong>Think in archetypes.</strong> In Synergy mode the revealed
            cards usually point at a well-known strategy (tokens, +1/+1
            counters, reanimator) that only a handful of commanders lead.
          </li>
        </ul>
      </section>

      <section>
        <h3>Streaks, stats and the archive</h3>
        <p>
          Solving the daily puzzle builds your win streak, and the game tracks
          your guess distribution per mode. Curious how you stack up? Each
          finished puzzle also shows global stats &mdash; the share of players
          who solved it and in how many guesses. And if you want more, the{" "}
          <a href="/archive">archive</a> holds every past puzzle in every mode.
        </p>
        <p>
          Ready to play? <a href="/">Jump into today&rsquo;s puzzle.</a>
        </p>
      </section>
    </ContentPage>
  );
}
