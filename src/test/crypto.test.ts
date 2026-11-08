import { describe, it, expect } from 'vitest';
import {
  getRandomBytes,
  deriveVaultKek,
  createPinVerifier,
  verifyPinWithVerifier,
  generateRecoveryPhrase,
  hashRecoveryPhrase,
  calculateSha256,
  encryptDocument,
  decryptDocument,
  bufferToBase64,
  base64ToBuffer,
} from '@/services/crypto';

describe('PersonalVault Cryptographic Engine (AES-256-GCM & PBKDF2)', () => {
  it('generates random bytes of specified length', () => {
    const bytes1 = getRandomBytes(32);
    const bytes2 = getRandomBytes(32);
    expect(bytes1.length).toBe(32);
    expect(bytes2.length).toBe(32);
    expect(bytes1).not.toEqual(bytes2);
  });

  it('correctly calculates SHA-256 hash for duplicate detection', async () => {
    const data1 = new TextEncoder().encode('Confidential Document Content V1');
    const data2 = new TextEncoder().encode('Confidential Document Content V1');
    const data3 = new TextEncoder().encode('Different Document Content');

    const hash1 = await calculateSha256(data1);
    const hash2 = await calculateSha256(data2);
    const hash3 = await calculateSha256(data3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64); // 256 bits = 64 hex chars
  });

  it('derives KEK and verifies PIN with verifier token', async () => {
    const pin = '849201';
    const salt = getRandomBytes(32);
    const saltB64 = bufferToBase64(salt);

    const kek = await deriveVaultKek(pin, salt);
    expect(kek).toBeDefined();
    expect(kek.algorithm.name).toBe('AES-GCM');

    const verifier = await createPinVerifier(kek, salt);
    expect(verifier).toContain(':');

    // Correct PIN verification
    const isValid = await verifyPinWithVerifier(pin, saltB64, verifier);
    expect(isValid).toBe(true);

    // Incorrect PIN verification must fail
    const isInvalid = await verifyPinWithVerifier('000000', saltB64, verifier);
    expect(isInvalid).toBe(false);
  });

  it('encrypts and decrypts documents using AES-256-GCM envelope encryption', async () => {
    const pin = 'VaultSecurityPIN#2026';
    const salt = getRandomBytes(32);
    const vaultKek = await deriveVaultKek(pin, salt);

    const originalText = 'Top Secret Personal Tax & Passport Information';
    const originalBytes = new TextEncoder().encode(originalText);

    // Encrypt
    const encryptionResult = await encryptDocument(originalBytes.buffer, vaultKek);
    expect(encryptionResult.encryptedData).toBeDefined();
    expect(encryptionResult.encryptedData.byteLength).toBeGreaterThan(0);
    expect(encryptionResult.iv).toBeDefined();
    expect(encryptionResult.wrappedDek).toContain(':');
    expect(encryptionResult.sha256Hash).toBeDefined();

    // Ciphertext must NOT match original plaintext
    const cipherTextString = new TextDecoder().decode(encryptionResult.encryptedData);
    expect(cipherTextString).not.toBe(originalText);

    // Decrypt
    const decryptedBuffer = await decryptDocument(
      encryptionResult.encryptedData,
      encryptionResult.iv,
      encryptionResult.wrappedDek,
      vaultKek
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    expect(decryptedText).toBe(originalText);
  });

  it('fails decryption and detects tampering if ciphertext or tag is modified', async () => {
    const pin = 'SecretPIN123';
    const salt = getRandomBytes(32);
    const vaultKek = await deriveVaultKek(pin, salt);

    const originalText = 'Untampered financial data';
    const originalBytes = new TextEncoder().encode(originalText);
    const result = await encryptDocument(originalBytes.buffer, vaultKek);

    // Tamper with the encrypted bytes (flip a byte)
    const tamperedBytes = new Uint8Array(result.encryptedData);
    tamperedBytes[tamperedBytes.length - 1] ^= 0xff;

    // Decrypting tampered data must throw an error due to GCM authentication tag mismatch
    await expect(
      decryptDocument(tamperedBytes.buffer, result.iv, result.wrappedDek, vaultKek)
    ).rejects.toThrow();
  });

  it('fails decryption if attempted with wrong vault KEK', async () => {
    const salt = getRandomBytes(32);
    const correctKek = await deriveVaultKek('CorrectPIN123', salt);
    const wrongKek = await deriveVaultKek('WrongPIN999', salt);

    const originalBytes = new TextEncoder().encode('Private data');
    const result = await encryptDocument(originalBytes.buffer, correctKek);

    // Attempting to decrypt with wrong KEK must throw
    await expect(
      decryptDocument(result.encryptedData, result.iv, result.wrappedDek, wrongKek)
    ).rejects.toThrow();
  });

  it('generates 12-word recovery phrase and verifies hash', async () => {
    const phrase = generateRecoveryPhrase();
    expect(phrase.length).toBe(12);

    const hash1 = await hashRecoveryPhrase(phrase);
    const hash2 = await hashRecoveryPhrase(phrase);
    expect(hash1).toBe(hash2);

    const wrongPhrase = [...phrase];
    wrongPhrase[0] = wrongPhrase[0] === 'alpha' ? 'beacon' : 'alpha';
    const wrongHash = await hashRecoveryPhrase(wrongPhrase);
    expect(hash1).not.toBe(wrongHash);
  });
});
