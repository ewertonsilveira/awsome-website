import { createFileRoute } from '@tanstack/react-router';
import { Hero } from '~/components/Hero';
import { ServiceCard } from '~/components/ServiceCard';
import { SectionHeading } from '~/components/SectionHeading';
import { Button } from '~/components/Button';
import { SERVICES } from '~/data/services';
import { BUSINESS } from '~/data/business';
import { HERO_SUBTITLE, VISION_PARAGRAPH } from '~/data/content';

export const Route = createFileRoute('/')({
  component: Home,
});

const HERO_TITLE = 'Quality Painting & Decorating You Can Trust';

function Home() {
  return (
    <>
      <Hero
        title={HERO_TITLE}
        subtitle={HERO_SUBTITLE}
        ctaLabel="Get a Free Quote"
        ctaTo="/contact"
      />

      {/* Services highlight */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="What We Do"
            title="Our Services"
            description="From painting and decorating to tiling, we cover it all — with the same commitment to quality on every job."
          />
          <ul role="list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <li key={service.id}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Since 1993 / vision section */}
      <section className="bg-white py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={`Serving Wellington Since ${BUSINESS.since}`}
            title="Trusted Tradespeople for Over 30 Years"
          />
          <p className="max-w-3xl text-lg text-gray-600 dark:text-gray-400">
            {VISION_PARAGRAPH}
          </p>
          <div className="mt-8">
            <Button as="link" to="/contact" variant="primary" size="md">
              Get in Touch
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
