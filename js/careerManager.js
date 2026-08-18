import { state, getFamaRank, getDifficultyTag, normalizePlayerPosition } from './state.js';
import { PlayerTemplates } from './playerTemplates.js';
import { MatchEngine } from './matchEngine.js';

export class CareerManager {
    static updateHub() {
        const player = state.player;
        const career = state.career;
        if (!player) return;
        
        normalizePlayerPosition(player);
        
        // Recuperación y Titularidad
        if (typeof player.energy === 'undefined') {
            player.energy = 100;
            career.isStartingOnBench = false;
            player.needsRecovery = false;
        } else if (player.needsRecovery) {
            const resistencia = player.attributes['Resistencia'] || 50;
            const recovery = MatchEngine.calculateBetweenMatchRecovery(resistencia);
            player.energy = Math.min(100, player.energy + recovery);
            
            const benchProb = MatchEngine.getBenchProbability(player.energy);
            career.isStartingOnBench = (Math.random() * 100 < benchProb);
            player.needsRecovery = false;
        }

        // Pestañas
        this.setupTabs();

        // Actualizar UI General
        document.getElementById('hub-ovr').textContent = player.overall;
        document.getElementById('hub-pos').textContent = PlayerTemplates.positionInfo[player.personalData.posicionBase]?.abbr || player.personalData.posicionBase;
        document.getElementById('hub-name').textContent = `${player.personalData.nombre} ${player.personalData.apellido} (${player.personalData.edad} años)`;
        document.getElementById('hub-club').textContent = career.club;
        document.getElementById('hub-level').textContent = career.level;
        
        // Renderizar la energía
        this.renderEnergyStatus(player, career);

        // Renderizar Overview Data
        document.getElementById('hub-xp-text').textContent = `${career.xp} / ${career.xpToNextLevel} XP`;
        const xpPercent = Math.min(100, (career.xp / career.xpToNextLevel) * 100);
        document.getElementById('hub-xp-fill').style.width = `${xpPercent}%`;
        
        document.getElementById('hub-fama-level').textContent = career.famaLevel;
        document.getElementById('hub-fama-rank').textContent = getFamaRank(career.famaLevel);
        document.getElementById('hub-fama-text').textContent = `${career.famaPoints} / ${career.famaToNextLevel} Pts`;
        const famaPercent = Math.min(100, (career.famaPoints / career.famaToNextLevel) * 100);
        document.getElementById('hub-fama-fill').style.width = `${famaPercent}%`;
        
        const devBtn = document.getElementById('btn-development');
        if (devBtn) {
            devBtn.textContent = `Desarrollo (${career.devPoints})`;
            if (career.devPoints > 0) {
                devBtn.classList.add('pulse-anim');
                devBtn.style.border = '2px solid #FFD700';
            } else {
                devBtn.classList.remove('pulse-anim');
                devBtn.style.border = 'none';
            }
        }
        
        // Encontrar el próximo partido real en el FIXTURE
        const currentMatchday = career.fixture[career.currentMatchIndex];
        const btnPlayMatch = document.getElementById('btn-play-match');
        
        if (currentMatchday && career.currentMatchIndex < 58) {
            const playerMatch = currentMatchday.find(m => m.home === career.club || m.away === career.club);
            const isHome = playerMatch.home === career.club;
            const opponent = isHome ? playerMatch.away : playerMatch.home;
            const diffTag = getDifficultyTag(isHome ? playerMatch.awayDiff : playerMatch.homeDiff);
            
            document.getElementById('hub-next-match').innerHTML = `Jornada ${career.currentMatchIndex + 1}<br><span style="font-size: 18px; color: #fff;">${isHome ? '🏠' : '✈️'} vs ${opponent}</span><br><span style="font-size: 14px; color: var(--text-muted); font-weight: normal;">${diffTag}</span>`;
            if (btnPlayMatch) btnPlayMatch.disabled = false;
        } else {
            document.getElementById('hub-next-match').innerHTML = "Fin de temporada";
            if (btnPlayMatch) btnPlayMatch.disabled = true;
        }
        
        document.getElementById('hub-stat-pj').textContent = career.stats.matchesPlayed;
        document.getElementById('hub-stat-g').textContent = career.stats.goals;
        document.getElementById('hub-stat-a').textContent = career.stats.assists;
        
        const ratings = career.stats.matchRatings;
        let avg = "-";
        if (ratings.length > 0) {
            const sum = ratings.reduce((a, b) => a + b, 0);
            avg = (sum / ratings.length).toFixed(1);
        }
        document.getElementById('hub-stat-prom').textContent = avg;

        this.renderLeagueTable(career);
        this.renderCalendar(career);
    }

    static setupTabs() {
        const tabOverview = document.getElementById('tab-btn-overview');
        const tabLeague = document.getElementById('tab-btn-league');
        const tabCalendar = document.getElementById('tab-btn-calendar');

        const contentOverview = document.getElementById('hub-content-overview');
        const contentLeague = document.getElementById('hub-content-league');
        const contentCalendar = document.getElementById('hub-content-calendar');

        const switchTab = (activeBtn, activeContent) => {
            [tabOverview, tabLeague, tabCalendar].forEach(b => b.classList.remove('active', 'primary'));
            [tabOverview, tabLeague, tabCalendar].forEach(b => b.classList.add('secondary'));
            activeBtn.classList.remove('secondary');
            activeBtn.classList.add('primary', 'active');

            contentOverview.style.display = 'none';
            contentLeague.style.display = 'none';
            contentCalendar.style.display = 'none';
            // El overview usa layout de grilla
            activeContent.style.display = activeContent === contentOverview ? 'grid' : 'block';
        };

        // Asignación limpia sin duplicar eventos
        tabOverview.onclick = () => switchTab(tabOverview, contentOverview);
        tabLeague.onclick = () => switchTab(tabLeague, contentLeague);
        tabCalendar.onclick = () => switchTab(tabCalendar, contentCalendar);
    }

