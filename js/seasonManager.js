import { state, getFamaRank, getFamaRequirement } from './state.js';

export class SeasonManager {
    static TEAMS = [
        { name: 'Vélez', difficulty: 85 }, { name: 'Instituto', difficulty: 70 },
        { name: 'Independiente', difficulty: 80 }, { name: 'Newell\'s', difficulty: 75 },
        { name: 'Defensa y Justicia', difficulty: 75 }, { name: 'Estudiantes', difficulty: 80 },
        { name: 'Riestra', difficulty: 60 }, { name: 'Gimnasia (M)', difficulty: 65 },
        { name: 'Lanús', difficulty: 78 }, { name: 'Boca Jrs.', difficulty: 90 },
        { name: 'Central Córdoba', difficulty: 65 }, { name: 'San Lorenzo', difficulty: 80 },
        { name: 'Platense', difficulty: 70 }, { name: 'Unión', difficulty: 72 },
        { name: 'Talleres', difficulty: 85 }, { name: 'Argentinos Jr.', difficulty: 78 },
        { name: 'Belgrano', difficulty: 75 }, { name: 'Central', difficulty: 75 },
        { name: 'Sarmiento', difficulty: 62 }, { name: 'Barracas', difficulty: 65 },
        { name: 'Gimnasia', difficulty: 70 }, { name: 'Atl. Tucumán', difficulty: 72 },
        { name: 'Tigre', difficulty: 68 }, { name: 'Huracán', difficulty: 78 },
        { name: 'Independiente Riv.', difficulty: 65 }, { name: 'Banfield', difficulty: 68 },
        { name: 'Racing', difficulty: 88 }, { name: 'Estudiantes RC', difficulty: 60 },
        { name: 'River', difficulty: 92 }, { name: 'Aldosivi', difficulty: 62 }
    ];

    static initializeSeason() {
        // 1. Asignar club inicial aleatorio al jugador
        const randomIndex = Math.floor(Math.random() * this.TEAMS.length);
        state.career.club = this.TEAMS[randomIndex].name;
        state.career.clubDifficulty = this.TEAMS[randomIndex].difficulty;
        
        // 2. Inicializar la tabla de posiciones con los 30 equipos
        state.career.standings = this.TEAMS.map(t => ({
            name: t.name, difficulty: t.difficulty,
            pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0
        }));

        // 3. Generar el fixture completo (58 jornadas, localía perfecta)
        state.career.fixture = this.generateFixture();
        state.career.currentMatchIndex = 0;
        state.career.season = 1;
    }

    static generateFixture() {
        const teams = [...this.TEAMS];
        const numTeams = teams.length;
        const fixture = [];
        const teamIndices = Array.from(Array(numTeams).keys());

        // PRIMERA VUELTA (Jornadas 1 a 29) - Método de emparejamiento circular
        for (let round = 0; round < numTeams - 1; round++) {
            const matchday = [];
            for (let i = 0; i < numTeams / 2; i++) {
                const homeTeam = teams[teamIndices[i]];
                const awayTeam = teams[teamIndices[numTeams - 1 - i]];
                
                // Alternar localía para el equipo ancla (índice 0)
                if (i === 0 && round % 2 === 1) {
                    matchday.push({ home: awayTeam.name, away: homeTeam.name, homeDiff: awayTeam.difficulty, awayDiff: homeTeam.difficulty, played: false, homeScore: 0, awayScore: 0 });
                } else {
                    matchday.push({ home: homeTeam.name, away: awayTeam.name, homeDiff: homeTeam.difficulty, awayDiff: awayTeam.difficulty, played: false, homeScore: 0, awayScore: 0 });
                }
            }
            fixture.push(matchday);
            // Rotar array (manteniendo fijo el elemento 0)
            teamIndices.splice(1, 0, teamIndices.pop());
        }

        // SEGUNDA VUELTA (Jornadas 30 a 58) - Se invierten las localías de la primera vuelta
        for (let round = 0; round < numTeams - 1; round++) {
            const matchday = fixture[round].map(m => ({
                home: m.away, away: m.home, homeDiff: m.awayDiff, awayDiff: m.homeDiff, played: false, homeScore: 0, awayScore: 0
            }));
            fixture.push(matchday);
        }

        return fixture;
    }

