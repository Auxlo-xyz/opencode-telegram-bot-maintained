import { beforeEach, describe, expect, it, vi } from "vitest";

const settingsSession = vi.hoisted(() => ({ current: null as { id: string } | null }));

vi.mock("../../../src/app/stores/settings-store.js", () => ({
  getCurrentSession: vi.fn(() => settingsSession.current),
  setCurrentSession: vi.fn((session: { id: string }) => {
    settingsSession.current = session;
  }),
  clearSession: vi.fn(() => {
    settingsSession.current = null;
  }),
}));

import { promptQueue } from "../../../src/app/managers/prompt-queue-manager.js";
import { clearSession, setCurrentSession } from "../../../src/app/services/session-service.js";

const SESSION = { id: "session-1", title: "Session 1", directory: "D:\\Projects\\Repo" };

describe("app/services/session-service", () => {
  beforeEach(() => {
    settingsSession.current = null;
    promptQueue.__resetForTests();
  });

  it("drops queued prompts when switching to another session", () => {
    setCurrentSession(SESSION);
    promptQueue.add("queued for session 1");

    setCurrentSession({ ...SESSION, id: "session-2" });

    expect(promptQueue.size()).toBe(0);
  });

  it("keeps queued prompts when the same session is only renamed", () => {
    setCurrentSession(SESSION);
    promptQueue.add("queued for session 1");

    setCurrentSession({ ...SESSION, title: "Renamed" });

    expect(promptQueue.size()).toBe(1);
  });

  it("drops queued prompts when the session is cleared", () => {
    setCurrentSession(SESSION);
    promptQueue.add("queued for session 1");

    clearSession();

    expect(promptQueue.size()).toBe(0);
  });
});
