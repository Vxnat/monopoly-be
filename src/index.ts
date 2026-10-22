import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { MonopolyRoom } from './rooms/MonopolyRoom';

dotenv.config();

// Compatibility patch for Colyseus client SDKs expecting `response.room`
const originalInvoke = matchMaker.controller.invokeMethod.bind(matchMaker.controller);
matchMaker.controller.invokeMethod = async function (
  method: any,
  roomName: any,
  clientOptions: any,
  authOptions: any
) {
  const result: any = await originalInvoke(method, roomName, clientOptions, authOptions);
  if (result && !result.room && result.name && result.roomId) {
    result.room = {
      name: result.name,
      roomId: result.roomId,
      processId: result.processId,
    };
  }
  return result;
};

const port = Number(process.env.PORT || 2567);
const httpServer = http.createServer();

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
  express: (app) => {
    app.use(cors({
      origin: (origin, callback) => {
        // Cho phép mọi origin (localhost, *.trycloudflare.com, *.vercel.app, mobile, v.v.)
        callback(null, true);
      },
      credentials: true,
    }));
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        game: 'Monopoly 3D Authoritative Multiplayer Server',
        timestamp: new Date().toISOString(),
      });
    });
  },
});

// Register Monopoly Room handler
gameServer.define('monopoly_room', MonopolyRoom);

gameServer.listen(port).then(() => {
  console.log(`🎩 [Monopoly Server] Running at http://localhost:${port}`);
  console.log(`🔌 [WebSocket] Colyseus room 'monopoly_room' ready for connections!`);
}).catch((err) => {
  console.error('❌ Failed to start server:', err);
});
