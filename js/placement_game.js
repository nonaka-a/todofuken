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

    const visitors = document.getElementById('museum-visitors');
    if (visitors) {
        visitors.style.display = 'none !important';
        visitors.setAttribute('style', 'display: none !important;');
    }

    document.getElementById('museum-screen').style.zIndex = '101';

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
    container.innerHTML = '';

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

    // 画像の読み込み完了を待ってからサイズ計算と配置を行う（iPadでのサイズズレ防止）
    baseMap.onload = () => {
        const containerWidth = container.clientWidth || 900;
        const containerHeight = container.clientHeight || 520;

        const scale = Math.min(containerWidth / baseMap.naturalWidth, containerHeight / baseMap.naturalHeight);
        const drawWidth = baseMap.naturalWidth * scale;
        const drawHeight = baseMap.naturalHeight * scale;
        const offsetX = (containerWidth - drawWidth) / 2;
        const offsetY = (containerHeight - drawHeight) / 2;

        // すでに獲得済みのパーツを描画
        PREFECTURE_DATA.forEach(p => {
            if (p.id === currentPlacementPrefId) return;

            const pPos = positions[p.id];
            if (!pPos) return;

            const rate = playerStats.excavationRates[p.id] || 0;
            if (rate === 0) return;
            
            const img = document.createElement('img');
            img.src = `image/parts/${p.id}.png`;
            img.id = `map-part-${p.id}`;
            img.style.position = 'absolute';
            img.style.left = `${offsetX + pPos.x * scale}px`;
            img.style.top = `${offsetY + pPos.y * scale}px`;
            img.style.width = `${pPos.w * scale}px`;
            img.style.height = `${pPos.h * scale}px`;
            img.style.filter = 'none';
            img.style.zIndex = rate >= 80 ? '15' : '10';
            img.style.pointerEvents = 'none';
            container.appendChild(img);
        });

        const targetX = offsetX + pos.x * scale;
        const targetY = offsetY + pos.y * scale;
        const targetW = pos.w * scale;
        const targetH = pos.h * scale;

        const oldDragImg = document.getElementById('placement-drag-part-dynamic');
        if (oldDragImg) {
            oldDragImg.remove();
        }

        const dragImg = document.createElement('img');
        dragImg.id = 'placement-drag-part-dynamic';
        dragImg.src = `image/parts/${pref.id}.png`;
        dragImg.style.position = 'absolute';
        dragImg.style.width = `${targetW}px`;
        dragImg.style.height = `${targetH}px`;
        dragImg.style.cursor = 'grab';
        dragImg.style.zIndex = '110';
        dragImg.style.transition = 'filter 0.2s';
        dragImg.style.transform = 'none';

        // コンテナのど真ん中（やや上）へ配置して見切れを防止
        let currentX = (containerWidth - targetW) / 2;
        let currentY = (containerHeight - targetH) / 2 - 50;
        dragImg.style.left = `${currentX}px`;
        dragImg.style.top = `${currentY}px`;
        
        container.appendChild(dragImg);

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
            const posEvt = getEventPos(e);
            startMouseX = posEvt.x;
            startMouseY = posEvt.y;
            startPartX = currentX;
            startPartY = currentY;
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const posEvt = getEventPos(e);
            
            const stage = document.getElementById('game-stage');
            const stageScale = stage.getBoundingClientRect().width / 1000;
            const mapScale = 1.48;

            const dx = (posEvt.x - startMouseX) / (stageScale * mapScale);
            const dy = (posEvt.y - startMouseY) / (stageScale * mapScale);

            const rad = -15 * (Math.PI / 180);
            const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

            currentX = startPartX + localDx;
            currentY = startPartY + localDy;

            dragImg.style.left = `${currentX}px`;
            dragImg.style.top = `${currentY}px`;

            const dist = Math.hypot(currentX - targetX, currentY - targetY);
            if (dist < 40) {
                dragImg.style.filter = 'drop-shadow(0 0 10px #ffe082) brightness(1.2)';
            } else {
                dragImg.style.filter = 'none';
            }
        };

        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;

            const dist = Math.hypot(currentX - targetX, currentY - targetY);
            if (dist < 40) {
                dragImg.style.left = `${targetX}px`;
                dragImg.style.top = `${targetY}px`;
                dragImg.classList.add('puzzle-flash');

                if (typeof audioSettings === 'undefined' || audioSettings.se) {
                    const shineAudio = new Audio('sounds/Shine.mp3');
                    shineAudio.volume = 0.6;
                    shineAudio.play().catch(e => console.log("Audio play blocked", e));
                }

                setTimeout(() => {
                    dragImg.classList.remove('puzzle-flash');
                    dragImg.remove();
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
    };

    // 画像がすでにキャッシュされている場合は onload を待たずに即時実行
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

        document.getElementById('museum-screen').style.zIndex = '';

        document.querySelector('header').style.display = 'flex';
        document.querySelector('.action-buttons').style.display = 'flex';

        renderJapanMap();
        updateUI(); 

        setTimeout(() => {
            fadeOverlay.style.opacity = '0';

            const firstResultMessages = [
                "お見事です！記念すべき最初の化石が展示されましたね。\nまだ1つですが、ここに47都道府県すべての化石が並ぶ姿を想像すると\n今からとても楽しみです。",
                "それでは館長、素晴らしい化石との出会いを心より期待しております。"
            ];
            if (typeof showTutorial === 'function') {
                showTutorial('firstResult', firstResultMessages, null);
            }
        }, 150);
    }, 450);
}