// =============================================================
//  host.js — as REGRAS do jogo. Só roda no computador do anfitrião.
//  Controla: monstro, itens, quem caiu, quem escapou, fim da partida.
// =============================================================
const H = { jogadores: {}, mapa: 'hospital', P: null, timer: null, ult: 0 };

function limiteCaido(perfil) { return 35 + perfil.atributos.forca * 5; }   // segundos até morrer caído

function hostAdicionar(id, perfil) { H.jogadores[id] = { id, perfil: limparPerfil(perfil) }; }

function hostEnviarLobby(voltar) {
  Rede.paraTodos({
    t: 'lobby', voltar: !!voltar, mapa: H.mapa,
    jogadores: Object.values(H.jogadores).map(j => ({ id: j.id, perfil: j.perfil })),
  });
}

function hostRemover(id) {
  const tinha = H.jogadores[id];
  delete H.jogadores[id];
  if (H.P && H.P.jogadores[id]) {
    delete H.P.jogadores[id];
    hostEvento({ tipo: 'saiu', id, nome: tinha ? tinha.perfil.nome : 'Alguém' });
  }
  hostEnviarLobby(false);
}

function spawnDe(mapa, i) {
  const a = i * Math.PI * 2 / 6;
  return { x: mapa.spawn.x + Math.cos(a) * 30, y: mapa.spawn.y + Math.sin(a) * 30 };
}

function hostComecar() {
  const ids = Object.keys(H.jogadores);
  const seed = Math.floor(Math.random() * 1e9);
  const mapa = gerarMapa(H.mapa, seed, ids.length);
  const P = H.P = {
    mapa, tempo: 0, jogadores: {}, itens: new Set(mapa.itens.map(i => i.id)),
    coletados: 0, saidaAberta: false, fim: false, barulho: null, enviarEm: 0,
    monstro: {
      x: mapa.monstroSpawn.x, y: mapa.monstroSpawn.y, ang: 0, estado: 'vagando', destino: null,
      campo: null, campoAlvo: -1, campoEm: -9, cooldown: 10, perdeEm: 0, alvoX: 0, alvoY: 0,
      presoT: 0, forcarCaminho: 0,
    },
  };
  ids.forEach((id, i) => {
    const sp = spawnDe(mapa, i);
    P.jogadores[id] = {
      id, perfil: H.jogadores[id].perfil, x: sp.x, y: sp.y, ang: 0, luz: true,
      correndo: false, sanidade: 100, estado: 'vivo', caidoEm: 0, visto: 0,
    };
  });
  Rede.paraTodos({ t: 'inicio', mapa: H.mapa, seed, n: ids.length, jogadores: ids.map(id => ({ id, perfil: H.jogadores[id].perfil })) });
  clearInterval(H.timer);
  H.ult = performance.now();
  H.timer = setInterval(() => {
    const agora = performance.now();
    const dt = Math.min(0.1, (agora - H.ult) / 1000); H.ult = agora;
    hostTick(dt);
  }, 33);
}

function hostParar() { clearInterval(H.timer); H.timer = null; }
function hostEvento(e) { Rede.paraTodos(Object.assign({ t: 'evento' }, e)); }

