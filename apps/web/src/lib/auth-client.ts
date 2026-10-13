import { createAuthClient } from "better-auth/react";

/** Browser client: sign-in/out go through /api/auth so Better Auth's rate limit applies. */
export const authClient = createAuthClient();
