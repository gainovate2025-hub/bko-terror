# BKO Terror — como jogar e como funciona

Jogo de terror pra jogar com até 6 amigos pelo navegador. O grupo fica preso num lugar
assustador (Hospital, Escola ou Floresta), precisa achar 4 objetos pra abrir a saída
e fugir de um monstro — sem perder a sanidade.

## Como jogar

1. **Meu personagem**: escolha nome, pele, cabelo, roupa, acessório, profissão e distribua 6 pontos.
2. **Criar sala**: aparece um código de 5 letras (ex.: `SYSCZ`). Mande no WhatsApp.
3. Seus amigos abrem o site, digitam o código e clicam **Entrar**.
4. Quem criou a sala escolhe o lugar e clica **Começar**.

| Tecla | O que faz |
|---|---|
| W A S D / setas | andar |
| Mouse | apontar a lanterna |
| Shift | correr (faz barulho e gasta fôlego) |
| F | liga/desliga lanterna (acesa, o monstro te vê de mais longe) |
| E | pegar item / **segurar** pra levantar amigo caído |
| G | dar bateria pro amigo do lado |
| 1 2 3 4 | acenar 👋, gritar 😱 (o monstro ouve!), apontar 👉, silêncio 🤫 |
| Enter | chat (aparece em balão em cima da cabeça) |

**Regras importantes**
- **Sanidade 🧠** cai no escuro, sozinho e perto do monstro. Sobe perto dos amigos com luz.
  Baixa demais: tela vermelha, sussurros, olhos falsos e você fica mais lento.
- Se o monstro te pega você **cai**. Um amigo segura **E** do seu lado pra te levantar.
  Se ninguém vier a tempo, você vira fantasma 👻 (ainda pode falar no chat).
- Achou os 4 objetos? A saída fica verde. Todo mundo que entrar nela escapa.

**O que muda conforme o personagem**
- Velocidade: anda/corre mais rápido.
- Coragem: perde sanidade mais devagar.
- Furtividade: o monstro te ouve de mais perto só.
- Força: levanta amigos mais rápido e aguenta mais tempo caído.
- Médico: levanta 2x mais rápido e acalma quem está perto.
- Eletricista: lanterna dura o dobro e vai mais longe.
- Atleta: fôlego em dobro.
- Detetive: vê os itens brilhando no escuro.

## Testar no seu computador

```bash
node ~/Desktop/BKO-TERROR/servidor.js
```

Depois abra http://localhost:5194 (abra 2 abas pra simular um amigo).
Precisa de internet: a conexão entre jogadores usa o servidor gratuito do PeerJS.

## Pra que serve cada arquivo (pra aprender)

| Arquivo | O que tem |
|---|---|
| `index.html` | O "esqueleto": todas as telas (menu, personagem, sala, jogo, fim). |
| `estilo.css` | As cores e o visual. As cores principais ficam no topo, em `:root`. |
| `js/mapas.js` | Os 3 lugares (história, cores, monstro) e o gerador de mapa. Quer um 4º mapa? Copie um bloco de `MAPAS` e mude. |
| `js/personagem.js` | Cores, acessórios, profissões, atributos e o desenho do boneco. |
| `js/rede.js` | Conexão online: criar sala, entrar por código, mandar mensagens. |
| `js/host.js` | As **regras**. Só roda no PC de quem criou a sala: monstro, itens, quem caiu, quem escapou. |
| `js/jogo.js` | Menu, sala, teclado, movimento, sanidade, bateria, HUD. |
| `js/desenho.js` | Tudo que aparece: mapa, lanterna, escuridão, monstro, balões. |
| `js/som.js` | Sons criados pelo navegador (batida do coração, grito, sussurro). |
| `servidor.js` | Só pra testar no seu PC. Não precisa no GitHub Pages. |

**Ideia principal:** quem cria a sala é o "anfitrião". Os outros mandam "estou aqui, fiz isso"
e o anfitrião decide o que acontece e avisa todo mundo ~20 vezes por segundo.

Coisas fáceis pra você mexer primeiro:
- Velocidade do monstro: `velocidade` em `js/mapas.js`.
- Quantos objetos achar: `qtdObj` em `js/mapas.js`.
- Tempo caído antes de morrer: `limiteCaido` em `js/host.js`.

## Colocar no ar (GitHub Pages)

1. Crie um repositório novo em github.com/gainovate2025-hub chamado `bko-terror`.
2. Suba todos os arquivos desta pasta (pode arrastar no site do GitHub).
3. Em **Settings → Pages**, escolha a branch `main` e pasta `/ (root)`.
4. Em 1–2 minutos fica em `https://gainovate2025-hub.github.io/bko-terror/`.

## Limitações de agora
- Só computador (teclado + mouse). Celular ainda não.
- Se o anfitrião minimizar a janela, o jogo fica lento pra todo mundo (o navegador desacelera abas escondidas).
- Se o anfitrião sair, a partida acaba pra todos.
