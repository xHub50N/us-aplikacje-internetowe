import type { Response } from 'express';

interface SSEClient {
  id: string;
  userId: number;
  res: Response;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Co 25 sekund keep-alive ping dla zapobiegania timeoutom w przeglądarkach/proxy
    this.keepAliveInterval = setInterval(() => {
      this.pingAll();
    }, 25000);

    // Unikamy blokowania zamykania procesu przez timer
    if (this.keepAliveInterval.unref) {
      this.keepAliveInterval.unref();
    }
  }

  public addClient(clientId: string, userId: number, res: Response): void {
    this.clients.set(clientId, { id: clientId, userId, res });
  }

  public removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  public pingAll(): void {
    for (const client of this.clients.values()) {
      try {
        client.res.write(': keepalive\n\n');
      } catch {
        this.clients.delete(client.id);
      }
    }
  }

  public broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      try {
        client.res.write(payload);
      } catch {
        this.clients.delete(client.id);
      }
    }
  }

  public broadcastToUser(userId: number, event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch {
          this.clients.delete(client.id);
        }
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
