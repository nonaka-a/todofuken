let lastBrushSoundTime = 0;

const hammerAudioPool = [];
for (let i = 0; i < 8; i++) {
    hammerAudioPool.push(new Audio(`sounds/block_destruction${(i % 2) + 1}.mp3`));
}
let hammerPoolIndex = 0;

function playHammerSound() {
    if (typeof audioSettings !== 'undefined' && !audioSettings.se) return;
    
    const sound = hammerAudioPool[hammerPoolIndex];
    hammerPoolIndex = (hammerPoolIndex + 1) % hammerAudioPool.length;

    sound.volume = 0.6;
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Audio play blocked", e));
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