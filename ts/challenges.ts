/*
 * Interface for the challenge information.
 */
interface ChallengeInfo {
    // The ID of the challenge.
    _id: string;
    // The name of the challenge.
    name: string;
    // The description of the challenge.
    description: string;
    // The number of points awarded for completing the challenge.
    pointReward: number;
    // Whether the user has completed the challenge.
    completed: boolean;
    // The end time of the challenge.
    endTime: Date;
    // The div element of the challenge.
    div: HTMLDivElement
    // THe span element of the name of the challenge.
    nameSpan: HTMLSpanElement;
}

/*
 * Interface for the modal.
 */
interface Modal {
    // The modal element.
    modal: HTMLDivElement;
    // The title element of the modal.
    title: HTMLHeadingElement;
    // The description element of the modal.
    description: HTMLParagraphElement;
    // The points element of the modal.
    points: HTMLSpanElement;
    // The close button element of the modal.
    closeButton: HTMLButtonElement;
    // The complete button element of the modal.
    completeButton?: HTMLButtonElement;
}

/*
 * Interface for for the data a challenge completion responds with.
 */
interface ChallengeCompleteData {
    // The user's new points balance after completing the challenge.
    points: number;
}

/**
 * Creates a modal for displaying challenge information.
 * @param {ChallengeInfo} challenge - The challenge to base the modal off of.
 * @returns {Modal} The modal elements.
 */
function createModal(challenge: ChallengeInfo): Modal {
    const modalElem = document.createElement("div");
    modalElem.className = "fixed inset-0 bg-opacity-50 flex items-center justify-center z-100 backdrop-blur-sm";

    const modalContent = document.createElement("div");
    modalContent.className = "bg-[var(--color-quietquest-gold)] text-[var(--color-quietquest-dark)] p-6 rounded-xl w-96 shadow-lg space-y-4 backdrop-filter-none";
    modalElem.appendChild(modalContent);

    const nameElem = document.createElement("h2");
    nameElem.className = "text-xl font-semibold";
    nameElem.textContent = challenge.name.toString();
    modalContent.appendChild(nameElem);

    const descriptionElem = document.createElement("p");
    descriptionElem.textContent = challenge.description.toString();
    modalContent.appendChild(descriptionElem);

    const pointsElem = document.createElement("p");
    modalContent.appendChild(pointsElem);

    const pointsStrong = document.createElement("strong");
    pointsStrong.textContent = "Points: ";
    pointsElem.appendChild(pointsStrong);

    const pointsSpan = document.createElement("span");
    pointsSpan.textContent = challenge.pointReward.toString();
    pointsElem.appendChild(pointsSpan);

    // Create a flex container for the buttons, so they are centered with space around
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex flex-row justify-around mt-4";
    modalContent.appendChild(buttonContainer);

    const closeButton = document.createElement("button");
    closeButton.className = "px-4 py-2 bg-[var(--color-quietquest-cream)] text-quietquest-dark cursor-pointer rounded shadow";
    closeButton.textContent = "Close";
    buttonContainer.appendChild(closeButton);

    const modal: Modal = {
        modal: modalElem,
        title: nameElem,
        description: descriptionElem,
        points: pointsElem,
        closeButton,
    };

    // Only add the complete button if the challenge is not completed yet
    if (!challenge.completed) {
        const completeButton = document.createElement("button");
        completeButton.className = "px-4 py-2 bg-[var(--color-quietquest-green)] text-quietquest-dark cursor-pointer rounded shadow";
        completeButton.textContent = "Complete";
        buttonContainer.appendChild(completeButton);

        modal.completeButton = completeButton;
    }

    return modal;
}

/**
 * Removes a modal from the page.
 * @param {Modal} modal - The modal to remove.
 */
function removeModal(modal: Modal): void {
    modal.modal.remove();
}

function updateChallengeElemCompletion(challenge: ChallengeInfo, data: ChallengeCompleteData, modal: Modal): void {
    // Update the challenge div to show that it has been completed
    challenge.div.classList.add("opacity-60");

    // Update the challenge name to show that it has been completed
    challenge.nameSpan.textContent = challenge.name.toString();
    challenge.nameSpan.classList.add("line-through");

    // Update all spots where the points are displayed
    document.querySelectorAll(".user-points-display").forEach(element => {
        element.textContent = data.points.toString();
    });

    // Remove the modal from the DOM
    removeModal(modal);
}

/**
 * Makes a POST request to complete a challenge.
 * @param {string} challengeId - The ID of the challenge.
 * @returns {Promise<ChallengeCompleteData | undefined>} The API response or undefined if the request failed in some way.
 */
async function completeChallenge(challengeId: string): Promise<ChallengeCompleteData | undefined> {
    // Make a POST request to the API
    const response = await fetch("/api/challenge/complete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            challengeId,
        }),
    });
    // If the response was ok, then return it, other alert and return undefined
    if (response.ok) {
        return await response.json() as ChallengeCompleteData;
    } else {
        alert("Error completing the challenge.");
    }
}

/**
 * Initializes a list of challenge info with events listeners that create modal.
 * @param {ChallengeInfo[]} challenges - An array of challenge info to add event listeners for modals to.
 * @param {HTMLElement} modalContainer - A container element to put modals into.
 */
function initializeChallenges(challenges: ChallengeInfo[], modalContainer: HTMLElement): void {
    // Add a listener for every challenge
    challenges.forEach(challenge => {
        challenge.div.addEventListener("click", () => {
            const modal = createModal(challenge);
            // Append the modal to the modal container
            modalContainer.appendChild(modal.modal);
            // Close the modal when the close button is clicked
            modal.closeButton.addEventListener("click", () => {
                removeModal(modal);
            });
            // If the modal has a completion button, complete the challenge on click
            if(modal.completeButton !== undefined) {
                modal.completeButton.addEventListener("click", async () => {
                    // Try completing the challenge
                    const data = await completeChallenge(challenge._id);
                    // On success, update the page to reflect
                    if(data !== undefined) {
                        challenge.completed = true;
                        updateChallengeElemCompletion(challenge, data, modal);
                    }
                });
            }
            // Allow clicking outside the modal to close it
            modal.modal.addEventListener("click", event => {
                if (event.target === modal.modal) {
                    removeModal(modal);
                }
            });
        });
    });
}

export default initializeChallenges;
