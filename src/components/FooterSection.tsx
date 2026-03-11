import { motion } from "framer-motion";

const FooterSection = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="py-12 border-t border-border"
    >
      <div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <motion.p
          whileHover={{ scale: 1.05 }}
          className="font-display text-lg font-semibold tracking-tight cursor-default"
        >
          Lead Engineer<span className="text-primary">.</span>
        </motion.p>
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} — Built with curiosity & code.
        </p>
      </div>
    </motion.footer>
  );
};

export default FooterSection;
