import { createFileRoute } from '@tanstack/react-router';
import { Button } from '~/components/Button';

export const Route = createFileRoute('/$')({
  component: NotFound,
});

export function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
        404
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-6 max-w-md text-lg text-gray-600 dark:text-gray-400">
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
      </p>
      <div className="mt-10">
        <Button as="link" to="/" variant="primary" size="md">
          Back to home
        </Button>
      </div>
    </section>
  );
}

export default NotFound;
