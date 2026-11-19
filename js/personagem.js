// =============================================================
//  personagem.js — criar e desenhar o seu personagem
//  Aparência é só visual. Profissão e atributos MUDAM o jogo.
// =============================================================
const CORES_PELE = ['#f5d6b8', '#e8b98f', '#c98b5e', '#9a6440', '#6b4329', '#3f2717'];
const CORES_CABELO = ['#111111', '#3b2414', '#7a4a22', '#c9a050', '#b33a1f', '#e8e8e8', '#5a2d82', '#1e6bd6'];
const CORES_ROUPA = ['#2a3b8f', '#8f2a2a', '#2a8f4a', '#d9a400', '#6b2a8f', '#1c1c1c', '#e0e0e0', '#e0662a'];
const ACESSORIOS = [
  { id: 'nenhum', nome: 'Nenhum' }, { id: 'bone', nome: 'Boné' }, { id: 'oculos', nome: 'Óculos' },
  { id: 'fone', nome: 'Fone' }, { id: 'mascara', nome: 'Máscara' },
];
const PROFISSOES = [
  { id: 'medico', nome: 'Médico', icone: '🩺', desc: 'Levanta amigos caídos 2x mais rápido e acalma quem está perto (a sanidade deles sobe).' },
  { id: 'eletricista', nome: 'Eletricista', icone: '🔦', desc: 'Lanterna gasta metade da bateria e ilumina mais longe.' },
  { id: 'atleta', nome: 'Atleta', icone: '👟', desc: 'Fôlego dobrado: corre o dobro do tempo antes de cansar.' },
  { id: 'detetive', nome: 'Detetive', icone: '🔍', desc: 'Vê os itens brilhando no escuro, mesmo de longe.' },
];
const ATRIBUTOS = [
  { id: 'velocidade', nome: 'Velocidade', desc: 'anda e corre mais rápido' },
  { id: 'coragem', nome: 'Coragem', desc: 'perde sanidade mais devagar no escuro' },
  { id: 'furtividade', nome: 'Furtividade', desc: 'faz menos barulho, o monstro te ouve menos' },
  { id: 'forca', nome: 'Força', desc: 'levanta amigos mais rápido e aguenta mais tempo caído' },
];
const PONTOS_LIVRES = 6;   // cada atributo começa em 1; você distribui mais 6 (máximo 5 em cada)

function perfilPadrao() {
  return {
    nome: 'Sobrevivente', pele: CORES_PELE[1], cabelo: CORES_CABELO[1], roupa: CORES_ROUPA[0],
    acessorio: 'nenhum', profissao: 'medico',
    atributos: { velocidade: 2, coragem: 3, furtividade: 2, forca: 3 },
  };
}

// Garante que o perfil é válido (protege contra perfil quebrado vindo pela internet)
function limparPerfil(p) {
  const base = perfilPadrao();
  if (!p || typeof p !== 'object') return base;
  const cor = (c, lista) => (typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c)) ? c : lista[0];
  const out = {
    nome: String(p.nome || '').trim().slice(0, 12) || 'Sobrevivente',
    pele: cor(p.pele, CORES_PELE), cabelo: cor(p.cabelo, CORES_CABELO), roupa: cor(p.roupa, CORES_ROUPA),
    acessorio: ACESSORIOS.some(a => a.id === p.acessorio) ? p.acessorio : 'nenhum',
    profissao: PROFISSOES.some(x => x.id === p.profissao) ? p.profissao : 'medico',
    atributos: {},
  };
  let total = 0;
  for (const at of ATRIBUTOS) {
    const v = Math.max(1, Math.min(5, Math.round(+((p.atributos || {})[at.id]) || 1)));
    out.atributos[at.id] = v; total += v;
  }
  if (total > ATRIBUTOS.length + PONTOS_LIVRES) out.atributos = base.atributos;
  return out;
}

function carregarPerfil() {
  try { const p = JSON.parse(localStorage.getItem('bko-terror-perfil')); if (p) return limparPerfil(p); } catch (e) {}
  return perfilPadrao();
}
function salvarPerfil(p) { try { localStorage.setItem('bko-terror-perfil', JSON.stringify(p)); } catch (e) {} }
function pontosUsados(p) { return Object.values(p.atributos).reduce((a, b) => a + b, 0) - ATRIBUTOS.length; }

function bola(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }

