// =============================================================
//  mapas.js — os lugares de terror onde o grupo fica preso
//  Cada partida gera o mapa a partir de uma "semente" (seed).
//  Mesma semente = mesmo mapa em todos os computadores.
// =============================================================
const TILE = 32;                       // tamanho de cada quadradinho em pixels
const CHAO = 0, PAREDE = 1, SAIDA = 2, OBST = 3;

const MAPAS = {
  hospital: {
    nome: 'Hospital Abandonado', icone: '🏥',
    historia: 'A van da equipe quebrou na estrada e vocês entraram num hospital desativado pra pedir ajuda. As portas trancaram sozinhas. Lá de dentro vem um barulho de rodinhas de maca...',
    tarefa: 'Achem os 4 fusíveis e religuem o elevador de carga. Ele é a única saída.',
    objetivo: 'fusível', objetivos: 'Fusíveis', iconeObj: '🔌', qtdObj: 4,
    saida: 'ELEVADOR', msgAberta: 'O elevador voltou a funcionar! Corram pra ele!',
    cores: { chao: '#4a524d', chao2: '#434a46', parede: '#3f4844', topo: '#66746d', mancha: 'rgba(110,20,20,0.35)' },
    obstaculo: 'maca', densObst: 0.03,
    monstro: { nome: 'A Enfermeira', cor: '#cfc8b8', velocidade: 122 },
    salas: { qtd: 14, min: 5, max: 10 }, corredor: 2,
  },
  escola: {
    nome: 'Escola à Noite', icone: '🏫',
    historia: 'Vocês voltaram na escola antiga pra buscar uma coisa esquecida. O sinal tocou à meia-noite e o portão fechou. Alguém continua fazendo a chamada no corredor...',
    tarefa: 'Achem as 4 chaves do molho do zelador e abram o portão.',
    objetivo: 'chave', objetivos: 'Chaves', iconeObj: '🔑', qtdObj: 4,
    saida: 'PORTÃO', msgAberta: 'O portão destrancou! Corram pra ele!',
    cores: { chao: '#5a4835', chao2: '#52412f', parede: '#4a3b56', topo: '#7c6890', mancha: 'rgba(15,15,15,0.4)' },
    obstaculo: 'carteira', densObst: 0.045,
    monstro: { nome: 'O Inspetor', cor: '#4a3f63', velocidade: 116 },
    salas: { qtd: 12, min: 6, max: 11 }, corredor: 3,
  },
  floresta: {
    nome: 'Floresta Maldita', icone: '🌲',
    historia: 'Um atalho pela mata parecia boa ideia. O GPS morreu, a van ficou sem gasolina e as árvores parecem mudar de lugar. Tem algo andando entre elas...',
    tarefa: 'Achem os 4 galões de gasolina e voltem pra van.',
    objetivo: 'galão', objetivos: 'Galões', iconeObj: '⛽', qtdObj: 4,
    saida: 'VAN', msgAberta: 'A van tem gasolina! Corram pra ela!',
    cores: { chao: '#2c4230', chao2: '#304734', parede: '#0b120c', topo: '#16261a', mancha: 'rgba(70,45,20,0.35)' },
    obstaculo: 'arvore', densObst: 0.07,
    monstro: { nome: 'O Vulto', cor: '#141414', velocidade: 128 },
    salas: { qtd: 9, min: 9, max: 15 }, corredor: 3,
  },
};

