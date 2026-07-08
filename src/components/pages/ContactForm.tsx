import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "ok" | "err";

/**
 * Contact form that POSTs to /api/contact, which relays the message to the site
 * owner by email. The owner's address is never shipped to the browser.
 */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
      // Honeypot: hidden from real users; only bots fill it. Server drops these silently.
      website: String(data.get("website") ?? ""),
    };

    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setStatus("err");
        setError(
          res.status === 503
            ? "The contact form is temporarily unavailable - please try again later."
            : "Something went wrong sending your message. Please try again.",
        );
        return;
      }
      form.reset();
      setStatus("ok");
    } catch {
      setStatus("err");
      setError(
        "Couldn't reach the server. Check your connection and try again.",
      );
    }
  }

  if (status === "ok") {
    return (
      <p className="contact-status ok">
        Thank you! Your message is on its way. I'll *try* to get back to you
        soon.
      </p>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      {/* Honeypot. Hidden from humans and skipped by tab order; bots that autofill it
          get silently dropped server-side. Not a real field — do not remove aria-hidden. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
        }}
      />
      <label>
        Your name (optional)
        <input type="text" name="name" autoComplete="name" maxLength={200} />
      </label>
      <label>
        Your email (optional, so I can reply)
        <input type="email" name="email" autoComplete="email" maxLength={320} />
      </label>
      <label>
        Message
        <textarea name="message" required maxLength={5000} />
      </label>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
      {status === "err" && <p className="contact-status err">{error}</p>}
    </form>
  );
}
