/* global AFRAME, THREE */

/**
 * AR Plane Detection - Détecte les surfaces réelles et crée des colliders
 */
AFRAME.registerComponent('ar-plane-detection', {
    schema: {
        visualize: { type: 'boolean', default: true }
    },

    init: function () {
        this.planes = new Map();
<<<<<<< HEAD
        this.xrSession = null;
        this.referenceSpace = null;

        this.el.sceneEl.addEventListener('enter-vr', () => {
            setTimeout(() => {
                const renderer = this.el.sceneEl.renderer;
                if (renderer && renderer.xr) {
                    this.xrSession = renderer.xr.getSession();
                    this.referenceSpace = renderer.xr.getReferenceSpace();
                    if (this.xrSession) {
                        console.log('[Planes] Session active, plane-detection:',
                            this.xrSession.enabledFeatures?.includes('plane-detection'));
                    }
                }
            }, 500);
        });
    },

    tick: function () {
        if (!this.xrSession) return;

        const frame = this.el.sceneEl.renderer.xr.getFrame();
        if (!frame) return;

        // Essayer d'accéder aux plans détectés
        const detectedPlanes = frame.detectedPlanes || this.xrSession.detectedPlanes;
        if (!detectedPlanes) return;

        // Mettre à jour les plans
        detectedPlanes.forEach(plane => {
            const id = this.getPlaneId(plane);

            if (!this.planes.has(id)) {
                this.createPlane(plane, id, frame);
            } else {
                this.updatePlane(plane, id, frame);
            }
        });

        // Supprimer les plans disparus
        this.planes.forEach((entity, id) => {
            let found = false;
            detectedPlanes.forEach(p => {
                if (this.getPlaneId(p) === id) found = true;
            });
            if (!found) {
                entity.parentNode?.removeChild(entity);
                this.planes.delete(id);
            }
        });
    },

    getPlaneId: function (plane) {
        return plane.planeSpace?.toString() || `plane_${Math.random()}`;
    },

    createPlane: function (plane, id, frame) {
        const entity = document.createElement('a-entity');

        // Calculer taille
        let width = 1, depth = 1;
        if (plane.polygon && plane.polygon.length > 0) {
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            for (const p of plane.polygon) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minZ = Math.min(minZ, p.z);
                maxZ = Math.max(maxZ, p.z);
            }
            width = Math.max(0.1, maxX - minX);
            depth = Math.max(0.1, maxZ - minZ);
        }

        // Géométrie box fine
        entity.setAttribute('geometry', {
            primitive: 'box',
            width: width,
            height: 0.02,
            depth: depth
        });

        // Couleur selon orientation
        const isHorizontal = plane.orientation === 'horizontal';
        if (this.data.visualize) {
            entity.setAttribute('material', {
                color: isHorizontal ? '#00AAFF' : '#FF6600',
                opacity: 0.4,
                transparent: true
            });
        } else {
            entity.setAttribute('visible', 'false');
        }

        // PHYSIQUE
        entity.setAttribute('static-body', '');

        this.el.sceneEl.appendChild(entity);
        this.planes.set(id, entity);

        // Positionner
        this.updatePlane(plane, id, frame);

        console.log('[Planes] Nouveau plan:', plane.orientation, 'taille:', width.toFixed(2), 'x', depth.toFixed(2));
    },

    updatePlane: function (plane, id, frame) {
        const entity = this.planes.get(id);
        if (!entity || !plane.planeSpace || !this.referenceSpace) return;

        try {
            const pose = frame.getPose(plane.planeSpace, this.referenceSpace);
            if (pose) {
                const { position, orientation } = pose.transform;
                entity.object3D.position.set(position.x, position.y, position.z);
                entity.object3D.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);

                // Sync physics body
                if (entity.body) {
                    entity.body.position.set(position.x, position.y, position.z);
                    entity.body.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
                }
            }
        } catch (e) {
            // Ignore pose errors
        }
    }
});
=======
        
        // On récupère les DEUX éléments de texte
        this.debugEl = document.getElementById('debug');     // Le message principal
        this.surfacesEl = document.getElementById('surfaces'); // Le compteur "Surfaces: 0"

        this.el.sceneEl.addEventListener('enter-vr', () => {
            this.updateText('Session AR démarrée. Scannez votre table...');
        });
    },

    updateText: function(msg, count = null) {
        // Met à jour le message de debug
        if(this.debugEl) this.debugEl.textContent = msg;
        
        // Met à jour le compteur précis si on a un chiffre
        if(this.surfacesEl && count !== null) {
            this.surfacesEl.textContent = `Surfaces: ${count}`;
        }
    },

    tick: function () {
        const frame = this.el.sceneEl.frame;
        const session = this.el.sceneEl.renderer.xr.getSession();
        const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();

        if (!frame || !session || !refSpace) return;
        
        const detectedPlanes = frame.detectedPlanes || session.detectedPlanes;
        
        // Si la fonctionnalité n'est pas supportée ou active
        if (!detectedPlanes) {
            this.updateText('AR activé, mais pas de détection de plans.');
            return;
        }

        // Si 0 plans détectés -> C'est ici que ça affiche 0
        if (detectedPlanes.size === 0) {
            // On ne spamme pas le texte, on met juste à jour le compteur
            if (this.surfacesEl) this.surfacesEl.textContent = "Surfaces: 0";
            return; 
        }

        // 1. Nettoyage des plans disparus
        for (const [plane, entity] of this.planes) {
            if (!detectedPlanes.has(plane)) {
                if (entity.parentNode) entity.parentNode.removeChild(entity);
                this.planes.delete(plane);
            }
        }

        // 2. Mise à jour des plans
        detectedPlanes.forEach(plane => {
            const entity = this.planes.get(plane);
            if (entity) {
                this.updatePlane(plane, entity, frame, refSpace);
            } else {
                this.createPlane(plane, frame, refSpace);
            }
        });
        
        // Mise à jour de l'affichage (environ 1 fois par seconde pour pas clignoter)
        if (Math.random() < 0.02) {
            this.updateText(`Détection active !`, this.planes.size);
        }
    },

    createPlane: function (plane, frame, refSpace) {
        const entity = document.createElement('a-entity');
        
        // Couleur selon l'orientation (Horizontal = Vert, Vertical = Orange)
        const isHorizontal = plane.orientation === 'horizontal';
        const color = isHorizontal ? '#00FF00' : '#FF8800';
        
        entity.setAttribute('material', { 
            color: color, 
            opacity: 0.3, 
            transparent: true,
            side: 'double'
        });
        
        // Physique : Boite statique avec friction et sans rebond
        entity.setAttribute('static-body', 'shape: box; restitution: 0; friction: 1');
        entity.setAttribute('visible', this.data.visualize);

        this.el.sceneEl.appendChild(entity);
        this.planes.set(plane, entity);
        
        this.updatePlane(plane, entity, frame, refSpace);
    },

    updatePlane: function (plane, entity, frame, refSpace) {
        const pose = frame.getPose(plane.planeSpace, refSpace);
        if (!pose) return;

        entity.object3D.position.copy(pose.transform.position);
        entity.object3D.quaternion.copy(pose.transform.orientation);

        if (plane.polygon && plane.polygon.length > 0) {
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            plane.polygon.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minZ = Math.min(minZ, p.z);
                maxZ = Math.max(maxZ, p.z);
            });
            
            const width = Math.max(0.2, maxX - minX);
            const depth = Math.max(0.2, maxZ - minZ);
            const height = 0.02; // Réduire l'épaisseur à 2cm pour moins d'espace

            entity.setAttribute('geometry', { width, height, depth });
            
            // Décaler légèrement vers le haut pour que les objets touchent la surface
            entity.object3D.translateY(height / 2);
            
            // Mise à jour physique
            if (entity.body) {
                entity.body.position.copy(entity.object3D.position);
                entity.body.quaternion.copy(entity.object3D.quaternion);
            }
        }
    }
});
>>>>>>> origin/debut_jeu
