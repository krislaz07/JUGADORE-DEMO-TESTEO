import { state, getFamaRank, getDifficultyTag } from './state.js';

export class CareerManager {
    static updateHub() {
        const player = state.player;
        const career = state.career;

        if (!player) return;

        document.getElementById('hub-ovr').textContent = player.overall;
        document.getElementById('hub-pos').textContent = player.personalData.posicion;
        document.getElementById('hub-name').textContent = `${player.personalData.nombre} ${player.personalData.apellido} (${player.personalData.edad} años)`;
        document.getElementById('hub-club').textContent = career.club;

        document.getElementById('hub-level').textContent = career.level;
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

        const nextMatch = career.calendar[career.currentMatchIndex];
        const btnPlayMatch = document.getElementById('btn-play-match');
        
        if (nextMatch) {
            // NUEVO: Mostrar el tag de dificultad en el Hub
            const diffTag = getDifficultyTag(nextMatch.difficulty);
            document.getElementById('hub-next-match').innerHTML = `${nextMatch.opponent}<br><span style="font-size: 14px; color: var(--text-muted); font-weight: normal;">${diffTag}</span>`;
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
    }
}