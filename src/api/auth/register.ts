import { Express, Request, Response } from "express";
import { Db } from "mongodb";

import * as hash from "../../utils/hash.js";
import { isUsername, isEmail, isPassword, Username, Email, Password, UsersSchema } from "../../schema.js";
import StatusError from "../../utils/statusError.js";

// Data required for registration: username, email, and password.
interface RegisterData {
    username: Username;
    email: Email;
    password: Password;
}

/**
 * Type guard to check if an object is RegisterData.
 * @param {unknown} data - The data to validate.
 * @returns {data is RegisterData} - True if the data matches the RegisterData structure.
 */
function isRegisterData(data: unknown): data is RegisterData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;
    return (
        typeof obj.username === "string" &&
        typeof obj.email === "string" &&
        typeof obj.password === "string" &&
        isUsername(obj.username) &&
        isEmail(obj.email) &&
        isPassword(obj.password)
    );
}

/**
 * Registers the /api/register endpoint for user registration.
 * @param {Express} app - The Express application instance.
 * @param {Db} database - The MongoDB database instance.
 */
export default (app: Express, database: Db) => {
    /**
     * Checks if the given email is not already used by another user.
     * @param {Email} email - The email to check.
     * @returns {Promise<boolean>} - True if the email is not used, false otherwise.
     */
    async function emailNotUsed(email: Email): Promise<boolean> {
        const user = await database.collection("users").findOne({ email });
        return user === null;
    }

    app.post("/api/auth/register", async (req: Request, res: Response) => {
        if (!isRegisterData(req.body)) {
            throw new StatusError(400, "Invalid data");
        }
        const { username, email, password } = req.body;
        if (await emailNotUsed(email)) {
            const passwordHash = await hash.hash(password);
            await database.collection("users").insertOne({
                username,
                email,
                passwordHash,
                lastStreakDate: null,
                enemyHealth: 100,
                points: 0,
                enemyHealthModifier: 0,
                inventory: [],
                challengeStatuses: [],
            } satisfies UsersSchema);
            res.send();
        } else {
            throw new StatusError(400, "Email already in use");
        }
    });
};
