import { type BusinessInfo } from '~/data/business';

type FooterProps = {
  business: BusinessInfo;
};

export function Footer({ business }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Business name + tagline */}
          <div>
            <p className="text-base font-bold text-brand-700 dark:text-brand-300">
              {business.name}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Serving Wellington since {business.since}.
            </p>
          </div>

          {/* Contact details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
              Contact
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${business.email}`}
                  className="text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300"
                >
                  {business.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${business.phone}`}
                  className="text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300"
                >
                  {business.phone}
                </a>
              </li>
              <li className="text-gray-600 dark:text-gray-300">
                {business.address}
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
              Follow us
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={business.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300"
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <p className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          &copy; {currentYear} {business.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
