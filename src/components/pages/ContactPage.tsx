import ContentPage from "./ContentPage";

export default function ContactPage() {
  return (
    <ContentPage
      title="Commandle — Contact"
      description="Get in touch with the Commandle team. Report a bug, suggest a feature, ask about the daily Magic: The Gathering commander game, or raise a privacy request."
      canonical="https://commandle.com/contact"
    >
      <h2>Contact us</h2>

      <section>
        <p>
          Commandle is a small, independent fan project, and we genuinely like
          hearing from players. Whether you&rsquo;ve found a bug, spotted a
          wrong answer, have an idea for a new mode, or just want to say hello,
          we&rsquo;d love to hear from you.
        </p>
        <p>
          The best way to reach us is by email:{" "}
          <a href="mailto:anonylunt@gmail.com">anonylunt@gmail.com</a>. We read
          every message and try to reply as quickly as we can.
        </p>
      </section>

      <section>
        <h3>What to include</h3>
        <ul>
          <li>
            <strong>Bug reports</strong> &mdash; tell us which mode and puzzle
            date, what you did, and what went wrong. A screenshot helps a lot.
          </li>
          <li>
            <strong>Wrong or missing data</strong> &mdash; let us know the
            commander and what looks off, and we&rsquo;ll check it against
            Scryfall and EDHREC.
          </li>
          <li>
            <strong>Feature ideas</strong> &mdash; new modes, quality-of-life
            tweaks, accessibility improvements &mdash; all welcome.
          </li>
          <li>
            <strong>Privacy requests</strong> &mdash; questions about your data
            or the choices described in our{" "}
            <a href="/privacy">privacy policy</a>.
          </li>
        </ul>
      </section>

      <section>
        <h3>Before you write</h3>
        <p>
          Many common questions are already answered on our{" "}
          <a href="/faq">FAQ page</a>, and the{" "}
          <a href="/how-to-play">how to play</a> guide covers the rules for every
          mode. If your question is there, you&rsquo;ll get an answer straight
          away.
        </p>
      </section>
    </ContentPage>
  );
}
