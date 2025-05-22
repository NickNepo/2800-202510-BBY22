// src/routes/profile.ts
import { Express, Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import getCurrentUser from "../utils/getCurrentUser.js";
import StatusError from "../utils/statusError.js";
import { UsersSchema } from "../schema.js";

export default (app: Express, database: Db) => {
    //
    // 1) VIEW PROFILE
    //
    app.get("/profile", async (req: Request, res: Response) => {
        // a) Authentication guard
        if (!req.session.loggedInUserId) {
            throw new StatusError(401, "Please log in first");
        }
        // b) Fetch the full user document
        const user = (await getCurrentUser(database, new ObjectId(req.session.loggedInUserId))) as UsersSchema & { _id: ObjectId };

        // c) Load completed challenge names
        const completedIds = user.CompletedTasks.map(id => new ObjectId(id));
        const completedTasks = completedIds.length
            ? await database
                .collection("challenges")
                .find({ _id: { $in: completedIds } })
                .project({ name: 1, _id: 0 })
                .toArray()
            : [];

        // d) NEW: Load purchased items from the user's inventory
        //    Assumes you have an "items" collection with documents like { _id, name, imageUrl, ... }
        const itemIds = user.inventory.map(id => new ObjectId(id));
        const purchasedItems = itemIds.length
            ? await database
                .collection("items")
                .find({ _id: { $in: itemIds } })
                .project({ name: 1, imageUrl: 1, _id: 0 })
                .toArray()
            : [];

        // e) Render the profile page, passing user, completedTasks, and purchasedItems
        res.render("profile", {
            user,
            completedTasks,
            purchasedItems,
        });
    });

    //
    // 2) SHOW EDIT PROFILE FORM
    //
    app.get("/profile/edit", async (req: Request, res: Response) => {
        if (!req.session.loggedInUserId) {
            throw new StatusError(401, "Please log in first");
        }
        const user = (await getCurrentUser(database, new ObjectId(req.session.loggedInUserId))) as UsersSchema & { _id: ObjectId };
        res.render("edit-profile", { user });
    });

    //
    // 3) HANDLE EDIT SUBMISSION
    //
    app.post("/profile/edit", async (req: Request, res: Response) => {
        if (!req.session.loggedInUserId) {
            throw new StatusError(401, "Please log in first");
        }

        const { username, bio } = req.body as { username: string; bio: string };

        // Basic server‐side validation
        if (typeof username !== "string" || username.trim().length < 3) {
            throw new StatusError(400, "Username must be at least 3 characters");
        }
        if (typeof bio !== "string") {
            throw new StatusError(400, "Bio is required");
        }

        // Persist updates
        await database
            .collection("users")
            .updateOne({ _id: new ObjectId(req.session.loggedInUserId) }, { $set: { username: username.trim(), bio: bio.trim() } });

        // Redirect back to view mode
        res.redirect("/profile");
    });
};
