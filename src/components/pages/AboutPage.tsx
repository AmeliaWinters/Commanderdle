import ContentPage from "./ContentPage";

export default function AboutPage() {
  return (
    <ContentPage
      title="Commandle — About the daily Magic: The Gathering commander game"
      description="Commandle is a free daily guessing game for Magic: The Gathering Commander (EDH) fans. Learn what it is, how a new puzzle is chosen each day, and where the data comes from."
      canonical="https://commandle.com/about"
    >
      <h2>About Commandle</h2>

      <section>
        <p>
          <strong>Commandle</strong> is a free daily browser game for fans of{" "}
          <em>Magic: The Gathering</em> and, in particular, the Commander (EDH)
          format. Every day there is one new mystery commander to identify, and
          the whole world plays the same puzzle. It takes a couple of minutes,
          it&rsquo;s free, and there is nothing to install &mdash; just open the
          page and guess.
        </p>
        <p>
          The game was inspired by the wave of daily &ldquo;-dle&rdquo; word
          and trivia games, reimagined for the deep, quirky card pool of
          Commander. Instead of guessing a five-letter word, you&rsquo;re
          hunting down a legendary creature from tens of thousands of printed
          cards, using clues about its colours, mana value, popularity, card
          art, flavour text and the cards it&rsquo;s built around.
        </p>
      </section>

      <section>
        <h3>The game modes</h3>
        <ul>
          <li>
            <strong>Classic</strong> &mdash; guess the commander in six tries.
            Each guess is scored across five columns (colour identity, card
            type, mana value, EDHREC popularity rank and price), telling you
            what you got right, what&rsquo;s close, and whether the true answer
            is higher or lower.
          </li>
          <li>
            <strong>Silhouette</strong> &mdash; name the commander from its card
            art, which starts heavily blurred and sharpens with every miss.
          </li>
          <li>
            <strong>Zoom</strong> &mdash; identify the commander from an extreme
            close-up crop of its art that widens with each wrong guess.
          </li>
          <li>
            <strong>Synergy</strong> &mdash; work out the commander from the
            cards that pair best with it, revealed one at a time.
          </li>
          <li>
            <strong>Quote</strong> &mdash; recognise the commander from the
            flavour text printed on its card.
          </li>
          <li>
            <strong>Higher / Lower</strong> &mdash; an endless bonus mode: which
            of two commanders is built more often on EDHREC?
          </li>
        </ul>
        <p>
          Missed a day? The <a href="/archive">puzzle archive</a> lets you play
          back every past puzzle in any mode.
        </p>
      </section>

      <section>
        <h3>Where the data comes from</h3>
        <p>
          Card images and card details are sourced from{" "}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>
          , and the popularity and synergy figures come from{" "}
          <a href="https://edhrec.com" target="_blank" rel="noreferrer">
            EDHREC
          </a>
          , the community deck-building database. &ldquo;Popularity&rdquo;
          throughout the game refers to a commander&rsquo;s EDHREC rank &mdash;
          the number of decks players have registered with that commander at the
          helm.
        </p>
      </section>

      <section>
        <h3>An unofficial fan project</h3>
        <p>
          Commandle is an independent, non-commercial fan project. It is not
          produced, endorsed, supported or affiliated with Wizards of the Coast.
          <em> Magic: The Gathering</em>, Commander, and all associated card
          names and images are trademarks of and &copy; Wizards of the Coast
          LLC. The game is offered under Wizards&rsquo; Fan Content Policy.
        </p>
        <p>
          Have feedback, spotted a bug, or want to suggest a feature? Email{" "}
          <a href="mailto:anonylunt@gmail.com">anonylunt@gmail.com</a>.
        </p>
      </section>
    </ContentPage>
  );
}
