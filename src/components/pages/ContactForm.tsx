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
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  if (status === "ok") {
    return (
      <p className="contact-status ok">
        Thanks - your message is on its way. I'll *try* get back to you soon.
      </p>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
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
