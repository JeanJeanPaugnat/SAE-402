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
    if (!this.reticle.getAttribute('visible')) return;

    // 1. Créer un nouvel élément <a-box>
    const newCube = document.createElement('a-box');

    // 2. Lui donner des attributs (taille, couleur, position)
    newCube.setAttribute('position', this.reticle.getAttribute('position'));
    newCube.setAttribute('rotation', this.reticle.getAttribute('rotation'));
    newCube.setAttribute('scale', '0.1 0.1 0.1'); // Cube de 10cm
    newCube.setAttribute('material', 'color: #4CC3D9; roughnes: 1');
    newCube.setAttribute('shadow', 'cast: true; receive: true');

    // 3. Ajouter l'élément à la scène
    this.el.sceneEl.appendChild(newCube);

    console.log("Cube posé sur la table !");
  }
});