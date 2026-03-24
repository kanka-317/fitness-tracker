import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type {
    ActivityEntry,
    AppContextType,
    Credentials,
    FoodEntry,
    User,
} from "../types";
import { initialState } from "../types";
import api from "../configs/api";

const AppContext = createContext(initialState);
const activityLogsPathCandidates = ["/api/activitiy-logs", "/api/activity-logs"];
const canTryNextActivityLogsPath = (status?: number) => status === 404 || status === 405;

const getCollectionItems = <T,>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
        return payload as T[];
    }

    if (payload && typeof payload === "object") {
        const nestedData = (payload as { data?: unknown }).data;

        if (Array.isArray(nestedData)) {
            return nestedData as T[];
        }
    }

    return [];
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User>(null);
    const [isUserFetched, setIsUserFetched] = useState(localStorage.getItem("token") ? false : true);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);
    const [allFoodLogs, setAllFoodLogs] = useState<FoodEntry[]>([]);
    const [allActivityLogs, setAllActivityLogs] = useState<ActivityEntry[]>([]);

    const setApiAuthToken = (token?: string) => {
        if (token) {
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            return;
        }

        delete api.defaults.headers.common.Authorization;
    };

    const syncUserState = (
        nextUser: Exclude<User, null> & { dailyCalorietake?: number },
        token: string,
    ) => {
        const normalizedUser = {
            ...nextUser,
            dailyCalorieIntake:
                nextUser.dailyCalorieIntake ?? nextUser.dailyCalorietake,
        };

        setUser({ ...normalizedUser, token });
        setOnboardingCompleted(
            Boolean(normalizedUser?.age && normalizedUser?.weight && normalizedUser?.goal),
        );
    };

    const clearSessionState = () => {
        setUser(null);
        setOnboardingCompleted(false);
        setAllFoodLogs([]);
        setAllActivityLogs([]);
    };

    const fetchFoodLogs = async (token: string) => {
        setApiAuthToken(token);
        const response = await api.get("/api/food-logs", {
            headers: { Authorization: `Bearer ${token}` },
        });

        setAllFoodLogs(getCollectionItems<FoodEntry>(response.data));
    };

    const fetchActivityLogs = async (token: string) => {
        setApiAuthToken(token);
        const requestConfig = {
            headers: { Authorization: `Bearer ${token}` },
        };

        for (const path of activityLogsPathCandidates) {
            try {
                const response = await api.get(path, requestConfig);
                setAllActivityLogs(getCollectionItems<ActivityEntry>(response.data));
                return;
            } catch (error) {
                const status =
                    typeof error === "object" && error !== null && "response" in error
                        ? (error as { response?: { status?: number } }).response?.status
                        : undefined;

                if (
                    !canTryNextActivityLogsPath(status) ||
                    path === activityLogsPathCandidates[activityLogsPathCandidates.length - 1]
                ) {
                    throw error;
                }
            }
        }
    };

    const hydrateLogs = async (token: string) => {
        const [foodLogsResult, activityLogsResult] = await Promise.allSettled([
            fetchFoodLogs(token),
            fetchActivityLogs(token),
        ]);

        if (foodLogsResult.status === "rejected") {
            console.error("Couldn't load food logs.", foodLogsResult.reason);
            setAllFoodLogs([]);
        }

        if (activityLogsResult.status === "rejected") {
            console.error("Couldn't load activity logs.", activityLogsResult.reason);
            setAllActivityLogs([]);
        }
    };

    const signup = async (credentials: Credentials) => {
        const { data } = await api.post('/api/auth/local/register', credentials);
        setApiAuthToken(data.jwt);
        syncUserState(data.user, data.jwt);
        localStorage.setItem("token", data.jwt);
        await hydrateLogs(data.jwt);
        setIsUserFetched(true);
        navigate("/");
    };

    const login = async (credentials: Credentials) => {
        const { data } = await api.post("/api/auth/local", {
            identifier: credentials.email,
            password: credentials.password,
        });
        setApiAuthToken(data.jwt);
        syncUserState(data.user, data.jwt);
        localStorage.setItem("token", data.jwt);
        await hydrateLogs(data.jwt);
        setIsUserFetched(true);
        navigate("/");
    };

    const fetchUser = async (token: string) => {
        try {
            setApiAuthToken(token);
            const { data } = await api.get("/api/users/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            syncUserState(data, token);
        } catch {
            localStorage.removeItem("token");
            setApiAuthToken();
            clearSessionState();
        } finally {
            setIsUserFetched(true);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setApiAuthToken();
        clearSessionState();
        setIsUserFetched(true);
        navigate("/");
    };

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            setIsUserFetched(true);
            return;
        }

        void (async () => {
            await fetchUser(token);

            if (localStorage.getItem("token") !== token) {
                return;
            }

            await hydrateLogs(token);
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value: AppContextType = {
        user,
        setUser,
        login,
        signup,
        fetchUser,
        isUserFetched,
        logout,
        onboardingCompleted,
        setOnboardingCompleted,
        allFoodLogs,
        setAllFoodLogs,
        allActivityLogs,
        setAllActivityLogs,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => useContext(AppContext);
