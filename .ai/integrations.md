# integrations.md — External & Hardware Integrations Specification

> **Classification**: System Integration & Interface Protocol Specification  
> **Source of Truth**: `.ai/integrations.md`

---

## 1. Integrations Overview

ThaibaHive Institution OS interfaces with external cloud services, hardware peripherals, and government APIs to support unified campus operations. Every integration MUST adhere to the security, authentication, and retry protocols specified herein.

---

## 2. Service & Hardware Integration Matrix

### 2.1 Communication & Messaging Integrations

#### 1. Firebase Cloud Messaging (FCM Push)
* **Purpose**: Delivering real-time push alerts to mobile applications (Android/iOS).
* **Authentication**: Firebase Admin SDK Service Account JSON Key.
* **Direction**: Outbound (Server → FCM → Device).
* **Sync Strategy**: Asynchronous event-driven push dispatch via `src/lib/sendPush.ts`.
* **Failure Handling**: On `UNREGISTERED` error response, dead token is automatically deleted from `staffDeviceTokens`.
* **Retry Policy**: 3 retries with exponential backoff (`1s`, `4s`, `16s`).
* **Security**: Key stored in `FIREBASE_SERVICE_ACCOUNT_KEY` env var; never exposed client-side.

#### 2. Resend Transactional Email Service
* **Purpose**: Sending official notifications, system welcomes, and financial receipts.
* **Authentication**: Bearer API Token (`RESEND_API_KEY`).
* **Direction**: Outbound (Server → Resend API → Recipient).
* **Sync Strategy**: Asynchronous execution via `src/lib/email.ts`.
* **Failure Handling**: Logs failed dispatches to `activity_logs` and queues fallback system notification.
* **Retry Policy**: 3 retries with `5s` delay between attempts.
* **Security**: SSL/TLS enforced on all API requests.

#### 3. SMS Gateway Relay
* **Purpose**: Sending critical emergency alerts, outpass approvals, and OTPs to non-smartphone users.
* **Authentication**: HTTP Header API Key / HMAC Signature.
* **Direction**: Outbound.
* **Sync Strategy**: Asynchronous REST payload.
* **Failure Handling**: Failed SMS dispatches fall back to in-app notification logs.
* **Retry Policy**: 2 retries; dead-letter queueing on third failure.
* **Security**: Payload sanitization to prevent SMS injection.

---

### 2.2 Payment Gateway Integrations (eSewa / Khalti / Stripe)

* **Purpose**: Online student fee payment collection, admission fee processing, and mess bill settlement.
* **Authentication**: Merchant Secret Key + SHA-256 HMAC Signature Verification.
* **Direction**: Bi-directional (Redirect / Modal Checkout → Server Webhook Callback).
* **Sync Strategy**: Real-time webhook verification with database payment status posting.
* **Failure Handling**: Webhook failures trigger automatic payment status reconciliation cron job.
* **Retry Policy**: Webhook endpoint returns HTTP 200 OK immediately; processes reconciliation asynchronously.
* **Security**: Nonce tracking in `used_nonces` table to prevent replay attacks; checksum validation on all callback payloads.

---

### 2.3 Storage & Cloud Media Integrations

#### Supabase Storage API
* **Purpose**: Hosting avatars, document uploads, circular PDFs, and MediaHive assets.
* **Authentication**: Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) for backend server management.
* **Direction**: Bi-directional (REST upload stream / Range-request stream download).
* **Sync Strategy**: Synchronous upload stream with local proxy URL generation (`/api/upload/files/[...path]`).
* **Failure Handling**: Development fallback redirects file operations to local `/uploads/` directory if credentials missing.
* **Retry Policy**: 2 retries for transient HTTP socket errors.
* **Security**: Access controlled via JWT authorization and signed proxy URLs.

---

### 2.4 Hardware & Biometric Peripheral Integrations

#### 1. NFC Card Readers (Android / Desktop Scanners)
* **Purpose**: Contactless identity verification for staff attendance, student check-in, library checkout, and outpass gate checks.
* **Authentication**: Physical card hardware UID read matching against `nfc_cards` table.
* **Direction**: Inbound (Peripheral → App → API).
* **Sync Strategy**: Synchronous REST verification call (`/api/staff` or `/api/biometric`).
* **Failure Handling**: Invalid or unassigned NFC tags return immediate visual/audible rejection signal.
* **Security**: Tag IDs normalized to uppercase hex; unassigned tags logged to `nfc_card_history`.

#### 2. Facial Recognition AI Pipeline
* **Purpose**: Hands-free gate attendance verification.
* **Authentication**: Facial feature extraction (`facenet-512d-v1`) matching against AES-256-GCM encrypted vectors in `students.faceEmbedding`.
* **Direction**: Inbound stream.
* **Sync Strategy**: Real-time vector comparison with `biometricLogs` attempt recording.
* **Failure Handling**: Low confidence scores (< 85%) trigger fallback to manual or NFC verification.
* **Security**: Raw facial images are NEVER stored; only encrypted 512d vector arrays.

---

### 2.5 Government & External SSO Integrations (DigiLocker / National ID)

* **Purpose**: Automated document verification during student admissions and staff onboarding.
* **Authentication**: OAuth 2.0 / OIDC Authorization Code Flow.
* **Direction**: Bi-directional.
* **Sync Strategy**: Synchronous OAuth callback with student/staff record enrichment.
* **Failure Handling**: OAuth errors display clear UI fallback allowing manual document upload.
* **Security**: Tokens held strictly in memory during OAuth callback session.
