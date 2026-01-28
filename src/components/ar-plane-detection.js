/**
 * Composant : ar-plane-detection
 * Description : Détecte les plans (murs, sols, meubles) configurés dans Guardian Space
 * Compatible avec Meta Quest 2/3
 */

AFRAME.registerComponent('ar-plane-detection', {
  schema: {
    visualizePlanes: { type: 'boolean', default: true }, // Afficher les plans détectés
    autoCapture: { type: 'boolean', default: false }, // RESTEZ SUR FALSE : Utilise la config existante
    waitTime: { type: 'number', default: 3000 } // Temps d'attente avant autoCapture (ms)
  },

  init: function () {
    this.planes = new Map(); // Stocke les plans détectés (XRPlane -> Entity)
    this.xrSession = null;
    this.captureInitiated = false;
    this.sessionStartTime = 0;

    // Écouter le démarrage de la session AR
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitVR.bind(this));

    console.log('🔷 Composant ar-plane-detection initialisé');
  },

  onEnterVR: function () {
    const session = this.el.sceneEl.renderer.xr.getSession();

    if (!session) return;

    this.xrSession = session;
    this.sessionStartTime = Date.now();
    this.captureInitiated = false;

    console.log('📱 Session AR démarrée avec plane-detection');

    // Vérifier si l'autoCapture est activée
    if (this.data.autoCapture) {
      setTimeout(() => {
        this.checkAndInitiateCapture();
      }, this.data.waitTime);
    }
  },

  onExitVR: function () {
    // Nettoyer tous les plans visualisés
    this.planes.forEach((entity) => {
      if (entity.parentNode) {
        entity.parentNode.removeChild(entity);
      }
    });
    this.planes.clear();
    this.xrSession = null;
    this.captureInitiated = false;

    console.log('👋 Session AR terminée');
  },

  /**
   * Vérifier s'il y a des plans détectés, sinon lancer la capture
   */
  checkAndInitiateCapture: function () {
    if (!this.xrSession || this.captureInitiated) return;

    // Si aucun plan n'a été détecté après le délai d'attente
    if (this.xrSession.detectedPlanes && this.xrSession.detectedPlanes.size === 0) {
      console.log('⚠️ Aucun plan détecté, lancement de la capture...');
      this.initiateRoomCapture();
    } else {
      console.log(`✅ ${this.xrSession.detectedPlanes?.size || 0} plan(s) déjà détecté(s)`);
    }
  },

  /**
   * Lancer la configuration de Guardian Space (Room Capture)
   */
  initiateRoomCapture: function () {
    if (!this.xrSession || this.captureInitiated) return;

    // Vérifier si la fonction existe
    if (typeof this.xrSession.initiateRoomCapture === 'function') {
      this.captureInitiated = true;

      this.xrSession.initiateRoomCapture()
        .then(() => {
          console.log('🎉 Configuration de l\'espace lancée avec succès !');
          this.updateDebugInfo('Configuration de l\'espace lancée');
        })
        .catch((error) => {
          console.error('❌ Erreur lors du lancement de la capture:', error);
          this.updateDebugInfo('Erreur: ' + error.message);
        });
    } else {
      console.warn('⚠️ initiateRoomCapture non disponible sur ce navigateur/casque');
      this.updateDebugInfo('Room Capture non supporté');
    }
  },

  /**
   * Mise à jour à chaque frame
   */
  tick: function () {
    const frame = this.el.sceneEl.frame;
    if (!frame || !this.xrSession) return;

    // Vérifier si des plans ont été détectés
    if (!this.xrSession.detectedPlanes) return;

    const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
    if (!refSpace) return;

    // Parcourir tous les plans détectés
    this.xrSession.detectedPlanes.forEach((plane) => {
      // Si c'est un nouveau plan, le créer
      if (!this.planes.has(plane)) {
        this.createPlaneVisualization(plane);
      }

      // Mettre à jour la position du plan
      this.updatePlanePosition(plane, frame, refSpace);
    });

    // Supprimer les plans qui ne sont plus détectés
    this.planes.forEach((entity, plane) => {
      if (!this.xrSession.detectedPlanes.has(plane)) {
        console.log('🗑️ Plan supprimé');
        if (entity.parentNode) {
          entity.parentNode.removeChild(entity);
        }
        this.planes.delete(plane);
      }
    });

    // Mettre à jour le compteur de plans
    this.updatePlaneCount();
  },

  updatePlaneCount: function () {
    const count = this.xrSession && this.xrSession.detectedPlanes ? this.xrSession.detectedPlanes.size : 0;

    // Mettre à jour debug
    const debugEl = document.querySelector('#debug');
    if (debugEl) {
      if (count > 0) {
        debugEl.textContent = `État: ${count} plans détectés (Room Setup OK)`;
        debugEl.style.color = '#00FF00';
      } else {
        debugEl.textContent = 'État: Recherche de l\'espace... (Regardez autour)';
        debugEl.style.color = '#FFD700';
      }
    }

    // Msg spécifique pour les plans
    const countEl = document.querySelector('#planes-count');
    if (countEl) countEl.textContent = `Plans: ${count}`;
  },

  updatePlaneCount: function () {
    const count = this.xrSession && this.xrSession.detectedPlanes ? this.xrSession.detectedPlanes.size : 0;

    // Mettre à jour debug
    const debugEl = document.querySelector('#debug');
    if (debugEl) {
      if (count > 0) {
        debugEl.textContent = `État: ${count} plans détectés (Room Setup OK)`;
        debugEl.style.color = '#00FF00';
      } else {
        debugEl.textContent = 'État: Recherche de l\'espace... (Regardez autour)';
        debugEl.style.color = '#FFD700';
      }
    }

    // Msg spécifique pour les plans
    const countEl = document.querySelector('#planes-count');
    // Note: on utilise #debug principalement maintenant
  },

  /**
   * Créer une visualisation pour un plan détecté
   */
  createPlaneVisualization: function (plane) {
    if (!this.data.visualizePlanes) {
      this.planes.set(plane, null);
      return;
    }

    // Créer une entité pour représenter le plan
    const entity = document.createElement('a-entity');

    // Créer un mesh pour le polygone du plan
    const geometry = this.createPlaneGeometry(plane.polygon);

    // Couleur différente selon l'orientation du plan
    const isHorizontal = this.isPlaneHorizontal(plane);
    const color = isHorizontal ? '#4CC3D9' : '#FFC65D'; // Bleu pour horizontal, orange pour vertical
    const opacity = 0.3;

    entity.setAttribute('geometry', {
      primitive: 'plane',
      width: 1,
      height: 1
    });

    entity.setAttribute('material', {
      color: color,
      opacity: opacity,
      transparent: true,
      side: 'double',
      wireframe: false
    });

    // Ajouter un contour pour mieux voir le plan
    const outline = document.createElement('a-entity');
    outline.setAttribute('geometry', {
      primitive: 'plane',
      width: 1,
      height: 1
    });
    outline.setAttribute('material', {
      color: isHorizontal ? '#0088FF' : '#FF8800',
      opacity: 0.8,
      transparent: true,
      wireframe: true,
      side: 'double'
    });
    entity.appendChild(outline);

    this.el.sceneEl.appendChild(entity);
    this.planes.set(plane, entity);

    console.log(`➕ Nouveau plan détecté (${isHorizontal ? 'horizontal' : 'vertical'})`);
  },

  /**
   * Créer une géométrie à partir du polygone du plan
   */
  createPlaneGeometry: function (polygon) {
    // Pour l'instant, on utilise un simple plan
    // Le polygone est un tableau de DOMPointReadOnly
    return {
      primitive: 'plane',
      width: 1,
      height: 1
    };
  },

  /**
   * Déterminer si un plan est horizontal ou vertical
   */
  isPlaneHorizontal: function (plane) {
    // L'orientation du plan est indiquée par sa propriété orientation
    // Un plan horizontal a une normale proche de [0, 1, 0] ou [0, -1, 0]
    if (plane.orientation === 'horizontal') return true;
    if (plane.orientation === 'vertical') return false;

    // Fallback: essayer de deviner depuis le polygone
    return true; // Par défaut
  },

  /**
   * Mettre à jour la position et taille d'un plan
   */
  updatePlanePosition: function (plane, frame, refSpace) {
    const entity = this.planes.get(plane);
    if (!entity) return;

    // Obtenir la pose du plan
    const pose = frame.getPose(plane.planeSpace, refSpace);
    if (!pose) return;

    // Mettre à jour position
    entity.object3D.position.set(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z
    );

    // Mettre à jour orientation
    entity.object3D.quaternion.set(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    );

    // Calculer les dimensions du plan depuis le polygone
    const dimensions = this.calculatePlaneDimensions(plane.polygon);
    entity.setAttribute('geometry', {
      primitive: 'plane',
      width: dimensions.width,
      height: dimensions.height
    });

    // Mettre à jour le contour aussi
    const outline = entity.children[0];
    if (outline) {
      outline.setAttribute('geometry', {
        primitive: 'plane',
        width: dimensions.width,
        height: dimensions.height
      });
    }
  },

  /**
   * Calculer les dimensions d'un plan depuis son polygone
   */
  calculatePlaneDimensions: function (polygon) {
    if (!polygon || polygon.length === 0) {
      return { width: 1, height: 1 };
    }

    // Calculer la boîte englobante du polygone
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let point of polygon) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }

    const width = maxX - minX;
    const height = maxZ - minZ;

    return {
      width: Math.max(width, 0.1), // Minimum 10cm
      height: Math.max(height, 0.1)
    };
  },

  /**
   * Mettre à jour le compteur de plans dans l'interface
   */
  updatePlaneCount: function () {
    const countEl = document.querySelector('#plane-count');
    if (countEl && this.xrSession) {
      const count = this.xrSession.detectedPlanes?.size || 0;
      countEl.textContent = `Plans détectés: ${count}`;
    }
  },

  /**
   * Mettre à jour les informations de debug
   */
  updateDebugInfo: function (message) {
    const debugEl = document.querySelector('#debug');
    if (debugEl) {
      debugEl.textContent = 'Debug: ' + message;
    }

    // Aussi dans le casque si disponible
    const debugTextVR = document.querySelector('#debug-text');
    if (debugTextVR) {
      debugTextVR.setAttribute('value', message);
    }
  },

  /**
   * Fonction publique pour lancer manuellement la capture
   */
  triggerRoomCapture: function () {
    console.log('🎬 Capture manuelle déclenchée');
    this.initiateRoomCapture();
  }
});

/**
 * Composant helper pour un bouton de capture manuelle
 */
AFRAME.registerComponent('room-capture-button', {
  init: function () {
    this.el.addEventListener('click', () => {
      const planeDetection = this.el.sceneEl.components['ar-plane-detection'];
      if (planeDetection) {
        planeDetection.triggerRoomCapture();
      }
    });
  }
});
