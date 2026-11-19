// =============================================================
//  jogo.js — menu, sala, controles e o que cada jogador vê/faz
// =============================================================
const $ = id => document.getElementById(id);
let perfil = carregarPerfil();
let lobby = { jogadores: [], mapa: 'hospital' };

// Estado do jogo do MEU lado
const C = {
  mapa: null, mapaCanvas: null, eu: null, jogadores: {}, monstro: null, itens: new Map(),
  coletados: 0, saidaAberta: false, rodando: false, fim: false,
  log: [], baloes: {}, emotes: {}, tremor: 0, envioEm: 0, batidaEm: 0, sussurroEm: 5, hudEm: 0, dica: '',
};

function mostrarTela(id) { document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === id)); }
function msgMenu(t) { $('msg-menu').textContent = t || ''; }
function nomeDe(id) { const j = C.jogadores[id] || lobby.jogadores.find(x => x.id === id); return j ? j.perfil.nome : 'Alguém'; }

// ---------- MENU ----------
function configurarRede() {
  Rede.aoReceberHost = hostRecebe;
  Rede.aoReceberCliente = clienteRecebe;
  Rede.aoSair = id => hostRemover(id);
  Rede.aoCairHost = () => { pararJogo(); mostrarTela('tela-menu'); msgMenu('A conexão com o anfitrião caiu.'); };
}
$('btn-personagem').onclick = () => {
  mostrarTela('tela-personagem');
  abrirEditor(perfil, novo => { perfil = novo; mostrarTela('tela-menu'); });
};
$('btn-criar').onclick = () => {
  msgMenu('Criando sala...');
  configurarRede();
  Rede.criarSala((erro) => {
    if (erro) return msgMenu('Não deu pra criar a sala: ' + erro);
    msgMenu(''); H.jogadores = {}; H.P = null; hostAdicionar(Rede.meuId, perfil); entrarLobby();
  });
};
$('btn-entrar').onclick = () => {
  const cod = $('inp-codigo').value.trim().toUpperCase();
  if (cod.length < 5) return msgMenu('Digite o código de 5 letras que seu amigo mandou.');
  msgMenu('Procurando a sala ' + cod + '...');
  configurarRede();
  Rede.entrar(cod, erro => {
    if (erro) { Rede.sair(); return msgMenu(erro); }
    msgMenu(''); Rede.paraHost({ t: 'ola', perfil }); entrarLobby();
  });
};
$('inp-codigo').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-entrar').click(); });
$('btn-solo').onclick = () => {
  configurarRede(); Rede.solo(); H.jogadores = {}; H.P = null; hostAdicionar(Rede.meuId, perfil); entrarLobby();
};

// ---------- SALA (LOBBY) ----------
function entrarLobby() {
  mostrarTela('tela-lobby');
  $('lobby-codigo').textContent = Rede.codigo || 'solo';
  $('lobby-dica').textContent = !Rede.souHost ? 'Esperando o anfitrião escolher o lugar e começar...'
    : Rede.meuId === 'solo' ? 'Modo sozinho. Escolha o lugar e comece.'
    : 'Mande o código ' + Rede.codigo + ' pros seus amigos. Eles clicam em "Entrar".';
  $('btn-comecar').style.display = Rede.souHost ? '' : 'none';
  if (Rede.souHost) hostEnviarLobby(false); else desenharLobby();
}
function desenharLobby() {
  const ul = $('lobby-jogadores'); ul.innerHTML = '';
  for (const j of lobby.jogadores) {
    const li = document.createElement('li');
    const cv = document.createElement('canvas'); cv.width = cv.height = 52;
    desenharPersonagem(cv.getContext('2d'), j.perfil, 26, 28, -Math.PI / 2, 1.6);
    const prof = PROFISSOES.find(p => p.id === j.perfil.profissao);
    const txt = document.createElement('div');
    const b = document.createElement('b'); b.textContent = j.perfil.nome + (j.id === Rede.meuId ? ' (você)' : '');
    const s = document.createElement('small'); s.textContent = prof.icone + ' ' + prof.nome;
    txt.append(b, s); li.append(cv, txt); ul.append(li);
  }
  const box = $('lobby-mapas'); box.innerHTML = '';
  for (const [k, m] of Object.entries(MAPAS)) {
    const bt = document.createElement('button');
    bt.className = 'mapa' + (lobby.mapa === k ? ' sel' : '');
    bt.innerHTML = `<b>${m.icone} ${m.nome}</b><small>${m.historia}</small><small class="mon">Monstro: ${m.monstro.nome} · ${m.qtdObj} ${m.objetivos.toLowerCase()} ${m.iconeObj}</small>`;
    bt.disabled = !Rede.souHost;
    bt.onclick = () => { H.mapa = k; hostEnviarLobby(false); };
    box.append(bt);
  }
}
$('btn-comecar').onclick = () => { if (Rede.souHost) hostComecar(); };

