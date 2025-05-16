import { Express, Request, Response } from "express";
import { Db } from "mongodb";
import StatusError from "../../utils/statusError.js";
import { completeChallenge } from "../../utils/challengeUtils.js";
import { GoogleGenAI } from "@google/genai";

// Data taken in by this api endpoint.
interface ChallengeCompleteData {
    challengeId: string;
}

/**
 * Type guard to check if an object is ChallengeCompleteData.
 * @param {unknown} data - The data to validate.
 * @returns {data is ChallengeCompleteData} - True if the data matches the ChallengeCompleteData structure.
 */
function isChallengeCompleteData(data: unknown): data is ChallengeCompleteData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;
    return typeof obj.challengeId === "string";
}

/**
 * Registers the /api/challenge/complete endpoint to allow the user to complete challenges.
 * @param {Express} app - The Express application instance.
 * @param {Db} database - The MongoDB database instance.
 * @param {GoogleGenAI} ai - The Google GenAI instance.
 */
export default (app: Express, database: Db, ai: GoogleGenAI) => {
    app.post("/api/challenge/complete", async (req: Request, res: Response) => {
        if (req.session.loggedInUserId === undefined) {
            throw new StatusError(401, "Please authenticate first");
        }
        if (!isChallengeCompleteData(req.body)) {
            throw new StatusError(400, "Challenge ID is required");
        }

        const { challengeId } = req.body;

        const challengeCompleteData = await completeChallenge(req, database, challengeId, ai);
        res.json(challengeCompleteData);
    });
};
