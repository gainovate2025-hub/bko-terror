// =============================================================
//  desenho.js — tudo que aparece na tela: mapa, luz, escuridão,
//  personagens, monstro, balões e efeitos de medo
// =============================================================
const cv = document.getElementById('tela');
const ctx = cv.getContext('2d');
const dk = document.createElement('canvas');      // "camada de escuridão"
const dctx = dk.getContext('2d');

function redimensionar() {
  cv.width = dk.width = window.innerWidth;
  cv.height = dk.height = window.innerHeight;
}
window.addEventListener('resize', redimensionar);
redimensionar();

// ---------- Desenha o mapa inteiro UMA vez numa imagem grande ----------
function prerenderMapa() {
  const m = C.mapa, cor = m.tema.cores;
  const c = document.createElement('canvas');
  c.width = m.L * TILE; c.height = m.A * TILE;
  const x = c.getContext('2d');
  const r = criarAleatorio(m.seed + 7);
  const floresta = m.tema.obstaculo === 'arvore';

  for (let ty = 0; ty < m.A; ty++)
    for (let tx = 0; tx < m.L; tx++) {
      const t = m.g[ty][tx], px = tx * TILE, py = ty * TILE;
      if (t === PAREDE) {
        x.fillStyle = cor.parede; x.fillRect(px, py, TILE, TILE);
        const chaoEmbaixo = ty + 1 < m.A && m.g[ty + 1][tx] !== PAREDE;
        if (chaoEmbaixo && !floresta) { x.fillStyle = cor.topo; x.fillRect(px, py + TILE - 10, TILE, 10); }
      } else {
        x.fillStyle = ((tx + ty) & 1) ? cor.chao : cor.chao2;
        x.fillRect(px, py, TILE, TILE);
      }
    }

  for (const mc of m.manchas) {
    x.fillStyle = cor.mancha;
    x.beginPath(); x.ellipse(mc.x, mc.y, mc.r, mc.r * 0.7, mc.a, 0, Math.PI * 2); x.fill();
  }

  for (let ty = 0; ty < m.A; ty++)
    for (let tx = 0; tx < m.L; tx++) {
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
      if (m.g[ty][tx] === OBST) desenharObstaculo(x, m.tema.obstaculo, cx, cy, r);
      // floresta: copas de árvore na borda da mata
      if (floresta && m.g[ty][tx] === PAREDE && VIZ4.some(([dx, dy]) => { const t = (m.g[ty + dy] || [])[tx + dx]; return t !== undefined && t !== PAREDE; })) {
        x.fillStyle = '#12261a'; bola(x, cx + (r() - 0.5) * 10, cy + (r() - 0.5) * 10, 15 + r() * 6);
        x.fillStyle = '#1b3524'; bola(x, cx - 3, cy - 3, 8 + r() * 4);
      }
    }
  C.mapaCanvas = c;
}

function desenharObstaculo(x, tipo, cx, cy, r) {
  if (tipo === 'maca') {
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(cx - 12, cy - 5, 28, 16);
    x.fillStyle = '#9aa5a1'; x.fillRect(cx - 14, cy - 8, 28, 15);
    x.fillStyle = '#d5ddd9'; x.fillRect(cx - 13, cy - 7, 8, 13);
    if (r() < 0.5) { x.fillStyle = 'rgba(120,10,10,.7)'; bola(x, cx + 4 + r() * 6, cy, 3 + r() * 3); }
  } else if (tipo === 'carteira') {
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(cx - 10, cy - 6, 24, 18);
    x.fillStyle = '#5a3d22'; x.fillRect(cx - 12, cy - 9, 24, 17);
    x.fillStyle = '#80592f'; x.fillRect(cx - 11, cy - 8, 22, 6);
  } else {
    x.fillStyle = 'rgba(0,0,0,.4)'; bola(x, cx + 3, cy + 4, 15);
    x.fillStyle = '#3b2716'; bola(x, cx, cy, 5);
    x.fillStyle = '#1d3a22'; bola(x, cx, cy - 2, 14);
    x.fillStyle = '#2a5030'; bola(x, cx - 4, cy - 6, 7);
  }
}

