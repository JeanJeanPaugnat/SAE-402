import 'aframe' ;
import 'aframe-extras' ;
import 'aframe-physics-system';

// Import des composants AR personnalisés
import './components/ar-plane-detection.js';
import './components/xr-object-placer.js';
import './components/xr-hit-test.js';
import './components/hand-grab.js';

/* global THREE */

console.log('☕ SAE 402 - Chargement...');

window.addEventListener('load', () => {
    setTimeout(() => {
        const debugEl = document.getElementById('debug');
        const surfacesEl = document.getElementById('surfaces');
        const btn = document.getElementById('btn');
        const sceneEl = document.getElementById('scene');
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

        debugEl.textContent = 'Prêt!';

        let xrSession = null;
        let xrRefSpace = null;
        let hitTestSource = null;

        // Grab state
        let grabbed = false;
        let grabController = null;
        let grabbedObject = null;
        let velocities = [];
        const surfaces = [];
        let controllerRays = [];

        btn.onclick = async () => {
            debugEl.textContent = 'Démarrage...';

            try {
                xrSession = await navigator.xr.requestSession('immersive-ar', {
                    requiredFeatures: ['local-floor'],
                    optionalFeatures: ['hit-test', 'dom-overlay', 'plane-detection'],
                    domOverlay: { root: document.getElementById('overlay') }
                });

                sceneEl.renderer.xr.setSession(xrSession);
                btn.style.display = 'none';

                // Controllers Three.js
                const ctrl0 = sceneEl.renderer.xr.getController(0);
                const ctrl1 = sceneEl.renderer.xr.getController(1);
                sceneEl.object3D.add(ctrl0);
                sceneEl.object3D.add(ctrl1);

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
                ctrl1.addEventListener('selectend', release);

                debugEl.textContent = 'AR OK!';

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
                    }

                    // Démarrer boucle XR
                    xrSession.requestAnimationFrame(xrLoop);
                }, 500);

            } catch (e) {
                debugEl.textContent = 'Erreur: ' + e.message;
            }
        };

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

        function xrLoop(time, frame) {
            if (!xrSession) return;
            xrSession.requestAnimationFrame(xrLoop);

            if (!frame || !xrRefSpace) {
                xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                return;
            }

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
                try {
                    const pos = new THREE.Vector3();
                    grabController.getWorldPosition(pos);

                    if (isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z)) {
                        grabbedObject.object3D.position.set(pos.x, pos.y, pos.z);

                        if (grabbedObject.body) {
                            grabbedObject.body.position.set(pos.x, pos.y, pos.z);
                        }

                        velocities.push({ x: pos.x, y: pos.y, z: pos.z, t: performance.now() });
                        if (velocities.length > 10) velocities.shift();
                    }
                } catch (e) { }
            }
        }

        function grab(controller) {
            if (grabbed) return;

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

            debugEl.textContent = 'GRAB!';

            grabbed = true;
            grabController = controller;
            grabbedObject = closestObj;
            velocities = [];

            if (grabbedObject.body) {
                grabbedObject.body.mass = 0;
                grabbedObject.body.type = 2; // Kinematic
                grabbedObject.body.updateMassProperties();
                grabbedObject.body.sleep(); // Endormir le body pour éviter les mouvements
            }

            debugEl.textContent = 'ATTRAPÉ!';
        }

        function release() {
            if (!grabbed || !grabbedObject) return;

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

            if (grabbedObject.body) {
                const p = grabbedObject.object3D.position;
                grabbedObject.body.position.set(p.x, p.y, p.z);
                grabbedObject.body.type = 1; // Dynamic
                grabbedObject.body.mass = 0.5;
                grabbedObject.body.updateMassProperties();
                
                // Réduire la vitesse si elle est trop faible (objet posé doucement)
                const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);
                if (speed < 2) {
                    // Objet posé doucement, vitesse quasi-nulle pour éviter qu'il tombe
                    vx *= 0.05;
                    vy *= 0.05;
                    vz *= 0.05;
                    
                    // Stabiliser l'objet immédiatement pour qu'il reste en place
                    setTimeout(() => {
                        if (grabbedObject && grabbedObject.body) {
                            const currentSpeed = Math.sqrt(
                                grabbedObject.body.velocity.x ** 2 +
                                grabbedObject.body.velocity.y ** 2 +
                                grabbedObject.body.velocity.z ** 2
                            );
                            // Si l'objet bouge encore très lentement, le figer complètement
                            if (currentSpeed < 0.5) {
                                grabbedObject.body.velocity.set(0, 0, 0);
                                grabbedObject.body.angularVelocity.set(0, 0, 0);
                                grabbedObject.body.sleep();
                            }
                        }
                    }, 200);
                } else {
                    // Objet lancé, réduire un peu la vitesse
                    vx *= 0.5;
                    vy *= 0.5;
                    vz *= 0.5;
                }
                
                grabbedObject.body.velocity.set(vx, vy, vz);
                grabbedObject.body.angularVelocity.set(0, 0, 0); // Pas de rotation
                grabbedObject.body.wakeUp();
            }

            grabbed = false;
            grabController = null;
            grabbedObject = null;
            debugEl.textContent = 'Lâché!';

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
                
                const objPos = new THRE4  // Encore plus large
            box.setAttribute('height', '0.1');  // Plus épais
            box.setAttribute('depth', '4');  // Encore plus profond
            box.setAttribute('color', '#00FF00');
            box.setAttribute('opacity', '0.3');
            box.setAttribute('visible', 'true');  // VISIBLE pour debug AR
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
                newCup.setAttribute('dynamic-body', 'mass:0.3;linearDamping:0.5;angularDamping:0.5');
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