import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const letterVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.04, duration: 0.5, ease: "easeOut" as const }
  })
};

const AnimatedText = ({ text, className }: {text: string;className?: string;}) =>
<span className={className}>
    {text.split("").map((char, i) =>
  <motion.span
    key={i}
    custom={i}
    variants={letterVariants}
    initial="hidden"
    animate="visible"
    className="inline-block">
    
        {char === " " ? "\u00A0" : char}
      </motion.span>
  )}
  </span>;


const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }} />
        
        <div
          className="absolute inset-0 opacity-70"
          style={{ background: "var(--gradient-hero)" }} />
        
      </div>

      <motion.div
        className="absolute top-20 right-20 w-72 h-72 rounded-full opacity-20"
        style={{ background: "var(--gradient-blue)" }}
        animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      
      <motion.div
        className="absolute bottom-40 left-10 w-40 h-40 rounded-full opacity-10"
        style={{ background: "var(--gradient-accent)" }}
        animate={{ y: [0, 15, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      

      <div className="relative z-10 container mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}>
          
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-primary tracking-[0.3em] uppercase text-sm mb-6 font-medium">
            
            Full Stack Developer · Engineering Lead · Explorer
          </motion.p>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-8">
            <AnimatedText text="Rajkumar" />
            <br />
            <span className="text-gradient">
              <AnimatedText text="Senthil" />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            className="font-body text-muted-foreground text-lg md:text-xl max-w-lg leading-relaxed">
            
            Full-stack engineer with 4+ years building scalable, workflow-intensive
            applications. Rider, adventurer, and aspiring entrepreneur from Chennai.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="mt-10 flex gap-4 flex-wrap">
            
            {["Facilio", "Java & Vue.js", "4+ Years", "Chennai"].map((tag, i) =>
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8 + i * 0.15 }}
              className="px-4 py-2 rounded-full border border-primary/30 text-primary text-sm font-display font-medium backdrop-blur-sm bg-background/20">
              
                {tag}
              </motion.span>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2">
          
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-primary/40 flex items-start justify-center p-1.5">
            
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 rounded-full bg-primary" />
            
          </motion.div>
        </motion.div>
      </div>
    </section>);

};

export default HeroSection;