import ContentPage from "./ContentPage";
import ContactForm from "./ContactForm";

export default function ContactPage() {
  return (
    <ContentPage
      title="Commandle - Contact"
      description="Get in touch with the Commandle team. Report a bug, suggest a feature, ask about the daily Magic: The Gathering commander game, or raise a privacy request."
      canonical="https://commandle.app/contact"
    >
      <h2>Contact me</h2>

      <section>
        <p>
          Commandle is a small, independent fan project, and honestly? Hearing
          what you like about it would be pretty cool. Found a bug, caught a
          wrong answer, got a big idea for a new mode, or just want to say hi -
          I'm all ears.
        </p>
        <p>
          Easiest way to reach me is the form below. It lands straight in my
          inbox, I read every single message, and I try to get back to you
          quickly. Drop your email if you want a reply.
        </p>
        <ContactForm />
      </section>

      <section>
        <h3>What to include</h3>
        <ul>
          <li>
            <strong>Bug reports</strong> - which mode and puzzle date, what you
            did, and what broke. A screenshot goes a long way.
          </li>
          <li>
            <strong>Wrong or missing data</strong> - tell me the commander and
            what looks off, and I'll cross-check it against Scryfall and EDHREC.
          </li>
          <li>
            <strong>Feature ideas</strong> - new modes, quality-of-life stuff,
            accessibility.
          </li>
          <li>
            <strong>Privacy requests</strong> - questions about your data, GDPR requests, or
            anything in the <a href="/privacy">privacy policy</a>.
          </li>
        </ul>
      </section>

      <section>
        <h3>Before you write</h3>
        <p>
          Odds are your questions are already covered on the{" "}
          <a href="/faq">FAQ page</a>, and the{" "}
          <a href="/how-to-play">how to play</a> guide breaks down every mode.
          If it's there, you'll get your answer faster.
        </p>
      </section>
    </ContentPage>
  );
}
