/**
 * ============================================
 * Composant : controller-grab
 * ============================================
 * 
 * ROLE : Permet d'attraper des objets avec le bouton GRIP de la manette
 * 
 * UTILISATION dans le HTML :
 *   <a-entity oculus-touch-controls="hand: right" controller-grab></a-entity>
 * 
 * COMMENT CA MARCHE :
 *   1. Tu appuies sur GRIP pres d'un objet [grabbable]
 *   2. L'objet le plus proche (< 15cm) s'attache a ta manette
 *   3. Tu relaches GRIP -> l'objet est lache
 */

AFRAME.registerComponent('controller-grab', {
  schema: {
    // Quelle main ? (left ou right)
    hand: { type: 'string', default: 'right' },
    // Distance max pour attraper (en metres)
    grabDistance: { type: 'number', default: 0.15 }
  },

  init: function () {
    // L'objet actuellement tenu
    this.grabbedEl = null;
    
    // Ecouter le bouton GRIP
    this.el.addEventListener('gripdown', this.onGripDown.bind(this));
    this.el.addEventListener('gripup', this.onGripUp.bind(this));
  },

  /**
   * Appele a chaque frame quand on tient un objet
   */
  tick: function () {
    if (!this.grabbedEl) return;
    
    // Recuperer la position mondiale de la manette
    const controllerPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(controllerPos);
    
    const controllerQuat = new THREE.Quaternion();
    this.el.object3D.getWorldQuaternion(controllerQuat);
    
    // Deplacer l'objet tenu a la position de la manette
    this.grabbedEl.object3D.position.copy(controllerPos);
    this.grabbedEl.object3D.quaternion.copy(controllerQuat);
  },

  /**
   * Appele quand on appuie sur GRIP
   */
  onGripDown: function () {
    // Si on tient deja quelque chose, ne rien faire
    if (this.grabbedEl) return;
    
    // Position de la manette
    const controllerPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(controllerPos);
    
    // Chercher tous les objets attrapables
    const grabbables = document.querySelectorAll('[grabbable]');
    
    let closestEl = null;
    let closestDist = this.data.grabDistance;
    
    // Trouver le plus proche
    grabbables.forEach((el) => {
      const objPos = new THREE.Vector3();
      el.object3D.getWorldPosition(objPos);
      
      const dist = controllerPos.distanceTo(objPos);
      if (dist < closestDist) {
        closestDist = dist;
        closestEl = el;
      }
    });
    
    // Si on a trouve un objet assez proche
    if (closestEl) {
      this.grabbedEl = closestEl;
      // Emettre un evenement sur l'objet
      closestEl.emit('grab-start', { hand: this.data.hand });
    }
  },

  /**
   * Appele quand on relache GRIP
   */
  onGripUp: function () {
    if (this.grabbedEl) {
      // Emettre un evenement sur l'objet
      this.grabbedEl.emit('grab-end', { hand: this.data.hand });
      this.grabbedEl = null;
    }
  }
});


/**
 * ============================================
 * Composant : grabbable
 * ============================================
 * 
 * ROLE : Marque un objet comme "attrapable" par controller-grab
 * 
 * UTILISATION dans le HTML :
 *   <a-box grabbable></a-box>
 * 
 * FONCTIONNALITES :
 *   - Change de couleur quand attrape (feedback visuel)
 *   - Emet des evenements grab-start et grab-end
 */

AFRAME.registerComponent('grabbable', {
  init: function () {
    // Couleur originale pour la restaurer
    this.originalColor = null;
    
    // Quand on attrape l'objet
    this.el.addEventListener('grab-start', (evt) => {
      // Sauvegarder la couleur
      const mat = this.el.getAttribute('material');
      if (mat && mat.color) {
        this.originalColor = mat.color;
      }
      
      // Changer la couleur en dore
      this.el.setAttribute('material', 'color', '#FFD700');
    });
    
    // Quand on lache l'objet
    this.el.addEventListener('grab-end', (evt) => {
      // Restaurer la couleur
      if (this.originalColor) {
        this.el.setAttribute('material', 'color', this.originalColor);
      }
    });
  }
});
