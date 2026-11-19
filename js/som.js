// =============================================================
//  som.js — sons gerados pelo próprio navegador (sem arquivos)
// =============================================================
const Som = {
  ctx: null, ambiente: [],
  pegar() {
    if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tocar(tipo, volume) {
    const a = this.pegar(); if (!a) return;
    const v = volume == null ? 1 : volume;
    if (v < 0.02) return;
    const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    const env = (pico, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pico * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.02); };
    switch (tipo) {
      case 'batida': o.type = 'sine'; o.frequency.setValueAtTime(65, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.15); env(0.7, 0.2); break;
      case 'item': o.type = 'sine'; o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.12); env(0.18, 0.18); break;
      case 'objetivo': o.type = 'triangle'; o.frequency.setValueAtTime(440, t); o.frequency.setValueAtTime(660, t + 0.12); o.frequency.setValueAtTime(880, t + 0.24); env(0.25, 0.45); break;
      case 'porta': o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(180, t + 0.8); env(0.2, 0.9); break;
      case 'grito': o.type = 'sawtooth'; o.frequency.setValueAtTime(950, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.6); env(0.22, 0.65); break;
      case 'pegou': o.type = 'square'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.7); env(0.4, 0.8); break;
      case 'rosnado': o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t); o.frequency.linearRampToValueAtTime(38, t + 1); env(0.35, 1.1); break;
      case 'sussurro': {
        o.disconnect(); o.start(t); o.stop(t + 0.01);
        const dur = 0.8, buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
        const src = a.createBufferSource(), f = a.createBiquadFilter(), g2 = a.createGain();
        f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1500; f.Q.value = 6;
        g2.gain.value = 0.25 * v;
        src.buffer = buf; src.connect(f); f.connect(g2); g2.connect(a.destination); src.start(t);
        break;
      }
    }
  },
  iniciarAmbiente() {
    const a = this.pegar(); if (!a) return;
    this.pararAmbiente();
    for (const f of [41, 41.7, 61.5]) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.045;
      o.connect(g); g.connect(a.destination); o.start();
      this.ambiente.push(o);
    }
  },
  pararAmbiente() { for (const o of this.ambiente) try { o.stop(); } catch (e) {} this.ambiente = []; },
};
