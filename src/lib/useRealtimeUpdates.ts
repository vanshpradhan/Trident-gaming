import { useEffect, useRef, useCallback } from "react";
import { api } from "./api";

// ─── SSE Event Types ────────────────────────────────────────────────────

export type SSEEventType =
  | "connected"
  | "booking:created"
  | "booking:cancelled"
  | "order:created"
  | "order:updated"
  | "console:updated"
  | "console:added"
  | "console:removed"
  | "session:ended"
  | "snack:added"
  | "snack:updated"
  | "snack:removed"
  | "pricing:added"
  | "pricing:updated"
  | "pricing:removed";

type EventHandler = (data: any) => void;

// ─── useRealtimeUpdates Hook ────────────────────────────────────────────
// Connects to the SSE endpoint and triggers callbacks on specific events.
// Automatically reconnects on disconnect with exponential backoff.

export function useRealtimeUpdates(
  handlers: Partial<Record<SSEEventType, EventHandler>>,
  enabled = true
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000); // Start with 1s, exponential backoff
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date without triggering reconnect
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (!enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const token = api.auth.getToken();
    // Build SSE URL with token as query param (SSE doesn't support custom headers)
    const url = token ? `/api/events?token=${encodeURIComponent(token)}` : "/api/events";

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      // Reset reconnect delay on successful connection
      reconnectDelayRef.current = 1000;
    };

    // Register all known event types
    const eventTypes: SSEEventType[] = [
      "connected",
      "booking:created",
      "booking:cancelled",
      "order:created",
      "order:updated",
      "console:updated",
      "console:added",
      "console:removed",
      "session:ended",
      "snack:added",
      "snack:updated",
      "snack:removed",
      "pricing:added",
      "pricing:updated",
      "pricing:removed",
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          handlersRef.current[eventType]?.(data);
        } catch {
          // Ignore parse errors
        }
      });
    }

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(reconnectDelayRef.current, 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, 30000);
        connect();
      }, delay);
    };
  }, [enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
}

// ─── Convenience: useRefreshOn ──────────────────────────────────────────
// Simple hook that calls a refresh function when any of the specified events fire.

export function useRefreshOn(
  refreshFn: () => void,
  events: SSEEventType[],
  enabled = true
) {
  const handlers: Partial<Record<SSEEventType, EventHandler>> = {};
  for (const event of events) {
    handlers[event] = () => refreshFn();
  }
  useRealtimeUpdates(handlers, enabled);
}
