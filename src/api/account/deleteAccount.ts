import { Express, Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

import { isPassword, Password } from "../../schema.js";
import StatusError from "../../utils/statusError.js";

interface DeleteAccountData {
    password: Password;
}

/**
 * Type guard to check if an object is DeleteAccountData.
 * @param {unknown} data
 * @returns {data is SetPasswordData}
 */
function isDeleteAccountData(data: unknown): data is DeleteAccountData {
    if (typeof data !== "object" || data === null) {
        return false;
    }
    const obj = data as Record<string, unknown>;

    return typeof obj.password === "string" && isPassword(obj.password);
}

/**
 * Registers the /api/account/deleteAccount endpoint to delete a user's account.
 * @param {Express} app - The Express application instance.
 * @param {Db} database - The MongoDB database instance.
 */
export default (app: Express, database: Db) => {
    app.post("/api/account/deleteAccount", async (req: Request, res: Response) => {
        const { loggedInUserId } = req.session;
        if (!loggedInUserId) {
            throw new StatusError(401, "Please authenticate first");
        }

        const data: unknown = req.body;
        if (!isDeleteAccountData(data)) {
            throw new StatusError(400, "Invalid data");
        }

        const { password } = data;

        // Fetch only the hashed password field
        const user = await database.collection<{ password: string }>("users").findOne(
            {
                _id: new ObjectId(loggedInUserId),
            },
            {
                projection: {
                    password: 1,
                },
            },
        );

        if (!user) {
            throw new StatusError(404, "User not found");
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            throw new StatusError(401, "Password is incorrect");
        }

        await database.collection("users").deleteOne({
            _id: new ObjectId(loggedInUserId),
        });

        // destroy the session by clearing the userID
        req.session.loggedInUserId = undefined;

        res.send();
    });
};
