# MeetMesh — Videocall App

P2P video calling platform with real-time video enhancement, guest access, and screen sharing.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4, `tw-animate-css` |
| UI | shadcn/ui on `@base-ui/react`, Phosphor + Lucide icons |
| Auth & DB | Supabase (SSR, email/password, profiles, storage) |
| Signaling | Socket.IO (external server) |
| WebRTC | Browser native `RTCPeerConnection` |
| Video | WebGL 2.0 pipeline for real-time enhancement |
| i18n | Custom React Context (English / Spanish) |
| Compiler | React Compiler (auto-memoization) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Browser (Next.js 16)             │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐  │
│  │   Auth   │   │  WebRTC  │   │  Video FX    │  │
│  │ (Supabase)│   │  (P2P)   │   │  (WebGL)    │  │
│  └────┬─────┘   └────┬─────┘   └─────────────┘  │
│       │              │                           │
│  ┌────▼──────────────▼──────────────────────┐    │
│  │         Socket.IO Client                  │    │
│  └────────────────┬─────────────────────────┘    │
└───────────────────┼──────────────────────────────┘
                    │
                    │ WebSocket
                    │
┌───────────────────▼──────────────────────────────┐
│           meetmesh-signaling (Node.js)            │
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │        Socket.IO Server                    │   │
│  │  Events: join-room, update-room-state,    │   │
│  │  webrtc-offer/answer, ice-candidate,      │   │
│  │  send-reaction, end-room, leave-room      │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│  State: In-memory Maps (rooms, participants,      │
│  reactions). No database.                         │
└───────────────────────────────────────────────────┘

WebRTC media (audio/video/screen) travels P2P directly
between browsers. Only signaling metadata goes through
the Socket.IO server.
```

### Peer-to-Peer Media Flow

- Camera and microphone streams are exchanged directly between browsers via `RTCPeerConnection`
- Screen share tracks are added to existing peer connections via SDP renegotiation
- The signaling server only relays offer/answer/ICE-candidate messages — it never touches media data
- Video enhancement runs client-side through a WebGL 2.0 pipeline before transmission

## Features

### Call & Media
- P2P video/audio calls with multiple participants
- Microphone and camera toggle
- Screen sharing with pin-to-fullscreen
- Real-time video enhancement (brightness, contrast, saturation, white balance, gamma, sharpness, denoise)
- Dynamic gradient backgrounds based on dominant color extraction

### Room Management
- Room creation with UUID (via `/api/create-room`)
- Join by room code
- Host controls: approve/reject guest requests, end room for all
- Guest lobby with camera preview before joining

### Engagement
- Emoji reactions with animated overlay
- Raise hand with sound notification
- Participant sidebar with media status indicators
- Join request sound notification

### Auth & Profiles
- Email/password authentication via Supabase
- Profile management (full name, username, avatar upload)
- Password reset flow
- Theme preference sync (light/dark/system, persisted to Supabase)

### Localization
- English and Spanish (custom React Context i18n)
- Locale persisted in `localStorage`
- System locale auto-detection

## Project Structure

```
src/
├── app/
│   ├── (auth)/               # Login, register, password reset, email verification
│   ├── (dashboard)/          # Dashboard, settings (profile, account, preferences, security)
│   ├── api/create-room/      # Room creation endpoint (POST → redirect)
│   └── room/[id]/            # Video call room (RoomClient.tsx, GuestLobby.tsx)
├── components/
│   ├── CursorGrid/           # Interactive canvas background
│   ├── i18n/                 # I18nProvider, SystemI18nProvider, useI18n
│   ├── theme/                # ThemeProvider, ThemeScript
│   └── ui/                   # shadcn/ui primitives (button, card, dialog, input, avatar, label)
├── hooks/
│   ├── useWebRTC.ts          # Peer connection lifecycle, signaling, screen share renegotiation
│   ├── useLocalMediaStream.ts# Camera/mic/screen stream acquisition
│   ├── useVideoEnhancer.ts   # WebGL pipeline integration
│   ├── useDominantColor.ts   # Color extraction from video/image
│   └── useJoinRequests.ts    # Guest request lifecycle via Supabase realtime
├── i18n/
│   ├── en.ts                 # English translations (~337 keys)
│   ├── es.ts                 # Spanish translations (~308 keys)
│   └── types.ts              # Locale and translation types
├── lib/
│   ├── supabase/             # Client, server, storage clients
│   ├── video/                # WebGL shader pipeline (393 lines)
│   ├── emojis.ts             # Reaction emoji definitions
│   └── utils.ts              # cn(), color utilities (hex/rgb/hsl/gradient)
└── middleware.ts              # Supabase auth middleware
```

## Dependencies

### Signaling Server (meetmesh-signaling)

The app requires a separate Socket.IO signaling server to relay WebRTC handshake messages and maintain room state.

**Repository:** `meetmesh-signaling/` (sibling directory)

**Stack:** Node.js (ESM) + Express 5 + Socket.IO 4 + CORS

**Deployment:** The production `.env.production` points to `https://meetmesh-signaling.onrender.com`.

**Configuration:**

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `CLIENT_ORIGIN` | `*` | Comma-separated allowed CORS origins |

**Events:**

| Client → Server | Server → Client |
|---|---|
| `join-room` | `room-state` |
| `update-room-state` | `participant-joined` / `participant-left` |
| `webrtc-offer` | `webrtc-offer` |
| `webrtc-answer` | `webrtc-answer` |
| `ice-candidate` | `ice-candidate` |
| `send-reaction` | `reaction` |
| `end-room` | `room-ended` |
| `leave-room` | |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous publishable key |
| `NEXT_PUBLIC_SIGNALING_SERVER_URL` | Yes | Socket.IO signaling server URL |
| `NEXT_PUBLIC_APP_URL` | For email auth | App URL for redirects in auth emails |
| `NEXT_PUBLIC_ICE_SERVERS` | Optional | JSON array of custom TURN/STUN servers (e.g. `[{"urls":"turn:...","username":"...","credential":"..."}]`) |

### Supabase Setup

The project requires a Supabase project with:

1. **Auth** — Email/password authentication enabled
2. **Tables:**
   - `profiles` — `id` (uuid, PK), `full_name`, `username`, `avatar_url`, `theme`
   - `join_requests` — `id` (uuid), `room_id`, `guest_id`, `guest_name`, `status`, `created_at`, `updated_at`
3. **Storage** — `avatars` bucket for profile pictures
4. **Realtime** — Enable on `join_requests` table for guest request subscriptions

## Getting Started

```bash
# 1. Clone and install
cd videocall-app
npm install

# 2. Clone and start the signaling server (separate terminal)
cd ../meetmesh-signaling
npm install
npm run dev    # starts on :3001

# 3. Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Start the app
cd ../videocall-app
npm run dev    # starts on :3000
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

### Frontend (Vercel)

The app is designed to deploy on Vercel. The production build uses:

```bash
npm run build    # next build
npm run start    # next start
```

Set all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard.

### Signaling Server (Render / Railway / Fly.io)

The signaling server is a simple Node.js process. Deploy as:

```bash
node index.js
```

Set `CLIENT_ORIGIN` to the comma-separated list of allowed frontend origins and `PORT` to the hosting platform's assigned port.

### WebRTC & TURN

For connections between peers behind symmetric NATs, deploy a TURN server (e.g. coturn) and configure `NEXT_PUBLIC_ICE_SERVERS`:

```
NEXT_PUBLIC_ICE_SERVERS=[{"urls":"turn:turn.example.com:3478","username":"user","credential":"pass"}]
```
