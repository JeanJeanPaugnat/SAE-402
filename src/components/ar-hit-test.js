/* * Composant : ar-hit-test
 * Description : Gère la détection de surface (Hit Test) et le placement d'objets en AR.
 * Auteur : Ton Nom / Prof Helper
 */

AFRAME.registerComponent('ar-hit-test', {
  schema: {
    target: { type: 'selector' }, // L'objet à faire apparaître (ex: #coffee-machine)
    enabled: { type: 'boolean', default: true } // Pour activer/désactiver le scan
  },

  init: function () {
    // Variables pour stocker les références WebXR
    this.xrHitTestSource = null;
    this.viewerSpace = null;
    this.refSpace = null;

    // Masquer le curseur (l'anneau) au début tant qu'on n'a pas détecté de surface
    this.el.setAttribute('visible', false);

    // Écouter le démarrage de la session AR (quand tu cliques sur "Enter AR")
    this.el.sceneEl.renderer.xr.addEventListener('sessionstart', (ev) => {
      this.viewerSpace = null;
      this.refSpace = null;
      this.xrHitTestSource = null;
    });

    // Écouter le clic (Gâchette manette ou Tap sur l'écran)
    this.el.sceneEl.addEventListener('click', () => {
      this.placeObject();
    });
  },

  tick: function () {
    // Si le composant est désactivé, on ne fait rien
    if (!this.data.enabled) return;

    const frame = this.el.sceneEl.frame;
    const xrViewerBase = this.el.sceneEl.renderer.xr.getReferenceSpace();

    // Vérification de sécurité : sommes-nous bien en mode AR/XR ?
    if (!this.el.sceneEl.is('ar-mode') || !frame || !xrViewerBase) return;

    // 1. Initialisation de la source de Hit Test (une seule fois)
    if (!this.xrHitTestSource && !this.requestingHitTest) {
      this.requestHitTestSource();
      return;
    }

    // 2. Récupérer les résultats du test de collision pour cette frame
    if (this.xrHitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);

      if (hitTestResults.length > 0) {
        // BINGO ! On a touché une surface réelle (sol ou table)
        const hit = hitTestResults[0];
        const pose = hit.getPose(xrViewerBase);

        // On rend le curseur visible
        this.el.setAttribute('visible', true);

        // On déplace le curseur à la position détectée
        this.el.object3D.position.copy(pose.transform.position);
        this.el.object3D.quaternion.copy(pose.transform.orientation);
        
      } else {
        // Pas de surface détectée (on regarde le plafond ou le vide)
        this.el.setAttribute('visible', false);
      }
    }
  },

  requestHitTestSource: function () {
    this.requestingHitTest = true;
    const session = this.el.sceneEl.renderer.xr.getSession();

    // Demander au WebXR de créer un rayon de détection
    session.requestReferenceSpace('viewer').then((refSpace) => {
      this.viewerSpace = refSpace;
      session.requestHitTestSource({ space: this.viewerSpace })
        .then((source) => {
          this.xrHitTestSource = source;
          this.requestingHitTest = false;
        });
    });
  },

  placeObject: function () {
    // Si le curseur n'est pas visible, on ne peut rien poser
    if (!this.el.getAttribute('visible')) return;

    // Si on n'a pas défini d'objet cible dans le HTML, erreur
    if (!this.data.target) {
      console.error("Aucun objet cible défini ! Ajoutez target: #id-objet");
      return;
    }

    // --- LOGIQUE DE SPAWN ---
    
    // 1. On rend l'objet cible visible (si c'était la machine cachée)
    // OU on le clone si on veut poser plusieurs objets (optionnel)
    const targetEntity = this.data.target;
    
    // On copie la position et la rotation du curseur vers l'objet
    targetEntity.object3D.position.copy(this.el.object3D.position);
    targetEntity.object3D.quaternion.copy(this.el.object3D.quaternion);
    
    // On affiche l'objet
    targetEntity.setAttribute('visible', true);

    // Optionnel : Désactiver le scan après avoir posé l'objet (pour figer le setup)
    // this.data.enabled = false; 
    // this.el.setAttribute('visible', false);
    
    console.log("Objet placé avec succès !");
  }
});