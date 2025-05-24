import { Express, Request, Response } from "express";
import { Db } from "mongodb";
import { damageEnemy } from "../../utils/enemyUtils.js";
import StatusError from "../../utils/statusError.js";

// Data passed to the damage api.
interface DamageData {
    damage: number;
}

/**
 * Type guard to check if an object is DamageData.
 * @param {unknown} data - The data to validate.
 * @returns {data is DamageData} - True if the data matches the DamageData structure.
 */
function isDamageData(data: unknown): data is DamageData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;
    return typeof obj.damage === "number" && obj.damage > 0;
}

/**
 * Registers the /api/enemy/damage endpoint to provide the ability to damage the enemy.
 * @param {Express} app - The Express application instance.
 * @param {Db} database - The MongoDB database instance.
 */
export default (app: Express, database: Db) => {
    app.post("/api/enemy/damage", async (req: Request, res: Response) => {
        if (req.session.loggedInUserId === undefined) {
            throw new StatusError(401, "Please authenticate first");
        }
        if (!isDamageData(req.body)) {
            throw new StatusError(400, "Invalid damage value");
        }

        const newEnemyStatus = await damageEnemy(req, database, req.body.damage);
        console.log("enemy damaged");
        res.json(newEnemyStatus);
    });
};
