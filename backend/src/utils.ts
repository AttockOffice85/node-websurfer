// Helper to generate a random ID
export function generateRandomID() {
    return Math.random().toString(36).substr(2, 9);
}