/**
 * Composant : real-world-physics
 * Description : Utilise le Scene Mesh du Quest 3 pour créer des collisions 
 * avec le monde réel et gérer l'occlusion.
 * 
 * Fonctionnalités :
 * - Détecte les surfaces réelles (tables, murs, sol de ta pièce)
 * - Crée des collisions invisibles pour que les objets virtuels rebondissent dessus
 * - Occlusion : les objets réels cachent les objets virtuels
 */

AFRAME.registerComponent('real-world-physics', {
  schema: {
    enableOcclusion: { type: 'boolean', default: true },
    enablePhysics: { type: 'boolean', default: true },
    meshVisibility: { type: 'number', default: 0 }, // 0 = invisible, 1 = visible (debug)
    meshColor: { type: 'color', default: '#00ff00' }
  },

  init: function () {
    this.meshes = [];
    this.physicsInitialized = false;

    const sceneEl = this.el.sceneEl;

    // Écouter l'entrée en mode XR
    sceneEl.addEventListener('enter-vr', () => {
      this.onEnterXR();
    });

    sceneEl.addEventListener('exit-vr', () => {
      this.cleanupMeshes();
    });

    console.log('🏠 Real-world-physics initialisé');
  },

  onEnterXR: function () {
    const sceneEl = this.el.sceneEl;
    const xrSession = sceneEl.xrSession;

    if (!xrSession) {
      console.warn('❌ Pas de session XR');
      return;
    }

    // Vérifier si le mesh de la scène est disponible (Quest 3)
    if (xrSession.enabledFeatures && xrSession.enabledFeatures.includes('mesh-detection')) {
      console.log('✅ Mesh detection disponible!');
      this.setupMeshDetection(xrSession);
    } else {
      console.log('⚠️ Mesh detection non disponible, utilisation du hit-test comme fallback');
      this.setupHitTestFallback();
    }
  },

  setupMeshDetection: function (xrSession) {
    // Le mesh detection n'est pas encore standard dans WebXR
    // On utilise une approche avec les plans détectés
    const renderer = this.el.sceneEl.renderer;
    const xrManager = renderer.xr;

    // Écouter les frames XR pour détecter les meshes
    this.el.sceneEl.addEventListener('renderstart', () => {
      this.checkForMeshes();
    });
  },

  setupHitTestFallback: function () {
    // Fallback : utiliser le sol détecté par hit-test
    // Le composant ar-hit-test gère déjà ça
    console.log('📍 Utilisation du hit-test pour le sol');

    // Créer un sol de secours basé sur la position initiale
    this.createFallbackFloor();
  },

  createFallbackFloor: function () {
    // Le sol invisible est déjà créé dans index.html
    // On peut le mettre à jour avec la position détectée par hit-test
    const hitTestEl = document.querySelector('[ar-hit-test]');

    if (hitTestEl) {
      hitTestEl.addEventListener('ar-hit-test-achieved', (evt) => {
        const position = evt.detail.position;
        const floorPlane = document.querySelector('a-plane[static-body]');

        if (floorPlane && position) {
          // Mettre à jour la hauteur du sol avec la vraie hauteur détectée
          floorPlane.setAttribute('position', `0 ${position.y} 0`);
          console.log(`🏠 Sol ajusté à la hauteur: ${position.y}`);
        }
      });
    }
  },

  checkForMeshes: function () {
    // Cette méthode sera appelée à chaque frame XR
    // Pour l'instant, c'est un placeholder pour les futures APIs
  },

  cleanupMeshes: function () {
    this.meshes.forEach(mesh => {
      if (mesh.parentNode) {
        mesh.parentNode.removeChild(mesh);
      }
    });
    this.meshes = [];
  },

  remove: function () {
    this.cleanupMeshes();
  }
});

/**
 * Composant : ar-plane-collider
 * Description : Détecte les plans AR (sol, tables, murs) et crée des colliders invisibles
 * Compatible avec le système de physique CANNON.js
 * 
 * IMPORTANT: Le Quest 3 doit avoir le "Room Setup" configuré pour détecter les surfaces!
 */
