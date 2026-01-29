/**
 * ============================================
 * COFFEE QUEST AR - Point d'entree
 * ============================================
 * 
 * Ce fichier importe tous les composants A-Frame necessaires
 * et initialise l'application AR.
 */

// === STYLES ===
import './style.css';

// === COMPOSANTS A-FRAME ===
// Ces fichiers enregistrent des composants AFRAME.registerComponent(...)

// Detection des surfaces (hit-test)
import './components/ar-hit-test.js';

// Gestion du grab avec manettes
import './components/hand-grab.js';

// Spawn des tasses avec bouton A
import './components/cup-spawner.js';


/**
 * ============================================
 * INITIALISATION
 * ============================================
 */

// Attendre que le DOM soit pret
document.addEventListener('DOMContentLoaded', () => {
  
  // Recuperer les elements DOM
  const startBtn = document.querySelector('#start-ar-btn');
  const debugStatus = document.querySelector('#debug-status');
  const scene = document.querySelector('a-scene');
  
  // Fonction pour mettre a jour le debug
  function updateDebug(message) {
    if (debugStatus) {
      debugStatus.textContent = message;
    }
  }
  
  // Verifier le support WebXR
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      if (supported) {
        updateDebug('WebXR AR supporte !');
      } else {
        updateDebug('AR non supporte sur cet appareil');
        if (startBtn) startBtn.textContent = 'AR non disponible';
      }
    });
  } else {
    updateDebug('WebXR non disponible');
    if (startBtn) startBtn.textContent = 'WebXR non disponible';
  }
  
  // Gerer le bouton Start AR
  if (startBtn && scene) {
    startBtn.addEventListener('click', () => {
      updateDebug('Lancement AR...');
      scene.enterVR();
    });
  }
  
  // Ecouter les evenements de la scene
  if (scene) {
    scene.addEventListener('enter-vr', () => {
      updateDebug('Session AR demarree');
      if (startBtn) startBtn.style.display = 'none';
    });
    
    scene.addEventListener('exit-vr', () => {
      updateDebug('Session AR terminee');
      if (startBtn) startBtn.style.display = 'block';
    });
  }
});

