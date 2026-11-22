using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using Microsoft.Win32;
using System.Runtime.InteropServices;

internal static class SharedWrites
{
    internal static T WithLock<T>(Func<T> op)
    {
        using(var mutex=new Mutex(false,@"Local\ProjectNotesLite.Files-v1")) {
            try { if(!mutex.WaitOne(10000))throw new IOException("另一个备注窗口正在保存，请重试。"); }
            catch(AbandonedMutexException){}
            try{return op();}finally{mutex.ReleaseMutex();}
        }
    }
}
internal sealed class Preferences
{
    public const string DeepUrl="https://api.deepseek.com/chat/completions";
    public sealed class Profile { public string Url{get;set;} public string Model{get;set;} public string Secret{get;set;} }
    public sealed class Config {
        public string Active{get;set;}
        public Dictionary<string,Profile> Profiles{get;set;}
        public Config(){Active="deepseek";Profiles=new Dictionary<string,Profile>{{"deepseek",new Profile{Url=DeepUrl,Model="deepseek-flash"}},{"custom",new Profile{Url="",Model=""}}};}
    }
    readonly string location;
    internal Preferences(string dir){location=Path.Combine(dir,"model-settings.json");}
    Config Load(){return File.Exists(location)?new JavaScriptSerializer().Deserialize<Config>(File.ReadAllText(location)):new Config();}
    internal object Describe(){
        var c=Load();var p=c.Profiles[c.Active];
        return new {active=c.Active,ready=!string.IsNullOrWhiteSpace(p.Model)&&(c.Active=="custom"||!string.IsNullOrEmpty(p.Secret)),profiles=c.Profiles.ToDictionary(x=>x.Key,x=>new {url=x.Value.Url,model=x.Value.Model,hasKey=!string.IsNullOrEmpty(x.Value.Secret)})};
    }
    internal void Save(string provider,string url,string model,string key){
        if(provider!="deepseek"&&provider!="custom")throw new ArgumentException("请选择服务商。");
        url=provider=="deepseek"?DeepUrl:(url??"").Trim();
        if(url.TrimEnd('/').EndsWith("/v1",StringComparison.OrdinalIgnoreCase)) url=url.TrimEnd('/')+"/chat/completions";
        url=AiSettings.CheckEndpoint(url).AbsoluteUri;
        if(string.IsNullOrWhiteSpace(model))throw new ArgumentException("请输入模型名称。");
        SharedWrites.WithLock(()=>{
            var c=Load();var p=c.Profiles[provider];
            if(p.Url!=url)p.Secret=null;
            if(key!=null){if(key.IndexOfAny(new[]{'\n','\r'})>=0)throw new ArgumentException("密钥格式无效。");
                p.Secret=string.IsNullOrWhiteSpace(key)?null:Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(key.Trim()),null,DataProtectionScope.CurrentUser));}
            p.Model=model.Trim();p.Url=url;c.Active=provider;
            Directory.CreateDirectory(Path.GetDirectoryName(location));var temp=location+"."+Guid.NewGuid().ToString("N")+".tmp";
            try{File.WriteAllText(temp,new JavaScriptSerializer().Serialize(c));if(File.Exists(location))File.Replace(temp,location,null);else File.Move(temp,location);}finally{if(File.Exists(temp))File.Delete(temp);}
            return true;
        });
    }
    internal AiSettings Current(){
        var c=Load();var p=c.Profiles[c.Active];
        if(string.IsNullOrWhiteSpace(p.Model)||(c.Active=="deepseek"&&string.IsNullOrEmpty(p.Secret)))throw new InvalidOperationException("请先在模型设置中配置 AI 服务。");
        return new AiSettings{Url=p.Url,Model=p.Model,Key=string.IsNullOrEmpty(p.Secret)?"":Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(p.Secret),null,DataProtectionScope.CurrentUser))};
    }
}
internal static class ShellMenu
{
    const string Label="Folio · 修改备注";
    static readonly Dictionary<string,string> Paths=new Dictionary<string,string>{
        {@"Software\Classes\*\shell\ProjectNotesLite.Edit","%1"},
        {@"Software\Classes\Directory\shell\ProjectNotesLite.Edit",@"%1\."},
        {@"Software\Classes\Directory\Background\shell\ProjectNotesLite.Edit",@"%V\."},
    };
    static string Command(string executable,string target){return "\""+executable+"\" --edit \""+target+"\"";}
    static bool Owns(string path,string target,string executable,bool includeLegacy=false){
        using(var key=Registry.CurrentUser.OpenSubKey(path+@"\command"))
        {
            var command=key==null?null:key.GetValue("") as string;
            return string.Equals(command,Command(executable,target),StringComparison.OrdinalIgnoreCase)||
                (includeLegacy&&string.Equals(command,Command(executable,"%1"),StringComparison.OrdinalIgnoreCase));
        }
    }
    internal static void Set(bool enabled,string executable){
        foreach(var entry in Paths){
            if(enabled){using(var k=Registry.CurrentUser.CreateSubKey(entry.Key)){
                k.SetValue("",Label);k.SetValue("MUIVerb",Label);k.SetValue("Icon","\""+executable+"\",0");k.SetValue("MultiSelectModel","Single");
                using(var cmd=k.CreateSubKey("command"))cmd.SetValue("",Command(executable,entry.Value));
            }}else if(Owns(entry.Key,entry.Value,executable,true))Registry.CurrentUser.DeleteSubKeyTree(entry.Key,false);
        }
        SHChangeNotify(0x08000000,0,IntPtr.Zero,IntPtr.Zero);
    }
    internal static bool Enabled(string exe){
        return Paths.All(entry=>Owns(entry.Key,entry.Value,exe));
    }
    [DllImport("shell32.dll")]static extern void SHChangeNotify(int e,uint f,IntPtr a,IntPtr b);
}
