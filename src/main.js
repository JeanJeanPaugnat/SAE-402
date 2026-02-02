import 'aframe' ;
import 'aframe-extras' ;
import 'aframe-physics-system';

/* global THREE */

console.log('☕ SAE 402 - Chargement...');

window.addEventListener('load', () => {
    setTimeout(() => {
        const debugEl = document.getElementById('debug');
        const surfacesEl = document.getElementById('surfaces');
        const btn = document.getElementById('btn');
        const sceneEl = document.getElementById('scene');
        const cubeEl = document.getElementById('cube');
        const cursorEl = document.getElementById('cursor');
        const rulesPopup = document.getElementById('rules-popup');
        const rulesOkBtn = document.getElementById('rules-ok-btn');
        const clientsPopup = document.getElementById('clients-popup');
        const clientsOkBtn = document.getElementById('clients-ok-btn');
        const coffeeMachine = document.querySelector('[data-machine]');
        const coffeeSound = document.getElementById('coffee-sound');
        const cupSound = document.getElementById('cup-sound');

        let rulesShown = localStorage.getItem('coffee-quest-rules-shown') === 'true';
        let objectsPlaced = 0;
        let setupComplete = false;
        let previousButtonStates = [{ b: false }, { b: false }];
        let isMakingCoffee = false;

        if (!sceneEl || !cubeEl) {
            debugEl.textContent = 'Éléments manquants!';
            return;
        }

        debugEl.textContent = 'Prêt!';

        let xrSession = null;
        let xrRefSpace = null;
        let hitTestSource = null;

        // Grab state
        let grabbed = false;
        let grabController = null;
        let velocities = [];
        const surfaces = [];

        btn.onclick = async () => {
            debugEl.textContent = 'Démarrage...';

            try {
                xrSession = await navigator.xr.requestSession('immersive-ar', {
                    requiredFeatures: ['local-floor'],
                    optionalFeatures: ['hit-test', 'dom-overlay'],
                    domOverlay: { root: document.getElementById('overlay') }
                });

                sceneEl.renderer.xr.setSession(xrSession);
                btn.style.display = 'none';

                // Controllers Three.js
                const ctrl0 = sceneEl.renderer.xr.getController(0);
                const ctrl1 = sceneEl.renderer.xr.getController(1);
                sceneEl.object3D.add(ctrl0);
                sceneEl.object3D.add(ctrl1);

                ctrl0.addEventListener('selectstart', () => grab(ctrl0));
                ctrl0.addEventListener('selectend', release);
                ctrl1.addEventListener('selectstart', () => grab(ctrl1));
                ctrl1.addEventListener('selectend', release);

                debugEl.textContent = 'AR OK!';

                // Afficher les règles si première fois
                if (!rulesShown) {
                    setTimeout(() => {
                        rulesPopup.style.display = 'block';
                    }, 1000);
                }

                // Setup hit-test après délai
                setTimeout(async () => {
                    try {
                        xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                        const viewer = await xrSession.requestReferenceSpace('viewer');
                        hitTestSource = await xrSession.requestHitTestSource({ space: viewer });
                        debugEl.textContent = 'Hit-test OK!';
                    } catch (e) {
                        debugEl.textContent = 'Pas de hit-test';
                    }

                    // Démarrer boucle XR
                    xrSession.requestAnimationFrame(xrLoop);
                }, 500);

            } catch (e) {
                debugEl.textContent = 'Erreur: ' + e.message;
            }
        };

        // Bouton OK du popup de règles
        rulesOkBtn.onclick = () => {
            rulesPopup.style.display = 'none';
            localStorage.setItem('coffee-quest-rules-shown', 'true');
            rulesShown = true;
            debugEl.textContent = 'Placez les objets sur la table...';
        };

        // Bouton OK du popup clients
        clientsOkBtn.onclick = () => {
            clientsPopup.style.display = 'none';
            debugEl.textContent = 'En attente des clients...';
        };

        function xrLoop(time, frame) {
            if (!xrSession) return;
            xrSession.requestAnimationFrame(xrLoop);

            if (!frame || !xrRefSpace) {
                xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                return;
            }

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
            if (grabbed && grabController) {
                try {
                    const pos = new THREE.Vector3();
                    grabController.getWorldPosition(pos);

                    if (isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z)) {
                        cubeEl.object3D.position.set(pos.x, pos.y, pos.z);

                        if (cubeEl.body) {
                            cubeEl.body.position.set(pos.x, pos.y, pos.z);
                        }

                        velocities.push({ x: pos.x, y: pos.y, z: pos.z, t: performance.now() });
                        if (velocities.length > 10) velocities.shift();
                    }
                } catch (e) { }
            }
        }

        function grab(controller) {
            if (grabbed) return;

            debugEl.textContent = 'GRAB!';

            grabbed = true;
            grabController = controller;
            velocities = [];
            cubeEl.setAttribute('color', '#FFD700');

            if (cubeEl.body) {
                cubeEl.body.mass = 0;
                cubeEl.body.type = 2;
                cubeEl.body.updateMassProperties();
            }

            debugEl.textContent = 'ATTRAPÉ!';
        }

        function release() {
            if (!grabbed) return;

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

            cubeEl.setAttribute('color', '#8A2BE2');

            if (cubeEl.body) {
                const p = cubeEl.object3D.position;
                cubeEl.body.position.set(p.x, p.y, p.z);
                cubeEl.body.type = 1;
                cubeEl.body.mass = 0.5;
                cubeEl.body.updateMassProperties();
                cubeEl.body.velocity.set(vx, vy, vz);
                cubeEl.body.wakeUp();
            }

            grabbed = false;
            grabController = null;
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
                        clientsPopup.style.display = 'block';
                    }, 500);
                }
            }
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
                newCup.setAttribute('scale', '0.5 0.5 0.5');
                newCup.setAttribute('dynamic-body', 'mass:0.3;linearDamping:0.3;angularDamping:0.3');
                
                sceneEl.appendChild(newCup);
                
                // Jouer le son de la tasse
                cupSound.play();
                
                debugEl.textContent = '✅ Café prêt !';
                isMakingCoffee = false;
            };
        }

    }, 1000);
});