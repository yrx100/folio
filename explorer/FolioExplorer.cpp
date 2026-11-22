#include <windows.h>
#include <shlobj.h>
#include <shlwapi.h>
#include <wrl.h>
#include <wrl/module.h>
#include <memory>
#include <string>

using namespace Microsoft::WRL;

extern "C" IMAGE_DOS_HEADER __ImageBase;

namespace
{
    using ShellString = std::unique_ptr<wchar_t, decltype(&CoTaskMemFree)>;

    HRESULT FolioPath(std::wstring& path)
    {
        wchar_t modulePath[32768];
        auto module = reinterpret_cast<HMODULE>(&__ImageBase);
        const DWORD count = GetModuleFileNameW(module, modulePath, ARRAYSIZE(modulePath));
        if (count == 0 || count == ARRAYSIZE(modulePath))
            return HRESULT_FROM_WIN32(GetLastError());

        path.assign(modulePath, count);
        path.resize(path.find_last_of(L'\\') + 1);
        path += L"Folio.exe";
        return S_OK;
    }

    HRESULT SelectedItem(IShellItemArray* selection, IShellItem** item)
    {
        DWORD count = 0;
        if (!selection || FAILED(selection->GetCount(&count)) || count != 1)
            return E_INVALIDARG;
        return selection->GetItemAt(0, item);
    }

    HRESULT BackgroundItem(IUnknown* site, IShellItem** item)
    {
        if (!site) return E_INVALIDARG;

        ComPtr<IFolderView> folder;
        HRESULT hr = IUnknown_QueryService(site, SID_SFolderView, IID_PPV_ARGS(&folder));
        if (FAILED(hr))
        {
            ComPtr<IShellBrowser> browser;
            hr = IUnknown_QueryService(site, SID_STopLevelBrowser, IID_PPV_ARGS(&browser));
            if (FAILED(hr)) return hr;

            ComPtr<IShellView> view;
            hr = browser->QueryActiveShellView(&view);
            if (FAILED(hr)) return hr;
            hr = view.As(&folder);
        }
        if (FAILED(hr)) return hr;

        ComPtr<IPersistFolder2> location;
        hr = folder->GetFolder(IID_PPV_ARGS(&location));
        if (FAILED(hr)) return hr;

        PIDLIST_ABSOLUTE folderId = nullptr;
        hr = location->GetCurFolder(&folderId);
        if (SUCCEEDED(hr)) hr = SHCreateItemFromIDList(folderId, IID_PPV_ARGS(item));
        CoTaskMemFree(folderId);
        return hr;
    }

    HRESULT LaunchEditor(PCWSTR target)
    {
        std::wstring executable;
        const HRESULT hr = FolioPath(executable);
        if (FAILED(hr)) return hr;

        std::wstring command = L"\"" + executable + L"\" --edit \"";
        command += target;
        // Backslashes immediately before the closing quote are escaped, including for drive roots.
        for (size_t length = wcslen(target); length && target[length - 1] == L'\\'; --length)
            command += L'\\';
        command += L'"';

        STARTUPINFOW startup = { sizeof(startup) };
        PROCESS_INFORMATION process = {};
        if (!CreateProcessW(executable.c_str(), command.data(), nullptr, nullptr, FALSE, 0, nullptr,
                            nullptr, &startup, &process))
            return HRESULT_FROM_WIN32(GetLastError());

        CloseHandle(process.hThread);
        CloseHandle(process.hProcess);
        return S_OK;
    }

    template<class Command, bool Background>
    class EditNote : public RuntimeClass<RuntimeClassFlags<ClassicCom>, IExplorerCommand, IObjectWithSite>
    {
        ComPtr<IUnknown> site;

        HRESULT Target(IShellItemArray* selection, PWSTR* path)
        {
            ComPtr<IShellItem> item;
            HRESULT hr = SelectedItem(selection, &item);
            if constexpr (Background)
            {
                if (FAILED(hr)) hr = BackgroundItem(site.Get(), &item);
            }
            return FAILED(hr) ? hr : item->GetDisplayName(SIGDN_FILESYSPATH, path);
        }

    public:
        IFACEMETHODIMP GetTitle(IShellItemArray*, PWSTR* title) noexcept override
        {
            return SHStrDupW(L"Folio · 修改备注", title);
        }

        IFACEMETHODIMP GetIcon(IShellItemArray*, PWSTR* icon) noexcept override
        {
            try
            {
                std::wstring path;
                const HRESULT hr = FolioPath(path);
                if (FAILED(hr)) return hr;
                return SHStrDupW((L"\"" + path + L"\",0").c_str(), icon);
            }
            catch (const std::bad_alloc&)
            {
                return E_OUTOFMEMORY;
            }
        }

        IFACEMETHODIMP GetToolTip(IShellItemArray*, PWSTR* text) noexcept override
        {
            *text = nullptr;
            return E_NOTIMPL;
        }

        IFACEMETHODIMP GetCanonicalName(GUID* name) noexcept override
        {
            *name = __uuidof(Command);
            return S_OK;
        }

        IFACEMETHODIMP GetState(IShellItemArray* selection, BOOL, EXPCMDSTATE* state) noexcept override
        {
            PWSTR rawPath = nullptr;
            const HRESULT hr = Target(selection, &rawPath);
            const ShellString path(rawPath, CoTaskMemFree);
            *state = SUCCEEDED(hr) ? ECS_ENABLED : ECS_HIDDEN;
            return S_OK;
        }

        IFACEMETHODIMP Invoke(IShellItemArray* selection, IBindCtx*) noexcept override
        {
            PWSTR rawPath = nullptr;
            const HRESULT hr = Target(selection, &rawPath);
            const ShellString path(rawPath, CoTaskMemFree);
            if (FAILED(hr)) return hr;
            try
            {
                return LaunchEditor(path.get());
            }
            catch (const std::bad_alloc&)
            {
                return E_OUTOFMEMORY;
            }
        }

        IFACEMETHODIMP GetFlags(EXPCMDFLAGS* flags) noexcept override
        {
            *flags = ECF_DEFAULT;
            return S_OK;
        }

        IFACEMETHODIMP EnumSubCommands(IEnumExplorerCommand** commands) noexcept override
        {
            *commands = nullptr;
            return E_NOTIMPL;
        }

        IFACEMETHODIMP SetSite(IUnknown* value) noexcept override
        {
            site = value;
            return S_OK;
        }

        IFACEMETHODIMP GetSite(REFIID iid, void** value) noexcept override
        {
            *value = nullptr;
            return site ? site.CopyTo(iid, value) : E_FAIL;
        }
    };
}

class __declspec(uuid("892DF734-70CE-40A3-974F-2372EBA575E3")) EditSelection
    : public EditNote<EditSelection, false> {};
class __declspec(uuid("5B1353E6-E03B-4882-99CC-6172B73E5809")) EditBackground
    : public EditNote<EditBackground, true> {};

CoCreatableClass(EditSelection)
CoCreatableClass(EditBackground)

STDAPI DllGetClassObject(REFCLSID id, REFIID iid, void** object)
{
    return Module<InProc>::GetModule().GetClassObject(id, iid, object);
}

STDAPI DllCanUnloadNow()
{
    return Module<InProc>::GetModule().Terminate() ? S_OK : S_FALSE;
}
