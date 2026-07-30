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

    // ヘッダー・アクションボタン非表示
    document.querySelector('header').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';

    // 展示室の対象パーツを非表示で再描画
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

    const scale = Math.min(containerWidth / (baseMap.naturalWidth || 3600), containerHeight / (baseMap.naturalHeight || 2400));
    const drawWidth = (baseMap.naturalWidth || 3600) * scale;
    const drawHeight = (baseMap.naturalHeight || 2400) * scale;
    const offsetX = (containerWidth - drawWidth) / 2;
    const offsetY = (containerHeight - drawHeight) / 2;

    const partW = pos.w * scale;
    const partH = pos.h * scale;
    const partX = offsetX + pos.x * scale;
    const partY = offsetY + pos.y * scale;

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
    dummyTarget.style.left = `${partX}px`;
    dummyTarget.style.top = `${partY}px`;
    dummyTarget.style.width = `${partW}px`;
    dummyTarget.style.height = `${partH}px`;
    dummyTarget.style.display = 'block';

    const stage = document.getElementById('game-stage');
    const stageRect = stage.getBoundingClientRect();
    const dummyRect = dummyTarget.getBoundingClientRect();
    const currentScale = stageRect.width / stage.offsetWidth;

    const targetX = (dummyRect.left - stageRect.left) / currentScale;
    const targetY = (dummyRect.top - stageRect.top) / currentScale;
    const targetW = dummyRect.width / currentScale;
    const targetH = dummyRect.height / currentScale;

    const dragImg = document.getElementById('placement-drag-part');
    dragImg.src = `image/parts/${pref.id}.png`;
    dragImg.style.width = `${targetW}px`;
    dragImg.style.height = `${targetH}px`;
    dragImg.style.transform = 'rotate(15deg)';

    let currentX = 50;
    let currentY = 100;
    dragImg.style.left = `${currentX}px`;
    dragImg.style.top = `${currentY}px`;
    dragImg.style.display = 'block';

    let isDragging = false;
    let startMouseX = 0, startMouseY = 0;
    let startPartX = 0, startPartY = 0;

    const onMouseDown = (e) => {
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startMouseX = clientX;
        startMouseY = clientY;
        startPartX = currentX;
        startPartY = currentY;
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const s = stageRect.width / stage.offsetWidth;

        const dx = (clientX - startMouseX) / s;
        const dy = (clientY - startMouseY) / s;

        currentX = startPartX + dx;
        currentY = startPartY + dy;

        dragImg.style.left = `${currentX}px`;
        dragImg.style.top = `${currentY}px`;

        const dist = Math.hypot(currentX - targetX, currentY - targetY);
        if (dist < 40) {
            dragImg.style.filter = 'drop-shadow(0 0 15px #ffe082) brightness(1.2)';
        } else {
            dragImg.style.filter = 'none';
        }
    };

    const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;

        const dist = Math.hypot(currentX - targetX, currentY - targetY);
        if (dist < 40) {
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
        dragImg.removeEventListener('mousedown', onMouseDown);
        dragImg.removeEventListener('touchstart', onMouseDown);
    }

    dragImg.addEventListener('mousedown', onMouseDown);
    dragImg.addEventListener('touchstart', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
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

            container.appendChild(img);
        });
    };

    if (baseMap.complete) {
        baseMap.onload();
    }
}

function finishPlacementMiniGame() {
    const fadeOverlay = document.getElementById('fade-overlay');

    // 1. 暗転（ブラックアウト）させる
    fadeOverlay.style.opacity = '1';

    setTimeout(() => {
        placementActive = false;
        pendingPlacementPref = null;
        currentPlacementPrefId = null;

        document.getElementById('placement-overlay').style.display = 'none';

        document.querySelector('header').style.display = 'flex';
        document.querySelector('.action-buttons').style.display = 'flex';

        renderJapanMap();

        // 2. フェードインして通常画面に戻す
        setTimeout(() => {
            fadeOverlay.style.opacity = '0';
        }, 150);
    }, 450);
}