// Gerador de números "aleatórios" que sempre repete a mesma sequência pra mesma semente
function criarAleatorio(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function inteiro(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }

const VIZ4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const VIZ8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function ehSolido(t) { return t === PAREDE || t === OBST; }

function gerarMapa(chave, seed, nJogadores) {
  const tema = MAPAS[chave] || MAPAS.hospital;
  const r = criarAleatorio(seed);
  const L = 64, A = 48;
  const g = Array.from({ length: A }, () => new Array(L).fill(PAREDE));

  // 1) Salas
  const salas = [];
  for (let t = 0; t < 500 && salas.length < tema.salas.qtd; t++) {
    const w = inteiro(r, tema.salas.min, tema.salas.max);
    const h = inteiro(r, tema.salas.min, Math.max(tema.salas.min, tema.salas.max - 2));
    const x = inteiro(r, 2, L - w - 3), y = inteiro(r, 2, A - h - 3);
    if (salas.some(s => x < s.x + s.w + 2 && x + w + 2 > s.x && y < s.y + s.h + 2 && y + h + 2 > s.y)) continue;
    salas.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  for (const s of salas)
    for (let y = s.y; y < s.y + s.h; y++)
      for (let x = s.x; x < s.x + s.w; x++) g[y][x] = CHAO;

  // 2) Corredores ligando cada sala na mais próxima
  function cavar(x, y) {
    const cw = tema.corredor, m = cw >> 1;
    for (let dy = 0; dy < cw; dy++)
      for (let dx = 0; dx < cw; dx++) {
        const yy = y + dy - m, xx = x + dx - m;
        if (yy > 0 && yy < A - 1 && xx > 0 && xx < L - 1) g[yy][xx] = CHAO;
      }
  }
  function corredor(a, b) {
    let x = a.cx, y = a.cy;
    if (r() < 0.5) {
      while (x !== b.cx) { cavar(x, y); x += Math.sign(b.cx - x); }
      while (y !== b.cy) { cavar(x, y); y += Math.sign(b.cy - y); }
    } else {
      while (y !== b.cy) { cavar(x, y); y += Math.sign(b.cy - y); }
      while (x !== b.cx) { cavar(x, y); x += Math.sign(b.cx - x); }
    }
    cavar(x, y);
  }
  for (let i = 1; i < salas.length; i++) {
    let melhor = 0, md = Infinity;
    for (let j = 0; j < i; j++) {
      const d = Math.abs(salas[j].cx - salas[i].cx) + Math.abs(salas[j].cy - salas[i].cy);
      if (d < md) { md = d; melhor = j; }
    }
    corredor(salas[i], salas[melhor]);
  }
  for (let k = 0; k < 3; k++) {          // alguns caminhos extras pra dar pra fugir em círculo
    const a = salas[Math.floor(r() * salas.length)], b = salas[Math.floor(r() * salas.length)];
    if (a !== b) corredor(a, b);
  }

  // 3) Obstáculos (macas, carteiras, árvores) dentro das salas
  const sp = salas[0];
  for (const s of salas)
    for (let y = s.y + 1; y < s.y + s.h - 1; y++)
      for (let x = s.x + 1; x < s.x + s.w - 1; x++) {
        if (g[y][x] !== CHAO || r() >= tema.densObst) continue;
        if (Math.abs(x - sp.cx) + Math.abs(y - sp.cy) < 5) continue;
        if (VIZ8.some(([dx, dy]) => g[y + dy][x + dx] === OBST)) continue;
        g[y][x] = OBST;
      }

  // 4) O que dá pra alcançar a partir do começo
  const mapa = { chave, seed, tema, L, A, g };
  const dist = campoDistancia(mapa, sp.cx, sp.cy);
  const livres = [];
  for (let i = 0; i < L * A; i++) if (dist[i] >= 0) livres.push(i);

  // 5) Saída: o ponto mais longe do começo, com espaço 3x3
  const ordenados = livres.slice().sort((a, b) => dist[b] - dist[a]);
  let saida = null;
  for (const i of ordenados) {
    const x = i % L, y = (i / L) | 0;
    let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++)
      for (let dx = -1; dx <= 1; dx++) if (g[y + dy][x + dx] !== CHAO) { ok = false; break; }
    if (ok) { saida = { tx: x, ty: y }; break; }
  }
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) g[saida.ty + dy][saida.tx + dx] = SAIDA;

  // 6) Itens espalhados
  const maxD = dist[ordenados[0]];
  const usados = [{ x: saida.tx, y: saida.ty }];
  function escolher(minDist, minSep) {
    for (let t = 0; t < 800; t++) {
      const i = livres[Math.floor(r() * livres.length)];
      const x = i % L, y = (i / L) | 0;
      if (g[y][x] !== CHAO || dist[i] < minDist) continue;
      if (!usados.every(u => Math.abs(u.x - x) + Math.abs(u.y - y) >= minSep)) continue;
      usados.push({ x, y });
      return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
    }
    const i = livres[Math.floor(r() * livres.length)];
    return { x: (i % L) * TILE + TILE / 2, y: ((i / L) | 0) * TILE + TILE / 2 };
  }
  const itens = [];
  for (let k = 0; k < tema.qtdObj; k++) itens.push({ id: itens.length, tipo: 'obj', ...escolher(maxD * 0.25, 10) });
  for (let k = 0; k < 4 + nJogadores * 2; k++) itens.push({ id: itens.length, tipo: 'bateria', ...escolher(4, 5) });
  for (let k = 0; k < 2 + nJogadores; k++) itens.push({ id: itens.length, tipo: 'remedio', ...escolher(4, 5) });
  const monstroSpawn = escolher(maxD * 0.55, 6);

  // 7) Manchas no chão (só enfeite)
  const manchas = [];
  for (let k = 0; k < 70; k++) {
    const i = livres[Math.floor(r() * livres.length)];
    manchas.push({ x: (i % L) * TILE + r() * TILE, y: ((i / L) | 0) * TILE + r() * TILE, r: 4 + r() * 14, a: r() * 3 });
  }

  return Object.assign(mapa, {
    spawn: { x: sp.cx * TILE + TILE / 2, y: sp.cy * TILE + TILE / 2 },
    saida: { tx: saida.tx, ty: saida.ty, x: saida.tx * TILE + TILE / 2, y: saida.ty * TILE + TILE / 2 },
    itens, monstroSpawn, livres, manchas,
  });
}

