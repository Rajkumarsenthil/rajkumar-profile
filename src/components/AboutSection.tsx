import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const bios = [
  {
    label: "Professional",
    content:
      "Full-stack software engineer with 4+ years of experience developing scalable, workflow-intensive applications using Java and Vue.js at Facilio. I've designed automation engines, built enterprise-grade integrations, and optimized database performance for high-availability platforms. Currently serving as Engineering Lead, managing the CMMS Modules team with end-to-end ownership of product roadmap, development, delivery, and alignment.",
  },
  {
    label: "Builder",
    content:
      "I've owned architecture and enhancement of core CMMS/CAFM modules, built Invoice modules from the ground up, and architected configurable PM scheduling engines supporting complex recurrence and multi-site execution. From integrating AutoCAD drawings with Mapbox for interactive floor plans to building visitor management systems that improved security compliance by 90% — I thrive on solving complex problems end-to-end.",
  },
  {
    label: "Beyond Code",
    content:
      "When I'm not behind a screen, I'm chasing horizons on my motorcycle, competing on the pitch, or trekking through the mountains. I'm an aspiring entrepreneur with a deep interest in industrial operations. Whether it's navigating a difficult codebase, exploring unknown trails, or planning the next coastal ride — I'm driven by curiosity to explore how things work and how to make them better.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const AboutSection = () => {
  const [active, setActive] = useState(0);

  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-6 md:px-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2
            variants={itemVariants}
            className="font-display text-3xl md:text-5xl font-bold mb-4"
          >
            About <span className="text-gradient">Me</span>
          </motion.h2>

          <motion.div
            variants={itemVariants}
            className="w-16 h-1 rounded-full mb-12"
            style={{ background: "var(--gradient-accent)" }}
          />

          <motion.div variants={itemVariants} className="flex gap-2 mb-8 flex-wrap">
            {bios.map((bio, i) => (
              <motion.button
                key={bio.label}
                onClick={() => setActive(i)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`font-display text-sm tracking-wider uppercase px-5 py-2.5 rounded-full border transition-all duration-300 ${
                  active === i
                    ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                }`}
              >
                {bio.label}
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-foreground/80 text-lg md:text-xl leading-relaxed max-w-3xl">
                {bios[active].content}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
