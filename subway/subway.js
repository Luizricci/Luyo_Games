const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const gameOverlay = document.getElementById('game-overlay');
const score1Display = document.getElementById('score1');
const score2Display = document.getElementById('score2');

let isMobile = false;
if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0) {
    isMobile = true;
}

let gameState = 'start';
let players = [
    { id: 1, lane: 0, x: 0, targetLane: 0, y: 0, width: 40, height: 60, color: '#6c63ff', score: 0, alive: true, character: null, selected: null },
    { id: 2, lane: 2, x: 0, targetLane: 2, y: 0, width: 40, height: 60, color: '#ff69b4', score: 0, alive: true, character: null, selected: null }
];


const characters = [
    { name: 'Prof. Eduardo', img: new Image(), color: '#2ecc71', url: '../public/eduardo.png' },
    { name: 'Prof. Felipe', img: new Image(), color: '#e67e22', url: '../public/felipe.png' },
    { name: 'Prof. Marcelo', img: new Image(), color: '#3498db', url: '../public/marcelo.png' },
    { name: 'Prof. Thiago', img: new Image(), color: '#3498db', url: '../public/thiago.png' },
];


characters.forEach(char => {
    char.img.src = char.url;
});


const coinImage = new Image();
coinImage.src = 'https://cdn.pixabay.com/photo/2017/08/05/11/16/logo-2582748_1280.png';

let obstacles = [];
let coins = [];
let baseSpeed = 5;
let gameSpeed = baseSpeed;
let lastObstacleTime = 0;
let lastCoinTime = 0;
let obstacleSpawnInterval = 1000;
let coinSpawnInterval = 500;
let roadOffset = 0;

const MIN_TRAIN_WIDTH = 80;
const MAX_TRAIN_WIDTH = 120;
const MIN_TRAIN_HEIGHT = 150;
const MAX_TRAIN_HEIGHT = 250;


function resizeCanvas() {
    const width = Math.min(window.innerWidth * 0.9, 500);
    const height = Math.min(window.innerHeight * 0.8, 700);
    canvas.width = width;
    canvas.height = height;
    gameContainer.style.width = `${width}px`;
    gameContainer.style.height = `${height}px`;

    players.forEach(player => {
        player.y = canvas.height - 100;
        player.x = getLaneX(player.lane);
    });
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getLaneX(lane) {
    const laneWidth = canvas.width / 3;
    return lane * laneWidth + laneWidth / 2;
}

function drawPlayers() {
    players.forEach(player => {
        if (player.alive && player.character) {
            ctx.drawImage(player.character.img, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
        }
    });
}


function drawRoad() {
    ctx.fillStyle = '#424242';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const laneWidth = canvas.width / 3;
    ctx.fillStyle = '#f1c40f'; 
    ctx.fillRect(laneWidth - 5, 0, 10, canvas.height);
    ctx.fillRect(laneWidth * 2 - 5, 0, 10, canvas.height);

    const roadLineColor = '#fff'; 
    const roadLineWidth = 5;
    const roadLineLength = 40;
    const roadLineSpacing = 60;
    const numLines = Math.ceil(canvas.height / (roadLineLength + roadLineSpacing));

    for (let i = 0; i < numLines; i++) {
        const y = (i * (roadLineLength + roadLineSpacing) + roadOffset) % (canvas.height + roadLineSpacing);
        ctx.fillStyle = roadLineColor;
        ctx.fillRect(laneWidth / 2 - roadLineWidth / 2, y, roadLineWidth, roadLineLength);
        ctx.fillRect(laneWidth * 1.5 - roadLineWidth / 2, y, roadLineWidth, roadLineLength);
        ctx.fillRect(laneWidth * 2.5 - roadLineWidth / 2, y, roadLineWidth, roadLineLength);
    }
}


function drawTrain(train) {
    const x = getLaneX(train.lane) - train.width / 2;
    const y = train.y;
    const trainColor = '#e74c3c';
    const windowColor = '#ecf0f1';
    const wheelColor = '#bdc3c7';
    
    ctx.fillStyle = trainColor;
    ctx.fillRect(x, y, train.width, train.height);
    
    ctx.fillRect(x + train.width * 0.2, y - 30, train.width * 0.6, 30);
    
    ctx.fillStyle = windowColor;
    ctx.fillRect(x + train.width * 0.3, y - 20, train.width * 0.15, 15);
    ctx.fillRect(x + train.width * 0.55, y - 20, train.width * 0.15, 15);
    
    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(x + train.width * 0.25, y + train.height - 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + train.width * 0.75, y + train.height - 10, 10, 0, Math.PI * 2);
    ctx.fill();
}


function drawObstacles() {
    obstacles.forEach(obstacle => {
        drawTrain(obstacle);
    });
}


function drawCoins() {
    coins.forEach(coin => {
        ctx.drawImage(coinImage, getLaneX(coin.lane) - coin.width / 2, coin.y, coin.width, coin.height);
    });
}

function updateGameObjects() {
    const now = Date.now();
    
    const totalScore = players[0].score + players[1].score;
    // Progressão levemente mais rápida e sem limite superior
    gameSpeed = baseSpeed + (totalScore * 0.07);
    
    roadOffset = (roadOffset + gameSpeed) % (60 + 40);

    if (now - lastObstacleTime > obstacleSpawnInterval) {
        spawnObstacle();
        lastObstacleTime = now;
    }

    if (now - lastCoinTime > coinSpawnInterval) {
        spawnCoin();
        lastCoinTime = now;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += gameSpeed;
        if (obstacles[i].y > canvas.height + 50) {
            obstacles.splice(i, 1);
        }
    }
    
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].y += gameSpeed;
        if (coins[i].y > canvas.height + 50) {
            coins.splice(i, 1);
        }
    }
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const randomWidth = Math.random() * (MAX_TRAIN_WIDTH - MIN_TRAIN_WIDTH) + MIN_TRAIN_WIDTH;
    const randomHeight = Math.random() * (MAX_TRAIN_HEIGHT - MIN_TRAIN_HEIGHT) + MIN_TRAIN_HEIGHT;
    
    obstacles.push({
        type: 'train',
        lane: lane,
        y: -randomHeight,
        width: randomWidth,
        height: randomHeight,
        color: '#34495e'
    });
}

