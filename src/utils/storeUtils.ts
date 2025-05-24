import { Db, ObjectId, WithId } from "mongodb";
import { Request } from "express";
import { isUsersSchema } from "../schema.js";

/**
 * Interface for the enemy's information.
 */
interface ItemInfo {
    name: string;
    description: string;
    price: number;
    image: string;
}

/**
 * Retrieves the price of an item from the database by its name.
 * @param {ObjectId} itemId - The ID of the item to look up.
 * @param {Db} database - The MongoDB database instance.
 * @returns {Promise<ItemInfo>} The item's information.
 * @throws Error if the item's price is not a number.
 */
async function getItem(itemId: ObjectId, database: Db): Promise<WithId<ItemInfo>> {
    // Get the item from the database by querying for the items name
    const item = await database.collection("items").findOne({
        _id: itemId,
    });

    // Check if item is null
    if (item === null) {
        throw new Error("Item not found");
    }

    // Ensure the items price is a number
    if (typeof item.price !== "number") {
        throw new Error("Items must have a price");
    }
    if (item.price <= 0) {
        throw new Error("Item price must be greater than 0");
    }

    if (typeof item.name !== "string") {
        throw new Error("Items must have a name");
    }
    if (item.name.trim() === "") {
        throw new Error("Item name must not be blank");
    }

    if (typeof item.description !== "string") {
        throw new Error("Items must have a description");
    }
    if (item.description.trim() === "") {
        throw new Error("Item description must not be blank");
    }

    if (typeof item.image !== "string") {
        throw new Error("Item must have an image");
    }

    // Return the item info
    return {
        _id: item._id,
        price: item.price,
        description: item.description,
        name: item.name,
        image: item.image,
    };
}

/**
 * Gives the specified item to the user if they have enough points.
 * Updates the user's inventory and deducts the item's price from their points.
 * @param {Request} req - The Express request object containing the session user ID.
 * @param {Db} database - The MongoDB database instance.
 * @param {ObjectId} itemId - The ID of the item to the user is buying.
 * @returns {Promise<ItemInfo>} The ItemInfo of the item that was bought.
 */
async function buyItem(req: Request, database: Db, itemId: ObjectId): Promise<ItemInfo> {
    // Get the user's information from the user's ID
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

    const item = await getItem(itemId, database);

    // If the user cannot afford the item, throw an error
    if (user.points < item.price) {
        throw new Error("Cannot buy item, you do not have enough points");
    }

    // Add the item to the user's inventory
    user.inventory.push(item._id.toHexString());

    // Update users database with the new inventory and update their points
    await database.collection("users").updateOne(
        {
            _id: new ObjectId(req.session.loggedInUserId),
        },
        {
            $set: {
                inventory: user.inventory,
                points: user.points - item.price,
            },
        },
    );

    return item;
}

export { buyItem, getItem };
export type { ItemInfo };
