/* Single entry point for data access. Screens import `api` from here.
 * VITE_API_MODE=mock (default) uses the simulated backend in ./mock.ts.
 * When the Django REST API exists, add an HTTP client with the same function names
 * (see README "Connecting to Django") and select it here. */
export { api, ApiError, onSessionChange } from './mock';
export * from './types';
