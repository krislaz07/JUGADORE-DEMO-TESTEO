import { state } from '../state.js';

export class DribblingMinigame {
    static animationId = null;
    static state = 'COUNTDOWN'; 
    static lastTimestamp = null;
    static callback = null;
    static boundHandleInput = null;
    
    static numLanes = 3;
    static playerLane = 1; 
    static defenderX = 1;  
    static defenderY = 0;  
    static speed = 0;      
    static laneColors = [];
    static colorTimer = null;
    static shuffleInterval = 1000;

    static getMinigameConfiguration(level) {
        if (level <= 19) return { lanes: 3, colors: ['bg-green', 'bg-yellow', 'bg-red'] };
        if (level <= 30) return { lanes: 4, colors: ['bg-green', 'bg-yellow', 'bg-yellow', 'bg-red'] };
        if (level <= 40) return { lanes: 4, colors: ['bg-green', 'bg-yellow', 'bg-red', 'bg-red'] };
        if (level <= 50) return { lanes: 5, colors: ['bg-green', 'bg-yellow', 'bg-yellow', 'bg-red', 'bg-red'] };
        // Nivel 51-70: 5 zonas (2 amarillas, 1 verde, 2 rojas)
        if (level <= 70) return { lanes: 5, colors: ['bg-green', 'bg-yellow', 'bg-yellow', 'bg-red', 'bg-red'] }; 
        // Nivel 71-100: 5 zonas (1 amarilla, 1 verde, 3 rojas)
        return { lanes: 5, colors: ['bg-green', 'bg-yellow', 'bg-red', 'bg-red', 'bg-red'] }; 
    }

    static start(actionObj, attrs, difficulty, callback) {
        this.callback = callback;
        this.state = 'COUNTDOWN';
        this.defenderY = 0;
        
        // Obtener configuración dinámica por nivel
        const config = this.getMinigameConfiguration(state.career.level);
        this.numLanes = config.lanes;
        this.laneColors = [...config.colors];
        this.playerLane = Math.floor(this.numLanes / 2);
        this.defenderX = this.playerLane;
        
        const diff = (Number.isFinite(difficulty)) ? difficulty : 50;
        this.speed = 0.55 + (diff * 0.0055); 

        const regateStat = (attrs && attrs['Regate']) ? attrs['Regate'] : 50;
        this.shuffleInterval = 600 + (regateStat * 4);

        this.setupUI();
        
        this.boundHandleInput = this.handleInput.bind(this);
        document.addEventListener('keydown', this.boundHandleInput);

        this.runCountdown();
    }

