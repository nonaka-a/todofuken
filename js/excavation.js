let activePrefecture = null;
let excavationTimer = null;
let secondsLeft = 60;
let activeTool = 'hammer';

let underCanvas, topCanvas, fragmentCanvas, underCtx, topCtx, fragmentCtx;
let targetMaskCanvas, targetMaskCtx, fossilLayerCanvas, fossilLayerCtx, damageMaskCanvas, damageMaskCtx;
let outlineMaskCanvas, outlineMaskCtx;
let targetMaskData = null;
let outlineMaskData = null;
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
    secondsLeft = 60;
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
        
        // 周囲採点用の「外周輪郭帯（Outline Zone）」の作成
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

        drawUnderground();
        drawRock();
        fossilReady = true;
        startExcavationTimer();
    };
}

function drawUnderground() {
    const canvasWidth = underCanvas.width;
    const canvasHeight = underCanvas.height;
    
    // 明るい岩盤色
    const ground = underCtx.createLinearGradient(0, 0, 0, canvasHeight);
    ground.addColorStop(0, '#8d6e63');
    ground.addColorStop(1, '#5d4037');

    underCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    underCtx.fillStyle = ground;
    underCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 化石パーツ本体を描画
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
    const rockGradient = topCtx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    rockGradient.addColorStop(0, '#544e45');
    rockGradient.addColorStop(0.5, '#3e3933');
    rockGradient.addColorStop(1, '#2b2723');
    topCtx.fillStyle = rockGradient;
    topCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let index = 0; index < 1250; index++) {
        const x = Math.random() * canvasWidth;
        const y = Math.random() * canvasHeight;
        const size = 1 + Math.random() * 2;
        topCtx.fillStyle = Math.random() > 0.5 ? 'rgba(20, 19, 18, 0.35)' : 'rgba(195, 185, 158, 0.2)';
        topCtx.fillRect(x, y, size, size);
    }

    topCtx.lineWidth = 1;
    for (let index = 0; index < 80; index++) {
        const x = Math.random() * canvasWidth;
        const y = Math.random() * canvasHeight;
        topCtx.strokeStyle = 'rgba(25, 24, 22, 0.4)';
        topCtx.beginPath();
        topCtx.moveTo(x, y);
        topCtx.lineTo(x + (Math.random() - 0.5) * 45, y + (Math.random() - 0.5) * 24);
        topCtx.stroke();
    }
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
    if (isDrawing) scratch(event);
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
        const radius = 25 + hammerLevel * 5;
        checkAndDamageFossil(point.x, point.y, radius * 0.7);
        removeRockSnap(point.x, point.y, radius);
        spawnHammerFragments(point.x, point.y, radius);
    } else if (activeTool === 'chisel') {
        const radius = 9 + chiselLevel * 2;
        checkAndDamageFossil(point.x, point.y, radius * 0.5);
        strikeRock(point.x, point.y, chiselLevel, radius);
    } else if (activeTool === 'brush') {
        removeRockIrregular(point.x, point.y, 22 + brushLevel * 4, Math.min(0.5, 0.28 + brushLevel * 0.06));
        createDustParticles(point.x, point.y);
    }

    excavationScore = calculateExcavationScore();
    updateScoreDisplay();
}

function checkAndDamageFossil(x, y, damageRadius) {
    if (!isTargetPixel(x, y)) return;

    const pixel = topCtx.getImageData(x, y, 1, 1).data;
    const isExposed = pixel[3] < 100;

    if (isExposed) {
        damageFossil(x, y, damageRadius);
    }
}

