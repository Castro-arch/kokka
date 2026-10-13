import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireAdminApi } from "./auth-guard";

const getSession = vi.fn();

vi.mock("next/headers", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("./auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

const session = { user: { id: "u1", email: "admin@kokka.test" }, session: { id: "s1" } };

beforeEach(() => {
  getSession.mockReset();
});

describe("requireAdmin", () => {
  it("redirects to the login page without a session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT /admin/login");
  });

  it("returns the session when logged in", async () => {
    getSession.mockResolvedValue(session);
    await expect(requireAdmin()).resolves.toBe(session);
  });
});

describe("requireAdminApi", () => {
  it("returns 401 without a session", async () => {
    getSession.mockResolvedValue(null);
    const result = await requireAdminApi();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("returns the session when logged in", async () => {
    getSession.mockResolvedValue(session);
    await expect(requireAdminApi()).resolves.toBe(session);
  });
});
