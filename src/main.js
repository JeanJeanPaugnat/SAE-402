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
            inventoryEntity = menu; // <--- CRITICAL FIX


            // Attach to Camera (HUD)
            const cam = document.getElementById('cam');
            if (!cam) return;

            // Position: Slightly lower and further away for better visibility
            menu.setAttribute('position', '0 -0.25 -0.8');
            menu.setAttribute('rotation', '-20 0 0'); // Tilted up to face eyes
            menu.setAttribute('scale', '0.5 0.5 0.5'); // SMALLER HUD!

            // GLASSMORPHISM BACKGROUND
            const bg = document.createElement('a-plane');
            bg.setAttribute('width', '1.6'); // Adjusted for content
            bg.setAttribute('height', '0.45');
            bg.setAttribute('color', '#1a1a1a');
            bg.setAttribute('opacity', '0.7'); // Glassy
            bg.setAttribute('material', 'shader: flat; transparent: true');
            menu.appendChild(bg);

            // Border/Frame
            const border = document.createElement('a-plane');
            border.setAttribute('width', '1.62');
            border.setAttribute('height', '0.47');
            border.setAttribute('position', '0 0 -0.001');
            border.setAttribute('color', '#ffffff');
            border.setAttribute('opacity', '0.2');
            menu.appendChild(border);

            // Title
            const title = document.createElement('a-text');
            title.setAttribute('value', 'BOUTIQUE VR');
            title.setAttribute('align', 'center');
            title.setAttribute('position', '0 0.16 0.01');
            title.setAttribute('width', '3');
            title.setAttribute('color', '#ffffff');
            title.setAttribute('font', 'mozillavr');
            menu.appendChild(title);

            // DIAGNOSTIC TEXT REMOVED

            // Item Config
            const items = [
                { type: 'box', color: '#ff6b6b', label: 'CUBE' },
                { type: 'sphere', color: '#4ecdc4', label: 'SPHERE' },
                { type: 'cylinder', color: '#ffe66d', label: 'CYL' },
                { type: 'cone', color: '#ff9f43', label: 'CONE' },
                { type: 'torus', color: '#a29bfe', label: 'TORUS' }
            ];

            const startX = -0.5; // Shifted left to fit 5 items
            const gap = 0.25;

            items.forEach((item, index) => {
                const x = startX + (index * gap);
                const y = -0.05;

                // CONTAINER
                const btnGroup = document.createElement('a-entity');
                btnGroup.setAttribute('position', `${x} ${y} 0.02`);

                // BUTTON BACK (Larger, easier to hit)
                const btn = document.createElement('a-box');
                btn.setAttribute('width', '0.2'); // Bigger touch target
                btn.setAttribute('height', '0.2');
                btn.setAttribute('depth', '0.04');
                btn.setAttribute('color', '#2d3436');
                btn.setAttribute('class', 'clickable'); // RAYCAST TARGET

                // Spawn Data
                btn.dataset.spawnType = item.type;
                btn.dataset.spawnColor = item.color;

                // Hover Scale Animation (Feedback)
                btn.addEventListener('mouseenter', () => {
                    btn.setAttribute('scale', '1.1 1.1 1.1');
                    btn.setAttribute('color', '#636e72');
                });
                btn.addEventListener('mouseleave', () => {
                    btn.setAttribute('scale', '1 1 1');
                    btn.setAttribute('color', '#2d3436');
                });

                btnGroup.appendChild(btn);

                // 3D ICON
                const icon = document.createElement(`a-${item.type}`);
                icon.setAttribute('position', '0 0 0.04');
                icon.setAttribute('scale', '0.05 0.05 0.05');
                icon.setAttribute('rotation', '25 25 0');
                // Use a brighter material for visibility
                icon.setAttribute('material', `color: ${item.color}; metalness: 0.3; roughness: 0.5`);
                if (item.type === 'torus') icon.setAttribute('radius-tubular', '0.02');
                btnGroup.appendChild(icon);

                // LABEL (Underneath)
                const label = document.createElement('a-text');
                label.setAttribute('value', item.label);
                label.setAttribute('align', 'center');
                label.setAttribute('position', '0 -0.13 0');
                label.setAttribute('width', '2');
                label.setAttribute('scale', '0.7 0.7 0.7'); // Smaller text
                label.setAttribute('color', '#dfe6e9');
                btnGroup.appendChild(label);

                menu.appendChild(btnGroup);
            });

            cam.appendChild(menu);
            console.log('🛍️ HUD Redesigned!');
            return menu;
        }

        let lastSpawnTime = 0;

        function spawnObject(type, color) {
            const now = Date.now();
            if (now - lastSpawnTime < 500) {
                console.warn('⚠️ Spawn rate limited');
                return;
            }
            lastSpawnTime = now;

            // Get camera position and direction
            const cam = document.getElementById('cam');
            const camPos = new THREE.Vector3();
            const camDir = new THREE.Vector3();

            cam.object3D.getWorldPosition(camPos);
            cam.object3D.getWorldDirection(camDir);

            // Spawn 1.5m in front of camera (POSITIVE SCALAR!)
            const spawnPos = camPos.clone().add(camDir.multiplyScalar(1.5));
            spawnPos.y = Math.max(spawnPos.y, 0.5); // At least 50cm from ground to be visible

            console.log('✨ SPAWNING at:', spawnPos);

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
            entity.setAttribute('class', 'clickable grabbable');
            entity.id = `spawned-${now}`;

            sceneEl.appendChild(entity);
            spawnedObjects.push(entity);

            const debugEl = document.getElementById('debug');
            if (debugEl) debugEl.textContent = `Spawné: ${type}`;
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

            // --- MANUEL RAYCASTER & DIAGNOSTICS ---

            const ses = sceneEl.renderer.xr.getSession();
            const diagText = document.getElementById('diag-text');

            // 1. Identification (Si pas encore trouvé)
            if (!window.rightController && ses) {
                for (const source of ses.inputSources) {
                    if (source.handedness === 'right' && source.targetRayMode === 'tracked-pointer') {
                        // On suppose que c'est le controller 1 (souvent Touch Droit)
                        // Une meilleure approche est de vérifier les profiles, mais c'est un bon fallback
                        const c = sceneEl.renderer.xr.getController(1);
                        window.rightController = c;
                    }
                }
            }

            // 2. Diagnostics Panel Loop
            // 2. Button State Loop (Kept for logic, removed visuals)
            if (ses) {
                let isAnyBtnPressed = false;

                ses.inputSources.forEach((s, i) => {
                    if (s.gamepad) {
                        s.gamepad.buttons.forEach((b, bi) => {
                            if (b.pressed) {
                                isAnyBtnPressed = true;
                            }
                        });
                    }
                });

                // Export button state for interaction
                // Export button state for interaction
                window.isAnyBtnPressed = isAnyBtnPressed;

                if (!isAnyBtnPressed) {
                    window.uiClickLock = false;
                }
            }

            // 3. Interaction Logic
            if (window.rightController && inventoryEntity) {
                // Setup Laser & Cursor if not exist
                if (!window.rightController.getObjectByName('laser-line')) {
                    const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)]);
                    const mat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 4 });
                    const line = new THREE.Line(geom, mat);
                    line.name = 'laser-line';
                    window.rightController.add(line);

                    const cursorGeom = new THREE.SphereGeometry(0.01, 16, 16);
                    const cursorMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
                    const cursor = new THREE.Mesh(cursorGeom, cursorMat);
                    cursor.name = 'laser-cursor';
                    cursor.visible = false;
                    window.rightController.add(cursor);
                }

                // RAYCAST
                const tempMatrix = new THREE.Matrix4();
                tempMatrix.identity().extractRotation(window.rightController.matrixWorld);

                const raycaster = new THREE.Raycaster();
                raycaster.ray.origin.setFromMatrixPosition(window.rightController.matrixWorld);
                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                raycaster.far = 3.0;

                // Visuals
                const line = window.rightController.getObjectByName('laser-line');
                const cursor = window.rightController.getObjectByName('laser-cursor');

                // Gather Targets
                const buttons = [];
                inventoryEntity.object3D.traverse(child => {
                    if (child.el && child.el.classList.contains('clickable') && child.isMesh) {
                        buttons.push(child);
                    }
                });

                const intersects = raycaster.intersectObjects(buttons);

                // Clear Visual State
                buttons.forEach(mesh => {
                    if (mesh.el && mesh.el._isHovered) {
                        mesh.el.setAttribute('scale', '1 1 1');
                        mesh.el.setAttribute('color', '#2d3436');
                        mesh.el._isHovered = false;
                    }
                });

                if (intersects.length > 0) {
                    const hit = intersects[0];
                    window.lastIntersect = hit.object.el.dataset.spawnType || 'BG';
                    const el = hit.object.el;
                    const dist = hit.distance;

                    // Update Laser Length
                    if (line) {
                        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -dist)];
                        line.geometry.setFromPoints(points);
                        line.geometry.attributes.position.needsUpdate = true;
                    }
                    if (cursor) {
                        cursor.visible = true;
                        cursor.position.set(0, 0, -dist);
                    }

                    // Hover & Click
                    if (el.dataset.spawnType) {
                        if (!el._isHovered) {
                            el.setAttribute('scale', '1.1 1.1 1.1');
                            el.setAttribute('color', '#636e72');
                            el._isHovered = true;
                        }

                        // CLICK CHECK (Using state computed in Diag step)
                        if (window.isAnyBtnPressed) {
                            if (!window.uiClickLock) {
                                window.uiClickLock = true;
                                console.log('SPAWN COMMAND SENT for', el.dataset.spawnType);

                                // Feedback
                                el.setAttribute('color', '#00cec9');

                                // SPAWN
                                spawnObject(el.dataset.spawnType, el.dataset.spawnColor);
                            }
                        }
                    } else {
                        // Hit something else (bg)
                    }

                } else {
                    // NO HIT
                    window.lastIntersect = null;
                    if (line) {
                        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)];
                        line.geometry.setFromPoints(points);
                        line.geometry.attributes.position.needsUpdate = true;
                    }
                    if (cursor) cursor.visible = false;

                }
            }


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

    }, 100);
});
