// Decade Golf AR Training App
// WebXR-based application for measuring shot deviations

class DecadeGolfAR {
    constructor() {
        // UI Elements
        this.startBtn = document.getElementById('start-ar-btn');
        this.stopBtn = document.getElementById('stop-ar-btn');
        this.setTargetBtn = document.getElementById('set-target-btn');
        this.markShotBtn = document.getElementById('mark-shot-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.arStatus = document.getElementById('ar-status');
        this.preARControls = document.getElementById('pre-ar-controls');
        this.arActiveControls = document.getElementById('ar-active-controls');
        this.shotHistory = document.getElementById('shot-history');
        this.shotsList = document.getElementById('shots-list');
        this.statsSummary = document.getElementById('stats-summary');
        this.measurementDisplay = document.getElementById('measurement-display');
        this.targetMarker = document.getElementById('target-marker');
        this.leftLine = document.getElementById('left-line');
        this.rightLine = document.getElementById('right-line');
        this.shotMarker = document.getElementById('shot-marker');

        // Three.js and WebXR
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.xrSession = null;
        this.xrRefSpace = null;
        this.xrHitTestSource = null;
        this.reticleGeometry = null;
        this.reticle = null;

        // Application State
        this.targetPosition = null;
        this.targetRotation = null;
        this.shots = [];
        this.isARActive = false;
        this.isTargetSet = false;

        // Constants
        this.YARDS_TO_METERS = 0.9144;
        this.DEVIATION_DISTANCE_YARDS = 10; // 10 yards to each side
        this.DEVIATION_DISTANCE_METERS = this.DEVIATION_DISTANCE_YARDS * this.YARDS_TO_METERS;

        this.init();
    }

    init() {
        this.checkARSupport();
        this.setupEventListeners();
    }

    checkARSupport() {
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
                if (supported) {
                    this.startBtn.disabled = false;
                    this.showStatus('Dispositivo compatible con AR', 'success');
                } else {
                    this.showStatus('AR no soportado en este dispositivo', 'error');
                    this.startBtn.disabled = true;
                }
            }).catch((err) => {
                console.error('Error checking AR support:', err);
                this.showStatus('Error al verificar soporte AR', 'error');
                this.startBtn.disabled = true;
            });
        } else {
            this.showStatus('WebXR no disponible en este navegador', 'error');
            this.startBtn.disabled = true;
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startAR());
        this.stopBtn.addEventListener('click', () => this.stopAR());
        this.setTargetBtn.addEventListener('click', () => this.setTarget());
        this.markShotBtn.addEventListener('click', () => this.markShot());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    async startAR() {
        try {
            this.showStatus('Iniciando sesión AR...', 'info');

            // Initialize Three.js
            this.setupThreeJS();

            // Request AR session
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'local'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.getElementById('ar-overlay') }
            });

            // Setup XR session
            await this.setupXRSession();

            this.isARActive = true;
            this.preARControls.classList.add('hidden');
            this.arActiveControls.classList.remove('hidden');
            this.showStatus('Sesión AR activa', 'success');

        } catch (err) {
            console.error('Error starting AR:', err);
            this.showStatus('Error al iniciar AR: ' + err.message, 'error');
        }
    }

    setupThreeJS() {
        const canvas = document.getElementById('ar-canvas');

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            preserveDrawingBuffer: true,
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;

        // Lighting
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        this.scene.add(light);
    }

    async setupXRSession() {
        // Set XR session on renderer
        await this.renderer.xr.setSession(this.xrSession);

        // Get reference space
        this.xrRefSpace = await this.xrSession.requestReferenceSpace('local');

        // Setup hit test
        const viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
        this.xrHitTestSource = await this.xrSession.requestHitTestSource({ space: viewerSpace });

        // Create reticle for hit testing (invisible in scene, we use CSS overlay)
        this.reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.reticle = new THREE.Mesh(this.reticleGeometry, reticleMaterial);
        this.reticle.visible = false;
        this.reticle.matrixAutoUpdate = false;
        this.scene.add(this.reticle);

        // Start render loop
        this.renderer.setAnimationLoop((timestamp, frame) => this.onXRFrame(timestamp, frame));

        // Handle session end
        this.xrSession.addEventListener('end', () => {
            this.onSessionEnd();
        });
    }

    onXRFrame(timestamp, frame) {
        if (!frame) return;

        const pose = frame.getViewerPose(this.xrRefSpace);
        if (!pose) return;

        // Hit test
        if (this.xrHitTestSource && !this.isTargetSet) {
            const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const hitPose = hit.getPose(this.xrRefSpace);

                if (hitPose) {
                    this.reticle.visible = true;
                    this.reticle.matrix.fromArray(hitPose.transform.matrix);
                }
            } else {
                this.reticle.visible = false;
            }
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    setTarget() {
        if (!this.reticle.visible) {
            alert('Apunta a una superficie antes de marcar el objetivo');
            return;
        }

        // Store target position and rotation
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Quaternion();

        this.reticle.matrix.decompose(
            this.targetPosition,
            this.targetRotation,
            new THREE.Vector3()
        );

        // Create visual marker for target
        const targetGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.01, 32);
        const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
        targetMesh.position.copy(this.targetPosition);
        targetMesh.quaternion.copy(this.targetRotation);
        this.scene.add(targetMesh);

        // Create left and right boundary markers (10 yards each side)
        this.createBoundaryMarkers();

        // Update UI
        this.isTargetSet = true;
        this.markShotBtn.disabled = false;
        this.setTargetBtn.disabled = true;
        this.targetMarker.classList.remove('hidden');
        this.leftLine.classList.remove('hidden');
        this.rightLine.classList.remove('hidden');

        this.showStatus('Objetivo marcado. Ahora puedes marcar tus tiros.', 'success');
    }

    createBoundaryMarkers() {
        // Calculate left and right positions (10 yards from target)
        // We need to calculate perpendicular to the forward direction

        // Get forward direction from target rotation
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.targetRotation);

        // Get right direction (perpendicular)
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // Create left marker (10 yards to the left)
        const leftPosition = this.targetPosition.clone().add(
            right.clone().multiplyScalar(-this.DEVIATION_DISTANCE_METERS)
        );
        this.createLineMesh(leftPosition, 0xffff00);

        // Create right marker (10 yards to the right)
        const rightPosition = this.targetPosition.clone().add(
            right.clone().multiplyScalar(this.DEVIATION_DISTANCE_METERS)
        );
        this.createLineMesh(rightPosition, 0xffff00);

        // Store right vector for later calculations
        this.rightVector = right;
    }

    createLineMesh(position, color) {
        const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 16);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: color });
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        lineMesh.position.copy(position);
        lineMesh.position.y += 1; // Raise it up so it's visible
        this.scene.add(lineMesh);
    }

    markShot() {
        if (!this.isTargetSet) {
            alert('Primero debes marcar el objetivo');
            return;
        }

        if (!this.reticle.visible) {
            alert('Apunta a donde cayó la bola');
            return;
        }

        // Get shot position
        const shotPosition = new THREE.Vector3();
        const shotRotation = new THREE.Quaternion();
        this.reticle.matrix.decompose(shotPosition, shotRotation, new THREE.Vector3());

        // Calculate deviation
        const deviation = this.calculateDeviation(shotPosition);

        // Create visual marker for shot
        const shotGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const shotMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff });
        const shotMesh = new THREE.Mesh(shotGeometry, shotMaterial);
        shotMesh.position.copy(shotPosition);
        this.scene.add(shotMesh);

        // Record shot
        this.shots.push({
            position: shotPosition,
            deviation: deviation.yards,
            direction: deviation.direction,
            timestamp: new Date()
        });

        // Update UI
        this.updateShotHistory();
        this.displayMeasurement(deviation);

        this.showStatus(`Tiro ${this.shots.length} registrado`, 'success');
    }

    calculateDeviation(shotPosition) {
        // Calculate vector from target to shot
        const toShot = new THREE.Vector3().subVectors(shotPosition, this.targetPosition);

        // Project onto the right vector to get lateral deviation
        const lateralDeviation = toShot.dot(this.rightVector);

        // Convert to yards
        const deviationYards = Math.abs(lateralDeviation / this.YARDS_TO_METERS);

        // Determine direction
        let direction = 'Centro';
        if (Math.abs(lateralDeviation) > 0.5) { // More than 0.5 meters
            direction = lateralDeviation > 0 ? 'Derecha' : 'Izquierda';
        }

        return {
            yards: deviationYards,
            direction: direction,
            rawMeters: lateralDeviation
        };
    }

    displayMeasurement(deviation) {
        const deviationValue = document.getElementById('deviation-value');
        const directionValue = document.getElementById('direction-value');

        deviationValue.textContent = deviation.yards.toFixed(1);
        directionValue.textContent = deviation.direction;

        // Color code direction
        if (deviation.direction === 'Izquierda') {
            directionValue.style.color = '#c62828';
        } else if (deviation.direction === 'Derecha') {
            directionValue.style.color = '#1565c0';
        } else {
            directionValue.style.color = '#2e7d32';
        }

        this.measurementDisplay.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.measurementDisplay.classList.add('hidden');
        }, 5000);
    }

    updateShotHistory() {
        this.shotHistory.classList.remove('hidden');
        this.shotsList.innerHTML = '';

        this.shots.forEach((shot, index) => {
            const shotItem = document.createElement('div');
            shotItem.className = 'shot-item';

            const directionClass = shot.direction === 'Izquierda' ? 'left' :
                                   shot.direction === 'Derecha' ? 'right' : 'center';

            shotItem.innerHTML = `
                <div class="shot-number">Tiro #${index + 1}</div>
                <div class="shot-data">
                    <div class="deviation">${shot.deviation.toFixed(1)} yardas</div>
                    <div class="direction ${directionClass}">${shot.direction}</div>
                </div>
            `;

            this.shotsList.appendChild(shotItem);
        });

        // Update stats
        if (this.shots.length > 0) {
            this.updateStats();
        }
    }

    updateStats() {
        const totalShots = this.shots.length;
        const avgDeviation = this.shots.reduce((sum, shot) => sum + shot.deviation, 0) / totalShots;
        const bestShot = Math.min(...this.shots.map(shot => shot.deviation));

        document.getElementById('total-shots').textContent = totalShots;
        document.getElementById('avg-deviation').textContent = avgDeviation.toFixed(1);
        document.getElementById('best-shot').textContent = bestShot.toFixed(1);

        this.statsSummary.classList.remove('hidden');
    }

    reset() {
        // Clear target
        this.isTargetSet = false;
        this.targetPosition = null;
        this.targetRotation = null;
        this.rightVector = null;

        // Clear shots
        this.shots = [];

        // Clear 3D objects (except reticle)
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object.type === 'Mesh' && object !== this.reticle) {
                objectsToRemove.push(object);
            }
        });
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });

        // Reset UI
        this.setTargetBtn.disabled = false;
        this.markShotBtn.disabled = true;
        this.targetMarker.classList.add('hidden');
        this.leftLine.classList.add('hidden');
        this.rightLine.classList.add('hidden');
        this.shotMarker.classList.add('hidden');
        this.measurementDisplay.classList.add('hidden');
        this.shotHistory.classList.add('hidden');
        this.statsSummary.classList.add('hidden');

        this.showStatus('Sesión reiniciada', 'info');
    }

    async stopAR() {
        if (this.xrSession) {
            await this.xrSession.end();
        }
    }

    onSessionEnd() {
        this.isARActive = false;
        this.xrSession = null;
        this.xrRefSpace = null;
        this.xrHitTestSource = null;

        // Clean up Three.js
        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
        }

        // Reset UI
        this.preARControls.classList.remove('hidden');
        this.arActiveControls.classList.add('hidden');
        this.showStatus('Sesión AR terminada', 'info');
    }

    showStatus(message, type = 'info') {
        this.arStatus.textContent = message;
        this.arStatus.className = 'status-message ' + type;
        this.arStatus.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.arStatus.classList.add('hidden');
        }, 5000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new DecadeGolfAR();
    console.log('Decade Golf AR App initialized');
});
