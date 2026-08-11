export function getFamaRank(level) {
    if (level >= 15) return "Leyenda";
    if (level >= 12) return "Superestrella";
    if (level >= 9) return "Estrella";
    if (level >= 6) return "Figura";
    if (level >= 4) return "Reconocido";
    if (level >= 2) return "Promesa";
    return "Desconocido";
}

export function getFamaRequirement(level) {
    if (level < 5) return 10 + (level * 5); 
    return 30 + ((level - 4) * 10); 
}

export function getDifficultyTag(difficulty) {
    if (difficulty >= 80) return "Candidato al título";
    if (difficulty >= 70) return "Equipo fuerte";
    if (difficulty >= 60) return "Competitivo";
    return "Equipo débil";
}

export function generateCalendar() {
    const opponents = [
        { name: 'Deportivo Ciclón', difficulty: 60 }, { name: 'Atlético Norte', difficulty: 75 },
        { name: 'Unión FC', difficulty: 65 }, { name: 'Real Ciudad', difficulty: 85 },
        { name: 'Sportivo Sur', difficulty: 55 }, { name: 'Estrella Roja', difficulty: 70 },
        { name: 'Titanes', difficulty: 80 }, { name: 'San Martín', difficulty: 78 },
        { name: 'Los Cóndores', difficulty: 90 }
    ];
    let calendar = [];
    let id = 1;
    opponents.forEach(opp => { calendar.push({ id: id++, opponent: opp.name, difficulty: opp.difficulty, played: false, result: null }); });
    const round2 = [...opponents].reverse();
    round2.forEach(opp => { calendar.push({ id: id++, opponent: opp.name, difficulty: opp.difficulty, played: false, result: null }); });
    return calendar;
}

export const DEBUG_MODE = true; 

export const state = {
    player: null,
    originalAttributes: null, 
    currentScreen: 'main-menu',
    lastMatchResult: null,
    
    settings: {
        matchSpeed: 1 
    },
    career: {
        club: 'Club Atlético Inicial',
        season: 1,
        currentMatchIndex: 0,
        
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        devPoints: 0, 
        
        famaLevel: 0,
        famaPoints: 0,
        famaToNextLevel: 10,
        stats: {
            matchesPlayed: 0, goals: 0, assists: 0, matchRatings: [] 
        },
        calendar: generateCalendar()
    }
};

export function normalizePlayerPosition(player) {
    if (!player || !player.personalData) return;
    
    if (player.personalData.posicionBase) return;

    const oldPos = player.personalData.posicion;
    let base = "Delantero";
    let perfil = "Centro";

    switch(oldPos) {
        case "Arquero": base = "Arquero"; perfil = "Arquero"; break;
        case "Defensor Central": base = "Defensa"; perfil = "Central"; break;
        case "Lateral Derecho": case "Lateral Izquierdo": base = "Defensa"; perfil = "Lateral"; break;
        case "Mediocampista Defensivo": base = "Mediocampista"; perfil = "Defensivo"; break;
        case "Mediocampista Central": case "Mediocampista": base = "Mediocampista"; perfil = "Central"; break;
        case "Mediocampista Ofensivo": base = "Mediocampista"; perfil = "Ofensivo"; break;
        case "Extremo Derecho": case "Extremo Izquierdo": base = "Delantero"; perfil = "Extremo"; break;
        case "Delantero": base = "Delantero"; perfil = "Centro"; break;
    }

    player.personalData.posicionBase = base;
    player.personalData.perfil = perfil;
    player.personalData.posicion = base;
}