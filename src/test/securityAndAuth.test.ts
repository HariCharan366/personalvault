import { describe, it, expect } from 'vitest';
import { api } from '@/services/api';
import { detectDeviceInfo } from '@/utils/device';
import 'fake-indexeddb/auto';

describe('Security, Login History & User Isolation', () => {
  const userA = 'user_alpha_111';
  const userB = 'user_beta_222';

  it('records successful and failed login attempts in login history audit', async () => {
    // Record Success
    await api.recordLogin({
      user_id: userA,
      timestamp: new Date().toISOString(),
      status: 'Success',
      ip_address: '192.168.1.50',
      browser: 'Google Chrome',
      browser_version: '130.0',
      os: 'Windows 10/11',
      device_type: 'Desktop',
      approximate_location: 'New York, US',
      session_id: 'sess_success_001',
    });

    // Record Failed attempt
    await api.recordLogin({
      user_id: userA,
      timestamp: new Date().toISOString(),
      status: 'Failed',
      ip_address: '203.0.113.195',
      browser: 'Unknown Browser',
      os: 'Linux',
      device_type: 'Desktop',
      approximate_location: 'Frankfurt, DE',
      session_id: 'sess_failed_002',
    });

    const history = await api.getLoginHistory(userA);
    expect(history.length).toBeGreaterThanOrEqual(2);

    const successItem = history.find((h) => h.status === 'Success');
    const failedItem = history.find((h) => h.status === 'Failed');

    expect(successItem).toBeDefined();
    expect(successItem?.ip_address).toBe('192.168.1.50');
    expect(successItem?.browser).toBe('Google Chrome');

    expect(failedItem).toBeDefined();
    expect(failedItem?.status).toBe('Failed');
  });

  it('correctly tracks active sessions and revokes them', async () => {
    const session1 = {
      id: 'session_device_1',
      user_id: userA,
      session_token_hash: 'hash_token_1',
      device_name: 'Work PC',
      browser: 'Edge',
      os: 'Windows',
      is_current: true,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const session2 = {
      id: 'session_device_2',
      user_id: userA,
      session_token_hash: 'hash_token_2',
      device_name: 'Mobile Phone',
      browser: 'Safari',
      os: 'iOS',
      is_current: false,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    await api.upsertActiveSession(session1);
    await api.upsertActiveSession(session2);

    let activeSessions = await api.getActiveSessions(userA);
    expect(activeSessions.length).toBe(2);

    // Revoke session2
    await api.revokeSession('session_device_2');
    activeSessions = await api.getActiveSessions(userA);
    expect(activeSessions.some((s) => s.id === 'session_device_2')).toBe(false);
    expect(activeSessions.some((s) => s.id === 'session_device_1')).toBe(true);
  });

  it('enforces strict cross-user document isolation', async () => {
    // User A creates a document
    const docA = await api.createDocument({
      user_id: userA,
      title: "User A's Medical Report",
      original_filename: 'medical.pdf',
      storage_path: `${userA}/med.enc`,
      file_size: 15000,
      mime_type: 'application/pdf',
      sha256_hash: 'hash_med_a',
      encryption_iv: 'iv_a',
      wrapped_dek: 'dek_a',
      is_favorite: false,
      is_deleted: false,
      current_version: 1,
    });

    // User B creates a document
    const docB = await api.createDocument({
      user_id: userB,
      title: "User B's Tax Return",
      original_filename: 'tax.pdf',
      storage_path: `${userB}/tax.enc`,
      file_size: 25000,
      mime_type: 'application/pdf',
      sha256_hash: 'hash_tax_b',
      encryption_iv: 'iv_b',
      wrapped_dek: 'dek_b',
      is_favorite: false,
      is_deleted: false,
      current_version: 1,
    });

    // User A should only see User A's documents
    const userADocs = await api.getDocuments(userA);
    expect(userADocs.some((d) => d.id === docA.id)).toBe(true);
    expect(userADocs.some((d) => d.id === docB.id)).toBe(false);

    // User B should only see User B's documents
    const userBDocs = await api.getDocuments(userB);
    expect(userBDocs.some((d) => d.id === docB.id)).toBe(true);
    expect(userBDocs.some((d) => d.id === docA.id)).toBe(false);
  });

  it('detects device intelligence from environment', () => {
    const device = detectDeviceInfo();
    expect(device.browser).toBeDefined();
    expect(device.os).toBeDefined();
    expect(['Desktop', 'Mobile', 'Tablet']).toContain(device.deviceType);
  });
});
