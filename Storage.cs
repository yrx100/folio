using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

internal sealed class NoteStore
{
    internal readonly string DataPath;
    private readonly string notesPath;
    private readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 16000000 };
    private static readonly Regex Section = new Regex(@"^\s*\[([^\]]+)\]\s*$");
    private static readonly Regex Tip = new Regex(@"^\s*InfoTip\s*=\s*(.*)$", RegexOptions.IgnoreCase);

    internal NoteStore(string dataPath)
    {
        DataPath = dataPath;
        notesPath = Path.Combine(dataPath, "file-notes.json");
    }

    internal static string OneLine(string value)
    {
        return Regex.Replace(value ?? "", @"[\r\n\t\u0000-\u001f]+", " ").Trim();
    }

    internal Dictionary<string, string> FileNotes()
    {
        if (!File.Exists(notesPath)) return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var stored = json.Deserialize<Dictionary<string, string>>(File.ReadAllText(notesPath));
        return new Dictionary<string, string>(stored, StringComparer.OrdinalIgnoreCase);
    }

    internal void SaveFileNote(string path, string note)
    {
        if (!File.Exists(path)) throw new FileNotFoundException("文件已移动或删除，请刷新目录。");
        var notes = FileNotes();
        if (string.IsNullOrWhiteSpace(note)) notes.Remove(path);
        else notes[path] = note.Trim();
        Directory.CreateDirectory(DataPath);
        ReplaceFile(notesPath, new UTF8Encoding(false).GetBytes(json.Serialize(notes)), null);
    }

    internal static string FolderNote(string path)
    {
        var lines = IniLines(IniBytes(Path.Combine(path, "desktop.ini")));
        bool inShell = false;
        foreach (string line in lines)
        {
            Match section = Section.Match(line);
            if (section.Success) inShell = IsShell(section.Groups[1].Value);
            if (!inShell) continue;
            Match tip = Tip.Match(line);
            if (tip.Success) return tip.Groups[1].Value.Trim();
        }
        return "";
    }

    internal static void SaveFolderNote(string folder, string note, string expectedNote)
    {
        string path = Path.Combine(folder, "desktop.ini");
        byte[] before = IniBytes(path);
        string current = FolderNote(folder);
        if (current != expectedNote) throw new IOException("备注已在其他程序中修改。请刷新并重新编辑。");
        var lines = IniLines(before);
        int nameIndex = -1, endIndex = lines.Count;
        for (int i = 0; i < lines.Count; i++)
        {
            Match section = Section.Match(lines[i]);
            if (!section.Success) continue;
            if (nameIndex >= 0 && endIndex == lines.Count) endIndex = i;
            if (!IsShell(section.Groups[1].Value)) continue;
            if (nameIndex >= 0) throw new IOException("desktop.ini 包含重复的文件夹设置区段，请先检查该文件。");
            nameIndex = i;
        }
        if (nameIndex < 0 && note.Length != 0)
        {
            if (lines.Count > 0 && lines[lines.Count - 1].Length != 0) lines.Add("");
            lines.Add("[.ShellClassInfo]");
            lines.Add("InfoTip=" + note);
        }
        if (nameIndex >= 0)
        {
            for (int i = endIndex - 1; i > nameIndex; i--)
                if (Tip.IsMatch(lines[i])) lines.RemoveAt(i);
            if (note.Length != 0) lines.Insert(nameIndex + 1, "InfoTip=" + note);
        }
        if (before == null && note.Length == 0) return;
        var encoding = new UnicodeEncoding(false, true);
        byte[] updated = encoding.GetPreamble().Concat(encoding.GetBytes(string.Join("\r\n", lines).TrimEnd('\r', '\n') + "\r\n")).ToArray();
        FileAttributes previous = before == null ? 0 : File.GetAttributes(path);
        ReplaceFile(path, updated, delegate
        {
            byte[] latest = IniBytes(path);
            if (before == null ? latest != null : latest == null || !before.SequenceEqual(latest))
                throw new IOException("文件夹设置已更新。请刷新并重试。");
        });
        File.SetAttributes(path, (previous & ~FileAttributes.Normal) | FileAttributes.Hidden | FileAttributes.System);
        File.SetAttributes(folder, File.GetAttributes(folder) | FileAttributes.System);
        SHChangeNotify(0x00002000, 0x0005, folder, IntPtr.Zero);
    }

    private static bool IsShell(string section)
    {
        return section.Equals(".ShellClassInfo", StringComparison.OrdinalIgnoreCase);
    }

    private static byte[] IniBytes(string path)
    {
        var info = new FileInfo(path);
        if (!info.Exists) return null;
        if ((info.Attributes & FileAttributes.ReparsePoint) != 0 || info.Length > 262144)
            throw new IOException("此 desktop.ini 是链接或超过可读取大小。");
        return File.ReadAllBytes(path);
    }

    private static List<string> IniLines(byte[] bytes)
    {
        if (bytes == null || bytes.Length == 0) return new List<string>();
        string content;
        if (bytes.Length >= 2 && bytes[0] == 255 && bytes[1] == 254)
            content = new UnicodeEncoding(false, false, true).GetString(bytes, 2, bytes.Length - 2);
        else if (bytes.Length >= 2 && bytes[0] == 254 && bytes[1] == 255)
            content = new UnicodeEncoding(true, false, true).GetString(bytes, 2, bytes.Length - 2);
        else
        {
            try { content = new UTF8Encoding(false, true).GetString(bytes).TrimStart('\uFEFF'); }
            catch (DecoderFallbackException) { content = Encoding.Default.GetString(bytes); }
        }
        if (content.IndexOf('\0') >= 0) throw new IOException("无法识别 desktop.ini 的编码。");
        return Regex.Split(content, "\r\n|\n|\r").ToList();
    }

    private static void ReplaceFile(string target, byte[] content, Action beforeReplace)
    {
        string temp = Path.Combine(Path.GetDirectoryName(target), ".project-notes-" + Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                stream.Write(content, 0, content.Length);
                stream.Flush(true);
            }
            if (beforeReplace != null) beforeReplace();
            if (File.Exists(target)) File.Replace(temp, target, null);
            else File.Move(temp, target);
        }
        finally
        {
            if (File.Exists(temp)) File.Delete(temp);
        }
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern void SHChangeNotify(int change, uint flags, string path, IntPtr reserved);
}