    static renderEnergyStatus(player, career) {
        let energyStatusContainer = document.getElementById('hub-energy-status-container');
        if (!energyStatusContainer) {
            const panel = document.querySelector('.left-panel');
            energyStatusContainer = document.createElement('div');
            energyStatusContainer.id = 'hub-energy-status-container';
            energyStatusContainer.style.margin = '0 0 15px 0';
            panel.insertBefore(energyStatusContainer, panel.firstChild);
        }
        
        const energy = player.energy;
        let color = '#00ff88';
        let statusText = 'Excelente';
        if (energy < 20) { color = '#ff4c4c'; statusText = 'Agotado'; }
        else if (energy < 40) { color = '#ff9900'; statusText = 'Muy Cansado'; }
        else if (energy < 70) { color = '#FFD700'; statusText = 'Cansado'; }
        
        let starterHtml = '';
        if (career.isStartingOnBench) {
            starterHtml = `
                <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid #FFD700; padding: 10px; border-radius: 6px; text-align: center; margin-bottom: 10px;">
                    <div style="color: #FFD700; font-weight: bold; font-size: 14px;">🟡 SUPLENTE</div>
                    <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">Comenzás el partido en el banco.<br>Entrada estimada: 55'–75'</div>
                </div>
            `;
        } else {
            starterHtml = `
                <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid #00ff88; padding: 10px; border-radius: 6px; text-align: center; margin-bottom: 10px;">
                    <div style="color: #00ff88; font-weight: bold; font-size: 14px;">🟢 TITULAR</div>
                    <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">Vas a comenzar el partido.</div>
                </div>
            `;
        }

        energyStatusContainer.innerHTML = `
            ${starterHtml}
            <div class="hud-energy-container" style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div class="hud-energy-header" style="margin-bottom: 5px;">
                    <span>⚡ ENERGÍA</span>
                    <span class="energy-val" style="color: ${color}">${Math.round(energy)} / 100</span>
                </div>
                <div class="hud-energy-track">
                    <div class="hud-energy-fill" style="width: ${energy}%; background: ${color};"></div>
                </div>
                <div style="text-align: right; font-size: 11px; color: ${color}; margin-top: 4px; font-weight: bold;">${statusText}</div>
            </div>
        `;
    }

    static renderLeagueTable(career) {
        const tbody = document.getElementById('league-table-body');
        const label = document.getElementById('league-matchday-label');
        if (!tbody || !label) return;

        label.textContent = `Jornada ${Math.min(58, career.currentMatchIndex + 1)}/58`;

        let html = '';
        career.standings.forEach((team, index) => {
            const isPlayer = team.name === career.club;
            html += `
                <tr class="${isPlayer ? 'player-team' : ''}">
                    <td style="font-weight:bold; color:${index < 4 ? 'var(--accent)' : 'inherit'};">${index + 1}</td>
                    <td style="text-align:left; font-weight:bold;">${team.name}</td>
                    <td>${team.pj}</td>
                    <td>${team.g}</td>
                    <td>${team.e}</td>
                    <td>${team.p}</td>
                    <td class="hide-mobile">${team.gf}</td>
                    <td class="hide-mobile">${team.gc}</td>
                    <td>${team.dg > 0 ? '+'+team.dg : team.dg}</td>
                    <td style="font-weight:900; color:var(--accent); font-size:14px;">${team.pts}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    static renderCalendar(career) {
        const container = document.getElementById('calendar-list-container');
        if (!container) return;

        let html = '';
        career.fixture.forEach((matchday, index) => {
            const playerMatch = matchday.find(m => m.home === career.club || m.away === career.club);
            if (!playerMatch) return;

            const isCurrent = index === career.currentMatchIndex;
            const isPast = index < career.currentMatchIndex;
            const isHome = playerMatch.home === career.club;
            const opponent = isHome ? playerMatch.away : playerMatch.home;
            
            let statusHtml = '';
            if (isPast) {
                const myScore = isHome ? playerMatch.homeScore : playerMatch.awayScore;
                const oppScore = isHome ? playerMatch.awayScore : playerMatch.homeScore;
                let resultColor = myScore > oppScore ? '#00ff88' : (myScore < oppScore ? '#ff4c4c' : '#FFD700');
                statusHtml = `<span style="color:${resultColor}; font-weight:bold; font-size:16px; letter-spacing:1px;">${myScore} - ${oppScore}</span>`;
            } else if (isCurrent) {
                statusHtml = `<span style="color:var(--accent); font-weight:bold; padding:4px 8px; background:rgba(0,210,255,0.1); border-radius:4px; font-size:11px;">HOY</span>`;
            } else {
                statusHtml = `<span style="color:var(--text-muted); font-size:12px;">Pendiente</span>`;
            }

            html += `
                <div class="calendar-match ${isCurrent ? 'current' : ''}">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-size:10px; color:var(--text-muted); font-weight:bold; text-transform:uppercase;">Fecha ${index + 1}</span>
                        <span style="font-size:15px; font-weight:bold;">${isHome ? '🏠' : '✈️'} ${opponent}</span>
                    </div>
                    <div>${statusHtml}</div>
                </div>
            `;
        });
        container.innerHTML = html;
        
        // Auto scroll al partido actual
        setTimeout(() => {
            const currEl = container.querySelector('.calendar-match.current');
            if(currEl) currEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}