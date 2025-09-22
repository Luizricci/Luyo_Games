// Variáveis do jogo
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreP1Display = document.getElementById('score-p1');
const nameP1Display = document.getElementById('name-p1');
const scoreP2Display = document.getElementById('score-p2');
const nameP2Display = document.getElementById('name-p2');
const startOverlay = document.getElementById('startOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownDisplay = document.getElementById('countdown');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScore1Display = document.getElementById('finalScore1');
const finalScore2Display = document.getElementById('finalScore2');
const winnerMessage = document.getElementById('winnerMessage');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const backToStartButton = document.getElementById('backToStartButton');
const player1NameInput = document.getElementById('player1Name');
const player2NameInput = document.getElementById('player2Name');
const finalName1Display = document.getElementById('finalName1');
const finalName2Display = document.getElementById('finalName2');
const player1ColorInput = document.getElementById('player1Color');
const player2ColorInput = document.getElementById('player2Color');
const modeNormalInput = document.getElementById('modeNormal');
const modeUltraInput = document.getElementById('modeUltra');

let player1, player2, pipes, isGameStarted;

// Configurações dos modos de jogo
const gameModes = {
    normal: {
        pipeSpeed: 2.5,
        pipeGap: 160
    },
    ultra: {
        pipeSpeed: 4.5,
        pipeGap: 120
    }
};

let currentMode = gameModes.normal;

// Configurações do pássaro
const birdProps = {
    width: 34,
    height: 24,
    gravity: 0.6,
    lift: -7,
    velocity: 0
};

// Configurações dos canos
const pipeProps = {
    width: 50,
    headHeight: 20
};

// Função para desenhar um pássaro específico
function drawBird(bird) {
    // Corpo
    ctx.fillStyle = bird.color;
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);

    // Olho (preto)
    ctx.fillStyle = '#000000';
    ctx.fillRect(bird.x + bird.width - 8, bird.y + 5, 4, 4);

    // Bico (laranja)
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(bird.x + bird.width, bird.y + bird.height / 2);
    ctx.lineTo(bird.x + bird.width + 8, bird.y + bird.height / 2 - 4);
    ctx.lineTo(bird.x + bird.width + 8, bird.y + bird.height / 2 + 4);
    ctx.fill();
}

// Função para desenhar os canos
function drawPipes() {
    ctx.fillStyle = '#008000';
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipeProps.width, pipe.top);
        ctx.fillRect(pipe.x - 5, pipe.top - pipeProps.headHeight, pipeProps.width + 10, pipeProps.headHeight);
        
        ctx.fillRect(pipe.x, pipe.bottom, pipeProps.width, canvas.height - pipe.bottom);
        ctx.fillRect(pipe.x - 5, pipe.bottom, pipeProps.width + 10, pipeProps.headHeight);
    });
}

// Função de atualização do pássaro
function updateBird(bird) {
    if (bird.isDead) return;

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    
    if (bird.velocity > 10) bird.velocity = 10;

    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        bird.isDead = true;
    }
}

// Checa colisão e pontuação
function checkCollisionAndScore(bird, playerKey) {
    if (bird.isDead) return;

    pipes.forEach(pipe => {
        if (
            bird.x + bird.width > pipe.x &&
            bird.x < pipe.x + pipeProps.width &&
            (bird.y < pipe.top || bird.y + bird.height > pipe.bottom)
        ) {
            bird.isDead = true;
        }
        
        // Agora, a pontuação é verificada para cada jogador separadamente
        if (!pipe.passedBy[playerKey] && bird.x > pipe.x + pipeProps.width) {
            bird.score++;
            pipe.passedBy[playerKey] = true;
        }
    });
}

// Função de atualização geral do jogo
function update() {
    if (!isGameStarted) return;
    
    // Move e remove canos
    pipes.forEach(pipe => {
        pipe.x -= currentMode.pipeSpeed;
        if (pipe.x + pipeProps.width < 0) {
            pipes.shift();
        }
    });

    // Gera novos canos
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 200) {
        const pipeTopHeight = Math.random() * (canvas.height - currentMode.pipeGap * 2) + currentMode.pipeGap / 2;
        pipes.push({
            x: canvas.width,
            top: pipeTopHeight,
            bottom: pipeTopHeight + currentMode.pipeGap,
            // Cada cano agora tem uma flag 'passed' para cada jogador
            passedBy: { p1: false, p2: false }
        });
    }

    updateBird(player1);
    updateBird(player2);

    checkCollisionAndScore(player1, 'p1');
    checkCollisionAndScore(player2, 'p2');

    scoreP1Display.innerText = player1.score;
    nameP1Display.innerText = player1.name;
    scoreP2Display.innerText = player2.score;
    nameP2Display.innerText = player2.name;
    
    // Se ambos os jogadores morreram, fim de jogo
    if (player1.isDead && player2.isDead) {
        showGameOverScreen();
    }
}

