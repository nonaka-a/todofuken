let activePrefecture = null;
let excavationTimer = null;
let secondsLeft = 30;
let activeTool = 'hammer';

let underCanvas, topCanvas, fragmentCanvas, underCtx, topCtx, fragmentCtx;
let targetMaskCanvas, targetMaskCtx, fossilLayerCanvas, fossilLayerCtx, damageMaskCanvas, damageMaskCtx;
let outlineMaskCanvas, outlineMaskCtx;
let targetMaskData = null;
let outlineMaskData = null;
let targetBounds = null;
let initialRockPixelCount = 0;
let isDrawing = false;
let fossilReady = false;
let excavationScore = 0;
let lastDustTime = 0;

let chiselStrikePoints = [];
let nextChiselStrikeId = 0;
let activeRockFragments = [];
let fragmentAnimFrame = null;

function startAreaExcavation(regionName) {
    closeAreaSelect();
    const prefs = PREFECTURE_DATA.filter(p => p.region === regionName);
    if (prefs.length === 0) {
        alert("この場所はまだ探せません。");
        return;
    }

    activePrefecture = prefs[Math.floor(Math.random() * prefs.length)];
    initExcavationGame();
}

function initExcavationGame() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('excavation-screen').classList.add('active');

    document.getElementById('target-prefecture-name').innerText = activePrefecture.name;
    excavationScore = 0;
    activeTool = 'hammer';
    lastDustTime = 0;
    chiselStrikePoints = [];
    nextChiselStrikeId = 0;
    activeRockFragments = [];
    if (fragmentAnimFrame) cancelAnimationFrame(fragmentAnimFrame);

    updateScoreDisplay();
    secondsLeft = 30;
    document.getElementById('timer-sec').innerText = secondsLeft;
    document.querySelectorAll('.damage-pop, .dust-particle, .hammer-fragment').forEach(element => element.remove());
    setTool('hammer');

    underCanvas = document.getElementById('under-canvas');
    topCanvas = document.getElementById('top-canvas');
    fragmentCanvas = document.getElementById('fragment-canvas');
    underCtx = underCanvas.getContext('2d');
    topCtx = topCanvas.getContext('2d', { willReadFrequently: true });
    fragmentCtx = fragmentCanvas.getContext('2d');

    setupGameCanvases();

    topCanvas.onmousedown = handleStart;
    topCanvas.onmousemove = handleMove;
    topCanvas.onmouseup = handleEnd;
    topCanvas.onmouseleave = handleEnd;
    topCanvas.ontouchstart = event => handleTouch(event, 'mousedown');
    topCanvas.ontouchmove = event => handleTouch(event, 'mousemove');
    topCanvas.ontouchend = handleEnd;

    if (excavationTimer) clearInterval(excavationTimer);
    startFragmentAnimationLoop();
}

function handleTouch(event, type) {
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    topCanvas.dispatchEvent(new MouseEvent(type, {
        clientX: touch.clientX,
        clientY: touch.clientY
    }));
}

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

function countInitialRockPixels() {
    const soilData = topCtx.getImageData(0, 0, topCanvas.width, topCanvas.height).data;
    let count = 0;
    const sampleStep = 4;
    for (let i = 3; i < soilData.length; i += 4 * sampleStep) {
        if (soilData[i] > 92) {
            count++;
        }
    }
    initialRockPixelCount = Math.max(1, count);
}

function calculateTargetBounds(x, y, w, h) {
    return {
        centerX: x + w / 2,
        centerY: y + h / 2,
        radius: Math.max(w, h) / 2
    };
}

