import { state, getDifficultyTag } from './state.js';
import { ScenarioSystem } from './scenarioSystem.js';
import { currentMatchStats } from './matchStats.js'; 

export class MatchEngine {
    static init(matchData) {
        this.matchData = matchData; 
        this.opponentName = matchData.opponent;
        this.difficulty = matchData.difficulty;
        
        this.minute = 0;
        this.myScore = 0;
        this.opponentScore = 0;
        this.isPaused = false;
        this.interval = null;
        this.currentSpeed = state.settings.matchSpeed; 

        // Reseteamos las stats del partido al iniciar
        currentMatchStats.reset();
        
        // Variables de cadena (Encadenamiento de jugadas)
        this.chainCount = 0;
        this.potentialAssist = false; // Preparado para simulación de compañeros

        this.mgAnimation = null;
        this.mgCursorPos = 0;
        this.mgDirection = 1;
        this.mgSpeed = 0;
        this.lastTimestamp = null; 
        this.mgShotType = "normal";

        this.generateInterventionMinutes();
        this.setupUI();
        
        const diffTag = getDifficultyTag(this.difficulty);
        this.printEvent(`¡Arranca el partido! ${state.career.club} vs ${this.opponentName} (${diffTag})`, "normal");
        
        this.startTimer();
    }

    static generateInterventionMinutes() {
        const posicionamiento = state.player.attributes['Posicionamiento'];
        let base = 3 + Math.floor(Math.random() * 3); 
        let bonus = Math.floor(posicionamiento / 33); 
        let numInterventions = base + bonus;
        numInterventions = Math.max(3, Math.min(8, numInterventions));

        this.interventionMinutes = [];
        while (this.interventionMinutes.length < numInterventions) {
            let m = Math.floor(Math.random() * 89) + 1;
            if (m !== 45 && !this.interventionMinutes.includes(m)) {
                this.interventionMinutes.push(m);
            }
        }
        this.interventionMinutes.sort((a, b) => a - b);
    }

