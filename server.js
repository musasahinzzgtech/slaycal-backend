require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const app = require("./src/app");
const config = require("./src/config");
const setupScanSocket = require("./src/socket/scan.socket");
const scanService = require("./src/services/scan.service");

const server = http.createServer(app);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

setupScanSocket(io);
scanService.setIo(io); // inject io so scan service can emit events

// ─── DATABASE ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("[MongoDB] Connected");

    server.listen(config.port, () => {
      console.log(`[Server] Running on port ${config.port} (${config.env})`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM received, shutting down...");
  server.close(() => process.exit(0));
});

start();
