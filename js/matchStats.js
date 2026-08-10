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
    }

    add(stat, amount = 1) {
        if (this[stat] !== undefined) {
            this[stat] += amount;
        }
    }

    calculateRating() {
        // Fórmula antigua preservada tal cual, calculada al final
        let rating = 5.0 + (this.goals * 1.5) + (this.assists * 1.0) + (this.goodActions * 0.3) - (this.badActions * 0.4);
        return Math.max(1.0, Math.min(10.0, rating)).toFixed(1);
    }
}

export const currentMatchStats = new MatchStats();