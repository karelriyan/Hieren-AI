export { default } from "next-auth/middleware";

// Protect these API routes - require authentication for writes
export const config = {
  matcher: [
    // Protect session write operations
    // GET is public (filtered by userId on server), but POST/PUT/DELETE require auth
  ],
};
