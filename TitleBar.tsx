import React,{useEffect,useState} from 'react';
import {Minus,Square,CopySimple,X} from '@phosphor-icons/react';
import {rpc} from './bridge';

export function TitleBar({children,quick=false}:{children?:React.ReactNode,quick?:boolean}){
 const [maximized,setMaximized]=useState(false);
 useEffect(()=>{
   const bridge=(window as any).chrome.webview;
   const sync=(event:any)=>{if(event.data?.event==='windowState')setMaximized(event.data.maximized);};
   bridge.addEventListener('message',sync);
   rpc<boolean>('window').then(setMaximized);
   return ()=>bridge.removeEventListener('message',sync);
 },[]);
 const resizeLabel=maximized?'还原窗口':'最大化窗口';
 return <header className="titlebar">{children||<strong className="quick-title">修改备注</strong>}
   <div className="drag-space" aria-hidden="true"/>
   <div className="window-buttons">
     <button title="最小化窗口" aria-label="最小化窗口" onClick={()=>rpc('window',{value:'minimize'})}><Minus/></button>
     {!quick&&<button title={resizeLabel} aria-label={resizeLabel} onClick={()=>rpc('window',{value:'maximize'})}>{maximized?<CopySimple/>:<Square/>}</button>}
     <button className="window-close" title="关闭窗口" aria-label="关闭窗口" onClick={()=>rpc('close')}><X/></button>
   </div>
 </header>;
}
