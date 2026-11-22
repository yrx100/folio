import React,{useEffect,useRef,useState} from 'react';
import {Columns} from '@phosphor-icons/react';
import {rpc} from './bridge';

type ColumnAction='Detect'|'Enable'|'Disable';

export function CommentColumnControl({path,onError}:{path:string,onError:(error:Error)=>void}){
 const [enabled,setEnabled]=useState<boolean|null>(null);
 const [busy,setBusy]=useState(false);
 const request=useRef(0);
 const changing=useRef(false);
 useEffect(()=>{
   const bridge=(window as any).chrome.webview;
   function check(){
     if(changing.current)return;
     const id=++request.current;
     rpc<boolean|null>('commentColumn',{path,value:'Check'}).then(state=>{
       if(id===request.current)setEnabled(state);
     }).catch(()=>{if(id===request.current)setEnabled(null);});
   }
   const onMessage=(event:any)=>{if(event.data?.event==='activate')check();};
   check();
   bridge.addEventListener('message',onMessage);
   return ()=>{request.current++;bridge.removeEventListener('message',onMessage);};
 },[path]);
 async function update(action:ColumnAction){
   if(changing.current)return;
   changing.current=true;
   const id=++request.current;
   setBusy(true);
   try{
     const state=await rpc<boolean|null>('commentColumn',{path,value:action});
     if(id===request.current)setEnabled(state);
   }catch(error:any){
     if(id===request.current){setEnabled(null);onError(error);}
   }finally{
     changing.current=false;
     if(id===request.current)setBusy(false);
   }
 }
 const action=enabled===null?'Detect':enabled?'Disable':'Enable';
 const status=enabled===null?'检测备注列是否开启':enabled?'备注列已开启':'检测到备注列未开启';
 return <div className="column-control" role="group" aria-label="资源管理器备注列">
   <Columns size={16} aria-hidden="true"/>
   <span role="status">{busy?'正在读取视图…':status}</span>
   <button type="button" className={'column-button'+(action==='Enable'?' column-enable':'')} disabled={busy}
     title={action==='Detect'?'打开当前目录的资源管理器并检测备注列':action==='Enable'?'在当前目录的资源管理器中开启备注列':'在当前目录的资源管理器中关闭备注列'}
     onClick={()=>update(action)}>{action==='Detect'?'检测':action==='Enable'?'开启':'一键关闭'}</button>
 </div>;
}
