import { motion } from "framer-motion";
import { Mail, Linkedin, Github, Twitter, Phone, MapPin, Sparkles } from "lucide-react";
import { FloatingParticles } from "./AnimatedElements";

const socials = [
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/srk-rajkumar/" },
  { icon: Github, label: "GitHub", href: "https://github.com" },
  { icon: Twitter, label: "Twitter", href: "https://twitter.com" },
];

const ContactSection = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <FloatingParticles count={10} />
      <div className="container mx-auto px-6 md:px-12 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>

          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Let's <span className="text-gradient">Connect</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: 64 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="h-1 rounded-full mx-auto mb-8"
            style={{ background: "var(--gradient-accent)" }}
          />
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
            Whether it's about engineering, entrepreneurship, or the next great ride — I'd love to hear from you.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-muted-foreground">
            <motion.a
              href="tel:+916379271851"
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4 text-primary" />
              6379271851
            </motion.a>
            <motion.a
              href="mailto:rajkumarsenthil02@gmail.com"
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4 text-primary" />
              rajkumarsenthil02@gmail.com
            </motion.a>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Chennai, 600032
            </span>
          </div>

          <motion.a
            href="mailto:rajkumarsenthil02@gmail.com"
            whileHover={{ scale: 1.08, boxShadow: "0 8px 40px -6px hsl(210 75% 50% / 0.5)" }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-display font-semibold text-lg shadow-[var(--shadow-glow)] transition-shadow"
          >
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Mail className="w-5 h-5" />
            </motion.span>
            Get in Touch
          </motion.a>

          <div className="flex justify-center gap-5 mt-12">
            {socials.map((social, i) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                whileHover={{
                  y: -8,
                  scale: 1.2,
                  rotate: [0, -10, 10, 0],
                  transition: { duration: 0.4 },
                }}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:shadow-[var(--shadow-glow)] transition-colors duration-300"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
