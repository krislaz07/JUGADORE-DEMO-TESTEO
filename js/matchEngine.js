import { state, getDifficultyTag, normalizePlayerPosition } from './state.js';
import { ScenarioSystem } from './scenarioSystem.js';
import { currentMatchStats } from './matchStats.js'; 
import { MinigameManager } from './minigames/minigameManager.js';

export class MatchEngine {
    static decisionTimerId = null;
    static decisionStartTimestamp = null;
    static decisionTotalTime = null;
    static lastWasSpecial = false; 

    static matchRating = 6.0;
    static isSubstituted = false;
    
    static lastInterventionMinute = 0;
    static consecutiveErrors = 0;

    static energy = 100;
    static halftimeRecoveryApplied = false;

    static isStartingOnBench = false;
    static subEntryMinute = null;
    static subEntryRealMinute = null;

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
        this.lastWasSpecial = false; 

        this.matchRating = 6.0;
        this.isSubstituted = false;
        this.lastInterventionMinute = 0;
        this.consecutiveErrors = 0;
        this.halftimeRecoveryApplied = false;

        // ÚNICA FUENTE DE VERDAD: El estado global
        // Si por algún motivo el partido se inicia sin pasar por el Hub, ejecutamos un failsafe.
        // De lo contrario, leemos estrictamente los valores persistentes.
        if (typeof state.player.energy === 'undefined') {
            state.player.energy = 100;
            state.career.isStartingOnBench = false;
            state.player.needsRecovery = false;
        } else if (state.player.needsRecovery) {
            // FAILSAFE: Solo entra acá si el Hub no hizo la recuperación
            const resistencia = state.player.attributes['Resistencia'] || 50;
            const recovery = this.calculateBetweenMatchRecovery(resistencia);
            state.player.energy = Math.min(100, state.player.energy + recovery);
            
            const benchProb = this.getBenchProbability(state.player.energy);
            state.career.isStartingOnBench = (Math.random() * 100 < benchProb);
            
            state.player.needsRecovery = false;
        }

        // ASIGNACIÓN LÍMPIA: El motor calca su estado temporal desde la fuente de verdad.
        this.energy = state.player.energy;
        this.isStartingOnBench = state.career.isStartingOnBench || false;

        // Solo determinamos el minuto de entrada si la fuente de verdad dice que sos suplente.
        if (this.isStartingOnBench) {
            this.subEntryMinute = Math.floor(Math.random() * 21) + 55; 
        } else {
            this.subEntryMinute = null;
        }
        this.subEntryRealMinute = null;

        this.generateInterventionMinutes();
        this.setupUI();
        
        const diffTag = getDifficultyTag(this.difficulty);
        this.printEvent(`¡Arranca el partido! ${state.career.club} vs ${this.opponentName} (${diffTag})`, "normal");
        
        if (this.isStartingOnBench) {
            this.printEvent(`Estás en el banco. El entrenador decidió reservarte.`, "normal");
        }
        
