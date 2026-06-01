import { createFileRoute } from '@tanstack/react-router';
import { SectionHeading } from '~/components/SectionHeading';
import { Button } from '~/components/Button';
import { BUSINESS } from '~/data/business';
import { ABOUT_INTRO, WHY_CHOOSE_US } from '~/data/content';

export const Route = createFileRoute('/about')({
  component: About,
});

function About() {
  return (
    <>
      {/* Company story */}
      <section className="bg-white py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={`Est. ${BUSINESS.since}`}
            title={`About ${BUSINESS.name}`}
            description={ABOUT_INTRO}
          />
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why Choose Us" title="What Sets Us Apart" />
          <ul className="mt-4 space-y-4">
            {WHY_CHOOSE_US.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-lg text-gray-700 dark:text-gray-300"
              >
                <span
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 shrink-0 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold"
                >
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading
            title="Ready to Get Started?"
            description="Contact us today for a free, no-obligation quote on your next painting or decorating project."
            className="mb-8"
          />
          <Button as="link" to="/contact" variant="primary" size="lg">
            Get a Free Quote
          </Button>
        </div>
      </section>
    </>
  );
}

export default About;
