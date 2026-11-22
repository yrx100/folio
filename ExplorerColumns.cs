using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

internal static class ExplorerColumns
{
    static readonly Guid TopLevelBrowser = new Guid("4C96BE40-915C-11CF-99D3-00AA004AE837");
    const uint VisibleColumns = 2, ColumnWidth = 1, DetailsView = 4;
    public enum Action { Check, Detect, Enable, Disable }

    public static async Task<bool?> Comments(string path, Action action)
    {
        object shell = Activator.CreateInstance(Type.GetTypeFromProgID("Shell.Application"));
        try
        {
            bool? state = ReadView(shell, path, action);
            if (state.HasValue || action == Action.Check) return state;
            using (Process.Start("explorer.exe", "/n,\"" + path + "\"")) { }
            for (int attempt = 0; attempt < 30; attempt++)
            {
                await Task.Delay(200);
                state = ReadView(shell, path, action);
                if (state.HasValue) return state;
            }
            throw new IOException("未能读取该目录的资源管理器视图，请打开目录后重试。");
        }
        finally { Release(shell); }
    }

    static bool? ReadView(object shell, string path, Action action)
    {
        object windows = Member(shell, "Windows", BindingFlags.InvokeMethod);
        try
        {
            int count = Convert.ToInt32(Member(windows, "Count", BindingFlags.GetProperty));
            for (int index = count - 1; index >= 0; index--)
            {
                object window = null, view = null;
                try
                {
                    window = Member(windows, "Item", BindingFlags.InvokeMethod, index);
                    if (window == null) continue;
                    var provider = window as ShellServices;
                    if (provider == null) continue;
                    var service = TopLevelBrowser;
                    var iid = typeof(ShellBrowser).GUID;
                    ShellBrowser browser;
                    if (provider.QueryService(ref service, ref iid, out browser) < 0 || browser == null) continue;
                    try { browser.QueryActiveShellView(out view); }
                    finally { Release(browser); }

                    var folder = view as FolderView;
                    var columns = view as ColumnManager;
                    if (folder == null || columns == null || !Matches(folder, path)) continue;
                    return ApplyColumnState(folder, columns, action);
                }
                catch (COMException) { } // A window or view may still be loading, or may have closed.
                catch (TargetInvocationException e) { if (!(e.InnerException is COMException)) throw; }
                finally { Release(view); Release(window); }
            }
            return null;
        }
        finally { Release(windows); }
    }

    static bool Matches(FolderView view, string target)
    {
        var iid = typeof(PersistFolder).GUID;
        PersistFolder folder;
        view.GetFolder(ref iid, out folder);
        IntPtr pidl = IntPtr.Zero;
        try
        {
            folder.GetCurFolder(out pidl);
            var path = new StringBuilder(32768);
            return SHGetPathFromIDListEx(pidl, path, (uint)path.Capacity, 0) &&
                string.Equals(path.ToString().TrimEnd('\\'), target.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase);
        }
        finally { Marshal.FreeCoTaskMem(pidl); Release(folder); }
    }

    static bool ApplyColumnState(FolderView folder, ColumnManager columns, Action action)
    {
        PropertyKey comment;
        Marshal.ThrowExceptionForHR(PSGetPropertyKeyFromName("System.Comment", out comment));
        uint mode;
        folder.GetCurrentViewMode(out mode);
        if (action == Action.Enable && mode != DetailsView)
        {
            folder.SetCurrentViewMode(DetailsView);
            folder.GetCurrentViewMode(out mode);
        }
        var keys = ReadColumns(columns);
        bool hasComment = keys.Contains(comment);
        if (action == Action.Enable && !hasComment)
        {
            UpdateColumns(columns, keys, keys.Concat(new[] { comment }).ToArray());
            var info = new ColumnInfo { Size = Marshal.SizeOf(typeof(ColumnInfo)), Mask = ColumnWidth, Width = 280 };
            columns.SetColumnInfo(ref comment, ref info);
            hasComment = ReadColumns(columns).Contains(comment);
        }
        if (action == Action.Disable && hasComment)
        {
            UpdateColumns(columns, keys, keys.Where(key => !key.Equals(comment)).ToArray());
            hasComment = ReadColumns(columns).Contains(comment);
        }
        bool visible = mode == DetailsView && hasComment;
        if (action == Action.Enable && !visible || action == Action.Disable && hasComment)
            throw new IOException("资源管理器未应用备注列设置。");
        return visible;
    }

