let playerStats = {
    gold: 500,
    excavationRates: {},
    excavationCounts: {},
    excavationImages: {},
    toolLevels: {
        hammer: 1,
        brush: 1
    },
    ownedHammers: ['normal'],
    equippedHammer: 'normal',
    unlockedRegions: ['ホッカイドー', 'キュウシュー'],
    tutorialState: {
        title: false,
        museum: false,
        areaSelect: false,
        excavation: false,
        firstResult: false,
        completedRegions: {},
        achievement25: false,
        achievement47: false,
        achievement100: false
    }
};
let currentTutorialQueue = [];
let currentTutorialCallback = null;

function showTutorial(key, messages, onComplete) {
    if (!playerStats.tutorialState) {
        playerStats.tutorialState = {};
    }
    if (playerStats.tutorialState[key]) {
        if (onComplete) onComplete();
        return;
    }

    currentTutorialQueue = [...messages];
    currentTutorialCallback = () => {
        playerStats.tutorialState[key] = true;
        saveGame();
        if (onComplete) onComplete();
    };

    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        advanceTutorial();
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    }
}

window.advanceTutorial = function() {
    if (currentTutorialQueue.length === 0) {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
                if (currentTutorialCallback) {
                    const cb = currentTutorialCallback;
                    currentTutorialCallback = null;
                    cb();
                }
            }, 300);
        } else {
            if (currentTutorialCallback) {
                const cb = currentTutorialCallback;
                currentTutorialCallback = null;
                cb();
            }
        }
        return;
    }

    const nextText = currentTutorialQueue.shift();
    const textElem = document.getElementById('tutorial-text');
    if (textElem) textElem.innerText = nextText;
};

let audioSettings = {
    bgm: true,
    se: true
};

let bgmAudio = null;
let carouselIndex = 0;
let carouselRegions = [];
let dragStartX = 0;
let isDraggingCarousel = false;
let lastTouchEnd = 0;

window.addEventListener('DOMContentLoaded', () => {
    initScale();
    window.addEventListener('resize', initScale);
    
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    const btnShop = document.getElementById('btn-shop');
    const btnExcavate = document.getElementById('btn-excavate');
    if (btnShop) btnShop.disabled = false;
    if (btnExcavate) btnExcavate.disabled = false;

    initBGM();
    initGame();
});

function initBGM() {
    bgmAudio = new Audio('sounds/BGM.mp3');
    bgmAudio.loop = true;
    bgmAudio.volume = 0.35;

    const startBGM = () => {
        if (bgmAudio) {
            bgmAudio.play().then(() => {
                window.removeEventListener('click', startBGM);
                window.removeEventListener('keydown', startBGM);
                window.removeEventListener('touchstart', startBGM);
            }).catch(e => {
                console.log("BGM autoplay waiting for user interaction...", e);
            });
        }
    };

    window.addEventListener('click', startBGM);
    window.addEventListener('keydown', startBGM);
    window.addEventListener('touchstart', startBGM);
}

function initScale() {
    const stage = document.getElementById('game-stage');
    if (!stage) return;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const scaleX = windowWidth / 1000;
    const scaleY = windowHeight / 720;
    const scale = Math.min(scaleX, scaleY);

    stage.style.transform = `scale(${scale})`;
}

async function initGame() {
    const saved = localStorage.getItem('japan_museum_save');
    if (saved) {
        try {
            playerStats = JSON.parse(saved);
        } catch(e) {
            console.error("Save load failed", e);
        }
    }

    if (!playerStats.excavationCounts) playerStats.excavationCounts = {};
    if (!playerStats.excavationImages) playerStats.excavationImages = {};
    if (!playerStats.ownedHammers) playerStats.ownedHammers = ['normal'];
    if (!playerStats.equippedHammer) playerStats.equippedHammer = 'normal';
    if (!playerStats.unlockedRegions) playerStats.unlockedRegions = ['ホッカイドー', 'キュウシュー'];
    if (!playerStats.tutorialState) {
        playerStats.tutorialState = {
            title: false,
            museum: false,
            areaSelect: false,
            excavation: false,
            firstResult: false,
            completedRegions: {},
            achievement25: false,
            achievement47: false,
            achievement100: false
        };
    }
    if (!playerStats.tutorialState.completedRegions) playerStats.tutorialState.completedRegions = {};

    if (typeof PREFECTURE_DATA !== 'undefined') {
        PREFECTURE_DATA.forEach(p => {
            if (playerStats.excavationRates[p.id] === undefined) {
                playerStats.excavationRates[p.id] = 0;
            }
            if (playerStats.excavationCounts[p.id] === undefined) {
                playerStats.excavationCounts[p.id] = 0;
            }
        });
    }

    const header = document.querySelector('header');
    if (header) header.style.display = 'none';

    renderJapanMap();
    updateUI();
}

