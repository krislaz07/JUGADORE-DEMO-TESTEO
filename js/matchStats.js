export class MatchStats {
    constructor() {
        this.reset();
    }

    reset() {
        this.goals = 0;
        this.assists = 0; 
        this.shots = 0;
        this.shotsOnTarget = 0;
        this.passesAttempted = 0;
        this.passesCompleted = 0;
        this.dribblesAttempted = 0;
        this.dribblesCompleted = 0;
        this.tacklesAttempted = 0;
        this.tacklesWon = 0;
        this.goodActions = 0;
        this.badActions = 0;
        this.penaltiesSaved = 0; // NUEVO: Registro de penales atajados
    }

    add(stat, amount = 1) {
        if (this[stat] !== undefined) {
            this[stat] += amount;
        }
    }

    calculateRating() {
        let rating = 6.0 
            + (this.goals * 1.0) 
            + (this.assists * 0.8) 
            + (this.goodActions * 0.2) 
            - (this.badActions * 0.1);
        
        return Math.max(1.0, Math.min(10.0, rating)).toFixed(1);
    }
}

export const currentMatchStats = new MatchStats();