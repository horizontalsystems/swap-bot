import net from 'net'
import { EventEmitter } from 'events'

// Minimal newline-delimited JSON-RPC 2.0 client for `signal-cli daemon --tcp`.
//
// signal-cli's JSON-RPC daemon speaks one JSON object per line over a TCP
// socket. We send `send` requests and receive `receive` notifications for
// incoming messages — the same shape as the SimpleX CLI websocket the other
// bot uses, just over a raw socket.

export interface SignalEnvelope {
  source?: string
  sourceNumber?: string | null
  sourceUuid?: string | null
  sourceName?: string
  timestamp?: number
  dataMessage?: {
    timestamp?: number
    message?: string | null
    expiresInSeconds?: number
    attachments?: unknown[]
    groupInfo?: unknown
  }
  // Present for typing indicators, receipts, sync messages, etc. — ignored.
  typingMessage?: unknown
  receiptMessage?: unknown
  syncMessage?: unknown
}

export interface SignalReceiveParams {
  envelope: SignalEnvelope
  account?: string
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

interface JsonRpcMessage {
  jsonrpc?: string
  id?: string | number
  method?: string
  params?: unknown
  result?: unknown
  error?: { code?: number; message?: string; data?: unknown }
}

export declare interface SignalRpcClient {
  on(event: 'message', listener: (params: SignalReceiveParams) => void): this
  on(event: 'close', listener: () => void): this
  on(event: 'error', listener: (err: Error) => void): this
}

export class SignalRpcClient extends EventEmitter {
  private socket: net.Socket
  private buffer = ''
  private nextId = 1
  private pending = new Map<string | number, PendingRequest>()
  private readonly account?: string
  connected = false

  constructor(
    private readonly host: string,
    private readonly port: number,
    account?: string
  ) {
    super()
    this.account = account
    this.socket = new net.Socket()
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const onConnectError = (err: Error) => reject(err)
      this.socket.once('error', onConnectError)

      this.socket.connect(this.port, this.host, () => {
        this.socket.off('error', onConnectError)
        this.socket.setEncoding('utf8')
        this.connected = true

        this.socket.on('data', (chunk: string) => this.onData(chunk))
        this.socket.on('error', (err: Error) => this.emit('error', err))
        this.socket.on('close', () => {
          this.connected = false
          this.rejectAllPending(new Error('Connection closed'))
          this.emit('close')
        })

        resolve()
      })
    })
  }

  private onData(chunk: string): void {
    this.buffer += chunk
    let newlineIdx: number
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim()
      this.buffer = this.buffer.slice(newlineIdx + 1)
      if (!line) continue

      let msg: JsonRpcMessage
      try {
        msg = JSON.parse(line)
      } catch {
        console.error('[Signal] Failed to parse JSON-RPC message')
        continue
      }
      this.handleMessage(msg)
    }
  }

  private handleMessage(msg: JsonRpcMessage): void {
    // Response to one of our requests.
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.pending.get(msg.id)
      if (!pending) return
      this.pending.delete(msg.id)
      if (msg.error) {
        pending.reject(new Error(msg.error.message ?? JSON.stringify(msg.error)))
      } else {
        pending.resolve(msg.result)
      }
      return
    }

    // Incoming message notification.
    if (msg.method === 'receive' && msg.params) {
      this.emit('message', msg.params as SignalReceiveParams)
    }
  }

  private rejectAllPending(err: Error): void {
    for (const pending of this.pending.values()) pending.reject(err)
    this.pending.clear()
  }

  private request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to signal-cli daemon'))
        return
      }
      const id = this.nextId++
      const finalParams: Record<string, unknown> = { ...params }
      if (this.account && finalParams.account === undefined) finalParams.account = this.account

      const payload = { jsonrpc: '2.0', id, method, params: finalParams }
      this.pending.set(id, { resolve, reject })

      this.socket.write(JSON.stringify(payload) + '\n', (err?: Error | null) => {
        if (err) {
          this.pending.delete(id)
          reject(err)
        }
      })
    })
  }

  /**
   * Send a message to a recipient (phone number or UUID). `attachments` are
   * local file paths; signal-cli reads and uploads them.
   */
  async sendMessage(recipient: string, message: string, attachments?: string[]): Promise<void> {
    const params: Record<string, unknown> = { recipient: [recipient], message }
    if (attachments && attachments.length) params.attachments = attachments
    await this.request('send', params)
  }

  disconnect(): void {
    try {
      this.socket.end()
    } catch {
      /* ignore */
    }
    try {
      this.socket.destroy()
    } catch {
      /* ignore */
    }
  }
}
