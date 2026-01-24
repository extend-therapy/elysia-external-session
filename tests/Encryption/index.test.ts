import { describe, expect, test } from "bun:test";
import { Encryption } from "../../src/Encryption";

describe("Encryption", () => {
  const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex chars = 32 bytes

  test("should encrypt and decrypt a value correctly", async () => {
    const encryption = new Encryption(testKey);
    const originalValue = "hello-world-session-id";
    const encrypted = await encryption.encrypt(originalValue);
    
    expect(encrypted).not.toBe(originalValue);
    expect(typeof encrypted).toBe("string");

    const decrypted = await encryption.decrypt(encrypted);
    expect(decrypted).toBe(originalValue);
  });

  test("should throw error if key is missing", () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => new Encryption(undefined as any)).toThrow("Could not find key");
    } finally {
      process.env.ENCRYPTION_KEY = originalKey;
    }
  });

  test("should throw error if key length is invalid for aes-256", () => {
    const shortKey = "abcdef";
    expect(() => new Encryption(shortKey)).toThrow(
      "AES 256 of all types requires 32 bytes of data in hex encoding for the key"
    );
  });

  test("should produce different ciphertexts for the same plaintext (IV randomness)", async () => {
    const encryption = new Encryption(testKey);
    const value = "same-value";
    const encrypted1 = await encryption.encrypt(value);
    const encrypted2 = await encryption.encrypt(value);
    
    expect(encrypted1).not.toBe(encrypted2);
    
    const decrypted1 = await encryption.decrypt(encrypted1);
    const decrypted2 = await encryption.decrypt(encrypted2);
    
    expect(decrypted1).toBe(value);
    expect(decrypted2).toBe(value);
  });
});
