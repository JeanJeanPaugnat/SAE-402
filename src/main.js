/**
 * ============================================
 * COFFEE QUEST AR - Point d'entree
 * ============================================
 * 
 * INSPIRE DE : webxr-samples (hit-test.html, ar-barebones.html)
 * 
 * Ce fichier importe les composants A-Frame et initialise l'app.
 */

// === STYLES ===
import './style.css';

// === COMPOSANTS A-FRAME ===
// Chaque fichier enregistre un composant AFRAME.registerComponent(...)

// Hit-test : detecte les surfaces (inspire de webxr-samples/hit-test.html)
import './components/xr-hit-test.js';

// Object placer : place des objets sur les surfaces
import './components/xr-object-placer.js';

// Grab : attraper les objets avec les manettes
import './components/hand-grab.js';


/**
 * ============================================
 * INITIALISATION
 * ============================================
 */

document.addEventListener('DOMContentLoaded', () => {
  
  const startBtn = document.querySelector('#start-ar-btn');
  const debugStatus = document.querySelector('#debug-status');
  const scene = document.querySelector('a-scene');
  
  let isDesktopMode = false;
  
  function updateDebug(message) {
    if (debugStatus) debugStatus.textContent = message;
  }
  
  // === VERIFICATION WEBXR ===
  // Comme dans webxr-samples/ar-barebones.html
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      if (supported) {
        updateDebug('WebXR AR disponible');
        if (startBtn) startBtn.disabled = false;
      } else {
        enableDesktopMode();
      }
    });
  } else {
    enableDesktopMode();
  }
  
  // === BOUTON START AR ===
  if (startBtn && scene) {
    startBtn.addEventListener('click', async () => {
      if (isDesktopMode) {
        updateDebug('Mode Desktop - Espace pour placer');
        return;
      }
      
      try {
        updateDebug('Lancement AR...');
        await scene.enterVR();
      } catch (err) {
        updateDebug('Erreur: ' + err.message);
      }
    });
  }
  
  // === EVENEMENTS SCENE ===
  if (scene) {
    scene.addEventListener('enter-vr', () => {
      updateDebug('AR actif - Visez et tapez !');
      if (startBtn) startBtn.style.display = 'none';
    });
    
    scene.addEventListener('exit-vr', () => {
      updateDebug('AR termine');
      if (startBtn) startBtn.style.display = 'block';
    });
  }
  
  // === MODE DESKTOP ===
  function enableDesktopMode() {
    isDesktopMode = true;
    updateDebug('Mode Desktop - Espace pour placer');
    if (startBtn) startBtn.textContent = 'Mode Desktop';
    
    // Afficher le reticule
    const reticle = document.querySelector('#reticle');
    if (reticle) {
      reticle.setAttribute('visible', true);
      reticle.setAttribute('position', '0 0 -2');
    }
    
    // Ecouter Espace pour placer
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        placeObjectDesktop();
      }
    });
  }
  
  function placeObjectDesktop() {
    const reticle = document.querySelector('#reticle');
    if (!reticle) return;
    
    const pos = reticle.getAttribute('position');
    
    const entity = document.createElement('a-entity');
    entity.setAttribute('gltf-model', '#coffee-cup-model');
    entity.setAttribute('scale', '0.1 0.1 0.1');
    entity.setAttribute('position', `${pos.x} ${pos.y + 0.02} ${pos.z}`);
    entity.setAttribute('grabbable', '');
    
    document.querySelector('a-scene').appendChild(entity);
    
    const countEl = document.querySelector('#cup-count');
    if (countEl) {
      const match = countEl.textContent.match(/\d+/);
      const count = match ? parseInt(match[0]) + 1 : 1;
      countEl.textContent = `Objets places: ${count}`;
    }
    
    updateDebug('Objet place !');
  }
});