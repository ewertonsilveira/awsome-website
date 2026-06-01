import * as React from 'react';

// ADR-05: dev-only dynamic import gated on import.meta.env.DEV.
// Vite statically replaces import.meta.env.DEV → false in prod, so the
// dynamic import branch is dead-code-eliminated and the devtools package
// is absent from dist/client (AC-14).
const TanStackRouterDevtools = import.meta.env.DEV
  ? React.lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null;

export function RouterDevtools() {
  return (
    <React.Suspense fallback={null}>
      <TanStackRouterDevtools position="bottom-right" />
    </React.Suspense>
  );
}
