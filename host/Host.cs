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
    internal static Stream Resource(string name)
    {
        return Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
    }

    [STAThread]
    static void Main(string[] args)
    {
        System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;
        Application.EnableVisualStyles();
        if (args.Length == 1 && (args[0] == "--register-menu" || args[0] == "--remove-menu"))
        {
            try { ShellMenu.Set(args[0] == "--register-menu", Application.ExecutablePath); }
            catch (Exception error)
            {
                Console.Error.WriteLine(error.Message);
                Environment.ExitCode = 1;
            }
            return;
        }
        bool quick = args.Length == 2 && args[0] == "--edit";
        bool first;
        using (new Mutex(true, quick ? null : @"Local\ProjectNotesLite-f30f99", out first))
        {
            if (!first && !quick)
            {
                MessageBox.Show("请先保存备注并关闭已打开的 Folio 窗口。", "Folio");
                return;
            }
            var data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ProjectNotesLite");
            var runtime = Path.Combine(data, "runtime", typeof(Start).Assembly.ManifestModule.ModuleVersionId.ToString("N"));
            try
            {
                Directory.CreateDirectory(runtime);
                SharedWrites.WithLock(() =>
                {
                    foreach (var name in new[] { "Microsoft.Web.WebView2.Core.dll", "WebView2Loader.dll" })
                    {
                        string dest = Path.Combine(runtime, name);
                        using (var src = Resource(name))
                        {
                            if (File.Exists(dest) && new FileInfo(dest).Length == src.Length) continue;
                            var tmp = dest + ".new";
                            using (var dst = File.Create(tmp)) src.CopyTo(dst);
                            if (File.Exists(dest)) File.Replace(tmp, dest, null);
                            else File.Move(tmp, dest);
                        }
                    }
                    return true;
                });
                AppDomain.CurrentDomain.AssemblyResolve += (s, e) =>
                    new AssemblyName(e.Name).Name == "Microsoft.Web.WebView2.Core"
                        ? Assembly.LoadFrom(Path.Combine(runtime, "Microsoft.Web.WebView2.Core.dll"))
                        : null;
                Run(data, runtime, args);
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message, "无法打开 Folio");
            }
        }
    }

    [System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
    static void Run(string data, string runtime, string[] args)
    {
        CoreWebView2Environment.SetLoaderDllFolderPath(runtime);
        bool quick = args.Length == 2 && args[0] == "--edit";
        Application.Run(new Host(data, quick ? args[1] : args.Length > 0 ? args[0] : "", quick));
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
    readonly bool quick;
    readonly string quickPath;
    CoreWebView2Controller controller;
    CoreWebView2 web;
    CancellationTokenSource send;
    bool dirty, picking, disposed, isDark;
    FormWindowState lastState;

    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int left, top, right, bottom; }

    [StructLayout(LayoutKind.Sequential)]
    struct NCCALCSIZE_PARAMS
    {
        public RECT rgrc0, rgrc1, rgrc2;
        public IntPtr lppos;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct Margins { public int left, right, top, bottom; }

    [DllImport("dwmapi.dll")]
    static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

    [DllImport("dwmapi.dll")]
    static extern int DwmExtendFrameIntoClientArea(IntPtr hwnd, ref Margins margins);

    [DllImport("user32.dll")]
    static extern int GetSystemMetrics(int nIndex);

    [DllImport("user32.dll")]
    static extern uint GetDpiForWindow(IntPtr hwnd);

    [DllImport("user32.dll")]
    static extern int GetSystemMetricsForDpi(int nIndex, uint dpi);

    [DllImport("user32.dll")]
    static extern bool IsZoomed(IntPtr hwnd);

    int SystemMetricForWindow(int index)
    {
        try
        {
            uint dpi = GetDpiForWindow(Handle);
            if (dpi > 0) return GetSystemMetricsForDpi(index, dpi);
        }
        catch { }
        return GetSystemMetrics(index);
    }

    void ApplyWindowChrome(bool dark)
    {
        isDark = dark;
        BackColor = dark ? Color.FromArgb(0x13, 0x13, 0x13) : Color.White;
        if (!IsHandleCreated) return;
        try
        {
            int darkFlag = dark ? 1 : 0;
            DwmSetWindowAttribute(Handle, 20, ref darkFlag, sizeof(int)); // DWMWA_USE_IMMERSIVE_DARK_MODE

            int corner = 2; // DWMWCP_ROUND (Windows 11 rounded corners)
            DwmSetWindowAttribute(Handle, 33, ref corner, sizeof(int));

            // COLORREF is 0x00BBGGRR: crisp hairline border matching theme
            int borderColor = dark ? 0x002B2B2B : 0x00E4E4E4;
            DwmSetWindowAttribute(Handle, 34, ref borderColor, sizeof(int));

            // Extend 1px top frame into client area so DWM keeps native shadow & rounded corners without a titlebar.
            var margins = new Margins { left = 0, right = 0, top = 1, bottom = 0 };
            DwmExtendFrameIntoClientArea(Handle, ref margins);
        }
        catch { }
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        ApplyWindowChrome(isDark);
    }

    protected override void WndProc(ref Message m)
    {
        // WM_NCCALCSIZE: remove native titlebar while preserving Windows 10/11 invisible outer resize borders.
        if (m.Msg == 0x0083)
        {
            if (m.WParam != IntPtr.Zero)
            {
                var p = (NCCALCSIZE_PARAMS)Marshal.PtrToStructure(m.LParam, typeof(NCCALCSIZE_PARAMS));
                int pad = SystemMetricForWindow(92); // SM_CXPADDEDBORDER
                int frameX = SystemMetricForWindow(32) + pad; // SM_CXSIZEFRAME
                int frameY = SystemMetricForWindow(33) + pad; // SM_CYSIZEFRAME

                p.rgrc0.left += frameX;
                p.rgrc0.right -= frameX;
                p.rgrc0.bottom -= frameY;
                if (IsZoomed(Handle))
                {
                    p.rgrc0.top += frameY;
                }
                Marshal.StructureToPtr(p, m.LParam, false);
            }
            m.Result = IntPtr.Zero;
            return;
        }
        base.WndProc(ref m);
    }

    void LayoutWebView()
    {
        if (controller == null || WindowState == FormWindowState.Minimized) return;
        // Fill 100% of the visible client area edge-to-edge — zero white border seam around dialogs or backdrops.
        controller.Bounds = new Rectangle(0, 0, Math.Max(1, ClientSize.Width), Math.Max(1, ClientSize.Height));
    }

    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 32000000 };

    public Host(string dir, string initial, bool quick = false)
    {
        data = dir;
        notes = new NoteStore(dir);
        root = Directory.Exists(initial) ? Path.GetFullPath(initial) : "";
        preferences = new Preferences(dir);
        this.quick = quick;
        if (quick)
        {
            quickPath = Path.GetFullPath(initial);
            if (!File.Exists(quickPath) && !Directory.Exists(quickPath))
                throw new IOException("目标已移动或删除。");
            root = quickPath;
        }
        Text = quick ? "修改备注" : "Folio";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        FormBorderStyle = FormBorderStyle.Sizable;
        ControlBox = true;
        MinimizeBox = true;
        MaximizeBox = !quick;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(790, 530);
        ClientSize = new Size(
            Math.Min(1260, Screen.PrimaryScreen.WorkingArea.Width - 48),
            Math.Min(800, Screen.PrimaryScreen.WorkingArea.Height - 64));
        if (quick)
        {
            MinimumSize = new Size(440, 370);
            ClientSize = new Size(510, 410);
        }
        BackColor = Color.White;
        Shown += async delegate { await Init(); };
        Resize += delegate
        {
            LayoutWebView();
            if (lastState == WindowState) return;
            lastState = WindowState;
            if (web != null && web.Source == HomePage)
                Reply(new { @event = "windowState", maximized = WindowState == FormWindowState.Maximized });
        };
        Activated += delegate
        {
            if (controller != null) controller.MoveFocus(CoreWebView2MoveFocusReason.Programmatic);
            if (!quick && web != null && web.Source == HomePage) Reply(new { @event = "activate" });
        };
        FormClosing += (s, e) =>
        {
            if (dirty && MessageBox.Show(this, "关闭窗口并放弃未保存的备注？", "未保存的备注", MessageBoxButtons.OKCancel) != DialogResult.OK)
                e.Cancel = true;
        };
        FormClosed += delegate
        {
            disposed = true;
            if (send != null) send.Cancel();
            if (controller != null) controller.Close();
        };
    }

    async Task Init()
    {
        try
        {
            var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(data, "WebView"), null);
            controller = await env.CreateCoreWebView2ControllerAsync(Handle);
            controller.DefaultBackgroundColor = BackColor;
            web = controller.CoreWebView2;
            LayoutWebView();
            web.Settings.IsNonClientRegionSupportEnabled = true;
            web.Settings.AreDevToolsEnabled = false;
            web.Settings.AreDefaultContextMenusEnabled = false;
            web.Settings.IsStatusBarEnabled = false;
            web.Settings.AreHostObjectsAllowed = false;
            web.AddWebResourceRequestedFilter(AppOrigin + "*", CoreWebView2WebResourceContext.All);
            web.WebResourceRequested += (s, e) =>
            {
                bool home = e.Request.Uri == HomePage && e.Request.Method == "GET";
                e.Response = env.CreateWebResourceResponse(
                    home ? Start.Resource("index.html") : Stream.Null,
                    home ? 200 : 404,
                    home ? "OK" : "Not Found",
                    "Content-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff");
            };
            web.NavigationStarting += (s, e) => { if (e.Uri != HomePage) e.Cancel = true; };
            web.NavigationCompleted += (s, e) =>
            {
                if (!e.IsSuccess && e.WebErrorStatus != CoreWebView2WebErrorStatus.OperationCanceled)
                    MessageBox.Show(this, "首页加载失败：" + e.WebErrorStatus, Text);
            };
            web.NewWindowRequested += (s, e) => { e.Handled = true; };
            web.WebMessageReceived += Receive;
            web.Navigate(HomePage);
        }
        catch (Exception e)
        {
            MessageBox.Show(this, "界面需要 Microsoft Edge WebView2 Runtime。\r\n" + e.Message, Text);
            Close();
        }
    }

    public sealed class Req
    {
        public int id { get; set; }
        public string op { get; set; }
        public string path { get; set; }
        public string value { get; set; }
        public string original { get; set; }
        public string[] paths { get; set; }
        public string provider { get; set; }
        public string url { get; set; }
        public string model { get; set; }
        public string key { get; set; }
    }

    async void Receive(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (e.Source != HomePage) return;
        int id = 0;
        try
        {
            var q = json.Deserialize<Req>(e.WebMessageAsJson);
            id = q.id;
            var result = await Dispatch(q);
            Reply(new { id, ok = true, value = result });
        }
        catch (Exception ex)
        {
            Reply(new { id, ok = false, error = ex is OperationCanceledException ? "生成已取消或超时。" : ex.Message });
        }
    }

    void Reply(object dataObject)
    {
        if (!disposed) web.PostWebMessageAsJson(json.Serialize(dataObject));
    }

    static void RejectReparseAncestors(string path)
    {
        for (string p = path; p != null; p = Path.GetDirectoryName(p))
            if ((File.GetAttributes(p) & FileAttributes.ReparsePoint) != 0)
                throw new IOException("请打开链接指向的实际位置。");
    }

    string Safe(string input)
    {
        if (string.IsNullOrWhiteSpace(input) || root.Length == 0) throw new IOException("请先打开目录。");
        string path = Path.GetFullPath(input);
        if (quick && !string.Equals(path, quickPath, StringComparison.OrdinalIgnoreCase))
            throw new IOException("此窗口仅编辑所选项。");
        string prefix = root.TrimEnd('\\') + "\\";
        if (!path.Equals(root, StringComparison.OrdinalIgnoreCase) && !path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            throw new IOException("路径位于当前工作目录之外。");
        RejectReparseAncestors(path);
        return path;
    }

    string Read(string path, Dictionary<string, string> files)
    {
        if (Directory.Exists(path)) return NoteStore.FolderNote(path);
        string n;
        return files.TryGetValue(path, out n) ? n : "";
    }

    async Task<object> Dispatch(Req q)
    {
        switch (q.op)
        {
            case "init":
                return new { root, quick, dir = Directory.Exists(root), settings = preferences.Describe() };
            case "getSettings":
                return preferences.Describe();
            case "menu":
                return await Task.Run(() => ShellMenu.Status(Application.ExecutablePath));
            case "setMenu":
                return await Task.Run(() => ShellMenu.Set(q.value == "on", Application.ExecutablePath));
            case "theme":
                ApplyWindowChrome(q.value == "dark");
                if (controller != null) controller.DefaultBackgroundColor = BackColor;
                return null;
            case "close":
                BeginInvoke(new Action(Close));
                return null;
            case "window":
                if (q.value == "minimize") WindowState = FormWindowState.Minimized;
                if (q.value == "maximize" && !quick)
                    WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
                return WindowState == FormWindowState.Maximized;
            case "pick":
                if (quick || picking) return null;
                picking = true;
                try
                {
                    string selected = FolderPicker.Pick(Handle);
                    if (selected == null) return null;
                    root = Path.GetFullPath(selected);
                    return root;
                }
                finally { picking = false; }
            case "openRoot":
                if (quick) throw new IOException("此窗口不支持切换目录。");
                if (string.IsNullOrWhiteSpace(q.path)) throw new IOException("目录路径无效。");
                string targetRoot = Path.GetFullPath(q.path);
                if (!Directory.Exists(targetRoot)) throw new IOException("该目录不存在或已被移动。");
                RejectReparseAncestors(targetRoot);
                root = targetRoot;
                return root;
            case "dirty":
                dirty = q.value == "1";
                return null;
            case "settings":
                preferences.Save(q.provider, q.url, q.model, q.key);
                return preferences.Describe();
            case "cancel":
                if (send != null) send.Cancel();
                return null;
        }

        string path = Safe(q.path);
        switch (q.op)
        {
            case "list":
                return await Task.Run(() => Entry.List(path).Select(x => new
                {
                    name = x.Name,
                    path = x.Path,
                    dir = x.Folder,
                    link = x.Link,
                    size = x.Size,
                    modified = x.Modified
                }).ToArray());
            case "notes":
                if (q.paths == null || q.paths.Length > 120) throw new IOException("备注读取数量超限。");
                var paths = q.paths.Select(p => Path.GetFullPath(p)).ToArray();
                return await Task.Run(() =>
                {
                    var files = notes.FileNotes();
                    var result = new Dictionary<string, string>();
                    foreach (var p in paths)
                    {
                        try { result[p] = Read(Safe(p), files); }
                        catch (IOException) { result[p] = null; }
                        catch (UnauthorizedAccessException) { result[p] = null; }
                    }
                    return result;
                });
            case "save":
                bool dir = Directory.Exists(path);
                string value = dir ? NoteStore.OneLine(q.value) : (q.value ?? "").Trim();
                if (value.Length > (dir ? 200 : 2000)) throw new IOException("备注超出长度限制。");
                SharedWrites.WithLock(() =>
                {
                    if (dir) NoteStore.SaveFolderNote(path, value, q.original);
                    else
                    {
                        if (Read(path, notes.FileNotes()) != q.original)
                            throw new IOException("备注已更改，请刷新后重试。");
                        notes.SaveFileNote(path, value);
                    }
                    return true;
                });
                dirty = false;
                return value;
            case "locate":
                System.Diagnostics.Process.Start("explorer.exe", (Directory.Exists(path) ? "" : "/select,") + "\"" + path + "\"");
                return null;
            case "commentColumn":
                if (!Directory.Exists(path)) throw new IOException("请选择一个文件夹。");
                ExplorerColumns.Action action;
                if (!Enum.TryParse(q.value, out action) || !Enum.IsDefined(typeof(ExplorerColumns.Action), action))
                    throw new IOException("不支持的备注列操作。");
                return await ExplorerColumns.Comments(path, action);
            case "suggest":
                if (send != null) throw new IOException("正在生成另一条备注。");
                var ai = preferences.Current();
                send = new CancellationTokenSource();
                try
                {
                    var evidence = await Task.Run(() => Summary.Evidence(path, notes.FileNotes()));
                    send.Token.ThrowIfCancellationRequested();
                    return await Summary.Generate(ai, evidence, send.Token);
                }
                finally
                {
                    send.Dispose();
                    send = null;
                }
        }
        throw new IOException("不支持此操作。");
    }
}
