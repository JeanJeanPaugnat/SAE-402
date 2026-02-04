import 'aframe' ;
import 'aframe-extras' ;
import 'aframe-physics-system';

<<<<<<< HEAD
/* global THREE */

=======
// Import des composants AR personnalisés
import './components/ar-plane-detection.js';
import './components/xr-object-placer.js';
import './components/xr-hit-test.js';
import './components/hand-grab.js';

/* global THREE */

>>>>>>> origin/debut_jeu
console.log('☕ SAE 402 - Chargement...');

window.addEventListener('load', () => {
    setTimeout(() => {
        const debugEl = document.getElementById('debug');
        const surfacesEl = document.getElementById('surfaces');
        const btn = document.getElementById('btn');
        const sceneEl = document.getElementById('scene');
<<<<<<< HEAD
        const cubeEl = document.getElementById('cube');
        const cursorEl = document.getElementById('cursor');

        if (!sceneEl || !cubeEl) {
            debugEl.textContent = 'Éléments manquants!';
            return;
        }
=======
        const cursorEl = document.getElementById('cursor');
        const rulesPanel = document.getElementById('rules-panel');
        const rulesPanelHud = document.getElementById('rules-panel-hud'); // Nouveau panneau dans la caméra
        const rulesOkBtn = document.getElementById('rules-ok-btn');
        const rulesOkBtnHud = document.getElementById('rules-ok-btn-hud'); // Nouveau bouton
        const clientsPanel = document.getElementById('clients-panel');
        const clientsPanelHud = document.getElementById('clients-panel-hud'); // Nouveau panneau clients HUD
        const clientsOkBtn = document.getElementById('clients-ok-btn');
        const clientsOkBtnHud = document.getElementById('clients-ok-btn-hud'); // Nouveau bouton clients HUD
        const coffeeMachine = document.querySelector('[data-machine]');
        const coffeeSound = document.getElementById('coffee-sound');
        const cupSound = document.getElementById('cup-sound');

        let rulesShown = false; // FORCER à false pour toujours afficher le panneau
        // let rulesShown = localStorage.getItem('coffee-quest-rules-shown') === 'true';
        let objectsPlaced = 0;
        let setupComplete = false;
        let previousButtonStates = [{ b: false }, { b: false }];
        let isMakingCoffee = false;

        console.log('Règles déjà vues :', rulesShown);
        console.log('Panneau de règles trouvé :', rulesPanel);
        console.log('Panneau de clients trouvé :', clientsPanel);
>>>>>>> origin/debut_jeu

        debugEl.textContent = 'Prêt!';

        let xrSession = null;
        let xrRefSpace = null;
        let hitTestSource = null;

        // Grab state
        let grabbed = false;
        let grabController = null;
<<<<<<< HEAD
        let grabbedCube = null;
        let velocities = [];
        const surfaces = [];
        const cubes = [cubeEl]; // Liste de tous les cubes
        let cubeCount = 1;
        
        // Référence à la poubelle et au bouton spawn
        const trashcanEl = document.getElementById('trashcan');
        const spawnBtnEl = document.getElementById('spawn-btn');
        const spawnBtnBox = spawnBtnEl ? spawnBtnEl.querySelector('a-box') : null;
=======
        let grabbedObject = null;
        let velocities = [];
        const surfaces = [];
        let controllerRays = [];
>>>>>>> origin/debut_jeu

        btn.onclick = async () => {
            debugEl.textContent = 'Démarrage...';

            try {
                xrSession = await navigator.xr.requestSession('immersive-ar', {
                    requiredFeatures: ['local-floor'],
<<<<<<< HEAD
                    optionalFeatures: ['hit-test', 'dom-overlay'],
=======
                    optionalFeatures: ['hit-test', 'dom-overlay', 'plane-detection'],
>>>>>>> origin/debut_jeu
                    domOverlay: { root: document.getElementById('overlay') }
                });

                sceneEl.renderer.xr.setSession(xrSession);
                btn.style.display = 'none';

                // Controllers Three.js
                const ctrl0 = sceneEl.renderer.xr.getController(0);
                const ctrl1 = sceneEl.renderer.xr.getController(1);
                sceneEl.object3D.add(ctrl0);
                sceneEl.object3D.add(ctrl1);

<<<<<<< HEAD
                ctrl0.addEventListener('selectstart', () => grab(ctrl0));
                ctrl0.addEventListener('selectend', release);
                ctrl1.addEventListener('selectstart', () => grab(ctrl1));
=======
                // Créer des mains visuelles pour les contrôleurs
                const handGeometry = new THREE.SphereGeometry(0.05, 16, 16);
                const handMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xFFDBB5, // Couleur chair
                    roughness: 0.8,
                    metalness: 0.2
                });
                
                const hand0 = new THREE.Mesh(handGeometry, handMaterial);
                const hand1 = new THREE.Mesh(handGeometry, handMaterial);
                
                // Ajouter un doigt pointeur pour plus de réalisme
                const fingerGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8);
                const finger0 = new THREE.Mesh(fingerGeometry, handMaterial);
                const finger1 = new THREE.Mesh(fingerGeometry, handMaterial);
                
                finger0.rotation.x = Math.PI / 2;
                finger0.position.z = -0.06;
                finger1.rotation.x = Math.PI / 2;
                finger1.position.z = -0.06;
                
                hand0.add(finger0);
                hand1.add(finger1);
                
                ctrl0.add(hand0);
                ctrl1.add(hand1);

                // Créer des rayons visuels pour les contrôleurs
                const rayGeometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, 0, -2)
                ]);
                const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
                
                const ray0 = new THREE.Line(rayGeometry, rayMaterial);
                const ray1 = new THREE.Line(rayGeometry, rayMaterial);
                
                // Masquer les rayons par défaut
                ray0.visible = false;
                ray1.visible = false;
                
                ctrl0.add(ray0);
                ctrl1.add(ray1);
                
                controllerRays = [ray0, ray1];

                // Gestion des événements
                ctrl0.addEventListener('selectstart', (e) => handleSelectStart(ctrl0));
                ctrl0.addEventListener('selectend', release);
                ctrl1.addEventListener('selectstart', (e) => handleSelectStart(ctrl1));
