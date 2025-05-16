import { Express, Request, Response } from "express";
import StatusError from "../utils/statusError.js";

if (process.env.OPEN_WEATHER_MAP_API_KEY === undefined) {
    throw new Error("OPEN_WEATHER_MAP_API_KEY environment variable not defined.");
}
const OPEN_WEATHER_MAP_API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY;
const WEATHER_API_ENABLED = process.env.WEATHER_API_ENABLED === "true";

// Data required to request weather information.
interface LocationData {
    longitude: number;
    latitude: number;
    units: "metric" | "imperial" | undefined;
}

// Shape of the weather data returned by the OpenWeatherMap API.
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

// Shape of the weather response sent to the client.
interface WeatherResponse {
    location: string;
    temp: number;
    weather: {
        main: string;
        description: string;
    };
}

/**
 * Type guard to check if an object is LocationData.
 * @param {unknown} data
 * @returns {data is LocationData}
 */
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

/**
 * Type guard to check if an object is WeatherData.
 * @param {unknown} data
 * @returns {data is WeatherData}
 */
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

/**
 * Registers the /api/weather endpoint to provide weather data to the client.
 * @param {Express} app - The Express application instance.
 */
export default (app: Express) => {
    app.post("/api/weather", async (req: Request, res: Response) => {
        if (!WEATHER_API_ENABLED) {
            throw new StatusError(503, "Weather API is disabled");
        }
        if (!isLocationData(req.body)) {
            throw new StatusError(400, "Invalid data");
        }

        req.body.units ??= "metric";
        const { longitude, latitude, units } = req.body;
        const WEATHER_RESPONSE = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?units=${units}&lat=${latitude.toString()}&lon=${longitude.toString()}&appid=${OPEN_WEATHER_MAP_API_KEY}`,
        );
        const weatherData = (await WEATHER_RESPONSE.json()) as unknown;
        if (isWeatherData(weatherData)) {
            const response: WeatherResponse = {
                location: weatherData.name,
                temp: weatherData.main.temp,
                weather: {
                    main: weatherData.weather[0].main,
                    description: weatherData.weather[0].description,
                },
            };
            res.json(response);
        } else {
            throw new Error("Unexpected response from OpenWeatherMap");
        }
    });
};
