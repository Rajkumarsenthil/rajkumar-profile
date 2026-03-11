import { motion } from "framer-motion";
import { Briefcase, Calendar, MapPin } from "lucide-react";

const experiences = [
  {
    role: "Engineering Lead — CMMS Modules",
    company: "Facilio",
    period: "Jun 2025 – Present",
    location: "Chennai",
    highlights: [
      "Managing the CMMS Modules team with end-to-end ownership of product roadmap, development, delivery, and alignment.",
      "Owned and fine-tuned Inventory & Procurement modules including Purchase Requests, RFQs, Quotes, POs, and Invoices.",
      "Built the Invoice module from the ground up with validation logic, approval chains, and financial reconciliation.",
      "Integrated procurement workflows with Work Order and Budget modules for end-to-end cost traceability.",
    ],
  },
  {
    role: "Full Stack Developer",
    company: "Facilio",
    period: "Apr 2022 – May 2025",
    location: "Chennai",
    highlights: [
      "Architected core CMMS/CAFM modules, driving scalability across Work Order and Planned Maintenance systems.",
      "Managed end-to-end SFG-20 integration, aligning preventive maintenance with compliance and industry standards.",
      "Architected configurable PM scheduling engine supporting complex recurrence, seasonal logic, and multi-site execution.",
      "Built CAD-to-web visualization by integrating AutoCAD with Mapbox tile generation for interactive floor plans.",
      "Improved security compliance by 90% with visitor check-in workflows, approval chains, and badge automation.",
    ],
  },
];

const skills = [
  "Java", "JavaScript", "React", "Vue.js", "MySQL", "Mapbox",
  "Leadership", "Team Management",
];

const ExperienceSection = () => {
  return (
    <section className="py-24 md:py-32 bg-card relative overflow-hidden">
      <div className="container mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            My <span className="text-gradient">Experience</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: 64 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="h-1 rounded-full mb-16"
            style={{ background: "var(--gradient-accent)" }}
          />
        </motion.div>

        <div className="relative">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" as const }}
            className="absolute left-4 md:left-8 top-0 w-0.5 bg-border origin-top"
          />

          <div className="space-y-12">
            {experiences.map((exp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                className="relative pl-12 md:pl-20"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.2, type: "spring", stiffness: 300 }}
                  className="absolute left-2 md:left-6 top-2 w-5 h-5 rounded-full border-[3px] border-primary bg-background z-10"
                />

                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="p-6 md:p-8 rounded-2xl border border-border bg-background shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-glow)] hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-display text-xl font-bold">{exp.role}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="font-display font-medium text-primary">{exp.company}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {exp.period}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {exp.location}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {exp.highlights.map((h, j) => (
                      <motion.li
                        key={j}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + j * 0.08, duration: 0.4 }}
                        className="text-muted-foreground text-sm leading-relaxed flex gap-2"
                      >
                        <span className="text-primary mt-1 shrink-0">▸</span>
                        {h}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20"
        >
          <h3 className="font-display text-2xl font-bold mb-6">
            Tech <span className="text-gradient">Stack</span>
          </h3>
          <div className="flex flex-wrap gap-3">
            {skills.map((skill, i) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.1, y: -2 }}
                className="px-5 py-2.5 rounded-full border border-border bg-background font-display text-sm font-medium text-foreground hover:border-primary/40 hover:shadow-[var(--shadow-glow)] transition-all duration-300 cursor-default"
              >
                {skill}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ExperienceSection;