let globalApplauseAudio = null;

window.startFromTitle = function() {
    // iOS/iPadOSのオーディオ再生制限を解除するためのプリロード
    if (!globalApplauseAudio) {
        globalApplauseAudio = new Audio('sounds/Applause.mp3');
        globalApplauseAudio.volume = 0.4;
    }
    globalApplauseAudio.play().then(() => {
        globalApplauseAudio.pause();
        globalApplauseAudio.currentTime = 0;
    }).catch(e => console.log("Audio unlock failed", e));

    const titleMessages = [
        "お待ちしておりました、館長。\nここはあなたの日本列島博物館（にほんれっとうはくぶつかん）です。\nさあ、中へお入りください。"
    ];

    showTutorial('title', titleMessages, () => {
        const fadeOverlay = document.getElementById('fade-overlay');
        if (!fadeOverlay) return;

        fadeOverlay.style.opacity = '1';

        setTimeout(() => {
            const header = document.querySelector('header');
            if (header) header.style.display = 'flex';

            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            document.getElementById('museum-screen').classList.add('active');
            renderJapanMap();
            updateUI();

            setTimeout(() => {
                fadeOverlay.style.opacity = '0';
                
                const museumMessages = [
                    "ここが展示室です。\nあなたの目標は、この日本列島博物館に「47都道府県の化石」\nを集めて展示することです。",
                    "これまでに、47都道府県すべての化石をそろえた博物館はありません。\n館長の手で、歴史に名をきざみましょう。"
                ];
                showTutorial('museum', museumMessages, null);
            }, 150);
        }, 400);
    });
};

function saveGame() {
    try {
        localStorage.setItem('japan_museum_save', JSON.stringify(playerStats));
    } catch (e) {
        console.warn("Storage quota exceeded. Clearing old image caches...", e);
        if (playerStats.excavationImages) {
            const keys = Object.keys(playerStats.excavationImages);
            if (keys.length > 0) {
                delete playerStats.excavationImages[keys[0]];
                try {
                    localStorage.setItem('japan_museum_save', JSON.stringify(playerStats));
                } catch (e2) {
                    console.error("Save failed after image cleanup.", e2);
                }
            }
        }
    }
}

window.resetSaveData = function() {
    if (confirm("本当にセーブデータを消去して最初からやり直しますか？\n（この操作は取り消せません）")) {
        localStorage.removeItem('japan_museum_save');
        location.reload();
    }
};

function renderJapanMap() {
    const container = document.getElementById('japan-map-container');
    if (!container) return;
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

        if (typeof PREFECTURE_DATA !== 'undefined') {
            PREFECTURE_DATA.forEach(p => {
                if (typeof currentPlacementPrefId !== 'undefined' && p.id === currentPlacementPrefId) return;

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
                img.style.cursor = 'pointer';
                img.style.transition = 'transform 0.2s, filter 0.2s';
                
                img.ondragstart = () => false;

                img.style.filter = 'none';
                img.style.zIndex = rate >= 80 ? '15' : '10';

                img.onmouseover = () => { 
                    img.style.transform = 'scale(1.05)'; 
                    img.style.zIndex = '20'; 
                };
                img.onmouseout = () => { 
                    img.style.transform = 'scale(1)'; 
                    img.style.zIndex = rate >= 80 ? '15' : (rate > 0 ? '10' : '5');
                };

                let imgCanvas = null;
                let imgCtx = null;

                img.onclick = (e) => {
                    if (!imgCanvas) {
                        imgCanvas = document.createElement('canvas');
                        imgCanvas.width = img.naturalWidth;
                        imgCanvas.height = img.naturalHeight;
                        imgCtx = imgCanvas.getContext('2d');
                        imgCtx.drawImage(img, 0, 0);
                    }

                    const rect = img.getBoundingClientRect();
                    const clickX = Math.floor((e.clientX - rect.left) * (img.naturalWidth / rect.width));
                    const clickY = Math.floor((e.clientY - rect.top) * (img.naturalHeight / rect.height));

                    if (clickX >= 0 && clickX < img.naturalWidth && clickY >= 0 && clickY < img.naturalHeight) {
                        const alpha = imgCtx.getImageData(clickX, clickY, 1, 1).data[3];
                        if (alpha <= 30) {
                            img.style.pointerEvents = 'none';
                            const underlyingElement = document.elementFromPoint(e.clientX, e.clientY);
                            img.style.pointerEvents = 'auto';

                            if (underlyingElement && underlyingElement.onclick && underlyingElement !== img) {
                                underlyingElement.onclick(e);
                            }
                            return;
                        }
                    }
                    openEncyclopedia(p.id);
                };
                
                container.appendChild(img);
            });
        }
    };

    if (baseMap.complete) {
        baseMap.onload();
    }

    updateVisitors();
}

