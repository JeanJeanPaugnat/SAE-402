# AR Anchors avec A-Frame et WebXR

## 📋 Table des matières
1. [Introduction](#introduction)
2. [Structure de la scène A-Frame](#structure-de-la-scène-a-frame)
3. [Principe de la détection AR](#principe-de-la-détection-ar)
4. [Interaction WebXR et A-Frame](#interaction-webxr-et-a-frame)
5. [Placement d'objets avec les Anchors](#placement-dobjets-avec-les-anchors)
6. [Détection de Plans (Plane Detection)](#détection-de-plans-plane-detection)

---

## Introduction

Cette démonstration combine **A-Frame** (framework déclaratif pour WebVR/WebXR) avec l'**API WebXR Anchors** pour placer des objets 3D dans le monde réel de manière stable et persistante.

### Technologies utilisées
- **A-Frame 1.7.1** : Framework pour créer des expériences VR/AR avec HTML
- **WebXR API** : API native du navigateur pour la réalité augmentée
- **Hit Test API** : Pour détecter les surfaces du monde réel
- **Anchors API** : Pour fixer les objets virtuels dans l'espace réel

---

## Structure de la scène A-Frame

### Déclaration de la scène

```html
<a-scene 
  webxr="requiredFeatures: anchors, local-floor; optionalFeatures: hit-test;"
  vr-mode-ui="enabled: false"
  ar-button
  ar-anchors-quest3>
```

**Explication :**
- `webxr="requiredFeatures: anchors, local-floor"` : Active les fonctionnalités WebXR nécessaires
- `optionalFeatures: hit-test` : Demande l'accès au hit-testing (détection de surfaces)
- `ar-anchors-quest3` : Notre composant personnalisé qui gère toute la logique AR

### Assets et modèles 3D

```html
<a-assets>
  <a-asset-item id="sunflower" src="media/gltf/sunflower/sunflower.gltf"></a-asset-item>
</a-assets>
```

Les modèles 3D sont préchargés dans `<a-assets>` pour de meilleures performances.

### Caméra et indicateurs visuels

```html
<a-camera position="0 1.6 0">
  <!-- Réticule au centre de la vue -->
  <a-ring position="0 0 -1.5" radius-inner="0.02" radius-outer="0.03" 
          color="#00FF00" id="reticle"></a-ring>
  
  <!-- Texte de débogage dans le casque -->
  <a-text id="debug-text" value="Debug: Ready" position="0 0.3 -1" 
          scale="0.5 0.5 0.5" color="#00FF00" align="center"></a-text>
</a-camera>
```

La caméra est positionnée à hauteur des yeux (1.6m) et contient des éléments d'interface visibles dans le casque.

### Curseur 3D de placement

```html
<a-entity id="cursor" visible="true">
  <a-ring color="#00FF00" radius-inner="0.08" radius-outer="0.12" rotation="-90 0 0"></a-ring>
  <a-ring color="#FFFF00" radius-inner="0.04" radius-outer="0.06" rotation="-90 0 0"></a-ring>
  <a-cone color="#00FF00" height="0.15" radius-bottom="0.04" position="0 0.08 0"></a-cone>
</a-entity>
```

Ce curseur se déplace sur les surfaces détectées pour indiquer où l'objet sera placé.

---

## Principe de la détection AR

### 1. Initialisation de la session WebXR

```javascript
const session = await navigator.xr.requestSession('immersive-ar', {
  requiredFeatures: ['local-floor', 'hit-test'],
  optionalFeatures: ['anchors']
});
```

**Explication :**
- On demande une session en mode `immersive-ar` (réalité augmentée)
- `local-floor` : Système de coordonnées avec l'origine au sol
- `hit-test` : Capacité à détecter les surfaces réelles
- `anchors` : Capacité à créer des points d'ancrage stables

### 2. Création du Hit Test Source

```javascript
onEnterVR: async function() {
  this.xrSession = this.sceneEl.renderer.xr.getSession();
  this.xrRefSpace = this.sceneEl.renderer.xr.getReferenceSpace();
  
  // Créer un hit test source basé sur le contrôleur droit
  const inputSources = this.xrSession.inputSources;
  for (let inputSource of inputSources) {
    if (inputSource.handedness === 'right') {
      this.hitTestSource = await this.xrSession.requestHitTestSource({ 
        space: inputSource.targetRaySpace 
      });
      break;
    }
  }
}
```

**Comment ça marche :**
1. On récupère la session XR active depuis le renderer Three.js d'A-Frame
2. On obtient l'espace de référence (système de coordonnées)
3. On crée une source de hit-test attachée au rayon du contrôleur droit
4. À chaque frame, le système testera où ce rayon intersecte les surfaces réelles

### 3. Détection des surfaces à chaque frame

```javascript
tick: function(time, delta) {
  const frame = this.sceneEl.frame;
  if (!frame || !this.hitTestSource) return;
  
  // Obtenir les résultats du hit-testing
  const hitTestResults = frame.getHitTestResults(this.hitTestSource);
  
  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0];
    const hitPose = hit.getPose(this.xrRefSpace);
    
    if (hitPose) {
      // Stocker la position détectée
      this.lastHitPose = hitPose.transform;
      
      // Positionner le curseur visuel
      this.cursorEl.object3D.position.set(
        hitPose.transform.position.x,
        hitPose.transform.position.y,
        hitPose.transform.position.z
      );
      
      // Orienter le curseur selon la normale de la surface
      this.cursorEl.object3D.quaternion.set(
        hitPose.transform.orientation.x,
        hitPose.transform.orientation.y,
        hitPose.transform.orientation.z,
        hitPose.transform.orientation.w
      );
    }
  }
}
```

**Le cycle de détection :**
1. À chaque frame (~72 fois/seconde sur Quest 3), on demande les résultats du hit-test
2. Le système retourne les intersections entre le rayon du contrôleur et les surfaces détectées
3. On récupère la pose (position + orientation) de l'intersection la plus proche
4. On met à jour visuellement le curseur pour montrer où l'objet sera placé

### 4. Filtrage des détections

```javascript
// Vérifier la distance pour éviter les fausses détections
const controllerPos = frame.getPose(rightController.targetRaySpace, this.xrRefSpace);
if (controllerPos) {
  const dx = hitPose.transform.position.x - controllerPos.transform.position.x;
  const dy = hitPose.transform.position.y - controllerPos.transform.position.y;
  const dz = hitPose.transform.position.z - controllerPos.transform.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Accepter seulement si la distance est > 0.5m
  if (distance > 0.5) {
    // Détection valide
    this.lastValidHitPose = hitPose.transform;
  }
}
```

**Pourquoi filtrer ?**
- Éviter de détecter la main/contrôleur lui-même
- Ne garder que les surfaces à distance raisonnable
- Améliorer la précision et l'expérience utilisateur

---

## Interaction WebXR et A-Frame

### Architecture du composant A-Frame

A-Frame utilise un système **Entity-Component-System (ECS)**. Notre composant `ar-anchors-quest3` s'intègre dans ce système :

```javascript
AFRAME.registerComponent('ar-anchors-quest3', {
  schema: {
    maxAnchors: {type: 'number', default: 20}
  },
  
  init: function() {
    // Initialisation : variables, événements
    this.anchors = [];
    this.sceneEl = this.el.sceneEl;
    
    // Écouter l'entrée/sortie du mode VR
    this.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
    this.sceneEl.addEventListener('exit-vr', this.onExitVR.bind(this));
  },
  
  tick: function(time, delta) {
    // Appelé à chaque frame (~72 Hz)
    // C'est ici qu'on fait le hit-testing
  },
  
  onEnterVR: function() {
    // Récupérer la session WebXR depuis Three.js
    this.xrSession = this.sceneEl.renderer.xr.getSession();
  }
});
```

### Pont entre A-Frame et WebXR

**A-Frame utilise Three.js en interne**, qui gère la session WebXR :

```javascript
// A-Frame → Three.js → WebXR
const session = this.sceneEl.renderer.xr.getSession();
const refSpace = this.sceneEl.renderer.xr.getReferenceSpace();
const frame = this.sceneEl.frame;
```

**Points clés :**
- `sceneEl.renderer` : Renderer Three.js d'A-Frame
- `renderer.xr` : Gestionnaire XR de Three.js
- `sceneEl.frame` : Frame WebXR actuelle fournie par A-Frame

### Synchronisation des objets 3D

Les objets A-Frame ont un `object3D` (objet Three.js) qu'on peut manipuler :

```javascript
// Créer une entité A-Frame
const entity = document.createElement('a-entity');
entity.setAttribute('gltf-model', '#sunflower');

// Accéder à l'objet Three.js sous-jacent
entity.object3D.position.set(x, y, z);
entity.object3D.quaternion.set(qx, qy, qz, qw);

// Ajouter à la scène
this.sceneEl.appendChild(entity);
```

---

## Placement d'objets avec les Anchors

### 1. Détection du clic (trigger)

```javascript
onEnterVR: function() {
  this.xrSession.addEventListener('select', this.onSelect.bind(this));
}

onSelect: function(event) {
  if (!this.lastHitPose) return; // Pas de surface détectée
  
  // Créer un anchor à la position détectée
  this.createAnchorAtPose(this.lastHitPose);
}
```

L'événement `select` est déclenché quand l'utilisateur appuie sur le trigger du contrôleur.

### 2. Création de l'Anchor WebXR

```javascript
createAnchorAtPose: function(pose) {
  this.xrSession.requestAnimationFrame((time, frame) => {
    if (frame.createAnchor) {
      frame.createAnchor(pose, this.xrRefSpace)
        .then((anchor) => {
          this.addSunflower(anchor);
        })
        .catch((error) => {
          console.error('Anchor creation failed:', error);
        });
    }
  });
}
```

**Qu'est-ce qu'un Anchor ?**
- Un **point d'ancrage stable** dans l'espace réel
- Le système de tracking maintient sa position même si vous bougez
- Permet aux objets virtuels de "rester en place" dans le monde réel

**Processus :**
1. On demande à créer un anchor à une pose (position + orientation) donnée
2. Le système AR l'enregistre et le suit
3. On reçoit une référence à l'anchor qu'on peut attacher à nos objets

### 3. Attachement de l'objet 3D à l'Anchor

```javascript
addSunflower: function(anchor) {
  // Créer une entité A-Frame
  const entity = document.createElement('a-entity');
  entity.setAttribute('gltf-model', '#sunflower');
  entity.setAttribute('scale', '1 1 1');
  
  // Animation d'apparition
  entity.setAttribute('animation', {
    property: 'scale',
    from: '0 0 0',
    to: '1 1 1',
    dur: 400,
    easing: 'easeOutBack'
  });
  
  // Lier l'anchor à l'entité
  entity.anchor = anchor;
  
  // Ajouter à la scène
  this.sceneEl.appendChild(entity);
  this.anchors.push(entity);
}
```

### 4. Mise à jour continue de la position

À chaque frame, on doit mettre à jour la position de l'objet selon son anchor :

```javascript
tick: function(time, delta) {
  const frame = this.sceneEl.frame;
  if (!frame) return;
  
  // Mettre à jour tous les objets ancrés
  this.anchors.forEach(entity => {
    if (entity.anchor) {
      const anchorPose = frame.getPose(entity.anchor.anchorSpace, this.xrRefSpace);
      
      if (anchorPose) {
        entity.object3D.position.set(
          anchorPose.transform.position.x,
          anchorPose.transform.position.y,
          anchorPose.transform.position.z
        );
        entity.object3D.quaternion.set(
          anchorPose.transform.orientation.x,
          anchorPose.transform.orientation.y,
          anchorPose.transform.orientation.z,
          anchorPose.transform.orientation.w
        );
      }
    }
  });
}
```

**Pourquoi mettre à jour en continu ?**
- Le système de tracking ajuste constamment les anchors
- Si l'utilisateur bouge, la compréhension de l'espace évolue
- Les anchors se "raffinent" avec le temps pour une meilleure stabilité

### 5. Gestion de la mémoire

```javascript
// Limiter le nombre d'anchors
if (this.anchors.length > this.data.maxAnchors) {
  const old = this.anchors.shift(); // Retirer le plus ancien
  if (old.anchor) old.anchor.delete(); // Supprimer l'anchor WebXR
  if (old.parentNode) old.parentNode.removeChild(old); // Retirer du DOM
}
```

Trop d'anchors peuvent ralentir le système de tracking. On limite donc leur nombre.

---

## Résumé du flux complet

```
┌─────────────────────────────────────────────────────────┐
│ 1. Utilisateur démarre l'expérience AR                 │
│    → navigator.xr.requestSession('immersive-ar')       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 2. Initialisation du Hit Test Source                   │
│    → requestHitTestSource({ space: controller })       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 3. Boucle à chaque frame (tick)                        │
│    → getHitTestResults()                               │
│    → Détecter les surfaces                             │
│    → Mettre à jour le curseur visuel                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 4. Utilisateur appuie sur le trigger                   │
│    → Événement 'select'                                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 5. Création de l'Anchor                                │
│    → frame.createAnchor(pose, refSpace)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 6. Création de l'entité A-Frame                        │
│    → createElement('a-entity')                          │
│    → setAttribute('gltf-model', '#sunflower')          │
│    → entity.anchor = anchor                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 7. Mise à jour continue à chaque frame                 │
│    → frame.getPose(anchor.anchorSpace, refSpace)       │
│    → entity.object3D.position.set(...)                 │
│    → Objet reste stable dans l'espace réel             │
└─────────────────────────────────────────────────────────┘
```

---

## Points techniques importants

### Systèmes de coordonnées
- **local-floor** : Origine au sol, Y pointant vers le haut
- **viewer** : Centré sur la tête/caméra de l'utilisateur
- **targetRaySpace** : Rayon pointé par le contrôleur

### Transformations (Pose)
Une pose contient :
- **position** : `{x, y, z}` en mètres
- **orientation** : `{x, y, z, w}` quaternion (rotation)

### Performances
- Le hit-testing est coûteux → limiter à un rayon par frame
- Les anchors consomment des ressources → limiter leur nombre
- Filtrer les détections trop proches améliore la précision

### Compatibilité
- Quest 3 : Support complet hit-test + anchors
- Quest 2 : Support hit-test (anchors parfois instables)
- Smartphone AR : Variable selon le modèle (ARCore/ARKit)

---

## Détection de Plans (Plane Detection)

### 🎯 Introduction à la détection de plans

La détection de plans permet à votre application AR d'accéder aux surfaces physiques de l'environnement (sols, murs, tables, canapés, etc.) configurées dans l'espace Guardian du Meta Quest.

**Avantages :**
- Placement d'objets précis sur des surfaces réelles
- Détection automatique de l'environnement
- Interactions physiques réalistes (occlusion, collisions)
- Pas besoin de scanner manuellement l'environnement

### Configuration de l'espace Guardian

**Sur Meta Quest 3 :**
1. Allez dans **Paramètres** > **Limite** > **Réalité mixte**
2. Configurez les éléments de votre pièce (bureau, canapés, murs, etc.)
3. Ces surfaces seront exposées comme des plans dans votre application

### Activation de la fonctionnalité

Pour utiliser la détection de plans, vous devez demander la fonctionnalité `plane-detection` lors de la création de la session :

```javascript
const session = await navigator.xr.requestSession("immersive-ar", {
  requiredFeatures: ["plane-detection", "local-floor"]
});
```

**Dans A-Frame :**

```html
<a-scene 
  webxr="requiredFeatures: plane-detection, local-floor;"
  ar-plane-detection="visualizePlanes: true; autoCapture: true">
</a-scene>
```

### Structure des plans détectés

Une fois activée, la session XR contient un tableau `detectedPlanes` :

```javascript
// Accéder aux plans détectés
const session = this.el.sceneEl.renderer.xr.getSession();
const planes = session.detectedPlanes; // Set<XRPlane>

// Parcourir les plans
planes.forEach((plane) => {
  console.log('Plan détecté:', plane);
  console.log('- Orientation:', plane.orientation); // 'horizontal' ou 'vertical'
  console.log('- Polygone:', plane.polygon); // Array de DOMPointReadOnly
  console.log('- Espace:', plane.planeSpace); // XRSpace du plan
});
```

### Propriétés d'un XRPlane

Chaque `XRPlane` contient :

| Propriété | Type | Description |
|-----------|------|-------------|
| `planeSpace` | `XRSpace` | Système de coordonnées du plan |
| `polygon` | `Array<DOMPointReadOnly>` | Points définissant le contour du plan |
| `orientation` | `string` | `'horizontal'` ou `'vertical'` |
| `lastChangedTime` | `DOMHighResTimeStamp` | Dernière modification du plan |

**Sur Meta Quest 3**, les polygones sont toujours des **rectangles horizontaux ou verticaux**.

### Implémentation avec A-Frame

#### 1. Composant de base

```javascript
AFRAME.registerComponent('ar-plane-detection', {
  schema: {
    visualizePlanes: { type: 'boolean', default: true }
  },

  init: function () {
    this.planes = new Map(); // XRPlane -> Entity
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
  },

  tick: function () {
    const frame = this.el.sceneEl.frame;
    const session = this.el.sceneEl.renderer.xr.getSession();
    
    if (!frame || !session || !session.detectedPlanes) return;

    const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();

    // Parcourir tous les plans détectés
    session.detectedPlanes.forEach((plane) => {
      if (!this.planes.has(plane)) {
        this.createPlaneVisualization(plane);
      }
      this.updatePlanePosition(plane, frame, refSpace);
    });

    // Nettoyer les plans supprimés
    this.planes.forEach((entity, plane) => {
      if (!session.detectedPlanes.has(plane)) {
        entity.parentNode.removeChild(entity);
        this.planes.delete(plane);
      }
    });
  },

  createPlaneVisualization: function (plane) {
    const entity = document.createElement('a-entity');
    const isHorizontal = plane.orientation === 'horizontal';
    
    entity.setAttribute('geometry', {
      primitive: 'plane',
      width: 1,
      height: 1
    });
    
    entity.setAttribute('material', {
      color: isHorizontal ? '#4CC3D9' : '#FFC65D',
      opacity: 0.3,
      transparent: true,
      side: 'double'
    });

    this.el.sceneEl.appendChild(entity);
    this.planes.set(plane, entity);
  },

  updatePlanePosition: function (plane, frame, refSpace) {
    const entity = this.planes.get(plane);
    if (!entity) return;

    const pose = frame.getPose(plane.planeSpace, refSpace);
    if (!pose) return;

    // Position
    entity.object3D.position.copy(pose.transform.position);
    entity.object3D.quaternion.copy(pose.transform.orientation);

    // Dimensions depuis le polygone
    const dimensions = this.calculateDimensions(plane.polygon);
    entity.setAttribute('geometry', {
      primitive: 'plane',
      width: dimensions.width,
      height: dimensions.height
    });
  },

  calculateDimensions: function (polygon) {
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let point of polygon) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }

    return {
      width: Math.max(maxX - minX, 0.1),
      height: Math.max(maxZ - minZ, 0.1)
    };
  }
});
```

### Configuration automatique de l'espace avec initiateRoomCapture

Si l'utilisateur n'a pas configuré son espace Guardian, vous pouvez déclencher automatiquement la configuration :

```javascript
onEnterVR: function () {
  this.xrSession = this.el.sceneEl.renderer.xr.getSession();
  
  // Attendre 2-3 secondes pour que detectedPlanes soit renseigné
  setTimeout(() => {
    if (this.xrSession.detectedPlanes.size === 0) {
      this.initiateRoomCapture();
    }
  }, 3000);
},

initiateRoomCapture: function () {
  if (typeof this.xrSession.initiateRoomCapture !== 'function') {
    console.warn('initiateRoomCapture non supporté');
    return;
  }

  this.xrSession.initiateRoomCapture()
    .then(() => {
      console.log('✅ Configuration de l\'espace lancée');
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
    });
}
```

**Important :**
- Ne peut être appelée qu'**une fois par session**
- Attendre 2-3 secondes après le démarrage de la session avant de vérifier
- L'utilisateur doit donner son autorisation

### Utilisation pratique des plans

#### Placement d'objets sur des surfaces

```javascript
AFRAME.registerComponent('place-on-plane', {
  init: function () {
    this.el.sceneEl.addEventListener('click', this.placeObject.bind(this));
  },

  placeObject: function () {
    const session = this.el.sceneEl.renderer.xr.getSession();
    const frame = this.el.sceneEl.frame;
    const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();

    if (!session.detectedPlanes) return;

    // Trouver le plan horizontal le plus proche
    let closestPlane = null;
    let closestDistance = Infinity;

    session.detectedPlanes.forEach((plane) => {
      if (plane.orientation !== 'horizontal') return;

      const pose = frame.getPose(plane.planeSpace, refSpace);
      if (!pose) return;

      const distance = pose.transform.position.y;
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlane = { plane, pose };
      }
    });

    if (closestPlane) {
      // Créer un objet sur le plan
      const entity = document.createElement('a-box');
      entity.setAttribute('position', {
        x: closestPlane.pose.transform.position.x,
        y: closestPlane.pose.transform.position.y + 0.05,
        z: closestPlane.pose.transform.position.z
      });
      entity.setAttribute('scale', '0.1 0.1 0.1');
      entity.setAttribute('material', 'color: #EF2D5E');
      
      this.el.sceneEl.appendChild(entity);
    }
  }
});
```

#### Tests de collision avec les plans

```javascript
function isPointOnPlane(point, plane, frame, refSpace) {
  const pose = frame.getPose(plane.planeSpace, refSpace);
  if (!pose) return false;

  // Convertir le point dans l'espace du plan
  const localPoint = {
    x: point.x - pose.transform.position.x,
    z: point.z - pose.transform.position.z
  };

  // Vérifier si le point est dans le polygone
  return isPointInPolygon(localPoint, plane.polygon);
}

function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;
    
    const intersect = ((zi > point.z) !== (zj > point.z))
        && (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
```

### Visualisation des plans

#### Couleurs selon l'orientation

```javascript
const color = plane.orientation === 'horizontal' 
  ? '#4CC3D9'  // Bleu pour les plans horizontaux (sol, table)
  : '#FFC65D'; // Orange pour les plans verticaux (murs)
```

#### Affichage des contours

```javascript
createPlaneVisualization: function (plane) {
  // Plan semi-transparent
  const planeMesh = document.createElement('a-entity');
  planeMesh.setAttribute('geometry', {
    primitive: 'plane',
    width: 1,
    height: 1
  });
  planeMesh.setAttribute('material', {
    color: '#4CC3D9',
    opacity: 0.3,
    transparent: true
  });

  // Contour en fil de fer
  const outline = document.createElement('a-entity');
  outline.setAttribute('geometry', {
    primitive: 'plane',
    width: 1,
    height: 1
  });
  outline.setAttribute('material', {
    color: '#0088FF',
    wireframe: true
  });

  planeMesh.appendChild(outline);
  this.el.sceneEl.appendChild(planeMesh);
  
  return planeMesh;
}
```

### Exemple complet : Scène avec détection de plans

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://aframe.io/releases/1.7.1/aframe.min.js"></script>
    <script src="./components/ar-plane-detection.js"></script>
  </head>
  <body>
    <a-scene 
      webxr="requiredFeatures: plane-detection, local-floor;"
      ar-plane-detection="visualizePlanes: true; autoCapture: true; waitTime: 3000">
      
      <a-camera position="0 1.6 0">
        <a-text 
          id="plane-count" 
          value="Plans: 0" 
          position="0 0.3 -1.5" 
          scale="0.6 0.6 0.6" 
          color="#4CC3D9" 
          align="center">
        </a-text>
      </a-camera>

      <a-light type="ambient" color="#BBB"></a-light>
      <a-light type="directional" color="#FFF" intensity="0.6"></a-light>
    </a-scene>

    <script>
      // Mise à jour du compteur de plans
      setInterval(() => {
        const scene = document.querySelector('a-scene');
        const session = scene.renderer?.xr?.getSession();
        
        if (session?.detectedPlanes) {
          const count = session.detectedPlanes.size;
          const textEl = document.querySelector('#plane-count');
          textEl.setAttribute('value', `Plans: ${count}`);
        }
      }, 500);
    </script>
  </body>
</html>
```

### Flux de détection des plans

```
┌─────────────────────────────────────────────────────────┐
│ 1. Démarrage de la session AR                          │
│    → requestSession({ requiredFeatures: ["plane-..."]})│
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 2. Demande de permission à l'utilisateur               │
│    → Autorisation d'accéder à l'espace Guardian        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 3. Chargement des plans depuis Guardian                │
│    → session.detectedPlanes est rempli (2-3 sec)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 4. Si aucun plan détecté après 3 secondes              │
│    → Optionnel: initiateRoomCapture()                  │
│    → L'utilisateur configure son espace                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 5. Boucle à chaque frame (tick)                        │
│    → Parcourir session.detectedPlanes                  │
│    → Créer/mettre à jour les visualisations            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 6. Obtenir la pose de chaque plan                      │
│    → frame.getPose(plane.planeSpace, refSpace)         │
│    → Positionner les entités A-Frame                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 7. Utilisation des plans                               │
│    → Placement d'objets sur les surfaces               │
│    → Tests de collision                                 │
│    → Occlusion réaliste                                 │
└─────────────────────────────────────────────────────────┘
```

### Caractéristiques des plans sur Quest 3

| Caractéristique | Détails |
|----------------|---------|
| **Formes** | Rectangles horizontaux ou verticaux |
| **Types** | Sols, murs, tables, canapés, etc. |
| **Précision** | Excellente (basée sur Guardian configuré) |
| **Stabilité** | Très stable (pas de dérive) |
| **Nombre max** | Illimité (limité par l'espace configuré) |
| **Persistance** | Dure toute la session |
| **Mise à jour** | Dynamique si l'espace change |

### Bonnes pratiques

1. **Attendre avant de vérifier** : Les plans ne sont pas disponibles immédiatement
   ```javascript
   setTimeout(() => checkPlanes(), 3000);
   ```

2. **Limiter les appels à initiateRoomCapture** : Une seule fois par session
   ```javascript
   if (!this.captureInitiated) {
     this.captureInitiated = true;
     session.initiateRoomCapture();
   }
   ```

3. **Filtrer par orientation** : Selon votre besoin
   ```javascript
   if (plane.orientation === 'horizontal') {
     // Uniquement les surfaces plates (sol, table)
   }
   ```

4. **Gérer les plans supprimés** : Nettoyer les entités
   ```javascript
   planes.forEach((entity, plane) => {
     if (!session.detectedPlanes.has(plane)) {
       entity.parentNode.removeChild(entity);
       planes.delete(plane);
     }
   });
   ```

5. **Performances** : Ne visualiser que si nécessaire
   ```javascript
   visualizePlanes: { type: 'boolean', default: false }
   ```

### Cas d'usage pratiques

#### 1. Placement automatique sur table
```javascript
// Trouver une table (plan horizontal entre 0.5m et 1m de hauteur)
const tables = Array.from(session.detectedPlanes).filter(plane => {
  const pose = frame.getPose(plane.planeSpace, refSpace);
  return plane.orientation === 'horizontal' 
    && pose.transform.position.y > 0.5 
    && pose.transform.position.y < 1.0;
});
```

#### 2. Détection de murs pour navigation
```javascript
// Trouver les murs (plans verticaux)
const walls = Array.from(session.detectedPlanes).filter(plane => 
  plane.orientation === 'vertical'
);
```

#### 3. Occlusion réaliste
```javascript
// Masquer les objets virtuels derrière les plans
planeMesh.setAttribute('material', {
  colorWrite: false,  // Invisible
  depthWrite: true    // Mais bloque le rendu derrière
});
```

### Débogage

#### Afficher le nombre de plans
```javascript
console.log(`Plans détectés: ${session.detectedPlanes.size}`);
```

#### Inspecter un plan
```javascript
session.detectedPlanes.forEach((plane, index) => {
  console.log(`Plan ${index}:`, {
    orientation: plane.orientation,
    points: plane.polygon.length,
    lastChanged: plane.lastChangedTime
  });
});
```

#### Visualiser les polygones
```javascript
plane.polygon.forEach((point, i) => {
  console.log(`  Point ${i}: x=${point.x.toFixed(2)}, z=${point.z.toFixed(2)}`);
});
```

### Compatibilité

| Plateforme | Support | Notes |
|------------|---------|-------|
| **Quest 3** | ✅ Excellent | Détection stable et précise |
| **Quest 2** | ✅ Bon | Nécessite configuration Guardian |
| **Quest Pro** | ✅ Excellent | Support complet |
| **Smartphones AR** | ⚠️ Variable | Dépend de ARCore/ARKit |
| **Navigateur** | Chrome/Edge | WebXR activé |

### Démonstration

Fichiers du projet :
- [ar-plane-detection.js](components/ar-plane-detection.js) : Composant A-Frame complet
- [demo-plane-detection.html](demo-plane-detection.html) : Page de démonstration

**Pour tester :**
1. Ouvrez [demo-plane-detection.html](demo-plane-detection.html) sur votre Quest 3
2. Cliquez sur "Enter AR"
3. Les plans configurés dans Guardian s'afficheront automatiquement
4. Si aucun plan n'apparaît, cliquez sur "Configurer l'espace"

---

## Pour aller plus loin

### Améliorations possibles
1. ✅ **Détection de plans** : Utiliser `plane-detection` pour détecter les murs/sols
2. **Mesh detection** : Détecter la géométrie complète de l'environnement
3. **Persistance** : Sauvegarder les anchors entre sessions (si supporté)
4. **Occlusion** : Masquer les objets virtuels derrière les objets réels
5. **Lighting estimation** : Adapter l'éclairage des objets au monde réel

### Ressources
- [WebXR Device API Specification](https://www.w3.org/TR/webxr/)
- [WebXR Plane Detection Module](https://immersive-web.github.io/real-world-geometry/plane-detection.html)
- [A-Frame Documentation](https://aframe.io/docs/)
- [Three.js WebXR Guide](https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content)
- [Immersive Web Working Group](https://github.com/immersive-web)
- [Meta Quest WebXR Guide](https://developer.oculus.com/documentation/web/webxr-overview/)