// Desenha o personagem visto de cima, olhando na direção "ang" (frente = direita)
function desenharPersonagem(c, p, x, y, ang, escala, alpha) {
  escala = escala || 1;
  c.save();
  c.translate(x, y); c.rotate(ang); c.scale(escala, escala);
  c.globalAlpha = alpha == null ? 1 : alpha;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(-1, 2, 11, 15, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.pele; bola(c, 6, -12, 3.5); bola(c, 6, 12, 3.5);             // mãos
  c.fillStyle = p.roupa;
  c.beginPath(); c.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2); c.fill();          // corpo
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.stroke();
  c.fillStyle = p.pele; bola(c, 1, 0, 7);                                       // cabeça
  c.fillStyle = p.cabelo;
  c.beginPath(); c.arc(0.5, 0, 7.5, Math.PI * 0.45, Math.PI * 1.55); c.closePath(); c.fill();
  if (p.acessorio !== 'mascara' && p.acessorio !== 'oculos') {
    c.fillStyle = '#111'; bola(c, 6.5, -2.6, 1.1); bola(c, 6.5, 2.6, 1.1);      // olhos
  }
  switch (p.acessorio) {
    case 'bone':
      c.fillStyle = '#b8322a'; bola(c, 0.5, 0, 7.6);
      c.fillRect(5, -5.5, 6, 11);
      break;
    case 'oculos':
      c.fillStyle = '#0d0d0d'; c.fillRect(5.5, -5, 3, 4); c.fillRect(5.5, 1, 3, 4); c.fillRect(6, -1, 1.5, 2);
      break;
    case 'fone':
      c.strokeStyle = '#222'; c.lineWidth = 2;
      c.beginPath(); c.arc(1, 0, 8, -Math.PI / 2, Math.PI / 2, true); c.stroke();
      c.fillStyle = '#e74c3c'; bola(c, 1, -8, 3); bola(c, 1, 8, 3);
      break;
    case 'mascara':
      c.fillStyle = '#eeeeee'; c.beginPath(); c.ellipse(5, 0, 3.2, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#000'; bola(c, 6, -2.5, 1.2); bola(c, 6, 2.5, 1.2);
      break;
  }
  c.restore();
}

// ---------- Tela de edição ----------
function abrirEditor(perfilAtual, aoSalvar) {
  const p = JSON.parse(JSON.stringify(perfilAtual));
  const $ = id => document.getElementById(id);
  const prev = $('preview').getContext('2d');

  function redesenhar() {
    prev.clearRect(0, 0, 220, 220);
    const gr = prev.createRadialGradient(110, 110, 10, 110, 110, 110);
    gr.addColorStop(0, '#3a3428'); gr.addColorStop(1, '#0b0b0d');
    prev.fillStyle = gr; prev.fillRect(0, 0, 220, 220);
    desenharPersonagem(prev, p, 110, 115, -Math.PI / 2, 5);
    $('p-pontos').textContent = PONTOS_LIVRES - pontosUsados(p);
    const prof = PROFISSOES.find(x => x.id === p.profissao);
    $('p-prof-desc').textContent = prof.desc;
  }
  function paleta(id, cores, campo) {
    const box = $(id); box.innerHTML = '';
    for (const cor of cores) {
      const b = document.createElement('button');
      b.className = 'cor' + (p[campo] === cor ? ' sel' : '');
      b.style.background = cor; b.title = cor;
      b.onclick = () => { p[campo] = cor; paleta(id, cores, campo); redesenhar(); };
      box.append(b);
    }
  }
  function opcoes(id, lista, campo) {
    const box = $(id); box.innerHTML = '';
    for (const op of lista) {
      const b = document.createElement('button');
      b.className = 'op' + (p[campo] === op.id ? ' sel' : '');
      b.textContent = (op.icone ? op.icone + ' ' : '') + op.nome;
      b.onclick = () => { p[campo] = op.id; opcoes(id, lista, campo); redesenhar(); };
      box.append(b);
    }
  }
  function atributos() {
    const box = $('p-atributos'); box.innerHTML = '';
    for (const at of ATRIBUTOS) {
      const linha = document.createElement('div'); linha.className = 'atributo';
      const nome = document.createElement('div');
      nome.innerHTML = `<b>${at.nome}</b><small>${at.desc}</small>`;
      const menos = document.createElement('button'); menos.textContent = '−';
      const mais = document.createElement('button'); mais.textContent = '+';
      const pips = document.createElement('div'); pips.className = 'pips';
      for (let i = 1; i <= 5; i++) {
        const s = document.createElement('i'); if (i <= p.atributos[at.id]) s.className = 'on'; pips.append(s);
      }
      menos.onclick = () => { if (p.atributos[at.id] > 1) { p.atributos[at.id]--; atributos(); redesenhar(); } };
      mais.onclick = () => {
        if (p.atributos[at.id] < 5 && pontosUsados(p) < PONTOS_LIVRES) { p.atributos[at.id]++; atributos(); redesenhar(); }
      };
      linha.append(nome, menos, pips, mais);
      box.append(linha);
    }
  }

  $('p-nome').value = p.nome;
  $('p-nome').oninput = e => { p.nome = e.target.value; };
  paleta('p-pele', CORES_PELE, 'pele');
  paleta('p-cabelo', CORES_CABELO, 'cabelo');
  paleta('p-roupa', CORES_ROUPA, 'roupa');
  opcoes('p-acessorio', ACESSORIOS, 'acessorio');
  opcoes('p-profissao', PROFISSOES, 'profissao');
  atributos();
  redesenhar();
  $('btn-salvar').onclick = () => { const final = limparPerfil(p); salvarPerfil(final); aoSalvar(final); };
}
