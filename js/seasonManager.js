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

        let rating = 5.0; 
        rating += (matchStats.goals * 1.5);
        rating += (matchStats.assists * 1.0);
        rating += (matchStats.goodActions * 0.3);
        rating -= (matchStats.badActions * 0.4);
        rating = Math.max(1.0, Math.min(10.0, rating));
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
        let xpBonus = (rating >= 8.0) ? 50 : 0; 
        
        let totalXp = xpBase + xpGoals + xpAssists + xpActions + xpBonus;
        career.xp += totalXp;

        let levelsGained = 0;
        let newDevPoints = 0;
        while (career.xp >= career.xpToNextLevel) {
            career.xp -= career.xpToNextLevel;
            career.level++;
            career.xpToNextLevel += 50; 
            career.devPoints += 3; // NUEVO: +3 puntos de desarrollo
            newDevPoints += 3;
            levelsGained++;
        }

        this.populatePostMatchScreen(result, matchStats, rating, {xpBase, xpGoals, xpAssists, xpActions, xpBonus, totalXp}, fameChange, levelsGained, famaLevelsGained, newDevPoints);

        career.calendar[career.currentMatchIndex].played = true;
        career.calendar[career.currentMatchIndex].result = `${result.myScore} - ${result.opponentScore}`;
        career.currentMatchIndex++;

        // NUEVO: Final de Temporada (Subir edad)
        if (career.currentMatchIndex >= career.calendar.length) {
            career.season++;
            career.currentMatchIndex = 0;
            career.calendar = generateCalendar(); 
            state.player.personalData.edad += 1;
        }
    }

    static populatePostMatchScreen(result, matchStats, rating, xpData, fameChange, levelsGained, famaLevelsGained, newDevPoints) {
        document.getElementById('pm-scoreboard').textContent = `${state.career.club} ${result.myScore} - ${result.opponentScore} ${result.opponent}`;
        document.getElementById('pm-rating').textContent = rating.toFixed(1);
        
        let perfText = "Desempeño Regular";
        if (rating >= 8.5) perfText = "¡Actuación estelar!";
        else if (rating >= 7.0) perfText = "Buen partido";
        else if (rating <= 4.0) perfText = "Para el olvido...";
        document.getElementById('pm-performance-text').textContent = perfText;

        const fameEl = document.getElementById('pm-fama-change');
        if (fameChange > 0) fameEl.innerHTML = `+${fameChange} Pts <span style="color: var(--text-muted); font-size: 12px;">(${getFamaRank(state.career.famaLevel)})</span>`;
        else if (fameChange < 0) fameEl.innerHTML = `<span style="color: var(--error);">${fameChange} Pts</span> <span style="color: var(--text-muted); font-size: 12px;">(${getFamaRank(state.career.famaLevel)})</span>`;
        else fameEl.innerHTML = `Sin cambios <span style="color: var(--text-muted); font-size: 12px;">(${getFamaRank(state.career.famaLevel)})</span>`;

        let breakdownHTML = `Partido jugado: +${xpData.xpBase}<br>`;
        if (xpData.xpGoals > 0) breakdownHTML += `Goles: +${xpData.xpGoals}<br>`;
        if (xpData.xpAssists > 0) breakdownHTML += `Asistencias: +${xpData.xpAssists}<br>`;
        if (xpData.xpActions > 0) breakdownHTML += `Acciones exitosas: +${xpData.xpActions}<br>`;
        if (xpData.xpBonus > 0) breakdownHTML += `Bono por figura: +${xpData.xpBonus}<br>`;
        
        if (levelsGained > 0) {
            breakdownHTML += `<br><strong style="color: var(--accent); font-size: 14px;">¡SUBISTE AL NIVEL ${state.career.level}!</strong><br>`;
            breakdownHTML += `<span style="color: #FFD700; font-size: 13px;">Obtuviste +${newDevPoints} Puntos de Desarrollo</span><br>`;
        }
        
        if (famaLevelsGained > 0) {
            breakdownHTML += `<strong style="color: #FFD700; font-size: 14px;">¡SUBISTE A FAMA NIVEL ${state.career.famaLevel}!</strong><br>`;
        }

        document.getElementById('pm-xp-breakdown').innerHTML = breakdownHTML;
        document.getElementById('pm-xp-total').textContent = xpData.totalXp;

        document.getElementById('pm-stat-goles').textContent = matchStats.goals;
        document.getElementById('pm-stat-asist').textContent = matchStats.assists;
        document.getElementById('pm-stat-tiros').textContent = `${matchStats.shots} (${matchStats.shotsOnTarget})`;
        document.getElementById('pm-stat-pases').textContent = `${matchStats.passesAttempted} (${matchStats.passesCompleted})`;
        document.getElementById('pm-stat-regates').textContent = `${matchStats.dribblesAttempted} (${matchStats.dribblesCompleted})`;
        document.getElementById('pm-stat-entradas').textContent = `${matchStats.tacklesAttempted} (${matchStats.tacklesWon})`;
        document.getElementById('pm-stat-buenas').textContent = matchStats.goodActions;
        document.getElementById('pm-stat-malas').textContent = matchStats.badActions;
    }
}