type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

interface HostBridge {
  postMessage: (msg: unknown) => void;
  addEventListener: (type: 'message', listener: (event: any) => void) => void;
  removeEventListener: (type: 'message', listener: (event: any) => void) => void;
}

function getBridge(): HostBridge | null {
  return (window as any)?.chrome?.webview ?? null;
}

const pending = new Map<number, PendingRequest>();
let sequence = 0;
let initialized = false;

function ensureListener(bridge: HostBridge) {
  if (initialized) return;
  initialized = true;
  bridge.addEventListener('message', (event: any) => {
    const message = event?.data;
    if (!message || typeof message.id !== 'number') return;
    const req = pending.get(message.id);
    if (!req) return;
    pending.delete(message.id);
    if (message.ok) req.resolve(message.value);
    else req.reject(new Error(message.error || '操作失败'));
  });
}

export function rpc<T = any>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const bridge = getBridge();
  if (!bridge) {
    return Promise.reject(new Error('未连接到 Folio 桌面宿主环境。'));
  }
  ensureListener(bridge);
  return new Promise<T>((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    bridge.postMessage({ id, op, ...args });
  });
}

export function onHostEvent(handler: (data: any) => void): () => void {
  const bridge = getBridge();
  if (!bridge) return () => {};
  const listener = (event: any) => {
    if (event?.data?.event) handler(event.data);
  };
  bridge.addEventListener('message', listener);
  return () => bridge.removeEventListener('message', listener);
}
