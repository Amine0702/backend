"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Github, Globe, Linkedin, Youtube } from "lucide-react";

const Footer = () => {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="footer">
      <div className="footer_top">
        <div className="container">
          <div className="row">
            {/* Logo et description */}
            <div className="col-xl-4 col-md-6 col-lg-4">
              <div className="footer_widget">
                <div className="Logo">
                  <Link href="/">
                    <Image
                      src="/img/logo/logo.png"
                      alt="Logo"
                      width={150}
                      height={50}
                      priority
                    />
                  </Link>
                </div>
                <p>
                  Simplifiez la gestion de vos projets avec notre plateforme
                  tout-en-un pour la collaboration et la productivité.
                </p>
              </div>
            </div>

            {/* Services */}
            <div className="col-xl-4 col-md-6 col-lg-4">
              <div className="footer_widget">
                <h3 className="footer_title">Services</h3>
                <ul>
                  <li>
                    <Link href="#">Gestion des utilisateurs</Link>
                  </li>
                  <li>
                    <Link href="#">Gestion de projet</Link>
                  </li>
                  <li>
                    <Link href="#">Suivi du temps</Link>
                  </li>
                  <li>
                    <Link href="#">Intégration IA</Link>
                  </li>
                  <li>
                    <Link href="#">Tableau de bord Admin</Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Liens sociaux */}
            <div className="col-xl-4 col-md-6 col-lg-4">
              <div className="footer_widget">
                <h3 className="footer_title">Suivez-nous</h3>
                <div className="social_icons">
                  <a
                    href="https://www.youtube.com/@maisonduweb2738"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social_icon"
                  >
                    <Youtube size={24} />
                  </a>
                  <a
                    href="https://tn.linkedin.com/company/maisonduweb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social_icon"
                  >
                    <Linkedin size={24} />
                  </a>
                  <a
                    href="https://www.maisonduweb.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social_icon"
                  >
                    <Globe size={24} />
                  </a>
                </div>
                <p className="copyright">
                  © {currentYear || new Date().getFullYear()} Tous droits
                  réservés
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
