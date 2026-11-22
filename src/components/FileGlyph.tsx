import React from 'react';
import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FilePdf,
  FileText,
  FileXls,
  FolderOpen,
  FolderSimple,
} from '@phosphor-icons/react';
import { EntryItem } from '@/types';
import { classifyEntry } from '@/utils/paths';
import { cn } from '@/lib/utils';

interface FileGlyphProps {
  item: Pick<EntryItem, 'name' | 'dir'>;
  open?: boolean;
  size?: number;
  framed?: boolean;
  frameClassName?: string;
}

export function FileGlyph({ item, open = false, size = 18, framed = false, frameClassName }: FileGlyphProps) {
  const { category } = classifyEntry(item);
  let Icon: React.ComponentType<any> = File;
  let weight: 'duotone' | 'regular' = 'regular';

  if (item.dir) {
    Icon = open ? FolderOpen : FolderSimple;
    weight = 'duotone';
  } else if (category === 'pdf') {
    Icon = FilePdf;
    weight = 'duotone';
  } else if (category === 'sheet') {
    Icon = FileXls;
    weight = 'duotone';
  } else if (category === 'code') {
    Icon = FileCode;
    weight = 'duotone';
  } else if (category === 'media') {
    Icon = FileImage;
    weight = 'duotone';
  } else if (category === 'doc') {
    Icon = FileText;
    weight = 'duotone';
  } else if (category === 'archive') {
    Icon = FileArchive;
    weight = 'duotone';
  }

  const glyph = <Icon aria-hidden="true" size={size} weight={weight} className={`flex-none glyph-${category}`} />;
  if (!framed) return glyph;
  return (
    <span
      className={cn(
        'inline-grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px]',
        `glyph-frame-${category}`,
        frameClassName
      )}
    >
      {glyph}
    </span>
  );
}
