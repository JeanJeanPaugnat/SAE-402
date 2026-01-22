/* src/components/ar-spawner.js */
AFRAME.registerComponent('ar-spawner', {
  init: function () {
    // On écoute le clic sur la scène (gâchette ou tap écran)
    this.el.sceneEl.addEventListener('click', () => {
      this.spawnCube();
    });

    // Le curseur (l'anneau ou le cube fantôme) qui suit le sol
    this.reticle = document.querySelector('#reticle');
  },

  spawnCube: function () {
    // Si le curseur n'est pas visible (pas de sol détecté), on ne fait rien
    if (!this.reticle || !this.reticle.getAttribute('visible')) return;

    // Récupérer la position du réticule
    const reticlePos = this.reticle.object3D.position;
    
    // Vérifier que la position est valide (pas trop loin)
    if (Math.abs(reticlePos.x) > 10 || Math.abs(reticlePos.z) > 10) {
      console.log("Position trop éloignée, spawn annulé");
      return;
    }

    // 1. Créer un nouvel élément <a-box>
    const newCube = document.createElement('a-box');

    // 2. Lui donner des attributs (taille, couleur, position)
    // Position légèrement au-dessus du sol pour être attrapable
    newCube.setAttribute('position', {
      x: reticlePos.x,
      y: reticlePos.y + 0.05, // 5cm au-dessus du sol
      z: reticlePos.z
    });
    newCube.setAttribute('scale', '0.1 0.1 0.1'); // Cube de 10cm
    newCube.setAttribute('material', 'color: #4CC3D9; roughness: 0.8');
    newCube.setAttribute('shadow', 'cast: true; receive: true');
    
    // 3. IMPORTANT: Rendre le cube attrapable !
    newCube.setAttribute('grabbable', '');

    // 4. Ajouter l'élément à la scène
    this.el.sceneEl.appendChild(newCube);

    console.log("✅ Cube attrapable posé !");
  }
});