>>>>>>> origin/debut_jeu
                ctrl1.addEventListener('selectend', release);

                debugEl.textContent = 'AR OK!';

<<<<<<< HEAD
                // Setup hit-test après délai
                setTimeout(async () => {
                    try {
                        xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                        const viewer = await xrSession.requestReferenceSpace('viewer');
                        hitTestSource = await xrSession.requestHitTestSource({ space: viewer });
                        debugEl.textContent = 'Hit-test OK!';
                    } catch (e) {
                        debugEl.textContent = 'Pas de hit-test';
=======
                console.log('Session AR démarrée, rulesShown =', rulesShown);

                // Afficher le panneau de règles immédiatement si première fois
                if (!rulesShown) {
                    console.log('Affichage du panneau de règles HUD...');
                    
                    // Utiliser le panneau HUD directement dans la caméra
                    if (rulesPanelHud) {
                        rulesPanelHud.setAttribute('visible', 'true');
                        console.log('Panneau HUD affiché');
                        console.log('rulesPanelHud.object3D.visible:', rulesPanelHud.object3D?.visible);
                    } else {
                        console.error('ERREUR: rulesPanelHud introuvable!');
                    }
                    
                    controllerRays.forEach(ray => ray.visible = true);
                    debugEl.textContent = 'Lisez les règles...';
                } else {
                    console.log('Règles déjà vues, affichage direct des objets');
                    // Si règles déjà vues, afficher directement les objets
                    showGameObjects();
                }

                // Setup hit-test
                setTimeout(async () => {
                    try {
                        xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                        hitTestSource = await xrSession.requestHitTestSource({ space: xrRefSpace });
                        debugEl.textContent = 'AR actif - Détection des surfaces...';
                    } catch (e) {
                        debugEl.textContent = 'AR actif - Mode sans hit-test';
>>>>>>> origin/debut_jeu
                    }

                    // Démarrer boucle XR
                    xrSession.requestAnimationFrame(xrLoop);
                }, 500);

            } catch (e) {
                debugEl.textContent = 'Erreur: ' + e.message;
            }
        };

<<<<<<< HEAD
=======
        function showGameObjects() {
            // Afficher tous les objets du jeu
            const grabbables = document.querySelectorAll('.grabbable');
            grabbables.forEach(obj => obj.setAttribute('visible', 'true'));
            
            const comptoir = document.getElementById('comptoir');
            if (comptoir) comptoir.setAttribute('visible', 'true');
            
            debugEl.textContent = 'Attrapez et posez les objets sur toute surface détectée...';
        }

        function handleSelectStart(controller) {
            // Si un panneau est visible, vérifier le clic sur le bouton
            if ((rulesPanel && rulesPanel.object3D.visible) || (rulesPanelHud && rulesPanelHud.object3D.visible) || (clientsPanel && clientsPanel.object3D.visible) || (clientsPanelHud && clientsPanelHud.object3D.visible)) {
                checkButtonClick(controller);
            } else {
                // Sinon, faire le grab normal
                grab(controller);
            }
        }

        function checkButtonClick(controller) {
            const raycaster = new THREE.Raycaster();
            const tempMatrix = new THREE.Matrix4();
            tempMatrix.identity().extractRotation(controller.matrixWorld);
            
            raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            
            // Vérifier le bouton des règles (ancien panneau)
            if (rulesPanel && rulesPanel.object3D.visible && rulesOkBtn && rulesOkBtn.object3D) {
                const btnPos = new THREE.Vector3();
                rulesOkBtn.object3D.getWorldPosition(btnPos);
                const distance = raycaster.ray.distanceToPoint(btnPos);
                if (distance < 0.15) {
                    console.log('Bouton OK des règles cliqué');
                    rulesPanel.setAttribute('visible', 'false');
                    controllerRays.forEach(ray => ray.visible = false);
                    localStorage.setItem('coffee-quest-rules-shown', 'true');
                    rulesShown = true;
                    sceneEl.appendChild(rulesPanel);
                    showGameObjects();
                    return;
                }
            }
            
            // Vérifier le bouton des règles HUD (nouveau panneau)
            if (rulesPanelHud && rulesPanelHud.object3D.visible && rulesOkBtnHud && rulesOkBtnHud.object3D) {
                const btnPos = new THREE.Vector3();
                rulesOkBtnHud.object3D.getWorldPosition(btnPos);
                const distance = raycaster.ray.distanceToPoint(btnPos);
                if (distance < 0.15) {
                    console.log('Bouton OK HUD des règles cliqué');
                    rulesPanelHud.setAttribute('visible', 'false');
                    controllerRays.forEach(ray => ray.visible = false);
                    localStorage.setItem('coffee-quest-rules-shown', 'true');
                    rulesShown = true;
                    showGameObjects();
                    return;
                }
            }
            
            // Vérifier le bouton des clients
            if (clientsPanel && clientsPanel.object3D.visible && clientsOkBtn && clientsOkBtn.object3D) {
                const btnPos = new THREE.Vector3();
                clientsOkBtn.object3D.getWorldPosition(btnPos);
                const distance = raycaster.ray.distanceToPoint(btnPos);
                if (distance < 0.15) {
                    console.log('Bouton OK des clients cliqué');
                    clientsPanel.setAttribute('visible', 'false');
                    controllerRays.forEach(ray => ray.visible = false);
                    sceneEl.appendChild(clientsPanel);
                    debugEl.textContent = 'En attente des clients...';
                    return;
                }
            }
            
            // Vérifier le bouton des clients HUD
            if (clientsPanelHud && clientsPanelHud.object3D.visible && clientsOkBtnHud && clientsOkBtnHud.object3D) {
                const btnPos = new THREE.Vector3();
                clientsOkBtnHud.object3D.getWorldPosition(btnPos);
                const distance = raycaster.ray.distanceToPoint(btnPos);
                if (distance < 0.15) {
                    console.log('Bouton OK HUD des clients cliqué');
                    clientsPanelHud.setAttribute('visible', 'false');
                    controllerRays.forEach(ray => ray.visible = false);
                    debugEl.textContent = 'En attente des clients...';
                    return;
                }
            }
        }

>>>>>>> origin/debut_jeu
        function xrLoop(time, frame) {
            if (!xrSession) return;
            xrSession.requestAnimationFrame(xrLoop);

            if (!frame || !xrRefSpace) {
                xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                return;
            }

<<<<<<< HEAD
            // Hit-test
            if (hitTestSource) {
                try {
                    const hits = frame.getHitTestResults(hitTestSource);
                    if (hits.length > 0) {
                        const pose = hits[0].getPose(xrRefSpace);
                        if (pose) {
                            const p = pose.transform.position;
                            cursorEl.object3D.visible = true;
                            cursorEl.object3D.position.set(p.x, p.y, p.z);
                            addSurface(p.x, p.y, p.z);
                        }
                    } else {
                        cursorEl.object3D.visible = false;
                    }
                } catch (e) { }
            }

            // Cube suit le controller
            if (grabbed && grabController && grabbedCube) {
=======
            // Gérer la visibilité des rayons
            const panelVisible = (rulesPanel && rulesPanel.object3D.visible) || 
                                (rulesPanelHud && rulesPanelHud.object3D.visible) || 
                                (clientsPanel && clientsPanel.object3D.visible) ||
                                (clientsPanelHud && clientsPanelHud.object3D.visible);
            controllerRays.forEach(ray => ray.visible = panelVisible);

            // Les surfaces sont maintenant détectées automatiquement par ar-plane-detection
            // Plus besoin de créer manuellement les surfaces, le composant s'en occupe

            // Vérifier le bouton B si le setup est complet
            if (setupComplete && !isMakingCoffee && coffeeMachine) {
                const session = sceneEl.renderer.xr.getSession();
                if (session && session.inputSources) {
                    session.inputSources.forEach((source, index) => {
                        if (source.gamepad) {
                            const gamepad = source.gamepad;
                            const bPressed = gamepad.buttons[5] && gamepad.buttons[5].pressed;
                            
                            // Détection du front montant (bouton vient d'être pressé)
                            if (bPressed && !previousButtonStates[index].b) {
                                // Vérifier si on pointe vers la machine
                                const controller = sceneEl.renderer.xr.getController(index);
                                if (controller && isPointingAtMachine(controller)) {
                                    makeCoffee();
                                }
                            }
                            previousButtonStates[index].b = bPressed;
                        }
                    });
                }
            }

            // Cube suit le controller
            if (grabbed && grabController && grabbedObject) {
>>>>>>> origin/debut_jeu
                try {
                    const pos = new THREE.Vector3();
                    grabController.getWorldPosition(pos);

                    if (isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z)) {
<<<<<<< HEAD
                        grabbedCube.object3D.position.set(pos.x, pos.y, pos.z);

                        if (grabbedCube.body) {
                            grabbedCube.body.position.set(pos.x, pos.y, pos.z);
=======
                        grabbedObject.object3D.position.set(pos.x, pos.y, pos.z);

                        if (grabbedObject.body) {
                            grabbedObject.body.position.set(pos.x, pos.y, pos.z);
>>>>>>> origin/debut_jeu
                        }

                        velocities.push({ x: pos.x, y: pos.y, z: pos.z, t: performance.now() });
                        if (velocities.length > 10) velocities.shift();
                    }
                } catch (e) { }
            }
<<<<<<< HEAD
            
            // Vérifier si des cubes sont dans la poubelle
            checkTrashcan();
        }
        
        function spawnCube() {
            cubeCount++;
            
            // Position devant la caméra
            const cam = document.getElementById('cam');
            const camPos = cam.object3D.getWorldPosition(new THREE.Vector3());
            const camDir = new THREE.Vector3(0, 0, -1);
            camDir.applyQuaternion(cam.object3D.getWorldQuaternion(new THREE.Quaternion()));
            
            const spawnPos = camPos.add(camDir.multiplyScalar(0.7));
            
            // Créer une nouvelle tasse de café
            const newCup = document.createElement('a-entity');
            newCup.setAttribute('id', `cup-${cubeCount}`);
            newCup.setAttribute('position', `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`);
            newCup.setAttribute('gltf-model', '/Coffee cup.glb');
            newCup.setAttribute('scale', '0.1 0.1 0.1');
            newCup.setAttribute('dynamic-body', 'mass:0.5;linearDamping:0.3;angularDamping:0.3;shape:box');
            
            sceneEl.appendChild(newCup);
            cubes.push(newCup);
            
            debugEl.textContent = `Tasse ${cubeCount} créée!`;
        }
        
        function getRandomColor() {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#8A2BE2'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        function checkTrashcan() {
            if (!trashcanEl) return;
            
            const trashPos = trashcanEl.object3D.getWorldPosition(new THREE.Vector3());
            const trashRadius = 0.5; // Rayon de détection de la poubelle (x2)
            
            // Parcourir les cubes et supprimer ceux dans la poubelle
            for (let i = cubes.length - 1; i >= 0; i--) {
                const cube = cubes[i];
                if (!cube || !cube.object3D) continue;
                
                // Ne pas supprimer si on tient ce cube
                if (cube === grabbedCube) continue;
                
                const cubePos = cube.object3D.getWorldPosition(new THREE.Vector3());
                const dist = cubePos.distanceTo(trashPos);
                
                if (dist < trashRadius) {
                    // Supprimer le cube
                    cube.parentNode.removeChild(cube);
                    cubes.splice(i, 1);
                    debugEl.textContent = `Cube supprimé! (${cubes.length} restants)`;
                }
            }
=======
>>>>>>> origin/debut_jeu
        }

        function grab(controller) {
            if (grabbed) return;

<<<<<<< HEAD
            const controllerPos = new THREE.Vector3();
            controller.getWorldPosition(controllerPos);
            
            // Vérifier si on touche le bouton spawn d'abord
            if (spawnBtnEl) {
                const btnPos = spawnBtnEl.object3D.getWorldPosition(new THREE.Vector3());
                const distToBtn = controllerPos.distanceTo(btnPos);
                if (distToBtn < 0.25) {
                    // On touche le bouton, spawn un cube !
                    spawnCube();
                    debugEl.textContent = 'Bouton pressé!';
                    return;
                }
            }

            // Trouver le cube le plus proche du controller
            let closestCube = null;
            let closestDist = 0.3; // Distance max pour attraper (30cm)
            
            for (const cube of cubes) {
                if (!cube || !cube.object3D) continue;
                const cubePos = cube.object3D.getWorldPosition(new THREE.Vector3());
                const dist = controllerPos.distanceTo(cubePos);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestCube = cube;
                }
            }
            
            if (!closestCube) {
                debugEl.textContent = 'Aucun cube à portée';
                return;
            }
=======
            // Trouver l'objet attrapable le plus proche
            const grabbables = document.querySelectorAll('.grabbable');
            let closestObj = null;
            let minDist = 0.5; // Distance max pour attraper (50cm pour plus de confort)

            const controllerPos = new THREE.Vector3();
            controller.getWorldPosition(controllerPos);

            grabbables.forEach(obj => {
                if (!obj.object3D.visible) return;
                const objPos = new THREE.Vector3();
                obj.object3D.getWorldPosition(objPos);
                const dist = controllerPos.distanceTo(objPos);
                if (dist < minDist) {
                    minDist = dist;
                    closestObj = obj;
                }
            });

            if (!closestObj) return;
>>>>>>> origin/debut_jeu

            debugEl.textContent = 'GRAB!';

            grabbed = true;
            grabController = controller;
<<<<<<< HEAD
            grabbedCube = closestCube;
            velocities = [];
            grabbedCube.setAttribute('color', '#FFD700');

            if (grabbedCube.body) {
                grabbedCube.body.mass = 0;
                grabbedCube.body.type = 2;
                grabbedCube.body.updateMassProperties();
=======
            grabbedObject = closestObj;
            velocities = [];

            if (grabbedObject.body) {
                grabbedObject.body.mass = 0;
                grabbedObject.body.type = 2; // Kinematic
                grabbedObject.body.updateMassProperties();
                grabbedObject.body.sleep(); // Endormir le body pour éviter les mouvements
>>>>>>> origin/debut_jeu
            }

            debugEl.textContent = 'ATTRAPÉ!';
        }

        function release() {
<<<<<<< HEAD
            if (!grabbed || !grabbedCube) return;
=======
            if (!grabbed || !grabbedObject) return;
>>>>>>> origin/debut_jeu

            let vx = 0, vy = 0, vz = 0;
            if (velocities.length >= 2) {
                const l = velocities[velocities.length - 1];
                const f = velocities[0];
                const dt = (l.t - f.t) / 1000;
                if (dt > 0.01) {
                    vx = (l.x - f.x) / dt;
                    vy = (l.y - f.y) / dt;
                    vz = (l.z - f.z) / dt;
                }
            }

<<<<<<< HEAD
            grabbedCube.setAttribute('color', getRandomColor());

            if (grabbedCube.body) {
                const p = grabbedCube.object3D.position;
                grabbedCube.body.position.set(p.x, p.y, p.z);
                grabbedCube.body.type = 1;
                grabbedCube.body.mass = 0.5;
                grabbedCube.body.updateMassProperties();
                grabbedCube.body.velocity.set(vx, vy, vz);
                grabbedCube.body.wakeUp();
=======
            if (grabbedObject.body) {
                const p = grabbedObject.object3D.position;
                grabbedObject.body.position.set(p.x, p.y, p.z);
                grabbedObject.body.type = 1; // Dynamic
                grabbedObject.body.mass = 0.2;
                grabbedObject.body.updateMassProperties();
                
                // Annuler uniquement les vitesses horizontales et de rotation
                grabbedObject.body.velocity.set(0, grabbedObject.body.velocity.y, 0);
                grabbedObject.body.angularVelocity.set(0, 0, 0);
                grabbedObject.body.wakeUp();
>>>>>>> origin/debut_jeu
            }

            grabbed = false;
            grabController = null;
<<<<<<< HEAD
            grabbedCube = null;
            debugEl.textContent = 'Lâché!';
        }

        function addSurface(x, y, z) {
            for (const s of surfaces) {
                if (Math.abs(s.x - x) < 0.1 && Math.abs(s.y - y) < 0.1 && Math.abs(s.z - z) < 0.1) return;
            }

            const box = document.createElement('a-box');
            box.setAttribute('position', `${x} ${y} ${z}`);
            box.setAttribute('width', '0.2');
            box.setAttribute('height', '0.01');
            box.setAttribute('depth', '0.2');
            box.setAttribute('visible', 'false');
            box.setAttribute('static-body', '');
            sceneEl.appendChild(box);

            surfaces.push({ x, y, z });
            surfacesEl.textContent = 'Surfaces: ' + surfaces.length;

            if (surfaces.length > 200) surfaces.shift();
        }

    }, 1000);
});
=======
            grabbedObject = null;
            debugEl.textContent = 'Lâché!';
            
            // Supprimer la physique du comptoir virtuel pour éviter les conflits avec les surfaces AR
            const comptoir = document.getElementById('comptoir');
            if (comptoir && comptoir.body) {
                comptoir.removeAttribute('static-body');
            }

            // Vérifier si l'objet a été placé (vitesse faible = posé)
            const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);
            if (speed < 2 && !setupComplete) {
                objectsPlaced++;
                debugEl.textContent = `Objets placés: ${objectsPlaced}/2`;
                
                // Si les 2 objets sont placés, afficher le popup
                if (objectsPlaced >= 2) {
                    setupComplete = true;
                    setTimeout(() => {
                        // Afficher le panneau clients HUD
                        if (clientsPanelHud) {
                            clientsPanelHud.setAttribute('visible', 'true');
                            console.log('Panneau clients HUD affiché');
                        }
                        controllerRays.forEach(ray => ray.visible = true);
                    }, 500);
                }
            }

            // Vérifier si le comptoir est vide
            checkCounterEmpty();
        }

        function checkCounterEmpty() {
            const comptoir = document.getElementById('comptoir');
            if (!comptoir || !comptoir.object3D.visible) return;

            const comptoirPos = comptoir.object3D.position;
            const grabbables = document.querySelectorAll('.grabbable');
            
            let objectsOnCounter = 0;
            grabbables.forEach(obj => {
                if (!obj.object3D.visible) return;
                
                // CORRECTION : On crée proprement le vecteur
                const objPos = new THREE.Vector3();
                obj.object3D.getWorldPosition(objPos); // On récupère la vraie position
                
                const distX = Math.abs(objPos.x - comptoirPos.x);
                const distZ = Math.abs(objPos.z - comptoirPos.z);
                const distY = objPos.y - comptoirPos.y;
                
                if (distX < 1 && distZ < 0.4 && distY > 0 && distY < 0.5) {
                    objectsOnCounter++;
                }
            });

            // Masquer seulement si AUCUN objet n'est sur le comptoir
            if (objectsOnCounter === 0) {
                comptoir.setAttribute('visible', 'false');
            }
        }

        // Les surfaces sont maintenant gérées automatiquement par le composant ar-plane-detection
        // Plus besoin de la fonction addSurface

        function isPointingAtMachine(controller) {
            const raycaster = new THREE.Raycaster();
            const tempMatrix = new THREE.Matrix4();
            tempMatrix.identity().extractRotation(controller.matrixWorld);
            
            raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            
            const distance = raycaster.ray.distanceToPoint(coffeeMachine.object3D.position);
            return distance < 0.3;
        }

        function makeCoffee() {
            isMakingCoffee = true;
            debugEl.textContent = '☕ Préparation du café...';
            
            // Jouer le son de la machine
            coffeeSound.play();
            
            // Quand le son se termine, faire apparaître la tasse
            coffeeSound.onended = () => {
                // Créer une nouvelle tasse
                const newCup = document.createElement('a-entity');
                const machinePos = coffeeMachine.object3D.position;
                
                newCup.setAttribute('gltf-model', '#coffee-cup-model');
                newCup.setAttribute('position', `${machinePos.x + 0.3} ${machinePos.y} ${machinePos.z}`);
                newCup.setAttribute('rotation', '0 180 0');
                newCup.setAttribute('scale', '0.15 0.15 0.15');
                newCup.setAttribute('dynamic-body', 'shape: box; halfExtents: 0.03 0.04 0.03; mass: 0.2; linearDamping: 0.9; angularDamping: 0.9; restitution: 0; friction: 1');
                newCup.setAttribute('class', 'grabbable');
                
                sceneEl.appendChild(newCup);
                
                // Jouer le son de la tasse
                cupSound.play();
                
                debugEl.textContent = '✅ Café prêt !';
                isMakingCoffee = false;
            };
        }

    }, 1000);
});
>>>>>>> origin/debut_jeu
