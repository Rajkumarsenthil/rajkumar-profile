import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navLinks, profile } from "../data/profile";
import { useActiveSection } from "../hooks/useActiveSection";
import { EASE } from "../lib/motion";
import { lockScroll, scrollToTarget, unlockScroll } from "../lib/scroll";
import { SceneToggle } from "./SceneToggle";
import { SoundToggle } from "./SoundToggle";

const NAV_IDS = navLinks.map((link) => link.id);

const chennaiTime = () =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date());

function LocalTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(chennaiTime());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 20_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return (
    <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted xl:inline">
      Chennai <span className="text-fg">{time}</span> IST
    </span>
  );
}

export function Nav({ ready }: { ready: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(NAV_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goMobile = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setOpen(false);
    scrollToTarget(`#${id}`);
  };

  return (
    <motion.header
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
      initial={{ y: -24, opacity: 0 }}
      animate={ready ? { y: 0, opacity: 1 } : { y: -24, opacity: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
    >
      <div className="container-x relative z-10 pt-4 sm:pt-5">
        <nav
          aria-label="Primary"
          className={`pointer-events-auto flex items-center justify-between rounded-full border py-2 pl-3 pr-2 transition-[background-color,border-color] duration-500 ${
            scrolled || open ? "border-line bg-bg/60 backdrop-blur-xl" : "border-transparent"
          }`}
        >
          <a href="#top" className="flex items-center gap-3" aria-label="Back to top">
            <span className="grid size-8 place-items-center rounded-full border border-line-strong font-serif text-lg italic leading-none text-accent">
              R
            </span>
            <span className="hidden font-mono text-xs uppercase tracking-[0.16em] sm:inline">{profile.name}</span>
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                    active === link.id ? "text-fg" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {active === link.id && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full border border-line bg-tint/[0.07]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <LocalTime />
            <SceneToggle />
            <SoundToggle />
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg transition-transform hover:-translate-y-0.5 sm:inline-flex"
            >
              Résumé <ArrowUpRight className="size-4" />
            </a>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="grid size-9 place-items-center rounded-full border border-line text-fg md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="pointer-events-auto fixed inset-0 z-0 flex flex-col bg-bg/95 px-6 pb-10 pt-28 backdrop-blur-xl md:hidden"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <ul className="flex flex-col">
              {navLinks.map((link, i) => (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: EASE }}
                >
                  <a
                    href={`#${link.id}`}
                    onClick={(event) => goMobile(event, link.id)}
                    className="flex items-baseline justify-between border-b border-line py-4 text-4xl font-medium tracking-[-0.03em]"
                  >
                    {link.label}
                    <span className="font-mono text-xs text-fg-faint">0{i + 1}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-4">
              <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="btn-primary justify-center">
                Download résumé <ArrowUpRight className="size-4" />
              </a>
              <div className="flex items-center justify-between">
                <div className="flex gap-5 font-mono text-sm text-fg-muted">
                  {profile.socials.map((social) => (
                    <a key={social.label} href={social.href} target="_blank" rel="noreferrer">
                      {social.label} ↗
                    </a>
                  ))}
                </div>
                <SoundToggle showLabel />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
