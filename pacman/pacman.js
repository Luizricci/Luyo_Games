document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startOverlay = document.getElementById('startOverlay');
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownText = countdownOverlay.querySelector('h2');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const startButton = document.getElementById('startButton');
    const backButton = document.getElementById('backButton');
    const restartButton = document.getElementById('restartButton');
    const winnerMessage = document.getElementById('winnerMessage');
    const player1NameInput = document.getElementById('player1NameInput');
    const player2NameInput = document.getElementById('player2NameInput');
    const player1ColorInput = document.getElementById('player1ColorInput');
    const player2ColorInput = document.getElementById('player2ColorInput');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const player1ScoreDisplay = document.getElementById('player1ScoreDisplay');
    const player2ScoreDisplay = document.getElementById('player2ScoreDisplay');

    // --- Configurações do Jogo ---
    const TILE_SIZE = 24;
    const VELOCITY = 2.0;

    // Mapa: 1=Parede, 0=Ponto, S=Super Ponto, G=Fantasma, P1/P2=Jogador, 2="Portão" da casa dos fantasmas
    const map = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 'S', 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 'S', 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 'G', 'G', 'G', 'G', 'G', 1, 1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1],
        ['P1', 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 'P2'],
        [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 'S', 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 'S', 1],
        [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
    
    // --- NOVIDADE: Variáveis para controlar as frutas ---
    let player1, player2, ghosts, dots, fruits, isGameRunning, gameLoopId, totalDots, fruitSpawnTimer;

    class Entity {
        constructor(x, y, radius) {
            this.x = x; this.y = y; this.radius = radius;
            this.startX = x; this.startY = y;
            this.dx = 0; this.dy = 0;
            this.nextDx = 0; this.nextDy = 0;
        }

        collidesWith(other) {
            const dist = Math.hypot(this.x - other.x, this.y - other.y);
            return dist < this.radius + other.radius;
        }

        checkWallCollision(centerX, centerY, isPlayer = false) {
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    const tile = map[y][x];
                    const isWall = tile === 1 || (isPlayer && tile === 2);
                    if (isWall) {
                        const wallX = x * TILE_SIZE;
                        const wallY = y * TILE_SIZE;
                        if (centerX + this.radius > wallX &&
                            centerX - this.radius < wallX + TILE_SIZE &&
                            centerY + this.radius > wallY &&
                            centerY - this.radius < wallY + TILE_SIZE) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        
        resetPosition() {
            this.x = this.startX; this.y = this.startY;
            this.dx = 0; this.dy = 0;
            this.nextDx = 0; this.nextDy = 0;
        }
    }

    class Player extends Entity {
        constructor(x, y, color, name, controls) {
            super(x, y, TILE_SIZE / 2 - 2);
            this.color = color; this.name = name; this.controls = controls;
            this.lives = 3; this.score = 0; this.isPoweredUp = false;
            this.direction = 'right';
            // --- NOVIDADE: Estado de caçador ---
            this.isHunter = false;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);

            let angle = 0;
            if (this.direction === 'right') angle = 0;
            else if (this.direction === 'left') angle = Math.PI;
            else if (this.direction === 'up') angle = 1.5 * Math.PI;
            else if (this.direction === 'down') angle = 0.5 * Math.PI;
            
            ctx.rotate(angle);

            const mouthAnimation = Math.abs(Math.sin(Date.now() * 0.02));
            const startAngle = (0.05 + mouthAnimation * 0.15) * Math.PI;
            const endAngle = (1.95 - mouthAnimation * 0.15) * Math.PI;

            // --- NOVIDADE: Lógica para piscar em vermelho quando for caçador ---
            let drawColor = this.color;
            if (this.isHunter) {
                drawColor = Math.floor(Date.now() / 200) % 2 === 0 ? '#FF0000' : this.color;
            }
            ctx.fillStyle = drawColor;

            ctx.beginPath();
            ctx.arc(0, 0, this.radius, startAngle, endAngle);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.restore();
        }
        
        update() {
            const isTryingToTurn = (this.nextDx !== 0 && this.dx === 0) || (this.nextDy !== 0 && this.dy === 0);

            if (isTryingToTurn) {
                const currentTileX = Math.floor(this.x / TILE_SIZE);
                const currentTileY = Math.floor(this.y / TILE_SIZE);
                const centerX = currentTileX * TILE_SIZE + TILE_SIZE / 2;
                const centerY = currentTileY * TILE_SIZE + TILE_SIZE / 2;

                if (!this.checkWallCollision(centerX + this.nextDx, centerY + this.nextDy, true)) {
                    this.x = centerX;
                    this.y = centerY;
                    this.dx = this.nextDx;
                    this.dy = this.nextDy;
                    this.nextDx = 0;
                    this.nextDy = 0;
                }
            }
            
            if (!this.checkWallCollision(this.x + this.dx, this.y + this.dy, true)) {
                this.x += this.dx;
                this.y += this.dy;

                if (this.dx > 0) this.direction = 'right';
                else if (this.dx < 0) this.direction = 'left';
                else if (this.dy > 0) this.direction = 'down';
                else if (this.dy < 0) this.direction = 'up';
            } else {
                this.dx = 0;
                this.dy = 0;
            }
            
            if (this.x < -this.radius) this.x = canvas.width + this.radius;
            if (this.x > canvas.width + this.radius) this.x = -this.radius;
        }

        handleInput(key) {
            if (key === this.controls.up) { this.nextDy = -VELOCITY; this.nextDx = 0; }
            else if (key === this.controls.down) { this.nextDy = VELOCITY; this.nextDx = 0; }
            else if (key === this.controls.left) { this.nextDx = -VELOCITY; this.nextDy = 0; }
            else if (key === this.controls.right) { this.nextDx = VELOCITY; this.nextDy = 0; }
        }

        powerUp() {
            this.isPoweredUp = true;
            setTimeout(() => { this.isPoweredUp = false; }, 5000); 
        }
    }

    class Ghost extends Entity {
        constructor(x, y, color) {
            super(x, y, TILE_SIZE / 2 - 2.5);
            this.color = color;
            this.isEaten = false;
        }
        
        draw() {
            if (this.isEaten) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(this.x - 4, this.y, 3, 0, 2 * Math.PI);
                ctx.arc(this.x + 4, this.y, 3, 0, 2 * Math.PI);
                ctx.fill();
                return;
            }

            ctx.fillStyle = this.isFrightened ? '#ADD8E6' : this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, Math.PI, 2 * Math.PI);
            ctx.lineTo(this.x + this.radius, this.y + this.radius);
            ctx.lineTo(this.x - this.radius, this.y + this.radius);
            ctx.fill();
        }
        
        update() {
            if (this.isEaten) {
                const dx = this.startX - this.x;
                const dy = this.startY - this.y;
                const distance = Math.hypot(dx, dy);

                if (distance < VELOCITY) {
                    this.x = this.startX; this.y = this.startY;
                    this.isEaten = false;
                } else {
                    this.x += (dx / distance) * (VELOCITY * 1.5);
                    this.y += (dy / distance) * (VELOCITY * 1.5);
                }
            } else {
                const possibleDirections = [{dx: VELOCITY, dy: 0}, {dx: -VELOCITY, dy: 0}, {dx: 0, dy: VELOCITY}, {dx: 0, dy: -VELOCITY}];
                
                if (this.checkWallCollision(this.x + this.dx, this.y + this.dy) || Math.random() < 0.02) {
                    let newDir;
                    let attempts = 0;
                    do {
                        newDir = possibleDirections[Math.floor(Math.random() * 4)];
                        attempts++;
                    } while (this.checkWallCollision(this.x + newDir.dx, this.y + newDir.dy) && attempts < 10);
                    
                    this.dx = newDir.dx; this.dy = newDir.dy;
                }
                
                this.x += this.dx; this.y += this.dy;
            }
        }
    }
    
    // --- NOVIDADE: Função para criar as frutas em locais válidos ---
    function spawnFruit() {
        if (fruits.length >= 2) return; // Limita a 2 frutas no mapa

        let fruitX, fruitY;
        let validPosition = false;
        while (!validPosition) {
            fruitX = Math.floor(Math.random() * map[0].length);
            fruitY = Math.floor(Math.random() * map.length);

            // Garante que a fruta não nasça dentro de uma parede
            if (map[fruitY][fruitX] === 0 || map[fruitY][fruitX] === 'S') {
                validPosition = true;
            }
        }
        fruits.push({
            x: fruitX * TILE_SIZE + TILE_SIZE / 2,
            y: fruitY * TILE_SIZE + TILE_SIZE / 2,
            radius: 8
        });
    }

    function initializeGame() {
        player1 = new Player(0, 0, player1ColorInput.value, player1NameInput.value || "Jogador 1", { up: 'w', down: 's', left: 'a', right: 'd' });
        player2 = new Player(0, 0, player2ColorInput.value, player2NameInput.value || "Jogador 2", { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });
        
        // --- NOVIDADE: Reseta as variáveis das frutas ---
        ghosts = []; dots = []; fruits = []; totalDots = 0;
        isGameRunning = true;
        fruitSpawnTimer = 0;
        
        map.forEach((row, y) => {
            row.forEach((tile, x) => {
                const tileX = x * TILE_SIZE + TILE_SIZE / 2;
                const tileY = y * TILE_SIZE + TILE_SIZE / 2;
                if (tile === 0 || tile === 'S') {
                    dots.push({ x: tileX, y: tileY, isSuper: tile === 'S', radius: tile === 'S' ? 6 : 2 });
                    totalDots++;
                } else if (tile === 'P1') {
                    player1.startX = tileX; player1.startY = tileY;
                } else if (tile === 'P2') {
                    player2.startX = tileX; player2.startY = tileY;
                } else if (tile === 'G') {
                    const ghostColors = ['#FF0000', '#FFB6C1', '#00FFFF', '#FF4500', '#FFFFFF'];
                    ghosts.push(new Ghost(tileX, tileY, ghostColors[ghosts.length % ghostColors.length]));
                }
            });
        });
        
        player1.resetPosition(); player2.resetPosition();
        
        startOverlay.classList.add('hidden');
        gameOverOverlay.classList.add('hidden');
        countdownOverlay.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');

        clearInterval(gameLoopId);
        gameLoopId = setInterval(gameLoop, 1000 / 60);
    }
    
    function startCountdown() {
        gameOverOverlay.classList.add('hidden');
        startOverlay.classList.add('hidden');
        countdownOverlay.classList.remove('hidden');
        let count = 3;
        countdownText.textContent = count;
        const timer = setInterval(() => {
            count--;
            if (count > 0) countdownText.textContent = count;
            else { clearInterval(timer); initializeGame(); }
        }, 1000);
    }
    
    function gameLoop() {
        if (!isGameRunning) return;

        // --- NOVIDADE: Timer para criar as frutas periodicamente ---
        fruitSpawnTimer++;
        if (fruitSpawnTimer > 600) { // A cada 10 segundos (600 frames / 60fps)
            spawnFruit();
            fruitSpawnTimer = 0;
        }

        update();
        draw();
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        map.forEach((row, y) => row.forEach((tile, x) => {
            if (tile === 1 || tile === 2) {
                ctx.fillStyle = tile === 1 ? '#0000FF' : '#FFC0CB';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }));
        
        dots.forEach(dot => {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.radius, 0, 2 * Math.PI);
            ctx.fill();
        });

        // --- NOVIDADE: Desenha as frutas na tela ---
        fruits.forEach(fruit => {
            ctx.fillStyle = 'red'; // Cor da fruta
            ctx.beginPath();
            ctx.arc(fruit.x, fruit.y, fruit.radius, 0, 2 * Math.PI);
            ctx.fill();
            // Desenha um "cabinho" verde
            ctx.fillStyle = 'green';
            ctx.fillRect(fruit.x - 2, fruit.y - fruit.radius - 2, 4, 4);
        });

        if (player1.lives > 0) player1.draw();
        if (player2.lives > 0) player2.draw();
        
        ghosts.forEach(ghost => ghost.draw());
    }

    function update() {
        if (player1.lives > 0) player1.update();
        if (player2.lives > 0) player2.update();

        ghosts.forEach(ghost => {
            const isAnyPlayerPoweredUp = (player1.lives > 0 && player1.isPoweredUp) || (player2.lives > 0 && player2.isPoweredUp);
            ghost.isFrightened = isAnyPlayerPoweredUp && !ghost.isEaten;
            ghost.update();
        });
        checkCollisions();
        updateScoreboard();
    }
    
    function checkCollisions() {
        // --- NOVIDADE: Colisão com frutas e entre jogadores ---
        [player1, player2].forEach(player => {
            if (player.lives <= 0) return;

            // Colisão com as frutas
            fruits.forEach((fruit, index) => {
                if (Math.hypot(player.x - fruit.x, player.y - fruit.y) < player.radius + fruit.radius) {
                    player.isHunter = true;
                    // Define o tempo que o jogador ficará como caçador
                    setTimeout(() => { player.isHunter = false; }, 5000); // 5 segundos
                    fruits.splice(index, 1); // Remove a fruta do mapa
                }
            });
            
            // Colisão com pontos
            dots.forEach((dot, index) => {
                if (Math.hypot(player.x - dot.x, player.y - dot.y) < player.radius + dot.radius) {
                    player.score += dot.isSuper ? 50 : 10;
                    if (dot.isSuper) {
                        [player1, player2].forEach(p => p.powerUp());
                    }
                    dots.splice(index, 1);
                    totalDots--;
                }
            });
            // Colisão com fantasmas
            ghosts.forEach(ghost => {
                if (!ghost.isEaten && player.collidesWith(ghost)) {
                    if (player.isPoweredUp) {
                        ghost.isEaten = true;
                        player.score += 200;
                    } else {
                        player.lives--;
                        player.resetPosition();
                        if (player1.lives <= 0 && player2.lives <= 0) endGame();
                    }
                }
            });
        });
        
        // Colisão entre os dois jogadores
        if (player1.lives > 0 && player2.lives > 0 && player1.collidesWith(player2)) {
            if (player1.isHunter && !player2.isHunter) {
                player2.lives--;
                player2.resetPosition();
                player1.score += 500; // Pontos por eliminar o oponente
            } else if (player2.isHunter && !player1.isHunter) {
                player1.lives--;
                player1.resetPosition();
                player2.score += 500;
            }
            if (player1.lives <= 0 || player2.lives <= 0) endGame();
        }
        
        if (totalDots === 0) endGame();
    }
    
    function updateScoreboard() {
        const p1LivesDisplay = player1.lives > 0 ? "❤️".repeat(player1.lives) : "ELIMINADO";
        const p2LivesDisplay = player2.lives > 0 ? "❤️".repeat(player2.lives) : "ELIMINADO";
        player1ScoreDisplay.textContent = `${player1.name}: ${player1.score} | ${p1LivesDisplay}`;
        player2ScoreDisplay.textContent = `${player2.name}: ${player2.score} | ${p2LivesDisplay}`;
    }
    
    function endGame() {
        isGameRunning = false;
        clearInterval(gameLoopId);
        scoreDisplay.classList.add('hidden');
        gameOverOverlay.classList.remove('hidden');

        let finalMessage = "";

        if (totalDots === 0) {
            finalMessage = "Mapa concluído! ";
        } else if (player1.lives <= 0 && player2.lives <= 0) {
            finalMessage = "Fim de Jogo! ";
        }
        
        if (player1.score > player2.score) {
            finalMessage += `${player1.name} venceu com mais pontos!`;
        } else if (player2.score > player1.score) {
            finalMessage += `${player2.name} venceu com mais pontos!`;
        } else {
            finalMessage += "Houve um empate nos pontos!";
        }

        winnerMessage.textContent = finalMessage;
    }
    
    // --- Event Listeners ---
    startButton.addEventListener('click', startCountdown);
    restartButton.addEventListener('click', startCountdown);
    backButton.addEventListener('click', () => {
        gameOverOverlay.classList.add('hidden');
        startOverlay.classList.remove('hidden');
    });

    window.addEventListener('keydown', e => {
        if (!isGameRunning) return;
        if (player1.lives > 0) player1.handleInput(e.key.toLowerCase());
        if (player2.lives > 0) player2.handleInput(e.key);
    });

    window.onload = () => startOverlay.classList.remove('hidden');
});