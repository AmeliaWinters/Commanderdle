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
          <strong>Commandle</strong> is your free daily{" "}
          <em>Magic: The Gathering</em> Commander (EDH) dle game. One commander
          drops every day, and your job is to figure out who it is. No download,
          no login, no catch. Open the page, take a few guesses, and get on with
          your day.
        </p>
        <p>
          Yes, it's another "-dle". I play a few 'dle' games myself, and picked
          up MTG not long ago, and didn't find the current mtg dle games fun, so
          I decided to create this
        </p>
      </section>

      <section>
        <h3>The game modes</h3>
        <ul>
          <li>
            <strong>Classic</strong> - six tries to name the commander. Every
            guess gets scored across five columns (colour identity, card type,
            mana value, EDHREC popularity rank and price) so you know what's a
            hit, what's not, and whether to go higher or lower.
          </li>
          <li>
            <strong>Silhouette</strong> - name the commander from its art.
            Starts heavily blurred, gets clearer every time you miss.
          </li>
          <li>
            <strong>Zoom</strong> - an extreme close-up of the art that slowly
            pulls back with each wrong guess.
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
            two commanders gets built more on EDHREC?
          </li>
        </ul>
        <p>
          Missed a day? No biggie cos the <a href="/archive">puzzle archive</a>{" "}
          has every past puzzle in every mode, ready whenever you are.
        </p>
      </section>

      <section>
        <h3>Where the data comes from</h3>
        <p>
          Card images and details come from{" "}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>
          , and the popularity and synergy numbers come from{" "}
          <a href="https://edhrec.com" target="_blank" rel="noreferrer">
            EDHREC
          </a>
          . Whenever the game says "Rank," it means the commander's EDHREC rank
          . Thank you to both!
        </p>
      </section>

      <section>
        <h3>An unofficial fan project</h3>
        <p>
          Commandle is an independent, non-commercial fan project made by me, a
          person who doesn't have an active enough pod. It's not produced,
          endorsed, or affiliated with Wizards of the Coast. Magic: The
          Gathering, Commander, and all card names and images are trademarks of
          and &copy; Wizards of the Coast LLC, used here under WOTC's Fan
          Content Policy.
        </p>
        <p>
          Got feedback, found a bug, or have a big-brain feature idea? Go to{" "}
          <a href="/contact">contact page</a> and let me know.
        </p>
      </section>
    </ContentPage>
  );
}
