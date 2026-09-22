import { useState } from "react";
import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { profile } from "../data/profile";

/**
 * The site is static (GitHub Pages), so rather than posting to a server this
 * composes the message and hands it to the visitor's own email app.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = `Portfolio enquiry from ${name.trim() || "a visitor"}${company.trim() ? ` (${company.trim()})` : ""}`;
    const body = `${message.trim()}\n\n— ${name.trim()}${company.trim() ? `, ${company.trim()}` : ""}`;
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const field =
    "peer w-full rounded-2xl border border-line-strong bg-tint/[0.04] px-4 pb-3 pt-6 text-fg outline-none transition-colors placeholder:text-transparent focus:border-accent focus:bg-tint/[0.06]";
  const label =
    "pointer-events-none absolute left-4 top-4 origin-left font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted transition-all peer-focus:top-2 peer-focus:text-accent peer-[:not(:placeholder-shown)]:top-2";

  return (
    <form onSubmit={onSubmit} className="glass grid gap-3 rounded-3xl p-5 sm:grid-cols-2 sm:p-6">
      <div className="relative">
        <input id="cf-name" className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        <label htmlFor="cf-name" className={label}>
          Your name
        </label>
      </div>
      <div className="relative">
        <input id="cf-company" className={field} placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
        <label htmlFor="cf-company" className={label}>
          Company (optional)
        </label>
      </div>
      <div className="relative sm:col-span-2">
        <textarea
          id="cf-message"
          data-lenis-prevent
          className={`${field} min-h-36 resize-y`}
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <label htmlFor="cf-message" className={label}>
          What are you building?
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <p className="text-sm text-fg-faint" aria-live="polite">
          {sent ? "Your email app should have opened with the message ready." : "Opens your email app with this message ready to send."}
        </p>
        <button type="submit" className="btn-primary">
          Compose email <Send className="size-4" />
        </button>
      </div>
    </form>
  );
}
