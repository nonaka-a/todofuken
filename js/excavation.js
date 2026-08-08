let activePrefecture = null;
let excavationTimer = null;
let secondsLeft = 60;
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

let activeRockFragments = [];
let fragmentAnimFrame = null;

function startAreaExcavation(regionName) {
    closeAreaSelect();
    const prefs = PREFECTURE_DATA.filter(p => p.region === regionName);
    if (prefs.length === 0) {
        alert("この場所はまだ探せません。");
        return;
    }

    playerStats.lastRegion = regionName;
    saveGame();

    // 地域の全都道府県が一度以上発掘済み（全パーツ発見済み）かチェック
    const isAllDiscovered = prefs.every(p => (playerStats.excavationRates[p.id] || 0) > 0);

    const weightedPrefs = [];
    prefs.forEach(p => {
        const rate = playerStats.excavationRates[p.id] || 0;
        let weight = 1;

         if (isAllDiscovered) {
            // 全パーツ発見後：100%未満の都道府県が出やすくなるよう重み15に設定
            weight = rate < 100 ? 15 : 1;
        } else {
            // 未発掘がある場合：未発見の都道府県が出やすくなるよう重み15に設定
            weight = rate === 0 ? 15 : 1;
        }

        for (let i = 0; i < weight; i++) {
            weightedPrefs.push(p);
        }
    });

    activePrefecture = weightedPrefs[Math.floor(Math.random() * weightedPrefs.length)];
    initExcavationGame();
}

function initExcavationGame() {
    const visitors = document.getElementById('museum-visitors');
    if (visitors) {
        visitors.style.display = 'none';
    }

    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('excavation-screen').classList.add('active');

    const isDiscovered = (playerStats.excavationRates[activePrefecture.id] || 0) > 0;
    document.getElementById('target-prefecture-name').innerText = isDiscovered ? activePrefecture.name : '？？？';

    excavationScore = 0;
    activeTool = 'hammer';
    lastDustTime = 0;
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

    // 既存のイベントをリセット
    topCanvas.onmousedown = null;
    topCanvas.onmousemove = null;
    topCanvas.onmouseup = null;
    topCanvas.onmouseleave = null;

    // マウスイベント設定
    topCanvas.onmousedown = handleStart;
    topCanvas.onmousemove = handleMove;
    topCanvas.onmouseup = handleEnd;
    topCanvas.onmouseleave = handleEnd;

    // タッチイベント設定（連打時のジェスチャー判定による遅延・不具合を防止）
    const touchStartHandler = (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        if (touch) {
            handleStart({ clientX: touch.clientX, clientY: touch.clientY });
        }
    };

    const touchMoveHandler = (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        if (touch) {
            handleMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    };

    const touchEndHandler = (event) => {
        event.preventDefault();
        handleEnd();
    };

    topCanvas.removeEventListener('touchstart', topCanvas._ts);
    topCanvas.removeEventListener('touchmove', topCanvas._tm);
    topCanvas.removeEventListener('touchend', topCanvas._te);
    topCanvas.removeEventListener('touchcancel', topCanvas._te);

    topCanvas._ts = touchStartHandler;
    topCanvas._tm = touchMoveHandler;
    topCanvas._te = touchEndHandler;

    topCanvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    topCanvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    topCanvas.addEventListener('touchend', touchEndHandler, { passive: false });
    topCanvas.addEventListener('touchcancel', touchEndHandler, { passive: false });

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
        
        excavationScore = calculateExcavationScore();
        updateScoreDisplay();

        if (secondsLeft <= 0) finishExcavation();
    }, 1000);
}

function setTool(tool) {
    activeTool = tool;
    const hammerBtn = document.getElementById('tool-hammer');
    if(hammerBtn) hammerBtn.classList.toggle('active', tool === 'hammer');
    document.getElementById('tool-brush').classList.toggle('active', tool === 'brush');
}

function handleStart(event) {
    isDrawing = true;
    scratch(event);
}

function handleMove(event) {
    if (!isDrawing) return;
    if (activeTool === 'hammer') return;
    scratch(event);
}

function handleEnd() {
    isDrawing = false;
    
    if (fossilReady) {
        excavationScore = calculateExcavationScore();
        updateScoreDisplay();
    }
}



let lastHammerTime = 0;
let lastFragmentTime = 0;
let lastBrushTime = 0;

