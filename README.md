# 🎩 Monopoly 3D Multiplayer Server (Colyseus)

Authoritative multiplayer game server for **Monopoly 3D Game**, built with **Colyseus**, **TypeScript**, and **Express**.

## 🚀 Features

- **Authoritative State Synchronization**: Colyseus Schema manages player balance, board positions, properties, jail status, bankruptcy, and turns.
- **Full Game Logic**:
  - Rolling dice with double turns & jail on 3 consecutive doubles.
  - Buying unowned properties & stations/utilities.
  - Automatic rent collection with full-set color group multipliers.
  - Building houses & hotels.
  - Chance and Community Chest card drawing & actions.
  - Mortgage / unmortgage mechanisms.
  - Bail payments & Get Out of Jail Free cards.
  - AI player turn automation.
- **WebSocket Transport**: Powered by `@colyseus/ws-transport`.
- **CORS Configured**: Dynamic origin detection for secure WebSockets and HTTP requests from web clients.

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
PORT=2567
CORS_ORIGIN=*
```

### 3. Run Dev Server
```bash
npm run dev
```

The server will start at `ws://localhost:2567`.

## 📦 Production Build & Run

```bash
npm run build
npm start
```

## 🌐 Free Cloud Deployment (Render / Railway)

### Deploying on Render (Free Web Service)
1. Push this repository to GitHub.
2. Sign up / Log in to [Render](https://render.com).
3. Create a **New Web Service** and link your `monopoly-be` repository.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Environment Variables:
   - `PORT`: `2567` (or let Render assign its default `10000`, Render injects `PORT`)
   - `NODE_ENV`: `production`
6. Once deployed, Render will provide a public URL like `https://monopoly-be-xxxx.onrender.com`.
7. Your frontend can connect to `wss://monopoly-be-xxxx.onrender.com`.