    static processMatchResult() {
        const result = state.lastMatchResult;
        const career = state.career;
        const stats = career.stats;
        const matchStats = result.playerStats;

        if (!result) return;

        // --- CÁLCULOS PERSONALES (XP, Fama, Rating) ---
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
        if (career.famaPoints < 0) career.famaPoints = 0;

        let xpBase = 50;
        let xpGoals = matchStats.goals * 30;
        let xpAssists = matchStats.assists * 20;
        let xpActions = matchStats.goodActions * 10;
        let xpPenalties = matchStats.penaltiesSaved * 10; 
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

        // --- LÓGICA DE COMPETICIÓN (Jornada y Simulación) ---
        const currentMatchday = career.fixture[career.currentMatchIndex];
        
        // 1. Encontrar y registrar el partido del jugador en el fixture real
        const playerMatch = currentMatchday.find(m => m.home === career.club || m.away === career.club);
        if (playerMatch) {
            playerMatch.played = true;
            if (playerMatch.home === career.club) {
                playerMatch.homeScore = result.myScore;
                playerMatch.awayScore = result.opponentScore;
            } else {
                playerMatch.homeScore = result.opponentScore;
                playerMatch.awayScore = result.myScore;
            }
            this.updateTeamStandings(playerMatch);
        }

        // 2. Simular el resto de los 14 partidos de la jornada
        currentMatchday.forEach(match => {
            if (!match.played) {
                this.simulateMatch(match);
                this.updateTeamStandings(match);
            }
        });

        // 3. Ordenar Tabla de Posiciones
        this.sortStandings();

        // 4. Avanzar jornada
        career.currentMatchIndex++;

        // Si llegamos a 58 fechas, queda ahí por ahora (sin pasar de temporada)
        if (career.currentMatchIndex >= career.fixture.length) {
            state.player.personalData.edad += 1;
        }
    }

    static simulateScore(strengthDifference) {
        // Base probabilística lógica. No hace partidos 8-0 a menos que sea un desastre.
        const r = Math.random();
        let goals = 0;
        if (r > 0.96) goals = 4;
        else if (r > 0.85) goals = 3;
        else if (r > 0.50) goals = 2;
        else if (r > 0.20) goals = 1;

        let mod = Math.floor(strengthDifference / 10); 
        goals += mod;
        return Math.max(0, goals);
    }

    static simulateMatch(match) {
        // Ventaja de +5 por localía para hacerlo más realista
        const homePower = match.homeDiff + 5;
        const awayPower = match.awayDiff;
        
        match.homeScore = this.simulateScore(homePower - awayPower);
        match.awayScore = this.simulateScore(awayPower - homePower);
        match.played = true;
    }

    static updateTeamStandings(match) {
        const homeStat = state.career.standings.find(s => s.name === match.home);
        const awayStat = state.career.standings.find(s => s.name === match.away);

        homeStat.pj++; awayStat.pj++;
        homeStat.gf += match.homeScore; awayStat.gf += match.awayScore;
        homeStat.gc += match.awayScore; awayStat.gc += match.homeScore;
        homeStat.dg = homeStat.gf - homeStat.gc;
        awayStat.dg = awayStat.gf - awayStat.gc;

        if (match.homeScore > match.awayScore) {
            homeStat.g++; homeStat.pts += 3;
            awayStat.p++;
        } else if (match.homeScore < match.awayScore) {
            awayStat.g++; awayStat.pts += 3;
            homeStat.p++;
        } else {
            homeStat.e++; awayStat.e++;
            homeStat.pts += 1; awayStat.pts += 1;
        }
    }

    static sortStandings() {
        state.career.standings.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts; // 1. Puntos
            if (b.dg !== a.dg) return b.dg - a.dg;     // 2. Diferencia de gol
            return b.gf - a.gf;                        // 3. Goles a favor
        });
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
        if (xpData.xpPenalties > 0) breakdownHTML += `🧤 Penales atajados: +${xpData.xpPenalties}<br>`; 
        if (xpData.xpBonus > 0) breakdownHTML += `Bono por figura: +${xpData.xpBonus}<br>`;

        document.getElementById('pm-xp-breakdown').innerHTML = breakdownHTML;
        document.getElementById('pm-xp-total').textContent = xpData.totalXp;
    }
}