function updateVisitors() {
    const container = document.getElementById('museum-visitors');
    if (!container) return;

    const museumScreen = document.getElementById('museum-screen');
    if (!museumScreen || !museumScreen.classList.contains('active')) {
        container.style.display = 'none';
        return;
    }

    if (typeof PREFECTURE_DATA === 'undefined') return;

    const count = PREFECTURE_DATA.filter(p => (playerStats.excavationRates[p.id] || 0) > 0).length;
    const totalPrefectures = PREFECTURE_DATA.length;

    let visitorImageSrc = null;
    if (count >= totalPrefectures) {
        visitorImageSrc = 'image/p05.png';
    } else if (count >= 40) {
        visitorImageSrc = 'image/p04.png';
    } else if (count >= 30) {
        visitorImageSrc = 'image/p03.png';
    } else if (count >= 15) {
        visitorImageSrc = 'image/p02.png';
    } else if (count >= 5) {
        visitorImageSrc = 'image/p01.png';
    }

    container.innerHTML = '';
    if (visitorImageSrc) {
        const img = document.createElement('img');
        img.src = visitorImageSrc;
        img.className = 'museum-visitor-img';
        container.appendChild(img);
        container.style.display = 'flex';
    } else {
        container.style.display = 'none';
    }
}

function updateUI() {
    const goldElem = document.getElementById('player-gold');
    if (goldElem) goldElem.innerText = playerStats.gold;

    if (typeof PREFECTURE_DATA !== 'undefined') {
        let sum = 0;
        let count = 0;
        PREFECTURE_DATA.forEach(p => {
            const rate = playerStats.excavationRates[p.id] || 0;
            sum += rate;
            if (rate > 0) count++;
        });
        const avg = Math.round(sum / PREFECTURE_DATA.length);
        const compElem = document.getElementById('total-completion');
        const countElem = document.getElementById('total-count');
        if (compElem) compElem.innerText = avg;
        if (countElem) countElem.innerText = count;
    }

    if (!playerStats.toolLevels.brush) playerStats.toolLevels.brush = 1;
    if (!playerStats.ownedHammers) playerStats.ownedHammers = ['normal'];
    if (!playerStats.equippedHammer) playerStats.equippedHammer = 'normal';

    const hammerBtn = document.getElementById('btn-hammer-upgrade');
    const hammerDesc = document.getElementById('hammer-desc');
    const hammerCostElem = document.getElementById('hammer-cost');

    const hasSilver = playerStats.ownedHammers.includes('silver');
    const hasGold = playerStats.ownedHammers.includes('gold');

    if (hammerBtn && hammerDesc) {
        if (hasGold) {
            hammerDesc.innerText = "金のハンマー（広範囲＆化石が欠けない）";
            hammerBtn.innerText = "MAX";
            hammerBtn.disabled = true;
        } else if (hasSilver) {
            hammerDesc.innerText = "金のハンマー（広範囲＆化石が欠けない）";
            if (hammerCostElem) hammerCostElem.innerText = "2000";
            hammerBtn.disabled = false;
        } else {
            hammerDesc.innerText = "銀のハンマー（広範囲を破壊する）";
            if (hammerCostElem) hammerCostElem.innerText = "1000";
            hammerBtn.disabled = false;
        }
    }
    
    const brushLevel = playerStats.toolLevels.brush;
    const brushLevelElem = document.getElementById('brush-level');
    if (brushLevelElem) brushLevelElem.innerText = brushLevel;
    const brushBtn = document.getElementById('btn-brush-upgrade');
    if (brushBtn) {
        if (brushLevel >= 3) {
            brushBtn.innerText = "MAX";
            brushBtn.disabled = true;
        } else {
            const cost = brushLevel === 1 ? 1000 : 2000;
            const brushCostElem = document.getElementById('brush-cost');
            if (brushCostElem) brushCostElem.innerText = cost;
            brushBtn.disabled = false;
        }
    }
}