function scratch(event) {
    if (!fossilReady) return;

    const point = getCanvasPoint(event);
    const brushLevel = playerStats.toolLevels.brush || 1;
    const hammerLevel = playerStats.toolLevels.hammer || 1;

    if (activeTool === 'hammer') {
        const now = Date.now();
        if (now - lastHammerTime < 70) return;
        lastHammerTime = now;

        const hammerType = playerStats.equippedHammer || 'normal';
        let radius = 50; 

        if (hammerType === 'silver' || hammerType === 'gold') {
            radius = 70; 
        }

        // 地層ごとの特徴による半径・形状の補正計算
        const region = activePrefecture ? activePrefecture.region : '';
        let scaleX = 1.0;
        let scaleY = 1.0;

        if (region === 'トウホク' || region === 'カントー') {
            // 柔らかい（大破壊・欠けやすい）
            radius *= 1.8;
        } else if (region === 'チュウブ') {
            // 硬い（小破壊）
            radius *= 0.7;
        } else if (region === 'キンキ' || region === 'キュウシュー') {
            // 硬淡混在（ランダムサイズ 0.5〜1.8倍：約25px〜90px）
            radius *= (0.5 + Math.random() * 1.3);
        } else if (region === 'チュウゴク' || region === 'シコク') {
            // 横長ひび割れ（X方向をさらに拡大・Y方向をさらに縮小）
            scaleX = 2.4 + (Math.random() - 0.5) * 0.4;
            scaleY = 0.5 + (Math.random() - 0.5) * 0.1;
        }

        playHammerSound();

        if (hammerType !== 'gold') {
            checkAreaDamageFossil(point.x, point.y, radius * 0.65);
        }

        removeRockRandomShape(point.x, point.y, radius, scaleX, scaleY);
        // spawnHammerFragments の呼び出しは元のまま。間引きロジックは spawnHammerFragments 内部に実装。
        if (typeof spawnHammerFragments === 'function') {
            spawnHammerFragments(point.x, point.y, radius);
        }
    } else if (activeTool === 'brush') {
        const now = Date.now();
        // iPadでの高速スワイプ時に描画とDOM生成が暴走してフリーズするのを防ぐため、40ms間隔に制御
        if (now - lastBrushTime < 40) return;
        lastBrushTime = now;

        playBrushSound();
        
        let radius = 18;
        let opacity = 0.18; 

        if (brushLevel === 2) {
            radius = 26;   
            opacity = 0.34;
        } else if (brushLevel >= 3) {
            radius = 36;   
            opacity = 0.50;
        }

        removeRockIrregular(point.x, point.y, radius, opacity);
        createDustParticles(point.x, point.y);
    }
}

function checkAreaDamageFossil(centerX, centerY, checkRadius) {
    if (!targetMaskData) return;

    const startX = Math.max(0, Math.floor(centerX - checkRadius));
    const startY = Math.max(0, Math.floor(centerY - checkRadius));
    const endX = Math.min(topCanvas.width - 1, Math.ceil(centerX + checkRadius));
    const endY = Math.min(topCanvas.height - 1, Math.ceil(centerY + checkRadius));
    // モバイル端末での連打処理落ちを防ぐため、サンプリング間隔を拡大
    const step = 8;

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

// パフォーマンス低下の原因となっていた cleanupTopAlpha 関数を完全に削除しました。
// 理由は、destination-out の描画において globalAlpha = 1.0 が適用されていれば、アルファ値のクリーンナップは不要であるためです。

function removeRockRandomShape(centerX, centerY, baseRadius, scaleX = 1.0, scaleY = 1.0) {
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
        const px = centerX + Math.cos(angle) * r * scaleX;
        const py = centerY + Math.sin(angle) * r * scaleY;
        if (i === 0) topCtx.moveTo(px, py);
        else topCtx.lineTo(px, py);
    }
    topCtx.closePath();
    topCtx.fill();
    topCtx.restore();

    // cleanupTopAlpha の呼び出しを削除し、大幅な軽量化を実現。
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
    const pointsCount = 6 + Math.floor(Math.random() * 4);
    const startAngle = Math.random() * Math.PI * 2;
    const points = [];

    for (let i = 0; i < pointsCount; i++) {
        const angle = startAngle + (Math.PI * 2 * i) / pointsCount + (Math.random() - 0.5) * 0.4;
        const randomFactor = 0.5 + Math.random() * 0.7;
        const r = radius * randomFactor;
        points.push({
            x: x + Math.cos(angle) * r,
            y: y + Math.sin(angle) * r
        });
    }

    fossilLayerCtx.save();
    fossilLayerCtx.globalCompositeOperation = 'destination-out';
    fossilLayerCtx.beginPath();
    points.forEach((p, i) => {
        if (i === 0) fossilLayerCtx.moveTo(p.x, p.y);
        else fossilLayerCtx.lineTo(p.x, p.y);
    });
    fossilLayerCtx.closePath();
    fossilLayerCtx.fill();
    fossilLayerCtx.restore();

    damageMaskCtx.beginPath();
    points.forEach((p, i) => {
        if (i === 0) damageMaskCtx.moveTo(p.x, p.y);
        else damageMaskCtx.lineTo(p.x, p.y);
    });
    damageMaskCtx.closePath();
    damageMaskCtx.fillStyle = '#fff';
    damageMaskCtx.fill();

    drawUnderground();
    showDamageEffect(x, y);
}

