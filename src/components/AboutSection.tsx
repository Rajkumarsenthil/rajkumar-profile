import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const bios = [
  {
    label: "Professional",
    content:
      "With nearly four years of experience in engineering leadership, I specialize in building scalable solutions and leading technical teams at Facilio. I thrive at the intersection of complex problem-solving and streamlined execution. When I'm not behind a screen, I'm usually chasing the horizon on my motorcycle or competing on the pitch with Facilio F.C. Whether it's navigating a difficult codebase, trekking through the mountains, or scouting the next coastal destination, I'm driven by a constant curiosity to explore how things work—and how to make them better.",
  },
  {
    label: "Visionary",
    content:
      "By day, I serve as a Lead Engineer, focused on the evolving landscape of prop-tech and industrial automation. By night (and weekends), I'm an aspiring entrepreneur with a deep interest in industrial operations and sustainable business models. My approach to life is high-velocity: I'm a dedicated soccer player, an avid traveler who finds equal peace in the mountains and on the beach, and a rider who believes the best way to see the world is on two wheels. I believe in hard work, technical precision, and the power of a well-timed Demon Slayer marathon to recharge the creative batteries.",
  },
  {
    label: "In Brief",
    content:
      "Lead Engineer at Facilio with a passion for building efficient systems and leading high-performing teams. Beyond the tech stack, I'm a soccer player, an adventurer who oscillates between mountain peaks and ocean breezes, and a motorcycle enthusiast. I'm currently balancing my love for engineering with a growing interest in industrial entrepreneurship.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
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
            style={{ background: "var(--gradient-amber)" }}
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
