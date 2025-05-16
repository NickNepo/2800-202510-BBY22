import { Db, ObjectId, WithId } from "mongodb";
import { Request } from "express";
import { isUsersSchema, ChallengeStatus } from "../schema.js";
import StatusError from "./statusError.js";
import { GoogleGenAI } from "@google/genai";

/*
 * Offset for Pacific Standard Time (PST) in milliseconds (UTC-8).
 */
const PST_OFFSET = -8 * 60 * 60 * 1000;

/*
 * The number of daily challenges to maintain in the database.
 */
const NUM_CHALLENGES = 3;

/*
 * Interface for the challenge information.
 */
interface ChallengeInfo {
    // The name of the challenge.
    name: string;
    // The description of the challenge.
    description: string;
    // The number of points awarded for completing the challenge.
    pointReward: number;
    // The end time of the challenge.
    endTime: Date;
}

/*
 * Interface for the user's challenge information, extending ChallengeInfo.
 */
interface UserChallengeInfo extends ChallengeInfo {
    // Whether the user has completed the challenge.
    completed: boolean;
}

interface ChallengeCompleteData {
    // The user's new points balance after completing the challenge.
    points: number;
}

/**
 * Type guard to check if an object is of type ChallengeInfo.
 * @param data - The object to check.
 * @returns {obj is ChallengeInfo} True if the object is a ChallengeInfo.
 */
function isChallengeInfo(data: unknown): data is ChallengeInfo {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;
    return (
        typeof obj.name === "string" &&
        typeof obj.description === "string" &&
        typeof obj.pointReward === "number" &&
        obj.endTime instanceof Date
    );
}

/**
 * Gets the current time in Pacific Standard Time (PST).
 * @returns {Date} The current date and time in PST.
 */
function getPstTimeNow(): Date {
    return new Date(Date.now() + PST_OFFSET);
}

/**
 * Gets a challenge from the database by its ObjectId.
 * @param {Db} database - The MongoDB database instance.
 * @param {ObjectId} challengeId - The ObjectId of the challenge to delete.
 * @returns {Promise<ChallengeInfo>} The challenge information.
 * @throws Will throw an error if the challenge is not found, or if the data from the database is invalid.
 */
async function getChallenge(database: Db, challengeId: ObjectId): Promise<ChallengeInfo> {
    const challenge = await database.collection("challenges").findOne({ _id: challengeId });
    if (challenge === null) {
        throw new Error("Challenge not found");
    }
    if (!isChallengeInfo(challenge)) {
        throw new Error("Challenge data is not valid");
    }
    return challenge;
}

/**
 * Deletes a challenge from the database by its ObjectId.
 * @param {Db} database - The MongoDB database instance.
 * @param {ObjectId} challengeId - The ObjectId of the challenge to delete.
 * @throws Will throw an error if the challenge is not found.
 */
async function deleteChallenge(database: Db, challengeId: ObjectId): Promise<void> {
    const result = await database.collection("challenges").deleteOne({ _id: challengeId });
    if (result.deletedCount === 0) {
        throw new Error("Challenge not found");
    }
}

/**
 * Generates a specified number of challenges using GoogleGenAI.
 * @param {number} amount - The number of challenges to generate.
 * @param {GoogleGenAI} ai - The AI instance used to generate challenges.
 * @returns {Promixe<ChallengeInfo[]>} The generated challenges.
 */