// ---------- MENSAGENS QUE CHEGAM PRA MIM ----------
function clienteRecebe(msg) {
  if (!msg || typeof msg !== 'object') return;
  const agora = performance.now();
  switch (msg.t) {
    case 'lobby':
      lobby = msg;
      if (!C.rodando || msg.voltar) { pararJogo(); $('fim').classList.remove('ativo'); mostrarTela('tela-lobby'); }
      desenharLobby();
      break;
    case 'recusado':
      Rede.sair(); mostrarTela('tela-menu'); msgMenu(msg.motivo);
      break;
    case 'inicio': iniciarPartida(msg); break;
    case 'estado': {
      if (!C.rodando) return;
      for (const [id, a] of Object.entries(msg.j)) {
        const j = C.jogadores[id]; if (!j) continue;
        if (id === Rede.meuId) { if (a[4] !== C.eu.estado) mudarMeuEstado(a[4]); j.estado = a[4]; continue; }
        j.x = a[0]; j.y = a[1]; j.ang = a[2]; j.luz = !!a[3]; j.estado = a[4];
      }
      C.monstro.x = msg.m[0]; C.monstro.y = msg.m[1]; C.monstro.estado = msg.m[2];
      break;
    }
    case 'pegou': {
      const it = C.itens.get(msg.id); if (!it) return;
      C.itens.delete(msg.id);
      C.coletados = msg.coletados;
      const tema = C.mapa.tema;
      if (it.tipo === 'obj') { adicionarLog(`${nomeDe(msg.por)} achou ${tema.iconeObj} ${tema.objetivo} (${C.coletados}/${tema.qtdObj})`); Som.tocar('objetivo'); }
      if (msg.por === Rede.meuId) {
        if (it.tipo === 'bateria') { C.eu.bateria = Math.min(100, C.eu.bateria + 45); Som.tocar('item'); }
        if (it.tipo === 'remedio') { C.eu.sanidade = Math.min(100, C.eu.sanidade + 45); Som.tocar('item'); }
      }
      if (msg.aberta && !C.saidaAberta) { C.saidaAberta = true; adicionarLog('🚪 ' + tema.msgAberta, true); Som.tocar('porta'); }
      break;
    }
    case 'evento': tratarEvento(msg); break;
    case 'chat':
      C.baloes[msg.de] = { txt: msg.txt, ate: agora + 5000 };
      adicionarLog(`💬 ${nomeDe(msg.de)}: ${msg.txt}`);
      break;
    case 'emote': {
      C.emotes[msg.de] = { e: msg.e, ate: agora + 2500 };
      if (msg.e === 'grito') Som.tocar('grito', volumePorDistancia(msg.de, 900));
      break;
    }
    case 'bateria':
      if (msg.alvo === Rede.meuId) C.eu.bateria = Math.min(100, C.eu.bateria + msg.qtd);
      adicionarLog(`🔋 ${nomeDe(msg.de)} deu bateria pra ${nomeDe(msg.alvo)}`);
      break;
    case 'fim': mostrarFim(msg); break;
  }
}

function volumePorDistancia(id, max) {
  const j = C.jogadores[id]; if (!j || !C.eu) return 1;
  return Math.max(0, 1 - Math.hypot(j.rx - C.eu.x, j.ry - C.eu.y) / max);
}

