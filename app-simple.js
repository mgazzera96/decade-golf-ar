// Decade Golf AR - Versión Simplificada
// Solo marca target y muestra zonas de 10 yardas

class DecadeGolfSimple {
    constructor() {
        // UI Elements
        this.startBtn = document.getElementById('start-ar-btn');
        this.stopBtn = document.getElementById('stop-ar-btn');
        this.setTargetBtn = document.getElementById('set-target-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.arStatus = document.getElementById('ar-status');
        this.preARControls = document.getElementById('pre-ar-controls');
        this.arActiveControls = document.getElementById('ar-active-controls');
        this.targetMarker = document.getElementById('target-marker');
        this.arContainer = document.getElementById('ar-container');
        this.arCanvas = document.getElementById('ar-canvas');
        this.arOverlay = document.getElementById('ar-overlay');

        // Hide unused elements
        document.getElementById('mark-shot-btn').style.display = 'none';
        document.getElementById('shot-history').style.display = 'none';
        document.getElementById('measurement-display').style.display = 'none';

        // Video elements
        this.video = null;
        this.stream = null;

        // Application State
        this.isTargetSet = false;
        this.distanceToTarget = 0;

        this.init();
    }

    init() {
        this.checkCameraSupport();
        this.setupEventListeners();
    }

    checkCameraSupport() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            this.startBtn.disabled = false;
            this.showStatus('✓ Cámara disponible', 'success');
        } else {
            this.showStatus('✗ Cámara no disponible', 'error');
            this.startBtn.disabled = true;
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.setTargetBtn.addEventListener('click', () => this.setTarget());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    async startCamera() {
        try {
            this.showStatus('📹 Iniciando cámara...', 'info');

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
            this.video.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            `;

            this.arCanvas.style.display = 'none';
            this.arContainer.insertBefore(this.video, this.arCanvas);

            this.video.srcObject = this.stream;
            await this.video.play();

            this.preARControls.classList.add('hidden');
            this.arActiveControls.classList.remove('hidden');
            this.showStatus('✓ Cámara activa - Toca "Marcar Objetivo"', 'success');

        } catch (err) {
            console.error('Camera error:', err);
            let errorMsg = '✗ Error: ';
            if (err.name === 'NotAllowedError') {
                errorMsg += 'Permite el acceso a la cámara';
            } else {
                errorMsg += err.message;
            }
            this.showStatus(errorMsg, 'error');
            alert(errorMsg);
        }
    }

    setTarget() {
        // Ask for distance
        const distance = prompt(
            'Distancia al objetivo (en yardas):\n\nEjemplo: 100, 150, 200',
            '100'
        );

        if (!distance) return;

        this.distanceToTarget = parseFloat(distance);

        if (isNaN(this.distanceToTarget) || this.distanceToTarget <= 0) {
            alert('Distancia inválida');
            return;
        }

        // Calculate screen positions
        const rect = this.arContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate 10 yards in pixels
        // Assume 30° FOV (typical for phone cameras)
        const fovDegrees = 30;
        const fovRadians = (fovDegrees * Math.PI) / 180;
        const widthAtDistance = 2 * this.distanceToTarget * Math.tan(fovRadians / 2);
        const pixelsPerYard = rect.width / widthAtDistance;
        const tenYardsInPixels = 10 * pixelsPerYard;

        // Create markers
        this.createCenterMarker(centerX, centerY);
        this.createBoundaryMarkers(centerX, centerY, tenYardsInPixels);

        this.isTargetSet = true;
        this.setTargetBtn.disabled = true;
        this.showStatus(`✓ Target a ${this.distanceToTarget} yardas\n(Líneas amarillas = ±10 yardas)`, 'success');
    }

    createCenterMarker(x, y) {
        // Center target (red)
        this.targetMarker.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            border: 4px solid #ff0000;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,0,0,0.3), transparent 70%);
            box-shadow: 0 0 20px rgba(255,0,0,0.8);
            pointer-events: none;
            z-index: 100;
        `;
        this.targetMarker.classList.remove('hidden');

        // Add crosshair
        const crosshair = document.createElement('div');
        crosshair.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            pointer-events: none;
        `;
        crosshair.innerHTML = `
            <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 2px; background: #ff0000; transform: translateY(-50%);"></div>
            <div style="position: absolute; left: 50%; top: 0; height: 100%; width: 2px; background: #ff0000; transform: translateX(-50%);"></div>
        `;
        this.targetMarker.appendChild(crosshair);
    }

    createBoundaryMarkers(centerX, centerY, distance) {
        const leftX = centerX - distance;
        const rightX = centerX + distance;

        // Left line (10 yards left)
        const leftLine = this.createLine(leftX, 'IZQUIERDA\n-10 yds');
        this.arOverlay.appendChild(leftLine);

        // Right line (10 yards right)
        const rightLine = this.createLine(rightX, 'DERECHA\n+10 yds');
        this.arOverlay.appendChild(rightLine);

        // Add visual reference lines
        this.createReferenceLine(leftX, '#ffeb3b');
        this.createReferenceLine(rightX, '#ffeb3b');
    }

    createLine(x, label) {
        const line = document.createElement('div');
        line.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: 20%;
            transform: translateX(-50%);
            width: 4px;
            height: 60%;
            background: linear-gradient(to bottom, transparent, #ffeb3b 20%, #ffeb3b 80%, transparent);
            box-shadow: 0 0 15px rgba(255,235,59,0.8);
            pointer-events: none;
            z-index: 99;
        `;

        // Add label
        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #ffeb3b;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: bold;
            white-space: pre;
            text-align: center;
            line-height: 1.3;
        `;
        line.appendChild(labelEl);

        return line;
    }

    createReferenceLine(x, color) {
        const refLine = document.createElement('div');
        refLine.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: 0;
            transform: translateX(-50%);
            width: 2px;
            height: 100%;
            background: ${color};
            opacity: 0.6;
            pointer-events: none;
            z-index: 98;
        `;
        this.arOverlay.appendChild(refLine);
    }

    reset() {
        // Clear markers
        this.targetMarker.innerHTML = '';
        this.targetMarker.classList.add('hidden');

        // Remove all created elements
        const toRemove = this.arOverlay.querySelectorAll('div:not(#reticle):not(#target-marker):not(#left-line):not(#right-line):not(#shot-marker):not(#measurement-display)');
        toRemove.forEach(el => el.remove());

        this.isTargetSet = false;
        this.setTargetBtn.disabled = false;
        this.showStatus('🔄 Listo para marcar nuevo objetivo', 'info');
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
        this.preARControls.classList.remove('hidden');
        this.arActiveControls.classList.add('hidden');
        this.reset();
        this.showStatus('⏹️ Cámara detenida', 'info');
    }

    showStatus(message, type = 'info') {
        if (!this.arStatus) return;

        this.arStatus.textContent = message;
        this.arStatus.className = 'status-message ' + type;
        this.arStatus.classList.remove('hidden');
        this.arStatus.style.display = 'block';

        // Keep messages visible longer
        setTimeout(() => {
            if (type !== 'success') {
                this.arStatus.classList.add('hidden');
            }
        }, 10000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const app = new DecadeGolfSimple();
    console.log('Decade Golf Simple initialized');
});
