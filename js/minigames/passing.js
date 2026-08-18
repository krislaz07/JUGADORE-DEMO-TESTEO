import { state } from '../state.js';

export class PassingMinigame {
    static callback = null;
    static animationId = null;
    static lastTimestamp = null;
    static countdownTimeout = null;
    static gameState = {
        spawned: 0,
        hits: 0,
        misses: 0,
        isFinished: false,
        activeTargets: [] 
    };
    static config = null;

    static getPassingMinigameConfiguration(level) {
        if (level <= 10) return { totalCircles: 5, greenMin: 5, yellowMin: 3, moveSpeed: 0 };
        if (level <= 15) return { totalCircles: 6, greenMin: 6, yellowMin: 4, moveSpeed: 0 };
        if (level <= 25) return { totalCircles: 7, greenMin: 7, yellowMin: 5, moveSpeed: 0 };
        if (level <= 40) return { totalCircles: 7, greenMin: 7, yellowMin: 4, moveSpeed: 0.5 }; 
        if (level <= 60) return { totalCircles: 7, greenMin: 7, yellowMin: 5, moveSpeed: 1.0 }; 
        if (level <= 80) return { totalCircles: 7, greenMin: 7, yellowMin: 4, moveSpeed: 1.5 }; 
        return { totalCircles: 8, greenMin: 8, yellowMin: 6, moveSpeed: 1.8 };                  
    }

    static start(actionObj, attrs, difficulty, callback) {
        console.log('[Minigame] Passing initialized');
        this.callback = callback;
        
        const mentalidadStat = (attrs && attrs['Mentalidad']) ? attrs['Mentalidad'] : 50;
        
        this.config = this.getPassingMinigameConfiguration(state.career.level);
        this.config.circleLifetime = 700; 
        this.config.spawnInterval = 350 + mentalidadStat;

        this.gameState = {
            spawned: 0,
            hits: 0,
            misses: 0,
            isFinished: false,
            activeTargets: []
        };

        this.setupUI();
        
        setTimeout(() => {
            this.runCountdown();
        }, 100);
    }

