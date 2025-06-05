// components/Services.js
const Services = () => (
  <div className="service_area">
    <div className="container">
      <div className="row">
        <div className="col-xl-4 col-md-4">
          <div className="single_service text-center">
            <div className="icon">
              <img
                src="img/svg_icon/seo_1.svg"
                alt="Gestion des utilisateurs"
              />
            </div>
            <h3>Gestion des utilisateurs</h3>
            <p>
              Créez des profils utilisateurs avec des rôles (Admin, Manager,
              Membre), gérez leurs permissions et suivez leur activité au sein
              de vos projets.
            </p>
          </div>
        </div>
        <div className="col-xl-4 col-md-4">
          <div className="single_service text-center">
            <div className="icon">
              <img
                src="img/svg_icon/seo_2.svg"
                alt="Espaces de travail & Tableaux"
              />
            </div>
            <h3>Espaces de travail & Tableaux</h3>
            <p>
              Organisez vos projets en créant des espaces de travail et des
              tableaux. Gérez les membres et leurs permissions, et optimisez la
              collaboration.
            </p>
          </div>
        </div>
        <div className="col-xl-4 col-md-4">
          <div className="single_service text-center">
            <div className="icon">
              <img
                src="img/svg_icon/seo_3.svg"
                alt="Suivi du temps automatique"
              />
            </div>
            <h3>Suivi du temps automatique</h3>
            <p>
              Suivez automatiquement le temps passé sur chaque tâche, obtenez
              des rapports détaillés et exportez vos activités pour analyser la
              productivité.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Services;