function calculateExcavationScore() {
    if (!outlineMaskData || !targetMaskData || !bufferMaskData || !targetBounds) return 0;

    const soilData = topCtx.getImageData(0, 0, topCanvas.width, topCanvas.height).data;
    const damageData = damageMaskCtx.getImageData(0, 0, damageMaskCanvas.width, damageMaskCanvas.height).data;
    const sampleStep = 4;

    let currentRockPixelCount = 0;
    let targetTotal = 0;
    let targetSurfaceCleared = 0;
    let damagedCount = 0;

    let outlineTotal = 0;
    let outlineCleared = 0;

    let bufferTotal = 0;
    let bufferCleared = 0;

    for (let y = 0; y < topCanvas.height; y += sampleStep) {
        for (let x = 0; x < topCanvas.width; x += sampleStep) {
            const offset = (y * topCanvas.width + x) * 4;
            const isTarget = targetMaskData[offset + 3] > 40;
            const isOutline = outlineMaskData[offset + 3] > 40;
            const isBuffer = bufferMaskData[offset + 3] > 40;
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

            if (isBuffer) {
                bufferTotal++;
                if (isCleared) bufferCleared++;
            }
        }
    }

    const rockClearedRatio = Math.max(0, 1 - (currentRockPixelCount / initialRockPixelCount));
    const surfaceRatio = targetTotal > 0 ? targetSurfaceCleared / targetTotal : 0;
    const outlineRatio = outlineTotal > 0 ? outlineCleared / outlineTotal : 0;
    const bufferRatio = bufferTotal > 0 ? bufferCleared / bufferTotal : 0;

    // 配分: 全体岩削減 15点 / パーツ周辺バッファ 25点 / 輪郭露出 30点 / 表面露出 30点
    const overallRockScore = rockClearedRatio * 15;
    const bufferScore = bufferRatio * 25;
    const outlineScore = outlineRatio * 30;
    const surfaceScore = surfaceRatio * 30;

    const rawScore = overallRockScore + bufferScore + outlineScore + surfaceScore;

    const damagePenalty = Math.max(0, 1 - (damagedCount / (targetTotal * 0.4)));
    
    const finalScore = Math.round(rawScore * damagePenalty);
    return Math.max(0, Math.min(100, finalScore));
}

function updateScoreDisplay() {
    document.getElementById('current-integrity').innerText = Math.round(excavationScore);
}

