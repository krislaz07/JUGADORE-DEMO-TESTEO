import { ShootingMinigame } from './shooting.js';
import { DribblingMinigame } from './dribbling.js';
import { PassingMinigame } from './passing.js';

export class MinigameManager {
    static start(minigameType, actionObj, playerAttributes, difficulty, callback) {
        switch (minigameType) {
            case 'shooting':
                ShootingMinigame.start(actionObj, playerAttributes, difficulty, callback);
                return true;
            case 'dribbling':
                DribblingMinigame.start(actionObj, playerAttributes, difficulty, callback);
                return true;
            case 'passing':
                PassingMinigame.start(actionObj, playerAttributes, difficulty, callback);
                return true;
            default:
                console.error(`[ERROR DEV] Minijuego no registrado o inexistente: ${minigameType}`);
                return false; 
        }
    }
}