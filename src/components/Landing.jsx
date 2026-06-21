import Nav from "./Nav";
import Hero from "./Hero";
import Stats from "./Stats";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import Testimonials from "./Testimonials";
import CtaSection from "./CtaSection";
import Footer from "./Footer";

export default function Landing({ onLogin, onRegister }) {
  return (
    <>
      <Nav onLogin={onLogin} onRegister={onRegister} />
      <Hero onRegister={onRegister} />
      <Stats />
      <HowItWorks />
      <Features />
      <Testimonials />
      <CtaSection onRegister={onRegister} onLogin={onLogin} />
      <Footer />
    </>
  );
}
