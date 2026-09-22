/**
 * Single source of truth for everything the site says about Rajkumar.
 * Written for the portfolio (not lifted from the résumé); facts stay in line
 * with public/Rajkumar-S-Resume.pdf, so update both together.
 */

export type Social = { label: string; href: string; handle: string };
export type Stat = { number: number; decimals?: number; suffix?: string; label: string };
export type Role = { title: string; period: string; location: string; summary: string; highlights: string[] };
export type Project = {
  id: string;
  title: string;
  /** One-line hook shown on the card. */
  subtitle: string;
  metric: string;
  stack: string[];
  challenge: string;
  approach: string[];
  outcome: string;
};
export type SkillGroup = { label: string; note: string; items: string[]; wide?: boolean };
export type Passion = {
  icon: "bike" | "mountain" | "trophy" | "rocket" | "tv";
  label: string;
  blurb: string;
};
export type Fact = { label: string; value: string };

export const profile = {
  name: "Rajkumar S",
  shortName: "Rajkumar",
  role: "Lead Engineer",
  tagline: "Backend & Integration Architecture",
  company: "Facilio",
  location: "Chennai, India",
  email: "rajkumarsenthil02@gmail.com",
  phone: "+91 63792 71851",
  phoneHref: "tel:+916379271851",
  siteUrl: "https://www.rajkumar.life",
  resumeUrl: `${import.meta.env.BASE_URL}Rajkumar-S-Resume.pdf`,
  headline: "I design the backend systems that keep *enterprise facilities running.*",
  intro:
    "At Facilio I lead the core of our maintenance platform, from work orders and scheduling to inventory and procurement. I like systems that stay calm under load, integrations that hold, and software that gives people on the ground their time back.",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/srk-rajkumar/", handle: "srk-rajkumar" },
    { label: "GitHub", href: "https://github.com/Rajkumarsenthil", handle: "Rajkumarsenthil" },
  ] satisfies Social[],
};

/** Scroll-lit statement under the hero. Wrap words in *asterisks* for accents. */
export const statement =
  "I turn complex operational problems into *reliable software.* For four and a half years I have built enterprise SaaS for the teams who keep buildings running, and today I lead the core of Facilio's maintenance platform: *event-driven systems* on Kafka and AWS, integrations that hold up, and interfaces people rely on every day.";