// ピクセルのアルファ二値化処理：少しでも半透明になったピクセルを即座に完全透明(0)に強制変更し、グラデーション層を完全撲滅
function cleanupTopAlpha(x, y, radius) {
    const margin = radius + 6;
    const startX = Math.max(0, Math.floor(x - margin));
    const startY = Math.max(0, Math.floor(y - margin));
    const width = Math.min(topCanvas.width - startX, Math.ceil(margin * 2));
    const height = Math.min(topCanvas.height - startY, Math.ceil(margin * 2));

    if (width <= 0 || height <= 0) return;

    const imgData = topCtx.getImageData(startX, startY, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 255) {
            data[i + 3] = 0; // 完全透明化
        }
    }
    topCtx.putImageData(imgData, startX, startY);
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

    // 削ったエリアの半透明ピクセルをすべて二値化して消去
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
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const frag = document.createElement('div');
        frag.className = 'hammer-fragment';
        frag.style.position = 'absolute';
        frag.style.backgroundColor = '#6d4c41';
        frag.style.border = '1px solid #3e2723';
        const size = 5 + Math.random() * 10;
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
        const ty = Math.sin(angle) * dist + 25; 

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
    topCtx.strokeStyle = 'rgba(20, 18, 17, 0.78)';
    topCtx.lineWidth = 1.5;
    topCtx.lineCap = 'round';
    topCtx.beginPath();
    topCtx.moveTo(x - 8, y + 5);
    topCtx.lineTo(x, y);
    topCtx.lineTo(x + 9, y - 6);
    topCtx.stroke();
    topCtx.restore();
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
    topCtx.lineCap = 'round';
    topCtx.lineJoin = 'round';
    topCtx.strokeStyle = 'rgba(14, 13, 12, 0.88)';
    topCtx.lineWidth = 3 + chiselLevel * 0.25;
    topCtx.beginPath();
    topCtx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => topCtx.lineTo(point.x, point.y));
    topCtx.stroke();

    topCtx.strokeStyle = 'rgba(194, 184, 160, 0.34)';
    topCtx.lineWidth = 1;
    topCtx.beginPath();
    topCtx.moveTo(points[0].x + 1, points[0].y + 1);
    points.slice(1).forEach(point => topCtx.lineTo(point.x + 1, point.y + 1));
    topCtx.stroke();
    topCtx.restore();
}

// 毎フレーム最前面に「ハッキリ見える黄色の点線枠ガイド」を描画
function startFragmentAnimationLoop() {
    const render = (now) => {
        fragmentCtx.clearRect(0, 0, fragmentCanvas.width, fragmentCanvas.height);

        if (fossilReady && targetMaskCanvas) {
            fragmentCtx.save();
            fragmentCtx.globalAlpha = 0.65; // くっきりと認識できる透過度
            
            const guideTemp = document.createElement('canvas');
            guideTemp.width = fragmentCanvas.width;
            guideTemp.height = fragmentCanvas.height;
            const guideCtx = guideTemp.getContext('2d');
            
            // 黄色の点線（ダッシュライン）でパーツの枠線をクッキリ描画
            guideCtx.drawImage(targetMaskCanvas, 0, 0);
            guideCtx.globalCompositeOperation = 'source-over';
            guideCtx.setLineDash([6, 4]);
            guideCtx.lineWidth = 2;
            guideCtx.strokeStyle = '#ffee58';
            guideCtx.stroke();
            guideCtx.globalCompositeOperation = 'destination-out';
            guideCtx.drawImage(targetMaskCanvas, 0, 0);

            fragmentCtx.drawImage(guideTemp, 0, 0);
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
    if (!outlineMaskData || !targetMaskData) return 0;

    const soilData = topCtx.getImageData(0, 0, topCanvas.width, topCanvas.height).data;
    const damageData = damageMaskCtx.getImageData(0, 0, damageMaskCanvas.width, damageMaskCanvas.height).data;
    const sampleStep = 4;
    
    let outlineTotal = 0;
    let outlineCleared = 0;
    let targetTotal = 0;
    let damagedCount = 0;

    for (let y = 0; y < topCanvas.height; y += sampleStep) {
        for (let x = 0; x < topCanvas.width; x += sampleStep) {
            const offset = (y * topCanvas.width + x) * 4;
            const isOutline = outlineMaskData[offset + 3] > 40;
            const isTarget = targetMaskData[offset + 3] > 40;
            const isCleared = soilData[offset + 3] < 92;

            if (isOutline) {
                outlineTotal++;
                if (isCleared) outlineCleared++;
            }
            if (isTarget) {
                targetTotal++;
                if (damageData[offset + 3] > 30) damagedCount++;
            }
        }
    }

    if (outlineTotal === 0) return 0;

    const clearedRatio = outlineCleared / outlineTotal;
    const damagePenalty = Math.max(0, 1 - (damagedCount / (targetTotal * 0.5)));
    
    const finalScore = Math.round(clearedRatio * 100 * damagePenalty);
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

function finishExcavation() {
    clearInterval(excavationTimer);
    if (fragmentAnimFrame) cancelAnimationFrame(fragmentAnimFrame);

    excavationScore = calculateExcavationScore();
    updateScoreDisplay();

    const score = excavationScore;
    const reward = Math.round(score * 2.5);
    const previousScore = playerStats.excavationRates[activePrefecture.id] || 0;
    if (score > previousScore) playerStats.excavationRates[activePrefecture.id] = score;

    playerStats.gold += reward;
    saveGame();

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