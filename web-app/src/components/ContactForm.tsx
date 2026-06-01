import { useState } from 'react';
import { type Service } from '~/data/services';
import { ContactSchema, type ContactValues } from '~/data/contact';

interface ContactFormProps {
  services: Service[];
}

type FieldErrors = Partial<Record<keyof ContactValues, string>>;
type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export function ContactForm({ services }: ContactFormProps) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<FormStatus>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const result = ContactSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactValues;
        if (field && errors[field] === undefined) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStatus('submitting');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div
        role="alert"
        className="rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950"
      >
        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
          Message sent!
        </p>
        <p className="mt-2 text-green-600 dark:text-green-400">
          Thanks for reaching out. We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  const inputBase =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 ' +
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ' +
    'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

  const inputError =
    'border-red-400 focus-visible:ring-red-400 dark:border-red-500';

  return (
    <form
      name="contact"
      method="POST"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          aria-required="true"
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          aria-invalid={fieldErrors.name !== undefined ? true : undefined}
          className={`${inputBase} ${fieldErrors.name ? inputError : ''}`}
        />
        {fieldErrors.name && (
          <span
            id="name-error"
            role="alert"
            className="mt-1 block text-sm text-red-600 dark:text-red-400"
          >
            {fieldErrors.name}
          </span>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email <span aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-required="true"
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          aria-invalid={fieldErrors.email !== undefined ? true : undefined}
          className={`${inputBase} ${fieldErrors.email ? inputError : ''}`}
        />
        {fieldErrors.email && (
          <span
            id="email-error"
            role="alert"
            className="mt-1 block text-sm text-red-600 dark:text-red-400"
          >
            {fieldErrors.email}
          </span>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label
          htmlFor="phone"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Phone{' '}
          <span className="text-gray-500 dark:text-gray-400">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
          aria-invalid={fieldErrors.phone !== undefined ? true : undefined}
          className={`${inputBase} ${fieldErrors.phone ? inputError : ''}`}
        />
        {fieldErrors.phone && (
          <span
            id="phone-error"
            role="alert"
            className="mt-1 block text-sm text-red-600 dark:text-red-400"
          >
            {fieldErrors.phone}
          </span>
        )}
      </div>

      {/* Service (optional) */}
      <div>
        <label
          htmlFor="service"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Service{' '}
          <span className="text-gray-500 dark:text-gray-400">(optional)</span>
        </label>
        <select
          id="service"
          name="service"
          aria-describedby={fieldErrors.service ? 'service-error' : undefined}
          aria-invalid={fieldErrors.service !== undefined ? true : undefined}
          className={`${inputBase} ${fieldErrors.service ? inputError : ''}`}
        >
          <option value="">Select a service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        {fieldErrors.service && (
          <span
            id="service-error"
            role="alert"
            className="mt-1 block text-sm text-red-600 dark:text-red-400"
          >
            {fieldErrors.service}
          </span>
        )}
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-required="true"
          aria-describedby={fieldErrors.message ? 'message-error' : undefined}
          aria-invalid={fieldErrors.message !== undefined ? true : undefined}
          className={`${inputBase} resize-y ${fieldErrors.message ? inputError : ''}`}
        />
        {fieldErrors.message && (
          <span
            id="message-error"
            role="alert"
            className="mt-1 block text-sm text-red-600 dark:text-red-400"
          >
            {fieldErrors.message}
          </span>
        )}
      </div>

      {/* Server-side error fallback */}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Something went wrong. Please try again or call us directly.
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white
          hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500
          focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60
          dark:bg-brand-500 dark:hover:bg-brand-600"
      >
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
