import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PlusIcon       = (p: IconProps) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const SearchIcon     = (p: IconProps) => <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Base>;
export const TagIcon        = (p: IconProps) => <Base {...p}><path d="M20 12.5 12.5 20l-9-9V4h7l9.5 9.5Z" /><circle cx="7.5" cy="7.5" r="1.5" /></Base>;
export const StarIcon       = (p: IconProps) => <Base {...p}><path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7L12 3Z" /></Base>;
export const StarFilledIcon = (p: IconProps) => <Base {...p} fill="currentColor"><path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7L12 3Z" /></Base>;
export const TrashIcon      = (p: IconProps) => <Base {...p}><path d="M3 6h18M8 6V4h8v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" /></Base>;
export const PinIcon        = (p: IconProps) => <Base {...p}><path d="M12 2v6l3 3-1 1H6l-1-1 3-3V2h4Z M10 12v10" /></Base>;
export const FolderIcon     = (p: IconProps) => <Base {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></Base>;
export const PaperclipIcon  = (p: IconProps) => <Base {...p}><path d="M21 12.5 12 21a5.5 5.5 0 0 1-7.8-7.8l9-9a3.5 3.5 0 0 1 5 5l-9 9a1.5 1.5 0 0 1-2.1-2.1l8-8" /></Base>;
export const EyeIcon        = (p: IconProps) => <Base {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Base>;
export const SplitIcon      = (p: IconProps) => <Base {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /></Base>;
export const EditIcon       = (p: IconProps) => <Base {...p}><path d="M4 20h4l10.5-10.5a2 2 0 0 0-2.8-2.8L5 17v3Z" /></Base>;
export const SunIcon        = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M6 6 4.5 4.5M19.5 19.5 18 18M18 6l1.5-1.5M4.5 19.5 6 18" /></Base>;
export const MoonIcon       = (p: IconProps) => <Base {...p}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></Base>;
export const SortIcon       = (p: IconProps) => <Base {...p}><path d="M3 6h13M3 12h9M3 18h5M17 8l3-3 3 3M20 5v14" /></Base>;
export const HomeIcon       = (p: IconProps) => <Base {...p}><path d="m3 11 9-8 9 8M5 10v10h14V10" /></Base>;