    static setupUI() {
        document.body.style.overflow = 'hidden';
        
        let overlay = document.getElementById('mg-dribble-overlay');
        if (overlay) overlay.remove();
        
        overlay = document.createElement('div');
        overlay.id = 'mg-dribble-overlay';
        overlay.className = 'mg-modal-overlay';
        
        // Generación dinámica de HTML para carriles y botones
        let lanesHtml = '';
        let buttonsHtml = '';
        for (let i = 0; i < this.numLanes; i++) {
            lanesHtml += `<div class="mg-lane" id="mg-lane-${i}"></div>`;
            
            let btnLabel = '▼';
            if (i < Math.floor(this.numLanes / 2)) btnLabel = '◀';
            else if (i > Math.floor(this.numLanes / 2)) btnLabel = '▶';
            
            buttonsHtml += `<button class="mg-btn-lane" id="btn-lane-${i}">${btnLabel}</button>`;
        }
        
        // CÁLCULO DINÁMICO DE ALTURA (Aumenta 50px por cada zona extra después de la 3ra)
        const dynamicHeight = 350 + ((this.numLanes - 3) * 50);

        overlay.innerHTML = `
            <div class="mg-modal-content dribbling" style="width: ${Math.max(360, this.numLanes * 80)}px;">
                <div class="mg-header">DUELO 1 VS 1</div>
                <div style="font-size:12px; color:#a1a1aa; margin-bottom:15px; font-weight:bold; letter-spacing:1px; text-align:center;">Movete y encontrá el momento para superar al defensor.</div>
                
                <div class="mg-dribble-pitch" id="mg-dribble-container" style="height: ${dynamicHeight}px;">
                    ${lanesHtml}

                    <div class="mg-countdown" id="mg-countdown">3</div>
                    
                    <div class="css-footballer defender mg-defender" id="mg-defender">
                        <div class="head"></div><div class="shirt"></div><div class="label">DEFENSOR</div>
                    </div>
                    
                    <div class="css-footballer attacker mg-player" id="mg-player">
                        <div class="head"></div><div class="shirt"></div><div class="css-ball" id="mg-ball"></div><div class="label">TÚ</div>
                    </div>
                    
                    <div id="mg-dribble-result" class="mg-dribble-result" style="display:none;">
                        <div id="mg-result-title" class="mg-result-title"></div>
                        <div id="mg-result-badge" class="mg-zone-badge" style="padding: 6px 12px; font-weight:bold; border-radius:15px; margin-top:5px;"></div>
                    </div>
                </div>

                <div class="mg-dribble-controls-dynamic">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Listeners de botones generados dinámicamente
        for (let i = 0; i < this.numLanes; i++) {
            document.getElementById(`btn-lane-${i}`).onclick = () => this.setPlayerLane(i);
        }

        this.setPlayerLane(this.playerLane); 
        
        const defender = document.getElementById('mg-defender');
        defender.style.setProperty('top', '0%', 'important'); 
        defender.style.transform = 'translateX(-50%)'; 
        
        document.getElementById('mg-countdown').style.display = 'block';
    }

    static runCountdown() {
        let count = 3;
        const countEl = document.getElementById('mg-countdown');
        countEl.style.transform = 'translate(-50%, -50%) scale(1)';
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countEl.textContent = count;
            } else if (count === 0) {
                countEl.textContent = '¡YA!';
                countEl.style.color = 'var(--accent)';
                countEl.style.transform = 'translate(-50%, -50%) scale(1.3)'; 
            } else {
                clearInterval(countdownInterval);
                countEl.style.display = 'none';
                
                this.state = 'PLAYING';
                this.shuffleColors(); 
                this.lastTimestamp = null;
                this.animationId = requestAnimationFrame((ts) => this.update(ts));
            }
        }, 800);
    }

    static shuffleColors() {
        if (this.state !== 'PLAYING') return;

        let colors = [...this.laneColors];
        for (let i = colors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colors[i], colors[j]] = [colors[j], colors[i]];
        }
        this.laneColors = colors;
        
        for (let i = 0; i < this.numLanes; i++) {
            document.getElementById(`mg-lane-${i}`).className = `mg-lane ${colors[i]}`;
        }
        
        this.colorTimer = setTimeout(() => this.shuffleColors(), this.shuffleInterval);
    }

    static handleInput(e) {
        if (this.state !== 'PLAYING' && this.state !== 'COUNTDOWN') return;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            if (this.playerLane > 0) this.setPlayerLane(this.playerLane - 1);
        }
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            if (this.playerLane < this.numLanes - 1) this.setPlayerLane(this.playerLane + 1);
        }
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            this.setPlayerLane(Math.floor(this.numLanes / 2)); 
        }
    }

    static setPlayerLane(lane) {
        if (this.state !== 'PLAYING' && this.state !== 'COUNTDOWN') return;
        this.playerLane = lane;
        
        const leftPercent = (lane * (100 / this.numLanes)) + (100 / (2 * this.numLanes));
        document.getElementById('mg-player').style.left = `${leftPercent}%`;
        
        for (let i = 0; i < this.numLanes; i++) {
            const btn = document.getElementById(`btn-lane-${i}`);
            if (btn) btn.classList.toggle('active', i === lane);
        }
    }

    static update(timestamp) {
        if (this.state !== 'PLAYING') return;

        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        let dt = deltaTime / 16.666;
        if (dt > 5) dt = 1; 

        // 1. Interpolación suave del defensor
        this.defenderX += (this.playerLane - this.defenderX) * 0.03 * dt;
        const defLeftPercent = (this.defenderX * (100 / this.numLanes)) + (100 / (2 * this.numLanes));
        
        // 2. Acercamiento vertical hacia abajo
        this.defenderY += (this.speed * dt);
        
        const defender = document.getElementById('mg-defender');
        defender.style.left = `${defLeftPercent}%`;
        defender.style.setProperty('top', `${this.defenderY}%`, 'important');

        // 3. Colisión y Resolución
        if (this.defenderY >= 75) {
            this.resolveDodge(); 
        } else {
            this.animationId = requestAnimationFrame((ts) => this.update(ts));
        }
    }

    static resolveDodge() {
        this.state = 'RESULT';
        cancelAnimationFrame(this.animationId);
        clearTimeout(this.colorTimer);
        document.removeEventListener('keydown', this.boundHandleInput);
        
        const currentLaneColor = this.laneColors[this.playerLane];
        let quality = 'fail';
        
        if (currentLaneColor === 'bg-green') quality = 'perfect';
        else if (currentLaneColor === 'bg-yellow') quality = 'good';
        else quality = 'fail';

        const resultContainer = document.getElementById('mg-dribble-result');
        const titleEl = document.getElementById('mg-result-title');
        const badgeEl = document.getElementById('mg-result-badge');
        const player = document.getElementById('mg-player');
        
        resultContainer.style.display = 'flex';
        
        if (quality === 'perfect') {
            titleEl.textContent = '¡EXCELENTE!';
            badgeEl.textContent = 'ZONA VERDE';
            badgeEl.style.background = '#00ff88';
            badgeEl.style.color = '#004d28';
        } else if (quality === 'good') {
            titleEl.textContent = '¡BIEN HECHO!';
            badgeEl.textContent = 'ZONA AMARILLA';
            badgeEl.style.background = '#FFD700';
            badgeEl.style.color = '#4d4000';
        } else {
            titleEl.textContent = '¡PELIGRO!';
            badgeEl.textContent = 'ZONA ROJA';
            badgeEl.style.background = '#ff4c4c';
            badgeEl.style.color = '#fff';
            player.classList.add('tackled'); 
            document.getElementById('mg-ball').style.display = 'none'; 
        }

        setTimeout(() => {
            document.body.style.overflow = '';
            document.getElementById('mg-dribble-overlay').remove();
            
            this.callback({ quality: quality, score: this.playerLane });
        }, 1800);
    }
}