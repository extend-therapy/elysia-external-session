import crypto from "crypto";
export declare class EncryptionError extends Error {
    readonly name = "EncryptionError";
    constructor(message: string, cause?: Error);
}
export declare class Encryption {
    private key;
    private algorithm;
    constructor(key?: string | undefined, algorithm?: crypto.CipherGCMTypes);
    encrypt(value: string): Promise<string>;
    decrypt(value: string): Promise<string>;
}
