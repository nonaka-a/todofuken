function setupGameCanvases() {
    const canvasWidth = underCanvas.width;
    const canvasHeight = underCanvas.height;

    fossilReady = false;
    underCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    topCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    fragmentCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    targetMaskCanvas = document.createElement('canvas');
    targetMaskCanvas.width = canvasWidth;
    targetMaskCanvas.height = canvasHeight;
    targetMaskCtx = targetMaskCanvas.getContext('2d', { willReadFrequently: true });

    outlineMaskCanvas = document.createElement('canvas');
    outlineMaskCanvas.width = canvasWidth;
    outlineMaskCanvas.height = canvasHeight;
    outlineMaskCtx = outlineMaskCanvas.getContext('2d', { willReadFrequently: true });

    fossilLayerCanvas = document.createElement('canvas');
    fossilLayerCanvas.width = canvasWidth;
    fossilLayerCanvas.height = canvasHeight;
    fossilLayerCtx = fossilLayerCanvas.getContext('2d');

    damageMaskCanvas = document.createElement('canvas');
    damageMaskCanvas.width = canvasWidth;
    damageMaskCanvas.height = canvasHeight;
    damageMaskCtx = damageMaskCanvas.getContext('2d', { willReadFrequently: true });

    const image = new Image();
    image.src = `image/parts/${activePrefecture.id}.png`;
    image.onload = () => {
        const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height) * 0.75;
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const drawX = (canvasWidth - drawWidth) / 2;
        const drawY = (canvasHeight - drawHeight) / 2;

        targetMaskCtx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        fossilLayerCtx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        
        outlineMaskCtx.save();
        outlineMaskCtx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        outlineMaskCtx.globalCompositeOperation = 'source-over';
        outlineMaskCtx.lineWidth = 35;
        outlineMaskCtx.strokeStyle = '#ffffff';
        outlineMaskCtx.stroke();
        outlineMaskCtx.globalCompositeOperation = 'destination-out';
        outlineMaskCtx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        outlineMaskCtx.restore();

        targetMaskData = targetMaskCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
        outlineMaskData = outlineMaskCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
        targetBounds = calculateTargetBounds(drawX, drawY, drawWidth, drawHeight);

        drawUnderground();
        drawRock();
        countInitialRockPixels();
        fossilReady = true;
        startExcavationTimer();
    };
}

function drawUnderground() {
    const canvasWidth = underCanvas.width;
    const canvasHeight = underCanvas.height;

    underCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    const bgImage = new Image();
    bgImage.src = 'image/BG3.jpg';
    bgImage.onload = () => {
        underCtx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

        underCtx.save();
        underCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        underCtx.shadowBlur = 6;
        underCtx.shadowOffsetY = 3;
        underCtx.globalAlpha = 1.0;
        underCtx.drawImage(fossilLayerCanvas, 0, 0);
        underCtx.restore();
    };

    if (bgImage.complete) {
        bgImage.onload();
    }
}

function drawRock() {
    const canvasWidth = topCanvas.width;
    const canvasHeight = topCanvas.height;

    topCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    const centerX = targetBounds ? targetBounds.centerX : canvasWidth / 2;
    const centerY = targetBounds ? targetBounds.centerY : canvasHeight / 2;
    const baseRadius = targetBounds ? targetBounds.radius + 50 : 180;

    topCtx.save();
    topCtx.beginPath();
    const pointsCount = 36;
    for (let i = 0; i < pointsCount; i++) {
        const angle = (Math.PI * 2 * i) / pointsCount;
        const radiusNoise = (Math.random() - 0.5) * 35;
        const rx = (baseRadius * 1.25 + radiusNoise) * Math.cos(angle);
        const ry = (baseRadius * 0.95 + radiusNoise) * Math.sin(angle);
        const px = centerX + rx;
        const py = centerY + ry;

        if (i === 0) topCtx.moveTo(px, py);
        else topCtx.lineTo(px, py);
    }
    topCtx.closePath();

    const rockGradient = topCtx.createRadialGradient(
        centerX - 40, centerY - 40, 20,
        centerX, centerY, baseRadius * 1.4
    );
    rockGradient.addColorStop(0, '#544e45');
    rockGradient.addColorStop(0.6, '#3e3933');
    rockGradient.addColorStop(1, '#23201d');
    
    topCtx.fillStyle = rockGradient;
    topCtx.fill();
    topCtx.clip();

    for (let index = 0; index < 1500; index++) {
        const x = centerX + (Math.random() - 0.5) * baseRadius * 2.8;
        const y = centerY + (Math.random() - 0.5) * baseRadius * 2.4;
        const size = 1 + Math.random() * 2.5;
        topCtx.fillStyle = Math.random() > 0.5 ? 'rgba(15, 14, 13, 0.4)' : 'rgba(210, 198, 170, 0.22)';
        topCtx.fillRect(x, y, size, size);
    }

    topCtx.lineWidth = 1;
    for (let index = 0; index < 90; index++) {
        const x = centerX + (Math.random() - 0.5) * baseRadius * 2.5;
        const y = centerY + (Math.random() - 0.5) * baseRadius * 2.2;
        topCtx.strokeStyle = 'rgba(20, 19, 17, 0.45)';
        topCtx.beginPath();
        topCtx.moveTo(x, y);
        topCtx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 22);
        topCtx.stroke();
    }

    topCtx.restore();
}

