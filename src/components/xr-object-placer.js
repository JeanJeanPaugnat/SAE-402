/**
 * ============================================
 * Composant : xr-object-placer
 * ============================================
 * 
 * INSPIRE DE : webxr-samples/hit-test.html (fonction onSelect)
 * 
 * ROLE :
 *   - Ecoute les evenements "select" (tap ecran ou trigger manette)
 *   - Place un objet 3D a la position du reticule
 * 
 * COMMENT CA MARCHE (comme dans webxr-samples) :
 *   1. L'utilisateur vise une surface (reticule visible)
 *   2. Il appuie sur trigger ou tap sur l'ecran
 *   3. WebXR emet un evenement "select"
 *   4. On recupere la position du reticule et on place l'objet
 * 
 * UTILISATION :
 *   <a-entity xr-object-placer="model: #coffee-cup-model; scale: 0.1"></a-entity>
 */

AFRAME.registerComponent('xr-object-placer', {
  schema: {
    // ID du modele a placer
    model: { type: 'string', default: '#coffee-cup-model' },
    // Echelle du modele
    scale: { type: 'number', default: 0.1 },
    // Nombre maximum d'objets (comme dans webxr-samples)
    maxObjects: { type: 'number', default: 30 }
  },

  init: function () {
    // Liste des objets places
    this.placedObjects = [];
    
    // Reference au composant xr-hit-test
    this.hitTestComponent = null;
    
    // Reference au debug
    this.debugEl = document.querySelector('#debug-status');
    this.countEl = document.querySelector('#cup-count');
    
    // Ecouter l'evenement "select" de WebXR
    // C'est l'equivalent du tap sur ecran ou trigger sur manette
    this.el.sceneEl.addEventListener('enter-vr', () => {
      const session = this.el.sceneEl.renderer.xr.getSession();
      if (session) {
        // === EVENEMENT SELECT ===
        // Comme dans webxr-samples/hit-test.html ligne 139
        session.addEventListener('select', this.onSelect.bind(this));
      }
      
      // Trouver le composant hit-test
      const hitTestEl = document.querySelector('[xr-hit-test]');
      if (hitTestEl) {
        this.hitTestComponent = hitTestEl.components['xr-hit-test'];
      }
    });
    
    this.updateDebug('xr-object-placer pret');
  },

  updateDebug: function (msg) {
    if (this.debugEl) this.debugEl.textContent = msg;
  },

  updateCount: function () {
    if (this.countEl) {
      this.countEl.textContent = 'Objets places: ' + this.placedObjects.length;
    }
  },

  /**
   * Appele quand on "select" (tap ou trigger)
   * Exactement comme dans webxr-samples/hit-test.html
   */
  onSelect: function (event) {
    // Verifier qu'on a un hit-test actif
    if (!this.hitTestComponent || !this.hitTestComponent.hasHit()) {
      this.updateDebug('Visez une surface !');
      return;
    }
    
    // Recuperer la position du hit
    const hitPose = this.hitTestComponent.getHitPose();
    if (!hitPose) return;
    
    // Placer l'objet
    this.placeObject(hitPose);
  },

  /**
   * Place un objet a la position donnee
   */
  placeObject: function (pose) {
    const position = pose.transform.position;
    
    // Creer l'entite
    const entity = document.createElement('a-entity');
    
    // Configurer le modele
    entity.setAttribute('gltf-model', this.data.model);
    entity.setAttribute('scale', `${this.data.scale} ${this.data.scale} ${this.data.scale}`);
    
    // Positionner (leger decalage Y pour que l'objet soit SUR la surface)
    entity.setAttribute('position', {
      x: position.x,
      y: position.y + 0.01,
      z: position.z
    });
    
    // ID unique
    entity.setAttribute('id', 'object-' + Date.now());
    
    // Rendre attrapable (si le composant existe)
    entity.setAttribute('grabbable', '');
    
    // Ajouter a la scene
    this.el.sceneEl.appendChild(entity);
    this.placedObjects.push(entity);
    
    // === LIMITER LE NOMBRE D'OBJETS ===
    // Exactement comme dans webxr-samples/hit-test.html ligne 150
    if (this.placedObjects.length > this.data.maxObjects) {
      const oldObject = this.placedObjects.shift();
      oldObject.parentNode.removeChild(oldObject);
    }
    
    // Mettre a jour le compteur
    this.updateCount();
    this.updateDebug('Objet place ! (' + this.placedObjects.length + ')');
  }
});
