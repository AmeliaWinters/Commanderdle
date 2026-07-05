import ContentPage from "./ContentPage";

export default function TermsPage() {
  return (
    <ContentPage
      title="Commandle - Terms of Service"
      description="The terms of service for Commandle, the free daily Magic: The Gathering commander guessing game: acceptable use, intellectual property, advertising, disclaimers and liability."
      canonical="https://commandle.com/terms"
    >
      <h2>Terms of Service</h2>
      <p className="privacy-date">Last updated: 5 July 2026</p>

      <section>
        <p>
          By accessing or using Commandle (the "site") you agree to
          these Terms of Service. If you do not agree, please do not use the
          site. I may update these terms from time to time; the
          "last updated" date above reflects the current version, and
          continued use after changes constitutes acceptance.
        </p>
      </section>

      <section>
        <h3>The service</h3>
        <p>
          Commandle is a free, browser-based daily guessing game for{" "}
          <em>Magic: The Gathering</em> fans. It is provided for personal,
          non-commercial entertainment. I may add, change, suspend or
          discontinue any part of the game at any time without notice.
        </p>
      </section>

      <section>
        <h3>Acceptable use</h3>
        <p>You agree not to:</p>
        <ul>
          <li>
            use automated tools (bots, scrapers, scripts) to interact with the
            game, its answers or its statistics;
          </li>
          <li>
            attempt to disrupt, overload, reverse-engineer or gain unauthorised
            access to the site or its systems;
          </li>
          <li>
            interfere with the advertising displayed on the site, including by
            generating invalid clicks or impressions; or
          </li>
          <li>
            use the site in any way that is unlawful or that infringes the
            rights of others.
          </li>
        </ul>
      </section>

      <section>
        <h3>Intellectual property</h3>
        <p>
          <em>Magic: The Gathering</em>, Commander, and all associated card
          names, artwork and imagery are trademarks of and &copy; Wizards of the
          Coast LLC. Commandle is an unofficial fan project offered under
          Wizards' Fan Content Policy and is not affiliated with, endorsed
          or sponsored by Wizards of the Coast. Card data and images are
          provided by{" "}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>{" "}
          and{" "}
          <a href="https://edhrec.com" target="_blank" rel="noreferrer">
            EDHREC
          </a>
          , subject to their respective terms. The game's own code,
          layout and original text remain the property of its creator.
        </p>
      </section>

      <section>
        <h3>Advertising</h3>
        <p>
          The site is supported by advertising served by third parties,
          including Google AdSense. Your interaction with advertisers is solely
          between you and them; I am not responsible for the content, products
          or services of any advertiser. See my{" "}
          <a href="/privacy">privacy policy</a> for how advertising cookies are
          used.
        </p>
      </section>

      <section>
        <h3>Disclaimer of warranties</h3>
        <p>
          The site is provided "as is" and "as
          available" without warranties of any kind, whether express or
          implied. I do not warrant that the game will be uninterrupted,
          error-free, or that puzzle data will always be accurate or complete.
        </p>
      </section>

      <section>
        <h3>Limitation of liability</h3>
        <p>
          To the fullest extent permitted by law, Commandle and its creator
          shall not be liable for any indirect, incidental or consequential
          damages arising out of your use of, or inability to use, the site.
        </p>
      </section>

      <section>
        <h3>Contact</h3>
        <p>
          Questions about these terms? Get in touch via my{" "}
          <a href="/contact">contact page</a>.
        </p>
      </section>
    </ContentPage>
  );
}
