let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
  }
  return audioContext;
}

export function playPopSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Use Sine for the softest possible pop
    osc.type = "sine";

    // Higher pitch for a "cuter" feel (800Hz -> 300Hz)
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.error("Audio play failed:", e);
  }
}

export function playMatchSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    // Create a "twinkle" effect with two staggered high-pitch oscillators
    const playNote = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + delay + 0.2,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    };

    playNote(880, 0); // A5
    playNote(1174.66, 0.05); // D6
    playNote(1396.91, 0.1); // F6
  } catch (e) {
    console.error("Audio play failed:", e);
  }
}

export function playErrorSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Soft "plop" instead of a harsh thud
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.error("Audio play failed:", e);
  }
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    // High pitch C major arpeggio for a sparkly finish
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];

    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(
        0.15,
        ctx.currentTime + i * 0.08 + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + i * 0.08 + 0.3,
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  } catch (e) {
    console.error("Audio play failed:", e);
  }
}

// Background music player for PopCardView - Using local MP3 file
let backgroundMusicAudio: HTMLAudioElement | null = null;
let isBackgroundMusicPlaying = false;

export function playBackgroundMusic() {
  try {
    if (isBackgroundMusicPlaying) {
      return;
    }

    stopBackgroundMusic();

    // Using "Miscellaneous Thoughts" from local public folder
    backgroundMusicAudio = new Audio("/miscellaneous-thoughts.mp3");
    backgroundMusicAudio.loop = true;
    backgroundMusicAudio.volume = 0.3; // 30% volume

    backgroundMusicAudio.play().catch((e) => {
      console.log("Background music autoplay was prevented:", e);
    });

    isBackgroundMusicPlaying = true;
  } catch (e) {
    console.error("Background music play failed:", e);
  }
}

export function stopBackgroundMusic() {
  try {
    if (backgroundMusicAudio) {
      backgroundMusicAudio.pause();
      backgroundMusicAudio.currentTime = 0;
      backgroundMusicAudio = null;
    }
    isBackgroundMusicPlaying = false;
  } catch (e) {
    console.error("Background music stop failed:", e);
  }
}
