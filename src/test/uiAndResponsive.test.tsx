import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { VaultProvider } from '@/contexts/VaultContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Login } from '@/pages/Login';
import 'fake-indexeddb/auto';

describe('UI Components & Responsive Layout Checks', () => {
  it('renders Sidebar with responsive navigation links', () => {
    let closed = false;
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={() => { closed = true; }} storageUsedBytes={10485760} />
      </BrowserRouter>
    );

    expect(screen.getByText('PersonalVault')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('All Documents')).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.queryByText('Vault Security')).not.toBeInTheDocument();
    expect(screen.getByText('Security & Logins')).toBeInTheDocument();
    expect(screen.getByText('Trash')).toBeInTheDocument();

    // Check storage indicator
    expect(screen.getByText(/10.0 MB/)).toBeInTheDocument();
  });

  it('renders Login page with only password required and validates master credentials', async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <VaultProvider>
              <Login />
            </VaultProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Unlock & Access Vault')).toBeInTheDocument();
    // Verify no email input is present
    expect(screen.queryByLabelText(/Account Email/i)).not.toBeInTheDocument();

    const passwordInput = screen.getByPlaceholderText(/Enter password/i);
    expect(passwordInput).toBeInTheDocument();

    // Test autofill master password button
    const demoButton = screen.getByText(/Auto-fill Password/i);
    fireEvent.click(demoButton);
    expect((passwordInput as HTMLInputElement).value).toBe('Haricharan@2008');
  });

  it('renders badges and empty states properly', () => {
    render(<Badge variant="success">AES-256 Active</Badge>);
    expect(screen.getByText('AES-256 Active')).toBeInTheDocument();

    render(
      <EmptyState
        title="Zero Confidential Files"
        description="Your locker is currently empty."
        actionLabel="Upload First File"
        onAction={() => {}}
      />
    );
    expect(screen.getByText('Zero Confidential Files')).toBeInTheDocument();
    expect(screen.getByText('Upload First File')).toBeInTheDocument();
  });
});

