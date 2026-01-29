/**
 * ============================================
 * Composant : ar-hit-test
 * ============================================
 * 
 * RÔLE : Détecte les surfaces réelles (sol, table) avec WebXR Hit-Test.
 *        Affiche un curseur (réticule) là où le rayon touche une surface.
 * 
 * UTILISATION dans le HTML :
 *   <a-entity ar-hit-test="#reticle"></a-entity>
 *   <a-entity id="reticle" visible="false">...</a-entity>
 * 
 * COMMENT ÇA MARCHE :
 *   1. WebXR envoie un rayon invisible depuis ta tête (ou manette)
 *   2. Si le rayon touche une surface réelle, on récupère la position
 *   3. On déplace le réticule à cette position
 *   4. Quand tu appuies sur le trigger, on émet un événement "ar-hit-confirmed"
 */

AFRAME.registerComponent('ar-hit-test', {
  schema: {
    // Le réticule à déplacer (curseur visuel)
    reticle: { type: 'selector', default: '#reticle' }
  },

  init: function () {
    // Variables WebXR
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    this.lastHitPosition = null;
    this.lastHitRotation = null;
    
    // Référence au debug DOM
    this.debugEl = document.querySelector('#debug-status');
    
    // Écouter les événements de session XR
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitVR.bind(this));
    
    this.updateDebug('Composant ar-hit-test prêt');
  },

  /**
   * Met à jour le debug dans le DOM (pas la console)
   */
  updateDebug: function (message) {
    if (this.debugEl) {
      this.debugEl.textContent = message;
    }
  },

  /**
   * Appelé quand on entre en mode VR/AR
   */
  onEnterVR: function () {
    this.updateDebug('Session AR démarrée...');
    
    // Attendre que la session soit prête
    setTimeout(() => {
      this.requestHitTestSource();
    }, 500);
  },

  /**
   * Appelé quand on sort du mode VR/AR
   */
  onExitVR: function () {
    // Nettoyer la source de hit-test
    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }
    this.hitTestSourceRequested = false;
    this.updateDebug('Session AR terminée');
  },

  /**
   * Demande la création d'une source de hit-test
   * C'est le "rayon" qui va détecter les surfaces
   */
  requestHitTestSource: function () {
    if (this.hitTestSourceRequested) return;
    this.hitTestSourceRequested = true;
    
    const session = this.el.sceneEl.renderer.xr.getSession();
    if (!session) {
      this.updateDebug('Erreur: pas de session XR');
      return;
    }

    // Demander un espace "viewer" (depuis la tête)
    session.requestReferenceSpace('viewer').then((viewerSpace) => {
      // Créer la source de hit-test
      session.requestHitTestSource({ space: viewerSpace }).then((source) => {
        this.hitTestSource = source;
        this.updateDebug('Hit-Test actif ✓');
      }).catch((err) => {
        this.updateDebug('Erreur hit-test: ' + err.message);
      });
    }).catch((err) => {
      this.updateDebug('Erreur viewer space: ' + err.message);
    });
  },

  /**
   * Appelé à chaque frame (60 fois par seconde)
   * C'est ici qu'on récupère les résultats du hit-test
   */
  tick: function () {
    // Vérifier qu'on est bien en session XR
    const frame = this.el.sceneEl.frame;
    const session = this.el.sceneEl.renderer.xr.getSession();
    const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
    
    if (!frame || !session || !refSpace || !this.hitTestSource) return;

    // Récupérer les résultats du hit-test pour cette frame
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);

    if (hitTestResults.length > 0) {
      // ON A TOUCHÉ UNE SURFACE !
      const hit = hitTestResults[0];
      const pose = hit.getPose(refSpace);

      if (pose && this.data.reticle) {
        // Sauvegarder la position/rotation pour plus tard
        this.lastHitPosition = pose.transform.position;
        this.lastHitRotation = pose.transform.orientation;
        
        // Déplacer le réticule
        this.data.reticle.object3D.position.set(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        this.data.reticle.object3D.quaternion.set(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );
        
        // Rendre le réticule visible
        this.data.reticle.setAttribute('visible', true);
      }
    } else {
      // Pas de surface détectée - cacher le réticule
      if (this.data.reticle) {
        this.data.reticle.setAttribute('visible', false);
      }
      this.lastHitPosition = null;
    }
  },

  /**
   * Méthode publique pour récupérer la dernière position détectée
   * Utilisée par d'autres composants (ex: cup-spawner)
   */
  getHitPosition: function () {
    return this.lastHitPosition;
  },

  /**
   * Vérifie si une surface est actuellement détectée
   */
  hasHit: function () {
    return this.lastHitPosition !== null;
  }
});