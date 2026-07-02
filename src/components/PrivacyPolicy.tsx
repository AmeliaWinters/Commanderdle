import { useEffect } from 'react'
import { navigateToPath } from '../lib/router'

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Commandle — Privacy Policy'
  }, [])
  return (
    <div className="privacy-policy">
      <header className="app-header">
        <h1>
          Comman<span className="accent">dle</span>
        </h1>
      </header>

      <article className="privacy-content">
        <h2>Privacy Policy</h2>
        <p className="privacy-date">Last updated: 30 June 2026</p>

        <section>
          <h3>Who we are</h3>
          <p>
            Commandle is a free, unofficial fan game for Magic: The Gathering. It is not affiliated with or endorsed
            by Wizards of the Coast.
          </p>
        </section>

        <section>
          <h3>Information we collect</h3>
          <p>
            We do not collect any personally identifying information directly. Your daily puzzle progress is stored
            entirely in your browser's <code>localStorage</code> and never sent to our servers.
          </p>
        </section>

        <section>
          <h3>Advertising (Google AdSense)</h3>
          <p>
            This site uses Google AdSense to display advertisements. Google may use cookies and similar technologies to
            serve ads based on your prior visits to this and other websites. You can opt out of personalised advertising
            by visiting{' '}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">
              Google Ads Settings
            </a>{' '}
            or{' '}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noreferrer">
              aboutads.info
            </a>
            .
          </p>
          <p>
            For more information on how Google uses data when you use our site, see{' '}
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
          <h3>Analytics</h3>
          <p>
            We may use Google Analytics to understand aggregate usage patterns (page views, session counts). This data
            is anonymised and not linked to any individual user.
          </p>
        </section>

        <section>
          <h3>Third-party content</h3>
          <p>
            Card images and data are sourced from{' '}
            <a href="https://scryfall.com" target="_blank" rel="noreferrer">
              Scryfall
            </a>{' '}
            and{' '}
            <a href="https://edhrec.com" target="_blank" rel="noreferrer">
              EDHREC
            </a>
            . Please refer to their respective privacy policies for how they handle your data when their APIs are called.
          </p>
        </section>

        <section>
          <h3>Changes to this policy</h3>
          <p>
            We may update this policy occasionally. Continued use of the site after changes constitutes acceptance of
            the updated policy.
          </p>
        </section>

        <section>
          <h3>Contact</h3>
          <p>
            Questions? Reach out at{' '}
            <a href="mailto:anonylunt@gmail.com">anonylunt@gmail.com</a>.
          </p>
        </section>
      </article>

      <footer className="app-footer">
        <a href="/" onClick={(e) => { e.preventDefault(); navigateToPath('/') }}>
          ← Back to game
        </a>
      </footer>
    </div>
  )
}
