/**
 * POC Reference: Audio System (pond_craft.html lines 192-232)
 *
 * Ported to: src/audio/audio-system.ts
 *
 * Web Audio API synthesized SFX. 15 sound effects, all procedurally
 * generated with OscillatorNode. No external audio files.
 * Lazy-initialized on first user interaction.
 */

const AudioSys = {
    ctx: null, muted: false,
    init() { 
        if (this.ctx) return;
        window.AudioContext = window.AudioContext || window.webkitAudioContext; 
        this.ctx = new AudioContext(); 
    },
    play(freq, type, duration, vol=0.1, slideFreq=null) {
        if(!this.ctx || this.muted) return;
        try {
            let osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            if(slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },
    toggleMute() {
        this.muted = !this.muted;
        document.getElementById('mute-btn').textContent = this.muted ? '🔇' : '🔊';
    },
    sfx: {
        chop: () => AudioSys.play(200, 'square', 0.1, 0.05, 100),
        mine: () => AudioSys.play(400, 'sine', 0.1, 0.05, 300),
        build: () => AudioSys.play(150, 'sawtooth', 0.15, 0.05, 50),
        hit: () => AudioSys.play(90, 'sawtooth', 0.2, 0.1, 40),
        shoot: () => AudioSys.play(700, 'triangle', 0.1, 0.05, 1200),
        alert: () => AudioSys.play(400, 'square', 0.8, 0.2, 300),
        ping: () => { AudioSys.play(600, 'square', 0.1, 0.1, 800); setTimeout(()=>AudioSys.play(800, 'square', 0.1, 0.1, 1000), 100); },
        click: () => AudioSys.play(800, 'sine', 0.05, 0.05),
        selectUnit: () => AudioSys.play(600, 'sine', 0.1, 0.05, 800),
        selectBuild: () => AudioSys.play(200, 'triangle', 0.1, 0.05, 150),
        upgrade: () => { AudioSys.play(300, 'square', 0.1, 0.1, 600); setTimeout(()=>AudioSys.play(400, 'square', 0.2, 0.1, 800), 100); },
        win: () => { AudioSys.play(400, 'sine', 0.2, 0.1, 600); setTimeout(()=>AudioSys.play(600, 'sine', 0.4, 0.1, 800), 200); },
        lose: () => { AudioSys.play(200, 'sawtooth', 0.4, 0.1, 100); setTimeout(()=>AudioSys.play(100, 'sawtooth', 0.6, 0.1, 50), 400); },
        heal: () => AudioSys.play(500, 'sine', 0.15, 0.04, 700),
        error: () => AudioSys.play(150, 'square', 0.15, 0.08, 80),
    }
};
