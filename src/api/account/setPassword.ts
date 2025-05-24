import { Express, Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

import { isPassword, Password } from "../../schema.js";
import StatusError from "../../utils/statusError.js";

interface SetPasswordData {
    password: Password;
    passwordNew: Password;
    passwordNewValidate: Password;
}

/**
 * Type guard to check if an object is SetPasswordData.
 * @param {unknown} data
 * @returns {data is SetPasswordData}
 */
function isSetPasswordData(data: unknown): data is SetPasswordData {
    if (typeof data !== "object" || data === null) {
        return false;
    }
    const obj = data as Record<string, unknown>;

    return (
        typeof obj.password === "string" &&
        typeof obj.passwordNew === "string" &&
        typeof obj.passwordNewValidate === "string" &&
        isPassword(obj.password) &&
        isPassword(obj.passwordNew) &&
        isPassword(obj.passwordNewValidate)
    );
}

/**
 * Registers the /api/account/setPassword endpoint to update a user's password.
 * @param {Express} app - The Express application instance.
 * @param {Db} database - The MongoDB database instance.
 */
export default (app: Express, database: Db) => {
    app.post("/api/account/setPassword", async (req: Request, res: Response) => {
        const { loggedInUserId } = req.session;
        if (!loggedInUserId) {
            throw new StatusError(401, "Please authenticate first");
        }

        const data: unknown = req.body;
        if (!isSetPasswordData(data)) {
            throw new StatusError(400, "Invalid data");
        }

        const { password, passwordNew, passwordNewValidate } = data;
        if (passwordNew !== passwordNewValidate) {
            throw new StatusError(400, "New password and confirmation password do not match");
        }

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
            throw new StatusError(401, "Current password is incorrect");
        }

        const newHashedPassword = await bcrypt.hash(passwordNew, 10);
        await database.collection("users").updateOne(
            {
                _id: new ObjectId(loggedInUserId),
            },
            {
                $set: {
                    password: newHashedPassword,
                },
            },
        );

        res.send();
    });
};
