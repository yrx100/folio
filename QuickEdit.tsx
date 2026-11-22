import React,{useEffect,useRef,useState} from 'react';
import {MagicWand,FolderSimple,FileText,SlidersHorizontal} from '@phosphor-icons/react';
import {rpc} from './bridge';
import {ModelSettings,Profiles} from './ModelSettings';
export type Boot={quick:boolean,dir:boolean,root:string,settings:Profiles};
export function QuickEdit({boot}:{boot:Boot}){
 const {root,dir}=boot,[old,O]=useState(''),[text,T]=useState(''),[loaded,L]=useState(false),[working,W]=useState(''),[settings,S]=useState(false),[error,E]=useState('');
 const resume=useRef(false),box=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{rpc<Record<string,string|null>>('notes',{path:root,paths:[root]}).then(v=>{if(v[root]==null)throw Error('无法读取此项备注。');O(v[root]!);T(v[root]!);L(true);}).catch(e=>E(e.message));},[]);
 useEffect(()=>{rpc('dirty',{value:old!==text?'1':'0'}).catch(()=>{});},[old,text]);
 async function generate(){if(working)return;W('生成中…');E('');try{T(await rpc<string>('suggest',{path:root}));box.current?.focus();}catch(e:any){E(e.message);}finally{W('')}}
 async function start(){try{const p=await rpc<Profiles>('getSettings');if(p.ready)await generate();else{resume.current=true;S(true);}}catch(e:any){E(e.message)}}
 async function save(){if(working||!loaded)return;W('保存中…');try{await rpc('save',{path:root,original:old,value:text});O(text);await rpc('close');}catch(e:any){E(e.message);W('')}}
 if(settings)return <section className="quick quick-settings"><h2>模型设置</h2><ModelSettings onCancel={()=>{resume.current=false;S(false)}} onSave={v=>{S(false);if(resume.current){resume.current=false;if(v.ready)generate();else E('请先配置密钥。')}}}/></section>;
 return <section className="quick"><header>{dir?<FolderSimple size={25} weight="duotone"/>:<FileText size={25}/>}<div><h2>{root.split('\\').filter(Boolean).pop()||root}</h2><small title={root}>{root}</small></div><button className="iconbtn" title="模型设置" aria-label="模型设置" disabled={!!working} onClick={()=>S(true)}><SlidersHorizontal size={18}/></button></header>
 <div className="quick-label"><b>备注</b>{working==='生成中…'?<button className="quiet" onClick={()=>rpc('cancel')}>取消生成</button>:<button className="ai-btn" disabled={!loaded||!!working} onClick={start}><MagicWand size={16}/>AI 生成备注</button>}</div>
 <textarea aria-label="备注内容" ref={box} autoFocus value={text} disabled={!loaded||!!working} maxLength={dir?200:2000} placeholder="添加一条备注…" onChange={e=>T(e.target.value)} onKeyDown={e=>{if(e.ctrlKey&&e.key==='Enter')save()}}/>
 <div role="status" className={error?'error':'quick-info'}>{error||working||(dir?'保存后可在资源管理器的「备注」列查看。':'文件备注保存在本机。')}</div>
 <div className="modalactions"><button className="quiet" onClick={()=>rpc('close')}>关闭</button><button className="primary" disabled={!loaded||!!working||text.length>(dir?200:2000)} onClick={save}>保存备注</button></div></section>;
}