function startFragmentAnimationLoop() {
    const render = (now) => {
        fragmentCtx.clearRect(0, 0, fragmentCanvas.width, fragmentCanvas.height);

        if (fossilReady && targetMaskCanvas) {
            fragmentCtx.save();
            fragmentCtx.globalAlpha = 1.0; 

            const guideTemp = document.createElement('canvas');
            guideTemp.width = fragmentCanvas.width;
            guideTemp.height = fragmentCanvas.height;
            const guideCtx = guideTemp.getContext('2d');
            
            guideCtx.drawImage(targetMaskCanvas, 0, 0);
            guideCtx.globalCompositeOperation = 'source-in';
            guideCtx.fillStyle = '#ffffff';
            guideCtx.fillRect(0, 0, guideTemp.width, guideTemp.height);

            fragmentCtx.save();
            fragmentCtx.shadowColor = '#000000';
            fragmentCtx.shadowBlur = 4;
            fragmentCtx.setLineDash([12, 8]);
            fragmentCtx.lineWidth = 6;
            fragmentCtx.strokeStyle = '#ffffff';
            
            fragmentCtx.drawImage(outlineMaskCanvas, 0, 0);
            fragmentCtx.restore();

            fragmentCtx.restore();
        }

        fragmentAnimFrame = requestAnimationFrame(render);
    };
    fragmentAnimFrame = requestAnimationFrame(render);
}

function spawnHammerFragments(x, y, radius) {
    const container = document.getElementById('canvas-container');
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
        const frag = document.createElement('div');
        frag.className = 'hammer-fragment';
        frag.style.position = 'absolute';
        frag.style.backgroundColor = '#6d4c41';
        frag.style.border = '1px solid #3e2723';
        const size = 6 + Math.random() * 12;
        frag.style.width = `${size}px`;
        frag.style.height = `${size}px`;
        frag.style.left = `${x}px`;
        frag.style.top = `${y}px`;
        frag.style.transform = 'translate(-50%, -50%)';
        frag.style.pointerEvents = 'none';
        frag.style.zIndex = '15'; 

        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * radius;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist + 30; 

        frag.style.transition = 'transform 1s cubic-bezier(0.25, 1, 0.5, 1), opacity 1s ease-in';
        container.appendChild(frag);

        requestAnimationFrame(() => {
            frag.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${Math.random()*360}deg)`;
            frag.style.opacity = '0';
        });

        setTimeout(() => frag.remove(), 1000);
    }
}

function createDustParticles(x, y) {
    const now = Date.now();
    if (now - lastDustTime < 70) return;
    lastDustTime = now;

    const container = document.getElementById('canvas-container');
    for (let index = 0; index < 7; index++) {
        const particle = document.createElement('span');
        particle.className = 'dust-particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty('--dust-x', `${(Math.random() - 0.5) * 48}px`);
        particle.style.setProperty('--dust-y', `${-12 - Math.random() * 34}px`);
        particle.style.animationDelay = `${Math.random() * 0.08}s`;
        container.appendChild(particle);
        setTimeout(() => particle.remove(), 700);
    }
}

function showDamageEffect(x, y) {
    const container = document.getElementById('canvas-container');
    const pop = document.createElement('div');
    pop.className = 'damage-pop';
    pop.innerText = '欠けた！';
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    container.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
}

function captureExcavationResult() {
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = underCanvas.width;
    snapshotCanvas.height = underCanvas.height;
    const sCtx = snapshotCanvas.getContext('2d');

    sCtx.drawImage(fossilLayerCanvas, 0, 0);
    sCtx.drawImage(topCanvas, 0, 0);

    return snapshotCanvas.toDataURL('image/png');
}