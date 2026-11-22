import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Desktop,
  FolderSimple,
  Moon,
  Palette,
  SlidersHorizontal,
  Sun,
  X,
} from '@phosphor-icons/react';
import { rpc } from '@/bridge';
import {
  AccentTone,
  DensityMode,
  ExplorerMenu,
  ModelProfiles,
  SettingsPage,
  ThemeMode,
  UiPreferences,
} from '@/types';
import { cn, SPRING_PILL, SPRING_SNAPPY } from '@/lib/utils';
import { ModelSettingsForm } from './ModelSettingsForm';
import { Button } from './ui/button';
import { SpringSwitch } from './ui/switch';

interface SettingsDialogProps {
  page: SettingsPage;
  prefs: UiPreferences;
  onNavigate: (page: SettingsPage) => void;
  onUpdatePrefs: (patch: Partial<UiPreferences>) => void;
  onSaveModels: (profiles: ModelProfiles) => void;
  onClose: () => void;
}

const SECTIONS: { id: SettingsPage; label: string; Icon: React.ComponentType<any> }[] = [
  { id: 'models', label: '模型设置', Icon: SlidersHorizontal },
  { id: 'explorer', label: '资源管理器', Icon: FolderSimple },
  { id: 'appearance', label: '外观偏好', Icon: Palette },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; desc: string; Icon: React.ComponentType<any> }[] = [
  { id: 'light', label: '纯白', desc: '纯净明亮画布', Icon: Sun },
  { id: 'dark', label: '深灰', desc: '沉静夜间模式', Icon: Moon },
  { id: 'system', label: '跟随系统', desc: '自动匹配 Windows', Icon: Desktop },
];

const ACCENT_OPTIONS: { id: AccentTone; label: string; swatch: string }[] = [
  { id: 'blue', label: '澄蓝', swatch: '#0066CC' },
  { id: 'ink', label: '曜石黑', swatch: '#171717' },
  { id: 'vermilion', label: '朱砂', swatch: '#D14933' },
  { id: 'terracotta', label: '赤陶', swatch: '#C45638' },
  { id: 'crimson', label: '绯红', swatch: '#C43D52' },
];

const DENSITY_OPTIONS: { id: DensityMode; label: string; desc: string }[] = [
  { id: 'comfortable', label: '标准舒朗', desc: '50px 行高，兼顾两行备注阅读' },
  { id: 'compact', label: '紧凑高效', desc: '40px 行高，同屏浏览更多条目' },
];