export const navLinks = [
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Toolkit" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

export const stats: Stat[] = [
  { number: 4.5, decimals: 1, suffix: "+", label: "years shipping enterprise SaaS" },
  { number: 5, label: "core modules I own end to end" },
  { number: 100, suffix: "k+", label: "assets my scheduler plans for" },
  { number: 4, label: "regions running my work" },
];

export const marqueeItems = [
  "Java",
  "Apache Kafka",
  "AWS",
  "MySQL",
  "Vue.js",
  "React",
  "React Native",
  "GraphQL",
  "REST",
  "Docker",
  "Event-driven architecture",
  "Multi-tenant SaaS",
  "AI agents",
];

export const experience: Role[] = [
  {
    title: "Lead Engineer, CMMS Modules & Forward Deployed Engineer",
    period: "Jun 2025 — Present",
    location: "Chennai, India",
    summary:
      "I own the modules at the heart of Facilio's CMMS: Work Order, Planned Maintenance, Job Plans, Inventory and Procurement. That covers the roadmap, the architecture, code quality, releases and how it all behaves in production for enterprise clients across four regions.",
    highlights: [
      "Rebuilt Planned Maintenance on Apache Kafka as both product owner and lead developer.",
      "Designed the 64-bit permission registry and wrote the access-control reference the whole organization now follows.",
      "Build custom AI agents with enterprise clients as a Forward Deployed Engineer, taking manual work off their teams.",
      "Grow engineers through design and code review, and share reusable AI skills and architecture docs across the team.",
    ],
  },
  {
    title: "Full Stack Developer & Technical Account Engineer",
    period: "Apr 2022 — May 2025",
    location: "Chennai, India",
    summary:
      "Three years across the whole stack: Java and MySQL on the backend, Vue.js and React on the web, React Native in the field. I also sat on the customer's side of the table, owning escalations, requirements and solution design for key enterprise accounts in three regions.",
    highlights: [
      "Delivered six enterprise modules end to end, from Work Order and Planned Maintenance to Workplace and Visitor.",
      "Built the SFG-20 compliance integration and ran client workshops alongside the standards body.",
      "Redesigned workflows around how customers actually used them, cutting steps and support load.",
      "Made the heaviest work-order screens noticeably faster, then taught them to work offline.",
    ],
  },
];

export const projects: Project[] = [
  {
    id: "pm-v3",
    title: "Planned Maintenance V3",
    subtitle: "Rebuilding the engine that schedules maintenance for 100,000+ assets.",
    metric: "100k+ assets",
    stack: ["Java", "Apache Kafka", "MySQL", "Vue.js"],
    challenge:
      "The old planner generated work orders inside the request. As customers grew to tens of thousands of assets, large schedules became slow, fragile and prone to duplicates.",
    approach: [
      "Moved generation onto Apache Kafka with queue-backed workers, so every record is processed idempotently and a failure stays contained to that one record.",
      "Designed two planner types, time-based and task-based, with complex recurrence, seasonal triggers and multi-site execution.",
      "Introduced reusable PM templates that detect local overrides, so a template change never wipes out a customer's own tweaks.",
      "Shipped everything around the engine: Vue.js creation and summary screens, bulk import with pre-scan validation and dedupe, a nightly forward scheduler and a V5 API for automation.",
    ],
    outcome:
      "A scheduler that plans across 100,000+ assets without duplicate jobs, with job-status tracking so everyone can see exactly what ran. I led it as product owner and lead developer.",
  },
  {
    id: "access-control",
    title: "Running out of permissions",
    subtitle: "What we did when the platform's permission bitmask hit its 63-bit ceiling.",
    metric: "+64 bits",
    stack: ["Java", "MySQL"],
    challenge:
      "Suddenly nobody could add a new permission anywhere on the platform. The enforcement bitmask had used every one of the 63 usable bits in a signed long, and an earlier migration had been abandoned halfway, leaving a write path that nothing read.",
    approach: [
      "Traced the failure through three generations of permission schemes to find the real limit.",
      "Designed a Permission Action Registry with a second 64-bit space, extending enforcement, the role model and package import/export without touching the legacy bits.",
      "Documented the live request-to-decision enforcement path end to end.",
    ],
    outcome:
      "New permissions ship again, and my reference architecture is now required reading across the organization before anyone changes access control.",
  },
  {
    id: "sfg20",
    title: "SFG-20 compliance, both ways",
    subtitle: "A two-way sync with the SFG-20 maintenance standard for around ten European enterprises.",
    metric: "~10 EU enterprises",
    stack: ["Java", "GraphQL", "REST APIs"],
    challenge:
      "Clients needed their maintenance plans to follow SFG-20, yet they customize those plans heavily. Importing the standard once would drift out of date; overwriting it would destroy their edits.",
    approach: [
      "Built a bidirectional integration with the Facilities-iQ GraphQL API using incremental, change-based sync.",
      "Reconciled schedules and versions, and diffed incoming job plans against each client's locally customized plans.",
      "Wrote task completions back to SFG-20 to close the loop.",
      "Delivered it hand in hand with the SFG-20 standards body and the European clients themselves.",
    ],
    outcome: "It became the compliance backbone for around ten European enterprise accounts.",
  },
  {
    id: "work-order",
    title: "One work order, everywhere",
    subtitle: "Unifying the platform's biggest, most customized module across web, mobile and offline.",
    metric: "Web · mobile · offline",
    stack: ["Java", "Vue.js", "React", "React Native", "MySQL"],
    challenge:
      "Work orders are where every customer's quirks end up. Web and mobile behaved differently, technicians lost their work when the signal dropped, and customer-specific rules were hard-coded.",
    approach: [
      "Generalized the module into one system flow shared by web, mobile and offline.",
      "Built offline-first synchronization in React Native so technicians can create and update work orders with no connectivity.",
      "Replaced hard-coded per-customer logic with a configurable action framework: role-based buttons, per-role permissions and configurable status transitions.",
      "Tuned the heaviest list and detail queries, noticeably cutting load times on large enterprise datasets.",
    ],
    outcome:
      "Consistent behaviour on every surface, technicians who keep working wherever the signal drops, and customization through configuration instead of code.",
  },
  {
    id: "risk",
    title: "Risk-based maintenance",
    subtitle: "Letting teams prioritise by risk, from the matrix down to individual tasks.",
    metric: "Task-level risk",
    stack: ["Java", "Vue.js", "MySQL"],
    challenge: "Not every maintenance task carries the same consequence, but plans had no way to say so.",
    approach: [
      "Built configurable risk matrices with categories, impact definitions, priority rating ranges and a color-coded matrix view.",
      "Carried risk down to job plans, PM tasks and work-order tasks, wired through create, import, API and export.",
    ],
    outcome: "Risk now travels with the work, so planners can prioritise tasks by consequence rather than by date alone.",
  },
  {
    id: "procurement",
    title: "From purchase request to invoice",
    subtitle: "Owning the whole procurement lifecycle, and building invoicing from scratch.",
    metric: "5 document types",
    stack: ["Java", "MySQL"],
    challenge:
      "Procurement spans five document types and several approvers, and finance needs every cost to trace back to the job that caused it.",
    approach: [
      "Owned Purchase Requests, RFQs, Quotes, Purchase Orders and Invoices end to end.",
      "Built the Invoice module from scratch with validation, multi-step approval chains and financial reconciliation.",
      "Connected procurement to Work Orders and Budgets for end-to-end cost traceability.",
      "Delivered client, vendor and service contracts that raise invoices and credit notes automatically when a work order completes.",
    ],
    outcome: "One traceable path from the first request to the final payment.",
  },
  {
    id: "workplace",
    title: "Floor plans that work",
    subtitle: "Turning AutoCAD drawings into live maps for desks, rooms and visitors.",
    metric: "CAD → Mapbox",
    stack: ["Vue.js", "Mapbox", "AutoCAD", "Java"],
    challenge: "Workplace teams had their buildings in AutoCAD, but bookings and utilization needed them live on the web.",
    approach: [
      "Architected a CAD-to-web workflow that renders AutoCAD drawings as interactive Mapbox floor plans.",
      "Built desk reservation and space-utilization reporting on top of those maps.",
      "Added visitor check-in with multi-step approval chains and automated badge printing.",
    ],
    outcome: "Floor plans stopped being static drawings and became something people book from.",
  },
];

export const skillGroups: SkillGroup[] = [
  { label: "Languages", note: "Java every day, JavaScript across three front ends, SQL everywhere.", items: ["Java", "JavaScript", "SQL"] },
  { label: "Frontend & mobile", note: "Vue.js and React on the web, React Native in the field.", items: ["Vue.js", "React", "React Native"] },
  {
    label: "Data",
    note: "Modelled and tuned for large, multi-tenant datasets.",
    items: ["MySQL", "Relational modelling", "Query optimization", "Indexing", "Performance tuning"],
  },
  {
    label: "Backend, messaging & cloud",
    note: "Where most of my work lives.",
    wide: true,
    items: [
      "REST API design",
      "GraphQL",
      "Microservices",
      "Apache Kafka",
      "Event-driven architecture",
      "Message queues",
      "Async processing",
      "AWS (EC2, S3)",
      "Docker",
    ],
  },
  {
    label: "AI & automation",
    note: "Agents for clients, and tooling for my own team.",
    items: ["AI agents", "LLM integration", "Custom AI skills", "Workflow automation"],
  },
  {
    label: "Architecture & practice",
    note: "The habits that keep big systems boring, in the best way.",
    wide: true,
    items: [
      "Distributed systems",
      "System design",
      "Multi-tenant SaaS",
      "Offline-first sync",
      "Role-based access control",
      "Third-party integrations",
      "Agile & Scrum",
      "Code review",
      "Git",
      "CI/CD",
    ],
  },
  {
    label: "People",
    note: "Teammates, clients and standards bodies: half the job.",
    items: ["Team leadership", "Mentoring", "Technical account management", "Forward deployed engineering", "Stakeholder management", "Client workshops"],
  },
];

export const aboutParagraphs = [
  "I'm Rajkumar, an engineer from Chennai who is happiest in the unglamorous parts of software: the nightly scheduler, the migration nobody finished, the integration that has to agree with somebody else's system.",
  "I studied Computer Science at Sri Krishna College of Technology in Coimbatore and joined Facilio in 2022. Since then I have grown from full stack developer to lead engineer on the modules facilities teams use every day, and I still like sitting with clients to see how the work really happens before I design anything.",
];

export const facts: Fact[] = [
  { label: "Based in", value: "Chennai, India" },
  { label: "Now", value: "Lead Engineer and Forward Deployed Engineer at Facilio" },
  { label: "Studied", value: "B.E. Computer Science & Engineering, Sri Krishna College of Technology (2018 – 2022)" },
  { label: "Exploring", value: "AI agents that take real work off people's plates" },
];

export const passions: Passion[] = [
  { icon: "bike", label: "Riding", blurb: "Long roads across India on two wheels." },
  { icon: "mountain", label: "Trekking", blurb: "Mountains, coastlines and unmarked trails." },
  { icon: "trophy", label: "Football", blurb: "On the pitch whenever I can. Visca Barça." },
  { icon: "rocket", label: "Building", blurb: "Curious about industrial operations and what I could build there." },
  { icon: "tv", label: "Anime", blurb: "Demon Slayer marathons to recharge." },
];
