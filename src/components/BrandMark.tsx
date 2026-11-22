import React from 'react';

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Back archival folder tab */}
      <path
        d="M3.5 6.75C3.5 5.507 4.507 4.5 5.75 4.5H9.6c.52 0 1.02.222 1.366.612l.884.996c.173.195.421.307.683.307H18.25c1.243 0 2.25 1.007 2.25 2.25V17.25c0 1.243-1.007 2.25-2.25 2.25H5.75c-1.243 0-2.25-1.007-2.25-2.25V6.75Z"
        fill="var(--brand-mark-bg)"
      />
      {/* Crisp archival sheet lines */}
      <rect x="7" y="10.25" width="7.2" height="1.6" rx="0.8" fill="var(--brand-mark-line)" />
      <rect x="7" y="13.5" width="4.8" height="1.6" rx="0.8" fill="var(--brand-mark-line)" opacity="0.68" />
      {/* Signature index seal */}
      <rect x="15.5" y="10.25" width="2.5" height="4.85" rx="1.1" fill="var(--brand-mark-seal)" />
    </svg>
  );
}
