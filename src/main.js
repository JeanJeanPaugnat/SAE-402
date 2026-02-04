import 'aframe' ;
import 'aframe-extras' ;
import 'aframe-physics-system';

/* global THREE */

console.log('☕ SAE 402 - Chargement initial du script...');

// ===== VARIABLES GLOBALES =====
let xrSession = null;
let xrRefSpace = null;
let hitTestSource = null;
let grabbed = false;
let grabController = null;
let grabbedCube = null;
let velocities = [];
const surfaces = [];
let cubes = [];
let cubeCount = 0;
let sceneEl, cubeEl, cursorEl, trashcanEl, spawnBtnEl;

// ===== LANDING PAGE + LANCEMENT DIRECT AR =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded!');
    
    const startBtn = document.getElementById('start-btn');
    const landingPage = document.getElementById('landing-page');
    const gameContainer = document.getElementById('game-container');

    console.log('🔍 Éléments Landing:', { startBtn: !!startBtn, landingPage: !!landingPage, gameContainer: !!gameContainer });

    if (!startBtn) {
        console.error('❌ Bouton start-btn non trouvé!');
        return;
    }

    // Quand on clique sur "JOUER MAINTENANT" → Lance directement l'AR
    startBtn.addEventListener('click', async () => {
        console.log('🎮 Bouton JOUER cliqué! Lancement direct de l\'AR...');
        
        // 1. Animation de sortie de la landing page
        landingPage.style.opacity = '0';
        
        // 2. Attendre l'animation puis lancer l'AR
        setTimeout(async () => {
            console.log('⏰ Animation terminée');
            landingPage.style.display = 'none';
            gameContainer.classList.remove('hidden');
            
            // 3. Afficher la scène A-Frame
            sceneEl = document.getElementById('scene');
            if (sceneEl) {
                sceneEl.style.display = 'block';
                console.log('🎬 Scène A-Frame affichée');
            }
            
            // 4. Attendre que A-Frame soit prêt
            const waitForScene = () => {
                return new Promise((resolve) => {
                    if (sceneEl.hasLoaded) {
                        resolve();
                    } else {
                        sceneEl.addEventListener('loaded', resolve);
                    }
                });
            };
            
            await waitForScene();
            console.log('✅ A-Frame prêt!');
            
            // 5. Initialiser les éléments
            cubeEl = document.getElementById('cube');
            cursorEl = document.getElementById('cursor');
            trashcanEl = document.getElementById('trashcan');
            spawnBtnEl = document.getElementById('spawn-btn');
            
            if (cubeEl) {
                cubes.push(cubeEl);
                cubeCount = 1;
            }
            
            // Masquer le loader
            const loader = document.querySelector('.loader');
            if (loader) loader.style.display = 'none';
            
            // 6. Lancer directement la session AR !
            console.log('🚀 Lancement de la session AR...');
            await startARSession();
            
        }, 800);
    });
    
    console.log('✅ Event listener prêt');
});

// ===== LANCEMENT SESSION AR =====
async function startARSession() {
    try {
        // Vérifier si WebXR est disponible
        if (!navigator.xr) {
            console.error('❌ WebXR non disponible');
            alert('WebXR non supporté sur cet appareil');
            return;
        }
        
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        console.log('🔍 AR supportée:', isSupported);
        
        if (!isSupported) {
            console.warn('⚠️ AR immersive non supportée, mode fallback');
            // Mode fallback: juste afficher la scène 3D sans AR
            initNonARMode();
            return;
        }
        
        // Créer l'overlay pour l'AR
        const overlay = document.getElementById('overlay') || createOverlay();
        
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hit-test', 'dom-overlay'],
            domOverlay: { root: overlay }
        });
        
        console.log('✅ Session AR créée!');
        
        sceneEl.renderer.xr.setSession(xrSession);
        
        // Setup des controllers
        const ctrl0 = sceneEl.renderer.xr.getController(0);
        const ctrl1 = sceneEl.renderer.xr.getController(1);
        sceneEl.object3D.add(ctrl0);
        sceneEl.object3D.add(ctrl1);
        
        ctrl0.addEventListener('selectstart', () => grab(ctrl0));
        ctrl0.addEventListener('selectend', release);
        ctrl1.addEventListener('selectstart', () => grab(ctrl1));
        ctrl1.addEventListener('selectend', release);
        
        console.log('🎮 Controllers configurés');
        
        // Setup hit-test
        setTimeout(async () => {
            try {
                xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                const viewer = await xrSession.requestReferenceSpace('viewer');
                hitTestSource = await xrSession.requestHitTestSource({ space: viewer });
                console.log('✅ Hit-test OK!');
            } catch (e) {
                console.warn('⚠️ Hit-test non disponible:', e.message);
            }
            
            // Démarrer la boucle XR
            xrSession.requestAnimationFrame(xrLoop);
        }, 500);
        
    } catch (e) {
        console.error('❌ Erreur AR:', e.message);
        // Mode fallback
        initNonARMode();
    }
}

