import { motion } from "framer-motion";
import { Code2, Bike, Mountain, Trophy, Rocket, Tv } from "lucide-react";
import { FloatingParticles } from "./AnimatedElements";

const passions = [
  { icon: Code2, title: "Engineering", desc: "Scalable systems & technical leadership at Facilio", emoji: "⚡" },
  { icon: Bike, title: "Riding", desc: "Chasing horizons on two wheels across India", emoji: "🏍️" },
  { icon: Mountain, title: "Adventure", desc: "Mountains, coastlines & the unknown trails", emoji: "🏔️" },
  { icon: Trophy, title: "Football", desc: "Competing on the pitch. Visca barca visca catalunya 🔵🔴", emoji: "⚽" },
  { icon: Rocket, title: "Entrepreneurship", desc: "Industrial operations & sustainable models", emoji: "🚀" },
  { icon: Tv, title: "Anime", desc: "Demon Slayer marathons to recharge the batteries", emoji: "⚔️" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95, rotateX: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const PassionsGrid = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <FloatingParticles count={20} />
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            What <span className="text-gradient">Drives</span> Me
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {passions.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{
                y: -12,
                rotateY: 5,
                transition: { duration: 0.3 },
              }}
              className="group p-8 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors duration-500 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-glow)] cursor-default relative overflow-hidden"
              style={{ perspective: 1000 }}
            >
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.08), transparent 70%)" }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <motion.div
                    whileHover={{ rotate: [0, -15, 15, -10, 10, 0], scale: 1.2 }}
                    transition={{ duration: 0.6 }}
                  >
                    <item.icon className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </motion.div>
                  <motion.span
                    className="text-2xl"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  >
                    {item.emoji}
                  </motion.span>
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PassionsGrid;
