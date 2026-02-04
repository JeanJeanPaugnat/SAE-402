/**
 * ============================================
 * Composant : xr-hit-test
 * ============================================
 * 
 * INSPIRE DE : webxr-samples/hit-test.html
 * 
 * ROLE : 
 *   - Detecte les surfaces reelles avec WebXR Hit-Test API
 *   - Affiche un reticule sur la surface detectee
 *   - Emet un evenement quand on "select" (tap/trigger)
 * 
 * COMMENT WEBXR HIT-TEST FONCTIONNE :
 *   1. On demande un "viewer" reference space (la position de ta tete)
 *   2. On cree un "hit test source" depuis ce viewer space
 *   3. A chaque frame, on recupere les resultats du hit-test
 *   4. Si on touche une surface, on a la position 3D
 * 
 * UTILISATION :
 *   <a-entity xr-hit-test></a-entity>
 */

AFRAME.registerComponent('xr-hit-test', {
  schema: {
    // Selecteur du reticule a deplacer
    reticle: { type: 'selector', default: '#reticle' }
  },

  init: function () {
    // === VARIABLES WEBXR ===
    this.xrHitTestSource = null;
    this.xrViewerSpace = null;
    this.hitTestRequested = false;
    
    // Derniere position detectee (pour placement)
    this.lastHitPose = null;
    
    // Reference au debug
    this.debugEl = document.querySelector('#debug-status');
    
    // Ecouter les evenements XR
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterXR.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitXR.bind(this));
    
    this.updateDebug('xr-hit-test pret');
  },

  updateDebug: function (msg) {
    if (this.debugEl) this.debugEl.textContent = msg;
  },

  /**
   * Quand on entre en mode XR (AR)
   */
  onEnterXR: function () {
    this.updateDebug('Session XR demarree...');
    
    // Attendre que la session soit prete
    setTimeout(() => {
      this.setupHitTest();
    }, 500);
  },

  /**
   * Quand on sort du mode XR
   */
  onExitXR: function () {
    if (this.xrHitTestSource) {
      this.xrHitTestSource.cancel();
      this.xrHitTestSource = null;
    }
    this.hitTestRequested = false;
    this.updateDebug('Session XR terminee');
  },

  /**
   * Configure le hit-test (comme dans webxr-samples/hit-test.html)
   */
  setupHitTest: function () {
    const session = this.el.sceneEl.renderer.xr.getSession();
    
    if (!session) {
      this.updateDebug('Pas de session XR');
      return;
    }
    
    // Demander un "viewer" reference space
    // C'est l'espace de reference de ta tete/camera
    session.requestReferenceSpace('viewer').then((viewerSpace) => {
      this.xrViewerSpace = viewerSpace;
      
      // Creer la source de hit-test
      // Ca envoie un rayon depuis ta tete vers l'avant
      session.requestHitTestSource({ space: viewerSpace }).then((hitTestSource) => {
        this.xrHitTestSource = hitTestSource;
        this.updateDebug('Hit-test actif ! Visez une surface');
      }).catch((err) => {
        this.updateDebug('Erreur hit-test: ' + err.message);
      });
    }).catch((err) => {
      this.updateDebug('Erreur viewer space: ' + err.message);
    });
  },

  /**
   * Appele a chaque frame (60fps)
   * C'est ici qu'on recupere les resultats du hit-test
   */
  tick: function () {
    // Verifications
    const frame = this.el.sceneEl.frame;
    const session = this.el.sceneEl.renderer.xr.getSession();
    const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
    
    if (!frame || !session || !refSpace || !this.xrHitTestSource) {
      return;
    }

    // === RECUPERER LES RESULTATS DU HIT-TEST ===
    // Exactement comme dans webxr-samples/hit-test.html
    const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);

    if (hitTestResults.length > 0) {
      // ON A TOUCHE UNE SURFACE !
      const hit = hitTestResults[0];
      const pose = hit.getPose(refSpace);

      if (pose && this.data.reticle) {
        // Sauvegarder pour le placement
        this.lastHitPose = pose;
        
        // Deplacer le reticule
        const position = pose.transform.position;
        const orientation = pose.transform.orientation;
        
        this.data.reticle.object3D.position.set(
          position.x,
          position.y,
          position.z
        );
        this.data.reticle.object3D.quaternion.set(
          orientation.x,
          orientation.y,
          orientation.z,
          orientation.w
        );
        
        // Afficher le reticule
        this.data.reticle.setAttribute('visible', true);
      }
    } else {
      // Pas de surface - cacher le reticule
      if (this.data.reticle) {
        this.data.reticle.setAttribute('visible', false);
      }
      this.lastHitPose = null;
    }
  },

  /**
   * Retourne la derniere position detectee
   * Utilise par d'autres composants pour placer des objets
   */
  getHitPose: function () {
    return this.lastHitPose;
  },

  /**
   * Verifie si une surface est detectee
   */
  hasHit: function () {
    return this.lastHitPose !== null;
  }
});