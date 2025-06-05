// components/Features.js
import Image from "next/image";

const Features = () => (
  <div className="features_area">
    <div className="container">
      <div className="row">
        <div className="col-xl-12">
          <div className="section_title text-center">
            <h3>
              Découvrez les fonctionnalités puissantes pour gérer vos projets
            </h3>
            <p>
              Des outils adaptés pour faciliter la gestion des utilisateurs, des
              projets, et des tâches, tout en optimisant la collaboration et la
              productivité.
            </p>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-xl-4 col-md-6 col-lg-4">
          <div className="single_feature">
            <div className="icon">
              <Image
                src="/img/svg_icon/feature_1.svg"
                alt="Gestion des utilisateurs"
                width={35}
                height={35}
              />
            </div>
            <h4>Gestion des utilisateurs</h4>
            <p>
              Créez et gérez des profils avec des rôles personnalisés (Admin,
              Manager, Membre) et suivez leur activité.
            </p>
          </div>
        </div>
        <div className="col-xl-4 col-md-6 col-lg-4">
          <div className="single_feature">
            <div className="icon">
              <Image
                src="/img/svg_icon/feature_2.svg"
                alt="Espaces de travail & Tableaux"
                width={35}
                height={35}
              />
            </div>
            <h4>Espaces de travail & Tableaux</h4>
            <p>
              Organisez vos projets avec des espaces de travail et des tableaux
              pour une gestion simplifiée et structurée.
            </p>
          </div>
        </div>
        <div className="col-xl-4 col-md-6 col-lg-4">
          <div className="single_feature">
            <div className="icon">
              <Image
                src="/img/svg_icon/feature_3.svg"
                alt="Suivi du temps automatique"
                width={35}
                height={35}
              />
            </div>
            <h4>Suivi du temps automatique</h4>
            <p>
              Suivez le temps passé sur chaque tâche et générez des rapports
              détaillés pour analyser la productivité.
            </p>
          </div>
        </div>
        <div className="col-xl-4 col-md-6 col-lg-4">
          <div className="single_feature">
            <div className="icon">
              <Image
                src="/img/svg_icon/feature_4.svg"
                alt="Remplissage automatique des tickets avec IA"
                width={35}
                height={35}
              />
            </div>
            <h4>Remplissage automatique des tickets avec IA</h4>
            <p>
              Utilisez l'intelligence artificielle pour générer automatiquement
              les titres, descriptions et sous-tâches des tickets.
            </p>
          </div>
        </div>
        <div className="col-xl-4 col-md-6 col-lg-4">
          <div className="single_feature">
            <div className="icon">
              <Image
                src="/img/svg_icon/feature_5.svg"
                alt="Notifications & Historique"
                width={35}
                height={35}
              />
            </div>
            <h4>Notifications & Historique</h4>
            <p>
              Recevez des notifications en temps réel et consultez l'historique
              des actions pour chaque utilisateur et tâche.
            </p>
          </div>
        </div>
        <div className="col-xl-4 col-md-6 col-lg-4">
          <div className="single_feature">
            <div className="icon">
              <Image
                src="/img/svg_icon/feature_6.svg"
                alt="Tableau de bord Admin"
                width={35}
                height={35}
              />
            </div>
            <h4>Tableau de bord Admin</h4>
            <p>
              Gérez les utilisateurs, suivez les temps de travail, et accédez à
              des rapports détaillés pour une gestion efficace.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Features;
