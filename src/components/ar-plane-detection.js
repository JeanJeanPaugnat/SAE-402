/* global AFRAME, THREE */

AFRAME.registerComponent('ar-plane-detection', {
    schema: {
        visualizePlanes: { type: 'boolean', default: true },
        color: { type: 'color', default: '#FF0000' } // Red for planes to distinguish from Mesh
    },

    init: function () {
        this.planeEntities = new Map();
        this.xrSession = null;

        this.el.sceneEl.addEventListener('enter-vr', () => {
            const session = this.el.sceneEl.renderer.xr.getSession();
            if (session) {
                this.xrSession = session;
                console.log('Plane detection capabilities:', session.enabledFeatures.includes('plane-detection'));
            }
        });
    },

    tick: function () {
        if (!this.xrSession) return;

        if (this.xrSession.detectedPlanes) {
            this.updatePlanes(this.xrSession.detectedPlanes);
        }
    },

    updatePlanes: function (detectedPlanes) {
        if (!this.data.visualizePlanes) return;

        // Remove lost planes
        this.planeEntities.forEach((entity, plane) => {
            if (!detectedPlanes.has(plane)) {
                entity.parentNode.removeChild(entity);
                this.planeEntities.delete(plane);
            }
        });

        // Add/Update planes
        detectedPlanes.forEach(plane => {
            let entity = this.planeEntities.get(plane);

            if (!entity) {
                // Visualize Plane
                entity = document.createElement('a-entity');

                // Create a polygon based on plane.polygon usually, but simplest is a quad for basic bounds
                // We'll use a simple plane geometry for now, updating scale
                entity.setAttribute('geometry', 'primitive: plane; width: 1; height: 1');
                entity.setAttribute('material', {
                    shader: 'flat',
                    color: plane.orientation === 'horizontal' ? '#4444FF' : '#FF4444', // Blue floor/table, Red wall
                    opacity: 0.2,
                    transparent: true,
                    side: 'double'
                });
                entity.setAttribute('rotation', '-90 0 0');

                // Add physics tag for real-world-physics.js to pick up
                entity.setAttribute('data-ar-plane', '');

                this.el.sceneEl.appendChild(entity);
                this.planeEntities.set(plane, entity);
            }

            const frame = this.el.sceneEl.renderer.xr.getFrame();
            const pose = frame.getPose(plane.planeSpace, this.el.sceneEl.renderer.xr.getReferenceSpace());

            if (pose) {
                entity.object3D.position.copy(pose.transform.position);
                entity.object3D.quaternion.copy(pose.transform.orientation);
                // Rough approximation of size if polygon is complex. 
                // For Quest, detectedPlanes are usually rects or polygons.
                // Using hit-test is better for placement, but this shows "detected area"
            }
        });
    }
});