AFRAME.registerComponent('ar-plane-collider', {
  schema: {
    floorY: { type: 'number', default: 0 },
    showDebugPlanes: { type: 'boolean', default: false }
  },

  init: function () {
    this.detectedPlanes = new Map();
    this.planeEntities = [];
    this.xrPlanes = null;
    this.frameCallback = null;

    const sceneEl = this.el.sceneEl;

    // Quand on entre en XR
    sceneEl.addEventListener('enter-vr', () => {
      console.log('🥽 Entrée en mode XR, recherche des planes...');
      this.setupPlaneDetection();
    });

    // Quand on sort de XR
    sceneEl.addEventListener('exit-vr', () => {
      this.cleanupPlanes();
    });

    // Écouter les événements de hit-test pour ajuster le sol
    sceneEl.addEventListener('ar-hit-test-select', (evt) => {
      if (evt.detail && evt.detail.position) {
        this.updateFloorLevel(evt.detail.position.y);
      }
    });

    console.log('📐 AR Plane Collider initialisé');
  },

  setupPlaneDetection: function () {
    const sceneEl = this.el.sceneEl;
    const renderer = sceneEl.renderer;

    if (!renderer || !renderer.xr) {
      console.warn('❌ Renderer XR non disponible');
      return;
    }

    // Accéder aux planes via le frame XR
    const self = this;

    // Ajouter un listener sur le rendu pour vérifier les planes à chaque frame
    this.frameCallback = function (time, frame) {
      if (frame && frame.detectedPlanes) {
        self.processDetectedPlanes(frame.detectedPlanes, frame);
      }
    };

    // S'abonner aux frames XR
    renderer.xr.addEventListener('sessionstart', () => {
      const session = renderer.xr.getSession();
      if (session) {
        console.log('✅ Session XR démarrée, features:', session.enabledFeatures || 'non disponible');
      }
    });
  },

  tick: function () {
    // Vérifier les planes à chaque tick si on est en XR
    const renderer = this.el.sceneEl.renderer;
    if (renderer && renderer.xr && renderer.xr.isPresenting) {
      const frame = renderer.xr.getFrame();
      if (frame && frame.detectedPlanes) {
        this.processDetectedPlanes(frame.detectedPlanes, frame);
      }
    }
  },

  processDetectedPlanes: function (planes, frame) {
    const referenceSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();

    planes.forEach((plane) => {
      // Vérifier si on a déjà créé un collider pour ce plane
      if (this.detectedPlanes.has(plane)) {
        // Mettre à jour la position si nécessaire
        this.updatePlaneCollider(plane, frame, referenceSpace);
      } else {
        // Créer un nouveau collider
        this.createPlaneCollider(plane, frame, referenceSpace);
        this.detectedPlanes.set(plane, true);
      }
    });
  },

  createPlaneCollider: function (plane, frame, referenceSpace) {
    try {
      const pose = frame.getPose(plane.planeSpace, referenceSpace);
      if (!pose) return;

      const position = pose.transform.position;
      const orientation = pose.transform.orientation;

      // Déterminer la taille du plane
      const polygon = plane.polygon;
      let width = 0, height = 0; // Valeurs par défaut

      // Calculer la bounding box du polygon
      if (polygon && polygon.length >= 3) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const point of polygon) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minZ = Math.min(minZ, point.z);
          maxZ = Math.max(maxZ, point.z);
        }

        width = Math.max(maxX - minX, 0.1); // Min 10cm
        height = Math.max(maxZ - minZ, 0.1);
      } else {
        width = 1;
        height = 1;
      }

      // Créer l'entité A-Frame avec physique
      const planeEl = document.createElement('a-box');

      // IMPORTANT: Configurer la physique
      // static-body = objet immobile qui bloque les autres
      planeEl.setAttribute('static-body', {
        shape: 'box'
      });

      // Matériau physique pour le rebond
      planeEl.setAttribute('physics-material', {
        friction: 0.6,
        restitution: 0.5 // Un peu de rebond
      });

      planeEl.setAttribute('position', {
        x: position.x,
        y: position.y,
        z: position.z
      });

      planeEl.object3D.quaternion.set(
        orientation.x,
        orientation.y,
        orientation.z,
        orientation.w
      );

      // Orientation horizontal ou vertical
      if (plane.orientation === 'horizontal') {
        // Sol ou Table
        console.log(`📐 Plan HORIZONTAL détecté à y=${position.y.toFixed(2)}m (${width.toFixed(2)}x${height.toFixed(2)}m)`);
        planeEl.setAttribute('scale', {
          x: width,
          y: 0.01, // Épaisseur
          z: height
        });

        // Si c'est le sol (y proche de 0), on peut aussi le tagger
        if (Math.abs(position.y) < 0.2) {
          planeEl.classList.add('floor-plane');
        } else {
          planeEl.classList.add('table-plane');
        }

      } else {
        // Mur
        console.log(`🧱 Plan VERTICAL (Mur) détecté (${width.toFixed(2)}x${height.toFixed(2)}m)`);

        // Pour un plan vertical, le repère local est différent selon l'implémentation
        // Généralement WebXR définit le plan sur XZ local, donc on garde la même logique de scale
        // Mais l'orientation du quaternion place le plan à la verticale
        planeEl.setAttribute('scale', {
          x: width,
          y: 0.01,
          z: height
        });

        planeEl.classList.add('wall-plane');
      }

      // Debug visuel (optionnel)
      if (this.data.showDebugPlanes) {
        planeEl.setAttribute('material', {
          color: plane.orientation === 'horizontal' ? '#00ff00' : '#0000ff',
          opacity: 0.3,
          transparent: true,
          side: 'double'
        });
      } else {
        // Invisible mais physiquement présent
        planeEl.setAttribute('visible', false);
      }

      planeEl.classList.add('detected-plane');
      this.el.sceneEl.appendChild(planeEl);
      this.planeEntities.push(planeEl);

    } catch (error) {
      console.warn('Erreur création plane collider:', error);
    }
  },

  updatePlaneCollider: function (plane, frame, referenceSpace) {
    // Pour l'instant, on ne met pas à jour dynamiquement
    // Les planes Quest 3 sont généralement stables
  },

  updateFloorLevel: function (y) {
    // Mettre à jour la position du sol physique
    const floor = document.querySelector('a-plane[static-body]');
    if (floor) {
      floor.setAttribute('position', { x: 0, y: y, z: 0 });
      console.log(`📐 Niveau du sol mis à jour: ${y.toFixed(3)}m`);

      // Si le body physique existe, le mettre à jour aussi
      if (floor.body) {
        floor.body.position.y = y;
      }
    }
  },

  cleanupPlanes: function () {
    this.planeEntities.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    this.planeEntities = [];
    this.detectedPlanes.clear();
    console.log('🧹 Planes nettoyés');
  },

  remove: function () {
    this.cleanupPlanes();
  }
});

/**
 * Composant : occlusion-mesh
 * Description : Rend les objets réels capables de cacher les objets virtuels
 * Utilise un matériau qui écrit dans le depth buffer mais pas dans le color buffer
 */
AFRAME.registerComponent('occlusion-material', {
  init: function () {
    // Créer un matériau d'occlusion
    // Ce matériau est invisible mais écrit dans le depth buffer
    const occlusionMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,    // Ne pas écrire de couleur
      depthWrite: true,     // Écrire dans le depth buffer
      side: THREE.DoubleSide
    });

    // Appliquer au mesh
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.material = occlusionMaterial;
      // Render en premier pour que l'occlusion fonctionne
      mesh.renderOrder = -1;
    }

    console.log('👻 Occlusion material appliqué');
  }
});