// Função principal do jogo (loop)
function gameLoop() {
    if (!player1.isDead || !player2.isDead) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        update();
        if (!player1.isDead) drawBird(player1);
        if (!player2.isDead) drawBird(player2);
        drawPipes();
        requestAnimationFrame(gameLoop);
    }
}

// Função para pular
function flap(bird) {
    if (!bird.isDead) {
        bird.velocity = bird.lift;
    }
}

// Reinicia o jogo
function resetGame(p1Name, p2Name, p1Color, p2Color) {
    isGameStarted = true;
    player1 = {
        name: p1Name || "Jogador 1",
        x: 80,
        y: canvas.height / 2 - birdProps.height / 2 - 20,
        isDead: false,
        score: 0,
        color: p1Color || '#FFD700', // Gold
        ...birdProps
    };
    player2 = {
        name: p2Name || "Jogador 2",
        x: 80,
        y: canvas.height / 2 - birdProps.height / 2 + 20,
        isDead: false,
        score: 0,
        color: p2Color || '#C0C0C0', // Silver
        ...birdProps
    };
    pipes = [];
    scoreP1Display.innerText = '0';
    nameP1Display.innerText = p1Name || "P1";
    scoreP2Display.innerText = '0';
    nameP2Display.innerText = p2Name || "P2";
    startOverlay.classList.remove('active');
    countdownOverlay.classList.remove('countdown-active');
    gameOverOverlay.classList.remove('active');
    gameLoop();
}

// Inicia a contagem regressiva
function startCountdown() {
    const p1Name = player1NameInput.value.trim() || "P1";
    const p2Name = player2NameInput.value.trim() || "P2";
    const p1Color = player1ColorInput.value;
    const p2Color = player2ColorInput.value;
    const selectedMode = document.querySelector('input[name="gameMode"]:checked').value;
    currentMode = gameModes[selectedMode];

    gameOverOverlay.classList.remove('active');
    startOverlay.classList.remove('active');
    countdownOverlay.classList.add('countdown-active');
    let count = 3;
    countdownDisplay.innerText = count;

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownDisplay.innerText = count;
        } else {
            clearInterval(countdownInterval);
            resetGame(p1Name, p2Name, p1Color, p2Color);
        }
    }, 1000);
}

// Mostra a tela de fim de jogo
function showGameOverScreen() {
    isGameStarted = false;
    finalScore1Display.innerText = player1.score;
    finalScore2Display.innerText = player2.score;
    finalName1Display.innerText = player1.name;
    finalName2Display.innerText = player2.name;

    if (player1.score > player2.score) {
        winnerMessage.innerText = `${player1.name} Venceu!`;
    } else if (player2.score > player1.score) {
        winnerMessage.innerText = `${player2.name} Venceu!`;
    } else {
        winnerMessage.innerText = 'Empate!';
    }
    
    gameOverOverlay.classList.add('active');
}

// Eventos de input
window.addEventListener('keydown', e => {
    if (isGameStarted) {
        if (e.key === 'w' && !player1.isDead) {
            flap(player1);
        }
        if (e.key === 'Enter' && !player2.isDead) {
            flap(player2);
        }
    }
});

canvas.addEventListener('click', e => {
    if (isGameStarted) {
        // Permite que qualquer clique faça ambos os pássaros pularem se estiverem vivos
        if (!player1.isDead) flap(player1);
        if (!player2.isDead) flap(player2);
    }
});

// Botões de início e reinício
startButton.addEventListener('click', startCountdown);
restartButton.addEventListener('click', startCountdown);

// Novo botão para voltar ao início
backToStartButton.addEventListener('click', () => {
    gameOverOverlay.classList.remove('active');
    startOverlay.classList.add('active');
});