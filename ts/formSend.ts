/**
 * Validates form inputs from login and register and marks invalid fields.
 * @param {HTMLFormElement} formElem - The form element to validate.
 * @returns {boolean} - True if all validations pass, false otherwise.
 */
function validateForm(formElem: HTMLFormElement): boolean {
    let isValid = true;
    const inputs = formElem.querySelectorAll<HTMLInputElement>("input[required]");
    const validationMessage = document.getElementById("validationHeaderMessage");

    if (!validationMessage) {
        console.debug("Validation message element not found - continuing without it");
    }

    inputs.forEach(input => {
        input.classList.remove("input-error");

        if (!input.value.trim()) {
            input.classList.add("input-error");
            isValid = false;

            if (validationMessage) {
                validationMessage.style.display = "block";
            }
        }

        if (input.type === "email" && input.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
            input.classList.add("input-error");
            isValid = false;

            if (validationMessage) {
                validationMessage.style.display = "block";
            }
        }
    });

    return isValid;
}
/**
 * Sends form data to the specified URL using POST and handles redirect or reload.
 * @param {string} url - The endpoint to send data to.
 * @param {FormData} data - The form data to send.
 * @param {string | undefined} redirectPath - The path to redirect to on success, or reload if undefined.
 */
async function send(url: string, data: FormData, redirectPath: string | undefined) {
    const obj: Record<string, FormDataEntryValue> = {};
    data.forEach((value, key) => {
        obj[key] = value;
    });

    const response = await fetch(url, {
        headers: {
            "Content-type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(obj),
    });
    if (response.ok) {
        if (redirectPath !== undefined) {
            location.assign(redirectPath);
        } else {
            location.reload();
        }
    }
}

/**
 * Attaches a submit handler to a form that sends data via AJAX and handles redirect/reload.
 * @param {string} url - The endpoint to send data to.
 * @param {HTMLFormElement} formElem - The form element to attach the handler to.
 * @param {string | undefined} redirectPath - The path to redirect to on success, or reload if undefined.
 */
function formSend(url: string, formElem: HTMLFormElement, redirectPath: string | undefined) {
    formElem.addEventListener("submit", (event: SubmitEvent) => {
        event.preventDefault();

        // Validate before sending
        if (validateForm(formElem)) {
            const data = new FormData(formElem);
            void send(url, data, redirectPath);
        }
    });
}

export default formSend;
