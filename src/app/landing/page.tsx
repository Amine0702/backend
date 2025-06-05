// pages/index.js
import "./landing.css";
import Header from "./components/Header";
import Slider from "./components/Slider";
import Services from "./components/Services";
import CompanyInfo from "./components/CompanyInfo";
import Features from "./components/Features";
import Footer from "./components/Footer";

export default function LandinPage() {
  return (
    <div>
      <Header />
      <Slider />
      <section id="services">
        <Services />
      </section>

      <section id="CompanyInfo">
        <CompanyInfo />
      </section>

      <section id="features">
        <Features />
      </section>

      <Footer />
    </div>
  );
}
