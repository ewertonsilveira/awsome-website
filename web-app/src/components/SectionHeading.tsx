import { twMerge } from 'tailwind-merge';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={twMerge('mb-10', className)}>
      {eyebrow && (
        <p className="text-sm font-semibold tracking-widest uppercase text-accent-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}