    static startTimer() {
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.tick(), 300 / this.currentSpeed);
    }

    static setSpeed(speedMultiplier) {
        this.currentSpeed = speedMultiplier;
        state.settings.matchSpeed = speedMultiplier; 
        if (!this.isPaused) {
            this.startTimer();
        }
    }

    static setupUI() {
        document.getElementById('match-scoreboard').textContent = `${state.career.club} 0 - 0 ${this.opponentName}`;
        document.getElementById('match-events-feed').innerHTML = '';
        document.getElementById('match-actions').style.display = 'none';
        document.getElementById('match-continue-bar').style.display = 'none';

        const oldEndScreen = document.getElementById('match-end-summary');
        if (oldEndScreen) oldEndScreen.remove();

        const speedBtns = document.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.speed) === this.currentSpeed) {
                btn.classList.add('active');
            }
        });
    }

    static tick() {
        if (this.isPaused) return;

        this.minute++;
        document.getElementById('match-time').textContent = `Minuto: ${this.minute}'`;

        if (this.minute === 45) {
            this.triggerHalfTime();
            return;
        }
        if (this.minute >= 90) {
            this.endMatch();
            return;
        }

        if (this.interventionMinutes.includes(this.minute)) {
            // Reiniciamos variables de cadena al empezar una jugada nueva
            this.chainCount = 0; 
            this.potentialAssist = false; 
            this.triggerPlayerChance();
            return;
        }

        if (Math.random() < 0.05) {
            this.generateRandomEvent();
        }
    }

    static triggerHalfTime() {
        this.isPaused = true;
        clearInterval(this.interval);
        this.printEvent("¡Final del primer tiempo! Los equipos van al descanso.", "highlight");
        
        let tempRating = currentMatchStats.calculateRating();
        
        document.getElementById('ht-scoreboard').textContent = `${state.career.club} ${this.myScore} - ${this.opponentScore} ${this.opponentName}`;
        document.getElementById('ht-rating').textContent = tempRating;
        document.getElementById('ht-stats-txt').innerHTML = `Goles: <strong>${currentMatchStats.goals}</strong> | Asistencias: <strong>${currentMatchStats.assists}</strong> | Tiros: <strong>${currentMatchStats.shots}</strong>`;
        
        document.getElementById('screen-match').style.display = 'none';
        document.getElementById('screen-half-time').style.display = 'block';
    }

    static resumeSecondHalf() {
        document.getElementById('screen-half-time').style.display = 'none';
        document.getElementById('screen-match').style.display = 'block';
        this.isPaused = false;
        this.printEvent("¡Arranca el segundo tiempo!", "highlight");
        this.startTimer();
    }

    static generateRandomEvent() {
        const rivalDominance = 0.3 + (this.difficulty / 200); 
        if (Math.random() < rivalDominance) {
            if (Math.random() < 0.15) {
                this.opponentScore++;
                this.updateScoreboard();
                this.printEvent(`¡Gol de ${this.opponentName}!`, "miss");
            } else {
                this.printEvent(`${this.opponentName} ataca pero sin claridad.`, "normal");
            }
        } else {
            if (Math.random() < 0.15) {
                this.myScore++;
                this.updateScoreboard();
                this.printEvent(`¡GOOOOL de ${state.career.club}!`, "goal");
            } else {
                this.printEvent(`${state.career.club} domina la posesión.`, "normal");
            }
        }
    }

    static triggerPlayerChance(chainedText = null, forcedQuality = null) {
        const pos = state.player.personalData.posicion;
        let finalQuality = forcedQuality;

        if (!finalQuality) {
            const posicionamiento = state.player.attributes['Posicionamiento'];
            const qualityData = ScenarioSystem.calculateOpportunityQuality({
                positioning: posicionamiento,
                opponentDifficulty: this.difficulty,
                contextModifiers: {} 
            });
            finalQuality = qualityData.calidad;
        }
        
        const scenario = ScenarioSystem.getScenario(pos, finalQuality);

        if (this.currentSpeed === 8) {
            const autoChoice = scenario.actions[Math.floor(Math.random() * scenario.actions.length)];
            this.handlePlayerDecision(autoChoice, true); 
            return;
        }

        this.isPaused = true;
        clearInterval(this.interval);

        const title = chainedText || scenario.title;
        const msg = `${title} - ${scenario.description}`;
        this.printEvent(msg, "highlight");

        const actionsContainer = document.getElementById('match-actions');
        const btnContainer = document.getElementById('action-buttons-container');
        const mgContainer = document.getElementById('minigame-container');
        
        actionsContainer.style.display = 'flex';
        btnContainer.style.display = 'grid';
        btnContainer.innerHTML = '';
        mgContainer.style.display = 'none'; 

        scenario.actions.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'game-btn primary tooltip-btn';
            
            btn.innerHTML = `${opt.text}
                <div class="tooltip-box">
                    <span class="tooltip-req">${opt.reqAttr}</span>
                    <span class="tooltip-desc">${opt.desc}</span>
                </div>
            `;
            
            btn.onclick = () => this.handlePlayerDecision(opt, false);
            btnContainer.appendChild(btn);
        });
    }

    static handlePlayerDecision(actionObj, isAuto = false) {
        document.getElementById('match-actions').style.display = 'none';

        if (actionObj.type === 'shoot') {
            if (!isAuto) {
                this.startShootMinigame(actionObj.shotType || "normal");
                return; 
            } else {
                currentMatchStats.add('shots');
                let simForce = (state.player.attributes['Definición'] * 0.5) + (state.player.attributes['Potencia de tiro'] * 0.3) + (state.player.attributes['Técnica'] * 0.1) + (state.player.attributes['Control'] * 0.1);
                let gkSimForce = this.difficulty;
                let simChaos = (Math.floor(Math.random() * 21) - 10);
                let gkSimChaos = (Math.floor(Math.random() * 21) - 10);
                
                if ((simForce + simChaos) > (gkSimForce + gkSimChaos)) {
                    this.myScore++;
                    this.updateScoreboard();
                    this.printEvent(`(Sim) ¡GOOOOOL! Buena resolución.`, "goal");
                    currentMatchStats.add('goals');
                    currentMatchStats.add('shotsOnTarget');
                    currentMatchStats.add('goodActions');
                } else {
                    this.printEvent(`(Sim) Remate fallado o atajado.`, "miss");
                    currentMatchStats.add('badActions');
                }
                return;
            }
        }

        // --- SISTEMA MATEMÁTICO PURO ---
        let baseStat = 0;
        if (actionObj.calc) {
            for (const [attr, weight] of Object.entries(actionObj.calc)) {
                baseStat += state.player.attributes[attr] * weight;
            }
        }

        let difficultyPenalty = (this.difficulty - 50) * 0.5;
        let finalChance = baseStat - difficultyPenalty;
        let roll = Math.floor(Math.random() * 100) + 1;
        
        let isSuccess = roll <= finalChance;
        let isCrit = roll <= (finalChance / 2);

        // Intentos
        if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') {
            currentMatchStats.add('passesAttempted');
        }
        if (actionObj.statCategory === 'dribble') currentMatchStats.add('dribblesAttempted');
        if (actionObj.statCategory === 'tackle') currentMatchStats.add('tacklesAttempted');
        
        if (isSuccess) {
            currentMatchStats.add('goodActions');
            
            // Éxitos
            if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') {
                currentMatchStats.add('passesCompleted');
            }
            if (actionObj.statCategory === 'dribble') currentMatchStats.add('dribblesCompleted');
            if (actionObj.statCategory === 'tackle') currentMatchStats.add('tacklesWon');
            
            // Bandera de asistencia (No suma gol automáticamente, espera simulación futura)
            if (actionObj.statCategory === 'assist') {
                this.potentialAssist = true;
            }

            if (isCrit && actionObj.critSuccessMsg) {
                this.printEvent(actionObj.critSuccessMsg, "highlight");
            } else {
                this.printEvent(actionObj.successMsg || "¡Acción exitosa!", "highlight");
            }

            // SISTEMA DE CADENAS (Límite estricto de 2 encadenamientos)
            if (!isAuto && this.chainCount < 2 && actionObj.chainChance && Math.random() < actionObj.chainChance) {
                this.chainCount++;
                setTimeout(() => {
                    this.triggerPlayerChance("¡La jugada continúa!", actionObj.chainQuality);
                }, 1500);
                return; 
            }

        } else {
            currentMatchStats.add('badActions');
            this.printEvent(actionObj.failMsg || "Acción fallida.", "miss");
        }

        if (!isAuto) {
            this.isPaused = false;
            this.startTimer();
        }
    }

    // --- MINIJUEGO DE TIRO ---

    static startShootMinigame(shotType = "normal") {
        this.mgShotType = shotType; 
        currentMatchStats.add('shots'); 
        
        const attrs = state.player.attributes;
        const def = attrs['Definición'];
        
        const perfectWidth = Math.max(1.2, Math.min(11, 1.2 + (9.8 * Math.pow(def / 99, 0.9)))); 
        const targetWidth = Math.max(15, Math.min(50, 15 + ((def / 100) * 35))); 
        
        this.mgCursorPos = Math.random() < 0.5 ? (10 + (attrs['Control']*0.1)) : (90 - (attrs['Control']*0.1));
        this.mgDirection = Math.random() < 0.5 ? 1 : -1;
        
        const dif = this.difficulty;
        const mentalidad = attrs['Mentalidad'];
        
        let baseSpeed = 1.5 + (((dif * 1.15) - mentalidad) * 0.025);
        this.mgSpeed = Math.max(0.6, Math.min(3.5, baseSpeed)); 

        document.getElementById('match-actions').style.display = 'flex';
        document.getElementById('action-buttons-container').style.display = 'none';
        document.getElementById('minigame-container').style.display = 'flex';
        
        document.getElementById('mg-target-zone').style.width = `${targetWidth}%`;
        document.getElementById('mg-perfect-zone').style.width = `${perfectWidth}%`;

        const btnPatear = document.getElementById('btn-mg-action');
        btnPatear.disabled = false; 
        btnPatear.onclick = () => this.stopShootMinigame(targetWidth, perfectWidth);

        this.lastTimestamp = null;
        this.mgAnimation = requestAnimationFrame((timestamp) => this.updateShootMinigame(timestamp));
    }

    static updateShootMinigame(timestamp) {
        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        const dt = deltaTime / 16.666;

        this.mgCursorPos += (this.mgSpeed * dt * this.mgDirection);
        
        if (this.mgCursorPos >= 100) {
            this.mgCursorPos = 100;
            this.mgDirection = -1;
        } else if (this.mgCursorPos <= 0) {
            this.mgCursorPos = 0;
            this.mgDirection = 1;
        }
        
        document.getElementById('mg-cursor').style.left = `${this.mgCursorPos}%`;
        this.mgAnimation = requestAnimationFrame((ts) => this.updateShootMinigame(ts));
    }

    static stopShootMinigame(targetW, perfectW) {
        cancelAnimationFrame(this.mgAnimation);
        
        const btnPatear = document.getElementById('btn-mg-action');
        btnPatear.disabled = true;

        const cursorEl = document.getElementById('mg-cursor');
        cursorEl.classList.add('frozen');
        cursorEl.innerHTML = '<span class="mg-cursor-label">TU TIRO</span>';

        const attrs = state.player.attributes;
        const cursor = this.mgCursorPos;
        const targetHalf = targetW / 2;
        const perfectHalf = perfectW / 2;
        
        let resultType = 'miss'; 
        if (cursor >= 50 - perfectHalf && cursor <= 50 + perfectHalf) {
            resultType = 'perfect';
        } else if (cursor >= 50 - targetHalf && cursor <= 50 + targetHalf) {
            resultType = 'target';
        }

        if (resultType === 'perfect') {
            cursorEl.classList.add('result-perfect');
        } else if (resultType === 'target') {
            cursorEl.classList.add('result-target');
        } else {
            cursorEl.classList.add('result-miss');
        }

        if (resultType === 'miss') {
            this.printEvent("¡Le pegaste mordido! La pelota se va afuera.", "miss");
            currentMatchStats.add('badActions');
        } else if (resultType === 'perfect') {
            currentMatchStats.add('shotsOnTarget');
            
            const roll = Math.floor(Math.random() * 100) + 1;
            if (roll <= 97) {
                this.myScore++;
                this.updateScoreboard();
                this.printEvent("¡GOOOOLAZO! Tiro perfecto, la clavaste en el ángulo.", "goal");
                currentMatchStats.add('goals');
                currentMatchStats.add('goodActions');
            } else {
                this.printEvent("¡TIRO PERFECTO! Pero el arquero rival acaba de sacar una pelota imposible.", "normal");
                currentMatchStats.add('goodActions'); 
            }
        } else {
            currentMatchStats.add('shotsOnTarget');
            
            let playerForce = (attrs['Definición'] * 0.5) + (attrs['Potencia de tiro'] * 0.3) + (attrs['Técnica'] * 0.1) + (attrs['Control'] * 0.1);
            let gkForce = this.difficulty;
            let pChaos = Math.floor(Math.random() * 21) - 10;
            let gkChaos = Math.floor(Math.random() * 21) - 10;
            let isGoal = (playerForce + pChaos) > (gkForce + gkChaos);

            if (!isGoal) {
                this.printEvent("¡Al arco! Pero gran respuesta del arquero.", "normal");
                currentMatchStats.add('goodActions'); 
            } else {
                this.myScore++;
                this.updateScoreboard();
                this.printEvent("¡GOOOOOL! Buen remate para vencer al portero.", "goal");
                currentMatchStats.add('goals');
                currentMatchStats.add('goodActions');
            }
        }

        setTimeout(() => {
            document.getElementById('match-actions').style.display = 'none';
            cursorEl.classList.remove('frozen', 'result-perfect', 'result-target', 'result-miss');
            cursorEl.innerHTML = '';
            
            this.isPaused = false;
            this.startTimer();
        }, 2500);
    }

    static printEvent(text, cssClass) {
        const feed = document.getElementById('match-events-feed');
        const el = document.createElement('div');
        el.className = `match-event ${cssClass}`;
        el.textContent = `[${this.minute}'] ${text}`;
        feed.appendChild(el);
        feed.scrollTop = feed.scrollHeight; 
    }

    static updateScoreboard() {
        document.getElementById('match-scoreboard').textContent = `${state.career.club} ${this.myScore} - ${this.opponentScore} ${this.opponentName}`;
    }

    static endMatch() {
        clearInterval(this.interval);
        this.printEvent("¡Final del partido! El árbitro señala el medio campo.", "highlight");
        
        // PANTALLA FINAL
        const summaryHtml = `
            <div id="match-end-summary" style="background: rgba(10, 15, 30, 0.95); border: 2px solid var(--accent); border-radius: 8px; padding: 20px; margin-top: 15px; color: white;">
                <h3 style="text-align: center; color: var(--accent); margin-top: 0;">RESULTADO FINAL</h3>
                <h2 style="text-align: center; margin: 10px 0;">${state.career.club} ${this.myScore} - ${this.opponentScore} ${this.opponentName}</h2>
                <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
                <h4 style="text-align: center; color: #FFD700; margin-bottom: 15px;">TU ACTUACIÓN</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <div>⚽ Goles: <strong>${currentMatchStats.goals}</strong></div>
                    <div>🅰️ Asistencias: <strong>${currentMatchStats.assists}</strong></div>
                    <div>🎯 Tiros: <strong>${currentMatchStats.shots}</strong></div>
                    <div>🎯 Tiros al arco: <strong>${currentMatchStats.shotsOnTarget}</strong></div>
                    <div>✓ Pases ok: <strong>${currentMatchStats.passesCompleted} / ${currentMatchStats.passesAttempted}</strong></div>
                    <div>✕ Pases fallados: <strong>${currentMatchStats.passesAttempted - currentMatchStats.passesCompleted}</strong></div>
                    <div>✓ Regates ok: <strong>${currentMatchStats.dribblesCompleted} / ${currentMatchStats.dribblesAttempted}</strong></div>
                    <div>✕ Regates fallidos: <strong>${currentMatchStats.dribblesAttempted - currentMatchStats.dribblesCompleted}</strong></div>
                </div>
                <div style="margin-top: 20px; text-align: center; font-size: 18px;">
                    Calificación: <strong style="color: #00ff88;">${currentMatchStats.calculateRating()}</strong>
                </div>
            </div>
        `;
        
        const feed = document.getElementById('match-events-feed');
        feed.insertAdjacentHTML('beforeend', summaryHtml);
        feed.scrollTop = feed.scrollHeight; 

        document.getElementById('match-continue-bar').style.display = 'flex';
        
        state.lastMatchResult = {
            opponent: this.opponentName,
            difficulty: this.difficulty,
            myScore: this.myScore,
            opponentScore: this.opponentScore,
            playerStats: currentMatchStats 
        };
    }
}