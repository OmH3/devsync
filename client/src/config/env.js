// Single place that reads Vite environment variables.
// Empty origin means "same origin", which is how the production reverse proxy serves the app.
const configuredOrigin = import.meta.env.VITE_API_BASE_URL;

export const API_ORIGIN = (configuredOrigin ?? '').replace(/\/$/, '');
