import 'aframe' ;
import 'aframe-extras' ;
import 'aframe-physics-system';

/* global THREE */

console.log('☕ SAE 402 - Chargement initial du script...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded!');
    
    // ===== LANDING PAGE LOGIC =====
    const startBtn = document.getElementById('start-btn');
    const landingPage = document.getElementById('landing-page');
    const gameContainer = document.getElementById('game-container');

    console.log('🔍 Éléments trouvés:', {
        startBtn: !!startBtn,
        landingPage: !!landingPage,
        gameContainer: !!gameContainer
    });

    if (!startBtn) {
        console.error('❌ Bouton start-btn non trouvé!');
        return;
    }

    // Quand on clique sur "JOUER MAINTENANT"
    startBtn.addEventListener('click', () => {
        console.log('🎮 Bouton Start cliqué!');
        
        // 1. Animation de sortie de la landing page
        landingPage.style.opacity = '0';
        console.log('👋 Animation de sortie lancée...');

        // 2. Attendre la fin de l'animation CSS (0.8s) avant de changer le DOM
        setTimeout(() => {
            console.log('⏰ Timeout 800ms terminé');
            landingPage.style.display = 'none';
            gameContainer.classList.remove('hidden');
            console.log('📦 Game container affiché');
            
            // Afficher la scène A-Frame
            const sceneEl = document.getElementById('scene');
            if (sceneEl) {
                sceneEl.style.display = 'block';
                console.log('🎬 Scène A-Frame affichée');
            }
            
            console.log("☕ Appel de initXRWorld()...");
            
            // 3. Initialiser le monde XR
            initXRWorld();
            
        }, 800);
    });
    
    console.log('✅ Event listener sur start-btn ajouté');
});

// ===== XR WORLD LOGIC =====
function initXRWorld() {
    console.log('🚀 initXRWorld() appelée!');
    
    setTimeout(() => {
        console.log('⏰ Timeout 500ms dans initXRWorld terminé');
        
        const debugEl = document.getElementById('debug');
        const surfacesEl = document.getElementById('surfaces');
        const btn = document.getElementById('btn');
        const sceneEl = document.getElementById('scene');
        const cubeEl = document.getElementById('cube');
        const cursorEl = document.getElementById('cursor');

        console.log('🔍 Éléments XR trouvés:', {
            debugEl: !!debugEl,
            surfacesEl: !!surfacesEl,
            btn: !!btn,
            sceneEl: !!sceneEl,
            cubeEl: !!cubeEl,
            cursorEl: !!cursorEl
        });

        if (!sceneEl || !cubeEl) {
            if (debugEl) debugEl.textContent = 'Éléments manquants!';
            console.error('❌ Éléments A-Frame manquants!');
            return;
        }

        console.log('✅ Éléments A-Frame OK!');
        if (debugEl) debugEl.textContent = 'Prêt!';

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
        
        // Référence à la poubelle et au bouton spawn
        const trashcanEl = document.getElementById('trashcan');
        const spawnBtnEl = document.getElementById('spawn-btn');
        const spawnBtnBox = spawnBtnEl ? spawnBtnEl.querySelector('a-box') : null;
        
        // Masquer le loader
        const loader = document.querySelector('.loader');
        if (loader) loader.style.display = 'none';

        // Afficher le bouton AR si disponible
        if (btn) btn.style.display = 'block';

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
        }

        function grab(controller) {
            if (grabbed) return;

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

    }, 500);
}