function drawUnderground() {
    const canvasWidth = underCanvas.width;
    const canvasHeight = underCanvas.height;
    
    const ground = underCtx.createLinearGradient(0, 0, 0, canvasHeight);
    ground.addColorStop(0, '#8d6e63');
    ground.addColorStop(1, '#5d4037');

    underCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    underCtx.fillStyle = ground;
    underCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    underCtx.save();
    underCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    underCtx.shadowBlur = 6;
    underCtx.shadowOffsetY = 3;
    underCtx.globalAlpha = 1.0;
    underCtx.drawImage(fossilLayerCanvas, 0, 0);
    underCtx.restore();
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

function startExcavationTimer() {
    excavationTimer = setInterval(() => {
        secondsLeft--;
        document.getElementById('timer-sec').innerText = secondsLeft;
        if (secondsLeft <= 0) finishExcavation();
    }, 1000);
}

function setTool(tool) {
    activeTool = tool;
    const hammerBtn = document.getElementById('tool-hammer');
    if(hammerBtn) hammerBtn.classList.toggle('active', tool === 'hammer');
    document.getElementById('tool-brush').classList.toggle('active', tool === 'brush');
    document.getElementById('tool-chisel').classList.toggle('active', tool === 'chisel');
}

function handleStart(event) {
    isDrawing = true;
    scratch(event);
}

function handleMove(event) {
    if (!isDrawing) return;
    if (activeTool === 'hammer' || activeTool === 'chisel') return;
    scratch(event);
}

function handleEnd() {
    isDrawing = false;
}

function scratch(event) {
    if (!fossilReady) return;

    const point = getCanvasPoint(event);
    const brushLevel = playerStats.toolLevels.brush || 1;
    const chiselLevel = playerStats.toolLevels.chisel || 1;
    const hammerLevel = playerStats.toolLevels.hammer || 1;

    if (activeTool === 'hammer') {
        const radius = 50 + hammerLevel * 10;
        checkAreaDamageFossil(point.x, point.y, radius * 0.65);
        removeRockRandomShape(point.x, point.y, radius);
        spawnHammerFragments(point.x, point.y, radius);
    } else if (activeTool === 'chisel') {
        const radius = 6 + chiselLevel * 1.5;
        checkAreaDamageFossil(point.x, point.y, radius * 0.8);
        strikeRock(point.x, point.y, chiselLevel, radius);
    } else if (activeTool === 'brush') {
        removeRockIrregular(point.x, point.y, 22 + brushLevel * 4, Math.min(0.5, 0.28 + brushLevel * 0.06));
        createDustParticles(point.x, point.y);
    }

    excavationScore = calculateExcavationScore();
    updateScoreDisplay();
}

function checkAreaDamageFossil(centerX, centerY, checkRadius) {
    if (!targetMaskData) return;

    const startX = Math.max(0, Math.floor(centerX - checkRadius));
    const startY = Math.max(0, Math.floor(centerY - checkRadius));
    const endX = Math.min(topCanvas.width - 1, Math.ceil(centerX + checkRadius));
    const endY = Math.min(topCanvas.height - 1, Math.ceil(centerY + checkRadius));
    const step = 4;

    let hasTargetInArea = false;
    let hitX = centerX;
    let hitY = centerY;

    for (let y = startY; y <= endY; y += step) {
        for (let x = startX; x <= endX; x += step) {
            const dist = Math.hypot(x - centerX, y - centerY);
            if (dist <= checkRadius && isTargetPixel(x, y)) {
                hasTargetInArea = true;
                hitX = x;
                hitY = y;
                break;
            }
        }
        if (hasTargetInArea) break;
    }

    if (hasTargetInArea) {
        damageFossil(hitX, hitY, checkRadius * 0.5);
    }
}

function cleanupTopAlpha(x, y, radius) {
    const margin = radius + 8;
    const startX = Math.max(0, Math.floor(x - margin));
    const startY = Math.max(0, Math.floor(y - margin));
    const width = Math.min(topCanvas.width - startX, Math.ceil(margin * 2));
    const height = Math.min(topCanvas.height - startY, Math.ceil(margin * 2));

    if (width <= 0 || height <= 0) return;

    const imgData = topCtx.getImageData(startX, startY, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 255) {
            data[i + 3] = 0;
        }
    }
    topCtx.putImageData(imgData, startX, startY);
}

function removeRockRandomShape(centerX, centerY, baseRadius) {
    topCtx.save();
    topCtx.globalCompositeOperation = 'destination-out';
    topCtx.globalAlpha = 1.0; 
    topCtx.beginPath();
    
    const pointsCount = 6 + Math.floor(Math.random() * 7);
    const startAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < pointsCount; i++) {
        const angle = startAngle + (Math.PI * 2 * i) / pointsCount + (Math.random() - 0.5) * 0.3;
        const randomFactor = 0.4 + Math.random() * 0.8;
        const r = baseRadius * randomFactor;
        const px = centerX + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        if (i === 0) topCtx.moveTo(px, py);
        else topCtx.lineTo(px, py);
    }
    topCtx.closePath();
    topCtx.fill();
    topCtx.restore();

    cleanupTopAlpha(centerX, centerY, baseRadius * 1.3);
}

function removeRockSnap(centerX, centerY, baseRadius) {
    topCtx.save();
    topCtx.globalCompositeOperation = 'destination-out';
    topCtx.globalAlpha = 1.0; 
    topCtx.beginPath();
    
    const pointsCount = 8;
    for (let i = 0; i < pointsCount; i++) {
        const angle = (Math.PI * 2 * i) / pointsCount;
        const px = centerX + Math.cos(angle) * baseRadius;
        const py = centerY + Math.sin(angle) * baseRadius;
        if (i === 0) topCtx.moveTo(px, py);
        else topCtx.lineTo(px, py);
    }
    topCtx.closePath();
    topCtx.fill();
    topCtx.restore();

    cleanupTopAlpha(centerX, centerY, baseRadius);
}

