let _ac = null;

async function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!_ac) {
    _ac = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Chrome suspends AudioContext until a user gesture — resume it
  if (_ac.state === 'suspended') {
    await _ac.resume();
  }
  return _ac;
}

async function playTone(notes, masterVol = 0.18) {
  const ac = await getCtx();
  if (!ac) return;
  let t = ac.currentTime + 0.01;
  notes.forEach(([freq, dur, vol = 1, type = 'sine', gap = 0]) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(masterVol * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur * 0.6 + gap;
  });
}

// Returns a promise that resolves after the sound finishes
export function playLoginSuccess() {
  // Ascending chime: E5 → G#5 → B5
  return new Promise(resolve => {
    playTone([
      [659, 0.15, 1,   'sine'],
      [830, 0.15, 0.9, 'sine'],
      [988, 0.28, 1,   'sine'],
    ], 0.22).then(() => setTimeout(resolve, 480));
  });
}

export async function playLogout() {
  // Soft descending: G4 → E4
  await playTone([
    [392, 0.20, 1,   'sine'],
    [330, 0.28, 0.8, 'sine'],
  ], 0.16);
}

export async function playError() {
  // Short buzzy alert: 3 descending harsh pulses
  await playTone([
    [280, 0.09, 1,   'sawtooth', 0.02],
    [220, 0.09, 0.9, 'sawtooth', 0.02],
    [180, 0.15, 0.8, 'square'],
  ], 0.20);
}
