import { Express, Request, Response } from "express";
import { Db } from "mongodb";
import StatusError from "../../utils/statusError.js";
import { getUserChallenges } from "../../utils/challengeUtils.js";
import { GoogleGenAI } from "@google/genai";

/**
 * Registers the /api/challenge/getAll endpoint to provide the daily challenges.
 * @param {Express} app - The Express application instance.
 * @param {Db} database - The MongoDB database instance.
 * @param {GoogleGenAI} ai - The Google GenAI instance.
 */
export default (app: Express, database: Db, ai: GoogleGenAI) => {
    app.get("/api/challenge/getAll", async (req: Request, res: Response) => {
        if (req.session.loggedInUserId === undefined) {
            throw new StatusError(401, "Please authenticate first");
        }

        const userChallenges = await getUserChallenges(req, database, ai);
        res.json(userChallenges);
    });
};