function removeRockIrregular(centerX, centerY, baseRadius, opacity) {
    topCtx.save();
    topCtx.globalCompositeOperation = 'destination-out';
    topCtx.globalAlpha = opacity;
    topCtx.beginPath();
    const pointsCount = 8;
    for (let i = 0; i < pointsCount; i++) {
        const angle = (Math.PI * 2 * i) / pointsCount;
        const randomFactor = 0.75 + Math.random() * 0.3;
        const r = baseRadius * randomFactor;
        const px = centerX + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        if (i === 0) topCtx.moveTo(px, py);
        else topCtx.lineTo(px, py);
    }
    topCtx.closePath();
    topCtx.fill();
    topCtx.restore();
}

function strikeRock(x, y, chiselLevel, radius) {
    const strikePoint = { id: nextChiselStrikeId++, x, y };
    const nearestPoint = findNearbyStrikePoint(strikePoint, 78 + chiselLevel * 3);
    
    if (nearestPoint) {
        drawConnectedCrack(nearestPoint, strikePoint, chiselLevel);
    } else {
        drawImpactCrack(x, y);
    }

    chiselStrikePoints.push(strikePoint);
    if (chiselStrikePoints.length > 70) chiselStrikePoints.shift();

    removeRockSnap(x, y, radius);
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

function findNearbyStrikePoint(strikePoint, maxDistance) {
    let nearestPoint = null;
    let nearestDistance = maxDistance;

    chiselStrikePoints.forEach(point => {
        const distance = Math.hypot(point.x - strikePoint.x, point.y - strikePoint.y);
        if (distance > 18 && distance < nearestDistance) {
            nearestPoint = point;
            nearestDistance = distance;
        }
    });

    return nearestPoint;
}

function drawImpactCrack(x, y) {
    topCtx.save();
    topCtx.globalCompositeOperation = 'destination-out';
    topCtx.globalAlpha = 1.0;
    topCtx.lineWidth = 3;
    topCtx.lineCap = 'round';
    topCtx.beginPath();
    topCtx.moveTo(x - 8, y + 5);
    topCtx.lineTo(x, y);
    topCtx.lineTo(x + 9, y - 6);
    topCtx.stroke();
    topCtx.restore();

    cleanupTopAlpha(x, y, 15);
}

function drawConnectedCrack(fromPoint, toPoint, chiselLevel) {
    const distance = Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
    const steps = Math.max(3, Math.ceil(distance / 18));
    const offsetX = toPoint.x - fromPoint.x;
    const offsetY = toPoint.y - fromPoint.y;
    const normalLength = Math.hypot(offsetX, offsetY);
    const normalX = -offsetY / normalLength;
    const normalY = offsetX / normalLength;
    const points = [fromPoint];

    for (let index = 1; index < steps; index++) {
        const progress = index / steps;
        const jaggedness = (Math.random() - 0.5) * (10 + chiselLevel * 2);
        points.push({
            x: fromPoint.x + offsetX * progress + normalX * jaggedness,
            y: fromPoint.y + offsetY * progress + normalY * jaggedness
        });
    }
    points.push(toPoint);

    topCtx.save();
    topCtx.globalCompositeOperation = 'destination-out';
    topCtx.globalAlpha = 1.0;
    topCtx.lineWidth = 3 + chiselLevel * 0.5;
    topCtx.lineCap = 'round';
    topCtx.lineJoin = 'round';
    topCtx.beginPath();
    topCtx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => topCtx.lineTo(point.x, point.y));
    topCtx.stroke();
    topCtx.restore();

    cleanupTopAlpha(toPoint.x, toPoint.y, distance + 10);
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

function getCanvasPoint(event) {
    const rect = topCanvas.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * topCanvas.width,
        y: ((event.clientY - rect.top) / rect.height) * topCanvas.height
    };
}

function isTargetPixel(x, y) {
    if (!targetMaskData) return false;
    const pixelX = Math.max(0, Math.min(targetMaskCanvas.width - 1, Math.floor(x)));
    const pixelY = Math.max(0, Math.min(targetMaskCanvas.height - 1, Math.floor(y)));
    const offset = (pixelY * targetMaskCanvas.width + pixelX) * 4;
    return targetMaskData[offset + 3] > 40;
}

