import express, { Response } from "express";
import "dotenv/config"; // Load .env file

import sessionMiddleware from "./middleware/session.js";
import database from "./utils/databaseConnection.js";
import AI_CLIENT from "./utils/aiClient.js";
import loadRoutes from "./utils/loadRoutes.js";
import StatusError from "./utils/statusError.js";

if (process.env.MONGODB_DBNAME === undefined) {
    throw new Error("MONGODB_DBNAME environment variable not defined.");
}

const MONGODB_DATABASE = database.db(process.env.MONGODB_DBNAME);

// Use declaration merging to include custom session properties.
declare module "express-session" {
    interface SessionData {
        loggedInUserId: string;
        monsterHealth: number;
    }
}

const APP = express();
const PORT = process.env.PORT ?? "3000";

// Check if the server is running in dev mode or build mode
// If the dist folder is one folder up we are in dev mode, but if it is two folders up then we are in build mode

import getFolders from "./utils/folders.js";
const { PUBLIC_ROOT, DIST_PUBLIC_ROOT } = getFolders(import.meta.dirname);

APP.set("view engine", "ejs");

APP.use(express.urlencoded({ extended: true }));

APP.use(express.json({ type: "application/json" }));

APP.use(sessionMiddleware());

// Use the Typescript that was compiled to JS in the dist folder
APP.use(express.static(DIST_PUBLIC_ROOT));

// Register API and route handlers (dynamically)
await Promise.all([loadRoutes("./src/api", APP, MONGODB_DATABASE, AI_CLIENT), loadRoutes("./src/routes", APP, MONGODB_DATABASE)]);

// Use static middleware to serve static files from the public folder
APP.use(express.static(PUBLIC_ROOT));

// Serve a 404 page for any other routes
APP.use(() => {
    throw new StatusError(404, "Looks like this path leads to a dead end... even the goblins are confused", true);
});

// Handle errors
APP.use((err: Error | StatusError, _req: unknown, res: Response, _next: unknown) => {
    let sErr: StatusError;
    if (err instanceof StatusError) {
        sErr = err;
    } else {
        sErr = new StatusError(500, "An unexpected error occurred", true);
        console.error(err);
    }
    if (sErr.html) {
        res.status(sErr.status).render("error", {
            errorCode: sErr.status,
            errorName: sErr.name,
            errorMessage: sErr.message,
        });
    } else {
        res.status(sErr.status).send(sErr.message);
    }
});

APP.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
