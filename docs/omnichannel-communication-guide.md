# ThaibaHive EngageOS — Omnichannel Communication Architecture & Dispatch Guide

## 1. Architectural Overview

EngageOS provides a unified multi-modal communication backbone across 5 supported communication channels for the Thaiba Higher Education Group:

1. **Email (Transactional & Broadcast)**: AWS Simple Email Service (SES) / SMTP with DKIM, SPF, and DMARC alignment.
2. **SMS (Short Message Service)**: Twilio REST API integration with E.164 phone formatting and automated carrier concatenation.
3. **Push Notifications**: Firebase Cloud Messaging (FCM HTTP v1) for mobile apps (iOS / Android) and Web Push (VAPID).
4. **In-App Messaging**: Real-time Redis Pub/Sub and Server-Sent Events (SSE) stream delivery for the web and mobile portals.
5. **Interactive Voice Response (Voice IVR)**: Twilio Voice with dynamic TwiML generation and AWS Polly text-to-speech synthesis.

```
                    ┌────────────────────────┐
                    │  Campus Subsystems     │ (Attendance, Fees, Exams, Admissions)
                    └───────────┬────────────┘
                                │ Event Triggers
                                ▼
                    ┌────────────────────────┐
                    │   Dispatch Engine      │
                    │   & Multi-Factor Router│
                    └───────────┬────────────┘
                                │
       ┌──────────────┬─────────┼──────────────┬──────────────┐
       ▼              ▼         ▼              ▼              ▼
 ┌───────────┐  ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐
 │   Email   │  │    SMS    │ │   Push   │ │  In-App   │ │ Voice IVR │
 │ (AWS SES) │  │ (Twilio)  │ │  (FCM)   │ │ (SSE/WS)  │ │ (TwiML)   │
 └───────────┘  └───────────┘ └──────────┘ └───────────┘ └───────────┘
```

---

## 2. Multi-Factor Intelligent Routing

Outbound messages are routed to the optimal channel using a multi-factor scoring function:

$$\text{Score}(c) = 0.35 \cdot \text{Urgency}(c) + 0.25 \cdot \text{Affinity}(c) + 0.25 \cdot \text{Reliability}(c) - 0.15 \cdot \text{CostPenalty}(c)$$

- **Emergency Bypass**: Any message flagged with `priority: "critical"` overrides opt-outs and budget caps to dispatch across highest-urgency direct channels (Voice + SMS + Push).
- **Automated Fallback**: When an adapter dispatch times out (> 5 minutes) or fails delivery receipt, the `FallbackEngine` automatically promotes the next optimal channel.

---

## 3. Rate Limiting & Frequency Capping

- **Default Daily Caps**: SMS (2), Email (4), Push (6), Voice (1), In-App (20).
- **Quiet Hours**: Non-critical notifications scheduled between 21:00 and 07:00 recipient local time are deferred until 07:15.
