import ContentPage from "./pages/ContentPage";

export default function PrivacyPolicy() {
  return (
    <ContentPage
      title="Commandle Privacy Policy"
      description="How Commandle handles data: local browser storage for your puzzle progress, Google AdSense advertising cookies, analytics, and your choices under GDPR and CCPA."
      canonical="https://commandle.com/privacy"
    >
      <h2>Privacy Policy</h2>
      <p className="privacy-date">Last updated: 5 July 2026</p>

      <section>
        <h3>Who we are</h3>
        <p>
          Commandle (&ldquo;we&rdquo;, &ldquo;us&rdquo;, the
          &ldquo;site&rdquo;) is a free, unofficial fan game for{" "}
          <em>Magic: The Gathering</em>. It is not affiliated with or endorsed
          by Wizards of the Coast. This policy explains what data is processed
          when you use the site and the choices you have. If you have any
          questions, contact us through our{" "}
          <a href="/contact">contact page</a>.
        </p>
      </section>

      <section>
        <h3>Information we collect</h3>
        <p>
          We do not ask you to create an account and we do not collect data that
          directly identifies you (such as your name or email) unless you choose
          to email us. The information involved in running the site falls into
          three categories:
        </p>
        <ul>
          <li>
            <strong>Game progress.</strong> Your daily guesses, results,
            streaks and settings are stored entirely in your browser using{" "}
            <code>localStorage</code>. This data stays on your device and is not
            sent to us.
          </li>
          <li>
            <strong>Anonymous puzzle statistics.</strong> When you finish a
            puzzle we may record an anonymous, aggregate tally (for example
            &ldquo;solved in 4 guesses&rdquo;) so we can show global solve
            rates. These records are not linked to you or your device.
          </li>
          <li>
            <strong>Technical data.</strong> Like most websites, our hosting
            provider automatically processes standard technical information
            (such as IP address, browser type and requested pages) to deliver
            and secure the site.
          </li>
        </ul>
      </section>

      <section>
        <h3>Cookies and similar technologies</h3>
        <p>
          Cookies are small files stored on your device. We use{" "}
          <code>localStorage</code> to remember your game progress, and our
          advertising and analytics partners may set cookies as described below.
          You can clear or block cookies through your browser settings, though
          doing so may reset your saved progress.
        </p>
      </section>

      <section>
        <h3>Advertising (Google AdSense)</h3>
        <p>
          This site is funded by advertising served through Google AdSense.
          Third-party vendors, including Google, use cookies to serve ads based
          on your prior visits to this and other websites.
        </p>
        <ul>
          <li>
            Google&rsquo;s use of advertising cookies enables it and its
            partners to serve ads to you based on your visits to this site
            and/or other sites on the Internet.
          </li>
          <li>
            You may opt out of personalised advertising by visiting{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noreferrer"
            >
              Google Ads Settings
            </a>
            .
          </li>
          <li>
            You can also opt out of a third-party vendor&rsquo;s use of cookies
            for personalised advertising by visiting{" "}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noreferrer">
              aboutads.info
            </a>{" "}
            or{" "}
            <a href="https://www.youronlinechoices.eu" target="_blank" rel="noreferrer">
              youronlinechoices.eu
            </a>{" "}
            (EU).
          </li>
        </ul>
        <p>
          For more detail on how Google uses information from sites that use its
          services, see{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noreferrer"
          >
            How Google uses information from sites or apps that use our services
          </a>
          .
        </p>
      </section>

      <section>
        <h3>Consent (EEA, UK and Switzerland)</h3>
        <p>
          If you are located in the European Economic Area, the United Kingdom
          or Switzerland, we (and our advertising partners) rely on your consent
          to store or access non-essential cookies and to serve personalised
          ads. Where required, you will be shown a consent message and can
          accept, reject or manage your choices, and you may withdraw consent at
          any time by revisiting those settings. If you do not consent to
          personalised ads, you may still see non-personalised ads.
        </p>
      </section>

      <section>
        <h3>Your rights (GDPR and CCPA)</h3>
        <p>
          Depending on where you live, you may have rights over your personal
          data, including the right to access, correct, delete or restrict its
          processing, and to object to certain processing. Residents of
          California and similar jurisdictions may have the right to opt out of
          the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal
          information for targeted advertising; you can exercise this using the
          advertising opt-out links above. To make a request relating to data we
          hold, contact us through our{" "}
          <a href="/contact">contact page</a>.
        </p>
      </section>

      <section>
        <h3>Analytics</h3>
        <p>
          We may use privacy-respecting analytics (such as Google Analytics) to
          understand aggregate usage patterns like page views and session
          counts. This data is used in aggregate and is not used to identify
          individual users.
        </p>
      </section>

      <section>
        <h3>Children&rsquo;s privacy</h3>
        <p>
          This site is intended for a general audience and is not directed at
          children under the age of 13 (or the equivalent minimum age in your
          jurisdiction). We do not knowingly collect personal information from
          children. If you believe a child has provided us with personal
          information, please contact us so we can remove it.
        </p>
      </section>

      <section>
        <h3>Third-party content</h3>
        <p>
          Card images and data are sourced from{" "}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>{" "}
          and{" "}
          <a href="https://edhrec.com" target="_blank" rel="noreferrer">
            EDHREC
          </a>
          . When their APIs or images are called, your request is handled under
          their respective privacy policies. We are not responsible for the
          privacy practices of third-party sites.
        </p>
      </section>

      <section>
        <h3>Data retention</h3>
        <p>
          Game progress stored in your browser remains until you clear it.
          Anonymous, aggregate puzzle statistics may be retained indefinitely
          because they cannot be linked back to an individual.
        </p>
      </section>

      <section>
        <h3>Changes to this policy</h3>
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by the &ldquo;last updated&rdquo; date above. Continued use
          of the site after changes take effect constitutes acceptance of the
          updated policy.
        </p>
      </section>

      <section>
        <h3>Contact</h3>
        <p>
          Questions about this policy or your data? Reach out through our{" "}
          <a href="/contact">contact page</a>.
        </p>
      </section>
    </ContentPage>
  );
}
