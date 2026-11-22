import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

export function RowAction({kind,label,hint,disabled,onClick,children}:{
 kind:'edit'|'ai',label:string,hint:string,disabled:boolean,onClick:()=>void,children:React.ReactNode
}){
 const [anchor,setAnchor]=useState<{x:number,y:number}|null>(null);
 function show(button:HTMLButtonElement){
   const rect=button.getBoundingClientRect();
   setAnchor({x:rect.right,y:rect.top});
 }
 useEffect(()=>{
   if(!anchor)return;
   const hide=()=>setAnchor(null);
   const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape')hide();};
   window.addEventListener('scroll',hide,true);
   window.addEventListener('resize',hide);
   window.addEventListener('keydown',dismiss);
   return ()=>{
     window.removeEventListener('scroll',hide,true);
     window.removeEventListener('resize',hide);
     window.removeEventListener('keydown',dismiss);
   };
 },[anchor]);
 return <button type="button" className={'row-action row-'+kind} aria-label={label} disabled={disabled}
   onPointerEnter={e=>show(e.currentTarget)} onPointerLeave={()=>setAnchor(null)}
   onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))show(e.currentTarget);}} onBlur={()=>setAnchor(null)}
   onClick={()=>{setAnchor(null);onClick();}}>
   {children}
   {anchor&&!disabled&&createPortal(<span className="row-tooltip" role="tooltip"
     style={{right:window.innerWidth-anchor.x,top:anchor.y-6}}>{hint}</span>,document.body)}
 </button>;
}
