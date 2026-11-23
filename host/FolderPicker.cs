using System;
using System.Runtime.InteropServices;

internal static class FolderPicker
{
    const uint PickFolders = 0x20;
    const uint ForceFileSystem = 0x40;
    const uint FileSystemPath = 0x80058000;
    const int Cancelled = unchecked((int)0x800704C7);

    static readonly Guid ComputerFolder = new Guid("0AC0837C-BBF8-452A-850D-79D08E667CA7");
    static readonly Guid FolioPicker = new Guid("F1E66BB1-61A4-4D16-8A45-A1672937D427");

    public static string Pick(IntPtr owner)
    {
        var dialog = (IFileDialog)new FileOpenDialog();
        try
        {
            Guid client = FolioPicker;
            dialog.SetClientGuid(ref client);
            dialog.SetOptions(dialog.GetOptions() | PickFolders | ForceFileSystem);
            dialog.SetTitle("选择工作目录");
            dialog.SetOkButtonLabel("选择文件夹");

            Guid folderId = ComputerFolder;
            Guid itemId = typeof(IShellItem).GUID;
            IShellItem computer;
            Marshal.ThrowExceptionForHR(SHGetKnownFolderItem(ref folderId, 0, IntPtr.Zero, ref itemId, out computer));
            try { dialog.SetDefaultFolder(computer); }
            finally { Marshal.ReleaseComObject(computer); }

            int result = dialog.Show(owner);
            if (result == Cancelled) return null;
            Marshal.ThrowExceptionForHR(result);

            IShellItem folder = dialog.GetResult();
            try { return folder.GetDisplayName(FileSystemPath); }
            finally { Marshal.ReleaseComObject(folder); }
        }
        finally { Marshal.ReleaseComObject(dialog); }
    }

    [DllImport("shell32.dll", ExactSpelling = true)]
    static extern int SHGetKnownFolderItem(ref Guid folder, uint flags, IntPtr token,
        ref Guid interfaceId, out IShellItem item);

    [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]
    class FileOpenDialog { }

    // Keep the methods in native vtable order, including the slots Folio does not use.
    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("42F85136-DB7E-439C-85F1-E4075D135FC8")]
    interface IFileDialog
    {
        [PreserveSig] int Show(IntPtr owner);
        void SetFileTypes(uint count, IntPtr filters);
        void SetFileTypeIndex(uint index);
        uint GetFileTypeIndex();
        uint Advise(IntPtr events);
        void Unadvise(uint cookie);
        void SetOptions(uint options);
        uint GetOptions();
        void SetDefaultFolder(IShellItem folder);
        void SetFolder(IShellItem folder);
        IShellItem GetFolder();
        IShellItem GetCurrentSelection();
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
        [return: MarshalAs(UnmanagedType.LPWStr)] string GetFileName();
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string text);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        IShellItem GetResult();
        void AddPlace(IShellItem item, uint position);
        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string extension);
        void Close(int result);
        void SetClientGuid(ref Guid client);
    }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE")]
    interface IShellItem
    {
        IntPtr BindToHandler(IntPtr bindContext, ref Guid handler, ref Guid interfaceId);
        IShellItem GetParent();
        [return: MarshalAs(UnmanagedType.LPWStr)] string GetDisplayName(uint nameType);
    }
}
