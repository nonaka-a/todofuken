let playerStats = {
    gold: 500,
    excavationRates: {},
    excavationCounts: {},
    excavationImages: {},
    toolLevels: {
        hammer: 1,
        brush: 1
    }
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
    
    // iPadなどのダブルタップによるズーム動作を防止
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    document.getElementById('btn-shop').disabled = true;
    document.getElementById('btn-excavate').disabled = true;

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

    PREFECTURE_DATA.forEach(p => {
        if (playerStats.excavationRates[p.id] === undefined) {
            playerStats.excavationRates[p.id] = 0;
        }
        if (playerStats.excavationCounts[p.id] === undefined) {
            playerStats.excavationCounts[p.id] = 0;
        }
    });

    renderJapanMap();
    updateUI();

    document.getElementById('btn-shop').disabled = false;
    document.getElementById('btn-excavate').disabled = false;
}

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

function resetSaveData() {
    if (confirm("本当にセーブデータを消去して最初からやり直しますか？\n（この操作は取り消せません）")) {
        localStorage.removeItem('japan_museum_save');
        location.reload();
    }
}

function renderJapanMap() {
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
            if (rate < 80) {
                img.style.zIndex = '10';
            } else {
                img.style.zIndex = '15';
            }

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
        container.style.display = 'none !important';
        container.setAttribute('style', 'display: none !important;');
        return;
    }

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
    document.getElementById('player-gold').innerText = playerStats.gold;

    let sum = 0;
    let count = 0;
    PREFECTURE_DATA.forEach(p => {
        const rate = playerStats.excavationRates[p.id] || 0;
        sum += rate;
        if (rate > 0) count++;
    });
    const avg = Math.round(sum / PREFECTURE_DATA.length);
    document.getElementById('total-completion').innerText = avg;
    document.getElementById('total-count').innerText = count;

    if (!playerStats.toolLevels.hammer) playerStats.toolLevels.hammer = 1;

    document.getElementById('hammer-level').innerText = playerStats.toolLevels.hammer;
    document.getElementById('hammer-cost').innerText = playerStats.toolLevels.hammer * 120;
    document.getElementById('brush-level').innerText = playerStats.toolLevels.brush;
    document.getElementById('brush-cost').innerText = playerStats.toolLevels.brush * 100;
}

function openShop() {
    document.getElementById('shop-modal').style.display = 'flex';
}

function closeShop() {
    document.getElementById('shop-modal').style.display = 'none';
}

function upgradeTool(tool) {
    const level = playerStats.toolLevels[tool] || 1;
    let cost = level * 100;
    if (tool === 'hammer') cost = level * 120;

    if (playerStats.gold >= cost) {
        playerStats.gold -= cost;
        playerStats.toolLevels[tool] = level + 1;
        saveGame();
        updateUI();
    } else {
        alert("お金が足りません！");
    }
}

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

function openAreaSelect() {
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

    carouselRegions.forEach((regionName, idx) => {
        const regionPrefs = PREFECTURE_DATA.filter(p => p.region === regionName);
        const totalCount = regionPrefs.length;
        const foundCount = regionPrefs.filter(p => (playerStats.excavationRates[p.id] || 0) > 0).length;

        const details = (typeof REGION_DETAILS !== 'undefined' && REGION_DETAILS[regionName]) 
            ? REGION_DETAILS[regionName] 
            : { feature: '---', hint: '---' };

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

        const bgImgPath = chisoImageMap[regionName] || 'image/chiso.png';

        const card = document.createElement('div');
        card.className = 'area-card';
        card.dataset.index = idx;
        card.style.setProperty('--bg-chiso-img', `url('${bgImgPath}')`);
        card.innerHTML = `
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
                <button class="btn btn-accent btn-start-excavate" onclick="onCardClick(event, ${idx}, '${regionName}')">この場所を発掘する</button>
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

    document.getElementById('area-select-modal').style.display = 'flex';
}

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

function moveCarousel(dir) {
    if (carouselRegions.length === 0) return;
    carouselIndex = (carouselIndex + dir + carouselRegions.length) % carouselRegions.length;
    updateCarousel();
}

function setCarouselIndex(idx) {
    carouselIndex = idx;
    updateCarousel();
}

function onCardClick(event, idx, regionName) {
    event.stopPropagation();
    if (idx !== carouselIndex) {
        setCarouselIndex(idx);
    } else {
        startAreaExcavation(regionName);
    }
}

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

function closeAreaSelect() {
    document.getElementById('area-select-modal').style.display = 'none';
}

function openEncyclopedia(prefId) {
    const pref = PREFECTURE_DATA.find(p => p.id === prefId);
    if (!pref) return;

    const rate = playerStats.excavationRates[pref.id] || 0;
    const count = playerStats.excavationCounts[pref.id] || 0;

    document.getElementById('modal-pref-name').innerText = pref.name;
    document.getElementById('modal-pref-kana').innerText = pref.kana ? `【${pref.kana}】` : '';
    document.getElementById('modal-capital').innerText = pref.capital;
    document.getElementById('modal-region').innerText = `${pref.region}地層`;
    document.getElementById('modal-completion-rate').innerText = `${rate}%`;
    document.getElementById('modal-excavation-count').innerText = `${count}回`;
    document.getElementById('modal-specialty').innerText = pref.specialty;
    document.getElementById('modal-landmark').innerText = pref.landmark;

    drawEncyclopediaCanvas(pref, rate);

    document.getElementById('encyclopedia-modal').style.display = 'flex';
}

function drawEncyclopediaCanvas(pref, rate) {
    const canvas = document.getElementById('modal-canvas');
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

function closeEncyclopedia() {
    document.getElementById('encyclopedia-modal').style.display = 'none';
}

function openSettings() {
    updateSettingsUI();
    document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

function updateSettingsUI() {
    const bgmBtn = document.getElementById('btn-toggle-bgm');
    const seBtn = document.getElementById('btn-toggle-se');
    if (bgmBtn) bgmBtn.innerText = audioSettings.bgm ? 'ON' : 'OFF';
    if (seBtn) seBtn.innerText = audioSettings.se ? 'ON' : 'OFF';
}

function toggleBGM() {
    audioSettings.bgm = !audioSettings.bgm;
    if (bgmAudio) {
        if (audioSettings.bgm) {
            bgmAudio.play().catch(e => console.log(e));
        } else {
            bgmAudio.pause();
        }
    }
    updateSettingsUI();
}

function toggleSE() {
    audioSettings.se = !audioSettings.se;
    updateSettingsUI();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`全画面表示に失敗しました: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}