// Distância (em passos) de cada quadradinho até o alvo — o monstro usa pra achar o caminho
function campoDistancia(mapa, tx, ty) {
  const { g, L, A } = mapa;
  const d = new Int16Array(L * A).fill(-1);
  if (tx < 0 || ty < 0 || tx >= L || ty >= A || ehSolido(g[ty][tx])) return d;
  const fila = new Int32Array(L * A);
  let ini = 0, fim = 0;
  const s = ty * L + tx;
  d[s] = 0; fila[fim++] = s;
  while (ini < fim) {
    const c = fila[ini++], x = c % L, y = (c / L) | 0;
    for (const [dx, dy] of VIZ4) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= L || ny >= A) continue;
      const n = ny * L + nx;
      if (d[n] !== -1 || ehSolido(g[ny][nx])) continue;
      d[n] = d[c] + 1; fila[fim++] = n;
    }
  }
  return d;
}

function proximoPasso(mapa, campo, x, y) {
  const L = mapa.L, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const atual = campo[ty * L + tx];
  if (atual <= 0) return null;
  let melhor = null, md = atual;
  for (const [dx, dy] of VIZ8) {
    const nx = tx + dx, ny = ty + dy;
    if (nx < 0 || ny < 0 || nx >= L || ny >= mapa.A) continue;
    const v = campo[ny * L + nx];
    if (v < 0 || v >= md) continue;
    if (dx && dy && (campo[ty * L + nx] < 0 || campo[ny * L + tx] < 0)) continue;
    md = v; melhor = { x: nx * TILE + TILE / 2, y: ny * TILE + TILE / 2 };
  }
  return melhor;
}

function tileEm(mapa, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= mapa.L || ty >= mapa.A) return PAREDE;
  return mapa.g[ty][tx];
}
function solidoEm(mapa, x, y) { return ehSolido(tileEm(mapa, x, y)); }
function paredeEm(mapa, x, y) { return tileEm(mapa, x, y) === PAREDE; }

function colide(mapa, x, y, r) {
  return solidoEm(mapa, x - r, y - r) || solidoEm(mapa, x + r, y - r) ||
         solidoEm(mapa, x - r, y + r) || solidoEm(mapa, x + r, y + r);
}
function moverComColisao(mapa, e, mx, my, r) {
  if (!colide(mapa, e.x + mx, e.y, r)) e.x += mx;
  if (!colide(mapa, e.x, e.y + my, r)) e.y += my;
}

// Tem parede no meio do caminho entre dois pontos?
function linhaDeVisao(mapa, x1, y1, x2, y2, bloqueia) {
  bloqueia = bloqueia || paredeEm;
  const d = Math.hypot(x2 - x1, y2 - y1), passos = Math.ceil(d / 8);
  for (let i = 1; i < passos; i++) {
    const t = i / passos;
    if (bloqueia(mapa, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

// Até onde a luz vai numa direção antes de bater na parede
function raio(mapa, x, y, ang, max) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let d = 4; d < max; d += 6) if (paredeEm(mapa, x + dx * d, y + dy * d)) return d;
  return max;
}

function pontoAleatorio(mapa) {
  const i = mapa.livres[Math.floor(Math.random() * mapa.livres.length)];
  return { x: (i % mapa.L) * TILE + TILE / 2, y: ((i / mapa.L) | 0) * TILE + TILE / 2 };
}
