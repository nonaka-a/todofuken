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

    const isDiscovered = (playerStats.excavationRates[activePrefecture.id] || 0) > 0;
    document.getElementById('target-prefecture-name').innerText = isDiscovered ? activePrefecture.name : '？？？';

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
    topCanvas.ontouchstart = event => { handleTouch(event, 'mousedown'); };
    topCanvas.ontouchmove = event => { handleTouch(event, 'mousemove'); };
    topCanvas.ontouchend = event => { event.preventDefault(); handleEnd(); };
    topCanvas.ontouchcancel = event => { event.preventDefault(); handleEnd(); };
    topCanvas.ontouchcancel = event => { event.preventDefault(); handleEnd(); };

    if (excavationTimer) clearInterval(excavationTimer);
    startFragmentAnimationLoop();
}

function handleTouch(event, type) {
    event.preventDefault();
    const touch = event.touches[0] || (event.changedTouches ? event.changedTouches[0] : null);
    if (!touch) {
        handleEnd();
        return;
    }
    topCanvas.dispatchEvent(new MouseEvent(type, {
        clientX: touch.clientX,
        clientY: touch.clientY
    }));
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
        playHammerSound();
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

function confirmAbort() {
    if (confirm("はっくつをやめてもどりますか？")) {
        clearInterval(excavationTimer);
        if (fragmentAnimFrame) cancelAnimationFrame(fragmentAnimFrame);
        returnToMuseum();
    }
}

function finishExcavation() {
    clearInterval(excavationTimer);
    if (fragmentAnimFrame) cancelAnimationFrame(fragmentAnimFrame);

    if (fragmentCtx) {
        fragmentCtx.clearRect(0, 0, fragmentCanvas.width, fragmentCanvas.height);
    }

    excavationScore = calculateExcavationScore();
    updateScoreDisplay();

    const score = excavationScore;
    const reward = Math.round(score * 2.5);
    const previousScore = playerStats.excavationRates[activePrefecture.id] || 0;
    const isFirstTime = previousScore === 0;

    if (score > previousScore) {
        playerStats.excavationRates[activePrefecture.id] = score;
    }

    const resultImgData = captureExcavationResult();
    playerStats.excavationCounts[activePrefecture.id] = (playerStats.excavationCounts[activePrefecture.id] || 0) + 1;
    playerStats.excavationImages[activePrefecture.id] = resultImgData;

    playerStats.gold += reward;
    saveGame();

    document.getElementById('result-first-tag').style.display = isFirstTime ? 'block' : 'none';
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

    // 初発掘（獲得回数が1回目）かつスコア40%以上なら、パズルミニゲームを優先起動
    const count = activePrefecture ? (playerStats.excavationCounts[activePrefecture.id] || 0) : 0;
    const isFirstPlacement = activePrefecture && count === 1 && excavationScore >= 40;

    if (isFirstPlacement) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById('museum-screen').classList.add('active');
        updateUI();
        checkAndStartPlacement(activePrefecture.id, excavationScore);
    } else {
        returnToMuseum();
    }
}

function returnToMuseum() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('museum-screen').classList.add('active');
    renderJapanMap();
    updateUI();
}