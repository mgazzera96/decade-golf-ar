// Decade Golf AR Training App - iOS Compatible Version
// Uses camera + manual distance input instead of WebXR

class DecadeGolfARiOS {
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
        this.arContainer = document.getElementById('ar-container');
        this.arCanvas = document.getElementById('ar-canvas');

        // Video elements
        this.video = null;
        this.stream = null;

        // Application State
        this.targetX = null;
        this.targetY = null;
        this.shots = [];
        this.isARActive = false;
        this.isTargetSet = false;
        this.distanceToTarget = 0;

        // Constants
        this.YARDS_TO_METERS = 0.9144;
        this.DEVIATION_DISTANCE_YARDS = 10;

        this.init();
    }

    init() {
        this.checkCameraSupport();
        this.setupEventListeners();
    }

    checkCameraSupport() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            this.startBtn.disabled = false;
            this.showStatus('Cámara disponible - Versión iOS', 'success');
        } else {
            this.showStatus('Cámara no disponible', 'error');
            this.startBtn.disabled = true;
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.setTargetBtn.addEventListener('click', () => this.setTarget());
        this.markShotBtn.addEventListener('click', () => this.markShot());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    async startCamera() {
        try {
            this.showStatus('Iniciando cámara...', 'info');

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            // Create video element
            this.video = document.createElement('video');
            this.video.setAttribute('playsinline', '');
            this.video.setAttribute('autoplay', '');
            this.video.setAttribute('muted', '');
            this.video.style.width = '100%';
            this.video.style.height = '100%';
            this.video.style.objectFit = 'cover';

            // Replace canvas with video
            this.arCanvas.style.display = 'none';
            this.arContainer.insertBefore(this.video, this.arCanvas);

            this.video.srcObject = this.stream;
            await this.video.play();

            this.isARActive = true;
            this.preARControls.classList.add('hidden');
            this.arActiveControls.classList.remove('hidden');
            this.showStatus('Cámara activa', 'success');

        } catch (err) {
            console.error('Error al acceder a la cámara:', err);
            this.showStatus('Error al acceder a la cámara: ' + err.message, 'error');
        }
    }

    setTarget() {
        // Ask for distance to target
        const distanceInput = prompt(
            'Ingresa la distancia aproximada al objetivo en yardas:\n\n' +
            '(Esto ayuda a calcular las desviaciones laterales)',
            '100'
        );

        if (!distanceInput) {
            this.showStatus('Debes ingresar la distancia para continuar', 'error');
            return;
        }

        this.distanceToTarget = parseFloat(distanceInput);

        if (isNaN(this.distanceToTarget) || this.distanceToTarget <= 0) {
            this.showStatus('Distancia inválida', 'error');
            return;
        }

        // Get container dimensions
        const rect = this.arContainer.getBoundingClientRect();

        // Set target at center of screen
        this.targetX = rect.width / 2;
        this.targetY = rect.height / 2;

        // Create visual marker
        this.targetMarker.style.left = this.targetX + 'px';
        this.targetMarker.style.top = this.targetY + 'px';
        this.targetMarker.classList.remove('hidden');

        // Calculate pixel-to-yard ratio at target distance
        // Assume 30° field of view (typical for mobile cameras)
        const fovRadians = (30 * Math.PI) / 180;
        const widthAtDistance = 2 * this.distanceToTarget * Math.tan(fovRadians / 2);
        this.pixelsPerYard = rect.width / widthAtDistance;

        this.isTargetSet = true;
        this.markShotBtn.disabled = false;
        this.setTargetBtn.disabled = true;

        this.showStatus(
            `Objetivo marcado a ${this.distanceToTarget} yardas\n` +
            'Toca la pantalla donde cayó cada tiro',
            'success'
        );

        // Enable touch/click on container to mark shots
        this.enableShotMarking();
    }

    enableShotMarking() {
        this.arContainer.style.cursor = 'crosshair';

        const handleTouch = (e) => {
            if (!this.isTargetSet) return;

            e.preventDefault();
            const rect = this.arContainer.getBoundingClientRect();
            let x, y;

            if (e.type === 'touchend') {
                const touch = e.changedTouches[0];
                x = touch.clientX - rect.left;
                y = touch.clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }

            this.recordShot(x, y);
        };

        this.arContainer.addEventListener('click', handleTouch);
        this.arContainer.addEventListener('touchend', handleTouch);
    }

    markShot() {
        if (!this.isTargetSet) {
            alert('Primero debes marcar el objetivo');
            return;
        }

        this.showStatus('Toca la pantalla donde cayó la bola', 'info');
    }

    recordShot(shotX, shotY) {
        // Calculate horizontal deviation in pixels
        const pixelDeviation = shotX - this.targetX;

        // Convert to yards using calculated ratio
        const yardDeviation = Math.abs(pixelDeviation / this.pixelsPerYard);

        // Determine direction
        let direction = 'Centro';
        if (Math.abs(yardDeviation) > 1) {
            direction = pixelDeviation > 0 ? 'Derecha' : 'Izquierda';
        }

        // Create shot marker
        const shotMarker = document.createElement('div');
        shotMarker.className = 'shot-marker-point';
        shotMarker.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            background: #0066ff;
            border: 2px solid white;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            left: ${shotX}px;
            top: ${shotY}px;
            box-shadow: 0 0 10px rgba(0, 102, 255, 0.8);
            pointer-events: none;
            z-index: 100;
        `;
        document.getElementById('ar-overlay').appendChild(shotMarker);

        // Record shot
        this.shots.push({
            x: shotX,
            y: shotY,
            deviation: yardDeviation,
            direction: direction,
            timestamp: new Date()
        });

        // Update UI
        this.updateShotHistory();
        this.displayMeasurement({ yards: yardDeviation, direction: direction });

        this.showStatus(`Tiro ${this.shots.length} registrado: ${yardDeviation.toFixed(1)} yardas ${direction}`, 'success');
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
        this.targetX = null;
        this.targetY = null;
        this.distanceToTarget = 0;

        // Clear shots
        this.shots = [];

        // Remove shot markers
        const markers = document.querySelectorAll('.shot-marker-point');
        markers.forEach(marker => marker.remove());

        // Reset UI
        this.setTargetBtn.disabled = false;
        this.markShotBtn.disabled = true;
        this.targetMarker.classList.add('hidden');
        this.measurementDisplay.classList.add('hidden');
        this.shotHistory.classList.add('hidden');
        this.statsSummary.classList.add('hidden');

        this.showStatus('Sesión reiniciada', 'info');
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        if (this.video) {
            this.video.remove();
            this.video = null;
        }

        this.arCanvas.style.display = 'block';
        this.isARActive = false;
        this.preARControls.classList.remove('hidden');
        this.arActiveControls.classList.add('hidden');
        this.showStatus('Cámara detenida', 'info');
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

// Initialize iOS version
document.addEventListener('DOMContentLoaded', () => {
    const app = new DecadeGolfARiOS();
    console.log('Decade Golf AR iOS App initialized');
});
