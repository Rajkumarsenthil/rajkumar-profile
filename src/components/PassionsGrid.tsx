import { motion } from "framer-motion";
import { Code2, Bike, Mountain, Trophy, Rocket, Tv } from "lucide-react";

const passions = [
  { icon: Code2, title: "Engineering", desc: "Scalable systems & technical leadership" },
  { icon: Bike, title: "Riding", desc: "Chasing horizons on two wheels" },
  { icon: Mountain, title: "Adventure", desc: "Mountains, coastlines & the unknown" },
  { icon: Trophy, title: "Football", desc: "Competing on the pitch with Facilio F.C." },
  { icon: Rocket, title: "Entrepreneurship", desc: "Industrial operations & sustainable models" },
  { icon: Tv, title: "Anime", desc: "Demon Slayer marathons to recharge" },
];

const PassionsGrid = () => {
  return (
    <section className="py-24 md:py-32 bg-card">
      <div className="container mx-auto px-6 md:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-3xl md:text-5xl font-bold mb-16"
        >
          What <span className="text-primary">Drives</span> Me
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {passions.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group p-8 rounded-2xl border border-border bg-background hover:border-primary/40 transition-all duration-500 hover:shadow-[var(--shadow-glow)]"
            >
              <item.icon className="w-8 h-8 text-primary mb-5 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PassionsGrid;
