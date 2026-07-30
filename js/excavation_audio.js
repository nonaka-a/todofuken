function playHammerSound() {
    const soundIndex = Math.random() < 0.5 ? 1 : 2;
    const audio = new Audio(`sounds/block_destruction${soundIndex}.mp3`);
    audio.volume = 0.6;
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play blocked", e));
}