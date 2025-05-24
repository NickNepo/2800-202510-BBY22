import Joi from "joi";

// Type for a string that follows the username schema.
type Username = string;
// Type for a string that follows the email schema.
type Email = string;
// Type for a string that follows the password schema.
type Password = string;

const usernameSchema = Joi.string().alphanum().min(3).max(30).required();
const emailSchema = Joi.string().email().max(50).required();
const passwordSchema = Joi.string().min(8).max(50).required();

interface ChallengeStatus {
    challengeId: string;
    completed: boolean;
}

// Schema for a user document in the database.
interface UsersSchema {
    username: Username;
    email: Email;
    passwordHash: string;
    lastStreakDate: Date | null;
    points: number;
    bio: string;
    enemy: {
        name: string;
        image: string;
        health: number;
    } | null;
    enemyHealthModifier: number;
    inventory: string[];
    challengeStatuses: ChallengeStatus[];
    CompletedTasks: string[];
    CompletedTasksCount: number;
}

/**
 * Checks if a string is a valid Username.
 * @param {string} data
 * @returns {data is Username}
 */
function isUsername(data: string): data is Username {
    const validationResult = usernameSchema.validate(data);
    if (validationResult.error !== undefined) {
        return false;
    }
    return true;
}

/**
 * Checks if a string is a valid Email.
 * @param {string} data
 * @returns {data is Email}
 */
function isEmail(data: string): data is Email {
    const validationResult = emailSchema.validate(data);
    if (validationResult.error !== undefined) {
        return false;
    }
    return true;
}

/**
 * Checks if a string is a valid Password.
 * @param {string} data
 * @returns {data is Password}
 */
function isPassword(data: string): data is Password {
    const validationResult = passwordSchema.validate(data);
    if (validationResult.error !== undefined) {
        return false;
    }
    return true;
}

/**
 * Type guard to check if an object matches the UsersSchema interface.
 * @param {unknown} data
 * @returns {data is UsersSchema}
 */
function isUsersSchema(data: unknown): data is UsersSchema {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;
    if (typeof obj.enemy !== "object") {
        return false;
    }
    if (obj.enemy !== null) {
        const enemy = obj.enemy as Record<string, unknown>;
        if (typeof enemy.name !== "string" || typeof enemy.image !== "string" || typeof enemy.health !== "number") {
            return false;
        }
    }
    return (
        typeof obj.username === "string" &&
        typeof obj.email === "string" &&
        typeof obj.passwordHash === "string" &&
        typeof obj.lastStreakDate === "object" &&
        typeof obj.points === "number" &&
        typeof obj.enemyHealthModifier === "number" &&
        typeof obj.inventory === "object" &&
        Array.isArray(obj.inventory) &&
        typeof obj.challengeStatuses === "object" &&
        Array.isArray(obj.challengeStatuses) &&
        obj.challengeStatuses.every(
            (status: unknown) =>
                typeof status === "object" &&
                status !== null &&
                "challengeId" in status &&
                "completed" in status &&
                typeof (status as { challengeId: unknown }).challengeId === "string" &&
                typeof (status as { completed: unknown }).completed === "boolean",
        ) &&
        (obj.lastStreakDate instanceof Date || obj.lastStreakDate === null) &&
        isUsername(obj.username) &&
        isEmail(obj.email)
    );
}

export type { Username, Email, Password, UsersSchema, ChallengeStatus };

export { isUsername, isEmail, isPassword, isUsersSchema };
