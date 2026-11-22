using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32;

internal static class ShellMenu
{
    const string Label = "Folio · 修改备注";
    static readonly Dictionary<string, string> Paths = new Dictionary<string, string>
    {
        { @"Software\Classes\*\shell\ProjectNotesLite.Edit", "%1" },
        { @"Software\Classes\Directory\shell\ProjectNotesLite.Edit", @"%1\." },
        { @"Software\Classes\Directory\Background\shell\ProjectNotesLite.Edit", @"%V\." },
    };

    static string Command(string executable, string target)
    {
        return "\"" + executable + "\" --edit \"" + target + "\"";
    }

    static bool Owns(string path, string target, string executable, bool includeLegacy = false)
    {
        using (var key = Registry.CurrentUser.OpenSubKey(path + @"\command"))
        {
            var command = key == null ? null : key.GetValue("") as string;
            return string.Equals(command, Command(executable, target), StringComparison.OrdinalIgnoreCase) ||
                (includeLegacy && string.Equals(command, Command(executable, "%1"), StringComparison.OrdinalIgnoreCase));
        }
    }

    static void SetClassic(bool enabled, string executable)
    {
        foreach (var entry in Paths)
        {
            if (enabled)
            {
                using (var key = Registry.CurrentUser.CreateSubKey(entry.Key))
                {
                    key.SetValue("", Label);
                    key.SetValue("MUIVerb", Label);
                    key.SetValue("Icon", "\"" + executable + "\",0");
                    key.SetValue("MultiSelectModel", "Single");
                    using (var command = key.CreateSubKey("command"))
                        command.SetValue("", Command(executable, entry.Value));
                }
            }
            else if (Owns(entry.Key, entry.Value, executable, true))
                Registry.CurrentUser.DeleteSubKeyTree(entry.Key, false);
        }
    }

    static bool SupportsModernMenu()
    {
        if (Environment.OSVersion.Version.Build < 22000) return false;
        ushort processMachine, nativeMachine;
        return IsWow64Process2(GetCurrentProcess(), out processMachine, out nativeMachine) &&
            nativeMachine == 0x8664; // IMAGE_FILE_MACHINE_AMD64
    }

    static bool ManagePackage(string action, string executable)
    {
        string script;
        using (var reader = new StreamReader(Start.Resource("ManagePackage.ps1")))
            script = reader.ReadToEnd();

        var command = new ProcessStartInfo
        {
            FileName = Path.Combine(Environment.SystemDirectory, @"WindowsPowerShell\v1.0\powershell.exe"),
            Arguments = "-NoLogo -NoProfile -NonInteractive -EncodedCommand " +
                Convert.ToBase64String(Encoding.Unicode.GetBytes(script)),
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        command.EnvironmentVariables["FOLIO_MENU_ACTION"] = action;
        command.EnvironmentVariables["FOLIO_MENU_DIRECTORY"] = Path.GetDirectoryName(executable);
        using (var process = Process.Start(command))
        {
            var output = process.StandardOutput.ReadToEndAsync();
            var error = process.StandardError.ReadToEndAsync();
            if (!process.WaitForExit(60000))
            {
                try { process.Kill(); }
                catch (InvalidOperationException) { /* The process exited after the wait. */ }
                throw new IOException("等待资源管理器扩展注册超时。");
            }
            if (process.ExitCode != 0) throw new IOException(error.Result.Trim());
            return output.Result.Trim() == "modern";
        }
    }

    static bool ModernAvailable(string action, string executable)
    {
        try { return ManagePackage(action, executable); }
        catch (IOException ex) { Debug.WriteLine(ex); }
        catch (Win32Exception ex) { Debug.WriteLine(ex); }
        return false;
    }

    internal static string Status(string executable)
    {
        if (SupportsModernMenu() && ModernAvailable("status", executable)) return "modern";
        return Paths.All(entry => Owns(entry.Key, entry.Value, executable, true)) ? "classic" : "off";
    }

    internal static string Set(bool enabled, string executable)
    {
        using (var mutex = new Mutex(false, @"Local\Folio.ExplorerMenu"))
        {
            try
            {
                if (!mutex.WaitOne(60000)) throw new IOException("另一个 Folio 进程正在更新右键菜单，请重试。");
            }
            catch (AbandonedMutexException) { /* The previous process exited while updating the menu. */ }
            try
            {
                bool supported = SupportsModernMenu();
                SetClassic(enabled, executable);
                if (!enabled)
                {
                    if (supported) ManagePackage("remove", executable);
                    return "off";
                }

                bool modern = supported &&
                    File.Exists(Path.Combine(Path.GetDirectoryName(executable), "FolioExplorer.msix")) &&
                    ModernAvailable("register", executable);
                return modern ? "modern" : "classic";
            }
            finally
            {
                SHChangeNotify(0x08000000, 0, IntPtr.Zero, IntPtr.Zero); // SHCNE_ASSOCCHANGED
                mutex.ReleaseMutex();
            }
        }
    }

    [DllImport("kernel32.dll")]
    static extern IntPtr GetCurrentProcess();

    [DllImport("kernel32.dll")]
    static extern bool IsWow64Process2(IntPtr process, out ushort processMachine, out ushort nativeMachine);

    [DllImport("shell32.dll")]
    static extern void SHChangeNotify(int eventId, uint flags, IntPtr first, IntPtr second);
}
