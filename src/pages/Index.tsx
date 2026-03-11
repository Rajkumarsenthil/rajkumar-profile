import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ExperienceSection from "@/components/ExperienceSection";
import PassionsGrid from "@/components/PassionsGrid";
import ContactSection from "@/components/ContactSection";
import FooterSection from "@/components/FooterSection";
import ThemeToggle from "@/components/ThemeToggle";
import MouseGlow from "@/components/MouseGlow";
import { RidingBike, MountainScene, SeaBreeze } from "@/components/AnimatedElements";

const Index = () => {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <MouseGlow />
      <ThemeToggle />
      <HeroSection />
      <AboutSection />
      <RidingBike />
      <ExperienceSection />
      <PassionsGrid />
      <MountainScene />
      <ContactSection />
      <SeaBreeze />
      <FooterSection />
    </div>
  );
};

export default Index;
