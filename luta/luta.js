window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const homeScreenContent = document.getElementById('homeScreenContent');
    const characterSelectionScreenContent = document.getElementById('characterSelectionScreenContent');
    const controlsScreenContent = document.getElementById('controlsScreenContent');
    const endGameContent = document.getElementById('endGameContent');
    const mainButton = document.getElementById('mainButton');
    const controlsButton = document.getElementById('controlsButton');
    const playAgainButton = document.getElementById('playAgainButton');
    const backToHomeButton = document.getElementById('backToHomeButton');
    const backToHomeFromControls = document.getElementById('backToHomeFromControls');
    const backToHomeFromSelection = document.getElementById('backToHomeFromSelection');
    const endGameTitle = document.getElementById('endGameTitle');
    const messageBox = document.getElementById('messageBox');
    const gameContainer = document.querySelector('.game-container');
    const player1HealthBar = document.getElementById('player1HealthBar');
    const player2HealthBar = document.getElementById('player2HealthBar');
    const player1StaminaBar = document.getElementById('player1StaminaBar');
    const player2StaminaBar = document.getElementById('player2StaminaBar');
    const player1NameInput = document.getElementById('player1NameInput');
    const player2NameInput = document.getElementById('player2NameInput');
    const player1NameDisplay = document.getElementById('player1Name');
    const player2NameDisplay = document.getElementById('player2Name');
    const timerDisplay = document.getElementById('timer');
    const finishHimDisplay = document.getElementById('finishHim');
    const player1SelectionGrid = document.getElementById('player1SelectionGrid');
    const player2SelectionGrid = document.getElementById('player2SelectionGrid');

    // Game settings
    const canvasWidth = 800;
    const canvasHeight = 450;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const groundY = canvasHeight - 30;
    const gravity = 0.5;
    const jumpPower = -12;
    const moveSpeed = 4;
    const fireballSpeed = 6;

    let gameStarted = false;
    let gameOver = false;
    let fatalityMode = false;
    let fatalityAnimationActive = false;
    let keys = {};
    let projectiles = [];
    let timer = 99;
    let timerId;
    let animationFrameId;
    let fatalityTimeoutId;
    let detachedHead = null;

    // Variáveis para a seleção de personagens
    let selectedHeadP1 = null;
    let selectedHeadP2 = null;
    
    // Sistema de seleção de personagens (baseado no subway)
    let selectedCharacters = {
        player1: null,
        player2: null,
        player1Name: '',
        player2Name: ''
    };

    // Define os personagens com o caminho da imagem da cabeça
    const characters = [
        { name: 'Felipe Dev', img: '../public/cabeca/cabeca2.png' },
        { name: 'Thiago', img: '../public/cabeca/cabeca4.png' },
        { name: 'Marcelo', img: '../public/cabeca/cabeca3.png' },
        { name: 'Eduardo', img: '../public/cabeca/cabeca1.png' }
    ];

    // Platforms
    const platforms = [
        { x: 100, y: 300, width: 150, height: 20 },
        { x: 550, y: 300, width: 150, height: 20 },
        { x: 325, y: 200, width: 150, height: 20 }
    ];

    // Sounds with Tone.js
    const fatalitySynth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: {
            attack: 0.05,
            decay: 0.2,
            sustain: 0.1,
            release: 0.5,
        }
    }).toDestination();
    
    const fireballSynth = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0,
            release: 0.1,
        }
    }).toDestination();
    
    const punchSynth = new Tone.MembraneSynth().toDestination();
    const kickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        envelope: {
            attack: 0.001,
            decay: 0.4,
            sustain: 0.01,
            release: 1.4,
            attackCurve: "exponential"
        }
    }).toDestination();

    // Player class
    class Player {
        constructor({ x, y, playerColor, keysConfig, direction, trunkColor, pantsColor, name, headImagePath }) {
            this.x = x;
            this.y = y;
            this.width = 60; // Tamanho ajustado para proporções melhores
            this.height = 120;
            this.playerColor = playerColor;
            this.trunkColor = trunkColor;
            this.pantsColor = pantsColor;
            this.bodyColor = getComputedStyle(document.documentElement).getPropertyValue('--body-color');
            this.name = name;
            this.health = 100;
            this.stamina = 100;
            this.maxStamina = 100;
            this.velocity = { x: 0, y: 0 };
            this.isJumping = false;
            this.isAttacking = false;
            this.isBlocking = false;
            this.isDead = false;
            this.lastAttackTime = 0;
            this.attackCooldown = 500;
            this.keysConfig = keysConfig;
            this.direction = direction;
            this.isPunching = false;
            this.isKicking = false;
            this.isCrouching = false;
            
            // Carrega a imagem da cabeça se um caminho for fornecido
            this.headImage = new Image();
            if (headImagePath) {
                this.headImage.src = headImagePath;
            } else {
                this.headImage = null; // Garante que a imagem não é carregada se não houver caminho
            }
        }

        draw() {
            if (this.isDead && fatalityAnimationActive) {
                return;
            }
            
            // *** CÓDIGO MODIFICADO: Posição do nome ajustada ***
            // Draw player name above the head - Posição Y movida de -15 para -20
            ctx.fillStyle = this.playerColor;
            ctx.font = "12px 'Press Start 2P', cursive";
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x + this.width / 2, this.y - 20);
            
            // Base x position for drawing, adjusted for direction
            const baseX = this.direction === 'right' ? this.x : this.x + this.width;
            const xScale = this.direction === 'right' ? 1 : -1;

            // Mantemos o pé no chão e baixamos o topo do corpo via ajustes internos
            const crouchOffset = 0;
            ctx.save();
            ctx.translate(baseX, this.y + crouchOffset);
            ctx.scale(xScale, 1);

            // *** CÓDIGO MODIFICADO: Posição da cabeça ajustada (+6px para cima) ***
            // Head (draw image if available, otherwise draw circle)
            if (this.headImage && this.headImage.complete) {
                // Cabeça bem mais baixa quando agachado
                const headY = this.isCrouching ? 10 : -5;
                ctx.drawImage(this.headImage, this.width / 2 - 25, headY, 50, 50);
            } else {
                ctx.beginPath();
                const headCY = this.isCrouching ? 14 : 4;
                ctx.arc(this.width / 2, headCY, 15, 0, Math.PI * 2);
                ctx.fillStyle = this.bodyColor;
                ctx.fill();
            }

            // *** CÓDIGO MODIFICADO: Posição do tronco ajustada ***
            // Trunk - Posição Y movida de 35 para 30 para se conectar à cabeça
            ctx.fillStyle = this.trunkColor;
            const trunkHeight = (this.height * 0.4) - (this.isCrouching ? 30 : 0);
            const trunkY = this.isCrouching ? 65 : 40; // tronco bem mais baixo quando agachado
            ctx.fillRect(this.width / 4, trunkY, this.width / 2, trunkHeight);

            // Arms
            ctx.fillStyle = this.bodyColor;
            
            // Animação de soco aprimorada
            if (this.isPunching) {
                // Braço de soco (estendido e com "mão")
                ctx.fillRect(this.width / 2, this.height * 0.35, this.width * 0.7, 10); // Braço estendido
                ctx.fillRect(this.width * 1.2, this.height * 0.35 - 2.5, 15, 15); // "Mão"
                // Braço de trás (encolhido)
                ctx.fillRect(this.width / 4 - 5, this.height * 0.35, 10, this.height * 0.2);
            } else {
                // Braços normais
                const armYOffset = this.isCrouching ? 26 : 0;
                ctx.fillRect(this.width / 4, this.height * 0.35 + armYOffset, 10, this.height * 0.3 - armYOffset);
                ctx.fillRect(this.width * 0.75 - 10, this.height * 0.35 + armYOffset, 10, this.height * 0.3 - armYOffset);
            }

            // Legs
            ctx.fillStyle = this.pantsColor;
            
            // Animação de chute aprimorada
            if (this.isKicking) {
                // Perna de chute (mais alta e estendida)
                ctx.save();
                ctx.translate(this.width * 0.5, this.height * 0.75);
                ctx.rotate(-Math.PI / 4); // Angulo do chute ajustado
                ctx.fillRect(0, -5, this.height * 0.5, 10); // Perna mais longa
                ctx.restore();
                
                // Perna de apoio (dobrada)
                ctx.beginPath();
                ctx.moveTo(this.width * 0.35, this.height * 0.75);
                ctx.lineTo(this.width * 0.30, this.height * 0.9);
                ctx.lineTo(this.width * 0.45, this.height);
                ctx.lineWidth = 10;
                ctx.strokeStyle = this.pantsColor;
                ctx.stroke();

            } else {
                if (this.isCrouching) {
                    // Pernas dobradas (joelhos) mantendo os pés no chão
                    ctx.lineWidth = 10;
                    ctx.strokeStyle = this.pantsColor;
                    // Perna esquerda
                    const hipL = { x: this.width * 0.35, y: this.height * 0.75 };
                    const kneeL = { x: hipL.x - 10, y: this.height * 0.88 };
                    const footL = { x: kneeL.x - 6, y: this.height };
                    ctx.beginPath();
                    ctx.moveTo(hipL.x, hipL.y);
                    ctx.lineTo(kneeL.x, kneeL.y);
                    ctx.lineTo(footL.x, footL.y);
                    ctx.stroke();
                    // Perna direita
                    const hipR = { x: this.width * 0.75 - 10, y: this.height * 0.75 };
                    const kneeR = { x: hipR.x + 10, y: this.height * 0.88 };
                    const footR = { x: kneeR.x + 6, y: this.height };
                    ctx.beginPath();
                    ctx.moveTo(hipR.x, hipR.y);
                    ctx.lineTo(kneeR.x, kneeR.y);
                    ctx.lineTo(footR.x, footR.y);
                    ctx.stroke();
                } else {
                    // Pernas normais em pé
                    const legYOffset = 0;
                    const legHeight = this.height * 0.25;
                    ctx.fillRect(this.width * 0.25, this.height * 0.75 + legYOffset, 10, legHeight);
                    ctx.fillRect(this.width * 0.75 - 10, this.height * 0.75 + legYOffset, 10, legHeight);
                }
            }
            
            ctx.restore();
        }

        update() {
            if (this.isDead) {
                this.velocity.x = 0;
                this.velocity.y = 0;
                return;
            }
            this.draw();
            this.x += this.velocity.x;
            this.y += this.velocity.y;

            let onPlatform = false;
            let newY = this.y + this.velocity.y;

            // Check for collisions with platforms
            platforms.forEach(platform => {
                if (
                    this.y + this.height <= platform.y &&
                    newY + this.height >= platform.y &&
                    this.x + this.width >= platform.x &&
                    this.x <= platform.x + platform.width
                ) {
                    // Land on platform
                    this.velocity.y = 0;
                    this.y = platform.y - this.height;
                    this.isJumping = false;
                    onPlatform = true;
                }
            });

            // Check for collision with ground
            if (!onPlatform && this.y + this.height < groundY) {
                this.velocity.y += gravity;
            } else if (!onPlatform) {
                this.velocity.y = 0;
                this.y = groundY - this.height;
                this.isJumping = false;
            }
            
            if (this.y + this.height >= groundY) {
                this.isJumping = false;
            }

            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        }
        
        jump() {
            if (this.isCrouching) return; // não pula agachado
            let onGround = this.y + this.height >= groundY;
            let onPlatform = platforms.some(platform => 
                this.y + this.height === platform.y &&
                this.x + this.width > platform.x &&
                this.x < platform.x + platform.width
            );

            if (!this.isJumping && (onGround || onPlatform)) {
                this.velocity.y = jumpPower;
                this.isJumping = true;
            }
        }

        // Retorna a hitbox efetiva, considerando agachado
        getHitbox() {
            const crouchReduction = this.isCrouching ? 48 : 0;
            return {
                x: this.x,
                y: this.y + crouchReduction,
                width: this.width,
                height: this.height - crouchReduction
            };
        }

        takeHit(damage) {
            if (this.isBlocking) {
                this.stamina -= damage;
                if (this.stamina < 0) {
                    this.stamina = 0;
                    this.isBlocking = false;
                }
            } else {
                this.health -= damage;
            }
            if (this.health < 0) this.health = 0;
        }

        punch() {
            if (Date.now() - this.lastAttackTime > this.attackCooldown) {
                punchSynth.triggerAttackRelease("C4", "8n");
                this.isAttacking = true;
                this.isPunching = true;
                this.lastAttackTime = Date.now();
                setTimeout(() => {
                    this.isAttacking = false;
                    this.isPunching = false;
                }, 200);
                // Hitbox mais curta para evitar acertos de longe
                const crouchAdjust = this.isCrouching ? 40 : 0;
                return { damage: 10, range: 30, yOffset: 60 + crouchAdjust, height: 12, width: 24 };
            }
            return null;
        }

        kick() {
            if (Date.now() - this.lastAttackTime > this.attackCooldown) {
                kickSynth.triggerAttackRelease("G3", "8n");
                this.isAttacking = true;
                this.isKicking = true;
                this.lastAttackTime = Date.now();
                setTimeout(() => {
                    this.isAttacking = false;
                    this.isKicking = false;
                }, 200);
                // Hitbox mais curta para evitar acertos de longe
                const crouchAdjust = this.isCrouching ? 45 : 0;
                return { damage: 15, range: 35, yOffset: 120 + crouchAdjust, height: 14, width: 36 };
            }
            return null;
        }

        fireball() {
            const fireballCost = 30;
            if (this.stamina >= fireballCost && Date.now() - this.lastAttackTime > 1500) {
                fireballSynth.triggerAttackRelease("8n");
                this.stamina -= fireballCost;
                this.lastAttackTime = Date.now();
                const projectileSpeed = this.direction === 'left' ? -fireballSpeed : fireballSpeed;
                const projectileX = this.x + (this.direction === 'left' ? -20 : this.width);
                projectiles.push(new Projectile({
                    x: projectileX,
                    y: this.y + this.height / 2 - 5,
                    width: 20,
                    height: 10,
                    color: getComputedStyle(document.documentElement).getPropertyValue('--fireball-color'),
                    velocity: projectileSpeed,
                    owner: this
                }));
            }
        }
    }

    // Projectile class (Fireball)
    class Projectile {
        constructor({ x, y, width, height, color, velocity, owner }) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;
            this.velocity = velocity;
            this.owner = owner;
            this.isHit = false;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        update() {
            this.x += this.velocity;
            this.draw();
        }
    }

    // Head class for fatality animation
    class Head {
        constructor({ x, y, color, velocityX, velocityY, image }) {
            this.x = x;
            this.y = y;
            this.size = 20;
            this.color = color;
            this.velocity = { x: velocityX, y: velocityY };
            this.image = image;
            this.imageSize = 50;
            // Propriedades para rotação/rolagem
            this.angle = 0; // em radianos
            this.angularVelocity = 0; // rad/s (aprox por frame)
        }

        draw() {
            if (this.image && this.image.complete) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.drawImage(this.image, -this.imageSize / 2, -this.imageSize / 2, this.imageSize, this.imageSize);
                ctx.restore();
            } else {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        update() {
            // Gravidade/colisão com chão
            if (this.y + this.size < groundY) {
                this.velocity.y += gravity;
                // no ar, uma leve dissipação para evitar spin excessivo
                this.angularVelocity *= 0.995;
            } else {
                // Ao tocar o chão, fixa no plano e aplica atrito
                this.velocity.y = 0;
                this.y = groundY - this.size;
                // Atrito linear mais leve e amortecimento angular
                const linearFriction = 0.985;
                const angularDamping = 0.99;
                this.velocity.x *= linearFriction;
                this.angularVelocity *= angularDamping;
                // Rolagem natural: aproxima velocidade angular alvo (omega = v/r)
                const r = this.size;
                const omegaTarget = this.velocity.x / r; // rolagem sem escorregar
                // interpola suavemente para evitar giros rápidos
                this.angularVelocity += (omegaTarget - this.angularVelocity) * 0.08;
                // Clamps para parar jitter
                if (Math.abs(this.velocity.x) < 0.02) this.velocity.x = 0;
                if (Math.abs(this.angularVelocity) < 0.005) this.angularVelocity = 0;
            }

            // Colisão simples com paredes (bordas do canvas)
            if (this.x - this.size <= 0 && this.velocity.x < 0) {
                this.x = this.size;
                this.velocity.x *= -0.5; // rebate com perda
                this.angularVelocity *= 0.8;
            }
            if (this.x + this.size >= canvas.width && this.velocity.x > 0) {
                this.x = canvas.width - this.size;
                this.velocity.x *= -0.5;
                this.angularVelocity *= 0.8;
            }

            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.angle += this.angularVelocity;
        }
    }

    let player1, player2;

    function initGame() {
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        if (timerId) { clearInterval(timerId); }
        if (fatalityTimeoutId) { clearTimeout(fatalityTimeoutId); }
        
        // CORREÇÃO: Esconder todas as telas e mostrar o jogo
        messageBox.style.display = 'none';
        homeScreenContent.style.display = 'none';
        characterSelectionScreenContent.style.display = 'none';
        controlsScreenContent.style.display = 'none';
        endGameContent.style.display = 'none';
        gameContainer.style.display = 'flex';
        finishHimDisplay.style.display = 'none';
        
        player1 = new Player({
            x: 100, y: groundY - 120,
            playerColor: getComputedStyle(document.documentElement).getPropertyValue('--player1-color'),
            trunkColor: getComputedStyle(document.documentElement).getPropertyValue('--p1-trunk-color'),
            pantsColor: getComputedStyle(document.documentElement).getPropertyValue('--p1-pants-color'),
            keysConfig: { left: 'a', right: 'd', jump: 'w', block: 's', punch: 'r', kick: 't', fireball: 'z' },
            direction: 'right',
            name: selectedCharacters.player1Name || player1NameInput.value.trim() || 'JOGADOR 1',
            headImagePath: selectedHeadP1
        });
        
        player2 = new Player({
            x: canvasWidth - 140, y: groundY - 120,
            playerColor: getComputedStyle(document.documentElement).getPropertyValue('--player2-color'),
            trunkColor: getComputedStyle(document.documentElement).getPropertyValue('--p2-trunk-color'),
            pantsColor: getComputedStyle(document.documentElement).getPropertyValue('--p2-pants-color'),
            keysConfig: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', block: 'ArrowDown', punch: 'k', kick: 'l', fireball: 'j' },
            direction: 'left',
            name: selectedCharacters.player2Name || player2NameInput.value.trim() || 'JOGADOR 2',
            headImagePath: selectedHeadP2
        });

        player1NameDisplay.innerText = player1.name;
        player2NameDisplay.innerText = player2.name;

        gameStarted = true;
        gameOver = false;
        fatalityMode = false;
        fatalityAnimationActive = false;
        keys = {};
        projectiles = [];
        timer = 99;
        detachedHead = null;
        
        timerId = setInterval(() => {
            timer--;
            if (timer <= 0) { endGame(); }
        }, 1000);

        animate();
    }

    function endGame(winner = null) {
        gameOver = true;
        clearInterval(timerId);
        cancelAnimationFrame(animationFrameId);
        messageBox.style.display = 'block';
        gameContainer.style.display = 'none';
        finishHimDisplay.style.display = 'none';
        
        homeScreenContent.style.display = 'none';
        controlsScreenContent.style.display = 'none';
        characterSelectionScreenContent.style.display = 'none';
        endGameContent.style.display = 'block';

        endGameTitle.innerText = winner ? `${winner} Venceu!` : 'Empate!';
    }

    function showHomeScreen() {
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        if (timerId) { clearInterval(timerId); }
        if (fatalityTimeoutId) { clearTimeout(fatalityTimeoutId); }

        gameStarted = false;
        gameOver = false;
        fatalityMode = false;
        fatalityAnimationActive = false;
        keys = {};
        projectiles = [];
        timer = 99;
        detachedHead = null;
        selectedHeadP1 = null;
        selectedHeadP2 = null;
        
        // Reset das seleções de personagens
        selectedCharacters.player1 = null;
        selectedCharacters.player2 = null;
        selectedCharacters.player1Name = '';
        selectedCharacters.player2Name = '';

        messageBox.style.display = 'block';
        gameContainer.style.display = 'none';
        finishHimDisplay.style.display = 'none';
        
        controlsScreenContent.style.display = 'none';
        endGameContent.style.display = 'none';
        characterSelectionScreenContent.style.display = 'none';
        homeScreenContent.style.display = 'block';
    }
    
    function showControlsScreen() {
        homeScreenContent.style.display = 'none';
        controlsScreenContent.style.display = 'block';
    }

    function showCharacterSelectionScreen() {
        const p1Name = player1NameInput.value.trim();
        const p2Name = player2NameInput.value.trim();
        
        // Armazena os nomes
        selectedCharacters.player1Name = p1Name || 'JOGADOR 1';
        selectedCharacters.player2Name = p2Name || 'JOGADOR 2';
        
        homeScreenContent.style.display = 'none';
        characterSelectionScreenContent.style.display = 'block';
        
        // Configura a seleção de personagens baseada no subway
        setupCharacterSelection();
    }

    // Sistema de seleção baseado no subway
    function setupCharacterSelection() {
        const confirmBtn = document.getElementById('confirmSelectionBtn');
        
        // Inicializa seleções padrão
        selectedCharacters.player1 = 0; // Felipe
        selectedCharacters.player2 = 1; // Thiago

        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.character);
                const isPlayer1Selected = selectedCharacters.player1 === index;
                const isPlayer2Selected = selectedCharacters.player2 === index;
                
                if (!isPlayer1Selected && !isPlayer2Selected) {
                    if (selectedCharacters.player1 === null) {
                        selectedCharacters.player1 = index;
                    } else if (selectedCharacters.player2 === null) {
                        selectedCharacters.player2 = index;
                    }
                } else if (isPlayer1Selected) {
                    selectedCharacters.player1 = null;
                } else if (isPlayer2Selected) {
                    selectedCharacters.player2 = null;
                }
                updateCharacterSelectionUI();
            });
        });

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                if (selectedCharacters.player1 !== null && selectedCharacters.player2 !== null) {
                    // Define as imagens dos personagens selecionados
                    selectedHeadP1 = characters[selectedCharacters.player1].img;
                    selectedHeadP2 = characters[selectedCharacters.player2].img;
                    
                    // Inicia o jogo
                    initGame();
                }
            });
        }
        
        // Atualiza a UI inicial
        updateCharacterSelectionUI();
    }

    function updateCharacterSelectionUI() {
        const cards = document.querySelectorAll('.character-card');
        cards.forEach(card => {
            card.classList.remove('player1-selected', 'player2-selected');
            card.querySelector('.selection-marker-p1').style.display = 'none';
            card.querySelector('.selection-marker-p2').style.display = 'none';
        });
        
        if (selectedCharacters.player1 !== null) {
            cards[selectedCharacters.player1].classList.add('player1-selected');
            cards[selectedCharacters.player1].querySelector('.selection-marker-p1').style.display = 'block';
        }
        if (selectedCharacters.player2 !== null) {
            cards[selectedCharacters.player2].classList.add('player2-selected');
            cards[selectedCharacters.player2].querySelector('.selection-marker-p2').style.display = 'block';
        }
        
        const confirmBtn = document.getElementById('confirmSelectionBtn');
        if (confirmBtn) {
            confirmBtn.disabled = selectedCharacters.player1 === null || selectedCharacters.player2 === null;
        }
    }

    function updateHealthBars() {
        player1HealthBar.style.width = `${player1.health}%`;
        player2HealthBar.style.width = `${player2.health}%`;
        player1StaminaBar.style.width = `${player1.stamina}%`;
        player2StaminaBar.style.width = `${player2.stamina}%`;
        
        if (player1.health <= 30) player1HealthBar.style.backgroundColor = 'red';
        else if (player1.health <= 60) player1HealthBar.style.backgroundColor = 'orange';
        else player1HealthBar.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--player1-color');

        if (player2.health <= 30) player2HealthBar.style.backgroundColor = 'red';
        else if (player2.health <= 60) player2HealthBar.style.backgroundColor = 'orange';
        else player2HealthBar.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--player2-color');
    }
    
    // Fatality animation state
    let animationStep = 0;
    const animationSteps = 10;
    let winner, loser;
    const headDetachStep = 7;

    function playFatalityAnimation() {
        if (animationStep < animationSteps) {
            // Move winner towards loser
            const targetX = loser.x - (winner.width / 2);
            const diffX = targetX - winner.x;
            winner.x += diffX * 0.1;
            winner.isAttacking = true;
            animationStep++;
            
            // Reduce loser's health for visual effect
            loser.health -= 100 / animationSteps;
            if(loser.health < 0) loser.health = 0;

            // Detach head at a specific step
            if (animationStep === headDetachStep && detachedHead === null) {
                const initialVX = loser.direction === 'right' ? 6 : -6; // impulso lateral
                const initialVY = -7; // impulso vertical
                detachedHead = new Head({
                    x: loser.x + loser.width / 2,
                    y: loser.y + 10, // ligeiramente mais baixo para melhor saída
                    color: getComputedStyle(document.documentElement).getPropertyValue('--body-color'),
                    velocityX: initialVX,
                    velocityY: initialVY,
                    image: loser.headImage
                });
                // Rotação inicial mais sutil
                detachedHead.angularVelocity = (initialVX / detachedHead.size) * 0.15;
                loser.isDead = true; // Mark loser as dead so no body is drawn
            }

            // Play a punch sound for each step
            punchSynth.triggerAttackRelease("C4", "32n");
        } else {
            winner.isAttacking = false;
            loser.health = 0;
            // End the game after a small delay to let the animation finish
            fatalityTimeoutId = setTimeout(() => {
                const winnerName = winner === player1 ? player1.name : player2.name;
                endGame(winnerName);
            }, 2500); // 2.5 seconds delay
        }
    }

    function animate() {
        if (gameOver) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw ground
        ctx.fillStyle = '#333';
        ctx.fillRect(0, groundY, canvasWidth, canvasHeight - groundY);
        
        // Draw platforms
        ctx.fillStyle = '#6b7280';
        platforms.forEach(platform => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });
        
        if (fatalityAnimationActive) {
            playFatalityAnimation();
            player1.update();
            player2.update();
            if (detachedHead) {
                detachedHead.update();
                detachedHead.draw();
            }
        } else if (fatalityMode) {
            // Stop movement in fatality mode
            player1.velocity.x = 0;
            player2.velocity.x = 0;
            player1.update();
            player2.update();
        } else {
            player1.velocity.x = 0;
            player2.velocity.x = 0;
            player1.isBlocking = keys[player1.keysConfig.block];
            player2.isBlocking = keys[player2.keysConfig.block];

            // Crouch (agachar) - S para P1 e ArrowDown para P2
            player1.isCrouching = !!keys[player1.keysConfig.block];
            player2.isCrouching = !!keys[player2.keysConfig.block];

            // Movimentação reduzida quando agachado
            const p1Move = player1.isCrouching ? moveSpeed * 0.5 : moveSpeed;
            const p2Move = player2.isCrouching ? moveSpeed * 0.5 : moveSpeed;

            if (keys[player1.keysConfig.left]) { 
                player1.velocity.x = -p1Move; 
                player1.direction = 'left'; 
            }
            if (keys[player1.keysConfig.right]) { 
                player1.velocity.x = p1Move; 
                player1.direction = 'right'; 
            }
            if (keys[player1.keysConfig.jump]) { player1.jump(); }

            if (keys[player2.keysConfig.left]) { 
                player2.velocity.x = -p2Move; 
                player2.direction = 'left'; 
            }
            if (keys[player2.keysConfig.right]) { 
                player2.velocity.x = p2Move; 
                player2.direction = 'right'; 
            }
            if (keys[player2.keysConfig.jump]) { player2.jump(); }
            
            player1.update();
            player2.update();
            
            // Check attack collision
            const checkCollision = (attacker, defender, attack) => {
                // Usa hitbox efetiva do defensor (considera crouch)
                const def = defender.getHitbox();
                // Janela vertical do golpe
                const attackY = attacker.y + attack.yOffset;
                const verticalOverlap =
                    attackY + attack.height >= def.y &&
                    attackY <= def.y + def.height;

                if (!verticalOverlap) return;

                // Distância horizontal entre a frente do atacante e a frente do defensor
                const attackerFront = attacker.direction === 'right' ? attacker.x + attacker.width : attacker.x;
                const defenderFront = attacker.direction === 'right' ? def.x : def.x + def.width;
                const horizontalGap = attacker.direction === 'right'
                    ? defenderFront - attackerFront
                    : attackerFront - defenderFront;

                // Só conta se o defensor estiver à frente e dentro do alcance declarado
                if (horizontalGap >= 0 && horizontalGap <= attack.range) {
                    defender.takeHit(attack.damage);
                }
            };

            if (keys[player1.keysConfig.punch]) { 
                const attack = player1.punch(); 
                if (attack) checkCollision(player1, player2, attack);
            }
            if (keys[player1.keysConfig.kick]) { 
                const attack = player1.kick();
                if (attack) checkCollision(player1, player2, attack);
            }
            if (keys[player1.keysConfig.fireball]) { player1.fireball(); }

            if (keys[player2.keysConfig.punch]) {
                const attack = player2.punch();
                if (attack) checkCollision(player2, player1, attack);
            }
            if (keys[player2.keysConfig.kick]) {
                const attack = player2.kick();
                if (attack) checkCollision(player2, player1, attack);
            }
            if (keys[player2.keysConfig.fireball]) { player2.fireball(); }

            // Check projectile collision
            projectiles.forEach((p, index) => {
                p.update();
                const opponent = p.owner === player1 ? player2 : player1;
                const def = opponent.getHitbox();
                if (
                    p.x + p.width >= def.x &&
                    p.x <= def.x + def.width &&
                    p.y + p.height >= def.y &&
                    p.y <= def.y + def.height
                ) {
                    if (!p.isHit) {
                        opponent.takeHit(25);
                        p.isHit = true;
                        projectiles.splice(index, 1);
                    }
                }
                if (p.x < -p.width || p.x > canvas.width) {
                    projectiles.splice(index, 1);
                }
            });
        }
        
        updateHealthBars();
        timerDisplay.innerText = timer;
        
        // Check fatality condition
        if (player1.health <= 10 && player2.health > 0 && !fatalityMode && !fatalityAnimationActive) {
            fatalityMode = true;
            finishHimDisplay.style.display = 'block';
            fatalitySynth.triggerAttackRelease("C4", "1s");
        }
        if (player2.health <= 10 && player1.health > 0 && !fatalityMode && !fatalityAnimationActive) {
            fatalityMode = true;
            finishHimDisplay.style.display = 'block';
            fatalitySynth.triggerAttackRelease("C4", "1s");
        }

        if (player1.health <= 0 && !fatalityAnimationActive) { endGame(player2.name); }
        if (player2.health <= 0 && !fatalityAnimationActive) { endGame(player1.name); }
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    document.addEventListener('keydown', (e) => {
        // Controles na tela de seleção de personagens
        if (characterSelectionScreenContent.style.display === 'block') {
            if (e.key.toLowerCase() === 'a') {
                selectedCharacters.player1 = (selectedCharacters.player1 - 1 + characters.length) % characters.length;
                updateCharacterSelectionUI();
            } else if (e.key.toLowerCase() === 'd') {
                selectedCharacters.player1 = (selectedCharacters.player1 + 1) % characters.length;
                updateCharacterSelectionUI();
            } else if (e.key === 'ArrowLeft') {
                selectedCharacters.player2 = (selectedCharacters.player2 - 1 + characters.length) % characters.length;
                updateCharacterSelectionUI();
            } else if (e.key === 'ArrowRight') {
                selectedCharacters.player2 = (selectedCharacters.player2 + 1) % characters.length;
                updateCharacterSelectionUI();
            } else if (e.key === 'Enter') {
                if (selectedCharacters.player1 !== null && selectedCharacters.player2 !== null) {
                    // Define as imagens dos personagens selecionados
                    selectedHeadP1 = characters[selectedCharacters.player1].img;
                    selectedHeadP2 = characters[selectedCharacters.player2].img;
                    
                    // Inicia o jogo
                    initGame();
                }
            }
            return; // Sai da função se estiver na tela de seleção
        }
        
        // Registra teclas durante o jogo
        if (e.key && gameStarted) {
            keys[e.key] = true;
            keys[e.key.toLowerCase()] = true;
        }
        
        if (fatalityMode && !fatalityAnimationActive) {
            if (e.key.toLowerCase() === 'x' && player1.health > 0 && player2.health <= 10) {
                fatalityAnimationActive = true;
                animationStep = 0;
                winner = player1;
                loser = player2;
            }
            if (e.key.toLowerCase() === 'i' && player2.health > 0 && player1.health <= 10) {
                fatalityAnimationActive = true;
                animationStep = 0;
                winner = player2;
                loser = player1;
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Ignora keyup se estiver na tela de seleção
        if (characterSelectionScreenContent.style.display === 'block') {
            return;
        }
        
        if (e.key) {  // Verifica se a key existe
            keys[e.key] = false;
            keys[e.key.toLowerCase()] = false;
        }
    });

    // Set up initial and end game button handlers
    mainButton.removeEventListener('click', showCharacterSelectionScreen);
    mainButton.addEventListener('click', showCharacterSelectionScreen);
    controlsButton.addEventListener('click', showControlsScreen);
    backToHomeFromSelection.addEventListener('click', showHomeScreen);
    backToHomeFromControls.addEventListener('click', showHomeScreen);
    playAgainButton.addEventListener('click', initGame);
    backToHomeButton.addEventListener('click', showHomeScreen);
    
    // Show the home screen initially
    showHomeScreen();
}