/* 
 * Composant : controller-grab
 * Description : Permet d'attraper des objets avec les manettes Quest (grip button)
 */

AFRAME.registerComponent('controller-grab', {
  schema: {
    hand: { type: 'string', default: 'right' }
  },

  init: function () {
    this.grabbedEl = null;
    this.grabOffset = new THREE.Vector3();
    this.grabDistance = 0.15; // Distance de grab en mètres
    
    // Écouter le bouton grip de la manette
    this.el.addEventListener('gripdown', this.onGripDown.bind(this));
    this.el.addEventListener('gripup', this.onGripUp.bind(this));
    
    // Aussi écouter le trigger comme alternative
    this.el.addEventListener('triggerdown', this.onGripDown.bind(this));
    this.el.addEventListener('triggerup', this.onGripUp.bind(this));
    
    console.log(`🎮 Controller-grab initialisé pour la main ${this.data.hand}`);
  },

  tick: function () {
    // Si on tient un objet, le déplacer avec la manette
    if (this.grabbedEl) {
      const controllerPos = new THREE.Vector3();
      this.el.object3D.getWorldPosition(controllerPos);
      
      const controllerQuat = new THREE.Quaternion();
      this.el.object3D.getWorldQuaternion(controllerQuat);
      
      // Appliquer la position et rotation
      this.grabbedEl.object3D.position.copy(controllerPos);
      this.grabbedEl.object3D.quaternion.copy(controllerQuat);
    }
  },

  onGripDown: function (evt) {
    if (this.grabbedEl) return;
    
    const controllerPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(controllerPos);
    
    // Chercher l'objet grabbable le plus proche
    const grabbables = document.querySelectorAll('[grabbable]');
    let closestEl = null;
    let closestDist = this.grabDistance;
    
    grabbables.forEach((el) => {
      const objPos = new THREE.Vector3();
      el.object3D.getWorldPosition(objPos);
      
      const dist = controllerPos.distanceTo(objPos);
      if (dist < closestDist) {
        closestDist = dist;
        closestEl = el;
      }
    });
    
    if (closestEl) {
      this.grabbedEl = closestEl;
      closestEl.emit('grab-start', { hand: this.data.hand });
      console.log(`✊ Objet attrapé avec manette: ${closestEl.id || 'sans id'}`);
    }
  },

  onGripUp: function (evt) {
    if (this.grabbedEl) {
      this.grabbedEl.emit('grab-end', { hand: this.data.hand });
      console.log(`🖐️ Objet relâché`);
      this.grabbedEl = null;
    }
  }
});

/* 
 * Composant : hand-grab
 * Description : Permet d'attraper des objets avec les mains en XR (Quest 3)
 */

AFRAME.registerComponent('hand-grab', {
  schema: {
    hand: { type: 'string', default: 'right' } // 'left' ou 'right'
  },

  init: function () {
    this.grabbedEl = null;
    this.grabOffset = new THREE.Vector3();
    
    // Créer une sphère invisible pour détecter les collisions
    this.grabSphere = new THREE.Sphere(new THREE.Vector3(), 0.08); // 8cm de rayon
    
    // Écouter les événements de pinch (pouce + index)
    this.el.addEventListener('pinchstarted', this.onPinchStart.bind(this));
    this.el.addEventListener('pinchended', this.onPinchEnd.bind(this));
    
    console.log(`🖐️ Hand-grab initialisé pour la main ${this.data.hand}`);
  },

  tick: function () {
    // Mettre à jour la position de la sphère de grab
    const handPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(handPos);
    this.grabSphere.center.copy(handPos);
    
    // Si on tient un objet, le déplacer avec la main
    if (this.grabbedEl) {
      this.grabbedEl.object3D.position.copy(handPos);
    }
  },

  onPinchStart: function (evt) {
    if (this.grabbedEl) return; // Déjà en train de tenir quelque chose
    
    // Chercher tous les objets attrapables
    const grabbables = document.querySelectorAll('[grabbable]');
    
    grabbables.forEach((el) => {
      if (this.grabbedEl) return; // Déjà trouvé
      
      const objPos = new THREE.Vector3();
      el.object3D.getWorldPosition(objPos);
      
      // Vérifier si l'objet est dans la sphère de grab
      if (this.grabSphere.containsPoint(objPos)) {
        this.grabbedEl = el;
        
        // Émettre un événement sur l'objet
        el.emit('grab-start', { hand: this.data.hand });
        
        console.log(`✊ Objet attrapé: ${el.id || 'sans id'}`);
      }
    });
  },

  onPinchEnd: function (evt) {
    if (this.grabbedEl) {
      // Émettre un événement sur l'objet
      this.grabbedEl.emit('grab-end', { hand: this.data.hand });
      
      console.log(`🖐️ Objet relâché: ${this.grabbedEl.id || 'sans id'}`);
      this.grabbedEl = null;
    }
  }
});

/* 
 * Composant : grabbable
 * Description : Marque un objet comme attrapable
 */
AFRAME.registerComponent('grabbable', {
  init: function () {
    // Sauvegarder la couleur originale
    this.originalColor = null;
    
    // Feedback visuel quand on attrape l'objet
    this.el.addEventListener('grab-start', () => {
      const mat = this.el.getAttribute('material');
      if (mat) {
        this.originalColor = mat.color || '#4CC3D9';
      }
      this.el.setAttribute('material', 'color', '#FFD700'); // Doré quand attrapé
      this.el.setAttribute('material', 'emissive', '#FF8C00');
    });
    
    this.el.addEventListener('grab-end', () => {
      if (this.originalColor) {
        this.el.setAttribute('material', 'color', this.originalColor);
      }
      this.el.setAttribute('material', 'emissive', '#000000');
    });
  }
});
