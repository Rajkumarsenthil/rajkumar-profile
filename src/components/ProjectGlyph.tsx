import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Small animated diagram per project. Enterprise work has no public
 * screenshots, so each card illustrates the idea behind the system instead.
 */
export function ProjectGlyph({ id }: { id: string }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full text-fg" role="presentation" aria-hidden>
      {GLYPHS[id]?.(reduce) ?? null}
    </svg>
  );
}

const A = "var(--accent)";
const mono = { fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em" } as const;

const GLYPHS: Record<string, (reduce: boolean) => ReactNode> = {
  // Scheduling engine: maintenance jobs on parallel tracks, a "now" line sweeping across.
  "pm-v3": () => (
    <g>
      {[0, 1, 2, 3, 4].map((row) => (
        <g key={row}>
          <line x1="16" x2="304" y1={34 + row * 28} y2={34 + row * 28} stroke="currentColor" strokeOpacity="0.1" />
          {[0, 1, 2, 3].map((k) => {
            const x = 24 + ((row * 53 + k * 71) % 250);
            const w = 16 + ((row * 7 + k * 13) % 20);
            return (
              <rect
                key={k}
                x={x}
                y={34 + row * 28 - 5}
                width={w}
                height="10"
                rx="3"
                fill={(row + k) % 5 === 0 ? A : "currentColor"}
                fillOpacity={(row + k) % 5 === 0 ? 0.9 : 0.28}
              />
            );
          })}
        </g>
      ))}
      <g className="glyph-sweep">
        <line x1="16" x2="16" y1="18" y2="162" stroke={A} strokeWidth="1.2" />
        <circle cx="16" cy="18" r="3" fill={A} />
      </g>
      <text x="16" y="172" fill="currentColor" fillOpacity="0.45" style={mono}>
        TIME-BASED · TASK-BASED · SEASONAL
      </text>
    </g>
  ),
  // Permissions: a full 63-bit legacy space next to a new 64-bit registry filling up.
  "access-control": () => (
    <g>
      {Array.from({ length: 64 }, (_, i) => {
        const x = 26 + (i % 8) * 14;
        const y = 30 + Math.floor(i / 8) * 14;
        return i === 0 ? (
          <rect key={i} x={x} y={y} width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeDasharray="2 2" />
        ) : (
          <rect key={i} x={x} y={y} width="11" height="11" rx="2" fill="currentColor" fillOpacity="0.4" />
        );
      })}
      {Array.from({ length: 64 }, (_, i) => {
        const x = 182 + (i % 8) * 14;
        const y = 30 + Math.floor(i / 8) * 14;
        const lit = i % 5 === 0 || i % 7 === 3;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="11"
            height="11"
            rx="2"
            fill={lit ? A : "none"}
            stroke={lit ? "none" : "currentColor"}
            strokeOpacity="0.18"
            className={lit ? "glyph-blink" : undefined}
            style={lit ? { animationDelay: `${(i % 9) * 0.27}s` } : undefined}
          />
        );
      })}
      <path d="M146 86 h26" stroke={A} strokeWidth="1.2" markerEnd="url(#arrow-ac)" />
      <defs>
        <marker id="arrow-ac" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill={A} />
        </marker>
      </defs>
      <text x="26" y="160" fill="currentColor" fillOpacity="0.45" style={mono}>
        LEGACY · 63 BITS USED
      </text>
      <text x="182" y="160" fill={A} fillOpacity="0.9" style={mono}>
        REGISTRY · +64 BITS
      </text>
    </g>
  ),
  // Compliance sync: data flowing both ways between the standard and the CMMS.
  sfg20: (reduce) => (
    <g>
      <path id="sfg-top" d="M100 78 C140 28 180 28 220 78" fill="none" stroke="currentColor" strokeOpacity="0.25" />
      <path id="sfg-bottom" d="M220 102 C180 152 140 152 100 102" fill="none" stroke="currentColor" strokeOpacity="0.25" />
      <circle cx="72" cy="90" r="30" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      <circle cx="248" cy="90" r="30" fill="none" stroke={A} strokeOpacity="0.9" />
      <text x="72" y="93" textAnchor="middle" fill="currentColor" style={mono}>
        SFG-20
      </text>
      <text x="248" y="93" textAnchor="middle" fill={A} style={mono}>
        CMMS
      </text>
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <circle r="3" fill="currentColor" cx={reduce ? 160 : undefined} cy={reduce ? 40 : undefined}>
            {!reduce && <animateMotion dur="3s" begin={`${k}s`} repeatCount="indefinite" path="M100 78 C140 28 180 28 220 78" />}
          </circle>
          <circle r="3" fill={A} cx={reduce ? 160 : undefined} cy={reduce ? 140 : undefined}>
            {!reduce && <animateMotion dur="3s" begin={`${k + 0.5}s`} repeatCount="indefinite" path="M220 102 C180 152 140 152 100 102" />}
          </circle>
        </g>
      ))}
      <text x="160" y="22" textAnchor="middle" fill="currentColor" fillOpacity="0.45" style={mono}>
        SCHEDULES · JOB PLANS
      </text>
      <text x="160" y="170" textAnchor="middle" fill={A} fillOpacity="0.85" style={mono}>
        TASK WRITE-BACK
      </text>
    </g>
  ),
  // One flow across web, tablet and an offline phone that syncs when back online.
  "work-order": (reduce) => (
    <g>
      <rect x="18" y="36" width="130" height="86" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.45" />
      <rect x="64" y="122" width="38" height="8" rx="2" fill="currentColor" fillOpacity="0.2" />
      <rect x="168" y="48" width="70" height="92" rx="7" fill="none" stroke="currentColor" strokeOpacity="0.45" />
      <rect x="258" y="62" width="44" height="78" rx="8" fill="none" stroke={A} strokeOpacity="0.9" />
      {[0, 1, 2, 3, 4].map((r) => (
        <rect key={`d${r}`} x="28" y={48 + r * 14} width={90 - (r % 3) * 18} height="6" rx="2" fill="currentColor" fillOpacity="0.25" />
      ))}
      {[0, 1, 2, 3, 4].map((r) => (
        <rect key={`t${r}`} x="176" y={60 + r * 14} width={48 - (r % 2) * 14} height="6" rx="2" fill="currentColor" fillOpacity="0.25" />
      ))}
      {[0, 1, 2, 3].map((r) => (
        <rect key={`p${r}`} x="265" y={76 + r * 13} width={30 - (r % 2) * 8} height="6" rx="2" fill={A} fillOpacity="0.45" />
      ))}
      <circle cx="294" cy="70" r="2.5" fill={A} className="glyph-blink" />
      <path d="M83 150 H280" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />
      <circle r="3.5" fill={A} cx={reduce ? 180 : undefined} cy={reduce ? 150 : undefined}>
        {!reduce && <animateMotion dur="3.2s" repeatCount="indefinite" path="M83 150 H280 H83" />}
      </circle>
      <text x="18" y="24" fill="currentColor" fillOpacity="0.45" style={mono}>
        WEB · TABLET · OFFLINE MOBILE
      </text>
    </g>
  ),
  // Risk matrix: likelihood x impact, with the hottest cell pulsing.
  risk: () => (
    <g>
      {Array.from({ length: 25 }, (_, i) => {
        const c = i % 5;
        const r = Math.floor(i / 5);
        const score = c + (4 - r);
        const hot = score >= 7;
        return (
          <rect
            key={i}
            x={104 + c * 24}
            y={26 + r * 24}
            width="21"
            height="21"
            rx="3"
            fill={hot ? A : "currentColor"}
            fillOpacity={hot ? 0.35 + (score - 7) * 0.3 : 0.06 + score * 0.06}
            className={score === 8 ? "glyph-blink" : undefined}
          />
        );
      })}
      <text x="96" y="90" textAnchor="middle" fill="currentColor" fillOpacity="0.45" style={mono} transform="rotate(-90 96 90)">
        LIKELIHOOD
      </text>
      <text x="164" y="158" textAnchor="middle" fill="currentColor" fillOpacity="0.45" style={mono}>
        IMPACT
      </text>
      <text x="236" y="42" fill={A} style={mono}>
        HIGH
      </text>
      <text x="236" y="138" fill="currentColor" fillOpacity="0.45" style={mono}>
        LOW
      </text>
    </g>
  ),
  // Procurement chain: request to invoice, with a highlight stepping through.
  procurement: () => (
    <g>
      {["PR", "RFQ", "QUOTE", "PO", "INVOICE"].map((label, i) => (
        <g key={label}>
          <rect x={20 + i * 58} y="70" width="48" height="40" rx="6" fill="none" stroke="currentColor" strokeOpacity={i === 4 ? 0.9 : 0.4} />
          <text x={44 + i * 58} y="94" textAnchor="middle" fill={i === 4 ? A : "currentColor"} style={{ ...mono, fontSize: 7 }}>
            {label}
          </text>
          {i < 4 && <path d={`M${70 + i * 58} 90 h6`} stroke="currentColor" strokeOpacity="0.4" />}
        </g>
      ))}
      <rect x="18" y="68" width="52" height="44" rx="8" fill="none" stroke={A} strokeWidth="1.5" className="glyph-step" />
      <path d="M44 128 V144 H276 V128" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="3 4" />
      <text x="160" y="160" textAnchor="middle" fill="currentColor" fillOpacity="0.45" style={mono}>
        WORK ORDER · BUDGET TRACEABILITY
      </text>
      <text x="20" y="46" fill="currentColor" fillOpacity="0.45" style={mono}>
        APPROVAL CHAINS · RECONCILIATION
      </text>
    </g>
  ),
  // Floor plan with bookable desks and a location pin.
  workplace: () => (
    <g>
      <rect x="20" y="18" width="280" height="144" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.45" />
      <path d="M120 18 V92 M20 92 H180 M220 18 V162 M180 92 V162" stroke="currentColor" strokeOpacity="0.3" />
      {Array.from({ length: 12 }, (_, i) => {
        const x = 34 + (i % 4) * 20;
        const y = 32 + Math.floor(i / 4) * 18;
        const booked = i === 2 || i === 5 || i === 11;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="12"
            height="9"
            rx="2"
            fill={booked ? A : "currentColor"}
            fillOpacity={booked ? 0.9 : 0.25}
            className={booked ? "glyph-blink" : undefined}
            style={booked ? { animationDelay: `${i * 0.2}s` } : undefined}
          />
        );
      })}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={`b${i}`} x={234 + (i % 2) * 30} y={36 + Math.floor(i / 2) * 36} width="20" height="14" rx="2" fill="currentColor" fillOpacity="0.2" />
      ))}
      <circle cx="150" cy="56" r="10" fill="none" stroke={A} className="glyph-ripple" />
      <path d="M150 64 c-6 -8 -9 -12 -9 -16 a9 9 0 0 1 18 0 c0 4 -3 8 -9 16z" fill={A} />
      <text x="34" y="150" fill="currentColor" fillOpacity="0.45" style={mono}>
        AUTOCAD → MAPBOX
      </text>
    </g>
  ),
};
