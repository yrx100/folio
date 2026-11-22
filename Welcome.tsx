import React from 'react';
import {ArrowUpRight,FileText,FolderOpen,FolderSimple} from '@phosphor-icons/react';

export function Welcome({onOpen,onTour}:{onOpen:()=>void,onTour:()=>void}){
 return <section className="welcome" aria-labelledby="welcome-title">
   <div className="welcome-copy">
     <span className="welcome-mark" aria-hidden="true"><FolderOpen size={24}/></span>
     <h1 id="welcome-title">为文件夹<br/>留下好找的备注</h1>
     <p>打开一个本地文件夹，即可查看目录结构，为文件和文件夹添加备注。</p>
     <div className="welcome-actions">
       <button className="primary" data-tour="open" onClick={onOpen}><FolderOpen size={16}/>打开文件夹</button>
       <button className="walkthrough" onClick={onTour}>快速上手<ArrowUpRight size={13}/></button>
     </div>
   </div>
   <figure className="sample-note" data-tour="example">
     <figcaption>备注示例</figcaption>
     <div className="sample-row"><FolderSimple size={18}/><div><span>项目资料</span><p>记录设计稿、素材和交付文件</p></div></div>
     <div className="sample-row"><FileText size={18}/><div><span>README.md</span><p>项目说明与运行步骤</p></div></div>
   </figure>
 </section>;
}
