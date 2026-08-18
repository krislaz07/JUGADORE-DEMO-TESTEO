import { state } from '../state.js';

export class ShootingMinigame {
    static animationId = null;
    static cursorPosition = 0; 
    static direction = 1;
    static speed = 3;
    static lastTimestamp = null;
    
    // Variables dinámicas
    static targetPosition = 50;  // Centro lógico de la zona 🟡🟢🟡
    static targetDirection = 1;
    static targetWidth = 0;
    static perfectWidth = 0;
    static config = null;
    static timeStart = null;
    static targetMoveStart = null;
    static isStopped = false;

    static getShootingMinigameConfiguration(level) {
        if (level <= 19) return { posType: 'center', timer: null, moveSpeed: 0 };
        if (level <= 30) return { posType: 'random', timer: null, moveSpeed: 0 };
        if (level <= 40) return { posType: 'random', timer: 15, moveSpeed: 0 };
        if (level <= 50) return { posType: 'random', timer: 10, moveSpeed: 0 };
        if (level <= 70) return { posType: 'center', timer: 10, moveSpeed: 0.4 }; 
        return { posType: 'center', timer: 10, moveSpeed: 0.8 };                  
    }

    static start(actionObj, attrs, difficulty, callback) {
        console.log('[Minigame] Shooting initialized');
        this.isStopped = false;

        const def = (attrs && attrs['Definición']) ? attrs['Definición'] : 50; 
        const control = (attrs && attrs['Control']) ? attrs['Control'] : 50;
        const mentalidad = (attrs && attrs['Mentalidad']) ? attrs['Mentalidad'] : 50;
        const diff = (Number.isFinite(difficulty)) ? difficulty : 50;
        
        this.perfectWidth = Math.max(0.8, Math.min(7.5, 0.8 + (6.7 * Math.pow(def / 99, 0.9)))); 
        this.targetWidth = Math.max(15, Math.min(50, 15 + ((def / 100) * 35))); 

        this.config = this.getShootingMinigameConfiguration(state.career.level);
        
        if (this.config.posType === 'random') {
            const halfWidth = this.targetWidth / 2;
            this.targetPosition = halfWidth + Math.random() * (100 - this.targetWidth);
        } else {
            this.targetPosition = 50;
        }
        this.targetDirection = Math.random() > 0.5 ? 1 : -1;
        
        this.cursorPosition = Math.random() < 0.5 ? (10 + (control * 0.1)) : (90 - (control * 0.1));
        this.direction = Math.random() < 0.5 ? 1 : -1;
        
        // CÁLCULO DE VELOCIDAD COMPRIMIDO PARA MENTALIDAD
        this.speed = 1.5 + (diff * 0.02) - (mentalidad * 0.01);

        if (!Number.isFinite(this.speed) || this.speed <= 0) {
            this.speed = 3;
        }

        this.setupUI(callback);
        
        requestAnimationFrame(() => {
            this.lastTimestamp = null;
            this.timeStart = null;
            this.targetMoveStart = null;
            this.animationId = requestAnimationFrame((timestamp) => this.update(timestamp, callback));
        });
    }

