import { driver, DriveStep } from 'driver.js';
import type { PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';
import { rpc } from '@/bridge';
import type { ExplorerMenu } from '@/types';

const FIRST_RUN_KEY = 'folio.first-run.v1';

export function hasSeenGuide(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_KEY) === '1';
  } catch {
    return false;
  }
}

function renderExplorerMenuSetup({ description, nextButton }: PopoverDOM) {
  const controls = document.createElement('div');
  controls.className = 'folio-guide-menu-setup';

  const enableButton = document.createElement('button');
  enableButton.type = 'button';
  enableButton.textContent = '开启右键菜单';
  enableButton.disabled = true;

  const feedback = document.createElement('div');
  feedback.setAttribute('role', 'status');
  feedback.textContent = '正在检查右键菜单…';
  controls.append(enableButton, feedback);
  description.append(controls);

  function showStatus(menu: ExplorerMenu) {
    if (!controls.isConnected) return;
    const enabled = menu !== 'off';
    if (enabled && document.activeElement === enableButton) nextButton.focus();
    enableButton.hidden = enabled;
    enableButton.disabled = enabled;
    feedback.textContent = enabled ? '右键菜单已开启。' : '';
  }

  function showError(error: unknown) {
    if (!controls.isConnected) return;
    enableButton.disabled = false;
    feedback.textContent = error instanceof Error ? error.message : String(error);
  }

  enableButton.addEventListener('click', () => {
    enableButton.disabled = true;
    feedback.textContent = '正在开启右键菜单…';
    rpc<ExplorerMenu>('setMenu', { value: 'on' }).then(showStatus, showError);
  });

  rpc<ExplorerMenu>('menu').then(showStatus, showError);
}

export function showGuide(hasFolder: boolean, onOpen: () => void) {
  const steps: DriveStep[] = [
    {
      element: hasFolder ? '[data-tour="switch"]' : '[data-tour="open"]',
      popover: {
        title: '打开本地工作区',
        description: '选择任意本地目录，左侧目录树会完整呈现层级结构并支持快速切换。',
      },
    },
    {
      element: hasFolder ? '[data-tour="folder-note"]' : '[data-tour="example"]',
      popover: {
        title: '为目录和文件写备注',
        description: '顶部可直接编辑当前目录备注；选中任意文件即可在右侧详情栏编写，或一键用 AI 生成草稿。',
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: '模型与外观设置',
        description: '在设置里配置 DeepSeek 或兼容接口，切换明暗主题与强调色。',
      },
    },
    {
      popover: {
        title: '开启资源管理器右键菜单',
        description: '可以在这里开启，也可以在「设置 → 资源管理器」中切换「右键快捷修改备注」。',
        onPopoverRender: renderExplorerMenuSetup,
      },
    },
    {
      popover: {
        title: '用右键菜单修改备注',
        description: '在 Windows 资源管理器中，右键文件、文件夹或文件夹内的空白处，选择「Folio · 修改备注」。如果一级菜单里没有这项，请打开「显示更多选项」。输入备注后，点击「保存备注」。',
      },
    },
  ];

  const isDark = document.documentElement.dataset.theme === 'dark';
  const guide = driver({
    steps,
    animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    overlayColor: isDark ? '#0A0A0A' : '#171717',
    overlayOpacity: isDark ? 0.62 : 0.38,
    stagePadding: 6,
    stageRadius: 10,
    disableActiveInteraction: true,
    allowClose: true,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    doneBtnText: hasFolder ? '完成' : '选择文件夹',
    closeBtnLabel: '关闭引导',
    popoverClass: 'folio-guide',
    onDoneClick: () => {
      guide.destroy();
      if (!hasFolder) onOpen();
    },
    onDestroyed: () => {
      try {
        localStorage.setItem(FIRST_RUN_KEY, '1');
      } catch {}
    },
  });

  guide.drive();
  return guide;
}
