import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Eye, EyeSlash, ShieldCheck } from '@phosphor-icons/react';
import { rpc } from '@/bridge';
import { ModelProfiles, ServiceId } from '@/types';
import { cn, SPRING_PILL, SPRING_SNAPPY } from '@/lib/utils';
import { Button } from './ui/button';

interface ModelSettingsFormProps {
  onSave: (profiles: ModelProfiles) => void;
  onCancel?: () => void;
}

const PROVIDERS: { id: ServiceId; title: string; desc: string }[] = [
  { id: 'deepseek', title: 'DeepSeek', desc: '官方默认接口' },
  { id: 'custom', title: '自定义接口', desc: 'OpenAI Chat Completions 兼容' },
];

export function ModelSettingsForm({ onSave, onCancel }: ModelSettingsFormProps) {
  const [data, setData] = useState<ModelProfiles | null>(null);
  const [service, setService] = useState<ServiceId>('deepseek');
  const [url, setUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function selectService(next: ServiceId, source: ModelProfiles) {
    setService(next);
    setUrl(source.profiles[next].url);
    setModel(source.profiles[next].model);
    setApiKey('');
    setShowKey(false);
    setClearKey(false);
    setError('');
  }

  useEffect(() => {
    rpc<ModelProfiles>('getSettings')
      .then((profiles) => {
        setData(profiles);
        selectService(profiles.active, profiles);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !data || !model.trim() || !url.trim()) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const updated = await rpc<ModelProfiles>('settings', {
        provider: service,
        url,
        model,
        key: clearKey ? '' : apiKey || null,
      });
      setData(updated);
      selectService(updated.active, updated);
      setSaved(true);
      onSave(updated);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const hasSavedKey = Boolean(data?.profiles[service].hasKey && data.profiles[service].url === url);

  return (
    <form className="flex flex-col gap-3.5" onSubmit={handleSave} onChange={() => setSaved(false)}>
      <p className="m-0 text-[12.5px] text-ink-muted">主窗口与资源管理器右键快捷编辑共用此配置。</p>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-ink-secondary" id="model-service-label">
          模型服务
        </span>
        <div
          role="radiogroup"
          aria-labelledby="model-service-label"
          className="grid grid-cols-2 gap-2"
        >
          {PROVIDERS.map((p) => {
            const active = service === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!data}
                whileTap={{ scale: 0.985 }}
                transition={SPRING_SNAPPY}
                onClick={() => data && selectService(p.id, data)}
                className={cn(
                  'relative flex flex-col items-start gap-0.5 rounded-[11px] border px-3 py-2 text-left transition-colors duration-150',
                  active
                    ? 'border-accent-border bg-accent-subtle'
                    : 'border-border-subtle bg-elevated hover:border-border-strong'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="provider-active-ring"
                    transition={SPRING_PILL}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[11px] ring-1 ring-inset ring-accent-border"
                  />
                )}
                <strong
                  className={cn(
                    'text-[12.5px] font-semibold',
                    active ? 'text-accent-text' : 'text-ink'
                  )}
                >
                  {p.title}
                </strong>
                <span className="text-[11px] text-ink-muted">{p.desc}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="model-url" className="text-[12px] font-semibold text-ink-secondary">
          接口地址
        </label>
        <input
          id="model-url"
          value={url}
          readOnly={service === 'deepseek'}
          placeholder="https://…/v1/chat/completions"
          onChange={(e) => setUrl(e.target.value)}
          className="h-9 w-full rounded-[9px] border border-border-subtle bg-elevated px-3 font-mono text-[12px] text-ink outline-none transition-all duration-150 focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-subtle)] read-only:bg-subtle read-only:text-ink-muted"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="model-name" className="text-[12px] font-semibold text-ink-secondary">
          模型名称
        </label>
        <input
          id="model-name"
          list={service === 'deepseek' ? 'ds-models' : undefined}
          value={model}
          placeholder="填写服务商提供的模型 ID"
          onChange={(e) => setModel(e.target.value)}
          className="h-9 w-full rounded-[9px] border border-border-subtle bg-elevated px-3 font-mono text-[12px] text-ink outline-none transition-all duration-150 focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-subtle)]"
        />
        <datalist id="ds-models">
          <option value="deepseek-chat" />
          <option value="deepseek-reasoner" />
          <option value="deepseek-flash" />
          <option value="deepseek-v4-pro" />
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="model-key" className="text-[12px] font-semibold text-ink-secondary">
            API Key
          </label>
          {hasSavedKey && (
            <span className="rounded-full bg-status-ok-bg px-2 py-[1px] text-[11px] font-semibold text-status-ok">
              已加密保存
            </span>
          )}
        </div>
        <div className="relative flex items-center">
          <input
            id="model-key"
            autoComplete="off"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            disabled={clearKey}
            placeholder={
              hasSavedKey
                ? '已保存密钥，留空沿用当前密钥'
                : service === 'deepseek'
                ? '输入 DeepSeek API Key'
                : '如本地服务无需密钥，可留空'
            }
            onChange={(e) => setApiKey(e.target.value)}
            className="h-9 w-full rounded-[9px] border border-border-subtle bg-elevated pl-3 pr-9 font-mono text-[12px] text-ink outline-none transition-all duration-150 placeholder:font-sans placeholder:text-[12.5px] placeholder:text-ink-faint focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-subtle)] disabled:opacity-50"
          />
          <Button
            variant="icon"
            size="xs"
            disabled={clearKey}
            title={showKey ? '隐藏密钥' : '显示密钥'}
            aria-label={showKey ? '隐藏密钥' : '显示密钥'}
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-1.5"
          >
            {showKey ? <EyeSlash size={14} /> : <Eye size={14} />}
          </Button>
        </div>
      </div>

      {hasSavedKey && (
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-secondary">
          <input
            type="checkbox"
            checked={clearKey}
            onChange={(e) => setClearKey(e.target.checked)}
            className="m-0 h-[15px] w-[15px]"
          />
          <span>清除该服务已保存的密钥</span>
        </label>
      )}

      <div className="flex items-start gap-2 rounded-[10px] bg-subtle px-3 py-2.5 text-[12px] leading-[1.55] text-ink-muted">
        <ShieldCheck size={15} weight="duotone" className="mt-0.5 flex-none text-status-ok" aria-hidden="true" />
        <span>密钥通过 Windows DPAPI 为当前系统用户加密保存。仅在主动点击 AI 拟稿时发送所选项的结构摘录。</span>
      </div>

      {error && (
        <div role="alert" className="rounded-[8px] bg-status-danger-bg px-3 py-2 text-[12px] text-status-danger">
          {error}
        </div>
      )}

      <div className="mt-1 flex items-center justify-end gap-2">
        {saved && (
          <span className="mr-auto inline-flex items-center gap-1 text-[12px] font-semibold text-status-ok" role="status">
            <Check size={13} />
            已保存配置
          </span>
        )}
        {onCancel && (
          <Button variant="secondary" size="md" onClick={onCancel}>
            返回
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={busy || !data || !model.trim() || !url.trim()}
        >
          保存模型设置
        </Button>
      </div>
    </form>
  );
}