function spawnCoin() {
    const lane = Math.floor(Math.random() * 3);
    coins.push({
        lane: lane,
        y: -50,
        width: 40,
        height: 40
    });
}

function checkCollisions() {
    players.forEach(player => {
        if (!player.alive) return;
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            if (obstacle.lane === player.targetLane) {
                const playerRect = {
                    x: player.x - player.width / 2,
                    y: player.y - player.height / 2,
                    width: player.width,
                    height: player.height
                };
                const obstacleRect = {
                    x: getLaneX(obstacle.lane) - obstacle.width / 2,
                    y: obstacle.y,
                    width: obstacle.width,
                    height: obstacle.height
                };

                if (playerRect.x < obstacleRect.x + obstacleRect.width &&
                    playerRect.x + playerRect.width > obstacleRect.x &&
                    playerRect.y < obstacleRect.y + obstacleRect.height &&
                    playerRect.y + playerRect.height > obstacleRect.y) {
                    player.alive = false;
                    
                    if (!players[0].alive && !players[1].alive) {
                        gameState = 'gameOver';
                        showGameOver();
                    }
                    return;
                }
            }
        }
    });

    
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        let playersWhoGotCoin = [];
        
        players.forEach(player => {
            if (!player.alive) return;
            
            const playerRect = {
                x: player.x - player.width / 2,
                y: player.y - player.height / 2,
                width: player.width,
                height: player.height
            };
            const coinRect = {
                x: getLaneX(coin.lane) - coin.width / 2,
                y: coin.y,
                width: coin.width,
                height: coin.height
            };

            if (playerRect.x < coinRect.x + coinRect.width &&
                playerRect.x + playerRect.width > coinRect.x &&
                playerRect.y < coinRect.y + coinRect.height &&
                playerRect.y + playerRect.height > coinRect.y) {
                playersWhoGotCoin.push(player);
            }
        });
        

        if (playersWhoGotCoin.length > 0) {

            playersWhoGotCoin.forEach(player => {
                player.score += 10;
            });
            
            coins.splice(i, 1);
        }
    }
}

function showGameOver() {
    gameOverlay.style.display = 'flex';
    gameOverlay.innerHTML = `
        <h1>Fim de Jogo!</h1>
        <p class="message-text">Jogador 1: ${players[0].score} pontos</p>
        <p class="message-text">Jogador 2: ${players[1].score} pontos</p>
        <button id="restartButton">Recomeçar</button>
    `;
    document.getElementById('restartButton').addEventListener('click', restartGame);
}

function startGame() {
    gameState = 'playing';
    gameOverlay.style.display = 'none';
    gameLoop();
}

function restartGame() {
    players.forEach(player => {
        player.score = 0;
        player.alive = true;
    });
    players[0].targetLane = 0;
    players[1].targetLane = 2;
    obstacles = [];
    coins = [];
    gameSpeed = baseSpeed;
    showCharacterSelect();
}

