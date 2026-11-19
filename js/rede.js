// =============================================================
//  rede.js — conexão online entre os amigos (PeerJS / WebRTC)
//  Quem cria a sala é o "anfitrião": ele controla o monstro,
//  os itens e as regras. Os outros mandam onde estão e o que fazem.
// =============================================================
const LETRAS_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PREFIXO = 'bkoterror-';

function gerarCodigo() {
  let c = '';
  for (let i = 0; i < 5; i++) c += LETRAS_CODIGO[Math.floor(Math.random() * LETRAS_CODIGO.length)];
  return c;
}

const Rede = {
  peer: null, souHost: false, meuId: null, codigo: null,
  conexoes: {},          // (anfitrião) id do amigo -> conexão
  connHost: null,        // (convidado) conexão com o anfitrião
  aoReceberHost: null,   // (anfitrião) função(deQuem, mensagem)
  aoReceberCliente: null,// todos: função(mensagem)
  aoSair: null,          // (anfitrião) um amigo saiu
  aoCairHost: null,      // (convidado) o anfitrião sumiu

  criarSala(cb, tentativa) {
    tentativa = tentativa || 1;
    this.sair();
    if (typeof Peer === 'undefined') return cb('Sem internet (não carregou o PeerJS).');
    const codigo = gerarCodigo();
    this.souHost = true; this.codigo = codigo;
    const peer = this.peer = new Peer(PREFIXO + codigo.toLowerCase());
    peer.on('open', id => { this.meuId = id; cb(null, codigo); });
    peer.on('error', e => {
      if (e.type === 'unavailable-id' && tentativa < 4) return this.criarSala(cb, tentativa + 1);
      cb(e.type === 'network' || e.type === 'server-error' ? 'Não consegui falar com o servidor. Confira a internet.' : (e.message || e.type));
    });
    peer.on('connection', conn => {
      conn.on('open', () => { this.conexoes[conn.peer] = conn; });
      conn.on('data', d => this.aoReceberHost && this.aoReceberHost(conn.peer, d));
      conn.on('close', () => { delete this.conexoes[conn.peer]; this.aoSair && this.aoSair(conn.peer); });
    });
  },

  entrar(codigo, cb) {
    this.sair();
    if (typeof Peer === 'undefined') return cb('Sem internet (não carregou o PeerJS).');
    this.souHost = false; this.codigo = codigo;
    let respondeu = false;
    const fim = erro => { if (!respondeu) { respondeu = true; clearTimeout(timer); cb(erro); } };
    const timer = setTimeout(() => fim('A sala ' + codigo + ' não respondeu. Confira o código.'), 12000);
    const peer = this.peer = new Peer();
    peer.on('open', id => {
      this.meuId = id;
      const conn = peer.connect(PREFIXO + codigo.toLowerCase(), { reliable: true });
      conn.on('open', () => { this.connHost = conn; fim(null); });
      conn.on('data', d => this.aoReceberCliente && this.aoReceberCliente(d));
      conn.on('close', () => { if (this.connHost === conn) { this.connHost = null; this.aoCairHost && this.aoCairHost(); } });
    });
    peer.on('error', e => fim(e.type === 'peer-unavailable' ? 'Não achei a sala ' + codigo + '.' : 'Erro de conexão: ' + (e.message || e.type)));
  },

  solo() {
    this.sair();
    this.souHost = true; this.meuId = 'solo'; this.codigo = null;
  },

  sair() {
    const conn = this.connHost; this.connHost = null;
    if (conn) try { conn.close(); } catch (e) {}
    if (this.peer) try { this.peer.destroy(); } catch (e) {}
    this.peer = null; this.conexoes = {}; this.meuId = null;
  },

  // convidado -> anfitrião (no anfitrião, entrega direto pra ele mesmo)
  paraHost(msg) {
    if (this.souHost) { this.aoReceberHost && this.aoReceberHost(this.meuId, msg); return; }
    if (this.connHost && this.connHost.open) this.connHost.send(msg);
  },
  // anfitrião -> todo mundo (inclusive ele mesmo)
  paraTodos(msg) {
    for (const c of Object.values(this.conexoes)) if (c.open) c.send(msg);
    this.aoReceberCliente && this.aoReceberCliente(msg);
  },
  paraUm(id, msg) {
    if (id === this.meuId) { this.aoReceberCliente && this.aoReceberCliente(msg); return; }
    const c = this.conexoes[id]; if (c && c.open) c.send(msg);
  },
};
