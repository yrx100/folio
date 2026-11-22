const w=(window as any).chrome.webview, pending=new Map<number,{resolve:Function,reject:Function}>();let seq=0;
w.addEventListener('message',(event:any)=>{const m=event.data,p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.ok?p.resolve(m.value):p.reject(new Error(m.error));});
export function rpc<T=any>(op:string,args:any={}):Promise<T>{return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});w.postMessage({id,op,...args});});}
