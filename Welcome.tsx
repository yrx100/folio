import React from 'react';
import {ArrowRight,ArrowUpRight,FileText,FolderOpen,FolderSimple} from '@phosphor-icons/react';

export function Welcome({onOpen,onTour}:{onOpen:()=>void,onTour:()=>void}){
 return <section className="welcome" aria-labelledby="welcome-title">
   <div className="welcome-copy">
     <div className="welcome-heading">
       <span className="welcome-mark"><FolderOpen size={21} aria-hidden="true"/></span>
       <h1 id="welcome-title">本地工作区</h1>
     </div>
     <p>打开文件夹后，目录和备注会显示在这里。</p>
     <div className="welcome-actions">
       <button className="welcome-open" data-tour="open" onClick={onOpen}>打开文件夹<ArrowRight size={17} aria-hidden="true"/></button>
       <button className="walkthrough" onClick={onTour}>快速上手<ArrowUpRight size={13} aria-hidden="true"/></button>
     </div>
   </div>
   <figure className="sample-tree" data-tour="example" aria-label="文件树和备注示例">
     <figcaption><FolderOpen size={20} aria-hidden="true"/>项目资料</figcaption>
     <ul>
       <li><FileText size={16} aria-hidden="true"/><strong>README.md</strong><span className="sample-annotation">项目说明与运行步骤</span></li>
       <li><FolderSimple size={16} aria-hidden="true"/>设计稿</li>
       <li><FolderSimple size={16} aria-hidden="true"/>交付文件</li>
     </ul>
   </figure>
 </section>;
}
