'use client';
import { ArrowLeft } from 'lucide-react';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import { al1Sections } from '@/lib/al1-ceo-model';

import { parentWorkspaceRoute, canGoBackWithinWorkspace } from '@/lib/workspace-navigation';
export { trackWorkspaceNavigation } from '@/lib/workspace-navigation';

export function WorkspaceBack({ route }: { route: OwnerRoute }) {
  return <a className="workspace-back" href={ownerHref(parentWorkspaceRoute(route))} onClick={e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (canGoBackWithinWorkspace()) {
      e.preventDefault();
      window.history.back();
    }
  }}><ArrowLeft size={19} /> Назад</a>;
}
export default function CompanyNavigation({ route }: { route: OwnerRoute }) {
  const base: OwnerRoute = { page: 'company', company: route.company, snapshot: route.snapshot, start: route.start, end: route.end };
  return <nav className="al1-nav" aria-label="Разделы авиакомпании">
    <a href={ownerHref(base)} className={!route.metric ? 'active' : ''}>Обзор компании</a>
    {Object.entries(al1Sections).map(([key, value]) => <a key={key} href={ownerHref({ ...base, metric: key })} className={route.metric === key ? 'active' : ''}>{value[0]}</a>)}
  </nav>;
}
