import 'aframe';
import 'aframe-extras';
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
        let velocities = [];
        const surfaces = [];
        const spawnedObjects = [];
        let currentGrabbedEl = null; // Track which element is grabbed
        // --- 3D INVENTORY HUD (Attached to Camera) ---
        let inventoryEntity = null;

        function createHUDInventory() {
            const menu = document.createElement('a-entity');

            // Attach to Camera (HUD)
            const cam = document.getElementById('cam');
            if (!cam) return;

            // Position: Down and forward from camera (like a cockpit dashboard)
            menu.setAttribute('position', '0 -0.15 -0.6');
            menu.setAttribute('rotation', '-15 0 0'); // Tilted up slightly
            menu.setAttribute('scale', '0.2 0.2 0.2'); // Smaller scale for close interactions

            // Background "Tray"
            const bg = document.createElement('a-box');
            bg.setAttribute('width', '1.8'); // Extended width
            bg.setAttribute('height', '0.5'); // Taller
            bg.setAttribute('depth', '0.01');
            bg.setAttribute('color', '#111');
            bg.setAttribute('opacity', '0.8');
            bg.setAttribute('class', 'clickable'); // To catch rays
            menu.appendChild(bg);

            // Title
            const title = document.createElement('a-text');
            title.setAttribute('value', 'BOUTIQUE');
            title.setAttribute('align', 'center');
            title.setAttribute('position', '0 0.18 0.02');
            title.setAttribute('width', '2.5'); // Readable text
            title.setAttribute('color', '#FFD700');
            menu.appendChild(title);

            // Grid items
            const items = [
                { type: 'box', color: '#8A2BE2', label: 'Cube' },
                { type: 'sphere', color: '#FF6B6B', label: 'Sphere' },
                { type: 'cylinder', color: '#4ECDC4', label: 'Cyl' },
                { type: 'cone', color: '#FFE66D', label: 'Cone' },
                { type: 'torus', color: '#A855F7', label: 'Torus' },
                { type: 'tetrahedron', color: '#06D6A0', label: 'Tetra' }
            ];

            items.forEach((item, index) => {
                // Layout in a single row
                const x = (index - 2.5) * 0.25;
                const y = -0.05;

                // Button Container
                const btnGroup = document.createElement('a-entity');
                btnGroup.setAttribute('position', `${x} ${y} 0.02`);

                // Button Background
                const btn = document.createElement('a-box');
                btn.setAttribute('width', '0.2');
                btn.setAttribute('height', '0.2');
                btn.setAttribute('depth', '0.05'); // Thicker for better intersection
                btn.setAttribute('color', '#333');
                btn.setAttribute('class', 'clickable'); // Raycastable

                // Hover effect with Scale
                btn.addEventListener('mouseenter', () => {
                    btn.setAttribute('color', '#555');
                    btn.setAttribute('scale', '1.1 1.1 1.1');
                });
                btn.addEventListener('mouseleave', () => {
                    btn.setAttribute('color', '#333');
                    btn.setAttribute('scale', '1 1 1');
                });

                // Click to spawn
                btn.addEventListener('click', () => {
                    spawnObject(item.type, item.color);
                    // Visual feedback
                    btn.setAttribute('color', '#00FF00');
                    setTimeout(() => btn.setAttribute('color', '#555'), 200);
                });

                btnGroup.appendChild(btn);

                // Mini Icon
                const icon = document.createElement(`a-${item.type}`);
                icon.setAttribute('position', '0 0 0.06');
                icon.setAttribute('scale', '0.05 0.05 0.05');
                icon.setAttribute('rotation', '20 20 0');
                icon.setAttribute('color', item.color);
                if (item.type === 'torus') icon.setAttribute('radius-tubular', '0.02');
                btnGroup.appendChild(icon);

                menu.appendChild(btnGroup);
            });

            cam.appendChild(menu); // ATTACH TO CAMERA
            console.log('🛍️ HUD Menu Created!');

            // Force Raycaster Refresh
            const rightCntrl = document.getElementById('right-cntrl');
            if (rightCntrl && rightCntrl.components.raycaster) {
                rightCntrl.components.raycaster.refreshObjects();
            }

            return menu;
        }

        function spawnObject(type, color) {
            // Get camera position and direction
            const cam = document.getElementById('cam');
            const camPos = new THREE.Vector3();
            const camDir = new THREE.Vector3();

            cam.object3D.getWorldPosition(camPos);
            cam.object3D.getWorldDirection(camDir);

            // Spawn 0.5m in front of camera
            const spawnPos = camPos.clone().add(camDir.multiplyScalar(-0.5));
            spawnPos.y = Math.max(spawnPos.y, 0.2); // At least 20cm from ground

            // Create entity based on type
            let entity;
            switch (type) {
                case 'sphere':
                    entity = document.createElement('a-sphere');
                    entity.setAttribute('radius', '0.08');
                    break;
                case 'cylinder':
                    entity = document.createElement('a-cylinder');
                    entity.setAttribute('radius', '0.06');
                    entity.setAttribute('height', '0.15');
                    break;
                case 'cone':
                    entity = document.createElement('a-cone');
                    entity.setAttribute('radius-bottom', '0.08');
                    entity.setAttribute('radius-top', '0');
                    entity.setAttribute('height', '0.15');
                    break;
                case 'torus':
                    entity = document.createElement('a-torus');
                    entity.setAttribute('radius', '0.08');
                    entity.setAttribute('radius-tubular', '0.02');
                    break;
                case 'tetrahedron':
                    entity = document.createElement('a-tetrahedron');
                    entity.setAttribute('radius', '0.1');
                    break;
                default: // box
                    entity = document.createElement('a-box');
                    entity.setAttribute('width', '0.12');
                    entity.setAttribute('height', '0.12');
                    entity.setAttribute('depth', '0.12');
            }

            entity.setAttribute('position', `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`);
            entity.setAttribute('color', color);
            entity.setAttribute('dynamic-body', 'mass:0.5;linearDamping:0.3;angularDamping:0.3');
            entity.classList.add('grabbable');
            entity.id = `spawned-${Date.now()}`;

            sceneEl.appendChild(entity);
            spawnedObjects.push(entity);

            debugEl.textContent = `Spawné: ${type}`;
            console.log(`📦 Spawned ${type} at`, spawnPos);
        }

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

                // Identify Handedness
                ctrl0.addEventListener('connected', (e) => {
                    if (e.data.handedness === 'right') window.rightController = ctrl0;
                });
                ctrl1.addEventListener('connected', (e) => {
                    if (e.data.handedness === 'right') window.rightController = ctrl1;
                });

                sceneEl.object3D.add(ctrl0);
                sceneEl.object3D.add(ctrl1);

                ctrl0.addEventListener('selectstart', () => grab(ctrl0));
                ctrl0.addEventListener('selectend', release);
                ctrl1.addEventListener('selectstart', () => grab(ctrl1));
                ctrl1.addEventListener('selectend', release);

                // CREATE HUD MENU IMMEDIATELY
                createHUDInventory();

                debugEl.textContent = 'AR OK! Regarde en bas';

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

            // --- MANUEL RAYCASTER POUR UI ---
            // 1. Identifier controller droit
            if (!window.rightController) {
                const ses = sceneEl.renderer.xr.getSession();
                if (ses) {
                    for (const source of ses.inputSources) {
                        // On veut seulement les contrôleurs physiques (poignée), pas les mains nues si possible
                        // 'tracked-pointer' est générique, mais souvent 'screen' pour téléphone.
                        if (source.handedness === 'right' && source.targetRayMode === 'tracked-pointer') {
                            const c = sceneEl.renderer.xr.getController(source.profiles.includes('oculus-touch-controls') ? 1 : 0);
                            // Hack: on prend le c1 ou celui qui correspond. 
                            // Plus robuste: on check les contrôleurs threejs déjà connectés.

                            // On va utiliser ceux qu'on a stocké via l'event 'connected' plus bas
                            // Donc on attend que l'event connected ait fait le taf.
                        }
                    }
                }
            }

            if (window.rightController) {
                // Setup Laser & Cursor if not exist
                if (!window.rightController.getObjectByName('laser-line')) {
                    // Ligne (Laser)
                    const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)]);
                    const mat = new THREE.LineBasicMaterial({ color: 0xFF0000, linewidth: 4 });
                    const line = new THREE.Line(geom, mat);
                    line.name = 'laser-line';
                    window.rightController.add(line);

                    // Curseur (Boule au bout)
                    const cursorGeom = new THREE.SphereGeometry(0.015, 16, 16);
                    const cursorMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
                    const cursor = new THREE.Mesh(cursorGeom, cursorMat);
                    cursor.name = 'laser-cursor';
                    cursor.visible = false;
                    window.rightController.add(cursor);
                }

                // Raycasting Logic
                if (inventoryEntity && inventoryEntity.object3D.visible) {
                    const line = window.rightController.getObjectByName('laser-line');
                    const cursor = window.rightController.getObjectByName('laser-cursor');

                    const tempMatrix = new THREE.Matrix4();
                    tempMatrix.identity().extractRotation(window.rightController.matrixWorld);

                    const raycaster = new THREE.Raycaster();
                    raycaster.ray.origin.setFromMatrixPosition(window.rightController.matrixWorld);
                    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                    raycaster.far = 2.0; // Max distance

                    // Collect UI buttons
                    const buttons = [];
                    // On scanne récursivement pour trouver les objets visuels (Mesh) des boutons
                    inventoryEntity.object3D.traverse(child => {
                        // On cherche l'element A-Frame associé qui est 'clickable'
                        if (child.el && child.el.classList.contains('clickable')) {
                            // On ajoute le Mesh Three.js pour le raycaster
                            if (child.isMesh) buttons.push(child);
                        }
                    });

                    const intersects = raycaster.intersectObjects(buttons);

                    // Reset visual state
                    buttons.forEach(mesh => {
                        if (mesh.el && mesh.el._isHovered) {
                            mesh.el.setAttribute('scale', '1 1 1');
                            mesh.el.setAttribute('color', '#333');
                            mesh.el._isHovered = false;
                        }
                    });

                    if (intersects.length > 0) {
                        const hit = intersects[0];
                        const distance = hit.distance;
                        const el = hit.object.el;

                        // 1. UPDATE LASER LENGTH (Stop at impact)
                        if (line) {
                            const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -distance)];
                            line.geometry.setFromPoints(points);
                        }

                        // 2. UPDATE CURSOR POSITION
                        if (cursor) {
                            cursor.visible = true;
                            cursor.position.set(0, 0, -distance);
                        }

                        // 3. HOVER EFFECT
                        if (el && !el._isHovered) {
                            el.setAttribute('scale', '1.1 1.1 1.1');
                            el.setAttribute('color', '#555');
                            el._isHovered = true;
                        }

                        // 4. CLICK HANDLING (Detect Trigger Press)
                        const ses = sceneEl.renderer.xr.getSession();
                        if (ses) {
                            for (const s of ses.inputSources) {
                                if (s.handedness === 'right' && s.gamepad) {
                                    // Trigger = button 0
                                    if (s.gamepad.buttons[0].pressed) {
                                        if (!window.uiClickLock) {
                                            window.uiClickLock = true;
                                            // Trigger visual click
                                            el.setAttribute('color', '#00FF00');
                                            setTimeout(() => el.setAttribute('color', '#555'), 200);

                                            // CALL SPAWN from dataset if present, or infer from structure in createHUDInventory
                                            // The listener on the element might not fire via .click() in this context purely manually.
                                            // Let's call a global helper or replicate logic.
                                            // We previously attached a listener that calls spawnObject.
                                            // Let's force the event dispatch.
                                            el.emit('click');
                                        }
                                    } else {
                                        window.uiClickLock = false;
                                    }
                                }
                            }
                        }
                    } else {
                        // NO HIT
                        if (line) {
                            const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)]; // Full length
                            line.geometry.setFromPoints(points);
                        }
                        if (cursor) cursor.visible = false;
                    }
                }
            }

            // Objet attrapé suit le controller

            // Objet attrapé suit le controller
            if (grabbed && grabController && currentGrabbedEl) {
                try {
                    const pos = new THREE.Vector3();
                    grabController.getWorldPosition(pos);

                    if (isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z)) {
                        currentGrabbedEl.object3D.position.set(pos.x, pos.y, pos.z);

                        if (currentGrabbedEl.body) {
                            currentGrabbedEl.body.position.set(pos.x, pos.y, pos.z);
                        }

                        velocities.push({ x: pos.x, y: pos.y, z: pos.z, t: performance.now() });
                        if (velocities.length > 10) velocities.shift();
                    }
                } catch (e) { }
            }
        }

        function grab(controller) {
            if (grabbed) return;

            // Get controller position
            const ctrlPos = new THREE.Vector3();
            controller.getWorldPosition(ctrlPos);

            // Find the closest grabbable object
            const allGrabbables = [cubeEl, ...spawnedObjects];
            let closestEl = null;
            let closestDist = 0.5; // Max grab distance

            allGrabbables.forEach(el => {
                if (!el || !el.object3D) return;
                const objPos = new THREE.Vector3();
                el.object3D.getWorldPosition(objPos);
                const dist = ctrlPos.distanceTo(objPos);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEl = el;
                }
            });

            if (!closestEl) {
                debugEl.textContent = 'Rien à attraper';
                return;
            }

            debugEl.textContent = 'GRAB!';

            grabbed = true;
            grabController = controller;
            currentGrabbedEl = closestEl;
            velocities = [];

            // Store original color
            currentGrabbedEl._originalColor = currentGrabbedEl.getAttribute('color');
            currentGrabbedEl.setAttribute('color', '#FFD700');

            if (currentGrabbedEl.body) {
                currentGrabbedEl.body.mass = 0;
                currentGrabbedEl.body.type = 2;
                currentGrabbedEl.body.updateMassProperties();
            }

            debugEl.textContent = 'ATTRAPÉ!';
        }

        function release() {
            if (!grabbed || !currentGrabbedEl) return;

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

            // Restore original color
            const originalColor = currentGrabbedEl._originalColor || '#8A2BE2';
            currentGrabbedEl.setAttribute('color', originalColor);

            if (currentGrabbedEl.body) {
                const p = currentGrabbedEl.object3D.position;
                currentGrabbedEl.body.position.set(p.x, p.y, p.z);
                currentGrabbedEl.body.type = 1;
                currentGrabbedEl.body.mass = 0.5;
                currentGrabbedEl.body.updateMassProperties();
                currentGrabbedEl.body.velocity.set(vx, vy, vz);
                currentGrabbedEl.body.wakeUp();
            }

            grabbed = false;
            grabController = null;
            currentGrabbedEl = null;
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
