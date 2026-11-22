import React,{useEffect,useState} from 'react';
import {GearSix,SlidersHorizontal,FolderSimple,X} from '@phosphor-icons/react';
import {ModelSettings,Profiles} from './ModelSettings';
import {rpc} from './bridge';

const sections=[
 {id:'models',label:'模型设置',Icon:SlidersHorizontal},
 {id:'explorer',label:'资源管理器',Icon:FolderSimple},
] as const;
export type SettingsPage=(typeof sections)[number]['id'];

export function SettingsPanel({page,navigate,onClose,onSave}:{page:SettingsPage,navigate:(p:SettingsPage)=>void,onClose:()=>void,onSave:(v:Profiles)=>void}){
 const [enabled,setEnabled]=useState<boolean|null>(null),[error,setError]=useState('');
 useEffect(()=>{
   let live=true;
   rpc<boolean>('menu').then(v=>{if(live)setEnabled(v)}).catch(e=>{if(live)setError(e.message)});
   return ()=>{live=false};
 },[]);
 async function changeMenu(){
   const previous=enabled;
   setEnabled(null);
   setError('');
   try{setEnabled(await rpc<boolean>('setMenu',{value:previous?'off':'on'}));}
   catch(e:any){setError(e.message);setEnabled(previous);}
 }
 return <div className="settings-layout">
   <div className="settings-nav">
     <div className="settings-heading" id="settings-heading"><GearSix size={18}/>设置</div>
     <nav aria-label="设置分类">
       {sections.map(({id,label,Icon})=><button key={id} aria-current={page===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={17}/>{label}</button>)}
     </nav>
   </div>
   <div className="settings-content">
     <button className="iconbtn settings-close" title="关闭设置" aria-label="关闭设置" onClick={onClose}><X size={18}/></button>
     <section hidden={page!=='models'}>
       <h2>模型设置</h2>
       <ModelSettings onSave={onSave}/>
     </section>
     <section className="explorer-settings" hidden={page!=='explorer'}>
       <h2>资源管理器</h2>
       <label className="setting-option">
         <span>右键菜单<small>右键文件、文件夹或目录空白处，选择「显示更多选项」→「Folio · 修改备注」</small></span>
         <input type="checkbox" role="switch" aria-label="右键菜单显示修改备注" disabled={enabled===null} checked={enabled===true} onChange={changeMenu}/>
       </label>
       {error&&<div role="alert" className="error">{error}</div>}
     </section>
   </div>
 </div>;
}
