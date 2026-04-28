
export const config = {
    API_KEY: process.env.API_KEY,
    API_BASE: process.env.API_BASE || "https://api.dev.trysiren.io/api/v1/public",
    TEMPLATE_ID: process.env.TEMPLATE_ID,
};

export function validateConfig() {
    if (!config.API_KEY) {
        throw new Error("Unable to start server. Please set the API_KEY environment variable.");
    }
}
