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

        // Capture current frame
        this.captureFrame();

        // Calculate screen positions
        const rect = this.arContainer.getBoundingClientRect();
        const centerX = rect.width / 2;

        // Calculate 10 yards in pixels
        const fovDegrees = 30;
        const fovRadians = (fovDegrees * Math.PI) / 180;
        const widthAtDistance = 2 * this.distanceToTarget * Math.tan(fovRadians / 2);
        const pixelsPerYard = rect.width / widthAtDistance;
        const tenYardsInPixels = 10 * pixelsPerYard;

        // Draw vertical reference lines
        this.drawReferenceLines(centerX, tenYardsInPixels);

        this.isTargetSet = true;
        this.setTargetBtn.disabled = true;
        this.showStatus(`✓ Foto capturada - Referencias marcadas\n(Centro rojo, ±10 yardas amarillas)`, 'success');
    }

    captureFrame() {
        // Create canvas to capture video frame
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

        // Stop video
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Replace video with captured image
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.9);
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        `;

        this.video.style.display = 'none';
        this.arContainer.insertBefore(img, this.arCanvas);

        console.log('Frame captured and frozen');
    }

    drawReferenceLines(centerX, distance) {
        const leftX = centerX - distance;
        const rightX = centerX + distance;

        // Center line (red)
        this.createVerticalLine(centerX, '#ff0000', 'CENTRO\nTARGET', 6);

        // Left line (-10 yards)
        this.createVerticalLine(leftX, '#ffeb3b', 'IZQUIERDA\n-10 yds', 4);

        // Right line (+10 yards)
        this.createVerticalLine(rightX, '#ffeb3b', 'DERECHA\n+10 yds', 4);
    }

    createVerticalLine(x, color, label, width = 4) {
        const line = document.createElement('div');
        line.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: 0;
            transform: translateX(-50%);
            width: ${width}px;
            height: 100%;
            background: ${color};
            box-shadow: 0 0 15px ${color};
            pointer-events: none;
            z-index: 100;
        `;

        // Add label at top
        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: ${color};
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            white-space: pre;
            text-align: center;
            line-height: 1.4;
            border: 2px solid ${color};
        `;
        line.appendChild(labelEl);

        this.arOverlay.appendChild(line);
    }


    reset() {
        // Remove captured image if exists
        const img = this.arContainer.querySelector('img');
        if (img) {
            img.remove();
        }

        // Remove all created lines
        const lines = this.arOverlay.querySelectorAll('div:not(#reticle):not(#target-marker):not(#left-line):not(#right-line):not(#shot-marker):not(#measurement-display)');
        lines.forEach(el => el.remove());

        // Clear markers
        this.targetMarker.innerHTML = '';
        this.targetMarker.classList.add('hidden');

        // Restart camera
        this.isTargetSet = false;
        this.setTargetBtn.disabled = false;

        // Reopen camera
        if (this.video) {
            this.video.style.display = 'block';
            this.startCamera();
        }

        this.showStatus('🔄 Listo para nueva foto', 'info');
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
