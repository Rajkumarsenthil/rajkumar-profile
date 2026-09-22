# rajkumar.life

Portfolio of **Rajkumar S**, Lead Engineer at Facilio (backend and integration architecture).
Live at [www.rajkumar.life](https://www.rajkumar.life), deployed to GitHub Pages from `main`.

## The experience

Two worlds, switched from the toggle in the nav (remembered per visitor):

- **Sky** — a night flight over a point-cloud mountain valley with a glowing event stream, aurora curtains and a starfield. Stars near the cursor glow and drift away; clicking the sky sends a ripple of light.
- **Water** — a sunlit beach built on three.js's physically based `Sky` (with lit clouds) and reflective `Water`: turquoise shallows, breaking surf that runs up the sand, and a beach with life in it. Palms and dune grass sway and their shadows move on the sand; there are sun loungers under an umbrella, a lifeguard tower with its flag flying, a sandcastle with bucket and spade, a beach ball, driftwood and a seaweed line; a kite swoops overhead, gulls wheel and glide, a paddleboarder cruises beyond the break, and dolphins and sailboats pass further out. The cursor leaves ripples on the sea and a click makes a splash. The opening drone shot looks out over the surf so the name sits on clear water.

Switching cross-fades the page colours (registered CSS custom properties) and the 3D world together over an eased 2.4 s. The beach is HDR and finished by a filmic grade (`src/three/DayGrade.ts`) that blends in only for that scene.

Also:

- **Scroll-driven camera** with an intro dive, per-section framing and a pinned horizontal project reel on desktop.
- **Chapter titles** drawn by one particle system that morphs from word to word at night; at the beach they are poured from sand grains, with the odd shell and starfish.
- **Generative sound** (Web Audio, nothing downloaded): at night a pad, wind, arpeggio and bells that follow each chapter; at the beach a laid-back ukulele-and-marimba tune (Karplus–Strong plucked strings) over surf that breaks in time with the waves, and gulls.
- **Accessible fallbacks**: content is real HTML, reduced motion gets a calm static version, and browsers without WebGL get 2D titles.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Motion · Three.js via React Three Fiber and `@react-three/postprocessing` · Lenis · Fontsource (Geist, Geist Mono and Instrument Serif at night; Quicksand and Pacifico at the beach).

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build    # type-checks, then writes ./dist
npm run preview  # serves ./dist
```

## Where things live

| What | File |
| --- | --- |
| All copy: intro, statement, projects, experience, skills | `src/data/profile.ts` |
| Chapter words drawn in particles | `src/lib/titles.ts` |
| Camera framing and scene mood per chapter | `FRAMES` in `src/three/World.tsx` |
| The beach scene (sky, sea, surf, props, people, birds, dolphins) | `src/three/Sea.tsx` |
| Scene switch state (sky / water) | `src/lib/scene.ts` |
| Shaders (terrain, stars, aurora, titles, beach, surf, props) | `src/three/shaders.ts` |
| Soundscape | `src/lib/sound.ts` |
| Colours and fonts | CSS variables at the top of `src/styles.css` |
| Résumé PDF | `public/Rajkumar-S-Resume.pdf` |
| Social preview image | `public/og.jpg` (1200×630) |

## Deploy

Pushing to `main` runs `.github/workflows/static.yml`, which builds with Node 20 (20.19 or newer) and publishes `dist/` to GitHub Pages. The custom domain comes from `CNAME`.