// ---------- Mensagens que chegam no anfitrião ----------
function hostRecebe(de, msg) {
  if (!msg || typeof msg !== 'object') return;
  const P = H.P;
  const j = P && P.jogadores[de];
  switch (msg.t) {
    case 'ola':
      if (P && !P.fim) return Rede.paraUm(de, { t: 'recusado', motivo: 'A partida já começou. Espere ela acabar e tente de novo.' });
      if (!H.jogadores[de] && Object.keys(H.jogadores).length >= 6) return Rede.paraUm(de, { t: 'recusado', motivo: 'A sala está cheia (máximo 6).' });
      hostAdicionar(de, msg.perfil);
      hostEnviarLobby(false);
      break;

    case 'pos':
      if (!j) return;
      if (Number.isFinite(msg.x) && Number.isFinite(msg.y)) { j.x = msg.x; j.y = msg.y; }
      if (Number.isFinite(msg.a)) j.ang = msg.a;
      j.luz = !!msg.l; j.correndo = !!msg.c;
      if (Number.isFinite(msg.s)) j.sanidade = msg.s;
      j.visto = P.tempo;
      break;

    case 'pegar': {
      if (!j || P.fim || j.estado !== 'vivo') return;
      const it = P.mapa.itens[msg.id];
      if (!it || !P.itens.has(it.id) || Math.hypot(it.x - j.x, it.y - j.y) > 70) return;
      P.itens.delete(it.id);
      if (it.tipo === 'obj') {
        P.coletados++;
        if (P.coletados >= P.mapa.tema.qtdObj) P.saidaAberta = true;
      }
      Rede.paraTodos({ t: 'pegou', id: it.id, por: de, coletados: P.coletados, aberta: P.saidaAberta });
      break;
    }

    case 'reviver': {
      const alvo = P && P.jogadores[msg.alvo];
      if (!j || !alvo || j.estado !== 'vivo' || alvo.estado !== 'caido') return;
      if (Math.hypot(alvo.x - j.x, alvo.y - j.y) > 80) return;
      alvo.estado = 'vivo';
      hostEvento({ tipo: 'levantou', id: alvo.id, por: de });
      break;
    }

    case 'chat': {
      const txt = String(msg.txt || '').trim().slice(0, 80);
      if (txt) Rede.paraTodos({ t: 'chat', de, txt });
      break;
    }

    case 'emote':
      if (!['acenar', 'grito', 'apontar', 'silencio'].includes(msg.e)) return;
      Rede.paraTodos({ t: 'emote', de, e: msg.e });
      if (msg.e === 'grito' && j && j.estado === 'vivo') P.barulho = { x: j.x, y: j.y };
      break;

    case 'darBateria': {
      const alvo = P && P.jogadores[msg.alvo];
      if (!j || !alvo || alvo.estado !== 'vivo' || Math.hypot(alvo.x - j.x, alvo.y - j.y) > 90) return;
      const qtd = Math.max(0, Math.min(50, +msg.qtd || 0));
      Rede.paraTodos({ t: 'bateria', de, alvo: alvo.id, qtd });
      break;
    }
  }
}

// ---------- A cada ~30ms ----------
function hostTick(dt) {
  const P = H.P;
  if (!P || P.fim) return;
  P.tempo += dt;
  atualizarMonstro(P, dt);

  for (const j of Object.values(P.jogadores)) {
    if (j.id !== Rede.meuId && P.tempo - j.visto > 60) { hostRemover(j.id); continue; }   // sumiu sem avisar
    if (j.estado === 'caido' && P.tempo - j.caidoEm > limiteCaido(j.perfil)) {
      j.estado = 'morto'; hostEvento({ tipo: 'morreu', id: j.id });
    }
    if (j.estado === 'vivo' && P.saidaAberta && tileEm(P.mapa, j.x, j.y) === SAIDA) {
      j.estado = 'escapou'; hostEvento({ tipo: 'escapou', id: j.id });
    }
  }

  const todos = Object.values(P.jogadores);
  const vivos = todos.filter(j => j.estado === 'vivo');
  if (vivos.length === 0) {
    for (const j of todos) if (j.estado === 'caido') { j.estado = 'morto'; hostEvento({ tipo: 'morreu', id: j.id }); }
    P.fim = true;
    hostParar();
    Rede.paraTodos({ t: 'fim', tempo: Math.round(P.tempo), jogadores: todos.map(j => ({ nome: j.perfil.nome, estado: j.estado })) });
    return;
  }

  P.enviarEm -= dt;
  if (P.enviarEm <= 0) {
    P.enviarEm = 0.05;
    const js = {};
    for (const x of todos) js[x.id] = [Math.round(x.x), Math.round(x.y), +x.ang.toFixed(2), x.luz ? 1 : 0, x.estado];
    const m = P.monstro;
    Rede.paraTodos({ t: 'estado', j: js, m: [Math.round(m.x), Math.round(m.y), m.estado] });
  }
}

