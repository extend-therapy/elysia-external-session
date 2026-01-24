import { describe, expect, mock, test } from "bun:test";
import { BunRedisStore } from "../../src/Store/redis";

describe("BunRedisStore", () => {
  const mockRedisClient = {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve("OK")),
    del: mock(() => Promise.resolve(1)),
    expire: mock(() => Promise.resolve(1)),
  } as any;

  const store = new BunRedisStore({
    redisClient: mockRedisClient,
    expiresAfter: { minutes: 1 }
  });

  test("should call redis get and return parsed data", async () => {
    const sessionId = "test-id";
    const sessionData = { foo: "bar" };
    
    mockRedisClient.get.mockImplementation(() => Promise.resolve(JSON.stringify(sessionData)));

    const retrieved = await store.get({ sessionId });
    
    expect(mockRedisClient.get).toHaveBeenCalledWith(`session:${sessionId}`);
    expect(mockRedisClient.expire).toHaveBeenCalled();
    expect(retrieved).toEqual(sessionData);
  });

  test("should call redis set with JSON string and expiration", async () => {
    const sessionId = "set-id";
    const sessionData = { active: true };

    await store.set({ sessionId, session: sessionData });

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      "EX",
      60
    );
  });

  test("should call redis del on delete", async () => {
    const sessionId = "del-id";
    await store.delete({ sessionId });
    expect(mockRedisClient.del).toHaveBeenCalledWith(`session:${sessionId}`);
  });
});
