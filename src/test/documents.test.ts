import { describe, it, expect } from 'vitest';
import { api } from '@/services/api';
import { uploadEncryptedFile, downloadEncryptedFile, deleteEncryptedFile } from '@/services/storage';
import { calculateSha256 } from '@/services/crypto';

// Polyfill indexedDB in jsdom environment if needed
import 'fake-indexeddb/auto';

describe('Document Management Lifecycle & Storage Operations', () => {
  const userId = 'usr_test_documents_123';

  it('creates and retrieves user documents', async () => {
    const docData = {
      user_id: userId,
      title: 'Passport Scan 2026',
      original_filename: 'passport.pdf',
      storage_path: `${userId}/doc_001.enc`,
      file_size: 245000,
      mime_type: 'application/pdf',
      sha256_hash: 'a1b2c3d4e5f6',
      encryption_iv: 'iv_base64_test',
      wrapped_dek: 'wrap_iv:wrapped_key_test',
      is_favorite: false,
      is_deleted: false,
      current_version: 1,
    };

    const created = await api.createDocument(docData);
    expect(created.id).toBeDefined();
    expect(created.title).toBe('Passport Scan 2026');

    const list = await api.getDocuments(userId);
    expect(list.some((d) => d.id === created.id)).toBe(true);
  });

  it('renames a document', async () => {
    const doc = await api.createDocument({
      user_id: userId,
      title: 'Old Title',
      original_filename: 'notes.txt',
      storage_path: `${userId}/notes.enc`,
      file_size: 1024,
      mime_type: 'text/plain',
      sha256_hash: 'notes_hash_123',
      encryption_iv: 'iv_123',
      wrapped_dek: 'dek_123',
      is_favorite: false,
      is_deleted: false,
      current_version: 1,
    });

    await api.updateDocument(doc.id, { title: 'Renamed Document Title' });
    const fetched = await api.getDocumentById(doc.id);
    expect(fetched?.title).toBe('Renamed Document Title');
  });

  it('soft-deletes to trash and restores documents', async () => {
    const doc = await api.createDocument({
      user_id: userId,
      title: 'Document to Trash',
      original_filename: 'draft.docx',
      storage_path: `${userId}/draft.enc`,
      file_size: 5000,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sha256_hash: 'draft_hash_999',
      encryption_iv: 'iv_999',
      wrapped_dek: 'dek_999',
      is_favorite: false,
      is_deleted: false,
      current_version: 1,
    });

    // Soft delete
    await api.softDeleteDocument(doc.id);

    // Should not appear in active documents
    const activeDocs = await api.getDocuments(userId, false);
    expect(activeDocs.some((d) => d.id === doc.id)).toBe(false);

    // Must appear in trash / deleted documents
    const allDocs = await api.getDocuments(userId, true);
    const trashed = allDocs.find((d) => d.id === doc.id);
    expect(trashed?.is_deleted).toBe(true);
    expect(trashed?.deleted_at).toBeDefined();

    // Restore
    await api.restoreDocument(doc.id);
    const restoredDocs = await api.getDocuments(userId, false);
    expect(restoredDocs.some((d) => d.id === doc.id)).toBe(true);
  });

  it('uploads, downloads, and deletes encrypted objects in storage service', async () => {
    const testBytes = new TextEncoder().encode('Encrypted blob ciphertext simulation');
    const docId = 'storage_test_doc_01';

    // Upload
    const { storagePath, error: upErr } = await uploadEncryptedFile(userId, docId, testBytes.buffer);
    expect(upErr).toBeUndefined();
    expect(storagePath).toBe(`${userId}/${docId}.enc`);

    // Download
    const { data, error: dlErr } = await downloadEncryptedFile(storagePath);
    expect(dlErr).toBeUndefined();
    expect(data).toBeDefined();
    const downloadedStr = new TextDecoder().decode(data!);
    expect(downloadedStr).toBe('Encrypted blob ciphertext simulation');

    // Delete
    const { success, error: delErr } = await deleteEncryptedFile(storagePath);
    expect(success).toBe(true);
    expect(delErr).toBeUndefined();
  });

  it('detects duplicate files using SHA-256 fingerprinting', async () => {
    const content = new TextEncoder().encode('Identical Document Binary Content');
    const hash = await calculateSha256(content);

    // Save document with this hash
    await api.createDocument({
      user_id: userId,
      title: 'Original File',
      original_filename: 'original.pdf',
      storage_path: `${userId}/orig.enc`,
      file_size: content.byteLength,
      mime_type: 'application/pdf',
      sha256_hash: hash,
      encryption_iv: 'iv_dup',
      wrapped_dek: 'dek_dup',
      is_favorite: false,
      is_deleted: false,
      current_version: 1,
    });

    // Check duplicate
    const docs = await api.getDocuments(userId);
    const duplicate = docs.find((d) => d.sha256_hash === hash);
    expect(duplicate).toBeDefined();
    expect(duplicate?.original_filename).toBe('original.pdf');
  });

  it('supports creating folders inside folders (nested subfolders)', async () => {
    // 1. Create root folder
    const rootFolder = await api.createFolder({
      user_id: userId,
      name: 'Work',
      parent_id: null,
      color: '#00F5A0',
    });
    expect(rootFolder.id).toBeDefined();
    expect(rootFolder.parent_id).toBeNull();

    // 2. Create subfolder inside root folder (folder in folder)
    const subFolder = await api.createFolder({
      user_id: userId,
      name: 'Projects',
      parent_id: rootFolder.id,
      color: '#00D9F5',
    });
    expect(subFolder.id).toBeDefined();
    expect(subFolder.parent_id).toBe(rootFolder.id);

    // 3. Create subfolder inside subfolder (deep nesting: folder in folder in folder)
    const deepFolder = await api.createFolder({
      user_id: userId,
      name: '2026 Q1',
      parent_id: subFolder.id,
      color: '#38bdf8',
    });
    expect(deepFolder.id).toBeDefined();
    expect(deepFolder.parent_id).toBe(subFolder.id);

    // 4. Retrieve all folders for user
    const userFolders = await api.getFolders(userId);
    expect(userFolders.some((f) => f.id === rootFolder.id)).toBe(true);
    expect(userFolders.some((f) => f.id === subFolder.id)).toBe(true);
    expect(userFolders.some((f) => f.id === deepFolder.id)).toBe(true);
  });
});

