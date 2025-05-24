// src/routes/root.ts
import { Express, Request, Response } from "express";
import { Db, ObjectId, WithId } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import { getUserChallenges } from "../utils/challengeUtils.js";
import { UsersSchema } from "../schema.js";
import getCurrentUser from "../utils/getCurrentUser.js";
import StatusError from "../utils/statusError.js";

/**
 * Registers the / route to render the index page.
 * @param {Express} app - The Express application instance.
 * @param {Db} database - The MongoDB database instance.
 * @param {GoogleGenAI} ai - The GoogleGenAI instance.
 */
export default (app: Express, database: Db, ai: GoogleGenAI) => {
    app.get("/", async (req: Request, res: Response) => {
        if (!req.session.loggedInUserId) {
            res.render("landing");
            return;
        }
        let user: WithId<UsersSchema>;
        try {
            user = await getCurrentUser(database, new ObjectId(req.session.loggedInUserId));
        } catch {
            throw new StatusError(500, "Error loading user");
        }

        const challenges = await getUserChallenges(user, database, ai);

        const [monster] = await database
            .collection("enemies")
            .aggregate([{ $sample: { size: 1 } }])
            .toArray();
        const invIds = user.inventory.map(id => new ObjectId(id));
        const inventoryItems = invIds.length
            ? await database
                .collection("items")
                .find({ _id: { $in: invIds } })
                .project({ name: 1, imageUrl: 1, _id: 0 })
                .toArray()
            : [];

        res.render("home", {
            user,
            challenges,
            monster,
            inventoryItems,
        });
    });
};
