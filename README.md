# PersonalVault 🛡️
### Advanced Secure Personal Cloud Document Storage & Zero-Knowledge Vault

PersonalVault is a production-grade personal cloud document locker engineered for maximum confidentiality, resilience, and ease of use. It implements true **Client-Side Zero-Knowledge Encryption (E2EE)** using the standardized **W3C Web Crypto API**: documents are encrypted in the browser using **AES-256-GCM** before transmission to cloud storage. 

Neither Supabase nor any cloud host can view, inspect, or decrypt your personal files without your master vault credentials.

---

## 🚀 Key Highlights & Architecture

- **Client-Side Zero-Knowledge Cryptography**:
  - **AES-256-GCM**: Document ciphertext and per-file 128-bit authentication tags.
  - **PBKDF2 Key Derivation**: Derives a 256-bit Key Encryption Key (KEK) from your master Vault PIN using SHA-256 and **100,000 iterations** with a 32-byte CSPRNG salt.
  - **Envelope Encryption**: Each document generates a unique ephemeral Data Encryption Key (DEK) wrapped by the KEK.
  - **Integrity Validation & Tamper Proofing**: Modifications to encrypted bytes trigger an immediate authentication failure.
  - **12-Word Mnemonic Recovery Phrase**: Zero-knowledge emergency recovery mechanism in case the vault PIN is forgotten.
- **In-Memory Key Residency**:
  - Raw derived encryption keys are stored exclusively in transient browser memory and are **never** persisted to localStorage, cookies, or remote databases.
  - Configurable inactivity auto-lock (5, 15, 30, 60 minutes) automatically flushes keys from memory.
  - Immediate manual lock button.
- **Complete Document Management**:
  - Drag-and-drop multiple file uploads with live progress.
  - Real-time SHA-256 duplicate detection before upload.
  - Instant in-browser decryption & preview for PDFs, Images (PNG, JPG, WEBP), and text/CSV records.
  - Full Document Versioning (upload revisions, audit changes, rollback to prior versions).
  - Soft-delete Recycle Bin with configurable retention and permanent shredding.
  - Expiry reminders with automated warning alerts 30 days prior to expiration.
- **Security Audit & Login Intelligence**:
  - Dedicated **Security & Login History** logging timestamp, status, browser, OS, device type, IP, and location.
  - Active Session Manager with one-click "Logout from all other devices" and individual session revocation.
  - Export audit logs directly as CSV.
  - Suspicious access attempt alerts.
- **Cloud Architecture & Dual-Mode Deployment**:
  - Connects to **Supabase Cloud** (PostgreSQL + RLS + Private Storage Bucket).
  - Includes a built-in **Local Sandbox Fallback** using IndexedDB: PersonalVault functions immediately out-of-the-box for evaluation with full cryptographic encryption, and transitions seamlessly to Supabase Cloud when credentials are configured.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite 8, React Router v7 |
| **Styling & Design** | Tailwind CSS, Lucide React, Glassmorphism design system |
| **Forms & Validation** | React Hook Form, Zod |
| **Cryptography** | W3C Web Crypto API (`window.crypto.subtle`), AES-256-GCM, PBKDF2 |
| **Backend & Cloud DB** | Supabase PostgreSQL with strict Row Level Security (RLS) |
| **Cloud Object Storage**| Private Supabase Storage bucket (`vault-documents`) |
| **Test Suite** | Vitest, React Testing Library, JSDOM |

---

## 📦 Getting Started Locally

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/PersonalVault.git
cd PersonalVault
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Contents of `.env`:
```env
# Supabase Cloud Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Storage Bucket
VITE_STORAGE_BUCKET=vault-documents
VITE_APP_NAME=PersonalVault
```

> **Note**: If you haven't created a Supabase project yet, PersonalVault will run in **Local Sandbox Mode** with full AES-256-GCM encryption enabled via client storage!

### 3. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 4. Run Test Suite
Execute the Vitest automated test suite:
```bash
npm run test
```

### 5. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase Cloud Setup Instructions

Follow these steps to connect your own Supabase project:

### Step 1: Create a Supabase Project
1. Log in to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** from `Settings` -> `API`.

