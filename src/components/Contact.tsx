import type { ComponentType } from "react";
import { ArrowUpRight, FileText, Mail, MapPin, Phone } from "lucide-react";
import { profile } from "../data/profile";
import { GithubIcon, LinkedinIcon } from "./BrandIcons";
import { Magnetic } from "./Magnetic";
import { Reveal } from "./Reveal";
import { SplitText } from "./SplitText";
import { ContactForm } from "./ContactForm";
import { TitleAnchor } from "./TitleAnchor";

type Detail = { icon: ComponentType<{ className?: string }>; label: string; value: string; href?: string };

const details: Detail[] = [
  { icon: Phone, label: "Phone", value: profile.phone, href: profile.phoneHref },
  { icon: LinkedinIcon, label: "LinkedIn", value: "in/srk-rajkumar", href: profile.socials[0].href },
  { icon: GithubIcon, label: "GitHub", value: profile.socials[1].handle, href: profile.socials[1].href },
  { icon: FileText, label: "Résumé", value: "PDF", href: profile.resumeUrl },
  { icon: MapPin, label: "Location", value: profile.location },
];

export function Contact() {
  return (
    <section id="contact" className="relative flex min-h-svh flex-col justify-center py-28 md:py-40">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow flex items-center justify-center gap-3">
            <span className="text-accent">05</span>
            <span className="h-px w-10 bg-line-strong" />
            Contact
          </p>
        </Reveal>
        <TitleAnchor id="contact" align="center" className="mx-auto mt-4 h-[clamp(5rem,15vw,13rem)] w-full max-w-5xl" />
        <h2 className="mx-auto mt-2 max-w-3xl text-center text-3xl font-medium leading-[1.08] tracking-[-0.03em] md:text-5xl">
          <SplitText text="Let's build something that *runs at scale.*" stagger={0.05} />
        </h2>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-fg-muted">
            A system that needs to scale, an integration that has to hold, or a route for the next long ride. Tell me about it.
          </p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10 flex justify-center">
          <Magnetic>
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-3 rounded-full bg-fg px-7 py-4 text-base font-medium text-bg shadow-[0_24px_80px_-24px_var(--accent)] transition-colors duration-300 hover:bg-accent hover:text-accent-fg"
            >
              <Mail className="size-5" />
              {profile.email}
            </a>
          </Magnetic>
        </Reveal>

        <Reveal delay={0.3} className="mx-auto mt-14 max-w-3xl">
          <ContactForm />
        </Reveal>

        <Reveal delay={0.35} className="mx-auto mt-6 max-w-4xl">
          <ul className="glass grid overflow-hidden rounded-3xl sm:grid-cols-2 lg:grid-cols-5">
            {details.map(({ icon: Icon, label, value, href }) => {
              const content = (
                <>
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-accent" />
                    <span className="eyebrow text-[10px]">{label}</span>
                  </span>
                  <span className="mt-3 flex items-center gap-1.5 text-sm">
                    {value}
                    {href && (
                      <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    )}
                  </span>
                </>
              );
              const cell = "group flex flex-col border-line p-5 [&:not(:last-child)]:border-b lg:[&:not(:last-child)]:border-b-0 lg:[&:not(:last-child)]:border-r";
              return (
                <li key={label} className="contents">
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith("http") || href.endsWith(".pdf") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noreferrer" : undefined}
                      className={`${cell} transition-colors hover:bg-tint/[0.05]`}
                    >
                      {content}
                    </a>
                  ) : (
                    <div className={cell}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
