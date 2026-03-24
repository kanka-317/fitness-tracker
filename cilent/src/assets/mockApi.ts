import { dummyUser, dummyFoodLogs, dummyActivityLogs } from "../assets/assets";
import type {
    UserData,
    FoodEntry,
    ActivityEntry,
    FormData,
    FoodImageAnalysisResult,
} from "../types";

interface DB {
    user: any;
    foodLogs: FoodEntry[];
    activityLogs: ActivityEntry[];
}

const getDB = (): DB => {
    const dbStr = localStorage.getItem('fitness_db');
    if (!dbStr) {
        const initialDB: DB = {
            user: null,
            foodLogs: [],
            activityLogs: [],
        };
        return initialDB;
    }
    return JSON.parse(dbStr);
};

const saveDB = (db: DB) => {
    localStorage.setItem('fitness_db', JSON.stringify(db));
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getApiBaseUrl = () => {
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

    if (!configuredBaseUrl) {
        return "";
    }

    return configuredBaseUrl.endsWith("/")
        ? configuredBaseUrl.slice(0, -1)
        : configuredBaseUrl;
};

const getResponseErrorMessage = async (response: Response) => {
    if (response.status === 502) {
        return "The Gemini analysis server is not reachable. Start the Strapi server with `npm run dev` from the project root, then try again.";
    }

    try {
        const payload = await response.json() as {
            error?: { message?: string };
            message?: string;
        };
        const errorMessage = payload.error?.message || payload.message || `Request failed with status ${response.status}.`;

        if (/api key expired/i.test(errorMessage)) {
            return "Your Gemini API key has expired. Replace `GEMINI_API_KEY` in `server/.env` with a new active key, restart the server, and try again.";
        }

        if (/api key not valid|invalid api key|api_key_invalid/i.test(errorMessage)) {
            return "Your Gemini API key is invalid. Update `GEMINI_API_KEY` in `server/.env` with a valid key, restart the server, and try again.";
        }

        return errorMessage;
    } catch {
        return `Request failed with status ${response.status}.`;
    }
};

const mockApi = {
    auth: {
        login: async (credentials: any) => {
            await delay(500);
            let db = getDB();

            if (!db.user) {
                db.user = {
                    ...dummyUser,
                    email: credentials.identifier || credentials.email,
                    username: (credentials.identifier || credentials.email).split('@')[0],
                };
                db.foodLogs = [...dummyFoodLogs];
                db.activityLogs = [...dummyActivityLogs];
                saveDB(db);
            }
            return {
                data: {
                    user: db.user,
                    jwt: "mock_jwt_token_" + Date.now(),
                },
            };
        },
        register: async (credentials: any) => {
            await delay(500);
            const db = getDB();

            db.user = {
                id: "user_" + Date.now(),
                username: credentials.username,
                email: credentials.email,
                age: 0,
                weight: 0,
                height: 0,
                goal: "maintain",
                dailyCalorieIntake: 2000,
                dailyCalorieBurn: 400,
                createdAt: new Date().toISOString(),
            };
            db.foodLogs = [];
            db.activityLogs = [];
            saveDB(db);

            return {
                data: {
                    user: db.user,
                    jwt: "mock_jwt_token_" + Date.now(),
                },
            };
        }
    },
    user: {
        me: async () => {
            await delay(300);
            const db = getDB();
            return { data: db.user || dummyUser };
        },
        update: async (_id: string, updates: Partial<UserData>) => {
            await delay(300);
            const db = getDB();
            if (db.user) {
                db.user = { ...db.user, ...updates };
                saveDB(db);
            }
            return { data: db.user };
        }
    },
    foodLogs: {
        list: async () => {
            await delay(300);
            const db = getDB();
            return { data: db.foodLogs };
        },
        create: async (payload: { data: FormData | any }) => {
            await delay(300);
            const db = getDB();
            const newEntry: FoodEntry = {
                id: Date.now(),
                documentId: "doc_food_" + Date.now(),
                name: payload.data.name,
                calories: payload.data.calories,
                mealType: payload.data.mealType,
                date: new Date().toISOString().split("T")[0],
                createdAt: new Date().toISOString(),
            };
            db.foodLogs.push(newEntry);
            saveDB(db);
            return { data: newEntry };
        },
        delete: async (documentId: string) => {
            await delay(300);
            const db = getDB();
            db.foodLogs = db.foodLogs.filter(f => f.documentId !== documentId);
            saveDB(db);
            return { data: { id: documentId } };
        }
    },
    activityLogs: {
        list: async () => {
            await delay(300);
            const db = getDB();
            return { data: db.activityLogs };
        },
        create: async (payload: { data: { name: string; duration: number; calories: number } }) => {
            await delay(300);
            const db = getDB();
            const newEntry: ActivityEntry = {
                id: Date.now(),
                documentId: "doc_act_" + Date.now(),
                name: payload.data.name,
                duration: payload.data.duration,
                calories: payload.data.calories,
                date: new Date().toISOString().split("T")[0],
                createdAt: new Date().toISOString(),
            };
            db.activityLogs.push(newEntry);
            saveDB(db);
            return { data: newEntry };
        },
        delete: async (documentId: string) => {
            await delay(300);
            const db = getDB();
            db.activityLogs = db.activityLogs.filter(a => a.documentId !== documentId);
            saveDB(db);
            return { data: { id: documentId } };
        }
    },
    imageAnalysis: {
        analyze: async (file: File) => {
            await delay(250);

            const formData = new FormData();
            formData.append("image", file);

            let response: Response;

            try {
                response = await fetch(`${getApiBaseUrl()}/api/image-analysis/analyze`, {
                    method: "POST",
                    body: formData,
                });
            } catch {
                throw new Error(
                    "Couldn't reach the Gemini analysis server. Start the Strapi server with `npm run dev` from the project root.",
                );
            }

            if (!response.ok) {
                throw new Error(await getResponseErrorMessage(response));
            }

            const responseData = await response.json() as {
                data?: {
                    result?: FoodImageAnalysisResult;
                };
            };

            if (!responseData.data?.result) {
                throw new Error("The Gemini analyzer returned an empty response.");
            }

            return {
                data: {
                    result: responseData.data.result,
                }
            };
        }
    }
};

export default mockApi;
