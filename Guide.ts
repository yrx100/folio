import {driver,DriveStep} from 'driver.js';
import 'driver.js/dist/driver.css';

const key='folio.first-run.v1';
export function hasSeenGuide(){
 try{return localStorage.getItem(key)==='1';}catch{return false;}
}

export function showGuide(hasFolder:boolean,onOpen:()=>void){
 const steps:DriveStep[]=[
   {element:hasFolder?'[data-tour="switch"]':'[data-tour="open"]',popover:{
     title:'打开本地文件夹',description:'选择一个目录作为工作区。左侧目录树可以切换文件夹。',
   }},
   {element:hasFolder?'.directory-note':'[data-tour="example"]',popover:{
     title:'为目录和文件写备注',
     description:'顶部显示当前文件夹的备注，列表中的铅笔编辑单条备注。魔杖生成候选，确认后保存。',
   }},
   {element:'[data-tour="settings"]',popover:{
     title:'配置模型与右键菜单',
     description:'设置里可以配置 DeepSeek 或兼容接口。资源管理器右键菜单可以直接打开备注编辑器。',
   }},
 ];
 const guide=driver({
   steps,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,
   overlayColor:'#232936',overlayOpacity:.43,stagePadding:6,stageRadius:8,
   disableActiveInteraction:true,allowClose:true,showProgress:true,
   progressText:'{{current}} / {{total}}',nextBtnText:'下一步',prevBtnText:'上一步',
   doneBtnText:hasFolder?'完成':'选择文件夹',closeBtnLabel:'关闭引导',popoverClass:'folio-guide',
   onDoneClick:()=>{guide.destroy();if(!hasFolder)onOpen();},
   onDestroyed:()=>{try{localStorage.setItem(key,'1');}catch{}},
 });
 guide.drive();
 return guide;
}
