import { createFileRoute } from '@tanstack/react-router';
import { SectionHeading } from '~/components/SectionHeading';
import { ContactForm } from '~/components/ContactForm';
import { BUSINESS } from '~/data/business';
import { SERVICES } from '~/data/services';

export const Route = createFileRoute('/contact')({
  component: Contact,
});

function Contact() {
  return (
    <>
      {/* Contact details */}
      <section className="bg-white py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Get in Touch"
            title="Contact Us"
            description="We'd love to hear from you. Reach out directly or fill in the form below and we'll get back to you promptly."
          />
          <dl className="mt-6 space-y-4 text-lg text-gray-700 dark:text-gray-300">
            <div className="flex gap-3">
              <dt className="font-semibold text-gray-900 dark:text-gray-100">
                Business:
              </dt>
              <dd>{BUSINESS.name}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="font-semibold text-gray-900 dark:text-gray-100">
                Phone:
              </dt>
              <dd>
                <a
                  href={`tel:${BUSINESS.phone}`}
                  className="text-brand-700 underline hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  {BUSINESS.phone}
                </a>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="font-semibold text-gray-900 dark:text-gray-100">
                Email:
              </dt>
              <dd>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="text-brand-700 underline hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  {BUSINESS.email}
                </a>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="font-semibold text-gray-900 dark:text-gray-100">
                Address:
              </dt>
              <dd>{BUSINESS.address}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Contact form */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Send a Message"
            title="Request a Free Quote"
            description="Fill in your details and we'll be in touch to discuss your project."
          />
          <ContactForm services={SERVICES} />
        </div>
      </section>
    </>
  );
}

export default Contact;