### Step 2: Apply Database Schema & RLS Migrations
1. In the Supabase Dashboard, open the **SQL Editor**.
2. Open the file `supabase/migrations/20261108000000_personalvault_schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This will create:
   - 11 relational tables (`profiles`, `vault_settings`, `categories`, `folders`, `documents`, `document_versions`, `document_tags`, `activity_logs`, `login_history`, `active_sessions`, `notifications`)
   - 8 pre-seeded default categories (Identity, Education, Banking, Medical, Employment, Personal, Government, Other)
   - Triggers for user creation and updated timestamps
   - Strict **Row Level Security (RLS)** policies ensuring user isolation
   - Private storage bucket `vault-documents` with access policies restricted to `auth.uid() = foldername`

### Step 3: Update `.env`
Update `.env` with your real credentials:
```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
Restart `npm run dev`. PersonalVault will now connect directly to your live Supabase cloud!

---

## 🔐 Cryptographic Specification & Security Hierarchy

```
+-------------------------------------------------------------+
|                     User Vault PIN                          |
+-------------------------------------------------------------+
                               |
                   PBKDF2-HMAC-SHA256 (100,000 iter)
                   Salt: 32-byte CSPRNG
                               |
                               v
               +-------------------------------+
               | Key Encryption Key (KEK, 256) |
               +-------------------------------+
                               |
        +----------------------+----------------------+
        |                                             |
   AES-256-GCM Wrap                              AES-256-GCM Wrap
        |                                             |
        v                                             v
+-------------------------------+             +-------------------------------+
| Wrapped DEK 1                 |             | Wrapped DEK 2                 |
+-------------------------------+             +-------------------------------+
        |                                             |
   AES-256-GCM (12-byte IV)                      AES-256-GCM (12-byte IV)
        |                                             |
        v                                             v
[ Encrypted Document Ciphertext ]             [ Encrypted Document Ciphertext ]
```

1. **Vault Master PIN**: Master secret chosen by the user. Never stored or sent across the network.
2. **KEK (Key Encryption Key)**: Derived on demand in browser memory using 100,000 PBKDF2 iterations.
3. **DEK (Data Encryption Key)**: Random 256-bit AES key generated for each document.
4. **Ciphertext Storage**: Uploaded to private cloud storage as an encrypted binary blob with a 128-bit authentication tag.
5. **Zero-Knowledge Recovery**: 12-word mnemonic phrase derived using CSPRNG entropy allows resetting the PIN if forgotten without exposing keys to third parties.

---

## 🌐 Routes Map

| Route | Description |
|---|---|
| `/login` | Account login with device and audit detection |
| `/register` | Account creation |
| `/forgot-password` | Password recovery request |
| `/reset-password` | Set new account password |
| `/dashboard` | Real-time statistics, storage breakdown chart, quick upload, and recent activity |
| `/documents` | Full document manager (Grid/List, filter by type/category, sort, favorites) |
| `/documents/:id` | Detailed document inspector, cryptographic hash, and version history |
| `/folders` | Directory manager with nested subfolder support |
| `/categories` | Document category management & color/icon customization |
| `/favorites` | Starred quick-access documents |
| `/recent` | Chronological upload history |
| `/vault` | Vault PIN settings, auto-lock timeout, and cryptographic specs |
| `/activity` | Tamper-resistant audit trail with date/type filtering |
| `/security/login-history` | Authentication audit log with CSV export |
| `/security/active-sessions` | Session management and remote device revocation |
| `/trash` | Recycle bin with restore and permanent cloud shredding |
| `/notifications` | Expiry notifications, upload confirmations, and security alerts |
| `/settings/profile` | Profile details |
| `/settings/security` | Password update and 2FA configuration |
| `/settings/storage` | Storage quota breakdown and Supabase Cloud connection status |

---

## 🚀 Deployment to Vercel

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "PersonalVault production release"
   git branch -M main
   git remote add origin https://github.com/your-username/PersonalVault.git
   git push -u origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the GitHub repository.
4. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STORAGE_BUCKET`
5. Click **Deploy**. Vercel will build and deploy the production application globally with HTTPS.

---

## 📄 License
MIT License. Built for personal privacy, sovereign data control, and advanced digital locker security.
