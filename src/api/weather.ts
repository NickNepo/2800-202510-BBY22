import { Express, Request, Response } from "express";

if (process.env.OPEN_WEATHER_MAP_API_KEY === undefined) {
    throw new Error("OPEN_WEATHER_MAP_API_KEY environment variable not defined.");
}
const OPEN_WEATHER_MAP_API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY;

interface LocationData {
    longitude: number;
    latitude: number;
    units: "metric" | "imperial" | undefined;
}

interface WeatherData {
    name: string;
    main: {
        temp: number;
    };
    weather: [
        {
            main: string;
            description: string;
        },
    ];
}

interface WeatherResponse {
    location: string;
    temp: number;
    weather: {
        main: string;
        description: string;
    };
}

function isLocationData(data: unknown): data is LocationData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;
    return (
        typeof obj.longitude === "number" &&
        typeof obj.latitude === "number" &&
        (typeof obj.units === "string" || typeof obj.units === "undefined")
    );
}

function isWeatherData(data: unknown): data is WeatherData {
    if (
        typeof data === "object" &&
        data !== null &&
        "name" in data &&
        "main" in data &&
        "weather" in data &&
        typeof data.name === "string" &&
        typeof data.main === "object" &&
        data.main !== null &&
        "temp" in data.main &&
        typeof data.main.temp === "number" &&
        Array.isArray(data.weather)
    ) {
        return data.weather.reduce((acc: boolean, value: unknown) => {
            return (
                acc &&
                typeof value === "object" &&
                value !== null &&
                "main" in value &&
                typeof value.main === "string" &&
                "description" in value &&
                typeof value.description === "string"
            );
        }, true);
    } else {
        return false;
    }
}

export default (app: Express) => {
    app.post("/api/weather", async (req: Request, res: Response) => {
        if (isLocationData(req.body)) {
            req.body.units ??= "metric";
            const { longitude, latitude, units } = req.body;
            const WEATHER_RESPONSE = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?units=${units}&lat=${latitude.toString()}&lon=${longitude.toString()}&appid=${OPEN_WEATHER_MAP_API_KEY}`,
            );
            WEATHER_RESPONSE.json()
                .then(weatherData => {
                    if (isWeatherData(weatherData)) {
                        const response: WeatherResponse = {
                            location: weatherData.name,
                            temp: weatherData.main.temp,
                            weather: {
                                main: weatherData.weather[0].main,
                                description: weatherData.weather[0].description,
                            },
                        };
                        res.type("application/json").send(JSON.stringify(response));
                    } else {
                        res.status(500).send("Internal server error.");
                        console.error("Error: Unexpected response from OpenWeatherMap.");
                    }
                })
                .catch(() => {
                    res.status(500).send("Internal server error.");
                    console.error("Error: Unexpected response from OpenWeatherMap.");
                });
        } else {
            res.status(400).send("Invalid data.");
        }
    });
};
