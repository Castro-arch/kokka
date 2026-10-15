import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signedIn: true,
  allowed: true,
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: () => {
    // Like next/navigation's redirect: it throws, so nothing after it runs.
    if (!mocks.signedIn) return Promise.reject(new Error("NEXT_REDIRECT:/admin/login"));
    return Promise.resolve({ user: { id: "admin-1", name: "José", email: "jose@kokka.local" } });
  },
}));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: { updateUser: mocks.updateUser, changePassword: mocks.changePassword },
  }),
}));
vi.mock("@/lib/redis", () => ({ getRedis: () => ({}) }));
vi.mock("@/lib/rate-limit", () => ({ hitRateLimit: () => Promise.resolve(mocks.allowed) }));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const { changePasswordAction, updateNameAction } = await import("./actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  mocks.signedIn = true;
  mocks.allowed = true;
  mocks.updateUser.mockReset().mockResolvedValue({ status: true });
  mocks.changePassword.mockReset().mockResolvedValue({ token: "t" });
  mocks.refresh.mockReset();
});

describe("updateNameAction", () => {
  it("saves the trimmed name", async () => {
    const state = await updateNameAction(null, form({ name: "  José Castro " }));
    expect(mocks.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "José Castro" } }),
    );
    expect(state).toEqual({ values: { name: "José Castro" }, errors: {}, message: "Nome salvo." });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("rejects an empty or too long name without saving", async () => {
    expect((await updateNameAction(null, form({ name: "   " }))).errors.name).toBe(
      "Digite seu nome.",
    );
    expect((await updateNameAction(null, form({ name: "a".repeat(61) }))).errors.name).toBe(
      "Use no máximo 60 caracteres.",
    );
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("does nothing without a session", async () => {
    mocks.signedIn = false;
    await expect(updateNameAction(null, form({ name: "José" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});

describe("changePasswordAction", () => {
  const valid = {
    currentPassword: "senha-antiga-123",
    newPassword: "senha-nova-456789",
    confirmPassword: "senha-nova-456789",
  };

  it("changes the password, signs out the other sessions and comes back confirmed", async () => {
    await expect(changePasswordAction(null, form(valid))).rejects.toThrow(
      "NEXT_REDIRECT:/admin/configuracoes?senha=trocada",
    );
    expect(mocks.changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          currentPassword: valid.currentPassword,
          newPassword: valid.newPassword,
          revokeOtherSessions: true,
        },
      }),
    );
  });

  it("validates length and confirmation before calling Better Auth", async () => {
    const short = await changePasswordAction(
      null,
      form({ ...valid, newPassword: "curta", confirmPassword: "curta" }),
    );
    expect(short.errors.newPassword).toBe("Use pelo menos 12 caracteres.");

    const mismatch = await changePasswordAction(
      null,
      form({ ...valid, confirmPassword: "outra-coisa-123" }),
    );
    expect(mismatch.errors.confirmPassword).toBe("As duas senhas não são iguais.");
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it("says so when the current password is wrong", async () => {
    mocks.changePassword.mockRejectedValue(
      APIError.from("BAD_REQUEST", { code: "INVALID_PASSWORD", message: "Invalid password" }),
    );
    const state = await changePasswordAction(null, form(valid));
    expect(state).toEqual({ values: {}, errors: { currentPassword: "Senha atual incorreta." } });
  });

  it("rethrows other failures", async () => {
    mocks.changePassword.mockRejectedValue(new Error("database down"));
    await expect(changePasswordAction(null, form(valid))).rejects.toThrow("database down");
  });

  it("stops after too many attempts", async () => {
    mocks.allowed = false;
    const state = await changePasswordAction(null, form(valid));
    expect(state.errors.form).toMatch(/Muitas tentativas/);
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it("does nothing without a session", async () => {
    mocks.signedIn = false;
    await expect(changePasswordAction(null, form(valid))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });
});
