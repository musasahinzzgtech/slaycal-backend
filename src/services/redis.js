const Redis = require('ioredis');
const config = require('../config');

let client = null;

/**
 * Returns the singleton ioredis client.
 * The client is created lazily on first call and reused thereafter.
 */
function getClient() {
  if (client) return client;

  client = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => console.log('[Redis] Connected'));
  client.on('ready', () => console.log('[Redis] Ready'));
  client.on('error', (err) => console.error('[Redis] Error:', err.message));
  client.on('close', () => console.log('[Redis] Connection closed'));
  client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

  return client;
}

/** Called during server bootstrap to verify connectivity. */
async function connect() {
  await getClient().ping();
}

/** Called during graceful shutdown. */
async function disconnect() {
  if (client) {
    await client.quit();
    client = null;
    console.log('[Redis] Disconnected');
  }
}

module.exports = { getClient, connect, disconnect };
