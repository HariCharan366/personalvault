/**
 * PersonalVault Cryptographic Security Engine
 * Implements client-side Zero-Knowledge AES-256-GCM encryption
 * using the standardized W3C Web Crypto API.
 */

// Helper: Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper: Convert ArrayBuffer to Hex string
export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate cryptographically secure random bytes
export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generates a SHA-256 checksum (fingerprint) of raw data.
 * Used for duplicate detection and document integrity validation.
 */
export async function calculateSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bufferSource: BufferSource = data instanceof Uint8Array ? (data as unknown as BufferSource) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bufferSource);
  return bufferToHex(hashBuffer);
}

/**
 * Derives a 256-bit Key Encryption Key (KEK) from user's Vault PIN/Passphrase
 * using PBKDF2 with SHA-256 and 100,000 iterations.
 */
export async function deriveVaultKek(pinOrPassphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pinOrPassphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can wrap/unwrap DEKs
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Creates a verifier hash to validate if an entered PIN is correct,
 * without ever storing the plaintext PIN or the raw derived key.
 */
export async function createPinVerifier(kek: CryptoKey, salt: Uint8Array): Promise<string> {
  // Encrypt a known verification token string with the KEK
  const knownPayload = new TextEncoder().encode('PERSONALVAULT_VERIFIER_TOKEN_V1');
  const iv = getRandomBytes(12);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    kek,
    knownPayload
  );

  // Return formatted verifier: iv.ciphertext (both base64)
  return `${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
}

/**
 * Verifies whether an entered PIN derives the correct KEK
 * by attempting to decrypt the known verifier token.
 */
export async function verifyPinWithVerifier(pin: string, saltBase64: string, verifierToken: string): Promise<boolean> {
  try {
    const salt = base64ToBuffer(saltBase64);
    const kek = await deriveVaultKek(pin, salt);
    const [ivB64, cipherB64] = verifierToken.split(':');
    if (!ivB64 || !cipherB64) return false;

    const iv = base64ToBuffer(ivB64);
    const ciphertext = base64ToBuffer(cipherB64);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      kek,
      ciphertext as BufferSource
    );

    const decryptedStr = new TextDecoder().decode(decrypted);
    return decryptedStr === 'PERSONALVAULT_VERIFIER_TOKEN_V1';
  } catch {
    return false;
  }
}

/**
 * Generates a random 12-word mnemonic recovery phrase for disaster recovery.
 */
const WORDLIST = [
  'alpha', 'beacon', 'cipher', 'delta', 'enigma', 'falcon', 'galaxy', 'harbor',
  'iron', 'jupiter', 'kinetic', 'lunar', 'matrix', 'nebula', 'orbit', 'pulse',
  'quantum', 'radar', 'shield', 'titan', 'uranus', 'vector', 'zenith', 'vortex',
  'aurora', 'bastion', 'crystal', 'dynamo', 'echo', 'frost', 'glacier', 'horizon',
  'infinite', 'jasper', 'krypton', 'lightning', 'meteor', 'nova', 'onyx', 'phoenix',
  'quartz', 'radiant', 'sentinel', 'timber', 'unity', 'valiant', 'whisper', 'zephyr'
];

export function generateRecoveryPhrase(): string[] {
  const phrase: string[] = [];
  const randomBytes = getRandomBytes(12);
  for (let i = 0; i < 12; i++) {
    const index = randomBytes[i] % WORDLIST.length;
    phrase.push(WORDLIST[index]);
  }
  return phrase;
}

/**
 * Hashes recovery phrase for zero-knowledge storage verification
 */
export async function hashRecoveryPhrase(phraseWords: string[]): Promise<string> {
  const normalized = phraseWords.map((w) => w.trim().toLowerCase()).join(' ');
  const buffer = new TextEncoder().encode(normalized);
  return await calculateSha256(buffer);
}

/**
 * Encrypts a file (or raw ArrayBuffer) using AES-256-GCM.
 * Architecture:
 * 1. Generates a fresh random 256-bit AES-GCM Data Encryption Key (DEK).
 * 2. Generates a fresh 96-bit (12-byte) initialization vector (IV).
 * 3. Encrypts the plaintext data with DEK and IV (produces ciphertext + GCM tag).
 * 4. Wraps (encrypts) the DEK using the user's Vault KEK.
 * 5. Calculates plaintext SHA-256 hash for duplicate detection.
 */
export async function encryptDocument(
  fileData: ArrayBuffer,
  vaultKek: CryptoKey
): Promise<{
  encryptedData: ArrayBuffer;
  iv: string; // Base64
  wrappedDek: string; // Base64
  sha256Hash: string;
  originalSize: number;
}> {
  // 1. Plaintext SHA-256 hash
  const sha256Hash = await calculateSha256(fileData);

  // 2. Generate random DEK
  const dek = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 3. Generate random 12-byte IV for file encryption
  const iv = getRandomBytes(12);

  // 4. Encrypt document bytes with DEK
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    dek,
    fileData
  );

  // 5. Wrap DEK with Vault KEK
  const wrapIv = getRandomBytes(12);
  const rawDek = await crypto.subtle.exportKey('raw', dek);
  const encryptedDek = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv as BufferSource },
    vaultKek,
    rawDek
  );

  // Combine wrapIv + encryptedDek as wrappedDek string
  const wrappedDek = `${bufferToBase64(wrapIv)}:${bufferToBase64(encryptedDek)}`;

  return {
    encryptedData,
    iv: bufferToBase64(iv),
    wrappedDek,
    sha256Hash,
    originalSize: fileData.byteLength,
  };
}

/**
 * Decrypts an encrypted document:
 * 1. Unwraps the DEK using user's Vault KEK.
 * 2. Decrypts the ciphertext using the unwrapped DEK and IV.
 * 3. Throws if authentication tag doesn't match (tamper proof!).
 */
export async function decryptDocument(
  encryptedData: ArrayBuffer,
  ivBase64: string,
  wrappedDekString: string,
  vaultKek: CryptoKey
): Promise<ArrayBuffer> {
  const [wrapIvB64, encDekB64] = wrappedDekString.split(':');
  if (!wrapIvB64 || !encDekB64) {
    throw new Error('Invalid wrapped key format.');
  }

  // 1. Unwrap DEK
  const wrapIv = base64ToBuffer(wrapIvB64);
  const encDek = base64ToBuffer(encDekB64);

  const rawDek = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: wrapIv as BufferSource },
    vaultKek,
    encDek as BufferSource
  );

  const dek = await crypto.subtle.importKey(
    'raw',
    rawDek,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // 2. Decrypt file contents
  const fileIv = base64ToBuffer(ivBase64);
  const decryptedBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fileIv as BufferSource },
    dek,
    encryptedData
  );

  return decryptedBytes;
}
