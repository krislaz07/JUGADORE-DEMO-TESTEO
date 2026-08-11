import { state, generateCalendar, getFamaRank, getFamaRequirement } from './state.js';

export class SeasonManager {
    static processMatchResult() {
        const result = state.lastMatchResult;
        const career = state.career;
        const stats = career.stats;
        const matchStats = result.playerStats;

        if (!result) return;

        stats.matchesPlayed++;
        stats.goals += matchStats.goals;
        stats.assists += matchStats.assists;

        let rating = parseFloat(matchStats.calculateRating());
        stats.matchRatings.push(rating);

        let fameChange = 0;
        if (rating >= 9.0) fameChange = 3;
        else if (rating >= 7.5) fameChange = 1;
        else if (rating <= 4.0) fameChange = -2;
        else if (rating <= 5.0) fameChange = -1;
        if (matchStats.goals >= 3) fameChange += 2;          
        
        career.famaPoints += fameChange;
        let famaLevelsGained = 0;
        while (career.famaPoints >= career.famaToNextLevel) {
            career.famaPoints -= career.famaToNextLevel;
            career.famaLevel++;
            career.famaToNextLevel = getFamaRequirement(career.famaLevel);
            famaLevelsGained++;
        }
        if (career.famaPoints < 0) {
            career.famaPoints = 0;
        }

        let xpBase = 50;
        let xpGoals = matchStats.goals * 30;
        let xpAssists = matchStats.assists * 20;
        let xpActions = matchStats.goodActions * 10;
        let xpPenalties = matchStats.penaltiesSaved * 10; // NUEVO: Bonus de penal
        let xpBonus = (rating >= 8.0) ? 50 : 0;          
        let totalXp = xpBase + xpGoals + xpAssists + xpActions + xpPenalties + xpBonus;
        
        career.xp += totalXp;
        let levelsGained = 0;
        let newDevPoints = 0;
        
        while (career.xp >= career.xpToNextLevel) {
            career.xp -= career.xpToNextLevel;
            career.level++;
            career.xpToNextLevel += 50; 
            career.devPoints += 3;
            newDevPoints += 3;
            levelsGained++;
        }

        this.populatePostMatchScreen({xpBase, xpGoals, xpAssists, xpActions, xpPenalties, xpBonus, totalXp}, fameChange, levelsGained, famaLevelsGained, newDevPoints);

        career.calendar[career.currentMatchIndex].played = true;
        career.calendar[career.currentMatchIndex].result = `${result.myScore} - ${result.opponentScore}`;
        career.currentMatchIndex++;

        if (career.currentMatchIndex >= career.calendar.length) {
            career.season++;
            career.currentMatchIndex = 0;
            career.calendar = generateCalendar(); 
            state.player.personalData.edad += 1;
        }
    }

    static populatePostMatchScreen(xpData, fameChange, levelsGained, famaLevelsGained, newDevPoints) {
        const levelUpAlert = document.getElementById('pm-level-up-alert');
        const devPointsAlert = document.getElementById('pm-dev-points-alert');
        
        if (levelsGained > 0) {
            levelUpAlert.style.display = 'block';
            devPointsAlert.style.display = 'block';
            devPointsAlert.textContent = `Obtuviste +${newDevPoints} Puntos de Desarrollo.`;
        } else {
            levelUpAlert.style.display = 'none';
            devPointsAlert.style.display = 'none';
        }

        const fameEl = document.getElementById('pm-fama-change');
        let fameText = fameChange > 0 ? `+${fameChange} Pts` : fameChange < 0 ? `<span style="color: var(--error);">${fameChange} Pts</span>` : `Sin cambios`;
        if (famaLevelsGained > 0) fameText += `<br><span style="color: #00ff88; font-size: 14px;">¡NUEVO RANGO: ${getFamaRank(state.career.famaLevel)}!</span>`;
        else fameText += ` <span style="color: var(--text-muted); font-size: 12px;">(${getFamaRank(state.career.famaLevel)})</span>`;
        fameEl.innerHTML = fameText;

        let breakdownHTML = `Partido jugado: +${xpData.xpBase}<br>`;
        if (xpData.xpGoals > 0) breakdownHTML += `Goles: +${xpData.xpGoals}<br>`;
        if (xpData.xpAssists > 0) breakdownHTML += `Ocasiones creadas: +${xpData.xpAssists}<br>`;
        if (xpData.xpActions > 0) breakdownHTML += `Acciones exitosas: +${xpData.xpActions}<br>`;
        if (xpData.xpPenalties > 0) breakdownHTML += `🧤 Penales atajados: +${xpData.xpPenalties}<br>`; // NUEVO
        if (xpData.xpBonus > 0) breakdownHTML += `Bono por figura: +${xpData.xpBonus}<br>`;

        document.getElementById('pm-xp-breakdown').innerHTML = breakdownHTML;
        document.getElementById('pm-xp-total').textContent = xpData.totalXp;
    }
}