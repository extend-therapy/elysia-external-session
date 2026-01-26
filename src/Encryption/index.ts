import { createCipheriv, createDecipheriv, randomBytes, type CipherGCMTypes } from "crypto";

const IV_LENGTH = 12;

export class EncryptionError extends Error {
  public readonly name = "EncryptionError";
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

export class Encryption {
  private key: Buffer<ArrayBuffer>;
  private algorithm: CipherGCMTypes;

  constructor(key = Bun.env.ENCRYPTION_KEY, algorithm: CipherGCMTypes = "aes-256-gcm") {
    if (!key) {
      throw new Error("Could not find key");
    }
    this.key = Buffer.from(key, "hex");
    if (algorithm.includes("256") && this.key.length !== 32) {
      throw new Error("AES 256 of all types requires 32 bytes of data in hex encoding for the key");
    }
    this.algorithm = algorithm;
    if (!this.algorithm) {
      throw new Error("Error creating algorithm -- e.g. key or algo");
    }
  }

  async encrypt(value: string) {
    const iv = randomBytes(IV_LENGTH);
    // SETUP CIPHER
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    // ENCRYPT
    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);

    // GET AUTH TAG
    const tag = cipher.getAuthTag();

    // CONCATENATE IV, SALT, TAG, AND ENCRYPTED DATA
    const encryptedData = Buffer.concat([iv, encrypted, tag]);

    // RETURN ENCRYPTED DATA
    return encryptedData.toString("hex");
  }

  async decrypt(value: string) {
    const encryptedData = Buffer.from(value, "hex");
    const iv = encryptedData.subarray(0, IV_LENGTH);
    const encrypted = encryptedData.subarray(IV_LENGTH, encryptedData.length - 16);
    const tag = encryptedData.subarray(encryptedData.length - 16);

    if (iv.length !== IV_LENGTH) {
      throw new EncryptionError("Invalid IV length");
    }
    if (encrypted.length !== encryptedData.length - IV_LENGTH - 16) {
      throw new EncryptionError("Invalid encrypted data length");
    }
    if (tag.length !== 16) {
      throw new EncryptionError("Invalid tag length");
    }

    const decipher = createDecipheriv(this.algorithm, this.key, iv, {
      authTagLength: 16,
    });

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString("utf-8");
  }
}
