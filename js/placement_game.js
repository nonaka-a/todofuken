let placementActive = false;
let pendingPlacementPref = null;
let currentPlacementPrefId = null;

function checkAndStartPlacement(prefId, score) {
    if (score < 40) return false;

    const pref = PREFECTURE_DATA.find(p => p.id === prefId);
    if (!pref) return false;

    pendingPlacementPref = pref;
    startPlacementMiniGame(pref);
    return true;
}

function startPlacementMiniGame(pref) {
    placementActive = true;
    currentPlacementPrefId = pref.id;

    document.querySelector('header').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';

    renderJapanMapForPlacement();

    document.getElementById('placement-title-text').innerText = `${pref.name}のパーツをあてはまる場所まで持っていこう！`;

    const overlay = document.getElementById('placement-overlay');
    overlay.style.display = 'block';

    const positions = (typeof PREFECTURE_POSITIONS !== 'undefined') ? PREFECTURE_POSITIONS : {};
    const pos = positions[pref.id];
    if (!pos) {
        finishPlacementMiniGame();
        return;
    }

    const container = document.getElementById('japan-map-container');
    const baseMap = container.querySelector('img');
    const containerWidth = container.clientWidth || 900;
    const containerHeight = container.clientHeight || 520;

    // ベース画像の縮小率計算
    const scale = Math.min(containerWidth / (baseMap.naturalWidth || 3600), containerHeight / (baseMap.naturalHeight || 2400));
    const drawWidth = (baseMap.naturalWidth || 3600) * scale;
    const drawHeight = (baseMap.naturalHeight || 2400) * scale;
    const offsetX = (containerWidth - drawWidth) / 2;
    const offsetY = (containerHeight - drawHeight) / 2;

    // 対象パーツの本来のサイズ（回転適用前）
    const rawW = pos.w * scale;
    const rawH = pos.h * scale;
    const rawX = offsetX + pos.x * scale;
    const rawY = offsetY + pos.y * scale;

    // ターゲットダミー要素の設定
    let dummyTarget = document.getElementById('placement-target-dummy');
    if (!dummyTarget) {
        dummyTarget = document.createElement('img');
        dummyTarget.id = 'placement-target-dummy';
        dummyTarget.style.position = 'absolute';
        dummyTarget.style.pointerEvents = 'none';
        dummyTarget.style.opacity = '0';
        container.appendChild(dummyTarget);
    }
    dummyTarget.src = `image/parts/${pref.id}.png`;
    dummyTarget.style.left = `${rawX}px`;
    dummyTarget.style.top = `${rawY}px`;
    dummyTarget.style.width = `${rawW}px`;
    dummyTarget.style.height = `${rawH}px`;
    dummyTarget.style.display = 'block';

    // ステージ（画面）縮小率と正確なターゲット座標の算出
    const stage = document.getElementById('game-stage');
    const stageRect = stage.getBoundingClientRect();
    const stageScale = stageRect.width / stage.offsetWidth;

    const mapWrapper = document.querySelector('.map-wrapper');
    const wrapperRect = mapWrapper.getBoundingClientRect();

    // 展示室の回転（15deg）・スケール（1.48）適用後のコンテナ中心座標
    const containerCenterX = (wrapperRect.left - stageRect.left) / stageScale + wrapperRect.width / (2 * stageScale);
    const containerCenterY = (wrapperRect.top - stageRect.top) / stageScale + wrapperRect.height / (2 * stageScale);

    // 中心からの無回転オフセット
    const mapScale = 1.48;
    const localX = (rawX - containerWidth / 2) * mapScale;
    const localY = (rawY - containerHeight / 2) * mapScale;

    // 15度回転後の目標位置 (targetX, targetY)
    const rad = 15 * (Math.PI / 180);
    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);

    const targetX = containerCenterX + rotatedX;
    const targetY = containerCenterY + rotatedY;
    const targetW = rawW * mapScale;
    const targetH = rawH * mapScale;

    // ドラッグパーツの完全一致設定
    const dragImg = document.getElementById('placement-drag-part');
    dragImg.src = `image/parts/${pref.id}.png`;
    dragImg.style.width = `${targetW}px`;
    dragImg.style.height = `${targetH}px`;
    dragImg.style.transform = 'rotate(15deg)';

    // 出現位置
    let currentX = 50;
    let currentY = 100;
    dragImg.style.left = `${currentX}px`;
    dragImg.style.top = `${currentY}px`;
    dragImg.style.display = 'block';

    let isDragging = false;
    let startMouseX = 0, startMouseY = 0;
    let startPartX = 0, startPartY = 0;

    const getEventPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const onMouseDown = (e) => {
        e.preventDefault();
        isDragging = true;
        const pos = getEventPos(e);
        startMouseX = pos.x;
        startMouseY = pos.y;
        startPartX = currentX;
        startPartY = currentY;
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const pos = getEventPos(e);
        const s = stageRect.width / stage.offsetWidth;

        const dx = (pos.x - startMouseX) / s;
        const dy = (pos.y - startMouseY) / s;

        currentX = startPartX + dx;
        currentY = startPartY + dy;

        dragImg.style.left = `${currentX}px`;
        dragImg.style.top = `${currentY}px`;

        const dist = Math.hypot(currentX - targetX, currentY - targetY);
        if (dist < 60) {
            dragImg.style.filter = 'drop-shadow(0 0 15px #ffe082) brightness(1.2)';
        } else {
            dragImg.style.filter = 'none';
        }
    };

    const onMouseUp = (e) => {
        if (!isDragging) return;
        isDragging = false;

        const dist = Math.hypot(currentX - targetX, currentY - targetY);
        // 吸着許容範囲を 60px に拡大
        if (dist < 60) {
            dragImg.style.left = `${targetX}px`;
            dragImg.style.top = `${targetY}px`;
            dragImg.classList.add('puzzle-flash');

            setTimeout(() => {
                dragImg.classList.remove('puzzle-flash');
                dragImg.style.display = 'none';
                if (dummyTarget) dummyTarget.style.display = 'none';
                finishPlacementMiniGame();
            }, 800);

            cleanupEvents();
        }
    };

    function cleanupEvents() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('touchend', onMouseUp);
        window.removeEventListener('touchcancel', onMouseUp);
        dragImg.removeEventListener('mousedown', onMouseDown);
        dragImg.removeEventListener('touchstart', onMouseDown);
    }

    dragImg.addEventListener('mousedown', onMouseDown);
    dragImg.addEventListener('touchstart', onMouseDown, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
    window.addEventListener('touchcancel', onMouseUp);
}

