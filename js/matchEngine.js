import { state, getDifficultyTag, normalizePlayerPosition } from './state.js';
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

        currentMatchStats.reset();
        
        this.chainCount = 0;
        this.isChainingVisual = false; 
        this.potentialAssist = false; 

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

        const oldModal = document.getElementById('match-summary-modal');
        if (oldModal) oldModal.remove();

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
            this.chainCount = 0; 
            this.isChainingVisual = false;
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
        document.getElementById('ht-stats-txt').innerHTML = `Goles: <strong>${currentMatchStats.goals}</strong> | Ocasiones Creadas: <strong>${currentMatchStats.assists}</strong> | Tiros: <strong>${currentMatchStats.shots}</strong>`;
        
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
        normalizePlayerPosition(state.player);
        const posBase = state.player.personalData.posicionBase;

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
        
        const scenario = ScenarioSystem.getScenario(posBase, finalQuality);

        if (this.currentSpeed === 8) {
            const autoChoice = scenario.actions[Math.floor(Math.random() * scenario.actions.length)];
            this.handlePlayerDecision(autoChoice, true); 
            return;
        }

        this.isPaused = true;
        clearInterval(this.interval);

        const title = chainedText || scenario.title;
        const msg = `${title} - ${scenario.description}`;
        
        if (this.isChainingVisual) {
            this.printRawHTML(`<div class="chain-divider">── MISMA JUGADA ──</div>`);
            this.printEvent(msg, "chain-scenario", true);
        } else {
            this.printEvent(msg, "highlight");
        }

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

        if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') currentMatchStats.add('passesAttempted');
        if (actionObj.statCategory === 'dribble') currentMatchStats.add('dribblesAttempted');
        if (actionObj.statCategory === 'tackle') currentMatchStats.add('tacklesAttempted');
        
        if (isSuccess) {
            currentMatchStats.add('goodActions'); 
            
            if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') currentMatchStats.add('passesCompleted');
            if (actionObj.statCategory === 'dribble') currentMatchStats.add('dribblesCompleted');
            if (actionObj.statCategory === 'tackle') currentMatchStats.add('tacklesWon');
            
            if (actionObj.statCategory === 'assist') {
                this.potentialAssist = true;
                currentMatchStats.add('assists'); 
            }

            if (actionObj.isPenalty) {
                currentMatchStats.add('penaltiesSaved');
            }

            let successMsg = (isCrit && actionObj.critSuccessMsg) ? actionObj.critSuccessMsg : (actionObj.successMsg || "¡Acción exitosa!");
            this.printEvent(`↳ ${successMsg}`, "chain-result chain-result-success", true);

            if (!isAuto && this.chainCount < 2 && actionObj.chainChance && Math.random() < actionObj.chainChance) {
                this.chainCount++;
                this.isChainingVisual = true; 
                setTimeout(() => {
                    this.triggerPlayerChance(null, actionObj.chainQuality); 
                }, 1000); 
                return; 
            }

        } else {
            currentMatchStats.add('badActions');
            
            if (actionObj.concedesGoalOnFail) {
                this.opponentScore++;
                this.updateScoreboard();
                this.printEvent(`¡GOOOOL de ${this.opponentName}!`, "miss"); 
                this.printEvent(`↳ ${actionObj.failMsg || "Acción fallida."}`, "chain-result chain-result-miss", true); 
            } else {
                this.printEvent(`↳ ${actionObj.failMsg || "Acción fallida."}`, "chain-result chain-result-miss", true);
            }

            if (!isAuto && this.chainCount < 2 && actionObj.failChainChance && Math.random() < actionObj.failChainChance) {
                this.chainCount++;
                this.isChainingVisual = true; 
                setTimeout(() => {
                    this.triggerPlayerChance(null, actionObj.failChainQuality); 
                }, 1000); 
                return; 
            }
        }

        if (!isAuto) {
            this.isChainingVisual = false;
            this.isPaused = false;
            this.startTimer();
        }
    }

    static startShootMinigame(shotType = "normal") {
        this.mgShotType = shotType; 
        currentMatchStats.add('shots'); 
        
        const attrs = state.player.attributes;
        const def = attrs['Definición'];
        
        const perfectWidth = Math.max(0.8, Math.min(7.5, 0.8 + (6.7 * Math.pow(def / 99, 0.9)))); 
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
        if (this.mgCursorPos >= 100) { this.mgCursorPos = 100; this.mgDirection = -1; } 
        else if (this.mgCursorPos <= 0) { this.mgCursorPos = 0; this.mgDirection = 1; }
        
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
        const perfectHalf = perfectW / 2;
        const targetHalf = targetW / 2;
        
        let resultType = 'miss'; 
        if (cursor >= 50 - perfectHalf && cursor <= 50 + perfectHalf) resultType = 'perfect';
        else if (cursor >= 50 - targetHalf && cursor <= 50 + targetHalf) resultType = 'target';

        if (resultType === 'perfect') cursorEl.classList.add('result-perfect');
        else if (resultType === 'target') cursorEl.classList.add('result-target');
        else cursorEl.classList.add('result-miss');

        if (resultType === 'miss') {
            this.printEvent("↳ ¡Le pegaste mordido! La pelota se va afuera.", "chain-result chain-result-miss", true);
            currentMatchStats.add('badActions');
        } else if (resultType === 'perfect') {
            currentMatchStats.add('shotsOnTarget');
            const roll = Math.floor(Math.random() * 100) + 1;
            if (roll <= 97) {
                this.myScore++;
                this.updateScoreboard();
                this.printEvent("↳ ¡GOOOOLAZO! Tiro perfecto, la clavaste en el ángulo.", "chain-result chain-result-success goal", true);
                currentMatchStats.add('goals');
                currentMatchStats.add('goodActions');
            } else {
                this.printEvent("↳ ¡TIRO PERFECTO! Pero el arquero rival saca una pelota imposible.", "chain-result chain-result-success", true);
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
                this.printEvent("↳ ¡Al arco! Pero gran respuesta del arquero.", "chain-result chain-result-success", true);
                currentMatchStats.add('goodActions'); 
            } else {
                this.myScore++;
                this.updateScoreboard();
                this.printEvent("↳ ¡GOOOOOL! Buen remate para vencer al portero.", "chain-result chain-result-success goal", true);
                currentMatchStats.add('goals');
                currentMatchStats.add('goodActions');
            }
        }

        setTimeout(() => {
            document.getElementById('match-actions').style.display = 'none';
            cursorEl.classList.remove('frozen', 'result-perfect', 'result-target', 'result-miss');
            cursorEl.innerHTML = '';
            
            this.isChainingVisual = false;
            this.isPaused = false;
            this.startTimer();
        }, 2500);
    }

    static printRawHTML(htmlContent) {
        const feed = document.getElementById('match-events-feed');
        feed.insertAdjacentHTML('beforeend', htmlContent);
        feed.scrollTop = feed.scrollHeight;
    }

    static printEvent(text, cssClass, isChainFollowup = false) {
        const feed = document.getElementById('match-events-feed');
        const el = document.createElement('div');
        el.className = `match-event ${cssClass}`;
        
        if (isChainFollowup) {
            el.innerHTML = text;
        } else {
            el.textContent = `[${this.minute}'] ${text}`;
        }
        
        feed.appendChild(el);
        feed.scrollTop = feed.scrollHeight; 
    }

    static updateScoreboard() {
        document.getElementById('match-scoreboard').textContent = `${state.career.club} ${this.myScore} - ${this.opponentScore} ${this.opponentName}`;
    }

    static endMatch() {
        clearInterval(this.interval);
        this.printEvent("¡Final del partido! El árbitro señala el medio campo.", "highlight");
        
        const modalHtml = `
            <div id="match-summary-modal">
                <div class="modal-content">
                    <h3>TU ACTUACIÓN</h3>
                    <div class="modal-rating">⭐ <span>${currentMatchStats.calculateRating()}</span></div>
                    <div class="modal-stats">
                        <div>⚽ Goles: <strong>${currentMatchStats.goals}</strong></div>
                        <div>🅰️ Ocasiones Creadas: <strong>${currentMatchStats.assists}</strong></div>
                        <div>🎯 Tiros: <strong>${currentMatchStats.shots}</strong></div>
                        <div>🎯 Al arco: <strong>${currentMatchStats.shotsOnTarget}</strong></div>
                        <div>✓ Pases: <strong>${currentMatchStats.passesCompleted}/${currentMatchStats.passesAttempted}</strong></div>
                        <div>✓ Regates: <strong>${currentMatchStats.dribblesCompleted}/${currentMatchStats.dribblesAttempted}</strong></div>
                        <div>✓ Entradas: <strong>${currentMatchStats.tacklesWon}/${currentMatchStats.tacklesAttempted}</strong></div>
                        <div>✓ Positivas: <strong>${currentMatchStats.goodActions}</strong></div>
                        <div>✕ Negativas: <strong>${currentMatchStats.badActions}</strong></div>
                    </div>
                    <button class="modal-btn" id="btn-close-modal">CONTINUAR</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        state.lastMatchResult = {
            opponent: this.opponentName,
            difficulty: this.difficulty,
            myScore: this.myScore,
            opponentScore: this.opponentScore,
            playerStats: currentMatchStats 
        };

        document.getElementById('btn-close-modal').onclick = () => {
            document.getElementById('match-summary-modal').remove();
            const btnFinish = document.getElementById('btn-finish-match');
            if (btnFinish) {
                btnFinish.click(); 
            }
        };
    }
}