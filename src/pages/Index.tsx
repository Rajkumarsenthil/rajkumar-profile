import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import PassionsGrid from "@/components/PassionsGrid";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <AboutSection />
      <PassionsGrid />
      <FooterSection />
    </div>
  );
};

export default Index;
