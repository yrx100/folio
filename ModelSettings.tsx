import React,{useEffect,useState} from 'react';
import {rpc} from './bridge';
export type Service='deepseek'|'custom';
export type Profiles={active:Service,ready:boolean,profiles:Record<Service,{url:string,model:string,hasKey:boolean}>};
export function ModelSettings({onSave,onCancel}:{onSave:(v:Profiles)=>void,onCancel?:()=>void}){
 const [data,setData]=useState<Profiles|null>(null),[svc,S]=useState<Service>('deepseek'),[url,U]=useState(''),[model,M]=useState(''),[key,K]=useState(''),[clear,C]=useState(false),[busy,B]=useState(false),[error,E]=useState('');
 function choose(s:Service,d:Profiles){S(s);U(d.profiles[s].url);M(d.profiles[s].model);K('');C(false);E('');}
 useEffect(()=>{rpc<Profiles>('getSettings').then(d=>{setData(d);choose(d.active,d)}).catch(e=>E(e.message));},[]);
 const [saved,setSaved]=useState(false);
 async function save(){
   B(true);E('');setSaved(false);
   try{
     const d=await rpc<Profiles>('settings',{provider:svc,url,model,key:clear?'':key||null});
     setData(d);choose(d.active,d);setSaved(true);onSave(d);
   }catch(e:any){E(e.message);}finally{B(false)}
 }
 const hasKey=data?.profiles[svc].hasKey&&data.profiles[svc].url===url;
 return <div className="model-form" onChange={()=>setSaved(false)}><p>主窗口和资源管理器共用此配置。</p><label>模型服务<select aria-label="模型服务" value={svc} disabled={!data} onChange={e=>data&&choose(e.target.value as Service,data)}><option value="deepseek">DeepSeek</option><option value="custom">自定义 · Chat Completions 兼容接口</option></select></label>
 <label>接口地址<input value={url} readOnly={svc==='deepseek'} onChange={e=>U(e.target.value)} placeholder="https://…/v1/chat/completions"/></label>
 <label>模型名称<input list={svc==='deepseek'?'ds-models':undefined} value={model} onChange={e=>M(e.target.value)} placeholder="填写服务商提供的模型 ID"/></label><datalist id="ds-models"><option value="deepseek-flash"/><option value="deepseek-v4-pro"/></datalist>
 <label>API Key<input autoComplete="off" type="password" value={key} disabled={clear} placeholder={hasKey?'已保存，留空沿用':svc==='deepseek'?'输入 DeepSeek API Key':'如服务无需密钥，可留空'} onChange={e=>K(e.target.value)}/></label>
 {hasKey&&<label className="checkbox"><input type="checkbox" checked={clear} onChange={e=>C(e.target.checked)}/>清除该服务的已保存密钥</label>}
 <small>密钥由 Windows 为当前用户加密保存。点击「AI 生成备注」会将所选项的资料摘要发送至配置的接口。</small>
 {error&&<div className="error" role="alert">{error}</div>}<div className="modalactions">{saved&&<span className="settings-saved" role="status">已保存</span>}{onCancel&&<button className="quiet" onClick={onCancel}>返回</button>}<button className="primary" disabled={busy||!data||!model.trim()||!url.trim()} onClick={save}>保存模型设置</button></div></div>;
}