function damageFossil(x, y, radius) {
    fossilLayerCtx.save();
    fossilLayerCtx.globalCompositeOperation = 'destination-out';
    fossilLayerCtx.beginPath();
    fossilLayerCtx.arc(x, y, radius, 0, Math.PI * 2);
    fossilLayerCtx.fill();
    fossilLayerCtx.restore();

    damageMaskCtx.beginPath();
    damageMaskCtx.arc(x, y, radius, 0, Math.PI * 2);
    damageMaskCtx.fillStyle = '#fff';
    damageMaskCtx.fill();

    drawUnderground();
    showDamageEffect(x, y);
}

function calculateExcavationScore() {
    if (!outlineMaskData || !targetMaskData || !targetBounds) return 0;

    const soilData = topCtx.getImageData(0, 0, topCanvas.width, topCanvas.height).data;
    const damageData = damageMaskCtx.getImageData(0, 0, damageMaskCanvas.width, damageMaskCanvas.height).data;
    const sampleStep = 4;

    let currentRockPixelCount = 0;
    let targetTotal = 0;
    let targetSurfaceCleared = 0;
    let damagedCount = 0;

    let outlineTotal = 0;
    let outlineCleared = 0;

    for (let y = 0; y < topCanvas.height; y += sampleStep) {
        for (let x = 0; x < topCanvas.width; x += sampleStep) {
            const offset = (y * topCanvas.width + x) * 4;
            const isTarget = targetMaskData[offset + 3] > 40;
            const isOutline = outlineMaskData[offset + 3] > 40;
            const isCleared = soilData[offset + 3] < 92;

            if (!isCleared) {
                currentRockPixelCount++;
            }

            if (isTarget) {
                targetTotal++;
                if (isCleared) targetSurfaceCleared++;
                if (damageData[offset + 3] > 30) damagedCount++;
            }

            if (isOutline) {
                outlineTotal++;
                if (isCleared) outlineCleared++;
            }
        }
    }

    const rockClearedRatio = Math.max(0, 1 - (currentRockPixelCount / initialRockPixelCount));
    const rockRemovalScore = rockClearedRatio * 40;

    const surfaceRatio = targetTotal > 0 ? targetSurfaceCleared / targetTotal : 0;
    const precisionRatio = outlineTotal > 0 ? outlineCleared / outlineTotal : 0;

    const surfaceScore = surfaceRatio * 30;
    const bonusScore = precisionRatio * 30;
    const rawScore = rockRemovalScore + surfaceScore + bonusScore;

    const damagePenalty = Math.max(0, 1 - (damagedCount / (targetTotal * 0.4)));
    
    const finalScore = Math.round(rawScore * damagePenalty);
    return Math.max(0, Math.min(100, finalScore));
}

function updateScoreDisplay() {
    document.getElementById('current-integrity').innerText = Math.round(excavationScore);
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

function confirmAbort() {
    if (confirm("はっくつをやめてもどりますか？")) {
        clearInterval(excavationTimer);
        if (fragmentAnimFrame) cancelAnimationFrame(fragmentAnimFrame);
        returnToMuseum();
    }
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

function finishExcavation() {
    clearInterval(excavationTimer);
    if (fragmentAnimFrame) cancelAnimationFrame(fragmentAnimFrame);

    // ガイド点線キャンバスをクリアして化石と岩をはっきり表示
    if (fragmentCtx) {
        fragmentCtx.clearRect(0, 0, fragmentCanvas.width, fragmentCanvas.height);
    }

    excavationScore = calculateExcavationScore();
    updateScoreDisplay();

    const score = excavationScore;
    const reward = Math.round(score * 2.5);
    const previousScore = playerStats.excavationRates[activePrefecture.id] || 0;
    
    if (score > previousScore) {
        playerStats.excavationRates[activePrefecture.id] = score;
    }

    const resultImgData = captureExcavationResult();
    playerStats.excavationCounts[activePrefecture.id] = (playerStats.excavationCounts[activePrefecture.id] || 0) + 1;
    playerStats.excavationImages[activePrefecture.id] = resultImgData;

    playerStats.gold += reward;
    saveGame();

    document.getElementById('result-fossil-img').src = resultImgData;
    document.getElementById('result-pref-display').innerText = `${activePrefecture.name}の化石`;
    document.getElementById('result-score').innerText = score;
    document.getElementById('result-reward-gold').innerText = reward;
    document.getElementById('result-message').innerText = score >= 80
        ? "見事に形を残して発掘できました！"
        : score >= 40
            ? "形は見えてきましたが、もう少し丁寧に掘れそうです。"
            : "土の取り方とパーツの形を見比べてみましょう。";

    document.getElementById('result-modal').style.display = 'flex';
}

function closeResult() {
    document.getElementById('result-modal').style.display = 'none';
    returnToMuseum();
}

function returnToMuseum() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('museum-screen').classList.add('active');
    renderJapanMap();
    updateUI();
}