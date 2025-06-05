// components/CompanyInfo.js
import Image from "next/image";

const CompanyInfo = () => (
  <div className="company_info">
    <div className="container">
      <div className="row">
        <div className="col-xl-5 col-md-5">
          <div className="man_thumb">
            <Image
              src="/img/ilstrator/man.png"
              alt="Team illustration"
              width={500}
              height={500}
            />
          </div>
        </div>
        <div className="col-xl-7 col-md-7">
          <div className="company_info_text">
            <h3>
              Donnez à vos équipes les moyens de collaborer, suivre le temps{" "}
              <br />
              et gérer les tâches sans effort.
            </h3>
            <p>
              Notre plateforme offre une solution complète pour la gestion des
              utilisateurs, des espaces de travail et des projets. Avec une
              gestion puissante des tâches, une collaboration en temps réel et
              un suivi automatique du temps, les équipes peuvent se concentrer
              sur ce qui compte vraiment : obtenir des résultats.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CompanyInfo;
