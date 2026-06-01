import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { twMerge } from 'tailwind-merge';

type Shared = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverse';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

type ButtonButton = Shared & { as?: 'button' } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className'
  >;
type ButtonLink = Shared & {
  as: 'link';
  to: string;
  children?: ReactNode;
} & Omit<LinkProps, 'children' | 'className' | 'to'>;

export type ButtonProps = ButtonButton | ButtonLink;

const BASE =
  'rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const VARIANT_CLASSES: Record<NonNullable<Shared['variant']>, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-brand-600 text-brand-700 hover:bg-brand-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  inverse: 'bg-white text-brand-700 hover:bg-brand-50',
};

const SIZE_CLASSES: Record<NonNullable<Shared['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className } = props;

  const classes = twMerge(
    BASE,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );

  if (props.as === 'link') {
    const { as: _, variant: _v, size: _s, className: _c, to, ...rest } = props;
    // Button accepts any path string because routes are registered incrementally
    // across tasks (e.g. `/contact` is not a known route literal until T11), whereas
    // TanStack's <Link> is typed to registered routes only. Assert the target at this
    // single library boundary; `to` stays `string` in the public ButtonLink contract.
    return <Link className={classes} to={to as LinkProps['to']} {...rest} />;
  }

  const { as: _, variant: _v, size: _s, className: _c, ...rest } = props;
  return <button className={classes} {...rest} />;
}