function showCustomConfirm(message, onOk) {
    const modal = document.getElementById('confirm-modal');
    const msgElem = document.getElementById('confirm-message');
    const okBtn = document.getElementById('btn-confirm-ok');
    const cancelBtn = document.getElementById('btn-confirm-cancel');

    msgElem.innerText = message;
    modal.style.display = 'flex';

    const handleOk = () => {
        cleanup();
        modal.style.display = 'none';
        onOk();
    };

    const handleCancel = () => {
        cleanup();
        modal.style.display = 'none';
    };

    const cleanup = () => {
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
}

function confirmAbort() {
    showCustomConfirm("発掘をやめて展示室にもどりますか？\n（途中の作業は保存されません）", () => {
        clearInterval(excavationTimer);
        if (fragmentAnimFrame) cancelAnimationFrame(fragmentAnimFrame);
        returnToMuseum();
    });
}

function finishExcavationEarly() {
    showCustomConfirm("発掘を終了して結果画面へ進みますか？", () => {
        finishExcavation();
    });
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
    const isSuccess = score >= 40;
    const previousScore = playerStats.excavationRates[activePrefecture.id] || 0;
    const isFirstTime = previousScore === 0;
    const reward = isSuccess ? Math.round(score * 2.5) : 0;

    const resultImgData = captureExcavationResult();

    if (isSuccess) {
        if (score > previousScore) {
            playerStats.excavationRates[activePrefecture.id] = score;
            playerStats.excavationImages[activePrefecture.id] = resultImgData;
        }

        playerStats.excavationCounts[activePrefecture.id] = (playerStats.excavationCounts[activePrefecture.id] || 0) + 1;
        playerStats.gold += reward;
        saveGame();
    }

    const resultBtn = document.querySelector('#result-modal .btn-accent');
    if (resultBtn) {
        resultBtn.innerText = isSuccess ? "展示室にかざる" : "展示室へもどる";
    }

    document.getElementById('result-first-tag').style.display = (isSuccess && isFirstTime) ? 'block' : 'none';
    document.getElementById('result-fossil-img').src = resultImgData;
    document.getElementById('result-pref-display').innerText = isSuccess ? `${activePrefecture.name}の化石` : "？？？の化石";
    document.getElementById('result-score').innerText = score;
    document.getElementById('result-reward-gold').innerText = reward;
    document.getElementById('result-message').innerText = isSuccess
        ? (score >= 80 ? "見事に形を残して発掘できました！" : "形は見えてきましたが、もう少し丁寧に掘れそうです。")
        : "原型をとどめていないため、化石の特定に失敗しました…";

    document.getElementById('result-modal').style.display = 'flex';

    if (typeof audioSettings === 'undefined' || audioSettings.se) {
        if (isSuccess && isFirstTime) {
            // iPad等のiOS端末向けにWeb Audio再生の確実性を高める処理
            let playApplause = () => {
                if (typeof globalApplauseAudio !== 'undefined' && globalApplauseAudio) {
                    globalApplauseAudio.currentTime = 0;
                    globalApplauseAudio.volume = 0.4;
                    globalApplauseAudio.play().catch(e => {
                        console.log("Global applause play failed, retrying with fallback", e);
                        const fallbackAudio = new Audio('sounds/Applause.mp3');
                        fallbackAudio.volume = 0.4;
                        fallbackAudio.play().catch(err => console.log("Fallback applause blocked", err));
                    });
                } else {
                    const applauseAudio = new Audio('sounds/Applause.mp3');
                    applauseAudio.volume = 0.4;
                    applauseAudio.play().catch(e => console.log("Audio play blocked", e));
                }
            };
            playApplause();
        }

        if (isSuccess) {
            // ボイスとの再生タイミングが重なってブロックされるのを防ぐためわずかに遅延させる
            setTimeout(() => {
                const prefVoice = new Audio(`sounds/voice/${activePrefecture.id}.mp3`);
                prefVoice.volume = 0.8;
                prefVoice.play().catch(e => console.log("Voice audio play blocked or file missing", e));
            }, 100);
        }
    }
}

function closeResult() {
    document.getElementById('result-modal').style.display = 'none';

    const count = activePrefecture ? (playerStats.excavationCounts[activePrefecture.id] || 0) : 0;
    const isSuccess = excavationScore >= 40;
    const isFirstPlacement = activePrefecture && count === 1 && isSuccess;

    if (isFirstPlacement) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById('museum-screen').classList.add('active');
        updateUI();
        checkAndStartPlacement(activePrefecture.id, excavationScore);
    } else {
        returnToMuseum();
        if (isSuccess && typeof checkAchievementTutorials === 'function') {
            checkAchievementTutorials();
        }
    }
}

function returnToMuseum() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('museum-screen').classList.add('active');
    renderJapanMap();
    updateUI();
}

function debugComplete100() {
    if (!fossilReady) return;

    // 上層の岩をクリア
    topCtx.clearRect(0, 0, topCanvas.width, topCanvas.height);

    // ダメージマスクをクリア
    damageMaskCtx.clearRect(0, 0, damageMaskCanvas.width, damageMaskCanvas.height);

    // 化石レイヤーを再描画（削れた部分を元に戻す）
    fossilLayerCtx.clearRect(0, 0, fossilLayerCanvas.width, fossilLayerCanvas.height);
    const image = new Image();
    image.src = `image/parts/${activePrefecture.id}.png`;
    image.onload = () => {
        const scale = Math.min(underCanvas.width / image.width, underCanvas.height / image.height) * 0.75;
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const drawX = (underCanvas.width - drawWidth) / 2;
        const drawY = (underCanvas.height - drawHeight) / 2;

        fossilLayerCtx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        drawUnderground();

        excavationScore = 100;
        updateScoreDisplay();
    };

    if (image.complete) {
        image.onload();
    }
}