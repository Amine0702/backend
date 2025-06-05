"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

const Header = () => {
  const [isSignInVisible, setIsSignInVisible] = useState(false);

  return (
    <header>
      <div className="header-area">
        <div id="sticky-header" className="main-header-area">
          <div className="container-fluid">
            <div className="row align-items-center">
              {/* Logo */}
              <div className="col-xl-3 col-lg-2">
                <div className="Logo">
                  <Link href="/">
                    <img src="img/logo/logo.png" alt="Logo" height={100} />
                  </Link>
                </div>
              </div>

              {/* Menu principal */}
              <div className="col-xl-6 col-lg-7">
                <div className="main-menu d-none d-lg-block">
                  <nav>
                    <ul id="navigation">
                      <li>
                        <Link href="/">Accueil</Link>
                      </li>
                      <li>
                        <Link href="/#services">Services</Link>
                      </li>
                      <li>
                        <Link href="/#features">Fonctionnalités</Link>
                      </li>
                      <li>
                        <Link href="/#CompanyInfo">À propos</Link>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>

              {/* Bouton + Icône utilisateur */}
              <div className="col-xl-3 col-lg-3">
                <div className="Appointment">
                  <div
                    className="d-flex align-items-center"
                    style={{ gap: "1rem" }}
                  >
                    {/* Show link to home page if logged in */}
                    <SignedOut>
                      <Link href="/sign-in" className="boxed-btn3">
                        <i className="fa fa-phone"></i> Commencer
                      </Link>
                    </SignedOut>

                    <SignedIn>
                      <UserButton />
                    </SignedIn>
                  </div>
                </div>
              </div>

              {/* Menu mobile */}
              <div className="col-12">
                <div className="mobile_menu d-block d-lg-none"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