// ---------- Inteligência do monstro ----------
function atualizarMonstro(P, dt) {
  const m = P.monstro, mapa = P.mapa, tema = mapa.tema;
  m.cooldown = Math.max(0, m.cooldown - dt);
  const vivos = Object.values(P.jogadores).filter(j => j.estado === 'vivo');

  // 1) Percebe alguém? (ouvir ou ver)
  let alvo = null, melhor = Infinity;
  if (m.cooldown <= 0) for (const j of vivos) {
    const a = j.perfil.atributos, d = Math.hypot(j.x - m.x, j.y - m.y);
    let ouve = j.correndo ? 320 - a.furtividade * 40 : 80 - a.furtividade * 10;
    if (j.sanidade < 25) ouve += 90;                          // respiração em pânico
    const alcanceVisao = j.luz ? 360 : 150;                   // lanterna acesa chama atenção
    const percebe = d < ouve || (d < alcanceVisao && linhaDeVisao(mapa, m.x, m.y, j.x, j.y));
    if (percebe && d < melhor) { melhor = d; alvo = j; }
  }
  if (alvo) {
    if (m.estado !== 'cacando') hostEvento({ tipo: 'monstroViu', id: alvo.id });
    m.estado = 'cacando'; m.alvoX = alvo.x; m.alvoY = alvo.y; m.perdeEm = 4;
  } else if (m.estado === 'cacando') {
    m.perdeEm -= dt;
    if (m.perdeEm <= 0) m.estado = 'investigando';           // vai até onde viu por último
  }
  if (P.barulho && m.cooldown <= 0 && m.estado !== 'cacando' && Math.hypot(P.barulho.x - m.x, P.barulho.y - m.y) < 750) {
    m.estado = 'investigando'; m.alvoX = P.barulho.x; m.alvoY = P.barulho.y;
  }
  P.barulho = null;

  // 2) Pra onde ir
  let dx, dy;
  if (m.estado === 'cacando' || m.estado === 'investigando') {
    dx = m.alvoX; dy = m.alvoY;
    if (m.estado === 'investigando' && Math.hypot(dx - m.x, dy - m.y) < 24) { m.estado = 'vagando'; m.destino = null; }
  }
  if (m.estado === 'vagando') {
    if (!m.destino || Math.hypot(m.destino.x - m.x, m.destino.y - m.y) < 24) m.destino = pontoAleatorio(mapa);
    dx = m.destino.x; dy = m.destino.y;
  }

  let vel = m.estado === 'vagando' ? 70 : tema.monstro.velocidade + Math.min(25, P.tempo / 12);
  if (m.cooldown > 0) vel *= 0.5;

  // 3) Caminho: reto se der, senão contorna as paredes
  let tx = dx, ty = dy;
  m.forcarCaminho = Math.max(0, m.forcarCaminho - dt);
  if (m.forcarCaminho > 0 || !linhaDeVisao(mapa, m.x, m.y, dx, dy, solidoEm)) {
    const alvoTile = Math.floor(dy / TILE) * mapa.L + Math.floor(dx / TILE);
    if (alvoTile !== m.campoAlvo || P.tempo - m.campoEm > 1) {
      m.campo = campoDistancia(mapa, Math.floor(dx / TILE), Math.floor(dy / TILE));
      m.campoAlvo = alvoTile; m.campoEm = P.tempo;
    }
    const prox = proximoPasso(mapa, m.campo, m.x, m.y);
    if (prox) { tx = prox.x; ty = prox.y; }
  }
  const ang = Math.atan2(ty - m.y, tx - m.x);
  const antesX = m.x, antesY = m.y;
  if (Math.hypot(tx - m.x, ty - m.y) > 2) {
    m.ang = ang;
    moverComColisao(mapa, m, Math.cos(ang) * vel * dt, Math.sin(ang) * vel * dt, 12);
  }
  // travou numa quina? usa o caminho por um tempo
  if (Math.hypot(m.x - antesX, m.y - antesY) < vel * dt * 0.3) m.presoT += dt; else m.presoT = 0;
  if (m.presoT > 0.4) { m.forcarCaminho = 1.5; m.presoT = 0; if (m.estado === 'vagando') m.destino = null; }

  // 4) Pegou alguém?
  if (m.cooldown <= 0) for (const j of vivos) {
    if (Math.hypot(j.x - m.x, j.y - m.y) < 26) {
      j.estado = 'caido'; j.caidoEm = P.tempo;
      m.cooldown = 5; m.estado = 'vagando'; m.destino = null;
      hostEvento({ tipo: 'caiu', id: j.id });
      break;
    }
  }
}
