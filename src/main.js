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
        let grabbedCube = null;
        let velocities = [];
        const surfaces = [];
        const cubes = [cubeEl]; // Liste de tous les cubes
        let cubeCount = 1;
        
        // État bouton A (pour détecter le press, pas le hold)
        let buttonAWasPressed = false;

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

            // Cube suit le controller
            if (grabbed && grabController && grabbedCube) {
                try {
                    const pos = new THREE.Vector3();
                    grabController.getWorldPosition(pos);

                    if (isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z)) {
                        grabbedCube.object3D.position.set(pos.x, pos.y, pos.z);

                        if (grabbedCube.body) {
                            grabbedCube.body.position.set(pos.x, pos.y, pos.z);
                        }

                        velocities.push({ x: pos.x, y: pos.y, z: pos.z, t: performance.now() });
                        if (velocities.length > 10) velocities.shift();
                    }
                } catch (e) { }
            }
            
            // Vérifier le bouton A pour créer un nouveau cube
            checkButtonA();
        }
        
        function checkButtonA() {
            const session = sceneEl.renderer.xr.getSession();
            if (!session) return;
            
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    // Bouton A = index 4 sur les manettes Quest
                    const buttonA = source.gamepad.buttons[4];
                    if (buttonA && buttonA.pressed && !buttonAWasPressed) {
                        buttonAWasPressed = true;
                        spawnCube();
                    } else if (buttonA && !buttonA.pressed) {
                        buttonAWasPressed = false;
                    }
                }
            }
        }
        
        function spawnCube() {
            cubeCount++;
            
            // Position devant la caméra
            const cam = document.getElementById('cam');
            const camPos = cam.object3D.getWorldPosition(new THREE.Vector3());
            const camDir = new THREE.Vector3(0, 0, -1);
            camDir.applyQuaternion(cam.object3D.getWorldQuaternion(new THREE.Quaternion()));
            
            const spawnPos = camPos.add(camDir.multiplyScalar(0.7));
            
            // Créer un nouveau cube
            const newCube = document.createElement('a-box');
            newCube.setAttribute('id', `cube-${cubeCount}`);
            newCube.setAttribute('position', `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`);
            newCube.setAttribute('width', '0.15');
            newCube.setAttribute('height', '0.15');
            newCube.setAttribute('depth', '0.15');
            newCube.setAttribute('color', getRandomColor());
            newCube.setAttribute('dynamic-body', 'mass:0.5;linearDamping:0.3;angularDamping:0.3');
            
            sceneEl.appendChild(newCube);
            cubes.push(newCube);
            
            debugEl.textContent = `Cube ${cubeCount} créé!`;
        }
        
        function getRandomColor() {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function grab(controller) {
            if (grabbed) return;

            // Trouver le cube le plus proche du controller
            const controllerPos = new THREE.Vector3();
            controller.getWorldPosition(controllerPos);
            
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

            debugEl.textContent = 'GRAB!';

            grabbed = true;
            grabController = controller;
            grabbedCube = closestCube;
            velocities = [];
            grabbedCube.setAttribute('color', '#FFD700');

            if (grabbedCube.body) {
                grabbedCube.body.mass = 0;
                grabbedCube.body.type = 2;
                grabbedCube.body.updateMassProperties();
            }

            debugEl.textContent = 'ATTRAPÉ!';
        }

        function release() {
            if (!grabbed || !grabbedCube) return;

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

            // Restaurer une couleur aléatoire
            grabbedCube.setAttribute('color', getRandomColor());

            if (grabbedCube.body) {
                const p = grabbedCube.object3D.position;
                grabbedCube.body.position.set(p.x, p.y, p.z);
                grabbedCube.body.type = 1;
                grabbedCube.body.mass = 0.5;
                grabbedCube.body.updateMassProperties();
                grabbedCube.body.velocity.set(vx, vy, vz);
                grabbedCube.body.wakeUp();
            }

            grabbed = false;
            grabController = null;
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
