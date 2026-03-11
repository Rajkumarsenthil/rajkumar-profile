import { motion } from "framer-motion";
import { Code2, Bike, Mountain, Trophy, Rocket, Tv } from "lucide-react";

const passions = [
  { icon: Code2, title: "Engineering", desc: "Scalable systems & technical leadership at Facilio" },
  { icon: Bike, title: "Riding", desc: "Chasing horizons on two wheels across India" },
  { icon: Mountain, title: "Adventure", desc: "Mountains, coastlines & the unknown trails" },
  { icon: Trophy, title: "Football", desc: "Competing on the pitch with Facilio F.C." },
  { icon: Rocket, title: "Entrepreneurship", desc: "Industrial operations & sustainable models" },
  { icon: Tv, title: "Anime", desc: "Demon Slayer marathons to recharge the batteries" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.12,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const PassionsGrid = () => {
  return (
    <section className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6 md:px-12">
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
            style={{ background: "var(--gradient-amber)" }}
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
                y: -8,
                transition: { duration: 0.3 },
              }}
              className="group p-8 rounded-2xl border border-border bg-background hover:border-primary/40 transition-colors duration-500 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-glow)] cursor-default"
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <item.icon className="w-8 h-8 text-primary mb-5 group-hover:scale-110 transition-transform duration-300" />
              </motion.div>
              <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PassionsGrid;