function tratarEvento(e) {
  const n = nomeDe(e.id);
  switch (e.tipo) {
    case 'caiu': adicionarLog(`🩸 ${n} caiu! Segurem E perto pra levantar.`, true); if (e.id !== Rede.meuId) Som.tocar('grito', volumePorDistancia(e.id, 1200) * 0.7 + 0.2); break;
    case 'levantou': adicionarLog(`🙌 ${nomeDe(e.por)} levantou ${n}`); break;
    case 'morreu': adicionarLog(`💀 ${n} não resistiu...`, true); break;
    case 'escapou': adicionarLog(`🚪 ${n} escapou!`); break;
    case 'saiu': adicionarLog(`👋 ${e.nome} saiu do jogo`); delete C.jogadores[e.id]; break;
    case 'monstroViu': if (e.id === Rede.meuId) { Som.tocar('rosnado'); C.tremor = Math.max(C.tremor, 0.4); } break;
  }
}

function mudarMeuEstado(novo) {
  const eu = C.eu, antes = eu.estado;
  eu.estado = novo;
  if (novo === 'caido') { eu.caidoEm = performance.now(); Som.tocar('pegou'); C.tremor = 1.2; }
  if (novo === 'vivo' && antes === 'caido') eu.sanidade = Math.max(eu.sanidade, 40);
}

function adicionarLog(txt, forte) {
  C.log.push({ txt, forte, ate: performance.now() + 12000 });
  if (C.log.length > 7) C.log.shift();
  desenharLog();
}
function desenharLog() {
  const box = $('chat-log'); box.innerHTML = '';
  for (const l of C.log) { const d = document.createElement('div'); d.textContent = l.txt; if (l.forte) d.className = 'forte'; box.append(d); }
}

// ---------- COMEÇO E FIM DA PARTIDA ----------
function iniciarPartida(msg) {
  C.mapa = gerarMapa(msg.mapa, msg.seed, msg.n);
  prerenderMapa();
  C.itens = new Map(C.mapa.itens.map(i => [i.id, i]));
  Object.assign(C, { coletados: 0, saidaAberta: false, fim: false, log: [], baloes: {}, emotes: {}, tremor: 0, jogadores: {} });
  msg.jogadores.forEach((j, i) => {
    const sp = spawnDe(C.mapa, i);
    C.jogadores[j.id] = { id: j.id, perfil: j.perfil, x: sp.x, y: sp.y, ang: 0, luz: true, estado: 'vivo', rx: sp.x, ry: sp.y, rang: 0 };
  });
  const me = C.jogadores[Rede.meuId];
  C.eu = { x: me.x, y: me.y, ang: 0, luz: true, bateria: 100, sanidade: 100, folego: 100, exausto: false,
           estado: 'vivo', caidoEm: 0, reviver: 0, perfil: me.perfil };
  C.monstro = { x: C.mapa.monstroSpawn.x, y: C.mapa.monstroSpawn.y, rx: C.mapa.monstroSpawn.x, ry: C.mapa.monstroSpawn.y, ang: 0, estado: 'vagando' };
  desenharLog();
  $('fim').classList.remove('ativo');
  mostrarTela('tela-jogo');
  redimensionar();
  const tema = C.mapa.tema;
  $('hist-titulo').textContent = tema.icone + ' ' + tema.nome;
  $('hist-texto').textContent = tema.historia;
  $('hist-tarefa').textContent = tema.tarefa;
  $('hist-monstro').textContent = 'Cuidado com ' + tema.monstro.nome.replace(/^(A|O) /, m => m.toLowerCase()) + '.';
  $('historia').classList.add('ativo');
  clearTimeout(C.histTimer);
  C.histTimer = setTimeout(() => $('historia').classList.remove('ativo'), 14000);
  Som.iniciarAmbiente();
  C.rodando = true;
  ultimoQuadro = performance.now();
  requestAnimationFrame(loop);
}
$('historia').onclick = () => $('historia').classList.remove('ativo');

function pararJogo() {
  C.rodando = false;
  Som.pararAmbiente();
  if (Rede.souHost) hostParar();
}