        this.startTimer();
    }

    static calculateBetweenMatchRecovery(resistencia) {
        return Math.round(30 + (resistencia * 0.5));
    }

    static getBenchProbability(energy) {
        if (energy >= 70) return 5; 
        if (energy >= 50) return 5 + ((70 - energy) * 0.75);  
        if (energy >= 30) return 20 + ((50 - energy) * 1.5);  
        if (energy >= 10) return 50 + ((30 - energy) * 1.75); 
        return 85 + ((10 - energy) * 1.4); 
    }

    static generateInterventionMinutes() {
        const posicionamiento = state.player.attributes['Posicionamiento'];
        let base = 3 + Math.floor(Math.random() * 3); 
        let bonus = Math.floor(posicionamiento / 33); 
        let numInterventions = base + bonus;
        numInterventions = Math.max(3, Math.min(8, numInterventions));

        this.interventionMinutes = [];
        let attempts = 0;
        
        while (this.interventionMinutes.length < numInterventions && attempts < 300) {
            attempts++;
            let m = Math.floor(Math.random() * 88) + 1; 
            if (m === 45) continue;
            
            let isValid = true;
            for (let existing of this.interventionMinutes) {
                if (Math.abs(m - existing) < 6) {
                    isValid = false;
                    break;
                }
            }
            
            if (isValid) {
                this.interventionMinutes.push(m);
            }
        }
        
        while (this.interventionMinutes.length < numInterventions) {
            let m = Math.floor(Math.random() * 88) + 1;
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
        if (this.isSubstituted) return;

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

        const timeHeader = document.getElementById('match-time').parentElement;
        let ratingContainer = document.getElementById('dynamic-rating-container');
        if (!ratingContainer) {
            ratingContainer = document.createElement('div');
            ratingContainer.id = 'dynamic-rating-container';
            ratingContainer.style.display = 'flex';
            ratingContainer.style.alignItems = 'center';
            ratingContainer.style.gap = '15px';
            timeHeader.insertBefore(ratingContainer, timeHeader.firstChild);
        }
        
        ratingContainer.innerHTML = `
            <div class="hud-energy-container">
                <div class="hud-energy-header">
                    <span>⚡ ENERGÍA</span>
                    <span class="energy-val" id="dynamic-energy-val">100</span>
                </div>
                <div class="hud-energy-track">
                    <div id="dynamic-energy-bar" class="hud-energy-fill" style="background:#00ff88;"></div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-left: 10px;">
                <span style="color:var(--text-muted); font-size:11px; font-weight:bold; letter-spacing:1px;">MEDIA</span>
                <span id="dynamic-rating-value" style="background:var(--accent); color:#000; padding:2px 8px; border-radius:4px; font-weight:900; font-size:16px;">6.0</span>
            </div>
        `;
        
        this.updateEnergyUI();
    }

    static modifyEnergy(delta) {
        if (this.isSubstituted || this.isStartingOnBench) return;
        this.energy += delta;
        this.energy = Math.max(0, Math.min(100, this.energy));
        this.updateEnergyUI();
    }

    static updateEnergyUI() {
        const bar = document.getElementById('dynamic-energy-bar');
        const val = document.getElementById('dynamic-energy-val');
        if (bar && val) {
            const energyInt = Math.round(this.energy);
            bar.style.width = `${this.energy}%`;
            val.textContent = energyInt;
            
            if (this.energy >= 70) {
                bar.style.background = '#00ff88';
                val.style.color = '#00ff88';
            } else if (this.energy >= 40) {
                bar.style.background = '#FFD700';
                val.style.color = '#FFD700';
            } else if (this.energy >= 20) {
                bar.style.background = '#ff9900';
                val.style.color = '#ff9900';
            } else {
                bar.style.background = '#ff4c4c';
                val.style.color = '#ff4c4c';
            }
        }
    }

    static getFatigueMultiplier() {
        if (this.energy >= 80) return 1.0;
        if (this.energy >= 60) return 0.95;
        if (this.energy >= 40) return 0.85;
        if (this.energy >= 20) return 0.70;
        return 0.50; 
    }

    static updateMatchRating(delta, reason, isAction = true, isError = false) {
        if (this.isSubstituted) return;

        if (isAction && !isError) {
            this.consecutiveErrors = 0;
        }

        let finalDelta = delta;

        if (isError) {
            this.consecutiveErrors++;
            
            let progressivePenalty = -0.10 - (this.consecutiveErrors * 0.05);
            progressivePenalty = Math.max(-0.30, progressivePenalty);
            
            if (delta < progressivePenalty) {
                finalDelta = delta; 
            } else {
                finalDelta = progressivePenalty;
            }
        }

        this.matchRating += finalDelta;
        this.matchRating = Math.max(1.0, Math.min(10.0, this.matchRating));
        
        currentMatchStats.dynamicRating = this.matchRating; 
        
        const valEl = document.getElementById('dynamic-rating-value');
        if (valEl) {
            valEl.textContent = this.matchRating.toFixed(1);
            if (this.matchRating >= 7.0) { valEl.style.background = '#00ff88'; valEl.style.color = '#004d28'; }
            else if (this.matchRating >= 6.0) { valEl.style.background = 'var(--accent)'; valEl.style.color = '#000'; }
            else if (this.matchRating >= 5.0) { valEl.style.background = '#FFD700'; valEl.style.color = '#4d4000'; }
            else { valEl.style.background = '#ff4c4c'; valEl.style.color = '#fff'; }
        }
    }

    static getSubstitutionProbability(rating) {
        if (rating >= 5.5) return 0;
        if (rating >= 5.0) return (5.5 - rating) * 10;          
        if (rating >= 4.0) return 5 + (5.0 - rating) * 10;      
        if (rating >= 3.0) return 15 + (4.0 - rating) * 15;     
        if (rating >= 2.0) return 30 + (3.0 - rating) * 45;     
        if (rating >= 1.0) return 75 + (2.0 - rating) * 15;     
        return 90; 
    }

    static executeSubstitution(reason = 'rating') {
        this.isSubstituted = true;
        
        if (reason === 'stamina') {
            this.printEvent(`❌ No das más del cansancio. El entrenador te sustituye por agotamiento.`, "miss");
        } else {
            this.printEvent(`❌ El entrenador no está conforme con tu rendimiento. Sos sustituido.`, "miss");
        }
        
        this.interventionMinutes = []; 

        this.isPaused = true;
        if (this.interval) clearInterval(this.interval);

        const overlay = document.createElement('div');
        overlay.id = 'sub-message-overlay';
        overlay.className = 'mg-modal-overlay';
        overlay.innerHTML = `
            <div class="mg-modal-content" style="text-align: center; border-color: #ff4c4c; max-width: 350px;">
                <h2 style="color: #ff4c4c; font-size: 26px; margin: 0 0 10px 0; text-transform: uppercase;">Has sido sustituido</h2>
                <p style="color: #a1a1aa; margin: 0; font-size: 14px;">${reason === 'stamina' ? "Salís del campo por agotamiento físico." : "El entrenador decide sacarte del campo."}</p>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => {
            const overlayEl = document.getElementById('sub-message-overlay');
            if (overlayEl) overlayEl.remove();

            this.currentSpeed = 8;
            this.isPaused = false;
            this.startTimer();
        }, 2500);
    }

    static executeSubEntry() {
        this.printEvent(`🔄 ¡A la cancha! El entrenador te manda a jugar.`, "highlight");
        
        this.isPaused = true;
        if (this.interval) clearInterval(this.interval);

        const overlay = document.createElement('div');
        overlay.id = 'sub-entry-overlay';
        overlay.className = 'mg-modal-overlay';
        overlay.innerHTML = `
            <div class="mg-modal-content" style="text-align: center; border-color: #00ff88; max-width: 350px;">
                <h2 style="color: #00ff88; font-size: 26px; margin: 0 0 10px 0; text-transform: uppercase;">¡A la cancha!</h2>
                <p style="color: #a1a1aa; margin: 0; font-size: 14px;">El entrenador te manda a jugar.</p>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => {
            const overlayEl = document.getElementById('sub-entry-overlay');
            if (overlayEl) overlayEl.remove();

            this.isStartingOnBench = false;
            this.subEntryRealMinute = this.minute; 
            this.lastInterventionMinute = this.minute; 
            
            this.isPaused = false;
            this.startTimer();
        }, 2500);
    }

    static tick() {
        if (this.isPaused) return; 

        this.minute++;
        document.getElementById('match-time').textContent = `Minuto: ${this.minute}'`;

        if (this.isStartingOnBench) {
            if (this.minute === this.subEntryMinute) {
                this.executeSubEntry();
                return;
            }
        }

        if (!this.isSubstituted && !this.isStartingOnBench) {
            const resistencia = state.player.attributes['Resistencia'] || 50;
            const drainRate = 1.2 * (1.5 - (resistencia * 0.01));
            this.modifyEnergy(-drainRate);

            let inactiveMinutes = this.minute - this.lastInterventionMinute;
            if (inactiveMinutes >= 15 && inactiveMinutes % 5 === 0) {
                this.updateMatchRating(-0.05, 'inactividad', false, false);
            }

            if (this.minute % 5 === 0) {
                if (this.minute > 15 && this.minute <= 85) {
                    
                    let hasGracePeriod = false;
                    if (this.subEntryRealMinute !== null && (this.minute - this.subEntryRealMinute) < 15) {
                        hasGracePeriod = true;
                    }

                    if (!hasGracePeriod) {
                        let exhaustProb = 0;
                        if (this.energy < 5) exhaustProb = 80;
                        else if (this.energy < 15) exhaustProb = 35;
                        else if (this.energy < 25) exhaustProb = 10;

                        if (exhaustProb > 0 && (Math.random() * 100 < exhaustProb)) {
                            this.executeSubstitution('stamina');
                            return;
                        }
                    }

                    const baseProb = this.getSubstitutionProbability(this.matchRating);
                    if (baseProb > 0) {
                        let timeMult = 1.0;
                        if (this.minute <= 30) timeMult = 0.5;
                        else if (this.minute <= 60) timeMult = 0.75;
                        else if (this.minute <= 75) timeMult = 1.0;
                        else timeMult = 1.25;

                        const finalProb = Math.min(100, baseProb * timeMult);
                        
                        const roll = Math.random() * 100;
                        if (roll < finalProb) {
                            this.executeSubstitution('rating');
                            return;
                        }
                    }
                }
            }
        }

        if (this.minute === 45) {
            this.triggerHalfTime();
            return;
        }
        if (this.minute >= 90) {
            this.endMatch();
            return;
        }

        if (!this.isSubstituted && !this.isStartingOnBench && this.interventionMinutes.includes(this.minute)) {
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

    static calculateHalftimeRecovery() {
        const resistencia = state.player.attributes['Resistencia'] || 50;
        return Math.round(17.5 + (resistencia * 0.125));
    }

    static triggerHalfTime() {
        this.isPaused = true;
        clearInterval(this.interval);
        this.printEvent("¡Final del primer tiempo! Los equipos van al descanso.", "highlight");
        
        let recoveryMsg = '';
        if (!this.halftimeRecoveryApplied && !this.isSubstituted && !this.isStartingOnBench) {
            const recoveryAmount = this.calculateHalftimeRecovery();
            this.modifyEnergy(recoveryAmount);
            this.halftimeRecoveryApplied = true;
            
            this.printEvent(`⏱️ Entretiempo: Recuperás +${recoveryAmount} de energía.`, "normal");
            recoveryMsg = `<br><br><span style="color:#00ff88; font-weight:bold; letter-spacing:1px; background:rgba(0,255,136,0.1); padding:4px 8px; border-radius:4px;">⚡ +${recoveryAmount} ENERGÍA RECUPERADA</span>`;
        }
        
        let tempRating = currentMatchStats.calculateRating();
        document.getElementById('ht-scoreboard').textContent = `${state.career.club} ${this.myScore} - ${this.opponentScore} ${this.opponentName}`;
        document.getElementById('ht-rating').textContent = tempRating;
        
        document.getElementById('ht-stats-txt').innerHTML = `Goles: <strong>${currentMatchStats.goals}</strong> | Ocasiones Creadas: <strong>${currentMatchStats.assists}</strong> | Tiros: <strong>${currentMatchStats.shots}</strong>${recoveryMsg}`;
        
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

    static getDecisionTimerConfig(level) {
        if (level <= 20) return null; 
        if (level <= 40) return 8;    
        if (level <= 60) return 7;
        if (level <= 80) return 6;
        return 5;                  
    }

    static triggerPlayerChance(chainedText = null, forcedQuality = null) {
        this.lastInterventionMinute = this.minute;

        normalizePlayerPosition(state.player);
        const posBase = state.player.personalData.posicionBase;

        let isSpecial = false;
        if (!chainedText && !this.lastWasSpecial) {
            const posStat = state.player.attributes['Posicionamiento'] || 50;
            
            let baseProb = 0.01;
            if (posStat >= 90) baseProb = 0.04;
            else if (posStat >= 80) baseProb = 0.03;
            else if (posStat >= 60) baseProb = 0.02;
            else if (posStat >= 40) baseProb = 0.015;

            let minMult = 1.0;
            if (this.minute >= 90) minMult = 1.20;
            else if (this.minute >= 85) minMult = 1.15;
            else if (this.minute >= 75) minMult = 1.10;
            else if (this.minute >= 60) minMult = 1.05;

            if (Math.random() < (baseProb * minMult)) {
                isSpecial = true;
            }
        }

        let scenario;
        if (isSpecial) {
            this.lastWasSpecial = true; 
            scenario = ScenarioSystem.getSpecialScenario(posBase);
        } else {
            if (!chainedText) this.lastWasSpecial = false; 
            
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
            scenario = ScenarioSystem.getScenario(posBase, finalQuality);
        }
        
        const options = ScenarioSystem.generateScenarioOptions(scenario, state.career.level);

        if (this.currentSpeed === 8) {
            const autoChoice = options[Math.floor(Math.random() * options.length)];
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
        
        const existingTimer = document.getElementById('decision-timer-wrapper');
        if (existingTimer) existingTimer.remove();

        actionsContainer.style.display = 'block';
        btnContainer.style.display = 'grid';
        btnContainer.innerHTML = '';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'game-btn primary tooltip-btn';
            
            if (scenario.type === 'forced') {
                btn.innerHTML = `⚽ ${opt.text}`;
            } else {
                btn.innerHTML = `${opt.text}
                    <div class="tooltip-box">
                        <span class="tooltip-req">${opt.reqAttr}</span>
                        <span class="tooltip-desc">${opt.desc}</span>
                    </div>
                `;
            }
            
            btn.onclick = () => this.handlePlayerDecision(opt, false);
            btnContainer.appendChild(btn);
        });

        const timerSeconds = this.getDecisionTimerConfig(state.career.level);
        if (timerSeconds) {
            const timerHtml = `
                <div id="decision-timer-wrapper" class="decision-timer-wrapper">
                    <div class="decision-timer-label">TIEMPO PARA DECIDIR</div>
                    <div class="decision-timer-container">
                        <div id="decision-timer-bar" class="decision-timer-bar"></div>
                    </div>
                </div>
            `;
            
            actionsContainer.insertAdjacentHTML('afterbegin', timerHtml);
            
            this.decisionTotalTime = timerSeconds * 1000;
            this.decisionStartTimestamp = null;
            this.decisionTimerId = requestAnimationFrame((ts) => this.updateDecisionTimer(ts));
        }
    }

    static updateDecisionTimer(timestamp) {
        if (!this.decisionStartTimestamp) this.decisionStartTimestamp = timestamp;
        
        const elapsed = timestamp - this.decisionStartTimestamp;
        const remaining = this.decisionTotalTime - elapsed;
        let pct = (remaining / this.decisionTotalTime) * 100;
        
        if (pct <= 0) {
            pct = 0;
            document.getElementById('decision-timer-bar').style.width = '0%';
            this.handleDecisionTimeout();
            return;
        }
        
        const timerBar = document.getElementById('decision-timer-bar');
        if (timerBar) {
            timerBar.style.width = `${pct}%`;
            if (pct < 25) {
                timerBar.style.background = '#ff4c4c';
            }
        }
        
        this.decisionTimerId = requestAnimationFrame((ts) => this.updateDecisionTimer(ts));
    }

    static handleDecisionTimeout() {
        if (this.decisionTimerId) {
            cancelAnimationFrame(this.decisionTimerId);
            this.decisionTimerId = null;
        }
        document.getElementById('match-actions').style.display = 'none';
        
        currentMatchStats.add('badActions');
        this.updateMatchRating(-0.25, 'timeout', true, true);
        
        this.printEvent("↳ Dudaste demasiado tiempo y te robaron la pelota.", "chain-result chain-result-miss", true);
        
        const dummyAction = { statCategory: 'timeout', chainChance: 0, failChainChance: 0 };
        this.processChains(dummyAction, false);
    }

    static shouldActivateMinigame(actionObj, minigameType) {
        if (actionObj.forceMinigame) return true;
        return Math.random() < 0.5;
    }

    static handlePlayerDecision(actionObj, isAuto = false) {
        if (this.decisionTimerId) {
            cancelAnimationFrame(this.decisionTimerId);
            this.decisionTimerId = null;
        }
        
        document.getElementById('match-actions').style.display = 'none';

        let actionCost = 1.0;
        if (actionObj.statCategory === 'shot') actionCost = 1.5;
        else if (actionObj.statCategory === 'dribble') actionCost = 1.2;
        else if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') actionCost = 0.8;
        this.modifyEnergy(-actionCost);

        const fatigueMult = this.getFatigueMultiplier();
        let fatiguedAttrs = {};
        for (const key in state.player.attributes) {
            fatiguedAttrs[key] = Math.max(1, Math.floor(state.player.attributes[key] * fatigueMult));
        }

        let minigameType = null;
        if (actionObj.minigame) {
            minigameType = Array.isArray(actionObj.minigame) ? actionObj.minigame[0] : actionObj.minigame;
        } else {
            if (actionObj.statCategory === 'shot') minigameType = 'shooting';
            if (actionObj.statCategory === 'dribble') minigameType = 'dribbling';
            if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') minigameType = 'passing';
        }

        let triggerMinigame = false;

        if (minigameType && !isAuto) {
            triggerMinigame = this.shouldActivateMinigame(actionObj, minigameType);
        }

        if (triggerMinigame) {
            const started = MinigameManager.start(minigameType, actionObj, fatiguedAttrs, this.difficulty, (result) => {
                this.resolveMinigameResult(actionObj, result, fatiguedAttrs);
            });
            
            if (started) return; 
        } else if (isAuto && minigameType) {
            this.resolveAutoMinigame(actionObj, fatiguedAttrs);
            return;
        }

        let baseStat = 0;
        if (actionObj.calc) {
            for (const [attr, weight] of Object.entries(actionObj.calc)) {
                baseStat += fatiguedAttrs[attr] * weight;
            }
        }

        let difficultyPenalty = (this.difficulty - 50) * 0.5;
        let finalChance = baseStat - difficultyPenalty;
        let roll = Math.floor(Math.random() * 100) + 1;
        
        let isSuccess = roll <= finalChance;
        let isCrit = roll <= (finalChance / 2);

        this.processActionOutcome(actionObj, isSuccess, isCrit, false);
    }

    static resolveMinigameResult(actionObj, result, fatiguedAttrs) {
        const quality = result.quality; 
        const attrs = fatiguedAttrs || state.player.attributes;
        
        let baseStat = 0;
        if (actionObj.calc) {
            for (const [attr, weight] of Object.entries(actionObj.calc)) {
                baseStat += attrs[attr] * weight;
            }
        }

        if (actionObj.statCategory === 'shot') {
            currentMatchStats.add('shots');
            
            if (quality === 'fail') {
                this.updateMatchRating(-1.0, 'shot_mordido', true, true);
                this.printEvent("↳ ¡Le pegaste mordido! La pelota se va afuera.", "chain-result chain-result-miss", true);
                currentMatchStats.add('badActions');
                this.processChains(actionObj, false); 
            } else {
                let isOnTarget = true;
                if (quality === 'good') {
                    let accuracyRoll = Math.floor(Math.random() * 100) + 1;
                    isOnTarget = accuracyRoll <= baseStat;
                }

                if (!isOnTarget) {
                    this.updateMatchRating(-0.15, 'shot_desviado', true, true);
                    this.printEvent("↳ ¡Le pegaste con demasiada fuerza y se fue desviado!", "chain-result chain-result-miss", true);
                    currentMatchStats.add('badActions');
                    this.processChains(actionObj, false);
                } else {
                    currentMatchStats.add('shotsOnTarget');
                    
                    let gkForce = this.difficulty;
                    let finalGoalChance = baseStat - (gkForce - 50);
                    finalGoalChance = Math.max(5, Math.min(95, finalGoalChance)); 
                    
                    let isGoal = false;
                    if (quality === 'perfect') {
                        isGoal = (Math.floor(Math.random() * 100) + 1) <= (finalGoalChance + 35);
                    } else if (quality === 'good') {
                        isGoal = (Math.floor(Math.random() * 100) + 1) <= finalGoalChance;
                    }
                    
                    if (!isGoal) {
                        this.updateMatchRating(quality === 'perfect' ? 0.15 : 0.10, 'shot_saved', true, false);
                        let msg = quality === 'perfect' 
                            ? "↳ ¡REMATE EXCEPCIONAL! Iba directo al ángulo, pero el arquero sacó una pelota de antología." 
                            : "↳ ¡Al arco! Pero gran respuesta del arquero.";
                        this.printEvent(msg, "chain-result chain-result-success", true);
                        currentMatchStats.add('goodActions'); 
                        this.processChains(actionObj, false); 
                    } else {
                        this.updateMatchRating(1.0, 'goal', true, false);
                        this.myScore++;
                        this.updateScoreboard();
                        let msg = quality === 'perfect' 
                            ? "↳ ¡GOOOOLAZO! Ejecución perfecta, la clavaste en el ángulo." 
                            : "↳ ¡GOOOOOL! Buen remate para vencer al portero.";
                        this.printEvent(msg, "chain-result chain-result-success goal", true);
                        currentMatchStats.add('goals');
                        currentMatchStats.add('goodActions');
                        this.processChains(actionObj, true);
                    }
                }
            }
        }
        else if (actionObj.statCategory === 'dribble') {
            currentMatchStats.add('dribblesAttempted');
            
            let isSuccess = false;

            if (quality === 'perfect') {
                let roll = Math.floor(Math.random() * 100) + 1;
                isSuccess = roll <= 99;
            } else if (quality === 'good') {
                let difficultyPenalty = (this.difficulty - 50) * 0.5;
                let finalChance = baseStat - difficultyPenalty;
                let roll = Math.floor(Math.random() * 100) + 1;
                isSuccess = roll <= finalChance;
            } else {
                isSuccess = false;
            }

            if (isSuccess) {
                this.updateMatchRating(quality === 'perfect' ? 0.15 : 0.10, 'dribble_success', true, false);
                currentMatchStats.add('dribblesCompleted');
                currentMatchStats.add('goodActions');
                let msg = quality === 'perfect' 
                    ? `↳ ¡REGATE PERFECTO! ${actionObj.critSuccessMsg || "Dejaste al defensor clavado en el piso."}` 
                    : `↳ ¡LO SUPERASTE! ${actionObj.successMsg || "Pasaste con lo justo."}`;
                
                this.printEvent(msg, "chain-result chain-result-success", true);
                this.processChains(actionObj, true);
            } else {
                let penalty = 0;
                if (quality === 'perfect') penalty = 0;
                else if (quality === 'good') penalty = -0.15;
                else penalty = -0.20;

                this.updateMatchRating(penalty, 'dribble_fail', true, true);
                currentMatchStats.add('badActions');
                let msg = quality === 'perfect' 
                    ? `↳ ¡Increíble! A pesar de tu excelente maniobra, el defensor se recuperó milagrosamente y te la robó.` 
                    : (quality === 'fail' 
                        ? `↳ ¡Te la robaron! ${actionObj.failMsg || "Caíste directo en la trampa del defensor."}` 
                        : `↳ ¡Buen intento! Pero el defensor logró meter la pierna a tiempo.`);
                
                this.printEvent(msg, "chain-result chain-result-miss", true);
                this.processChains(actionObj, false);
            }
        }
        else if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') {
            currentMatchStats.add('passesAttempted');
            
            let isSuccess = false;

            if (quality === 'perfect') {
                isSuccess = true; 
            } else if (quality === 'good') {
                let finalChance = baseStat;
                let roll = Math.floor(Math.random() * 100) + 1;
                isSuccess = roll <= finalChance;
            } else {
                isSuccess = false; 
            }

            if (isSuccess) {
                let isAssist = false;
                if (actionObj.statCategory === 'assist') {
                    isAssist = true;
                    this.potentialAssist = true;
                    currentMatchStats.add('assists');
                }
                
                let pts = quality === 'perfect' ? 0.15 : 0.10;
                if (isAssist) pts += 0.3; 
                this.updateMatchRating(pts, 'pass_success', true, false);
                
                currentMatchStats.add('passesCompleted');
                currentMatchStats.add('goodActions');
                
                let msg = quality === 'perfect' 
                    ? `↳ ¡PASE PERFECTO! ${actionObj.critSuccessMsg || "Precisión milimétrica."}` 
                    : `↳ ¡Buen pase! ${actionObj.successMsg || "Conectaste con tu compañero."}`;
                
                this.printEvent(msg, "chain-result chain-result-success", true);
                this.processChains(actionObj, true);
            } else {
                let penalty = 0;
                if (quality === 'perfect') penalty = 0;
                else if (quality === 'good') penalty = -0.15;
                else penalty = -0.20;

                this.updateMatchRating(penalty, 'pass_fail', true, true);
                currentMatchStats.add('badActions');
                
                let msg = quality === 'perfect' 
                    ? `↳ ¡Increíble! El pase fue perfecto pero la defensa adivinó la jugada y la cortó de milagro.`
                    : (quality === 'fail' 
                        ? `↳ ¡Mal pase! ${actionObj.failMsg || "Le pegaste muy mal y la regalaste al rival."}` 
                        : `↳ ¡Interceptado! El pase fue bueno pero la defensa cerró a tiempo.`);
                
                this.printEvent(msg, "chain-result chain-result-miss", true);
                this.processChains(actionObj, false);
            }
        }
        else {
            let isSuccess = (quality === 'perfect' || quality === 'good');
            if(isSuccess) {
                this.updateMatchRating(0.10, 'fallback_success', true, false);
                this.printEvent(`↳ Acción interactiva lograda (${quality}).`, "chain-result chain-result-success", true);
                currentMatchStats.add('goodActions');
            } else {
                this.updateMatchRating(-0.15, 'fallback_fail', true, true);
                this.printEvent(`↳ Acción interactiva fallida.`, "chain-result chain-result-miss", true);
                currentMatchStats.add('badActions');
            }
            this.processChains(actionObj, isSuccess);
        }
    }

    static resolveAutoMinigame(actionObj, fatiguedAttrs) {
        let baseStat = 0;
        if (actionObj.calc) {
            for (const [attr, weight] of Object.entries(actionObj.calc)) {
                baseStat += fatiguedAttrs[attr] * weight;
            }
        }
        
        if (actionObj.statCategory === 'shot') {
            currentMatchStats.add('shots');
            let gkSimForce = this.difficulty;
            let simChaos = (Math.floor(Math.random() * 21) - 10);
            let gkSimChaos = (Math.floor(Math.random() * 21) - 10);
            
            if ((baseStat + simChaos) > (gkSimForce + gkSimChaos)) {
                this.updateMatchRating(1.0, 'sim_goal', true, false);
                this.myScore++;
                this.updateScoreboard();
                this.printEvent(`(Sim) ¡GOOOOOL! Buena resolución.`, "goal");
                currentMatchStats.add('goals');
                currentMatchStats.add('shotsOnTarget');
                currentMatchStats.add('goodActions');
            } else {
                this.updateMatchRating(-0.15, 'sim_miss', true, true);
                this.printEvent(`(Sim) Remate fallado o atajado.`, "miss");
                currentMatchStats.add('badActions');
            }
        }
        return;
    }

    static processActionOutcome(actionObj, isSuccess, isCrit, isAuto) {
        if (actionObj.statCategory === 'pass' || actionObj.statCategory === 'assist') currentMatchStats.add('passesAttempted');
        if (actionObj.statCategory === 'dribble') currentMatchStats.add('dribblesAttempted');
        if (actionObj.statCategory === 'tackle') currentMatchStats.add('tacklesAttempted');
        
        if (isSuccess) {
            let pts = isCrit ? 0.15 : 0.10;
            if (actionObj.statCategory === 'assist') pts += 0.3;
            if (actionObj.isPenalty) pts += 0.5;
            this.updateMatchRating(pts, 'normal_success', true, false);

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

            this.processChains(actionObj, true);

        } else {
            let penalty = actionObj.concedesGoalOnFail ? -0.4 : -0.15; 
            this.updateMatchRating(penalty, 'normal_fail', true, true);

            currentMatchStats.add('badActions');
            
            if (actionObj.concedesGoalOnFail) {
                this.opponentScore++;
                this.updateScoreboard();
                this.printEvent(`¡GOOOOL de ${this.opponentName}!`, "miss"); 
                this.printEvent(`↳ ${actionObj.failMsg || "Acción fallida."}`, "chain-result chain-result-miss", true); 
            } else {
                this.printEvent(`↳ ${actionObj.failMsg || "Acción fallida."}`, "chain-result chain-result-miss", true);
            }

            this.processChains(actionObj, false);
        }
    }

    static processChains(actionObj, isSuccess) {
        if (isSuccess) {
            if (this.chainCount < 2 && actionObj.chainChance && Math.random() < actionObj.chainChance) {
                this.chainCount++;
                this.isChainingVisual = true; 
                setTimeout(() => {
                    this.triggerPlayerChance(null, actionObj.chainQuality); 
                }, 1000); 
                return; 
            }
        } else {
            if (this.chainCount < 2 && actionObj.failChainChance && Math.random() < actionObj.failChainChance) {
                this.chainCount++;
                this.isChainingVisual = true; 
                setTimeout(() => {
                    this.triggerPlayerChance(null, actionObj.failChainQuality); 
                }, 1000); 
                return; 
            }
        }

        this.isChainingVisual = false;
        this.isPaused = false;
        
        document.getElementById('match-actions').style.display = 'none';
        
        this.startTimer();
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
        
        state.player.energy = this.energy;
        state.player.needsRecovery = true; 

        if (this.isSubstituted) {
            this.printEvent("Has sido sustituido. Viendo el resto del partido desde el banco...", "normal");
        } else {
            this.printEvent("¡Final del partido! El árbitro señala el medio campo.", "highlight");
        }
        
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