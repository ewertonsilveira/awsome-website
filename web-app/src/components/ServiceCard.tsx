import { type Service } from '~/data/services';

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {service.icon !== undefined && (
        <p className="mb-3 text-3xl" aria-hidden="true">
          {service.icon}
        </p>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {service.title}
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {service.description}
      </p>
    </div>
  );
}