async function generateChallenges(amount: number, ai: GoogleGenAI): Promise<ChallengeInfo[]> {
    const pstTimeNow = getPstTimeNow();
    // Calculate the start of tomorrow in PST
    const startOfTomorrowPst = new Date(
        Date.UTC(pstTimeNow.getUTCFullYear(), pstTimeNow.getUTCMonth(), pstTimeNow.getUTCDate() + 1, 0, 0, 0, 0),
    );

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Generate JSON for ${amount.toString()} daily challenge(s) for an app designed to help introverts get more comfortable. Each challenge should have a name, description, point reward. Point reward should be between 10 and 99. Point rewards should scale with difficulty. The challenges should be fun and engaging. Do not use markdown. The JSON should be in the following format: [{ "name": "Say Hi To Someone 👋", "description": "Go out and say hi to someone new!", "pointReward": 24 }]`,
    });

    if (response.text === undefined) {
        throw new Error("AI response is undefined");
    }
    const jsonArrStart = response.text.indexOf("[");
    const jsonArrEnd = response.text.indexOf("]");
    const jsonString = response.text.substring(jsonArrStart, jsonArrEnd + 1);
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonString);
    } catch (_) {
        throw new Error("Failed to parse AI response");
    }
    if (!Array.isArray(parsed)) {
        throw new Error("AI response is not an array");
    }
    if (parsed.length !== amount) {
        throw new Error("AI response does not match requested number of challenges");
    }

    parsed.forEach((challenge: ChallengeInfo) => {
        challenge.endTime = startOfTomorrowPst;
    });
    if (!parsed.every(isChallengeInfo)) {
        throw new Error("AI response is not valid ChallengeInfo");
    }
    return parsed;
}

/**
 * Creates a specified number of new challenges and inserts them into the database.
 * @param {Db} database - The MongoDB database instance.
 * @param {number} amount - The number of challenges to create.
 * @param {GoogleGenAI} ai - The AI instance used to generate challenges.
 * @returns {Promise<WithId<ChallengeInfo>[]>} The created challenges with their generated ObjectIds.
 */
async function createChallenges(database: Db, amount: number, ai: GoogleGenAI): Promise<WithId<ChallengeInfo>[]> {
    const challenges = await generateChallenges(amount, ai);

    const insertResult = await database.collection("challenges").insertMany(challenges);
    // Attach the generated _id to each challenge
    const insertedIds = Object.values(insertResult.insertedIds);
    const challengesWithIds = challenges.map((challenge, idx) => ({
        ...challenge,
        _id: insertedIds[idx],
    }));
    return challengesWithIds;
}

/**
 * Retrieves all valid daily challenges from the database, removes expired or invalid ones, and creates new ones if needed.
 * @param {Db} database - The MongoDB database instance.
 * @param {GoogleGenAI} ai - The AI instance used to generate challenges.
 * @returns {Promise<WithId<ChallengeInfo>[]>} The info about all of the current challenges.
 */
async function getAllChallenges(database: Db, ai: GoogleGenAI): Promise<WithId<ChallengeInfo>[]> {
    const challenges = await database.collection("challenges").find().toArray();

    // Validate and filter challenges, deleting any that are invalid
    const challengeInfos: WithId<ChallengeInfo>[] = challenges
        .map(challenge => {
            if (!isChallengeInfo(challenge)) {
                void deleteChallenge(database, challenge._id);
                return null;
            }
            return challenge;
        })
        .filter(challengeInfo => challengeInfo !== null);

    // Remove challenges that have expired
    const remainingChallengeInfos = challengeInfos.filter(challengeInfo => {
        // If the endTime has been passed, delete the challenge
        if (challengeInfo.endTime.getTime() < getPstTimeNow().getTime()) {
            void deleteChallenge(database, challengeInfo._id);
            return false;
        }
        return true;
    });

    // If there are less than NUM_CHALLENGES challenges, create new ones
    let newChallenges: WithId<ChallengeInfo>[] = [];
    if (remainingChallengeInfos.length < NUM_CHALLENGES) {
        try {
            newChallenges = await createChallenges(database, NUM_CHALLENGES - remainingChallengeInfos.length, ai);
        } catch (err) {
            console.error("Error creating new challenges:", err);
            newChallenges = [];
        }
    }

    return remainingChallengeInfos.concat(newChallenges);
}

/**
 * Updates the user's challenge completion statuses to match the current set of challenges.
 * Removes statuses for challenges that no longer exist and adds statuses for new challenges.
 * @param {Db} database - The MongoDB database instance.
 * @param {string} userId - The user's ObjectId as a string.
 * @param {ChallengeStatus[]} challengeStatuses - The user's current challenge statuses.
 * @param {WithId<ChallengeInfo>[]} challenges - The current set of challenges.
 * @returns {Promise<ChallengeStatus[]>} The updated challenge statuses.
 */
async function updateUserChallengeStatuses(
    database: Db,
    userId: string,
    challengeStatuses: ChallengeStatus[],
    challenges: WithId<ChallengeInfo>[],
): Promise<ChallengeStatus[]> {
    let challengeStatusesModified = false;

    // Filter out any challenge completions for challenges that no longer exist
    const challengeIds = challenges.map(challenge => challenge._id.toHexString());
    challengeStatuses = challengeStatuses.filter(challengeStatus => {
        if (!challengeIds.includes(challengeStatus.challengeId)) {
            challengeStatusesModified = true;
            return false;
        }
        return true;
    });

    const newChallengeStatuses: ChallengeStatus[] = [];
    // Add any new challenges to the user's challenge completions
    const challengeStatusIds = challengeStatuses.map(challengeStatus => challengeStatus.challengeId);
    challenges.forEach(challenge => {
        if (!challengeStatusIds.includes(challenge._id.toHexString())) {
            newChallengeStatuses.push({
                challengeId: challenge._id.toHexString(),
                completed: false,
            });
            challengeStatusesModified = true;
        }
    });

    challengeStatuses = challengeStatuses.concat(newChallengeStatuses);

    // Update the user's challenge completions in the database if modified
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (challengeStatusesModified) {
        await database.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: { challengeStatuses } });
    }

    return challengeStatuses;
}

/**
 * Retrieves the challenge information for the logged-in user from the database.
 * Updates the user's challenge statuses to match the current set of challenges.
 * @param {Request} req - The Express request object.
 * @param {Db} database - The MongoDB database instance.
 * @param {GoogleGenAI} ai - The AI instance used to generate challenges.
 * @returns {Promise<UserChallengeInfo[]>} The info about all of the user's challenges.
 * @throws Will throw an error if the user is not authenticated, not found, or has invalid data.
 */
async function getUserChallenges(req: Request, database: Db, ai: GoogleGenAI): Promise<UserChallengeInfo[]> {
    if (req.session.loggedInUserId === undefined) {
        throw new Error("User must authenticate first");
    }

    const user = await database.collection("users").findOne({
        _id: new ObjectId(req.session.loggedInUserId),
    });

    // Ensure user is valid
    if (user === null) {
        throw new Error("User not found");
    }
    if (!isUsersSchema(user)) {
        throw new Error("User data is not valid");
    }

    const challenges = await getAllChallenges(database, ai);

    // This function call will update user.challengeStatuses if necessary
    // This includes removing any completed challenges that no longer exist and adding any new challenges
    user.challengeStatuses = await updateUserChallengeStatuses(database, req.session.loggedInUserId, user.challengeStatuses, challenges);

    const userChallenges = user.challengeStatuses.map((challengeStatus, index: number): UserChallengeInfo => {
        const challenge = challenges[index];
        return {
            ...challenge,
            completed: challengeStatus.completed,
        };
    });
    return userChallenges;
}

/**
 * Completes a challenge for the logged-in user and updates their challenge statuses.
 * @param {Request} req - The Express request object.
 * @param {Db} database - The MongoDB database instance.
 * @param {string} challengeId - The ID of the challenge to complete.
 * @param {GoogleGenAI} ai - The AI instance used to generate challenges.
 * @returns {Promise<ChallengeCompleteData>} An promise indicating the completion of the operation, and resolves to ChallengeCompleteData.
 * @throws Will throw an error if the user is not authenticated, not found, has invalid data, or if there is not a challenge with the given ID.
 */
async function completeChallenge(req: Request, database: Db, challengeId: string, ai: GoogleGenAI): Promise<ChallengeCompleteData> {
    if (req.session.loggedInUserId === undefined) {
        throw new Error("User must authenticate first");
    }

    const user = await database.collection("users").findOne({
        _id: new ObjectId(req.session.loggedInUserId),
    });

    // Ensure user is valid
    if (user === null) {
        throw new Error("User not found");
    }
    if (!isUsersSchema(user)) {
        throw new Error("User data is not valid");
    }

    let status = user.challengeStatuses.find(status => status.challengeId === challengeId);
    if (status === undefined) {
        const challenges = await getAllChallenges(database, ai);
        user.challengeStatuses = await updateUserChallengeStatuses(
            database,
            req.session.loggedInUserId,
            user.challengeStatuses,
            challenges,
        );
        status = user.challengeStatuses.find(status => status.challengeId === challengeId);
        if (status === undefined) {
            throw new StatusError(400, "No challenge with the given ID found");
        }
    }

    if (status.completed) {
        throw new StatusError(400, "Challenge already completed");
    }

    const challenge = await getChallenge(database, new ObjectId(challengeId));

    status.completed = true;
    user.points += challenge.pointReward;
    await database.collection("users").updateOne(
        { _id: new ObjectId(req.session.loggedInUserId) },
        {
            $set: {
                challengeStatuses: user.challengeStatuses,
                points: user.points,
            },
        },
    );

    return {
        points: user.points,
    };
}

export { getUserChallenges, completeChallenge };
export type { ChallengeInfo };
