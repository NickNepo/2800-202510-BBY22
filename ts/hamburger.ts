document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("mobile-menu-button") as HTMLButtonElement | null;
    const menu = document.getElementById("mobile-menu");
    const icon = document.getElementById("hamburger-icon") as HTMLImageElement | null;

    if (!toggleBtn || !menu || !icon) {return;}

    const toggleMenu = () => {
        const isHidden = menu.classList.toggle("hidden");
        toggleBtn.setAttribute("aria-expanded", String(!isHidden));
        icon.src = isHidden
            ? "/quietQuestIcons/hamburger.svg"
            : "/quietQuestIcons/close.svg";
        icon.alt = isHidden ? "Open Menu" : "Close Menu";
    };

    toggleBtn.addEventListener("click", toggleMenu);

    const gettingStartedBtn = document.getElementById("mobile-getting-started");
    const featuresBtn = document.getElementById("mobile-features");
    const aboutBtn = document.getElementById("mobile-about");
    const loginBtn = document.getElementById("mobile-login");

    [gettingStartedBtn, featuresBtn, aboutBtn, loginBtn].forEach(button => {
        button?.addEventListener("click", () => {
            if (!menu.classList.contains("hidden")) {
                toggleMenu();
            }
        });
    });
});
