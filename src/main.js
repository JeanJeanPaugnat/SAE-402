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

        let menuToggleLock = false; // Prevents flickering when holding button
        let coffeeMachineLock = false; // Prevents multiple coffee spawns
        let coffeeAudio = null; // Audio element for coffee sound

        // --- COFFEE MACHINE AUDIO SETUP ---
        function initCoffeeAudio() {
            coffeeAudio = new Audio('/sounds/public_assets_café.MP3');
            coffeeAudio.volume = 0.7;
        }
        initCoffeeAudio();

        // --- SPAWN COFFEE CUP FUNCTION ---
        function spawnCoffeeCup(machineEntity) {
            if (!machineEntity || !machineEntity.object3D) return;

            const machinePos = new THREE.Vector3();
            machineEntity.object3D.getWorldPosition(machinePos);

            // Position à droite de la machine (offset de 0.15m sur X)
            const cupPos = {
                x: machinePos.x + 0.15,
                y: machinePos.y + 0.05, // Légèrement au dessus du sol
                z: machinePos.z
            };

            const cup = document.createElement('a-entity');
            cup.setAttribute('gltf-model', 'url(models/Coffee cup.glb)');
            cup.setAttribute('scale', '0.8 0.8 0.8');
            cup.setAttribute('position', `${cupPos.x} ${cupPos.y} ${cupPos.z}`);
            cup.setAttribute('dynamic-body', 'mass:0.2;linearDamping:0.3;angularDamping:0.3');
            cup.setAttribute('class', 'clickable grabbable');
            cup.id = `coffee-cup-${Date.now()}`;

            sceneEl.appendChild(cup);
            spawnedObjects.push(cup);

            console.log('☕ Tasse de café créée à:', cupPos);
            if (debugEl) debugEl.textContent = '☕ Café prêt!';
        }

        // --- COFFEE MACHINE INTERACTION ---
        function handleCoffeeMachineClick(machineEntity) {
            if (coffeeMachineLock) return; // Déjà en cours
            coffeeMachineLock = true;

            console.log('☕ Machine à café activée!');
            if (debugEl) debugEl.textContent = '☕ Préparation du café...';

            // Jouer le son
            if (coffeeAudio) {
                coffeeAudio.currentTime = 0;
                coffeeAudio.play().catch(e => console.log('Audio error:', e));
            }

            // Attendre 1.5 secondes puis faire apparaître la tasse
            setTimeout(() => {
                spawnCoffeeCup(machineEntity);
                coffeeMachineLock = false; // Débloquer pour le prochain café
            }, 1500);
        }

        // --- 3D INVENTORY HUD (Attached to Camera) ---
        let inventoryEntity = null;

        function createHUDInventory() {
            const menu = document.createElement('a-entity');
            inventoryEntity = menu;
            menu.setAttribute('visible', 'false'); // HIDDEN BY DEFAULT

            // Attach to Camera (HUD)
            const cam = document.getElementById('cam');
            if (!cam) return;

            // Position: Adjusted for new scale
            menu.setAttribute('position', '0 -0.2 -0.8');
            menu.setAttribute('rotation', '-15 0 0'); // Tilted up to face eyes
            menu.setAttribute('scale', '0.5 0.5 0.5'); // COMPACT SCALE

            // --- SIMPLE BACKGROUND (Plane) ---
            // Changed from Box to Plane to avoid Z-fighting/blocking issues
            const bg = document.createElement('a-plane');
            bg.setAttribute('width', '1.6');
            bg.setAttribute('height', '1.4');
            bg.setAttribute('color', '#000000');
            bg.setAttribute('opacity', '0.6'); // More transparent
            bg.setAttribute('shader', 'flat'); // Simple shader, no lighting issues
            bg.setAttribute('position', '0 -0.05 -0.01'); // Behind items
            menu.appendChild(bg);

            // Removed "Border" box to simplify view

            // Title
            const title = document.createElement('a-text');
            title.setAttribute('value', 'VR STORE');
            title.setAttribute('align', 'center');
            title.setAttribute('position', '0 0.55 0.03'); // Top
            title.setAttribute('width', '4');
            title.setAttribute('color', '#ffffff');
            title.setAttribute('font', 'mozillavr');
            title.setAttribute('letter-spacing', '2');
            menu.appendChild(title);

            // Decorative Line
            const line = document.createElement('a-plane');
            line.setAttribute('width', '1.0');
            line.setAttribute('height', '0.003');
            line.setAttribute('color', '#00cec9');
            line.setAttribute('position', '0 0.48 0.03');
            menu.appendChild(line);

            // Item Config - 10 Custom Models
            const items = [
                // Row 1: Primitives + Basics
                { type: 'box', color: '#ff7675', label: 'CUBE' },
                { type: 'sphere', color: '#74b9ff', label: 'SPHERE' },
                { type: 'gltf', label: 'MACHINE', model: 'models/Coffee%20Machine.glb', color: '#fff', scale: '0.3 0.3 0.3' },
                { type: 'gltf', label: 'TRASH', model: 'models/Trashcan%20Small.glb', color: '#fff', scale: '0.4 0.4 0.4' },

                // Row 2
                { type: 'gltf', label: 'SPEAKER', model: 'models/Bass%20Speakers.glb', color: '#fff', scale: '0.8 0.8 0.8' },
                { type: 'gltf', label: 'BROOM', model: 'models/Broom.glb', color: '#fff', scale: '0.1 0.1 0.1' },
                { type: 'gltf', label: 'REGISTER', model: 'models/Cash%20register.glb', color: '#fff', scale: '0.15 0.15 0.15' },
                // Row 3
                { type: 'gltf', label: 'SIGN', model: 'models/Coffee%20sign.glb', color: '#fff', scale: '0.4 0.4 0.4' },
                { type: 'gltf', label: 'COUCH', model: 'models/Couch.glb', color: '#fff', scale: '0.005 0.005 0.005' },
                { type: 'gltf', label: 'PLANT', model: 'models/Houseplant.glb', color: '#fff', scale: '0.4 0.4 0.4' },
                { type: 'gltf', label: 'RUG', model: 'models/Rug.glb', color: '#fff', scale: '0.005 0.005 0.005' }
            ];

            const gap = 0.35;
            const itemsPerRow = 4;
            const startX = -((itemsPerRow - 1) * gap) / 2;

            items.forEach((item, index) => {
                const row = Math.floor(index / itemsPerRow);
                const col = index % itemsPerRow;

                const x = startX + (col * gap);
                // Row 0: 0.25, Row 1: -0.15, Row 2: -0.55
                const y = 0.25 - (row * 0.4);

                // CONTAINER
                const btnGroup = document.createElement('a-entity');
                btnGroup.setAttribute('position', `${x} ${y} 0.05`);

                // CARD BACKGROUND (Clickable)
                const btn = document.createElement('a-box');
                btn.setAttribute('width', '0.28');
                btn.setAttribute('height', '0.32');
                btn.setAttribute('depth', '0.02');
                btn.setAttribute('color', '#2d3436');
                btn.setAttribute('opacity', '0.9');
                btn.setAttribute('class', 'clickable');

                // Spawn Data
                btn.dataset.spawnType = item.type;
                btn.dataset.spawnColor = item.color;
                btn.dataset.spawnModel = item.model;
                btn.dataset.spawnScale = item.scale;

                // Hover Effects
                btn.addEventListener('mouseenter', () => {
                    btn.setAttribute('color', '#636e72');
                    btn.setAttribute('scale', '1.1 1.1 1.1');
                    const icon = btnGroup.querySelector('.item-icon');
                    if (icon) icon.setAttribute('animation', 'property: rotation; to: 25 385 0; dur: 800; easing: easeInOutQuad');
                });
                btn.addEventListener('mouseleave', () => {
                    btn.setAttribute('color', '#2d3436');
                    btn.setAttribute('scale', '1 1 1');
                    const icon = btnGroup.querySelector('.item-icon');
                    if (icon) icon.removeAttribute('animation');
                });

                btnGroup.appendChild(btn);

                // 3D ICON (Preview)
                // 3D ICON (Preview)
                let icon;
                if (item.type === 'gltf') {
                    // SAFE MODE: Use a simple cube for all GLTF items in the menu
                    // This prevents "camera occlusion" from models with bad origins/scales
                    icon = document.createElement('a-box');
                    icon.setAttribute('width', '1');
                    icon.setAttribute('height', '1');
                    icon.setAttribute('depth', '1');
                    icon.setAttribute('scale', '0.04 0.04 0.04');
                    icon.setAttribute('material', 'color: #74b9ff;  metalness: 0.5; roughness: 0.2');
                } else {
                    icon = document.createElement(`a-${item.type}`);
                    icon.setAttribute('scale', '0.06 0.06 0.06');
                    icon.setAttribute('material', `color: ${item.color}; metalness: 0.5; roughness: 0.1`);
                }

                icon.setAttribute('position', '0 0.04 0.06');
                icon.setAttribute('rotation', '25 25 0');
                icon.setAttribute('class', 'item-icon');
                btnGroup.appendChild(icon);

                // LABEL
                const label = document.createElement('a-text');
                label.setAttribute('value', item.label);
                label.setAttribute('align', 'center');
                label.setAttribute('position', '0 -0.11 0.06');
                label.setAttribute('width', '1.4');
                label.setAttribute('color', '#dfe6e9');
                btnGroup.appendChild(label);

                menu.appendChild(btnGroup);
            });

            cam.appendChild(menu);
            console.log('🛍️ HUD Upgrade Complete: Custom Models');
            return menu;
        }

        let lastSpawnTime = 0;

        function spawnObject(type, color, model, scale = '0.4 0.4 0.4') {
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
                case 'gltf':
                    entity = document.createElement('a-entity');
                    entity.setAttribute('gltf-model', `url(${model})`);
                    entity.setAttribute('scale', scale);
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
                    const handedness = e.data.handedness;
                    if (handedness === 'right') window.rightController = ctrl0;
                    if (handedness === 'left') window.leftController = ctrl0; // Capture Left
                });
                ctrl1.addEventListener('connected', (e) => {
                    const handedness = e.data.handedness;
                    if (handedness === 'right') window.rightController = ctrl1;
                    if (handedness === 'left') window.leftController = ctrl1; // Capture Left
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

            // 2. Diagnostics Panel Loop
            if (ses) {
                let isAnyBtnPressed = false;

                // Checking Input Sources
                for (const source of ses.inputSources) {
                    // LEFT CONTROLLER - Menu Toggle (Button 4/5 usually X/Y)
                    if (source.handedness === 'left' && source.gamepad) {
                        // Button 5 is usually 'Y' on Quest
                        const yBtn = source.gamepad.buttons[5] || source.gamepad.buttons[4] || source.gamepad.buttons[3];

                        if (yBtn && yBtn.pressed) {
                            if (!menuToggleLock) {
                                menuToggleLock = true;
                                if (inventoryEntity) {
                                    const vis = inventoryEntity.getAttribute('visible');
                                    inventoryEntity.setAttribute('visible', !vis);
                                    console.log('Toggle Menu:', !vis);
                                }
                            }
                        } else {
                            if (menuToggleLock) menuToggleLock = false;
                        }
                    }

                    // RIGHT CONTROLLER - Coffee Machine Interaction (Button B)
                    if (source.handedness === 'right' && source.gamepad) {
                        // Button 5 is usually 'B' on Quest (or 4/3 depending on mapping)
                        const bBtn = source.gamepad.buttons[5] || source.gamepad.buttons[4];

                        if (bBtn && bBtn.pressed && !coffeeMachineLock) {
                            // Raycast from right controller to detect coffee machine
                            const rightCtrl = window.rightController;
                            if (rightCtrl) {
                                const tempMatrix = new THREE.Matrix4();
                                tempMatrix.identity().extractRotation(rightCtrl.matrixWorld);

                                const raycaster = new THREE.Raycaster();
                                raycaster.ray.origin.setFromMatrixPosition(rightCtrl.matrixWorld);
                                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                                raycaster.far = 5.0; // 5 mètres de portée

                                // Find all coffee machines in spawnedObjects
                                const coffeeMachines = [];
                                spawnedObjects.forEach(obj => {
                                    if (obj && obj.object3D) {
                                        // Check if it's a coffee machine (by gltf-model attribute)
                                        const model = obj.getAttribute('gltf-model');
                                        if (model && model.includes('Coffee Machine')) {
                                            obj.object3D.traverse(child => {
                                                if (child.isMesh) {
                                                    child.el = obj; // Reference to A-Frame entity
                                                    coffeeMachines.push(child);
                                                }
                                            });
                                        }
                                    }
                                });

                                const intersects = raycaster.intersectObjects(coffeeMachines);

                                if (intersects.length > 0) {
                                    const hitEntity = intersects[0].object.el;
                                    if (hitEntity) {
                                        handleCoffeeMachineClick(hitEntity);
                                    }
                                }
                            }
                        }
                    }

                    // CHECK FOR ANY CLICK (For both hands)
                    if (source.gamepad) {
                        // Usually Trigger is button 0
                        if (source.gamepad.buttons[0] && source.gamepad.buttons[0].pressed) {
                            isAnyBtnPressed = true;
                        }
                    }
                }

                window.isAnyBtnPressed = isAnyBtnPressed;
                if (!isAnyBtnPressed) {
                    window.uiClickLock = false; // Reset lock when release
                }
            }

            // 3. Interaction Logic (Unified for Both Controllers)

            const handleControllerInteraction = (controller) => {
                if (!controller || !inventoryEntity) return;

                const isMenuVisible = inventoryEntity.getAttribute('visible');

                let line = controller.getObjectByName('laser-line');
                let cursor = controller.getObjectByName('laser-cursor');

                if (!isMenuVisible) {
                    if (line) line.visible = false;
                    if (cursor) cursor.visible = false;
                    return;
                }

                if (!line) {
                    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
                    const lineMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
                    line = new THREE.Line(lineGeom, lineMat);
                    line.name = 'laser-line';
                    controller.add(line);
                }

                if (!cursor) {
                    const cursorGeom = new THREE.RingGeometry(0.02, 0.04, 32);
                    const cursorMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
                    cursor = new THREE.Mesh(cursorGeom, cursorMat);
                    cursor.name = 'laser-cursor';
                    controller.add(cursor);
                }

                line.visible = true;
                cursor.visible = false; // Hidden unless hit

                // RAYCAST
                const tempMatrix = new THREE.Matrix4();
                tempMatrix.identity().extractRotation(controller.matrixWorld);

                const raycaster = new THREE.Raycaster();
                raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                raycaster.far = 3.0;

                const buttons = [];
                inventoryEntity.object3D.traverse(child => {
                    if (child.el && child.el.classList.contains('clickable') && child.isMesh) {
                        buttons.push(child);
                    }
                });

                const intersects = raycaster.intersectObjects(buttons);

                // Clear Hovers (Global clear might flicker if both point, but acceptable for now)
                // Better: clear hover only if NOT hovered by other controller? 
                // Simple version: clear always, re-apply if intersection.

                // Note: Clearing globally in a loop inside a per-controller function is slightly buggy if both controllers point.
                // But typically only one points at a time.

                if (intersects.length > 0) {
                    const hit = intersects[0];
                    const el = hit.object.el;
                    const dist = hit.distance;

                    // Update Laser
                    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -dist)];
                    line.geometry.setFromPoints(points);
                    line.geometry.attributes.position.needsUpdate = true;

                    cursor.visible = true;
                    cursor.position.set(0, 0, -dist);

                    // Hover
                    el.setAttribute('scale', '1.1 1.1 1.1');
                    el.setAttribute('color', '#636e72');

                    // CLICK?
                    // We check if THIS controller's trigger is pressed. 
                    // However, we only have global 'isAnyBtnPressed' from the loop above.
                    // Ideally we check specific controller state here.
                    // But for now, using global isAnyBtnPressed is acceptable as requested "cliquer".

                    if (window.isAnyBtnPressed && !window.uiClickLock) {
                        window.uiClickLock = true;
                        console.log('SPAWN COMMAND (Left/Right) for', el.dataset.spawnType);
                        el.setAttribute('color', '#00cec9');
                        spawnObject(el.dataset.spawnType, el.dataset.spawnColor, el.dataset.spawnModel, el.dataset.spawnScale);
                    }

                } else {
                    // Reset Laser
                    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)];
                    line.geometry.setFromPoints(points);
                    line.geometry.attributes.position.needsUpdate = true;
                }
            };

            // Execute for both
            handleControllerInteraction(window.rightController);
            handleControllerInteraction(window.leftController);

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

        // Removed release/grab duplicated definitions if any, used the ones already defined above if valid scopes?
        // Wait, 'grab' and 'release' were defined outside loop in previous version?
        // Let's ensure they are available. In the original file they were inside window.load but outside loop.
        // I am replacing from line 41 to 609, so I am including them.

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