    static setupUI() {
        document.body.style.overflow = 'hidden'; 
        
        let overlay = document.getElementById('mg-pass-overlay');
        if (overlay) overlay.remove(); 
        
        overlay = document.createElement('div');
        overlay.id = 'mg-pass-overlay';
        overlay.className = 'mg-modal-overlay';
        
        let dotsHtml = '';
        for (let i = 0; i < this.config.totalCircles; i++) {
            dotsHtml += `<div class="mg-pass-dot" id="pass-dot-${i}"></div>`;
        }
        
        overlay.innerHTML = `
            <div class="mg-modal-content shooting" style="width: 380px;">
                <div class="mg-header" style="margin-bottom: 5px;">VISIÓN DE JUEGO</div>
                <div style="font-size:12px; color:#a1a1aa; margin-bottom:15px; font-weight:bold; letter-spacing:1px; text-align:center;">Tocá los círculos antes de que desaparezcan.</div>
                
                <div class="mg-pass-progress" id="mg-pass-progress">
                    ${dotsHtml}
                </div>

                <div class="mg-pass-pitch" id="mg-pass-pitch">
                    <div class="mg-countdown" id="mg-countdown" style="display:none;">3</div>
                </div>
                
                <div id="mg-pass-msg" class="mg-msg"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    static runCountdown() {
        let count = 3;
        const countEl = document.getElementById('mg-countdown');
        countEl.style.display = 'block';
        countEl.textContent = count;
        countEl.style.transform = 'translate(-50%, -50%) scale(1)';

        const nextStep = () => {
            count--;
            if (count > 0) {
                countEl.textContent = count;
                countEl.style.transform = 'translate(-50%, -50%) scale(1.1)';
                setTimeout(() => countEl.style.transform = 'translate(-50%, -50%) scale(1)', 100);
                this.countdownTimeout = setTimeout(nextStep, 700);
            } else if (count === 0) {
                countEl.textContent = '¡YA!';
                countEl.style.color = 'var(--accent)';
                countEl.style.transform = 'translate(-50%, -50%) scale(1.3)';
                this.countdownTimeout = setTimeout(nextStep, 500);
            } else {
                countEl.style.display = 'none';
                
                // NUEVO: Agregamos la pequeña pausa de 700ms después de "¡YA!"
                const postCountdownDelay = 700;
                this.countdownTimeout = setTimeout(() => {
                    if (this.gameState.isFinished) return; 
                    
                    this.lastTimestamp = null;
                    this.scheduleNextSpawn();
                    this.animationId = requestAnimationFrame((ts) => this.update(ts));
                }, postCountdownDelay);
            }
        };

        this.countdownTimeout = setTimeout(nextStep, 700);
    }

    static updateProgressUI() {
        const hits = this.gameState.hits;
        let currentColor = 'red';

        if (hits >= this.config.greenMin) {
            currentColor = 'green';
        } else if (hits >= this.config.yellowMin) {
            currentColor = 'yellow';
        }

        for (let i = 0; i < this.config.totalCircles; i++) {
            const dot = document.getElementById(`pass-dot-${i}`);
            if (!dot) continue;

            dot.className = 'mg-pass-dot';

            if (i < hits) {
                dot.classList.add('filled', currentColor);
            }
        }
    }

    static scheduleNextSpawn() {
        if (this.gameState.isFinished) return;
        if (this.gameState.spawned >= this.config.totalCircles) return;

        this.spawnCircle();

        if (this.gameState.spawned < this.config.totalCircles) {
            setTimeout(() => {
                this.scheduleNextSpawn();
            }, this.config.spawnInterval);
        }
    }

    static spawnCircle() {
        this.gameState.spawned++;
        const pitch = document.getElementById('mg-pass-pitch');
        if (!pitch) return;

        const pitchRadius = 140; 
        const targetRadius = 22; 
        const maxSafeRadius = pitchRadius - targetRadius; 
        const safeDistance = (targetRadius * 2) + 5; 
        
        let x, y;
        let attempts = 0;
        let validPosition = false;

        while (attempts < 30 && !validPosition) {
            const randomAngle = Math.random() * 2 * Math.PI;
            const randomRadius = Math.sqrt(Math.random()) * maxSafeRadius; 

            x = pitchRadius + (randomRadius * Math.cos(randomAngle));
            y = pitchRadius + (randomRadius * Math.sin(randomAngle));
            
            validPosition = true;
            
            for (let activeTarget of this.gameState.activeTargets) {
                if (!activeTarget.isResolved) {
                    const dx = x - activeTarget.cx;
                    const dy = y - activeTarget.cy;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < safeDistance) {
                        validPosition = false;
                        break;
                    }
                }
            }
            attempts++;
        }

        const target = document.createElement('div');
        target.className = 'mg-pass-target';
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
        
        pitch.appendChild(target);

        const moveAngle = Math.random() * 2 * Math.PI;
        const targetData = {
            element: target,
            cx: x,
            cy: y,
            dx: Math.cos(moveAngle),
            dy: Math.sin(moveAngle),
            isResolved: false
        };
        
        this.gameState.activeTargets.push(targetData);

        const expirationTimeout = setTimeout(() => {
            if (targetData.isResolved || this.gameState.isFinished) return;
            targetData.isResolved = true;
            this.handleMiss(targetData.element);
        }, this.config.circleLifetime);

        target.onpointerdown = () => {
            if (targetData.isResolved || this.gameState.isFinished) return;
            targetData.isResolved = true;
            clearTimeout(expirationTimeout);
            this.handleHit(targetData.element);
        };
    }

    static update(timestamp) {
        if (this.gameState.isFinished) return;
        
        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        let dt = deltaTime / 16.666;
        if (dt > 5) dt = 1; 

        if (this.config.moveSpeed > 0) {
            const pitchRadius = 140; 
            const targetRadius = 22; 
            const maxSafeRadius = pitchRadius - targetRadius; 

            for (let target of this.gameState.activeTargets) {
                if (target.isResolved) continue;

                target.cx += target.dx * this.config.moveSpeed * dt;
                target.cy += target.dy * this.config.moveSpeed * dt;

                const px = target.cx - pitchRadius;
                const py = target.cy - pitchRadius;
                const dist = Math.sqrt(px * px + py * py);

                if (dist >= maxSafeRadius) {
                    const nx = px / dist;
                    const ny = py / dist;
                    
                    const dot = target.dx * nx + target.dy * ny;
                    target.dx = target.dx - 2 * dot * nx;
                    target.dy = target.dy - 2 * dot * ny;

                    target.cx = pitchRadius + nx * maxSafeRadius;
                    target.cy = pitchRadius + ny * maxSafeRadius;
                }

                target.element.style.left = `${target.cx}px`;
                target.element.style.top = `${target.cy}px`;
            }
        }
        
        this.animationId = requestAnimationFrame((ts) => this.update(ts));
    }

    static handleHit(targetElement) {
        this.gameState.hits++;
        targetElement.classList.add('hit');
        this.updateProgressUI(); 
        this.checkEndGame();
    }

    static handleMiss(targetElement) {
        this.gameState.misses++;
        targetElement.classList.add('missed');
        this.checkEndGame();
    }

    static checkEndGame() {
        const totalResolved = this.gameState.hits + this.gameState.misses;
        if (totalResolved >= this.config.totalCircles && !this.gameState.isFinished) {
            this.gameState.isFinished = true;
            cancelAnimationFrame(this.animationId); 
            this.resolveMinigame();
        }
    }

    static resolveMinigame() {
        let resultQuality = 'fail';
        const hits = this.gameState.hits;

        if (hits >= this.config.greenMin) {
            resultQuality = 'perfect';
        } else if (hits >= this.config.yellowMin) {
            resultQuality = 'good';
        } else {
            resultQuality = 'fail';
        }

        const msgEl = document.getElementById('mg-pass-msg');
        if (resultQuality === 'perfect') {
            msgEl.textContent = '¡VISIÓN PERFECTA!';
            msgEl.style.color = '#00ff88';
        } else if (resultQuality === 'good') {
            msgEl.textContent = '¡BUENOS PASES!';
            msgEl.style.color = '#FFD700';
        } else {
            msgEl.textContent = '¡IMPRECISO!';
            msgEl.style.color = '#ff4c4c';
        }

        setTimeout(() => {
            document.body.style.overflow = '';
            const overlay = document.getElementById('mg-pass-overlay');
            if (overlay) overlay.remove();
            
            this.callback({ quality: resultQuality, score: hits });
        }, 1500); 
    }
}