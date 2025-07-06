export interface ObservationEvent {
  type: string;
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ObservationBusConfig {
  endpoint?: string;
  batchSize?: number;
  flushInterval?: number;
}

export class ObservationBus {
  private events: ObservationEvent[] = [];
  private config: ObservationBusConfig;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: ObservationBusConfig = {}) {
    this.config = {
      batchSize: 10,
      flushInterval: 5000,
      ...config
    };
    this.startAutoFlush();
  }

  info(type: string, data: any, metadata?: Record<string, any>) {
    const event: ObservationEvent = {
      type,
      data,
      timestamp: Date.now(),
      metadata
    };
    
    this.events.push(event);
    console.log('[ObservationBus]', type, data);
    
    if (this.events.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  private async flush() {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    // TODO: Send to backend when endpoint is configured
    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: eventsToSend })
        });
      } catch (error) {
        console.error('[ObservationBus] Failed to send events:', error);
        // Re-queue failed events
        this.events.unshift(...eventsToSend);
      }
    }
  }

  private startAutoFlush() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval!);
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

export interface ActionHandler<T = any> {
  (data: T): void | Promise<void>;
}

export interface ActionBusConfig {
  endpoint: string;
  reconnectInterval?: number;
}

export class ActionBus {
  private eventSource?: EventSource;
  private handlers = new Map<string, Set<ActionHandler>>();
  private config: ActionBusConfig;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(endpoint: string | ActionBusConfig) {
    this.config = typeof endpoint === 'string' 
      ? { endpoint, reconnectInterval: 5000 }
      : { reconnectInterval: 5000, ...endpoint };
    
    this.connect();
  }

  private connect() {
    try {
      this.eventSource = new EventSource(this.config.endpoint);
      
      this.eventSource.onopen = () => {
        console.log('[ActionBus] Connected to', this.config.endpoint);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = undefined;
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[ActionBus] Connection error:', error);
        this.scheduleReconnect();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          this.emit(type, data);
        } catch (error) {
          console.error('[ActionBus] Failed to parse message:', error);
        }
      };
    } catch (error) {
      console.error('[ActionBus] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, this.config.reconnectInterval);
  }

  onEvent<T = any>(eventType: string, handler: ActionHandler<T>) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  private async emit(eventType: string, data: any) {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;
    
    console.log('[ActionBus] Emitting', eventType, data);
    
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`[ActionBus] Handler error for ${eventType}:`, error);
      }
    }
  }

  destroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.handlers.clear();
  }
}

// Factory functions for cleaner API
export const createObservationBus = (config?: ObservationBusConfig) => new ObservationBus(config);
export const createActionBus = (endpoint: string | ActionBusConfig) => new ActionBus(endpoint);