export function SettingsDialog({
  page,
  prefs,
  onNavigate,
  onUpdatePrefs,
  onSaveModels,
  onClose,
}: SettingsDialogProps) {
  const [menu, setMenu] = useState<ExplorerMenu | null>(null);
  const [menuError, setMenuError] = useState('');

  useEffect(() => {
    let live = true;
    rpc<ExplorerMenu>('menu')
      .then((status) => {
        if (live) setMenu(status);
      })
      .catch((err) => {
        if (live) setMenuError(err.message);
      });
    return () => {
      live = false;
    };
  }, []);

  async function toggleExplorerMenu() {
    const previous = menu;
    setMenu(null);
    setMenuError('');
    try {
      const next = await rpc<ExplorerMenu>('setMenu', { value: previous === 'off' ? 'on' : 'off' });
      setMenu(next);
    } catch (err: any) {
      setMenuError(err.message || String(err));
      setMenu(previous);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_SNAPPY}
      className="grid h-full grid-cols-[188px_minmax(0,1fr)]"
    >
      {/* Apple/BoardUI left preferences rail */}
      <div className="border-r border-hairline bg-chrome px-3 py-5">
        <div
          id="settings-heading"
          className="mb-3.5 px-2.5 text-[11.5px] font-semibold tracking-[0.05em] text-ink-muted"
        >
          偏好设置
        </div>
        <nav aria-label="设置分类" className="flex flex-col gap-1">
          {SECTIONS.map(({ id, label, Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(id)}
                className={cn(
                  'relative z-[1] flex h-[34px] w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[13px] transition-colors duration-150',
                  active ? 'font-semibold text-accent-text' : 'text-ink-secondary hover:bg-hover hover:text-ink'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-nav-pill"
                    transition={SPRING_PILL}
                    aria-hidden="true"
                    className="absolute inset-0 -z-[1] rounded-[9px] bg-accent-soft"
                  />
                )}
                <Icon size={16} weight={active ? 'duotone' : 'regular'} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right settings content */}
      <div className="relative min-h-0 overflow-auto px-7 py-6">
        <Button
          variant="icon"
          size="sm"
          title="关闭设置 (Esc)"
          aria-label="关闭设置"
          onClick={onClose}
          className="absolute right-4 top-4"
        >
          <X size={16} />
        </Button>

        <section hidden={page !== 'models'}>
          <h2 className="mb-1 mr-9 mt-0 font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">
            模型设置
          </h2>
          <ModelSettingsForm onSave={onSaveModels} />
        </section>

        <section hidden={page !== 'explorer'}>
          <h2 className="mb-1 mr-9 mt-0 font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">
            资源管理器集成
          </h2>
          <p className="mb-4 mt-0 text-[12.5px] text-ink-muted">
            让 Folio 备注融入你的 Windows 日常文件操作流。
          </p>

          <div className="flex items-center justify-between gap-4 rounded-[14px] border border-hairline bg-elevated p-4 shadow-xs">
            <div>
              <strong className="block text-[13.5px] font-semibold text-ink">右键快捷修改备注</strong>
              <p className="mt-1 mb-0 text-[12px] leading-[1.55] text-ink-muted">
                {menu === 'classic'
                  ? '右键文件、文件夹或目录空白处，选择「Folio · 修改备注」。如未看到该命令，请打开「显示更多选项」。'
                  : '右键文件、文件夹或目录空白处，选择「Folio · 修改备注」打开编辑框。'}
              </p>
            </div>
            <SpringSwitch
              ariaLabel="右键菜单显示修改备注"
              disabled={menu === null}
              checked={menu === 'classic' || menu === 'modern'}
              onChange={toggleExplorerMenu}
            />
          </div>

          <div className="mt-3 rounded-[12px] bg-subtle px-4 py-3.5">
            <strong className="mb-1 block text-[12.5px] font-semibold text-ink-secondary">
              关于备注列同步
            </strong>
            <p className="m-0 text-[12px] leading-[1.6] text-ink-muted">
              文件夹备注写入 Windows 原生{' '}
              <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink">desktop.ini</code>{' '}
              的{' '}
              <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink">InfoTip</code>{' '}
              属性；在工作区顶部点击「资源管理器备注列」即可一键切换详细信息视图并显示备注列。
            </p>
          </div>

          {menuError && (
            <div role="alert" className="mt-3 rounded-[8px] bg-status-danger-bg px-3 py-2 text-[12px] text-status-danger">
              {menuError}
            </div>
          )}
        </section>

        <section hidden={page !== 'appearance'}>
          <h2 className="mb-1 mr-9 mt-0 font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">
            外观偏好
          </h2>
          <p className="mb-5 mt-0 text-[12.5px] text-ink-muted">
            自定义界面明暗模式、强调色与列表节奏。
          </p>

          <div className="mb-5">
            <span className="mb-2 block text-[12px] font-semibold text-ink-secondary">界面主题</span>
            <div className="grid grid-cols-3 gap-2.5">
              {THEME_OPTIONS.map(({ id, label, desc, Icon }) => {
                const selected = prefs.theme === id;
                return (
                  <motion.button
                    key={id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING_SNAPPY}
                    aria-pressed={selected}
                    onClick={() => onUpdatePrefs({ theme: id })}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-[12px] border p-3 text-left transition-colors duration-150',
                      selected
                        ? 'border-accent-border bg-accent-subtle shadow-[inset_0_0_0_1px_var(--accent-border)]'
                        : 'border-hairline bg-elevated hover:border-border-strong'
                    )}
                  >
                    <Icon
                      size={17}
                      weight={selected ? 'duotone' : 'regular'}
                      className={cn('mb-0.5', selected ? 'text-accent-text' : 'text-ink-secondary')}
                    />
                    <strong className="text-[12.5px] font-semibold text-ink">{label}</strong>
                    <small className="text-[11px] leading-[1.4] text-ink-muted">{desc}</small>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <span className="mb-2 block text-[12px] font-semibold text-ink-secondary">主题强调色</span>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((item) => {
                const selected = prefs.accent === item.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING_SNAPPY}
                    aria-pressed={selected}
                    onClick={() => onUpdatePrefs({ accent: item.id })}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-full border pl-2.5 pr-3.5 text-[12.5px] font-medium transition-colors duration-150',
                      selected
                        ? 'border-accent-border bg-accent-soft text-accent-text font-semibold'
                        : 'border-hairline bg-elevated text-ink hover:border-border-strong'
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.16)]"
                      style={{ backgroundColor: item.swatch }}
                    />
                    <span>{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[12px] font-semibold text-ink-secondary">列表密度</span>
            <div className="grid grid-cols-2 gap-2.5">
              {DENSITY_OPTIONS.map((item) => {
                const selected = prefs.density === item.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING_SNAPPY}
                    aria-pressed={selected}
                    onClick={() => onUpdatePrefs({ density: item.id })}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-[12px] border p-3 text-left transition-colors duration-150',
                      selected
                        ? 'border-accent-border bg-accent-subtle shadow-[inset_0_0_0_1px_var(--accent-border)]'
                        : 'border-hairline bg-elevated hover:border-border-strong'
                    )}
                  >
                    <strong className="text-[12.5px] font-semibold text-ink">{item.label}</strong>
                    <small className="text-[11px] leading-[1.4] text-ink-muted">{item.desc}</small>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
