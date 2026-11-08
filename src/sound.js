// Small synthesized cues: no audio files to download. Every cue checks the
// mute toggle at play time, so a later toggle always wins.
const CUES = {
  correct: { notes: [523, 659, 784], step: 0.09, length: 0.16, type: "sine" },
  streak: {
    notes: [523, 659, 784, 1047],
    step: 0.07,
    length: 0.18,
    type: "triangle",
  },
  wrong: {
    notes: [330, 262],
    step: 0.12,
    length: 0.2,
    type: "sine",
    gain: 0.05,
  },
  lock: { notes: [880], step: 0, length: 0.06, type: "triangle", gain: 0.04 },
  tick: { notes: [1175], step: 0, length: 0.04, type: "square", gain: 0.015 },
  spin: {
    notes: [392, 440, 494, 523],
    step: 0.05,
    length: 0.06,
    type: "triangle",
    gain: 0.035,
  },
  start: { notes: [392, 523], step: 0.1, length: 0.14, type: "sine" },
  unlock: {
    notes: [784, 988, 1175, 1568],
    step: 0.08,
    length: 0.22,
    type: "sine",
    gain: 0.05,
  },
  finish: {
    notes: [523, 659, 784, 659, 1047],
    step: 0.11,
    length: 0.24,
    type: "sine",
  },
  level: {
    notes: [659, 784, 988, 1319],
    step: 0.09,
    length: 0.26,
    type: "triangle",
    gain: 0.05,
  },
};

export function createSound(enabled) {
  let context = null;
  return {
    play(name) {
      const cue = CUES[name];
      if (!cue || !enabled()) return;
      try {
        context ||= new (window.AudioContext || window.webkitAudioContext)();
        context.resume().catch(() => {});
        const start = context.currentTime + 0.01;
        cue.notes.forEach((frequency, i) => {
          const at = start + i * cue.step;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = cue.type;
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(cue.gain ?? 0.07, at + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + cue.length);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(at);
          oscillator.stop(at + cue.length + 0.02);
        });
      } catch {
        /* Sound is optional. */
      }
    },
  };
}
