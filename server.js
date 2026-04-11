require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const app = require("./src/app");
const config = require("./src/config");
const redis = require("./src/services/redis");
const setupScanSocket = require("./src/socket/scan.socket");
const setupRecognitionSocket = require("./src/socket/recognition.socket");
const setupRecipesSocket = require("./src/socket/recipes.socket");
const scanService = require("./src/services/scan.service");
const recognitionService = require("./src/services/recognition.service");
const recipeService = require("./src/services/recipe.service");

const server = http.createServer(app);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

setupScanSocket(io);
setupRecognitionSocket(io);
setupRecipesSocket(io);
scanService.setIo(io);
recognitionService.setIo(io);
recipeService.setIo(io);

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("[MongoDB] Connected");

    await redis.connect();

    server.listen(config.port, () => {
      console.log(`[Server] Running on port ${config.port} (${config.env})`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err.message);
    process.exit(1);
  }
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`[Server] ${signal} received, shutting down...`);
  server.close(async () => {
    try {
      await redis.disconnect();
      await mongoose.disconnect();
      console.log("[Server] Clean shutdown complete");
      process.exit(0);
    } catch (err) {
      console.error("[Server] Error during shutdown:", err.message);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
