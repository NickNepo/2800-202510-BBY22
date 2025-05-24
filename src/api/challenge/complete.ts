import { Express, Request, Response } from "express";
import { Db, ObjectId, WithId } from "mongodb";
import StatusError from "../../utils/statusError.js";
import { completeChallenge } from "../../utils/challengeUtils.js";
import { GoogleGenAI } from "@google/genai";
import getCurrentUser from "../../utils/getCurrentUser.js";
import { UsersSchema } from "../../schema.js";

// Data taken in by this api endpoint.
interface ChallengeCompleteData {
    challengeId: string;
}

// Type guard for request payload
function isChallengeCompleteData(data: unknown): data is ChallengeCompleteData {
    if (typeof data !== "object" || data === null) {
        return false;
    }
    const obj = data as Record<string, unknown>;
    return typeof obj.challengeId === "string";
}

// Register the /api/challenge/complete route
export default (app: Express, database: Db, ai: GoogleGenAI) => {
    app.post("/api/challenge/complete", async (req: Request, res: Response): Promise<void> => {
        // Authentication check
        if (!req.session.loggedInUserId) {
            throw new StatusError(401, "Please authenticate first");
        }

        // Validate body
        if (!isChallengeCompleteData(req.body)) {
            throw new StatusError(400, "Challenge ID is required");
        }

        // Fetch current user
        let user: WithId<UsersSchema>;
        try {
            user = await getCurrentUser(database, new ObjectId(req.session.loggedInUserId));
        } catch {
            throw new StatusError(500, "Error finding user in database");
        }

        const { challengeId } = req.body;

        // Core challenge-completion logic
        const challengeCompleteData = await completeChallenge(user, database, challengeId, ai);

        // Persist to MongoDB
        await database
            .collection("users")
            .updateOne({ _id: user._id }, { $addToSet: { CompletedTasks: challengeId }, $inc: { CompletedTasksCount: 1 } });

        // Respond with data
        res.json(challengeCompleteData);
    });
};