// ===== MODE NON-AR (fallback pour desktop/test) =====
function initNonARMode() {
    console.log('🖥️ Mode non-AR activé (desktop/test)');
    // La scène 3D est déjà visible, on peut juste naviguer dedans
}

// ===== CRÉER OVERLAY SI ABSENT =====
function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1000;';
    document.body.appendChild(overlay);
    console.log('📦 Overlay créé');
    return overlay;
}

// ===== BOUCLE XR =====
function xrLoop(time, frame) {
    if (!xrSession) return;
    xrSession.requestAnimationFrame(xrLoop);
    
    if (!frame || !xrRefSpace) {
        xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
        return;
    }
    
    // Hit-test
    if (hitTestSource && cursorEl) {
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
    
    // Vérifier poubelle
    checkTrashcan();
}

// ===== SPAWN CUBE =====
function spawnCube() {
    cubeCount++;
    
    const cam = document.getElementById('cam');
    const camPos = cam.object3D.getWorldPosition(new THREE.Vector3());
    const camDir = new THREE.Vector3(0, 0, -1);
    camDir.applyQuaternion(cam.object3D.getWorldQuaternion(new THREE.Quaternion()));
    
    const spawnPos = camPos.add(camDir.multiplyScalar(0.7));
    
    const newCup = document.createElement('a-entity');
    newCup.setAttribute('id', `cup-${cubeCount}`);
    newCup.setAttribute('position', `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`);
    newCup.setAttribute('gltf-model', '/Coffee cup.glb');
    newCup.setAttribute('scale', '0.1 0.1 0.1');
    newCup.setAttribute('dynamic-body', 'mass:0.5;linearDamping:0.3;angularDamping:0.3;shape:box');
    
    sceneEl.appendChild(newCup);
    cubes.push(newCup);
    
    console.log(`☕ Tasse ${cubeCount} créée!`);
}

// ===== COULEUR ALÉATOIRE =====
function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#8A2BE2'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ===== CHECK POUBELLE =====
function checkTrashcan() {
    if (!trashcanEl) return;
    
    const trashPos = trashcanEl.object3D.getWorldPosition(new THREE.Vector3());
    const trashRadius = 0.5;
    
    for (let i = cubes.length - 1; i >= 0; i--) {
        const cube = cubes[i];
        if (!cube || !cube.object3D) continue;
        if (cube === grabbedCube) continue;
        
        const cubePos = cube.object3D.getWorldPosition(new THREE.Vector3());
        const dist = cubePos.distanceTo(trashPos);
        
        if (dist < trashRadius) {
            cube.parentNode.removeChild(cube);
            cubes.splice(i, 1);
            console.log(`🗑️ Cube supprimé! (${cubes.length} restants)`);
        }
    }
}

// ===== GRAB =====
function grab(controller) {
    if (grabbed) return;
    
    const controllerPos = new THREE.Vector3();
    controller.getWorldPosition(controllerPos);
    
    // Vérifier bouton spawn
    if (spawnBtnEl) {
        const btnPos = spawnBtnEl.object3D.getWorldPosition(new THREE.Vector3());
        const distToBtn = controllerPos.distanceTo(btnPos);
        if (distToBtn < 0.25) {
            spawnCube();
            console.log('🔘 Bouton spawn pressé!');
            return;
        }
    }
    
    // Trouver le cube le plus proche
    let closestCube = null;
    let closestDist = 0.3;
    
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
        console.log('👋 Aucun cube à portée');
        return;
    }
    
    console.log('✊ GRAB!');
    
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
}

// ===== RELEASE =====
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
    console.log('🖐️ Lâché!');
}

// ===== ADD SURFACE =====
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
    
    if (surfaces.length > 200) surfaces.shift();
}