function showCharacterSelect() {
    gameState = 'selectCharacter';
    gameOverlay.style.display = 'flex';
    
    let charactersHtml = '';
    characters.forEach((char, index) => {
        charactersHtml += `
            <div class="character-card" data-index="${index}" data-player-select="1">
                <span class="selection-marker selection-marker-p1">P1</span>
                <span class="selection-marker selection-marker-p2">P2</span>
                <img src="${char.url}" alt="${char.name}">
                <p>${char.name}</p>
            </div>
        `;
    });

    gameOverlay.innerHTML = `
        <h1>Escolha seu personagem!</h1>
        <p class="message-text">Jogador 1: WASD | Jogador 2: Setas</p>
        <div class="character-select-container">
            ${charactersHtml}
        </div>
        <button id="confirmSelectionBtn" disabled>Confirmar Seleção</button>
    `;

    const confirmBtn = document.getElementById('confirmSelectionBtn');

    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const isPlayer1Selected = players[0].selected === index;
            const isPlayer2Selected = players[1].selected === index;
            
            if (!isPlayer1Selected && !isPlayer2Selected) {
                if (players[0].selected === null) {
                    players[0].selected = index;
                } else if (players[1].selected === null) {
                    players[1].selected = index;
                }
            } else if (isPlayer1Selected) {
                players[0].selected = null;
            } else if (isPlayer2Selected) {
                players[1].selected = null;
            }
            updateCharacterSelectionUI();
        });
    });

    confirmBtn.addEventListener('click', () => {
        if (players[0].selected !== null && players[1].selected !== null) {
            players[0].character = characters[players[0].selected];
            players[1].character = characters[players[1].selected];
            startGame();
        }
    });
    
    players[0].selected = 0;
    players[1].selected = 1;
    updateCharacterSelectionUI();
}

function updateCharacterSelectionUI() {
    const cards = document.querySelectorAll('.character-card');
    cards.forEach(card => {
        card.classList.remove('player1-selected', 'player2-selected');
        card.querySelector('.selection-marker-p1').style.display = 'none';
        card.querySelector('.selection-marker-p2').style.display = 'none';
    });
    
    if (players[0].selected !== null) {
        cards[players[0].selected].classList.add('player1-selected');
        cards[players[0].selected].querySelector('.selection-marker-p1').style.display = 'block';
    }
    if (players[1].selected !== null) {
        cards[players[1].selected].classList.add('player2-selected');
        cards[players[1].selected].querySelector('.selection-marker-p2').style.display = 'block';
    }
    
    const confirmBtn = document.getElementById('confirmSelectionBtn');
    if (players[0].selected !== null && players[1].selected !== null) {
        confirmBtn.disabled = false;
    } else {
        confirmBtn.disabled = true;
    }
}

function updateScore() {
    score1Display.textContent = `P1: ${players[0].score}`;
    score2Display.textContent = `P2: ${players[1].score}`;
}

function gameLoop() {
    if (gameState !== 'playing') {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoad();

    players.forEach(player => {
        const targetX = getLaneX(player.targetLane);
        player.x += (targetX - player.x) * 0.1;
    });

    updateGameObjects();
    checkCollisions();
    updateScore();

    drawPlayers();
    drawObstacles();
    drawCoins();

    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (gameState === 'selectCharacter') {
        if (e.key.toLowerCase() === 'a') {
            players[0].selected = (players[0].selected - 1 + characters.length) % characters.length;
            updateCharacterSelectionUI();
        } else if (e.key.toLowerCase() === 'd') {
            players[0].selected = (players[0].selected + 1) % characters.length;
            updateCharacterSelectionUI();
        } else if (e.key === 'ArrowLeft') {
            players[1].selected = (players[1].selected - 1 + characters.length) % characters.length;
            updateCharacterSelectionUI();
        } else if (e.key === 'ArrowRight') {
            players[1].selected = (players[1].selected + 1) % characters.length;
            updateCharacterSelectionUI();
        } else if (e.key === 'Enter') {
            if (players[0].selected !== null && players[1].selected !== null) {
                players[0].character = characters[players[0].selected];
                players[1].character = characters[players[1].selected];
                startGame();
            }
        }
    } else if (gameState === 'playing') {
        // Jogador 1 (WASD)
        if (e.key.toLowerCase() === 'a' && players[0].targetLane > 0) {
            players[0].targetLane--;
        } else if (e.key.toLowerCase() === 'd' && players[0].targetLane < 2) {
            players[0].targetLane++;
        }

        // Jogador 2 (Setas)
        if (e.key === 'ArrowLeft' && players[1].targetLane > 0) {
            players[1].targetLane--;
        } else if (e.key === 'ArrowRight' && players[1].targetLane < 2) {
            players[1].targetLane++;
        }
    }
});

let touchStartX = 0;
let touchEndX = 0;

canvas.addEventListener('touchstart', (e) => {
    if (gameState === 'playing') {
        const touchX = e.touches[0].clientX;
        const canvasRect = canvas.getBoundingClientRect();
        const playerToMove = touchX < canvasRect.left + canvas.width / 2 ? players[0] : players[1];
        const touchStartLane = Math.floor(((touchX - canvasRect.left) / canvas.width) * 3);
        playerToMove.targetLane = touchStartLane;
    }
}, false);

window.onload = function() {
    showCharacterSelect();
};