function renderJapanMapForPlacement() {
    const container = document.getElementById('japan-map-container');
    container.innerHTML = '';

    const positions = (typeof PREFECTURE_POSITIONS !== 'undefined') ? PREFECTURE_POSITIONS : {};

    const baseMap = document.createElement('img');
    baseMap.src = 'image/base_map.png';
    baseMap.style.position = 'absolute';
    baseMap.style.top = '0';
    baseMap.style.left = '0';
    baseMap.style.width = '100%';
    baseMap.style.height = '100%';
    baseMap.style.objectFit = 'contain'; 
    baseMap.style.pointerEvents = 'none';
    baseMap.style.opacity = '0.15';
    baseMap.style.zIndex = '1';
    container.appendChild(baseMap);

    baseMap.onload = () => {
        const containerWidth = container.clientWidth || 860;
        const containerHeight = container.clientHeight || 500;
        
        const scale = Math.min(containerWidth / baseMap.naturalWidth, containerHeight / baseMap.naturalHeight);
        const drawWidth = baseMap.naturalWidth * scale;
        const drawHeight = baseMap.naturalHeight * scale;
        const offsetX = (containerWidth - drawWidth) / 2;
        const offsetY = (containerHeight - drawHeight) / 2;

        PREFECTURE_DATA.forEach(p => {
            if (p.id === currentPlacementPrefId) return;

            const pos = positions[p.id];
            if (!pos) return;

            const rate = playerStats.excavationRates[p.id] || 0;
            if (rate === 0) return;
            
            const img = document.createElement('img');
            img.src = `image/parts/${p.id}.png`;
            img.id = `map-part-${p.id}`;
            img.style.position = 'absolute';
            img.style.left = `${offsetX + pos.x * scale}px`;
            img.style.top = `${offsetY + pos.y * scale}px`;
            img.style.width = `${pos.w * scale}px`;
            img.style.height = `${pos.h * scale}px`;
            img.style.filter = 'none';
            img.style.zIndex = rate >= 80 ? '15' : '10';
            img.style.pointerEvents = 'none';

            container.appendChild(img);
        });
    };

    if (baseMap.complete) {
        baseMap.onload();
    }
}

function finishPlacementMiniGame() {
    const fadeOverlay = document.getElementById('fade-overlay');

    fadeOverlay.style.opacity = '1';

    setTimeout(() => {
        placementActive = false;
        pendingPlacementPref = null;
        currentPlacementPrefId = null;

        document.getElementById('placement-overlay').style.display = 'none';

        document.querySelector('header').style.display = 'flex';
        document.querySelector('.action-buttons').style.display = 'flex';

        renderJapanMap();

        setTimeout(() => {
            fadeOverlay.style.opacity = '0';
        }, 150);
    }, 450);
}