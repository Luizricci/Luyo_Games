window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const homeScreenContent = document.getElementById('homeScreenContent');
    const controlsScreenContent = document.getElementById('controlsScreenContent');
    const endGameContent = document.getElementById('endGameContent');
    const mainButton = document.getElementById('mainButton');
    const controlsButton = document.getElementById('controlsButton');
    const playAgainButton = document.getElementById('playAgainButton');
    const backToHomeButton = document.getElementById('backToHomeButton');
    const backToHomeFromControls = document.getElementById('backToHomeFromControls');
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
        constructor({ x, y, playerColor, keysConfig, direction, trunkColor, pantsColor, name }) {
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
        }

        draw() {
            if (this.isDead && fatalityAnimationActive) {
                return;
            }
            
            // Draw player name above the head
            ctx.fillStyle = this.playerColor;
            ctx.font = "12px 'Press Start 2P', cursive";
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x + this.width / 2, this.y - 10);
            
            // Base x position for drawing, adjusted for direction
            const baseX = this.direction === 'right' ? this.x : this.x + this.width;
            const xScale = this.direction === 'right' ? 1 : -1;

            ctx.save();
            ctx.translate(baseX, this.y);
            ctx.scale(xScale, 1);

            // Head
            if (!this.isDead) {
                ctx.beginPath();
                ctx.arc(this.width / 2, 20, 15, 0, Math.PI * 2);
                ctx.fillStyle = this.bodyColor;
                ctx.fill();
            }

            // Trunk
            ctx.fillStyle = this.trunkColor;
            ctx.fillRect(this.width / 4, 30, this.width / 2, this.height * 0.4);

            // Arms
            ctx.fillStyle = this.bodyColor;
            
            if (this.isPunching) {
                // Braço de soco
                ctx.fillRect(this.width / 4 + 10, this.height * 0.3, this.width * 0.8, 10);
                // Braço de trás
                ctx.fillRect(this.width / 4, this.height * 0.3, 10, this.height * 0.3);
            } else {
                // Braços normais
                ctx.fillRect(this.width / 4, this.height * 0.3, 10, this.height * 0.3);
                ctx.fillRect(this.width * 0.75 - 10, this.height * 0.3, 10, this.height * 0.3);
            }

            // Legs
            ctx.fillStyle = this.pantsColor;
            
            if (this.isKicking) {
                // Perna de chute
                ctx.save();
                ctx.translate(this.width * 0.5, this.height * 0.7 + 10);
                ctx.rotate(Math.PI / 4 * 1.5);
                ctx.fillRect(-5, -5, 10, this.height * 0.6);
                ctx.restore();
                // Perna de apoio
                ctx.fillRect(this.width * 0.25, this.height * 0.7, 10, this.height * 0.3);
            } else {
                 // Pernas normais
                ctx.fillRect(this.width * 0.25, this.height * 0.7, 10, this.height * 0.3);
                ctx.fillRect(this.width * 0.75 - 10, this.height * 0.7, 10, this.height * 0.3);
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
                return { damage: 10, range: 40, yOffset: 60, height: 10, width: 40 };
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
                return { damage: 15, range: 60, yOffset: 120, height: 15, width: 80 };
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
        constructor({ x, y, color, velocityX, velocityY }) {
            this.x = x;
            this.y = y;
            this.size = 20;
            this.color = color;
            this.velocity = { x: velocityX, y: velocityY };
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            if (this.y + this.size < groundY) {
                this.velocity.y += gravity;
            } else {
                this.velocity.y = 0;
                this.y = groundY - this.size;
            }
            this.x += this.velocity.x;
            this.y += this.velocity.y;
        }
    }

    let player1, player2;

    function initGame() {
        // Checa se os nomes dos jogadores foram inseridos
        const p1Name = player1NameInput.value.trim() || 'JOGADOR 1';
        const p2Name = player2NameInput.value.trim() || 'JOGADOR 2';

        if (!p1Name || !p2Name) {
            // Se algum nome estiver faltando, não inicia o jogo e retorna
            return;
        }

        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        if (timerId) { clearInterval(timerId); }

        player1NameDisplay.innerText = p1Name;
        player2NameDisplay.innerText = p2Name;

        messageBox.style.display = 'none';
        homeScreenContent.style.display = 'none';
        controlsScreenContent.style.display = 'none';
        endGameContent.style.display = 'none';
        gameContainer.style.display = 'flex';
        finishHimDisplay.style.display = 'none';
        
        player1 = new Player({
            x: 100, y: groundY - 120,
            playerColor: getComputedStyle(document.documentElement).getPropertyValue('--player1-color'),
            trunkColor: getComputedStyle(document.documentElement).getPropertyValue('--p1-trunk-color'),
            pantsColor: getComputedStyle(document.documentElement).getPropertyValue('--p1-pants-color'),
            keysConfig: { left: 'a', right: 'd', jump: 'w', block: 's', punch: 'q', kick: 'e', fireball: 'z' },
            direction: 'right',
            name: p1Name
        });
        player2 = new Player({
            x: canvasWidth - 140, y: groundY - 120,
            playerColor: getComputedStyle(document.documentElement).getPropertyValue('--player2-color'),
            trunkColor: getComputedStyle(document.documentElement).getPropertyValue('--p2-trunk-color'),
            pantsColor: getComputedStyle(document.documentElement).getPropertyValue('--p2-pants-color'),
            keysConfig: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', block: 'ArrowDown', punch: 'k', kick: 'l', fireball: 'j' },
            direction: 'left',
            name: p2Name
        });

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

        messageBox.style.display = 'block';
        gameContainer.style.display = 'none';
        finishHimDisplay.style.display = 'none';
        
        controlsScreenContent.style.display = 'none';
        endGameContent.style.display = 'none';
        homeScreenContent.style.display = 'block';
    }
    
    function showControlsScreen() {
        homeScreenContent.style.display = 'none';
        controlsScreenContent.style.display = 'block';
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
                detachedHead = new Head({
                    x: loser.x + loser.width / 2,
                    y: loser.y + 20,
                    color: getComputedStyle(document.documentElement).getPropertyValue('--body-color'),
                    velocityX: loser.direction === 'right' ? 3 : -3,
                    velocityY: -5
                });
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

            if (keys[player1.keysConfig.left]) { player1.velocity.x = -moveSpeed; player1.direction = 'left'; }
            if (keys[player1.keysConfig.right]) { player1.velocity.x = moveSpeed; player1.direction = 'right'; }
            if (keys[player1.keysConfig.jump]) { player1.jump(); }

            if (keys[player2.keysConfig.left]) { player2.velocity.x = -moveSpeed; player2.direction = 'left'; }
            if (keys[player2.keysConfig.right]) { player2.velocity.x = moveSpeed; player2.direction = 'right'; }
            if (keys[player2.keysConfig.jump]) { player2.jump(); }
            
            player1.update();
            player2.update();
            
            // Check attack collision
            const checkCollision = (attacker, defender, attack) => {
                // Calcula a posição de ataque com base na direção do atacante
                const attackX = attacker.direction === 'right' ? attacker.x + attacker.width : attacker.x - attack.width;
                const attackY = attacker.y + attack.yOffset;
                if (
                    attackX + attack.width >= defender.x &&
                    attackX <= defender.x + defender.width &&
                    attackY + attack.height >= defender.y &&
                    attackY <= defender.y + defender.height
                ) {
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
                if (
                    p.x + p.width >= opponent.x &&
                    p.x <= opponent.x + opponent.width &&
                    p.y + p.height >= opponent.y &&
                    p.y <= opponent.y + opponent.height
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
        if (player1.health <= 10 && !fatalityMode && !fatalityAnimationActive) {
            fatalityMode = true;
            finishHimDisplay.style.display = 'block';
            fatalitySynth.triggerAttackRelease("C4", "1s");
        }
        if (player2.health <= 10 && !fatalityMode && !fatalityAnimationActive) {
            fatalityMode = true;
            finishHimDisplay.style.display = 'block';
            fatalitySynth.triggerAttackRelease("C4", "1s");
        }

        if (player1.health <= 0 && !fatalityAnimationActive) { endGame(player2.name); }
        if (player2.health <= 0 && !fatalityAnimationActive) { endGame(player1.name); }
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    document.addEventListener('keydown', (e) => {
        if (!gameStarted) return;
        keys[e.key] = true;
        keys[e.key.toLowerCase()] = true;
        
        if (fatalityMode && !fatalityAnimationActive) {
            if (e.key.toLowerCase() === 'x') {
                if (player2.health > 0) {
                    fatalityAnimationActive = true;
                    animationStep = 0;
                    winner = player1;
                    loser = player2;
                }
            }
            if (e.key.toLowerCase() === 'i') {
                 if (player1.health > 0) {
                    fatalityAnimationActive = true;
                    animationStep = 0;
                    winner = player2;
                    loser = player1;
                 }
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (!gameStarted) return;
        keys[e.key] = false;
        keys[e.key.toLowerCase()] = false;
    });

    // Set up initial and end game button handlers
    mainButton.addEventListener('click', initGame);
    controlsButton.addEventListener('click', showControlsScreen);
    backToHomeFromControls.addEventListener('click', showHomeScreen);
    playAgainButton.addEventListener('click', initGame);
    backToHomeButton.addEventListener('click', showHomeScreen);
    
    // Show the home screen initially
    showHomeScreen();
}