// ---------- Quadro a quadro ----------
function desenhar(dt, agora) {
  const W = cv.width, Hh = cv.height, eu = C.eu, m = C.mapa, tema = m.tema;
  const espectador = eu.estado === 'morto' || eu.estado === 'escapou';
  const t = agora / 1000;

  let camX = eu.x - W / 2, camY = eu.y - Hh / 2;
  if (C.tremor > 0) {
    camX += (Math.random() - 0.5) * 14 * C.tremor; camY += (Math.random() - 0.5) * 14 * C.tremor;
    C.tremor = Math.max(0, C.tremor - dt * 1.5);
  }
  if (eu.sanidade < 20 && !espectador) { camX += Math.sin(t * 1.7) * 6; camY += Math.cos(t * 1.3) * 4; }

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, Hh);
  ctx.drawImage(C.mapaCanvas, -Math.round(camX), -Math.round(camY));

  ctx.save();
  ctx.translate(-camX, -camY);

  // Saída
  const s = m.saida;
  const pulso = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.fillStyle = C.saidaAberta ? `rgba(40,200,90,${0.35 + pulso * 0.35})` : 'rgba(120,20,20,0.55)';
  ctx.fillRect((s.tx - 1) * TILE, (s.ty - 1) * TILE, TILE * 3, TILE * 3);
  ctx.strokeStyle = C.saidaAberta ? '#5dff95' : '#7a1d1d'; ctx.lineWidth = 3;
  ctx.strokeRect((s.tx - 1) * TILE + 2, (s.ty - 1) * TILE + 2, TILE * 3 - 4, TILE * 3 - 4);
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C.saidaAberta ? '#c9ffd9' : '#e0a0a0';
  ctx.fillText((C.saidaAberta ? '' : '🔒 ') + tema.saida, s.x, s.y);

  // Itens
  ctx.font = '20px sans-serif';
  for (const it of C.itens.values()) ctx.fillText(iconeItem(it), it.x, it.y + Math.sin(t * 3 + it.id) * 2);

  // Jogadores
  for (const j of Object.values(C.jogadores)) {
    if (j.estado === 'escapou') continue;
    if (j.estado === 'caido') {
      ctx.fillStyle = 'rgba(130,0,0,0.6)';
      ctx.beginPath(); ctx.ellipse(j.rx + 4, j.ry + 6, 18, 12, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    desenharPersonagem(ctx, j.perfil, j.rx, j.ry, j.rang, 1, j.estado === 'morto' ? 0.3 : 1);
  }

  // Monstro
  desenharMonstro(ctx, C.monstro, tema, t);
  ctx.restore();

  // ---------- Escuridão ----------
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, W, Hh);
  dctx.fillStyle = `rgba(0,0,0,${espectador ? 0.75 : 0.97})`;
  dctx.fillRect(0, 0, W, Hh);
  dctx.globalCompositeOperation = 'destination-out';
  for (const j of Object.values(C.jogadores)) {
    if (j.estado !== 'vivo' && j.estado !== 'caido') continue;
    const souEu = j.id === Rede.meuId;
    luzCirculo(j.rx - camX, j.ry - camY, souEu ? 70 : 45, 1);
    if (j.luz) {
      let forca = 1;
      if (souEu && eu.bateria < 15) forca = Math.random() < 0.15 ? 0.15 : 0.6 + Math.random() * 0.4;
      luzCone(j, camX, camY, j.perfil.profissao === 'eletricista' ? 400 : 320, forca);
    }
  }
  if (espectador) luzCirculo(eu.x - camX, eu.y - camY, 260, 1);
  if (C.saidaAberta) luzCirculo(s.x - camX, s.y - camY, 120, 0.8 * (0.7 + pulso * 0.3));
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(dk, 0, 0);

  // ---------- Coisas que aparecem POR CIMA do escuro ----------
  ctx.save();
  ctx.translate(-camX, -camY);
  const mo = C.monstro;
  const dM = Math.hypot(mo.rx - eu.x, mo.ry - eu.y);
  if (dM < 340) desenharOlhos(mo.rx, mo.ry, mo.ang, 1 - dM / 400);

  if (eu.perfil.profissao === 'detetive' && !espectador) {
    ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const it of C.itens.values()) {
      const d = Math.hypot(it.x - eu.x, it.y - eu.y);
      if (d > 700) continue;
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + it.id);
      ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 14;
      ctx.fillText(iconeItem(it), it.x, it.y);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  for (const j of Object.values(C.jogadores)) {
    if (j.estado === 'escapou') continue;
    const longe = Math.hypot(j.rx - eu.x, j.ry - eu.y) > 500;
    if (longe) continue;
    ctx.globalAlpha = j.estado === 'morto' ? 0.5 : 0.9;
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = j.estado === 'caido' ? '#ff6b6b' : '#e8e2d0';
    ctx.fillText(j.perfil.nome + (j.estado === 'morto' ? ' 👻' : ''), j.rx, j.ry - 26);
    ctx.globalAlpha = 1;
    const em = C.emotes[j.id];
    if (em && em.ate > agora) {
      ctx.font = '26px sans-serif';
      ctx.fillText({ acenar: '👋', grito: '😱', apontar: '👉', silencio: '🤫' }[em.e], j.rx, j.ry - 48);
    }
    const ba = C.baloes[j.id];
    if (ba && ba.ate > agora) balao(ba.txt, j.rx, j.ry - (em && em.ate > agora ? 72 : 46));
  }

  if (eu.reviver > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(eu.x - 25, eu.y + 20, 50, 7);
    ctx.fillStyle = '#5dff95'; ctx.fillRect(eu.x - 24, eu.y + 21, 48 * eu.reviver, 5);
  }
  ctx.restore();

  // Setas pros amigos fora da tela
  for (const j of Object.values(C.jogadores)) {
    if (j.id === Rede.meuId || (j.estado !== 'vivo' && j.estado !== 'caido')) continue;
    const sx = j.rx - camX, sy = j.ry - camY;
    if (sx > 0 && sx < W && sy > 0 && sy < Hh) continue;
    const ang = Math.atan2(sy - Hh / 2, sx - W / 2);
    const ex = Math.max(28, Math.min(W - 28, W / 2 + Math.cos(ang) * W));
    const ey = Math.max(28, Math.min(Hh - 28, Hh / 2 + Math.sin(ang) * Hh));
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
    ctx.fillStyle = j.estado === 'caido' ? '#ff4d4d' : j.perfil.roupa;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#e8e2d0'; ctx.textAlign = 'center';
    ctx.fillText(j.perfil.nome, ex, ey + 18);
  }

  // Medo: vinheta vermelha e olhos falsos
  if (!espectador && eu.sanidade < 50) {
    const forca = (50 - eu.sanidade) / 50;
    const gr = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.25, W / 2, Hh / 2, Math.max(W, Hh) * 0.7);
    gr.addColorStop(0, 'rgba(90,0,0,0)');
    gr.addColorStop(1, `rgba(90,0,0,${0.65 * forca * (0.85 + 0.15 * Math.sin(t * 5))})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, Hh);
    if (eu.sanidade < 30) {
      if (!C.olhosFalsos || C.olhosFalsos.ate < agora) {
        C.olhosFalsos = Math.random() < 0.5 ? null : { x: Math.random() * W, y: Math.random() * Hh, ate: agora + 600 + Math.random() * 900 };
        if (!C.olhosFalsos) C.olhosFalsos = { x: -100, y: -100, ate: agora + 1500 };
      }
      ctx.save(); ctx.translate(C.olhosFalsos.x, C.olhosFalsos.y);
      desenharOlhos(0, 0, 0, 0.6);
      ctx.restore();
    }
  }
}

function iconeItem(it) { return it.tipo === 'obj' ? C.mapa.tema.iconeObj : it.tipo === 'bateria' ? '🔋' : '💊'; }

function luzCirculo(x, y, raioLuz, forca) {
  const gr = dctx.createRadialGradient(x, y, 0, x, y, raioLuz);
  gr.addColorStop(0, `rgba(0,0,0,${forca})`);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = gr;
  dctx.beginPath(); dctx.arc(x, y, raioLuz, 0, Math.PI * 2); dctx.fill();
}

function luzCone(j, camX, camY, alcance, forca) {
  const N = 40, meia = 0.5;
  dctx.beginPath();
  dctx.moveTo(j.rx - camX, j.ry - camY);
  for (let i = 0; i <= N; i++) {
    const a = j.rang - meia + (i / N) * meia * 2;
    const d = raio(C.mapa, j.rx, j.ry, a, alcance);
    dctx.lineTo(j.rx + Math.cos(a) * d - camX, j.ry + Math.sin(a) * d - camY);
  }
  dctx.closePath();
  const gr = dctx.createRadialGradient(j.rx - camX, j.ry - camY, 0, j.rx - camX, j.ry - camY, alcance);
  gr.addColorStop(0, `rgba(0,0,0,${forca})`);
  gr.addColorStop(0.7, `rgba(0,0,0,${forca * 0.85})`);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = gr;
  dctx.fill();
}

function desenharMonstro(c, m, tema, t) {
  c.save();
  c.translate(m.rx, m.ry);
  c.fillStyle = 'rgba(0,0,0,.5)';
  c.beginPath(); c.ellipse(3, 5, 20, 16, 0, 0, Math.PI * 2); c.fill();
  c.rotate(m.ang || 0);
  c.fillStyle = tema.monstro.cor;
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    const rr = 15 + Math.sin(t * 7 + i * 1.7) * 3 + (i % 2 ? 5 : 0);
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.85);
  }
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 2; c.stroke();
  // braços compridos
  c.strokeStyle = tema.monstro.cor; c.lineWidth = 4; c.lineCap = 'round';
  const bal = Math.sin(t * 8) * 4;
  c.beginPath(); c.moveTo(4, -12); c.lineTo(24, -16 + bal); c.moveTo(4, 12); c.lineTo(24, 16 - bal); c.stroke();
  c.restore();
}

function desenharOlhos(x, y, ang, forca) {
  const ox = Math.cos(ang) * 8, oy = Math.sin(ang) * 8;
  const px = -Math.sin(ang) * 5, py = Math.cos(ang) * 5;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, forca + 0.2));
  ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#ff2a2a';
  bola(ctx, x + ox + px, y + oy + py, 2.6);
  bola(ctx, x + ox - px, y + oy - py, 2.6);
  ctx.restore();
}

function balao(txt, x, y) {
  ctx.font = '12px sans-serif';
  const w = Math.min(220, ctx.measureText(txt).width + 14);
  ctx.fillStyle = 'rgba(240,235,220,.92)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 12, w, 22, 8); else ctx.rect(x - w / 2, y - 12, w, 22);
  ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 5, y + 10); ctx.lineTo(x + 5, y + 10); ctx.lineTo(x, y + 16); ctx.fill();
  ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y - 1, 210);
}