function mostrarFim(msg) {
  C.fim = true;
  const escaparam = msg.jogadores.filter(j => j.estado === 'escapou').length;
  $('fim-titulo').textContent = escaparam === msg.jogadores.length ? 'TODO MUNDO ESCAPOU!'
    : escaparam > 0 ? `${escaparam} de ${msg.jogadores.length} escaparam` : 'NINGUÉM SAIU DAQUI...';
  const ul = $('fim-lista'); ul.innerHTML = '';
  for (const j of msg.jogadores) {
    const li = document.createElement('li');
    li.textContent = (j.estado === 'escapou' ? '🚪 ' : '💀 ') + j.nome + (j.estado === 'escapou' ? ' — escapou' : ' — ficou pra trás');
    ul.append(li);
  }
  $('fim-tempo').textContent = `Tempo: ${Math.floor(msg.tempo / 60)}min ${msg.tempo % 60}s`;
  $('btn-voltar-sala').style.display = Rede.souHost ? '' : 'none';
  $('fim-espera').textContent = Rede.souHost ? '' : 'Esperando o anfitrião voltar pra sala...';
  $('fim').classList.add('ativo');
  setTimeout(() => { if (C.fim) pararJogo(); }, 1500);
}
$('btn-voltar-sala').onclick = () => { H.P = null; hostEnviarLobby(true); };
$('btn-sair').onclick = () => { pararJogo(); Rede.sair(); $('fim').classList.remove('ativo'); mostrarTela('tela-menu'); };

// ---------- CONTROLES ----------
const teclas = {};
const mouse = { x: 0, y: 0, ult: 0 };
const EMOTES = { '1': 'acenar', '2': 'grito', '3': 'apontar', '4': 'silencio' };

window.addEventListener('keydown', e => {
  if (!C.rodando) return;
  const k = e.key.toLowerCase();
  if (document.activeElement === $('chat-input')) {
    if (k === 'enter') {
      const txt = $('chat-input').value.trim();
      if (txt) Rede.paraHost({ t: 'chat', txt });
      $('chat-input').value = ''; $('chat-input').blur(); $('chat-input').classList.remove('ativo');
    } else if (k === 'escape') { $('chat-input').blur(); $('chat-input').classList.remove('ativo'); }
    return;
  }
  if (k === 'enter') { for (const t in teclas) teclas[t] = false; $('chat-input').classList.add('ativo'); $('chat-input').focus(); e.preventDefault(); return; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (!e.repeat) {
    if (k === 'f') C.eu.luz = !C.eu.luz;
    if (k === 'e') tentarPegar();
    if (k === 'g') darBateria();
    if (EMOTES[k] && C.eu.estado !== 'morto') Rede.paraHost({ t: 'emote', e: EMOTES[k] });
  }
  teclas[k] = true;
});
window.addEventListener('keyup', e => { teclas[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const t in teclas) teclas[t] = false; });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.ult = performance.now(); });
window.addEventListener('pointerdown', () => Som.pegar());

function amigoMaisPerto(filtro, max) {
  let melhor = null, md = max;
  for (const j of Object.values(C.jogadores)) {
    if (j.id === Rede.meuId || !filtro(j)) continue;
    const d = Math.hypot(j.rx - C.eu.x, j.ry - C.eu.y);
    if (d < md) { md = d; melhor = j; }
  }
  return melhor;
}
function itemMaisPerto(max) {
  let melhor = null, md = max;
  for (const it of C.itens.values()) {
    const d = Math.hypot(it.x - C.eu.x, it.y - C.eu.y);
    if (d < md) { md = d; melhor = it; }
  }
  return melhor;
}
function tentarPegar() {
  if (C.eu.estado !== 'vivo') return;
  const it = itemMaisPerto(42);
  if (it) Rede.paraHost({ t: 'pegar', id: it.id });
}
function darBateria() {
  if (C.eu.estado !== 'vivo') return;
  const amigo = amigoMaisPerto(j => j.estado === 'vivo', 70);
  if (!amigo) return adicionarLog('Chegue perto de um amigo pra dar bateria.');
  const qtd = Math.min(25, Math.floor(C.eu.bateria));
  if (qtd < 5) return adicionarLog('Sua bateria está fraca demais pra dividir.');
  C.eu.bateria -= qtd;
  Rede.paraHost({ t: 'darBateria', alvo: amigo.id, qtd });
}

// ---------- ATUALIZAÇÃO A CADA QUADRO ----------
let ultimoQuadro = 0;
function loop(agora) {
  if (!C.rodando) return;
  const dt = Math.min(0.05, (agora - ultimoQuadro) / 1000);
  ultimoQuadro = agora;
  atualizarEu(dt, agora);
  atualizarOutros(dt);
  atualizarSons(dt);
  desenhar(dt, agora);
  C.hudEm -= dt;
  if (C.hudEm <= 0) { C.hudEm = 0.1; atualizarHud(agora); }
  requestAnimationFrame(loop);
}

