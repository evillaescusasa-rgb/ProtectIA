// ================================================================
// ProtectA Escolar — music.js
// Motor de música ambiental procedural (Web Audio API)
// Tema: Calma, esperanza, protección — Escala pentatónica mayor
// ================================================================

(function () {
  'use strict';

  // ── Estado persistente entre páginas ──────────────────────────────
  const STORAGE_KEY = 'protecta_music_enabled';
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let scheduleTimer = null;
  let nextNoteTime = 0;
  let currentStep = 0;
  let padNodes = [];

  // ── Escala pentatónica mayor en Do (Hz) ── C D E G A ─────────────
  // Tres octavas para variedad melódica
  const PENTA = [
    130.81, 146.83, 164.81, 196.00, 220.00,  // C3 D3 E3 G3 A3
    261.63, 293.66, 329.63, 392.00, 440.00,  // C4 D4 E4 G4 A4
    523.25, 587.33, 659.25, 783.99, 880.00   // C5 D5 E5 G5 A5
  ];

  // Melodía principal — índices sobre PENTA
  const MELODY_SEQ = [
    // Frase 1 — ascendente suave
    { idx: 5, dur: 0.9, oct: 0 },
    { idx: 6, dur: 0.45, oct: 0 },
    { idx: 7, dur: 0.45, oct: 0 },
    { idx: 9, dur: 1.2, oct: 0 },
    // Frase 2 — giro empático
    { idx: 9, dur: 0.45, oct: 0 },
    { idx: 7, dur: 0.45, oct: 0 },
    { idx: 6, dur: 0.9, oct: 0 },
    { idx: 5, dur: 1.5, oct: 0 },
    // Frase 3 — arco ascendente
    { idx: 5, dur: 0.45, oct: 0 },
    { idx: 7, dur: 0.45, oct: 0 },
    { idx: 9, dur: 0.45, oct: 0 },
    { idx: 11, dur: 0.45, oct: 0 },
    { idx: 12, dur: 1.8, oct: 0 },
    // Frase 4 — resolución tranquila
    { idx: 11, dur: 0.45, oct: 0 },
    { idx: 9, dur: 0.45, oct: 0 },
    { idx: 7, dur: 0.45, oct: 0 },
    { idx: 5, dur: 2.4, oct: 0 },
  ];

  // Acordes de pad (voces de fondo) — Hz absolutos
  const PAD_CHORDS = [
    [130.81, 164.81, 196.00, 261.63],  // C maj
    [146.83, 174.61, 220.00, 293.66],  // D min7 (suave)
    [130.81, 164.81, 220.00, 261.63],  // C maj add9
    [110.00, 164.81, 196.00, 246.94],  // Am
  ];

  // ── Crear contexto de audio ────────────────────────────────────────
  function createContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Reverb simple con ConvolverNode sintético
    createReverb().then(reverb => {
      masterGain.connect(reverb);
      reverb.connect(audioCtx.destination);
    });
  }

  // ── Reverb sintético (impulso exponencial) ─────────────────────────
  async function createReverb() {
    const convolver = audioCtx.createConvolver();
    const duration = 3.0;
    const decay = 2.0;
    const sampleRate = audioCtx.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    convolver.buffer = impulse;

    const reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.18;
    convolver.connect(reverbGain);
    reverbGain.connect(audioCtx.destination);
    return convolver;
  }

  // ── Sintetizador de nota — timbre suave tipo kalimba/bells ─────────
  function playNote(freq, startTime, duration, gainVal = 0.18) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Detuning ligero para calidez
    const detune = audioCtx.createOscillator();
    detune.type = 'triangle';
    detune.frequency.setValueAtTime(freq * 1.003, startTime);
    const detuneGain = audioCtx.createGain();
    detuneGain.gain.value = gainVal * 0.25;
    detune.connect(detuneGain);
    detuneGain.connect(filter);

    // Filtro paso-bajo suave
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    filter.Q.value = 0.8;

    // Envolvente ADSR
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(gainVal, startTime + 0.04);
    env.gain.exponentialRampToValueAtTime(gainVal * 0.6, startTime + 0.15);
    env.gain.setValueAtTime(gainVal * 0.6, startTime + duration - 0.25);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    detune.start(startTime);
    detune.stop(startTime + duration + 0.05);
  }

  // ── Pad ambiente ──────────────────────────────────────────────────
  function startPad(chordIdx) {
    stopPad();
    const freqs = PAD_CHORDS[chordIdx % PAD_CHORDS.length];
    const now = audioCtx.currentTime;

    freqs.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      const env = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;

      // LFO para vibrato suave
      lfo.type = 'sine';
      lfo.frequency.value = 0.3 + i * 0.07;
      lfoGain.gain.value = freq * 0.004;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = 'lowpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.5;

      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.032, now + 2.5);

      osc.connect(filter);
      filter.connect(env);
      env.connect(masterGain);

      osc.start(now);
      lfo.start(now);

      padNodes.push({ osc, lfo, env });
    });
  }

  function stopPad() {
    const now = audioCtx ? audioCtx.currentTime : 0;
    padNodes.forEach(({ osc, lfo, env }) => {
      try {
        env.gain.setValueAtTime(env.gain.value, now);
        env.gain.linearRampToValueAtTime(0.0001, now + 1.5);
        osc.stop(now + 1.6);
        lfo.stop(now + 1.6);
      } catch (_) {}
    });
    padNodes = [];
  }

  // ── Bajo ambiental ─────────────────────────────────────────────────
  function playBass(freq, startTime, duration) {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq / 2; // Una octava abajo

    filter.type = 'lowpass';
    filter.frequency.value = 350;

    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.09, startTime + 0.3);
    env.gain.setValueAtTime(0.09, startTime + duration - 0.5);
    env.gain.linearRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  // ── Programador de melodía ────────────────────────────────────────
  const LOOK_AHEAD = 0.1;      // segundos adelante a programar
  const SCHEDULE_INTERVAL = 80; // ms entre comprobaciones

  function scheduler() {
    if (!isPlaying || !audioCtx) return;

    while (nextNoteTime < audioCtx.currentTime + LOOK_AHEAD) {
      const step = MELODY_SEQ[currentStep % MELODY_SEQ.length];
      const freq = PENTA[step.idx];
      const dur = step.dur * 0.88; // Duración real (articulación)

      playNote(freq, nextNoteTime, dur, 0.20);

      // Cambio de pad cada 4 frases
      if (currentStep % 16 === 0) {
        const chordIdx = Math.floor(currentStep / 16) % PAD_CHORDS.length;
        startPad(chordIdx);
        // Nota de bajo en el tónica
        const bassFreq = PENTA[Math.floor(step.idx / 5) * 5];
        playBass(bassFreq, nextNoteTime, step.dur * 4);
      }

      nextNoteTime += step.dur;
      currentStep++;

      // Reiniciar secuencia con pequeña variación
      if (currentStep >= MELODY_SEQ.length) {
        currentStep = 0;
        // Breve silencio entre repeticiones
        nextNoteTime += 1.2;
      }
    }

    scheduleTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
  }

  // ── Fade in/out del volumen maestro ───────────────────────────────
  function fadeIn() {
    if (!masterGain) return;
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0.75, now + 3.0);
  }

  function fadeOut(cb) {
    if (!masterGain) { if (cb) cb(); return; }
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0.0001, now + 2.0);
    setTimeout(() => { if (cb) cb(); }, 2100);
  }

  // ── API pública ───────────────────────────────────────────────────
  function startMusic() {
    if (isPlaying) return;
    createContext();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.3;
    currentStep = 0;
    startPad(0);
    fadeIn();
    scheduler();

    localStorage.setItem(STORAGE_KEY, 'true');
    updateButton(true);
  }

  function stopMusic() {
    if (!isPlaying) return;
    isPlaying = false;
    clearTimeout(scheduleTimer);
    fadeOut(() => stopPad());
    localStorage.setItem(STORAGE_KEY, 'false');
    updateButton(false);
  }

  function toggleMusic() {
    if (isPlaying) {
      stopMusic();
    } else {
      startMusic();
    }
  }

  // ── UI: Botón flotante de música ──────────────────────────────────
  function createMusicButton() {
    if (document.getElementById('music-player-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'music-player-btn';
    btn.setAttribute('aria-label', 'Activar música ambiental');
    btn.setAttribute('title', 'Música ambiental');
    btn.innerHTML = getMusicIcon(false);
    btn.addEventListener('click', () => {
      toggleMusic();
    });
    document.body.appendChild(btn);

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'music-tooltip';
    tooltip.textContent = 'Música desactivada';
    document.body.appendChild(tooltip);

    btn.addEventListener('mouseenter', () => {
      tooltip.classList.add('visible');
      tooltip.textContent = isPlaying ? 'Pausar música' : 'Activar música';
    });
    btn.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  }

  function getMusicIcon(playing) {
    return playing
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
           <line x1="10" y1="15" x2="10" y2="3"/><line x1="14" y1="15" x2="14" y2="3"/>
           <path d="M10 15 Q10 19 6 21 Q2 23 2 19 Q2 15 6 13 Q10 11 10 15Z"/>
           <path d="M14 15 Q14 19 10 21"/>
           <rect x="17" y="6" width="4" height="8" rx="1"/>
           <rect x="22" y="9" width="2" height="6" rx="1"/>
         </svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M9 18V5l12-2v13"/>
           <circle cx="6" cy="18" r="3"/>
           <circle cx="18" cy="16" r="3"/>
         </svg>`;
  }

  function updateButton(playing) {
    const btn = document.getElementById('music-player-btn');
    const tooltip = document.getElementById('music-tooltip');
    if (!btn) return;

    btn.innerHTML = getMusicIcon(playing);
    btn.setAttribute('aria-label', playing ? 'Pausar música' : 'Activar música');
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.classList.toggle('music-active', playing);

    // Animación de ondas cuando está activo
    btn.classList.toggle('music-playing', playing);

    if (tooltip) {
      tooltip.textContent = playing ? 'Pausar música' : 'Activar música';
    }
  }

  // ── Inicialización ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    createMusicButton();

    // Restaurar estado entre páginas
    const wasEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
    if (wasEnabled) {
      // Necesita interacción del usuario en Chrome
      const tryStart = () => {
        startMusic();
        document.removeEventListener('click', tryStart);
        document.removeEventListener('keydown', tryStart);
      };

      // Si el contexto puede iniciarse sin interacción (Safari/Firefox)
      setTimeout(() => {
        if (!isPlaying) {
          // Mostrar sugerencia visual
          const btn = document.getElementById('music-player-btn');
          if (btn) {
            btn.classList.add('music-hint');
            setTimeout(() => btn.classList.remove('music-hint'), 4000);
          }
        }
      }, 1000);

      document.addEventListener('click', tryStart, { once: true });
    }
  });

  // Exponer para depuración
  window.ProtectaMusic = { start: startMusic, stop: stopMusic, toggle: toggleMusic };

})();
