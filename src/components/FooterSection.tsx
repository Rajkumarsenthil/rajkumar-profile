const FooterSection = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-display text-lg font-semibold tracking-tight">
          Lead Engineer<span className="text-primary">.</span>
        </p>
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} — Built with curiosity & code.
        </p>
      </div>
    </footer>
  );
};

export default FooterSection;