function atualizarEu(dt, agora) {
  const eu = C.eu, a = eu.perfil.atributos, prof = eu.perfil.profissao;
  const espectador = eu.estado === 'morto' || eu.estado === 'escapou';
  const nJog = Object.keys(C.jogadores).length;

  // Movimento
  let mx = 0, my = 0;
  if (teclas.w || teclas.arrowup) my--;
  if (teclas.s || teclas.arrowdown) my++;
  if (teclas.a || teclas.arrowleft) mx--;
  if (teclas.d || teclas.arrowright) mx++;
  const len = Math.hypot(mx, my);
  if (len) { mx /= len; my /= len; }

  let vel = 95 + a.velocidade * 10;
  const folegoMax = prof === 'atleta' ? 200 : 100;
  if (eu.folego <= 0) eu.exausto = true;
  if (eu.exausto && eu.folego > 30) eu.exausto = false;
  eu.correndo = false;
  if (teclas.shift && len && eu.estado === 'vivo' && !eu.exausto) {
    vel *= 1.6; eu.correndo = true; eu.folego = Math.max(0, eu.folego - 25 * dt);
  } else eu.folego = Math.min(folegoMax, eu.folego + (len ? 10 : 18) * dt);
  if (eu.estado === 'caido') vel = 22;
  if (espectador) vel = 180;
  if (eu.sanidade < 15 && !espectador) vel *= 0.85;
  moverComColisao(C.mapa, eu, mx * vel * dt, my * vel * dt, 10);

  // Mira: mouse; se o mouse está parado, olha pra onde anda
  if (agora - mouse.ult < 1500 || !len) eu.ang = Math.atan2(mouse.y - cv.height / 2, mouse.x - cv.width / 2);
  else eu.ang = Math.atan2(my, mx);

  // Lanterna
  const luzLigada = eu.luz && eu.bateria > 0 && eu.estado === 'vivo';
  if (luzLigada) eu.bateria = Math.max(0, eu.bateria - (prof === 'eletricista' ? 0.55 : 1.1) * dt);

  // Sanidade
  if (!espectador) {
    let amigoPerto = false, amigoIluminado = false, medicoPerto = false;
    for (const j of Object.values(C.jogadores)) {
      if (j.id === Rede.meuId || j.estado !== 'vivo') continue;
      const d = Math.hypot(j.rx - eu.x, j.ry - eu.y);
      if (d < 220) { amigoPerto = true; if (j.luz) amigoIluminado = true; if (j.perfil.profissao === 'medico' && d < 180) medicoPerto = true; }
    }
    const dMonstro = Math.hypot(C.monstro.rx - eu.x, C.monstro.ry - eu.y);
    let delta = 0;
    if (!luzLigada && !amigoIluminado) delta -= 2;
    if (!amigoPerto && nJog > 1) delta -= 1.2;
    if (dMonstro < 260) delta -= 4;
    if (eu.estado === 'caido') delta -= 2;
    delta *= (1 - a.coragem * 0.13);
    if (dMonstro >= 260 && (luzLigada || amigoIluminado)) delta += amigoPerto ? 2.5 : (nJog === 1 ? 0.5 : 0);
    if (medicoPerto) delta += 3;
    eu.sanidade = Math.max(0, Math.min(100, eu.sanidade + delta * dt));
  }

  // Levantar amigo caído (segurar E)
  C.dica = '';
  const caido = eu.estado === 'vivo' ? amigoMaisPerto(j => j.estado === 'caido', 45) : null;
  const it = eu.estado === 'vivo' ? itemMaisPerto(42) : null;
  if (caido) {
    C.dica = `Segure [E] pra levantar ${caido.perfil.nome}`;
    if (teclas.e) {
      const tempo = 4 / (1 + a.forca * 0.2) / (prof === 'medico' ? 2 : 1);
      eu.reviver += dt / tempo;
      if (eu.reviver >= 1) { Rede.paraHost({ t: 'reviver', alvo: caido.id }); eu.reviver = 0; }
    } else eu.reviver = 0;
  } else {
    eu.reviver = 0;
    if (it) {
      const tema = C.mapa.tema;
      C.dica = '[E] pegar ' + (it.tipo === 'obj' ? tema.iconeObj + ' ' + tema.objetivo : it.tipo === 'bateria' ? '🔋 bateria' : '💊 remédio');
    }
  }

  // Meu boneco na lista + avisar o anfitrião
  const me = C.jogadores[Rede.meuId];
  if (me) { me.x = me.rx = eu.x; me.y = me.ry = eu.y; me.ang = me.rang = eu.ang; me.luz = luzLigada; }
  C.envioEm -= dt;
  if (C.envioEm <= 0) {
    C.envioEm = 0.05;
    Rede.paraHost({ t: 'pos', x: Math.round(eu.x), y: Math.round(eu.y), a: +eu.ang.toFixed(2), l: luzLigada ? 1 : 0, c: eu.correndo ? 1 : 0, s: Math.round(eu.sanidade) });
  }
}

