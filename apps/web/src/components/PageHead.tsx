import { useEffect, type ReactNode } from 'react';

// every page says what it is for, in one sentence, under its title, and the
// browser tab says it too. "where am i" is the first wayfinding question.
/** the browser tab title, for pages that draw their own heading */
export function usePageTitle(name: string | undefined) {
  useEffect(() => {
    document.title = name ? `${name} · online judge` : 'online judge';
    return () => { document.title = 'online judge'; };
  }, [name]);
}

export function PageHead({ title, lead, tab, children }: { title: ReactNode; lead?: ReactNode; tab?: string; children?: ReactNode }) {
  const name = tab ?? (typeof title === 'string' ? title : '');
  usePageTitle(name);
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children}
    </div>
  );
}
