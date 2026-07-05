import ContentPage from "./ContentPage";

export default function AboutPage() {
  return (
    <ContentPage
      title="Commandle - About the daily Magic: The Gathering commander game"
      description="Commandle is a free daily guessing game for Magic: The Gathering Commander (EDH) fans. Learn what it is, how a new puzzle is chosen each day, and where the data comes from."
      canonical="https://commandle.com/about"
    >
      <h2>About Commandle</h2>

      <section>
        <p>
          <strong>Commandle</strong> is a free daily browser game for fans of{" "}
          <em>Magic: The Gathering</em> and, in particular, the Commander (EDH)
          format. Every day there is one new mystery commander to identify. It
          only takes a couple of minutes, it is free, and there is nothing to
          install. Just open the page and guess.
        </p>
        <p>
          The game was inspired by the wave of daily "-dle" word and trivia
          games, reimagined for the Commander format of MTG.
        </p>
      </section>

      <section>
        <h3>The game modes</h3>
        <ul>
          <li>
            <strong>Classic</strong> - guess the commander in six tries. Each
            guess is scored across five columns (colour identity, card type,
            mana value, EDHREC popularity rank and price), telling you what you
            got right, what&rsquo;s hot or cold, and whether the commander is
            higher or lower.
          </li>
          <li>
            <strong>Silhouette</strong> - name the commander from its card art,
            which starts heavily blurred and sharpens with every miss.
          </li>
          <li>
            <strong>Zoom</strong> - identify the commander from an extreme
            close-up crop of its art that widens with each wrong guess.
          </li>
          <li>
            <strong>Synergy</strong> - work out the commander from the cards
            that pair more often with it than other same-colored commanders,
            revealed one at a time.
          </li>
          <li>
            <strong>Quote</strong> - recognise the commander from the flavour
            text printed on its card.
          </li>
          <li>
            <strong>Higher / Lower</strong> - an endless bonus mode: which of
            two commanders is built more often on EDHREC?
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
          . "Rank" throughout the game refers to a commander's EDHREC rank. This
          is how popular the commander is according to the EDHREC database.
        </p>
      </section>

      <section>
        <h3>An unofficial fan project</h3>
        <p>
          Commandle is an independent, non-commercial fan project. It is not
          produced, endorsed, supported or affiliated with Wizards of the Coast.
          Magic: The Gathering, Commander, and all associated card names and
          images are trademarks of and &copy; Wizards of the Coast LLC. The game
          is offered under WOTC's Fan Content Policy.
        </p>
        <p>
          Have feedback, spotted a bug, or want to suggest a feature? Head to
          our <a href="/contact">contact page</a> and send us a message.
        </p>
      </section>
    </ContentPage>
  );
}
