# Cloudinary Media Admin

Internal media governance system built with Next.js 14+, Firebase, Cloudinary, and Zustand.

## Prerequisites

- Node.js 18+
- Firebase project with Auth + Firestore enabled
- Cloudinary account

## Setup

### 1. Install dependencies

```bash
cd cloudinary-media-admin
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env`:

- **Firebase Client SDK** — from Firebase Console > Project Settings > General
- **Firebase Admin SDK** — from Firebase Console > Project Settings > Service Accounts > Generate new private key
- **Cloudinary** — from Cloudinary Dashboard (never prefix with `NEXT_PUBLIC_`)

### 3. Set up Firestore

Create these collections manually or via the Firebase Console:

#### `users` collection

Each document ID should match the Firebase Auth UID:

```json
{
  "uid": "firebase-auth-uid",
  "email": "admin@example.com",
  "role": "SUPER_ADMIN",
  "status": "ACTIVE",
  "access": {
    "canUpload": true,
    "canDelete": true,
    "canCreateFolder": true,
    "canManageAdmins": true
  },
  "createdAt": 1700000000000
}
```

Valid roles: `SUPER_ADMIN`, `ADMIN`, `MEDIA_MANAGER`
Valid statuses: `ACTIVE`, `INACTIVE`

#### `media_files` collection

Automatically populated on upload. Document IDs use the Cloudinary public_id with `/` replaced by `__`.

#### `activity_logs` collection

Automatically populated. Logs: `UPLOAD`, `DELETE`, `CREATE_FOLDER`, `ACCESS_UPDATE`.

### 4. Create Firestore indexes

The dashboard and media list queries require composite indexes. Firestore will prompt you with links to create them when the queries first run. Required indexes:

- `media_files`: `folder` ASC, `status` ASC, `uploadedAt` DESC
- `activity_logs`: `action` ASC, `timestamp` ASC

### 5. Create your first user

1. Create a user in Firebase Auth (Email/Password)
2. Add a document in the `users` collection with the same UID
3. Set `role` to `SUPER_ADMIN` and `status` to `ACTIVE`

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Project Structure

```
src/
  app/
    login/          — Login page
    dashboard/      — Metrics dashboard (ADMIN+)
    media/          — Media browser with upload, delete, preview
    admins/         — User management (SUPER_ADMIN only)
    api/
      auth/verify/  — Token verification
      media/        — upload, delete, list
      folders/      — create, list
      admins/       — list, update
      activity/log/ — Activity log viewer
      dashboard/    — Dashboard metrics
  components/       — UI components (Modal, Toast, Sidebar, etc.)
  stores/           — Zustand stores (auth, theme, UI)
  lib/              — Server utilities (cloudinary, firebase, permissions)
  types/            — TypeScript interfaces
```

## Security Model

- All Cloudinary operations are server-side only
- Every API route verifies the Firebase JWT and checks Firestore user status
- Client-side Zustand stores are for UI convenience only — never trusted for security decisions
- Soft delete moves files to `_trash/YYYY-MM-DD/original-folder` in Cloudinary
- No permanent deletion in V1

## Color Palette

| Token        | Value    |
|--------------|----------|
| Primary      | #6C63FF  |
| Soft Purple  | #8E86FF  |
| Light BG     | #F4F6FB  |
| Card Light   | #FFFFFF  |
| Dark BG      | #121212  |
| Dark Card    | #1E1E1E  |
| Success      | #22C55E  |
| Warning      | #F59E0B  |
| Danger       | #EF4444  |
| Border Light | #E5E7EB  |
| Border Dark  | #2A2A2A  |
