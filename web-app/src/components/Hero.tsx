import { Button } from '~/components/Button';

type HeroProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaTo: string;
};

export function Hero({ title, subtitle, ctaLabel, ctaTo }: HeroProps) {
  return (
    <section className="bg-brand-700 py-20 text-white dark:bg-brand-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-brand-100 sm:text-xl">
          {subtitle}
        </p>
        <div className="mt-8">
          <Button as="link" to={ctaTo} variant="inverse" size="lg">
            {ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
