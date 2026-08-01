let lastBrushSoundTime = 0;

function playHammerSound() {
    if (typeof audioSettings !== 'undefined' && !audioSettings.se) return;
    const soundIndex = Math.random() < 0.5 ? 1 : 2;
    const audio = new Audio(`sounds/block_destruction${soundIndex}.mp3`);
    audio.volume = 0.6;
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play blocked", e));
}

function playBrushSound() {
    if (typeof audioSettings !== 'undefined' && !audioSettings.se) return;
    const now = Date.now();
    if (now - lastBrushSoundTime < 1000) return; // 1秒間のクールダウン
    lastBrushSoundTime = now;

    const brushSounds = ['sounds/Brush1.mp3', 'sounds/Brush2.mp3', 'sounds/Brush3.mp3'];
    const selectedSound = brushSounds[Math.floor(Math.random() * brushSounds.length)];
    const audio = new Audio(selectedSound);
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play blocked", e));
}