    static PropertyKey[] ReadColumns(ColumnManager columns)
    {
        uint count;
        columns.GetColumnCount(VisibleColumns, out count);
        var keys = new PropertyKey[count];
        columns.GetColumns(VisibleColumns, keys, count);
        return keys;
    }

    static void UpdateColumns(ColumnManager columns, PropertyKey[] before, PropertyKey[] after)
    {
        var widths = new List<KeyValuePair<PropertyKey, ColumnInfo>>();
        foreach (var key in before.Intersect(after))
        {
            var existing = key;
            var info = new ColumnInfo { Size = Marshal.SizeOf(typeof(ColumnInfo)), Mask = ColumnWidth };
            columns.GetColumnInfo(ref existing, ref info);
            widths.Add(new KeyValuePair<PropertyKey, ColumnInfo>(existing, info));
        }
        columns.SetColumns(after, (uint)after.Length);
        foreach (var pair in widths)
        {
            var key = pair.Key;
            var info = pair.Value;
            info.Mask = ColumnWidth;
            columns.SetColumnInfo(ref key, ref info);
        }
    }

    static object Member(object instance, string name, BindingFlags flags, params object[] args)
    {
        return instance.GetType().InvokeMember(name, flags, null, instance, args);
    }
    static void Release(object obj) { if (obj != null) Marshal.ReleaseComObject(obj); }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern bool SHGetPathFromIDListEx(IntPtr pidl, StringBuilder path, uint length, uint flags);
    [DllImport("propsys.dll", CharSet = CharSet.Unicode)]
    static extern int PSGetPropertyKeyFromName(string name, out PropertyKey key);

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    struct PropertyKey { public Guid Format; public uint Id; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct ColumnInfo
    {
        public int Size;
        public uint Mask, State, Width, DefaultWidth, IdealWidth;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 80)] public string Name;
    }
    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("6d5140c1-7436-11ce-8034-00aa006009fa")]
    interface ShellServices
    {
        [PreserveSig] int QueryService(ref Guid service, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out ShellBrowser browser);
    }
    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("000214e2-0000-0000-c000-000000000046")]
    interface ShellBrowser
    {
        // Slots preceding QueryActiveShellView in IShellBrowser.
        void GetWindow(); void ContextSensitiveHelp(); void InsertMenusSB(); void SetMenuSB();
        void RemoveMenusSB(); void SetStatusTextSB(); void EnableModelessSB(); void TranslateAcceleratorSB();
        void BrowseObject(); void GetViewStateStream(); void GetControlWindow(); void SendControlMsg();
        void QueryActiveShellView([MarshalAs(UnmanagedType.IUnknown)] out object view);
    }
    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("cde725b0-ccc9-4519-917e-325d72fab4ce")]
    interface FolderView
    {
        void GetCurrentViewMode(out uint mode);
        void SetCurrentViewMode(uint mode);
        void GetFolder(ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out PersistFolder folder);
    }
    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("1ac3d9f0-175c-11d1-95be-00609797ea4f")]
    interface PersistFolder
    {
        void GetClassID(); void Initialize();
        void GetCurFolder(out IntPtr pidl);
    }
    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("d8ec27bb-3f3b-4042-b10a-4acfd924d453")]
    interface ColumnManager
    {
        void SetColumnInfo(ref PropertyKey key, ref ColumnInfo info);
        void GetColumnInfo(ref PropertyKey key, ref ColumnInfo info);
        void GetColumnCount(uint flags, out uint count);
        void GetColumns(uint flags, [Out, MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 2)] PropertyKey[] keys, uint count);
        void SetColumns([In, MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 1)] PropertyKey[] keys, uint count);
    }
}
