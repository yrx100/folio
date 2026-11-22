using System;
using System.IO;
using System.Linq;
using System.Drawing;
using System.Windows.Forms;
using System.Reflection;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
using Microsoft.Web.WebView2.Core;

internal static class Start
{
    internal static Stream Resource(string name) { return Assembly.GetExecutingAssembly().GetManifestResourceStream(name); }
    [STAThread] static void Main(string[] args)
    {
        System.Net.ServicePointManager.SecurityProtocol=System.Net.SecurityProtocolType.Tls12; Application.EnableVisualStyles();
        if(args.Length==1&&(args[0]=="--register-menu"||args[0]=="--remove-menu")){
            ShellMenu.Set(args[0]=="--register-menu",Application.ExecutablePath);return;
        }
        bool quick=args.Length==2&&args[0]=="--edit";
        bool first;
        using (new Mutex(true, quick?null:@"Local\ProjectNotesLite-f30f99", out first))
        {
            if (!first && !quick) { MessageBox.Show("请先保存备注并关闭已打开的 Folio 窗口。", "Folio"); return; }
            var data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ProjectNotesLite");
            var runtime = Path.Combine(data,"runtime",typeof(Start).Assembly.ManifestModule.ModuleVersionId.ToString("N"));
            try
            {
                Directory.CreateDirectory(runtime);
                SharedWrites.WithLock(()=>{ foreach(var name in new[]{"Microsoft.Web.WebView2.Core.dll","WebView2Loader.dll"})
                {
                    string dest=Path.Combine(runtime,name);
                    using (var src=Resource(name)) {
                        if(File.Exists(dest) && new FileInfo(dest).Length==src.Length) continue;
                        var tmp=dest+".new"; using(var dst=File.Create(tmp)) src.CopyTo(dst);
                        if(File.Exists(dest)) File.Replace(tmp,dest,null); else File.Move(tmp,dest);
                    }
                }
                return true; });
                AppDomain.CurrentDomain.AssemblyResolve += (s,e) => new AssemblyName(e.Name).Name=="Microsoft.Web.WebView2.Core" ? Assembly.LoadFrom(Path.Combine(runtime,"Microsoft.Web.WebView2.Core.dll")) : null;
                Run(data,runtime,args);
            }
            catch(Exception e) { MessageBox.Show(e.Message,"无法打开 Folio"); }
        }
    }
    [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
    static void Run(string data,string runtime,string[] args) {
        CoreWebView2Environment.SetLoaderDllFolderPath(runtime);
        bool quick=args.Length==2&&args[0]=="--edit";
        Application.Run(new Host(data,quick?args[1]:args.Length>0?args[0]:"",quick));
    }
}

internal sealed class Host : Form
{
    const string AppOrigin = "https://project-notes.example/";
    const string HomePage = AppOrigin + "index.html";
    readonly string data;
    string root;
    readonly NoteStore notes;
    readonly Preferences preferences;
    readonly bool quick; readonly string quickPath;
    CoreWebView2Controller controller;
    CoreWebView2 web;
    CancellationTokenSource send;
    bool dirty, picking, disposed;
    FormWindowState lastState;
    protected override CreateParams CreateParams {
        get {
            var args=base.CreateParams;
            args.Style |= 0x00040000 | 0x00080000 | 0x00020000; // Sizing frame, system menu and minimize.
            if(!quick)args.Style |= 0x00010000;
            return args;
        }
    }
    [StructLayout(LayoutKind.Sequential)]
    struct MinMaxInfo {public Point reserved,maxSize,maxPosition,minTrack,maxTrack;}
    protected override void WndProc(ref Message m) {
        if(m.Msg==0x83){m.Result=IntPtr.Zero;return;} // Draw the whole window as client area.
        base.WndProc(ref m);
        if(m.Msg==0x24) {
            var screen=Screen.FromHandle(m.HWnd);
            var info=(MinMaxInfo)Marshal.PtrToStructure(m.LParam,typeof(MinMaxInfo));
            var area=screen.WorkingArea;
            info.maxPosition=new Point(area.Left-screen.Bounds.Left,area.Top-screen.Bounds.Top);
            info.maxSize=new Point(area.Width,area.Height);
            Marshal.StructureToPtr(info,m.LParam,false);
        } else if(m.Msg==0x84 && WindowState==FormWindowState.Normal){
            long xy=m.LParam.ToInt64();
            var p=PointToClient(new Point((short)(xy&65535),(short)((xy>>16)&65535)));
            int edge=FrameInset,grip=edge*3;
            bool left=p.X<edge,right=p.X>=ClientSize.Width-edge,top=p.Y<edge,bottom=p.Y>=ClientSize.Height-edge;
            if(left||right||top||bottom){
                bool west=p.X<grip,east=p.X>=ClientSize.Width-grip,north=p.Y<grip,south=p.Y>=ClientSize.Height-grip;
                m.Result=(IntPtr)(north?(west?13:east?14:12):south?(west?16:east?17:15):left?10:11);
            }
        }
    }
    int FrameInset { get {return WindowState==FormWindowState.Normal?4:0;} }
    void LayoutWebView(){
        if(controller==null||WindowState==FormWindowState.Minimized)return;
        int edge=FrameInset;
        controller.Bounds=new Rectangle(edge,edge,Math.Max(1,ClientSize.Width-edge*2),Math.Max(1,ClientSize.Height-edge*2));
    }
    readonly JavaScriptSerializer json=new JavaScriptSerializer { MaxJsonLength=32000000 };
    public Host(string dir,string initial,bool quick=false)
    {
        data=dir; notes=new NoteStore(dir); root=Directory.Exists(initial)?Path.GetFullPath(initial):"";
        preferences=new Preferences(dir); this.quick=quick;
        if(quick){quickPath=Path.GetFullPath(initial);if(!File.Exists(quickPath)&&!Directory.Exists(quickPath))throw new IOException("目标已移动或删除。");root=quickPath;}
        Text=quick?"修改备注":"Folio"; Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        FormBorderStyle=FormBorderStyle.None;
        StartPosition=FormStartPosition.CenterScreen; MinimumSize=new Size(790,530);
        ClientSize=new Size(Math.Min(1180,Screen.PrimaryScreen.WorkingArea.Width-50),Math.Min(775,Screen.PrimaryScreen.WorkingArea.Height-75));
        if(quick){MinimumSize=new Size(438,360);ClientSize=new Size(490,365);MaximizeBox=false;}
        BackColor=Color.White;
        Shown+=async delegate { await Init(); };
        Resize+=delegate {
            LayoutWebView();
            if(lastState==WindowState)return;
            lastState=WindowState;
            if(web!=null && web.Source==HomePage)Reply(new {@event="windowState",maximized=WindowState==FormWindowState.Maximized});
        };
        Activated+=delegate { if(controller!=null)controller.MoveFocus(CoreWebView2MoveFocusReason.Programmatic);if(!quick && web!=null && web.Source==HomePage)Reply(new { @event="activate" }); };
        FormClosing+=(s,e)=>{ if(dirty && MessageBox.Show(this,"关闭窗口并放弃未保存的备注？","未保存的备注",MessageBoxButtons.OKCancel)!=DialogResult.OK)e.Cancel=true; };
        FormClosed+=delegate { disposed=true; if(send!=null)send.Cancel(); if(controller!=null)controller.Close(); };
    }
    async Task Init()
    {
        try {
            var env=await CoreWebView2Environment.CreateAsync(null,Path.Combine(data,"WebView"),null);
            controller=await env.CreateCoreWebView2ControllerAsync(Handle);
            web=controller.CoreWebView2; LayoutWebView();
            web.Settings.IsNonClientRegionSupportEnabled=true;
            web.Settings.AreDevToolsEnabled=false; web.Settings.AreDefaultContextMenusEnabled=false; web.Settings.IsStatusBarEnabled=false; web.Settings.AreHostObjectsAllowed=false;
            web.AddWebResourceRequestedFilter(AppOrigin+"*",CoreWebView2WebResourceContext.All);
            web.WebResourceRequested+=(s,e)=>{
                bool home=e.Request.Uri==HomePage && e.Request.Method=="GET";
                e.Response=env.CreateWebResourceResponse(home?Start.Resource("index.html"):Stream.Null,
                    home?200:404,home?"OK":"Not Found",
                    "Content-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff");
            };
            web.NavigationStarting+=(s,e)=>{ if(e.Uri!=HomePage)e.Cancel=true; };
            web.NavigationCompleted+=(s,e)=>{
                if(!e.IsSuccess && e.WebErrorStatus!=CoreWebView2WebErrorStatus.OperationCanceled)
                    MessageBox.Show(this,"首页加载失败："+e.WebErrorStatus,Text);
            };
            web.NewWindowRequested+=(s,e)=>{e.Handled=true;};
            web.WebMessageReceived+=Receive;
            web.Navigate(HomePage);
        } catch(Exception e) { MessageBox.Show(this,"界面需要 Microsoft Edge WebView2 Runtime。\r\n"+e.Message,Text); Close(); }
    }
    public sealed class Req {
        public int id {get;set;} public string op {get;set;} public string path {get;set;}
        public string value {get;set;} public string original {get;set;} public string[] paths {get;set;}
        public string provider {get;set;} public string url {get;set;} public string model {get;set;} public string key {get;set;}
    }
    async void Receive(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if(e.Source!=HomePage)return;
        int id=0;
        try {
            var q=json.Deserialize<Req>(e.WebMessageAsJson); id=q.id;
            var result=await Dispatch(q); Reply(new {id,ok=true,value=result});
        } catch(Exception ex) { Reply(new {id,ok=false,error=ex is OperationCanceledException?"生成已取消或超时。":ex.Message}); }
    }
    void Reply(object dataObject){if(!disposed)web.PostWebMessageAsJson(json.Serialize(dataObject));}
    string Safe(string input)
    {
        if(string.IsNullOrWhiteSpace(input)||root.Length==0)throw new IOException("请先打开目录。");
        string path=Path.GetFullPath(input);
        if(quick&&!string.Equals(path,quickPath,StringComparison.OrdinalIgnoreCase))throw new IOException("此窗口仅编辑所选项。");
        string prefix=root.TrimEnd('\\')+"\\";
        if(!path.Equals(root,StringComparison.OrdinalIgnoreCase)&&!path.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new IOException("路径位于当前工作目录之外。");
        for(string p=path;p!=null;p=Path.GetDirectoryName(p))
            if((File.GetAttributes(p)&FileAttributes.ReparsePoint)!=0)throw new IOException("请打开链接指向的实际位置。");
        return path;
    }
    string Read(string path,Dictionary<string,string> files) {
        if(Directory.Exists(path))return NoteStore.FolderNote(path);
        string n; return files.TryGetValue(path,out n)?n:"";
    }
    async Task<object> Dispatch(Req q)
    {
        switch(q.op){
        case "init": return new {root,quick,dir=Directory.Exists(root),settings=preferences.Describe()};
        case "getSettings": return preferences.Describe();
        case "menu": return ShellMenu.Enabled(Application.ExecutablePath);
        case "setMenu": ShellMenu.Set(q.value=="on",Application.ExecutablePath);return ShellMenu.Enabled(Application.ExecutablePath);
        case "close": BeginInvoke(new Action(Close));return null;
        case "window":
            if(q.value=="minimize")WindowState=FormWindowState.Minimized;
            if(q.value=="maximize"&&!quick)WindowState=WindowState==FormWindowState.Maximized?FormWindowState.Normal:FormWindowState.Maximized;
            return WindowState==FormWindowState.Maximized;
        case "pick":
            if(quick||picking) return null; picking=true;
            try { using(var dlg=new FolderBrowserDialog{Description="选择工作目录",SelectedPath=root,ShowNewFolderButton=false}) {
                if(dlg.ShowDialog(this)!=DialogResult.OK)return null;
                root=Path.GetFullPath(dlg.SelectedPath); return root;
            }} finally{picking=false;}
        case "dirty":dirty=q.value=="1";return null;
        case "settings":
            preferences.Save(q.provider,q.url,q.model,q.key);return preferences.Describe();
        case "cancel":if(send!=null)send.Cancel();return null;
        }
        string path=Safe(q.path);
        switch(q.op){
        case "list":return await Task.Run(()=>Entry.List(path).Select(x=>new {name=x.Name,path=x.Path,dir=x.Folder,link=x.Link}).ToArray());
        case "notes":
            if(q.paths==null||q.paths.Length>120)throw new IOException("备注读取数量超限。");
            var paths=q.paths.Select(p=>Path.GetFullPath(p)).ToArray();
            return await Task.Run(()=>{var files=notes.FileNotes();var result=new Dictionary<string,string>();foreach(var p in paths){try {result[p]=Read(Safe(p),files);}catch(IOException){result[p]=null;}catch(UnauthorizedAccessException){result[p]=null;}}return result;});
        case "save":
            bool dir=Directory.Exists(path);
            string value=dir?NoteStore.OneLine(q.value):(q.value??"").Trim();
            if(value.Length>(dir?200:2000))throw new IOException("备注超出长度限制。");
            SharedWrites.WithLock(()=>{if(dir)NoteStore.SaveFolderNote(path,value,q.original);
            else {if(Read(path,notes.FileNotes())!=q.original)throw new IOException("备注已更改，请刷新后重试。");notes.SaveFileNote(path,value);}
            return true;});dirty=false;return value;
        case "locate":System.Diagnostics.Process.Start("explorer.exe",(Directory.Exists(path)?"":"/select,")+"\""+path+"\"");return null;
        case "commentColumn":
            if(!Directory.Exists(path))throw new IOException("请选择一个文件夹。");
            ExplorerColumns.Action action;
            if(!Enum.TryParse(q.value, out action) || !Enum.IsDefined(typeof(ExplorerColumns.Action), action))
                throw new IOException("不支持的备注列操作。");
            return await ExplorerColumns.Comments(path, action);
        case "suggest":
            if(send!=null)throw new IOException("正在生成另一条备注。");
            var ai=preferences.Current();
            send=new CancellationTokenSource();
            try {
                var evidence=await Task.Run(()=>Summary.Evidence(path,notes.FileNotes()));
                send.Token.ThrowIfCancellationRequested();
                return await Summary.Generate(ai,evidence,send.Token);
            } finally{send.Dispose();send=null;}

        }
        throw new IOException("不支持此操作。");
    }
}
