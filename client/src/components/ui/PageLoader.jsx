import React from 'react';

const PageLoader = ({ label = 'Loading' }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-live="polite">
    <div className="text-center">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      <p className="mt-3 text-sm text-slate-500">{label}…</p>
    </div>
  </div>
);

export default PageLoader;
