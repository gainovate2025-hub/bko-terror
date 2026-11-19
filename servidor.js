// servidor.js — só pra testar no seu computador: node servidor.js e abra http://localhost:5194
// (No GitHub Pages não precisa disso.)
const http = require('http'), fs = require('fs'), path = require('path');
const PASTA = __dirname, PORTA = process.env.PORT || 5194;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.md': 'text/plain' };
http.createServer((req, res) => {
  let arq = decodeURIComponent(req.url.split('?')[0]);
  if (arq === '/') arq = '/index.html';
  const caminho = path.join(PASTA, path.normalize(arq));
  if (!caminho.startsWith(PASTA)) { res.writeHead(403); return res.end(); }
  fs.readFile(caminho, (erro, dados) => {
    if (erro) { res.writeHead(404); return res.end('não achei'); }
    res.writeHead(200, { 'Content-Type': (TIPOS[path.extname(caminho)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(dados);
  });
}).listen(PORTA, () => console.log('BKO Terror rodando em http://localhost:' + PORTA));