    static setupUI(callback) {
        document.body.style.overflow = 'hidden'; 
        
        let overlay = document.getElementById('mg-shoot-overlay');
        if (overlay) overlay.remove(); 
        
        overlay = document.createElement('div');
        overlay.id = 'mg-shoot-overlay';
        overlay.className = 'mg-modal-overlay';
        
        let timerHtml = '';
        if (this.config.timer) {
            timerHtml = `
                <div class="mg-shoot-timer-container">
                    <div id="mg-shoot-timer-bar" class="mg-shoot-timer-bar"></div>
                </div>
            `;
        }
        
        overlay.innerHTML = `
            <div class="mg-modal-content shooting">
                <div class="mg-header">REMATE</div>
                <div style="font-size:12px; color:#a1a1aa; margin-bottom:10px; font-weight:bold; letter-spacing:1px;">POTENCIA / DEFINICIÓN</div>
                
                ${timerHtml}

                <div class="shoot-bar">
                    <div id="mg-target-zone" class="shoot-zone-yellow"></div>
                    <div id="mg-perfect-zone" class="shoot-zone-green"></div>
                    <div id="mg-cursor" class="shoot-cursor"></div>
                </div>
                
                <div id="mg-shoot-msg" class="mg-msg"></div>
                <button id="btn-mg-action-shoot" class="game-btn primary btn-large" style="width: 100%; margin-top: 15px;">[ PATEAR ]</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // La zona verde siempre se queda en el centro de targetPosition
        const perfectZone = document.getElementById('mg-perfect-zone');
        perfectZone.style.width = `${this.perfectWidth}%`;
        perfectZone.style.left = `${this.targetPosition}%`;
        
        // Llamamos a la nueva función visual para la zona amarilla
        this.updateVisualZones();
        
        document.getElementById('mg-cursor').style.left = `${this.cursorPosition}%`;
        
        const btnPatear = document.getElementById('btn-mg-action-shoot');
        btnPatear.onclick = () => {
            if (!this.isStopped) this.stop(callback, false);
        };
    }

    // NUEVO MÉTODO: Controla visualmente los cortes de las zonas amarillas en los extremos
    static updateVisualZones() {
        const targetHalf = this.targetWidth / 2;
        
        // Threshold: si el borde amarillo exterior está a 8% o menos de la pared
        const leftYellowActive = (this.targetPosition - targetHalf > 8);
        const rightYellowActive = (this.targetPosition + targetHalf < 92);
        
        let displayWidth = this.targetWidth;
        let displayLeft = this.targetPosition;

        if (!leftYellowActive && !rightYellowActive) {
            displayWidth = this.perfectWidth; 
        } else if (!leftYellowActive) {
            // Elimina la mitad izquierda y reposiciona el centro del amarillo
            displayWidth = targetHalf;
            displayLeft = this.targetPosition + (targetHalf / 2);
        } else if (!rightYellowActive) {
            // Elimina la mitad derecha y reposiciona el centro del amarillo
            displayWidth = targetHalf;
            displayLeft = this.targetPosition - (targetHalf / 2);
        }

        const targetZone = document.getElementById('mg-target-zone');
        if (targetZone) {
            targetZone.style.width = `${displayWidth}%`;
            targetZone.style.left = `${displayLeft}%`;
        }
    }

    static update(timestamp, callback) {
        if (this.isStopped) return;

        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
            this.timeStart = timestamp;
            this.targetMoveStart = timestamp + 1000; // 1 segundo de gracia
        }
        
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        let dt = deltaTime / 16.666;
        if (dt > 5) dt = 1; 

        // 1. Cronómetro
        if (this.config.timer) {
            const elapsed = timestamp - this.timeStart;
            const remaining = (this.config.timer * 1000) - elapsed;
            let pct = (remaining / (this.config.timer * 1000)) * 100;
            
            if (pct <= 0) {
                pct = 0;
                document.getElementById('mg-shoot-timer-bar').style.width = `0%`;
                this.stop(callback, true); 
                return;
            }
            
            const timerBar = document.getElementById('mg-shoot-timer-bar');
            timerBar.style.width = `${pct}%`;
            
            if (pct < 25) {
                timerBar.style.background = '#ff4c4c';
            }
        }

        // 2. Movimiento de zona dinámica
        if (this.config.moveSpeed > 0 && timestamp > this.targetMoveStart) {
            const halfWidth = this.targetWidth / 2;
            this.targetPosition += (this.config.moveSpeed * dt * this.targetDirection);
            
            if (this.targetPosition >= 100 - halfWidth) {
                this.targetPosition = 100 - halfWidth;
                this.targetDirection = -1;
            } else if (this.targetPosition <= halfWidth) {
                this.targetPosition = halfWidth;
                this.targetDirection = 1;
            }
            
            // Actualizamos Verde y ejecutamos la lógica visual del Amarillo
            document.getElementById('mg-perfect-zone').style.left = `${this.targetPosition}%`;
            this.updateVisualZones();
        }

        // 3. Cursor
        this.cursorPosition += (this.speed * dt * this.direction);
        if (this.cursorPosition >= 100) { this.cursorPosition = 100; this.direction = -1; } 
        else if (this.cursorPosition <= 0) { this.cursorPosition = 0; this.direction = 1; }
        
        document.getElementById('mg-cursor').style.left = `${this.cursorPosition}%`;
        
        this.animationId = requestAnimationFrame((ts) => this.update(ts, callback));
    }

    static stop(callback, isTimeout = false) {
        this.isStopped = true;
        cancelAnimationFrame(this.animationId);
        
        const btn = document.getElementById('btn-mg-action-shoot');
        if (btn) btn.disabled = true;

        const pos = this.cursorPosition;
        const perfectHalf = this.perfectWidth / 2;
        const targetHalf = this.targetWidth / 2;
        
        let resultQuality = 'fail'; 
        
        if (!isTimeout) {
            // Validamos lógicamente usando el mismo threshold de 8% de los bordes
            const isPerfect = (pos >= this.targetPosition - perfectHalf && pos <= this.targetPosition + perfectHalf);
            const isLeftYellow = (pos >= this.targetPosition - targetHalf && pos < this.targetPosition - perfectHalf);
            const isRightYellow = (pos > this.targetPosition + perfectHalf && pos <= this.targetPosition + targetHalf);
            
            const leftYellowActive = (this.targetPosition - targetHalf > 8);
            const rightYellowActive = (this.targetPosition + targetHalf < 92);

            if (isPerfect) {
                resultQuality = 'perfect';
            } else if (isLeftYellow && leftYellowActive) {
                resultQuality = 'good';
            } else if (isRightYellow && rightYellowActive) {
                resultQuality = 'good';
            }
        }

        const cursorEl = document.getElementById('mg-cursor');
        const msgEl = document.getElementById('mg-shoot-msg');

        if (isTimeout) {
            cursorEl.className = 'shoot-cursor mg-shoot-cursor result-miss';
            msgEl.textContent = '¡TIEMPO AGOTADO!';
            msgEl.style.color = '#ff4c4c';
        } else if (resultQuality === 'perfect') {
            cursorEl.className = 'shoot-cursor mg-shoot-cursor result-perfect';
            msgEl.textContent = '¡TIRO PERFECTO!';
            msgEl.style.color = '#00ff88';
        } else if (resultQuality === 'good') {
            cursorEl.className = 'shoot-cursor mg-shoot-cursor result-target';
            msgEl.textContent = '¡AL ARCO!';
            msgEl.style.color = '#FFD700';
        } else {
            cursorEl.className = 'shoot-cursor mg-shoot-cursor result-miss';
            msgEl.textContent = '¡AFUERA!';
            msgEl.style.color = '#ff4c4c';
        }

        setTimeout(() => {
            document.body.style.overflow = '';
            const overlay = document.getElementById('mg-shoot-overlay');
            if (overlay) overlay.remove();
            
            callback({ quality: resultQuality, score: pos });
        }, 1500); 
    }
}