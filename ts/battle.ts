document.addEventListener("DOMContentLoaded", () => {
    // Battle Menu
    const fightButton = document.getElementById("fight-button") as HTMLButtonElement | null;
    const battleMenu = document.getElementById("battle-menu");
    const healthBar = document.getElementById("health-bar");
    const goalsSection = document.getElementById("goals-section");

    const attackMenu = document.getElementById("attack-menu");
    const itemsMenu = document.getElementById("items-menu");
    const attackButton = document.getElementById("attack-button") as HTMLButtonElement | null;
    const itemsButton = document.getElementById("items-button") as HTMLButtonElement | null;

    const attackGoBack = document.getElementById("attack-go-back");
    const itemsGoBack = document.getElementById("items-go-back");
    const battleGoBack = document.getElementById("go-back-button") as HTMLButtonElement | null;

    const userPoints = document.getElementById("usersPoints");

    interface Enemy {
        name: string;
        image: string;
    }

    interface EnemyInfo extends Enemy {
        health: number;
    }

    // Fight Button
    fightButton?.addEventListener("click", () => {
        fightButton.classList.add("hidden");
        battleMenu?.classList.remove("hidden");
        healthBar?.classList.remove("hidden");
        goalsSection?.classList.add("hidden");
    });

    if(userPoints === null){
        throw new Error("user's points cannot be Null");
    }

    async function attackEnemy(damageValue: number | undefined){

        const response = await fetch("/api/enemy/damage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ damage: damageValue }),
        });
        if(response.ok){
            return await response.json() as EnemyInfo;
        }else {
            alert("Error completing the attack");
        }
    }

    // Attack & Items Navigation
    attackButton?.addEventListener("click", async () => {
        const damage = userPoints.textContent ?? "0";
        const damageNumber = parseInt(damage);
        await attackEnemy(damageNumber);
        location.reload();

        itemsButton?.addEventListener("click", () => {
            battleMenu?.classList.add("hidden");
            itemsMenu?.classList.remove("hidden");
        });

        // Go Back from Attack
        attackGoBack?.addEventListener("click", () => {
            attackMenu?.classList.add("hidden");
            battleMenu?.classList.remove("hidden");
        });

        // Go Back from Items
        itemsGoBack?.addEventListener("click", () => {
            itemsMenu?.classList.add("hidden");
            battleMenu?.classList.remove("hidden");
        });

        // Go back from battle menu to default screen
        battleGoBack?.addEventListener("click", () => {
            battleMenu?.classList.add("hidden");
            healthBar?.classList.add("hidden");
            goalsSection?.classList.remove("hidden");
            fightButton?.classList.remove("hidden");
        });

        // Streaks Modal
        const openStreaks = document.getElementById("open-streaks");
        const closeStreaks = document.getElementById("close-streaks");
        const streaksModal = document.getElementById("streaks-modal");

        openStreaks?.addEventListener("click", () => {
            streaksModal?.classList.remove("hidden");
        });

        closeStreaks?.addEventListener("click", () => {
            streaksModal?.classList.add("hidden");
        });
    });
});
