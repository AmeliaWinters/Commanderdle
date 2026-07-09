import ContentPage from "./ContentPage";

export default function HowToPlayPage() {
  return (
    <ContentPage
      title="How to play Commandle - rules, clues, and strategy"
      description="A complete guide to playing Commandle - MTG Commander Guessing Game."
      canonical="https://commandle.app/how-to-play"
    >
      <h2>How to play Commandle</h2>

      <section>
        <p>
          The goal is simple: identify the day&rsquo;s hidden{" "}
          <em>Magic: The Gathering</em> commander in as few guesses as you can.
          Start typing any legendary creature and the box autocompletes from the
          full pool of eligible commanders. Every guess feeds back clues that
          narrow things down. Everyone plays the same puzzle each day, and your
          progress saves in your browser so you can go and finish later.
        </p>
      </section>

      <section>
        <h3>Classic mode: reading the clues</h3>
        <p>
          Classic gives you <strong>six guesses</strong>. Each one gets stacked
          against the answer across five columns, and every cell lights up a
          colour:
        </p>
        <ul>
          <li>
            <strong>🟩 Green</strong> - you got it, exact match.
          </li>
          <li>
            <strong>🟨 Amber</strong> - close. For colour identity you share
            some colours but not all; for a number you're in the close neighbourhood.
          </li>
          <li>
            <strong>⬛ Grey</strong> - nope, cold, no bueno, no match, far away.
          </li>
          <li>
            <strong>▲ / ▼ arrows</strong> - on Mana Value, Popularity and Price,
            the arrow points you toward the real answer (higher or lower than
            your guess).
          </li>
        </ul>
        <p>
          The five columns are <strong>colour identity</strong>,{" "}
          <strong>card type</strong>, <strong>mana value</strong>,{" "}
          <strong>popularity</strong> (the commander's EDHREC rank, where #1 is
          the most-built commander of the past 2 years) and <strong>price</strong> (the
          approximate market price of the card).
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
            unlocking extra hints (colour identity, stat total, release year) as
            you miss.
          </li>
        </ul>
        <p>
          In the art and clue modes you can also <strong>skip</strong> to reveal
          the next hint.
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
            value and popularity halve the field fast.
          </li>
          <li>
            <strong>Colours first.</strong> Once a colour identity goes green,
            only guess commanders with exactly those colours.
          </li>
          <li>
            <strong>Use the card pool.</strong> After a few misses the game
            shows the shortlist of who's still in the running, clutch on the
            harder modes.
          </li>
          <li>
            <strong>Think in archetypes</strong> In Synergy, the revealed cards
            usually point at a strategy (tokens, +1/+1 counters, reanimator)
            that only a handful of commanders actually lead.
          </li>
        </ul>
      </section>

      <section>
        <h3>Streaks, stats and the archive</h3>
        <p>
          Solve the daily and your win streak climbs, plus the game tracks your
          guess distribution per mode. Every finished puzzle shows global stats
          - how many players solved it and in how many guesses. Want even more?
          The <a href="/archive">archive</a> has every past puzzle in every
          mode.
        </p>
        <p>
          Alright, enough readingggg{"       "}{" "}
          <a href="/classic">go play today's puzzle!</a>
        </p>
      </section>
    </ContentPage>
  );
}