window.openShop = function() {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeShop = function() {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'none';
};

function playRegisterSound() {
    if (typeof audioSettings !== 'undefined' && !audioSettings.se) return;
    const audio = new Audio('sounds/Register.mp3');
    audio.volume = 0.6;
    audio.play().catch(e => console.log("Audio play blocked", e));
}

window.upgradeTool = function(tool) {
    if (tool === 'hammer') {
        const hasSilver = playerStats.ownedHammers.includes('silver');
        const hasGold = playerStats.ownedHammers.includes('gold');

        if (hasGold) return;

        const cost = hasSilver ? 2000 : 1000;
        const targetType = hasSilver ? 'gold' : 'silver';

        if (playerStats.gold >= cost) {
            playerStats.gold -= cost;
            playerStats.ownedHammers.push(targetType);
            playerStats.equippedHammer = targetType;
            playRegisterSound();
            saveGame();
            updateUI();
        } else {
            alert("お金が足りません！");
        }
    } else if (tool === 'brush') {
        const level = playerStats.toolLevels.brush || 1;
        if (level >= 3) return;
        const cost = level === 1 ? 1000 : 2000;

        if (playerStats.gold >= cost) {
            playerStats.gold -= cost;
            playerStats.toolLevels.brush = level + 1;
            playRegisterSound();
            saveGame();
            updateUI();
        } else {
            alert("お金が足りません！");
        }
    }
};

window.unlockRegion = function(event, regionName) {
    event.stopPropagation();
    const cost = 500;
    if (playerStats.gold >= cost) {
        playerStats.gold -= cost;
        if (!playerStats.unlockedRegions) {
            playerStats.unlockedRegions = ['ホッカイドー', 'キュウシュー'];
        }
        if (!playerStats.unlockedRegions.includes(regionName)) {
            playerStats.unlockedRegions.push(regionName);
        }
        playerStats.lastRegion = regionName;
        playRegisterSound();
        saveGame();
        updateUI();
        openAreaSelect();
    } else {
        alert("お金が足りません！");
    }
};

window.selectEquippedHammer = function(type) {
    if (playerStats.ownedHammers.includes(type)) {
        playerStats.equippedHammer = type;
        saveGame();
        updateUI();
        openAreaSelect();
    }
};

function toggleAreaHint(event, regionName) {
    event.stopPropagation();
    
    const allPopouts = document.querySelectorAll('.area-hint-popout');
    const targetPopout = document.getElementById(`hint-popout-${regionName}`);

    const isVisible = targetPopout ? targetPopout.style.display === 'block' : false;

    allPopouts.forEach(pop => pop.style.display = 'none');

    if (targetPopout && !isVisible) {
        targetPopout.style.display = 'block';
    }
}

window.openAreaSelect = function() {
    const defaultOrder = [
        "キュウシュー",
        "シコク",
        "チュウゴク",
        "キンキ",
        "チュウブ",
        "カントー",
        "トウホク",
        "ホッカイドー"
    ];
    
    if (typeof PREFECTURE_DATA === 'undefined') return;

    const existingRegions = [...new Set(PREFECTURE_DATA.map(p => p.region))];
    carouselRegions = defaultOrder.filter(r => existingRegions.includes(r));

   if (playerStats.lastRegion) {
        const lastIdx = carouselRegions.indexOf(playerStats.lastRegion);
        carouselIndex = lastIdx !== -1 ? lastIdx : 0;
    } else {
        carouselIndex = 0;
    }

    const track = document.getElementById('area-carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!track || !dotsContainer) return;

    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    const modalWindow = document.querySelector('.area-select-window');
    let hammerSelectArea = document.getElementById('modal-hammer-select-area');
    if (!hammerSelectArea && modalWindow) {
        hammerSelectArea = document.createElement('div');
        hammerSelectArea.id = 'modal-hammer-select-area';
        modalWindow.appendChild(hammerSelectArea);
    }

    if (hammerSelectArea) {
        const hammerNames = { normal: '普通', silver: '銀', gold: '金' };
        hammerSelectArea.innerHTML = `<span class="hammer-label">ハンマー:</span>` + playerStats.ownedHammers.map(h => `
            <button class="btn" style="padding:4px 10px; font-size:0.8rem; ${playerStats.equippedHammer === h ? 'background:#ffe3a1; color:#3b2110; font-weight:bold;' : 'opacity:0.7;'}" onclick="selectEquippedHammer('${h}')">${hammerNames[h]}</button>
        `).join('');
    }

    let brushArea = document.getElementById('modal-brush-select-area');
    if (!brushArea && modalWindow) {
        brushArea = document.createElement('div');
        brushArea.id = 'modal-brush-select-area';
        modalWindow.appendChild(brushArea);
    }

    if (brushArea) {
        const brushLevel = playerStats.toolLevels ? (playerStats.toolLevels.brush || 1) : 1;
        brushArea.innerHTML = `<span class="brush-label">ブラシ:</span><span class="btn" style="padding:4px 10px; font-size:0.8rem; background:#ffe3a1; color:#3b2110; font-weight:bold; cursor:default;">Lv.${brushLevel}</span>`;
    }

    const chisoImageMap = {
        'ホッカイドー': 'image/chiso_ho.png',
        'トウホク':     'image/chiso_to.png',
        'カントー':     'image/chiso_kant.png',
        'チュウブ':     'image/chiso_chub.png',
        'キンキ':       'image/chiso_kin.png',
        'チュウゴク':   'image/chiso_chug.png',
        'シコク':       'image/chiso_shi.png',
        'キュウシュー': 'image/chiso_kyu.png'
    };

    carouselRegions.forEach((regionName, idx) => {
        const regionPrefs = PREFECTURE_DATA.filter(p => p.region === regionName);
        const totalCount = regionPrefs.length;
        const foundCount = regionPrefs.filter(p => (playerStats.excavationRates[p.id] || 0) > 0).length;

        const details = (typeof REGION_DETAILS !== 'undefined' && REGION_DETAILS[regionName]) 
            ? REGION_DETAILS[regionName] 
            : { feature: '---', hint: '---' };

        const bgImgPath = chisoImageMap[regionName] || 'image/chiso.png';
        const isUnlocked = playerStats.unlockedRegions && playerStats.unlockedRegions.includes(regionName);

        const card = document.createElement('div');
        card.className = `area-card ${isUnlocked ? '' : 'locked-card'}`;
        card.dataset.index = idx;
        card.style.setProperty('--bg-chiso-img', `url('${bgImgPath}')`);

        const actionBtnHtml = isUnlocked
            ? `<button class="btn btn-accent btn-start-excavate" onclick="onCardClick(event, ${idx}, '${regionName}')">この場所を発掘する</button>`
            : `<button class="btn btn-accent btn-start-excavate" ${playerStats.gold < 500 ? 'disabled' : ''} onclick="unlockRegion(event, '${regionName}')">解放する (500 G)</button>`;

        const lockImgHtml = isUnlocked ? '' : `<img src="image/lock.png" class="locked-icon" alt="ロック">`;
        const isCompleted = (foundCount === totalCount && totalCount > 0);
        const isPerfect = isCompleted && regionPrefs.every(p => (playerStats.excavationRates[p.id] || 0) === 100);

        let trophyImgHtml = '';
        if (isPerfect) {
            trophyImgHtml = `<img src="image/Trophy2.png" class="area-trophy-icon" alt="パーフェクトコンプリート">`;
        } else if (isCompleted) {
            trophyImgHtml = `<img src="image/Trophy.png" class="area-trophy-icon" alt="コンプリート">`;
        }

        card.innerHTML = `
            ${lockImgHtml}
            ${trophyImgHtml}
            <div>
                <h4>${regionName}地層 <span style="font-size: 0.95rem; font-weight: normal; color: #6d3f1f;">(${foundCount}/${totalCount})</span></h4>
                <div class="area-info-item">
                    <span class="area-label-badge">地質の特徴</span><br>${details.feature}
                </div>
            </div>
            <div class="area-card-footer">
                <div class="area-hint-popout" id="hint-popout-${regionName}">
                    ${details.hint}
                </div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
                    <button type="button" class="btn-area-hint" onclick="toggleAreaHint(event, '${regionName}')">発掘のヒント</button>
                </div>
                ${actionBtnHtml}
            </div>
        `;
        track.appendChild(card);

        const dot = document.createElement('div');
        dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
        dot.onclick = () => setCarouselIndex(idx);
        dotsContainer.appendChild(dot);
    });

    setupCarouselDrag();
    updateCarousel();

    const areaModal = document.getElementById('area-select-modal');
    if (areaModal) areaModal.style.display = 'flex';

    const areaSelectMessages = [
        "それでは、さっそく化石の発掘（はっくつ）へまいりましょう。\nまずは、化石を探す 地層（ちそう） を選びます。"
    ];
    showTutorial('areaSelect', areaSelectMessages, null);
};

function updateCarousel() {
    const cards = document.querySelectorAll('.area-card');
    const dots = document.querySelectorAll('.carousel-dot');
    const total = carouselRegions.length;

    cards.forEach((card, i) => {
        let diff = i - carouselIndex;

        if (diff > total / 2) diff -= total;
        if (diff < -total / 2) diff += total;

        const absDiff = Math.abs(diff);

        let tx = diff * 220; 
        let tz = -absDiff * 150;
        let ry = diff * -25;
        let scale = Math.max(0.6, 1 - absDiff * 0.2);
        let opacity = absDiff > 2 ? 0 : Math.max(0, 1 - absDiff * 0.35);
        let pointerEvents = absDiff === 0 ? 'auto' : (absDiff <= 1 ? 'auto' : 'none');

        card.style.setProperty('--tx', `${tx}px`);
        card.style.setProperty('--tz', `${tz}px`);
        card.style.setProperty('--ry', `${ry}deg`);
        card.style.setProperty('--sc', `${scale}`);

        card.style.transform = `translate3d(${tx}px, 0, ${tz}px) rotateY(${ry}deg) scale(${scale})`;
        card.style.opacity = opacity;
        card.style.zIndex = 100 - absDiff * 10;
        card.style.pointerEvents = pointerEvents;

        if (diff === 0) {
            card.classList.add('active-card');
        } else {
            card.classList.remove('active-card');
        }
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === carouselIndex);
    });
}

window.moveCarousel = function(dir) {
    if (carouselRegions.length === 0) return;
    carouselIndex = (carouselIndex + dir + carouselRegions.length) % carouselRegions.length;
    updateCarousel();
};

window.setCarouselIndex = function(idx) {
    carouselIndex = idx;
    updateCarousel();
};

window.onCardClick = function(event, idx, regionName) {
    event.stopPropagation();
    if (idx !== carouselIndex) {
        setCarouselIndex(idx);
    } else {
        if (typeof startAreaExcavation === 'function') {
            startAreaExcavation(regionName);
        }
    }
};

function setupCarouselDrag() {
    const wrapper = document.getElementById('carousel-wrapper');
    if (!wrapper) return;

    const getX = e => e.touches ? e.touches[0].clientX : e.clientX;

    const handleStart = e => {
        isDraggingCarousel = true;
        dragStartX = getX(e);
    };

    const handleEnd = e => {
        if (!isDraggingCarousel) return;
        isDraggingCarousel = false;
        const diffX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - dragStartX;

        if (diffX < -40) {
            moveCarousel(1);
        } else if (diffX > 40) {
            moveCarousel(-1);
        }
    };

    wrapper.onmousedown = handleStart;
    wrapper.onmouseup = handleEnd;
    wrapper.ontouchstart = handleStart;
    wrapper.ontouchend = handleEnd;
}

window.closeAreaSelect = function() {
    const modal = document.getElementById('area-select-modal');
    if (modal) modal.style.display = 'none';
};

window.openEncyclopedia = function(prefId) {
    if (typeof PREFECTURE_DATA === 'undefined') return;
    const pref = PREFECTURE_DATA.find(p => p.id === prefId);
    if (!pref) return;

    const rate = playerStats.excavationRates[pref.id] || 0;
    const count = playerStats.excavationCounts[pref.id] || 0;

    const nameElem = document.getElementById('modal-pref-name');
    const kanaElem = document.getElementById('modal-pref-kana');
    const capElem = document.getElementById('modal-capital');
    const regElem = document.getElementById('modal-region');
    const compElem = document.getElementById('modal-completion-rate');
    const countElem = document.getElementById('modal-excavation-count');
    const specElem = document.getElementById('modal-specialty');
    const markElem = document.getElementById('modal-landmark');

    if (nameElem) nameElem.innerText = pref.name;
    if (kanaElem) kanaElem.innerText = pref.kana ? `【${pref.kana}】` : '';
    if (capElem) capElem.innerText = pref.capital;
    if (regElem) regElem.innerText = `${pref.region}地層`;
    if (compElem) compElem.innerText = `${rate}%`;
    if (countElem) countElem.innerText = `${count}回`;
    if (specElem) specElem.innerText = pref.specialty;
    if (markElem) markElem.innerText = pref.landmark;

    drawEncyclopediaCanvas(pref, rate);

    const modal = document.getElementById('encyclopedia-modal');
    if (modal) modal.style.display = 'flex';
};

function drawEncyclopediaCanvas(pref, rate) {
    const canvas = document.getElementById('modal-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const savedImage = playerStats.excavationImages[pref.id];

    if (savedImage && rate > 0) {
        const img = new Image();
        img.src = savedImage;
        img.onload = () => {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = (canvas.width - dw) / 2;
            const dy = (canvas.height - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
        };
    } else {
        const img = new Image();
        img.src = `image/parts/${pref.id}.png`;
        img.onload = () => {
            ctx.save();
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85;
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = (canvas.width - dw) / 2;
            const dy = (canvas.height - dh) / 2;

            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'rgba(40, 30, 20, 0.65)';
            ctx.fillRect(dx, dy, dw, dh);
            ctx.restore();
        };
    }
}

window.closeEncyclopedia = function() {
    const modal = document.getElementById('encyclopedia-modal');
    if (modal) modal.style.display = 'none';
};

window.openSettings = function() {
    updateSettingsUI();
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeSettings = function() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
};

function updateSettingsUI() {
    const bgmBtn = document.getElementById('btn-toggle-bgm');
    const seBtn = document.getElementById('btn-toggle-se');
    if (bgmBtn) bgmBtn.innerText = audioSettings.bgm ? 'ON' : 'OFF';
    if (seBtn) seBtn.innerText = audioSettings.se ? 'ON' : 'OFF';
}

window.toggleBGM = function() {
    audioSettings.bgm = !audioSettings.bgm;
    if (bgmAudio) {
        if (audioSettings.bgm) {
            bgmAudio.play().catch(e => console.log(e));
        } else {
            bgmAudio.pause();
        }
    }
    updateSettingsUI();
};

window.toggleSE = function() {
    audioSettings.se = !audioSettings.se;
    updateSettingsUI();
};

window.toggleFullscreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`全画面表示に失敗しました: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
};

function playApplauseSound() {
    if (typeof audioSettings === 'undefined' || audioSettings.se) {
        const applauseAudio = new Audio('sounds/Applause.mp3');
        applauseAudio.volume = 0.4;
        applauseAudio.play().catch(e => console.log("Audio play blocked", e));
    }
}

function checkAchievementTutorials(onComplete) {
    if (typeof PREFECTURE_DATA === 'undefined') {
        if (onComplete) onComplete();
        return;
    }

    const queue = [];

    // 1. 都道府県収集数と完成度の計算
    let collectedCount = 0;
    let totalRateSum = 0;
    const regionStatus = {};

    PREFECTURE_DATA.forEach(p => {
        const rate = playerStats.excavationRates[p.id] || 0;
        totalRateSum += rate;
        if (rate > 0) collectedCount++;

        if (!regionStatus[p.region]) {
            regionStatus[p.region] = { total: 0, collected: 0 };
        }
        regionStatus[p.region].total++;
        if (rate > 0) regionStatus[p.region].collected++;
    });

    const averageCompletion = Math.round(totalRateSum / PREFECTURE_DATA.length);

    // 2. 初めて1つの地層（エリア）をコンプリートした時の判定
    if (!playerStats.tutorialState.completedRegions) {
        playerStats.tutorialState.completedRegions = {};
    }

    for (const regionName in regionStatus) {
        if (regionName === 'ホッカイドー') continue;

        const st = regionStatus[regionName];
        if (st.collected === st.total && !playerStats.tutorialState.completedRegions[regionName]) {
            const hasAnyRegionCompletedBefore = Object.values(playerStats.tutorialState.completedRegions).some(val => val === true);
            playerStats.tutorialState.completedRegions[regionName] = true;
            saveGame();

            if (!hasAnyRegionCompletedBefore) {
                queue.push({
                    key: 'firstRegionComplete_' + regionName,
                    messages: [
                        `${regionName}地層の化石がすべて揃いましたね。おめでとうございます。\nこうして一つひとつの地域が埋まっていく様子は、実に美しいですね。 日本列島の歴史が、少しずつこの展示室に息づいていくのを感じます。\nさあ館長、次はどの地域の歴史を掘り起こしに向かいましょうか。`
                    ]
                });
            }
        }
    }

    // 3. 25の都道府県を集めた時（折り返し地点）
    if (collectedCount >= 25 && !playerStats.tutorialState.achievement25) {
        queue.push({
            key: 'achievement25',
            messages: [
                "これで、25の都道府県を展示できました。\n全体の半分を超えましたね、ここまでのご活躍、本当にお疲れ様です。\n日本列島の半分が、館長の手で鮮やかにいろどられました。 残す都道府県はあと半分です。最後まで静かに見守っております。"
            ]
        });
    }

    // 4. 47の都道府県を集めた時
    if (collectedCount >= 47 && !playerStats.tutorialState.achievement47) {
        queue.push({
            key: 'achievement47',
            grandTitle: '47都道府県　発掘完了！',
            messages: [
                "館長、おめでとうございます！ 47すべての都道府県の化石が、この日本列島博物館に展示されました。 \n日本全国の歴史が、この一つの部屋に集められたすばらしい景色……実に感動します。 \n前人未到（ぜんじんみとう）の偉業を成しとげられたこと、心よりほこりに思います。"
            ]
        });
    }

   // 5. 都道府県完成度100%（全8地層で全ての都道府県が100%達成＝Trophy2条件を満たしていることを必須条件に追加）
    const allRegionsPerfect = Object.keys(regionStatus).every(regionName => {
        const regionPrefs = PREFECTURE_DATA.filter(p => p.region === regionName);
        return regionPrefs.length > 0 && regionPrefs.every(p => (playerStats.excavationRates[p.id] || 0) === 100);
    });

    if (averageCompletion >= 100 && allRegionsPerfect && !playerStats.tutorialState.achievement100) {
        queue.push({
            key: 'achievement100',
            grandTitle: '日本列島完成度　100%達成！',
            messages: [
                "館長……すべての都道府県の化石が、完璧な形でこの博物館に揃いました。\n欠けることなく並んだ化石たちが、あたたかな光に照らされて輝いています。なんと美しいのでしょう……",
                "地道で果てしない発掘の道のりを、最後までやりとげられましたね。\nこの日本列島博物館は、間違いなく世界にほこる至高の博物館です。\n本当にお疲れ様でした、館長。"
            ]
        });
    }

    // キューを順番に実行する処理
    function processQueue(index) {
        if (index >= queue.length) {
            if (onComplete) onComplete();
            return;
        }

        const item = queue[index];
        playApplauseSound();
        showTutorial(item.key, item.messages, () => {
            if (item.grandTitle) {
                triggerGrandAchievementCutscene(item.grandTitle, () => {
                    processQueue(index + 1);
                });
            } else {
                processQueue(index + 1);
            }
        });
    }
    processQueue(0);
}

function debugResetHokkaido() {
    delete playerStats.excavationRates['hokkaido'];
    delete playerStats.excavationImages['hokkaido'];
    delete playerStats.excavationCounts['hokkaido'];

    if (playerStats.tutorialState) {
        playerStats.tutorialState.achievement47 = false;
        playerStats.tutorialState.achievement100 = false;
    }

    saveGame();
    renderJapanMap();
    updateUI();
}

function playKanseiSound() {
    if (typeof audioSettings === 'undefined' || audioSettings.se) {
        const audio = new Audio('sounds/kansei.mp3');
        audio.volume = 0.7;
        audio.play().catch(e => console.log("Audio play blocked", e));
    }
}

function triggerGrandAchievementCutscene(titleText, onComplete) {
    const overlay = document.getElementById('grand-achievement-overlay');
    const titleElem = document.getElementById('grand-achievement-title');
    if (!overlay || !titleElem) {
        if (onComplete) onComplete();
        return;
    }

    titleElem.innerText = titleText;
    overlay.classList.add('active');

    playKanseiSound();

    // パーティクル（紙吹雪・光）生成
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d', '#ffffff', '#ff9ff3'];
    for (let i = 0; i < 70; i++) {
        const p = document.createElement('div');
        p.className = 'achievement-particle';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = '50%';
        p.style.top = '40%';
        
        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 350;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist + (Math.random() * 100);

        p.style.setProperty('--p-tx', `${tx}px`);
        p.style.setProperty('--p-ty', `${ty}px`);
        p.style.animationDelay = `${Math.random() * 0.3}s`;

        overlay.appendChild(p);
        setTimeout(() => p.remove(), 2800);
    }

    const handleClick = () => {
        overlay.removeEventListener('click', handleClick);
        overlay.classList.remove('active');
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 500);
    };

    setTimeout(() => {
        overlay.addEventListener('click', handleClick);
    }, 500);
}