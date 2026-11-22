import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FolderSimple,FileText,FileCode,FileImage,File,FolderOpen,Plus,CaretRight,CaretDown,ArrowClockwise,SlidersHorizontal,MagnifyingGlass,SidebarSimple,GearSix,Question,NotePencil,TextAlignLeft,ArrowUpRight,ArrowLeft,ArrowRight,Check,X,HardDrive,ArrowsClockwise,MagicWand,Keyboard,ArrowElbowDownLeft} from '@phosphor-icons/react';
import './style.css';
import {rpc} from './bridge';
import {SettingsPanel,SettingsPage} from './SettingsPanel';
import {TitleBar} from './TitleBar';
import {RowAction} from './RowAction';
import {CommentColumnControl} from './CommentColumnControl';
import {QuickEdit,Boot} from './QuickEdit';
import {Welcome} from './Welcome';
import {hasSeenGuide,showGuide} from './Guide';

type Item={name:string,path:string,dir:boolean,link:boolean};
type Notes=Record<string,string|null>; type Dialog='settings'|'edit'|'candidate'|'sending'|null;
const leaf=(path:string)=>path.split('\\').filter(Boolean).pop()||path;
const itemAt=(path:string):Item=>({path,name:leaf(path),dir:true,link:false});
const upper=(path:string,root:string)=>{if(path===root)return root;const parent=path.slice(0,path.lastIndexOf('\\'));return parent.length<root.length?root:parent;};
function Mark(){return <span className="mark" aria-hidden="true"><i/><b/><em/></span>}
function Glyph({item,open=false,size=19}:{item:Item,open?:boolean,size?:number}){const ext=item.name.split('.').pop()?.toLowerCase()||'';const I=item.dir?(open?FolderOpen:FolderSimple):/^(tsx?|jsx?|css|py|cs|json|html|cpp|rs)$/.test(ext)?FileCode:/^(png|jpe?g|webp|gif|svg)$/.test(ext)?FileImage:/^(md|txt|docx?|pdf)$/.test(ext)?FileText:File;return <I aria-hidden="true" weight={item.dir?'duotone':'regular'} size={size} className={item.dir?'folderglyph':'fileglyph'}/>;}
function IconBtn({label,onClick,children,disabled=false}:{label:string,onClick:()=>void,children:React.ReactNode,disabled?:boolean}){return <button className="iconbtn" title={label} aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>;}
function App({boot}:{boot:Boot}){
 const [root,R]=useState(''),[path,P]=useState(''),[side,S]=useState(true),[lists,L]=useState<Record<string,Item[]>>({}),[expanded,E]=useState<Set<string>>(new Set()),[notes,N]=useState<Notes>({});
 const [sel,U]=useState<Item|null>(null),[query,Q]=useState(''),[filter,F]=useState('全部'),[loading,B]=useState(false),[notice,Msg]=useState(''),[dlg,D]=useState<Dialog>(null);
 const [target,T]=useState<Item|null>(null),[draft,A]=useState(''),[before,O]=useState(''),[proposal,setProposal]=useState({text:'',generated:''}),[working,Busy]=useState(false),[err,Err]=useState('');
 const [inline,In]=useState<Item|null>(null),[scroll,Y]=useState(0),[height,H]=useState(500),[revision,Rev]=useState(0);
 const listRef=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),epoch=useRef(0),current=useRef(''),change=useRef(false),aiAfter=useRef<Item|null>(null),fetchId=useRef(0);
 const [settingsPage,settingsPageTo]=useState<SettingsPage>('models');
 const [undo,setUndo]=useState<{item:Item,previous:string,saved:string}|null>(null);
 const directory=path?itemAt(path):null,chosen=sel??directory,items=lists[path]||[];
 const dirty=dlg==='candidate'?proposal.text!==proposal.generated:Boolean(inline||dlg==='edit')&&draft!==before;
 useEffect(()=>{change.current=dirty;rpc('dirty',{value:dirty?'1':'0'}).catch(()=>{});},[dirty]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>Msg(''),4000);return()=>clearTimeout(t)},[notice]);
 function failure(e:any){Msg(e.message||String(e));}
 function leave(){return !change.current||window.confirm('放弃当前尚未保存的修改？');}
 function resetEdit(){In(null);D(null);Err('');change.current=false;}
 async function openDir(p:string,newRoot=false,force=false){
  if(!p||(!force&&!leave()))return;const version=++epoch.current;current.current=p;resetEdit();B(true);setUndo(null);if(newRoot){R(p);E(new Set([p]));L({});N({});}else E(old=>new Set([...old,p]));P(p);U(null);F('全部');Q('');Y(0);if(listRef.current)listRef.current.scrollTop=0;
  try{const data=await rpc<Item[]>('list',{path:p});if(epoch.current!==version)return;L(x=>({...x,[p]:data}));B(false);
   const all=[p,...data.filter(x=>!x.link).map(x=>x.path)];for(let i=0;i<all.length;i+=90){if(epoch.current!==version)return;const result=await rpc<Notes>('notes',{path:p,paths:all.slice(i,i+90)});if(epoch.current===version)N(n=>({...n,...result}));}
  }catch(e){if(epoch.current===version){B(false);failure(e);}}
 }
 useEffect(()=>{if(boot.root)openDir(boot.root,true,true);},[]);
 useEffect(()=>{const el=listRef.current;if(!el)return;const obs=new ResizeObserver(()=>H(el.clientHeight));obs.observe(el);return()=>obs.disconnect();},[path]);
 async function pick(){if(!leave())return;try{const v=await rpc<string>('pick');if(v)openDir(v,true,true);}catch(e){failure(e);}}
 const guide=useRef<ReturnType<typeof showGuide>|null>(null);
 function walkthrough(){if(!guide.current?.isActive())guide.current=showGuide(Boolean(path),pick);}
 useEffect(()=>{
  if(boot.root||hasSeenGuide())return;
  const frame=requestAnimationFrame(()=>{guide.current=showGuide(false,pick);});
  return ()=>{cancelAnimationFrame(frame);guide.current?.destroy();};
 },[]);
 async function toggle(i:Item){if(i.link)return;if(expanded.has(i.path)){E(s=>{const n=new Set(s);n.delete(i.path);return n;});return;}const ver=epoch.current;try{if(!lists[i.path]){const v=await rpc<Item[]>('list',{path:i.path});if(ver!==epoch.current)return;L(s=>({...s,[i.path]:v}));}E(s=>new Set([...s,i.path]));}catch(e){failure(e);}}
 function select(i:Item){if(inline&&!leave())return;if(inline)resetEdit();U(i);}
 async function edit(i:Item|null,mode:'edit'|'inline'|'ai'){
  if(!i||i.link||!leave())return;const id=++fetchId.current;const ver=epoch.current;

  try{const r=await rpc<Notes>('notes',{path:i.path,paths:[i.path]});if(id!==fetchId.current||ver!==epoch.current)return;const v=r[i.path];if(v==null)throw Error('此项备注暂时无法读取。');
   In(null);Err('');T(i);A(v);O(v);N(n=>({...n,[i.path]:v}));if(mode==='inline'){U(i);In(i);D(null);}else if(mode==='edit')D('edit');else await startAI(i);
  }catch(e){failure(e);}
 }
 function settings(page:SettingsPage='models'){settingsPageTo(page);Err('');D('settings');}
 async function startAI(item:Item){
  const request=fetchId.current,version=epoch.current;
  try{
   const profile=await rpc('getSettings');
   if(request!==fetchId.current||version!==epoch.current)return;
   if(!profile.ready){aiAfter.current=item;settings('models');return;}
   await generate(item);
  }catch(e){failure(e);}
 }
 async function generate(item:Item){
  if(working)return;
  Busy(true);D('sending');Err('');
  try{
   const generated=await rpc<string>('suggest',{path:item.path});
   setProposal({text:generated,generated});D('candidate');
  }catch(e:any){Err(e.message);D('edit');}
  finally{Busy(false);}
 }
 async function undoRow(){
  if(!undo||working)return;Busy(true);
  try{const v=await rpc<string>('save',{path:undo.item.path,value:undo.previous,original:undo.saved});
   N(n=>({...n,[undo.item.path]:v}));setUndo(null);Msg('已撤销 '+undo.item.name+' 的 AI 备注');
  }catch(e){failure(e);}finally{Busy(false);}
 }
 async function save(value:string){
  if(!target||working)return;
  const fromAI=dlg==='candidate';
  Busy(true);Err('');
  try{
   const saved=await rpc<string>('save',{path:target.path,value,original:before});
   N(n=>({...n,[target.path]:saved}));
   if(fromAI&&saved!==before)setUndo({item:target,previous:before,saved});
   else if(undo?.item.path===target.path)setUndo(null);
   resetEdit();Msg('已保存「'+target.name+'」的备注');
  }catch(e:any){Err(e.message);if(inline)Msg(e.message);}
  finally{Busy(false);}
 }
 function close(){if(working||dlg==='sending'||!leave())return;aiAfter.current=null;resetEdit();}
 useEffect(()=>{const handle=(e:KeyboardEvent)=>{if(guide.current?.isActive())return;if(e.key==='Escape'){if(dlg||inline)close();else{Q('');U(null);}e.preventDefault();}else if(e.ctrlKey&&e.key.toLowerCase()==='s'&&(dlg==='edit'||dlg==='candidate'||inline)){e.preventDefault();save(dlg==='candidate'?proposal.text:draft);}else if(e.ctrlKey&&e.key.toLowerCase()==='f'&&!dlg){e.preventDefault();search.current?.focus();}else if(e.key==='F5'&&!dlg){e.preventDefault();openDir(path);}};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);});
 const shade=useRef<HTMLDialogElement>(null);useEffect(()=>{const el=shade.current;if(!el)return;if(dlg&&!el.open)el.showModal();if(!dlg&&el.open)el.close();if(dlg==='edit')el.querySelector('textarea')?.focus();},[dlg]);
 const visible=React.useMemo(()=>items.filter(i=>{const n=notes[i.path];return (filter==='全部'||(filter==='有备注'?Boolean(n):n===''))&&(!query||(i.name+' '+(n||'')).toLowerCase().includes(query.toLowerCase()));}),[items,filter,query,notes]);
 useEffect(()=>{
   const bridge=(window as any).chrome.webview;
   const reloadNotes=async(event:any)=>{
     if(event.data?.event!=='activate'||!path||dlg||inline)return;
     const version=epoch.current, paths=[path,...items.filter(i=>!i.link).map(i=>i.path)];
     try{for(let index=0;index<paths.length;index+=90){if(version!==epoch.current)return;
       const fresh=await rpc<Notes>('notes',{path,paths:paths.slice(index,index+90)});
       if(version===epoch.current)N(n=>({...n,...fresh}));
     }}catch(e){failure(e);}
   };
   bridge.addEventListener('message',reloadNotes);return()=>bridge.removeEventListener('message',reloadNotes);
 },[path,lists,dlg,inline]);
 const rowH=56,first=Math.max(0,Math.min(Math.floor(scroll/rowH)-5,Math.max(0,visible.length-1))),last=Math.min(visible.length,first+Math.ceil(height/rowH)+12);
 function tree(i:Item,level=0):React.ReactNode{const active=i.path===path,c=openTree(i);return <React.Fragment key={i.path}><div role="treeitem" aria-level={level+1} aria-expanded={i.dir?c:undefined} aria-selected={active} className={'treerow '+(active?'active':'')+(i.link?' link':'')} style={{'--depth':level} as React.CSSProperties}>
  {i.dir&&!i.link?<button className={'branch '+(c?'expanded':'')} aria-label={(c?'折叠 ':'展开 ')+i.name} onClick={()=>toggle(i)}><CaretRight weight="bold" size={11}/></button>:<span className="branch"/>}
  <button className="treename" title={i.path} disabled={i.link} onClick={()=>i.dir?openDir(i.path):edit(i,'edit')}><Glyph item={i} size={17} open={active}/><span>{i.name}</span></button></div>
  {c&&level<80&&(lists[i.path]||[]).slice(0,treeLimits[i.path]||120).map(x=>tree(x,level+1))}
  {c&&(lists[i.path]?.length||0)>(treeLimits[i.path]||120)&&<button className="more" onClick={()=>limits(v=>({...v,[i.path]:(v[i.path]||120)+120}))}>更多项目…</button>}</React.Fragment>}
 const [treeLimits,limits]=useState<Record<string,number>>({});function openTree(i:Item){return i.dir&&expanded.has(i.path);}
 const folders=items.filter(i=>i.dir).length;
 function updateFilter(v:string){if(!leave())return;resetEdit();F(v);U(null);if(listRef.current)listRef.current.scrollTop=0;}
 const crumbs=root?[{name:leaf(root),path:root}]:[];
 for(const part of path.slice(root.length).split('\\').filter(Boolean)){
   crumbs.push({name:part,path:crumbs[crumbs.length-1].path.replace(/\\$/,'')+'\\'+part});
 }
 const directoryNote=notes[path];
 const disabled=!directory||working;
 return <div className={'shell'+(!side?' no-side':'')+(!path?' empty-workspace':'')}>
 <TitleBar>
   <IconBtn label={side?'收起侧栏':'展开侧栏'} onClick={()=>S(!side)}><SidebarSimple size={19}/></IconBtn>
   <div className="bar-separator"/>
   <div className="crumb" role="navigation" aria-label="目录路径" title={path}><HardDrive size={15}/>{!path&&<span>工作区</span>}
    {crumbs.map((c,index)=><React.Fragment key={c.path}>{index>0&&<CaretRight size={10}/>}<button aria-current={c.path===path?'page':undefined} title={c.path} onClick={()=>openDir(c.path)}>{c.name}</button></React.Fragment>)}
   </div>
   <div className="bar-separator"/>
   <IconBtn label="上一级目录" disabled={!path||path===root} onClick={()=>openDir(upper(path,root))}><ArrowLeft size={15}/></IconBtn>
   <IconBtn label="打开工作目录" onClick={pick}><FolderOpen size={16}/></IconBtn>
   <IconBtn label="刷新目录 (F5)" onClick={()=>openDir(path)} disabled={!path}><ArrowClockwise size={16}/></IconBtn>
 </TitleBar>
 <aside inert={!side}><div className="sidebar-inner"><div className="brand"><Mark/><strong>Folio</strong></div><button className="workspace" data-tour="switch" onClick={pick} title="切换工作目录"><span className="drive"><HardDrive size={21} weight="duotone"/></span><span><b>{root?leaf(root):'打开目录'}</b><small>{root||'选择工作目录'}</small></span><FolderOpen size={17}/></button>
 {root&&<><div className="side-heading">目录树<IconBtn label="打开工作目录" onClick={pick}><Plus size={14}/></IconBtn></div><nav role="tree" aria-label="目录结构">{tree(itemAt(root))}</nav></>}
 <div className="sidebar-footer"><button className="settings" data-tour="settings" onClick={()=>{if(!leave())return;resetEdit();aiAfter.current=null;settings()}}><GearSix size={18}/>设置</button>{path&&<IconBtn label="快速上手" onClick={walkthrough}><Question size={17}/></IconBtn>}</div></div></aside>
 <main>
 {!path?<Welcome onOpen={pick} onTour={walkthrough}/>:<>
 <section className="intro"><div className="hero"><FolderOpen size={24} aria-hidden="true"/><div><h1 title={path}>{path?leaf(path):'项目目录'}</h1><div className="meta">{path?(loading?'正在读取目录…':folders+' 个文件夹 · '+(items.length-folders)+' 个文件'):'选择本地工作目录'}</div></div></div><div className="headeractions">
 {path&&<CommentColumnControl key={path} path={path} onError={failure}/>}
 <button className="primary" disabled={disabled} title="编辑当前文件夹的备注" onClick={()=>edit(directory,'edit')}><NotePencil/>编辑备注</button><button className="quiet" disabled={disabled} title="为当前文件夹生成备注" onClick={()=>edit(directory,'ai')}><MagicWand/>AI 生成备注</button></div></section>
 {path&&<div className="directory-note" aria-live="polite">
   <span>当前文件夹备注</span>
   {directoryNote?<p>{directoryNote}</p>:<p className="muted">{directoryNote===''?'暂无备注':directoryNote===null?'备注暂时无法读取':loading?'正在读取…':'正在读取备注…'}</p>}
 </div>}
 <div className="tools"><div className="tabs">{['全部','有备注','待补充'].map(f=><button key={f} className={f===filter?'on':''} onClick={()=>updateFilter(f)}>{f}</button>)}</div><label className="search"><MagnifyingGlass size={15}/><input ref={search} placeholder="搜索名称或备注" value={query} aria-label="搜索名称或备注" onChange={e=>{if(inline&&!leave())return;if(inline)resetEdit();Q(e.target.value);U(null);if(listRef.current)listRef.current.scrollTop=0;}}/>{query?<button aria-label="清除搜索" onClick={()=>Q('')}><X size={13}/></button>:<kbd>Ctrl F</kbd>}</label></div>
 <div className="thead"><span>名称</span><span>备注</span></div>
 <div className="table" ref={listRef} onScroll={e=>Y(e.currentTarget.scrollTop)}>{visible.length?<div style={{height:visible.length*rowH,position:'relative'}}>{visible.slice(first,last).map((i,j)=><div key={i.path} className={'tr '+(sel?.path===i.path?'selected':'')} style={{top:(first+j)*rowH}} onClick={()=>{if(inline?.path!==i.path)select(i);}}><button className="namecell" title={i.name+(i.dir?' · 双击打开':'')} disabled={i.link} onDoubleClick={()=>i.dir?openDir(i.path):edit(i,'edit')} onKeyDown={e=>{if(e.key==='Enter')i.dir?openDir(i.path):edit(i,'edit');}}><span className={'entryicon '+(i.dir?'dir':'')}><Glyph item={i}/></span><strong>{i.name}</strong></button>
 <div className="note-actions">{inline?.path===i.path?<form className="inline" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();save(draft)}}><input aria-label="备注" autoFocus value={draft} onChange={e=>A(e.target.value)} maxLength={i.dir?200:2000}/><button disabled={working} title="保存"><Check/></button><button type="button" title="取消" onClick={close}><X/></button></form>:<button className={'notecell '+(!notes[i.path]?'empty':'')} title={notes[i.path]||'编辑备注'} disabled={i.link||notes[i.path]===null} onClick={e=>{e.stopPropagation();edit(i,'inline')}}><span>{notes[i.path]||'—'}</span></button>}
 {inline?.path!==i.path&&<div className="row-tools" role="group" aria-label={i.name+' 的备注操作'} onClick={e=>e.stopPropagation()}>
   <RowAction kind="edit" hint={notes[i.path]?'编辑备注':'添加备注'} label={'编辑 '+i.name+' 的备注'} disabled={i.link||notes[i.path]==null||working} onClick={()=>edit(i,'edit')}><NotePencil size={16} aria-hidden="true"/></RowAction>
   <RowAction kind="ai" hint={notes[i.path]?'AI 重新生成备注（保存前确认）':'AI 添加备注'} label={'为 '+i.name+' AI 添加备注'} disabled={i.link||notes[i.path]==null||working} onClick={()=>edit(i,'ai')}><MagicWand size={16} aria-hidden="true"/></RowAction>
 </div>}</div></div>)}</div>:<div className="emptyview"><FolderOpen size={38} weight="duotone"/><strong>{loading?'正在读取…':!path?'打开一个工作目录':query||filter!=='全部'?'没有匹配的项目':'文件夹内暂无内容'}</strong>{!path&&<button className="quiet" onClick={pick}>打开目录</button>}</div>}</div>
 <footer><span className="statusdot"/><span>{notice|| (inline?'正在编辑备注':sel?'已选择 '+sel.name:visible.length+' 个项目')}</span>{undo&&<button className="undo" disabled={working} onClick={undoRow} title={'撤销 '+undo.item.name+' 的 AI 备注'}>撤销 AI 备注</button>}{path&&<div className="footer-actions"><button className="locate" onClick={()=>rpc('locate',{path:chosen?.path||path}).catch(failure)}>在资源管理器中显示<ArrowUpRight size={13}/></button></div>}</footer></>}{!path&&notice&&<footer role="status">{notice}</footer>}</main>
 <dialog ref={shade} className={dlg==='settings'?'settings-dialog':undefined} aria-labelledby={dlg==='settings'?'settings-heading':'note-dialog-title'} onCancel={e=>{e.preventDefault();close()}}>
 {dlg==='settings'?<SettingsPanel page={settingsPage} navigate={settingsPageTo} onClose={close} onSave={async v=>{
   const pending=aiAfter.current;
   if(!pending||!v.ready)return;
   aiAfter.current=null;await generate(pending);
 }}/>:<>
 <div className="modalhead"><span className="modalicon"><NotePencil/></span><IconBtn label="关闭" onClick={close} disabled={dlg==='sending'||working}><X size={18}/></IconBtn></div>
 <h2 id="note-dialog-title">{dlg==='sending'?'正在生成备注':dlg==='candidate'?'确认 AI 备注':before?'编辑备注':'添加备注'}</h2><p className="targetpath" title={target?.path}>{target?.path}</p>{dlg==='sending'?<div className="waitline">正在等待模型返回…</div>:<>{dlg==='candidate'&&before&&<blockquote><span>原备注</span>{before}</blockquote>}<label>{dlg==='candidate'?'生成的备注':'备注内容'}<textarea rows={5} value={dlg==='candidate'?proposal.text:draft} maxLength={target?.dir?200:2000} onChange={e=>dlg==='candidate'?setProposal({...proposal,text:e.target.value}):A(e.target.value)}/></label></>}</>}
 {err&&<div className="error" role="alert">{err}</div>}{dlg!=='settings'&&<div className="modalactions">{dlg==='sending'?<button className="quiet" onClick={()=>rpc('cancel')}>取消生成</button>:<><button className="ai-btn ai-left" disabled={working} onClick={()=>target&&startAI(target)}><MagicWand size={16}/>AI 生成备注</button><button className="quiet" onClick={close}>取消</button><button className="primary" disabled={working} onClick={()=>save(dlg==='candidate'?proposal.text:draft)}>{dlg==='candidate'?'确认保存':'保存备注'}</button></>}</div>}</dialog></div>
}
const mount=createRoot(document.getElementById('root')!);
rpc<Boot>('init').then(boot=>mount.render(boot.quick?<div className="quick-window"><TitleBar quick/><QuickEdit boot={boot}/></div>:<App boot={boot}/>)).catch(e=>mount.render(<p role="alert">无法加载 Folio：{e.message}</p>));
