import React, { useEffect, useState } from 'react';
import { CopySimple, Minus, Square, X } from '@phosphor-icons/react';
import { onHostEvent, rpc } from '@/bridge';
import { cn } from '@/lib/utils';

interface TitleBarProps {
  children?: React.ReactNode;
  rightSlot?: React.ReactNode;
  quick?: boolean;
}

export function TitleBar({ children, rightSlot, quick = false }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const off = onHostEvent((data) => {
      if (data.event === 'windowState') setMaximized(Boolean(data.maximized));
    });
    rpc<boolean>('window').then(setMaximized).catch(() => {});
    return off;
  }, []);

  const resizeLabel = maximized ? '还原窗口' : '最大化窗口';

  return (
    <header
      className={cn(
        'app-drag flex flex-none items-center border-b border-hairline pl-3 select-none',
        quick ? 'h-10 bg-chrome' : 'h-11 bg-canvas/95 backdrop-blur-sm'
      )}
    >
      <div className="app-no-drag flex min-w-0 max-w-[68%] flex-initial items-center gap-1">{children}</div>
      <div className="min-w-6 flex-1 self-stretch" aria-hidden="true" />
      {rightSlot && <div className="app-no-drag mr-1.5 flex flex-none items-center gap-1">{rightSlot}</div>}
      <div className="app-no-drag flex flex-none self-stretch">
        <button
          type="button"
          title="最小化窗口"
          aria-label="最小化窗口"
          onClick={() => rpc('window', { value: 'minimize' })}
          className="grid w-11 place-items-center text-ink-secondary transition-colors duration-150 hover:bg-hover hover:text-ink focus-visible:-outline-offset-3"
        >
          <Minus size={13} />
        </button>
        {!quick && (
          <button
            type="button"
            title={resizeLabel}
            aria-label={resizeLabel}
            onClick={() => rpc('window', { value: 'maximize' })}
            className="grid w-11 place-items-center text-ink-secondary transition-colors duration-150 hover:bg-hover hover:text-ink focus-visible:-outline-offset-3"
          >
            {maximized ? <CopySimple size={12} /> : <Square size={11} />}
          </button>
        )}
        <button
          type="button"
          title="关闭窗口"
          aria-label="关闭窗口"
          onClick={() => rpc('close')}
          className="grid w-11 place-items-center text-ink-secondary transition-colors duration-150 hover:bg-status-danger hover:text-white focus-visible:-outline-offset-3"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
}
