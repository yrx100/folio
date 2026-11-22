import React, { useEffect, useRef, useState } from 'react';
import { Check, SlidersHorizontal, Sparkle } from '@phosphor-icons/react';
import { rpc } from '@/bridge';
import { BootPayload, ModelProfiles } from '@/types';
import { classifyEntry, leafName } from '@/utils/paths';
import { cn } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { FileGlyph } from './FileGlyph';
import { ModelSettingsForm } from './ModelSettingsForm';
import { TitleBar } from './TitleBar';
import { Button } from './ui/button';

export function QuickEdit({ boot }: { boot: BootPayload }) {
  const { root, dir } = boot;
  const [original, setOriginal] = useState('');
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const resumeAi = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const item = { name: leafName(root), path: root, dir, link: false };
  const limit = dir ? 200 : 2000;
  const { label } = classifyEntry(item);

  useEffect(() => {
    rpc<Record<string, string | null>>('notes', { path: root, paths: [root] })
      .then((res) => {
        if (res[root] == null) throw new Error('无法读取此项备注。');
        setOriginal(res[root]!);
        setText(res[root]!);
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [root]);

  useEffect(() => {
    rpc('dirty', { value: original !== text ? '1' : '0' }).catch(() => {});
  }, [original, text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else rpc('close');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettings]);

  async function generate() {
    if (working) return;
    setWorking('generating');
    setError('');
    try {
      const suggestion = await rpc<string>('suggest', { path: root });
      setText(suggestion);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setWorking('');
    }
  }

  async function startAi() {
    try {
      const profile = await rpc<ModelProfiles>('getSettings');
      if (profile.ready) await generate();
      else {
        resumeAi.current = true;
        setShowSettings(true);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  async function handleSave() {
    if (working || !loaded || text.length > limit) return;
    setWorking('saving');
    setError('');
    try {
      await rpc('save', { path: root, original, value: text });
      setOriginal(text);
      await rpc('close');
    } catch (err: any) {
      setError(err.message || String(err));
      setWorking('');
    }
  }

  return (
    <div className="grid h-full grid-rows-[40px_minmax(0,1fr)] bg-canvas">
      <TitleBar quick>
        <div className="inline-flex items-center gap-2 text-[12.5px] text-ink-secondary">
          <BrandMark size={18} />
          <strong className="font-semibold text-ink">Folio</strong>
          <span className="text-ink-faint">·</span>
          <span>{showSettings ? '模型设置' : '修改备注'}</span>
        </div>
      </TitleBar>

      {showSettings ? (
        <section className="min-h-0 overflow-auto px-5 pb-5 pt-4">
          <ModelSettingsForm
            onCancel={() => {
              resumeAi.current = false;
              setShowSettings(false);
            }}
            onSave={(profiles) => {
              setShowSettings(false);
              if (resumeAi.current) {
                resumeAi.current = false;
                if (profiles.ready) generate();
                else setError('请先配置模型 API Key。');
              }
            }}
          />
        </section>
      ) : (
        <section className="flex min-h-0 flex-col overflow-auto px-5 pb-4 pt-4">
          <div className="flex items-center gap-2.5 border-b border-hairline pb-3.5">
            <FileGlyph item={item} size={20} framed />
            <div className="min-w-0 flex-1">
              <h1 title={item.name} className="m-0 truncate font-display text-[16.5px] font-semibold text-ink">
                {item.name}
              </h1>
              <p title={root} className="mt-0.5 mb-0 flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                <span className="flex-none">{label}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate font-mono text-[11px]">{root}</span>
              </p>
            </div>
            <Button
              variant="icon"
              size="md"
              title="模型设置"
              aria-label="模型设置"
              disabled={Boolean(working)}
              onClick={() => setShowSettings(true)}
            >
              <SlidersHorizontal size={16} />
            </Button>
          </div>

          <div className="mb-2 mt-3 flex items-center justify-between">
            <label htmlFor="quick-note-box" className="inline-flex items-center gap-2 text-[12px] leading-none font-semibold text-ink-secondary">
              <span>备注内容</span>
              <span
                className={cn(
                  'text-[11.5px] leading-none font-normal tabular-nums',
                  text.length >= limit * 0.9 ? 'font-semibold text-status-warn' : 'text-ink-faint'
                )}
              >
                {text.length}/{limit}
              </span>
            </label>
            {working === 'generating' ? (
              <Button variant="secondary" size="xs" onClick={() => rpc('cancel')}>
                取消生成
              </Button>
            ) : (
              <Button
                variant="ai"
                size="xs"
                disabled={!loaded || Boolean(working)}
                onClick={startAi}
              >
                <Sparkle size={13} weight="duotone" />
                <span>AI 拟稿</span>
              </Button>
            )}
          </div>

          <textarea
            id="quick-note-box"
            ref={textareaRef}
            autoFocus
            value={text}
            disabled={!loaded || Boolean(working)}
            maxLength={limit}
            placeholder={dir ? '输入此文件夹的简短说明…' : '添加一条文件备注…'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && (e.key === 'Enter' || e.key.toLowerCase() === 's')) {
                e.preventDefault();
                handleSave();
              }
            }}
            className="min-h-24 flex-1 resize-none rounded-[12px] border border-border-subtle bg-elevated px-3 py-2.5 text-[13px] leading-[1.62] text-ink shadow-xs outline-none transition-all duration-150 placeholder:text-ink-faint focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-subtle)]"
          />

          <div
            role="status"
            className={cn(
              'mt-2 text-[11.5px]',
              error
                ? 'rounded-[8px] bg-status-danger-bg px-2.5 py-1.5 text-[12px] text-status-danger'
                : 'text-ink-muted'
            )}
          >
            {error ||
              (working === 'generating'
                ? '正在生成候选备注…'
                : working === 'saving'
                ? '正在保存…'
                : dir
                ? '保存后可在资源管理器的「备注」列查看。'
                : '文件备注保存在本机应用数据目录。')}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2.5">
            <span className="font-mono text-[11px] text-ink-faint">Ctrl + Enter 保存</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" onClick={() => rpc('close')}>
                取消
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!loaded || Boolean(working) || text.length > limit}
                onClick={handleSave}
              >
                <Check size={14} />
                <span>保存备注</span>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
