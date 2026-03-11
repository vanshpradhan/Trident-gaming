import { Response } from "express";

// ─── Server-Sent Events (SSE) Infrastructure ──────────────────────────
// Manages connected SSE clients and broadcasts real-time updates.

interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
  role?: string;
}

const clients: Map<string, SSEClient> = new Map();
let clientIdCounter = 0;

/**
 * Register a new SSE client connection.
 * Sets up proper headers and heartbeat, returns a cleanup function.
 */
export function addClient(res: Response, userId?: string, role?: string): () => void {
  const clientId = `sse_${++clientIdCounter}_${Date.now()}`;

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

  const client: SSEClient = { id: clientId, res, userId, role };
  clients.set(clientId, client);

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      cleanup();
    }
  }, 30000);

  function cleanup() {
    clearInterval(heartbeat);
    clients.delete(clientId);
  }

  // Clean up on client disconnect
  res.on("close", cleanup);
  res.on("error", cleanup);

  return cleanup;
}

/**
 * Broadcast an event to all connected SSE clients.
 * Optionally filter by role ('admin' | 'customer' | undefined for all).
 */
export function broadcast(event: string, data: Record<string, any>, targetRole?: string): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const [, client] of clients) {
    try {
      // If targetRole specified, only send to matching role (or if client role is unknown, send anyway)
      if (targetRole && client.role && client.role !== targetRole) continue;
      client.res.write(payload);
    } catch {
      // Client disconnected, will be cleaned up by the close/error handler
    }
  }
}

/**
 * Send an event to a specific user's SSE connection(s).
 */
export function sendToUser(userId: string, event: string, data: Record<string, any>): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const [, client] of clients) {
    if (client.userId === userId) {
      try {
        client.res.write(payload);
      } catch {
        // Will be cleaned up
      }
    }
  }
}

/**
 * Get count of connected clients (for monitoring).
 */
export function getClientCount(): number {
  return clients.size;
}
