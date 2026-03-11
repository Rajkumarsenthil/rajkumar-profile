import { motion } from "framer-motion";

const FooterSection = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="py-5 md:py-4"
    >
      <div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center md:items-center justify-between gap-1.5 md:gap-3">
        <motion.p
          whileHover={{ scale: 1.05 }}
          className="font-display text-base md:text-[1.02rem] font-semibold tracking-tight leading-none cursor-default text-center md:text-left"
        >
          Lead Engineer<span className="text-primary">.</span>
        </motion.p>
        <p className="text-muted-foreground text-xs md:text-sm leading-none text-center md:text-right md:ml-auto">
          © {new Date().getFullYear()} — Built with curiosity & code.
        </p>
      </div>
    </motion.footer>
  );
};

export default FooterSection;
