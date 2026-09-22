import { ArrowUp } from "lucide-react";
import { profile } from "../data/profile";

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg/60 py-10 backdrop-blur-md">
      <div className="container-x flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xl font-medium tracking-[-0.02em]">
            {profile.name}
            <span className="text-accent">.</span>
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {profile.role} · {profile.tagline}
          </p>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-fg-muted">
          © {YEAR} {profile.name}. Built in Chennai with React, Three.js and Motion. The soundscape is synthesised live in
          your browser with the Web Audio API.
        </p>
        <a href="#top" className="btn-ghost self-start md:self-auto">
          Back to top <ArrowUp className="size-4" />
        </a>
      </div>
    </footer>
  );
}