function atualizarOutros(dt) {
  const k = Math.min(1, dt * 12);
  for (const j of Object.values(C.jogadores)) {
    if (j.id === Rede.meuId) continue;
    j.rx += (j.x - j.rx) * k; j.ry += (j.y - j.ry) * k;
    let da = j.ang - j.rang; da = Math.atan2(Math.sin(da), Math.cos(da)); j.rang += da * k;
  }
  const m = C.monstro;
  const mx = m.x - m.rx, my = m.y - m.ry;
  if (Math.hypot(mx, my) > 0.5) m.ang = Math.atan2(my, mx);
  m.rx += mx * k; m.ry += my * k;
}

function atualizarSons(dt) {
  const eu = C.eu;
  const d = Math.hypot(C.monstro.rx - eu.x, C.monstro.ry - eu.y);
  C.batidaEm -= dt;
  if (d < 450 && C.batidaEm <= 0 && eu.estado !== 'morto') {
    Som.tocar('batida', 1 - d / 500);
    C.batidaEm = 0.35 + (d / 450) * 0.9;
  }
  C.sussurroEm -= dt;
  if (eu.sanidade < 30 && C.sussurroEm <= 0) { Som.tocar('sussurro', 0.6); C.sussurroEm = 2 + Math.random() * 5; }
}

function atualizarHud(agora) {
  const eu = C.eu, tema = C.mapa.tema;
  $('b-bateria').style.width = eu.bateria + '%';
  $('b-sanidade').style.width = eu.sanidade + '%';
  $('b-folego').style.width = (eu.folego / (eu.perfil.profissao === 'atleta' ? 200 : 100) * 100) + '%';
  $('b-bateria').classList.toggle('baixo', eu.bateria < 20);
  $('b-sanidade').classList.toggle('baixo', eu.sanidade < 30);
  $('objetivo').textContent = C.saidaAberta ? '🚪 ' + tema.msgAberta : `${tema.iconeObj} ${tema.objetivos}: ${C.coletados}/${tema.qtdObj}`;
  $('objetivo').classList.toggle('aberto', C.saidaAberta);
  $('dica').textContent = C.dica;
  let status = '';
  if (eu.estado === 'caido') {
    const resta = Math.max(0, Math.ceil(limiteCaido(eu.perfil) - (agora - eu.caidoEm) / 1000));
    status = `VOCÊ CAIU! Chame alguém pra te levantar (${resta}s)`;
  } else if (eu.estado === 'morto') status = 'Você virou um fantasma... ajude o grupo pelo chat (Enter)';
  else if (eu.estado === 'escapou') status = 'VOCÊ ESCAPOU! Espere o resto do grupo';
  $('status-grande').textContent = status;
  const ul = $('equipe'); ul.innerHTML = '';
  const icones = { vivo: '🟢', caido: '🩸', morto: '💀', escapou: '🚪' };
  for (const j of Object.values(C.jogadores)) {
    const li = document.createElement('li');
    li.textContent = icones[j.estado] + ' ' + j.perfil.nome + (j.id === Rede.meuId ? ' (você)' : '');
    ul.append(li);
  }
  const antes = C.log.length;
  C.log = C.log.filter(l => l.ate > agora);
  if (C.log.length !== antes) desenharLog();
}
