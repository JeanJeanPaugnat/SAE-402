/**
 * ============================================
 * Composant : cup-spawner
 * ============================================
 * 
 * RÔLE : Permet de créer (spawn) une tasse de café avec le bouton A
 *        et de la poser au sol avec le trigger.
 * 
 * UTILISATION dans le HTML :
 *   <a-entity oculus-touch-controls="hand: right" cup-spawner></a-entity>
 * 
 * WORKFLOW :
 *   1. Bouton A → Crée une tasse attachée à la manette
 *   2. Trigger → Détache la tasse et la pose dans le monde
 *   3. La tasse devient "grabbable" (attrapable avec le grip)
 */

AFRAME.registerComponent('cup-spawner', {
  schema: {
    // Échelle du modèle 3D de la tasse
    cupScale: { type: 'number', default: 0.1 },
    // ID du modèle de tasse à utiliser
    cupModel: { type: 'string', default: '#coffee-cup-model' }
  },

  init: function () {
    // La tasse actuellement tenue (null si rien)
    this.heldCup = null;
    // Compteur pour les IDs uniques
    this.cupCount = 0;
    
    // Référence au debug DOM
    this.debugEl = document.querySelector('#debug-status');
    this.countEl = document.querySelector('#cup-count');
    
    // Écouter le bouton A pour spawner une tasse
    this.el.addEventListener('abuttondown', this.onAButton.bind(this));
    
    // Écouter le trigger pour poser la tasse
    this.el.addEventListener('triggerdown', this.onTrigger.bind(this));
    
    this.updateDebug('Cup-spawner prêt (A = spawn, Trigger = poser)');
  },

  /**
   * Met à jour le debug dans le DOM
   */
  updateDebug: function (message) {
    if (this.debugEl) {
      this.debugEl.textContent = message;
    }
  },

  /**
   * Met à jour le compteur de tasses
   */
  updateCount: function () {
    if (this.countEl) {
      this.countEl.textContent = 'Tasses posées: ' + this.cupCount;
    }
  },

  /**
   * Appelé quand on appuie sur le bouton A
   */
  onAButton: function () {
    // Si on a déjà une tasse en main, ne rien faire
    if (this.heldCup) {
      this.updateDebug('Vous tenez déjà une tasse !');
      return;
    }
    
    // Créer une nouvelle tasse attachée à la manette
    this.spawnCupInHand();
  },

  /**
   * Crée une tasse et l'attache à la manette
   */
  spawnCupInHand: function () {
    // Créer l'entité tasse
    const cup = document.createElement('a-entity');
    
    // Configurer le modèle 3D
    cup.setAttribute('gltf-model', this.data.cupModel);
    cup.setAttribute('scale', {
      x: this.data.cupScale,
      y: this.data.cupScale,
      z: this.data.cupScale
    });
    
    // ID unique pour le debug
    cup.setAttribute('id', 'cup-' + Date.now());
    
    // Position relative à la manette (légèrement devant)
    cup.setAttribute('position', { x: 0, y: 0.05, z: -0.05 });
    
    // Ajouter comme ENFANT de la manette
    // → La tasse suit automatiquement la manette !
    this.el.appendChild(cup);
    
    // Sauvegarder la référence
    this.heldCup = cup;
    
    this.updateDebug('Tasse créée ! Appuyez Trigger pour poser');
  },

  /**
   * Appelé quand on appuie sur le trigger
   */
  onTrigger: function () {
    // Si pas de tasse en main, ne rien faire
    if (!this.heldCup) {
      return;
    }
    
    // Poser la tasse
    this.placeCup();
  },

  /**
   * Détache la tasse de la manette et la place dans le monde
   */
  placeCup: function () {
    if (!this.heldCup) return;
    
    // 1. Récupérer la position MONDIALE actuelle de la tasse
    const worldPosition = new THREE.Vector3();
    this.heldCup.object3D.getWorldPosition(worldPosition);
    
    const worldQuaternion = new THREE.Quaternion();
    this.heldCup.object3D.getWorldQuaternion(worldQuaternion);
    
    // 2. Détacher de la manette
    const cup = this.heldCup;
    this.el.removeChild(cup);
    
    // 3. Ajouter à la scène principale
    this.el.sceneEl.appendChild(cup);
    
    // 4. Repositionner à la position mondiale
    cup.object3D.position.copy(worldPosition);
    cup.object3D.quaternion.copy(worldQuaternion);
    
    // 5. Rendre la tasse attrapable
    cup.setAttribute('grabbable', '');
    
    // 6. Incrémenter le compteur
    this.cupCount++;
    this.updateCount();
    
    // 7. Vider la référence
    this.heldCup = null;
    
    this.updateDebug('Tasse posée ! (A = nouvelle tasse)');
  }
});
