import type { OwnerRoute } from './owner-model';
const session = 'aviation-' + Math.random().toString(36).slice(2);
const entries = new Map<number, string>();
let position = 0;

// Preserve native history and full filter context. A directly opened link
// falls back to its parent inside AG, never to an unknown external page.
export function trackWorkspaceNavigation() {
  const href = window.location.href;
  const state = window.history.state;
  if (state?.aviationSession === session && entries.get(state.aviationPosition) === href) {
    position = state.aviationPosition;
  } else {
    position = entries.size ? position + 1 : 0;
    for (const i of entries.keys()) if (i >= position) entries.delete(i);
    entries.set(position, href);
    window.history.replaceState({ ...state, aviationSession: session, aviationPosition: position }, '');
  }
}
export function parentWorkspaceRoute(route: OwnerRoute): OwnerRoute {
  if (route.page === 'company') {
    if (route.kpi === 'departure' && route.row) return {...route,row:undefined};
    if (route.kpi === 'departure') return {...route,kpi:undefined,id:undefined,row:undefined,stage:undefined};
    if (route.row === 'source') return { ...route, row: undefined };
    if (route.id) return { ...route, id: undefined, row: undefined };
    if (route.aircraft) return { ...route, aircraft: undefined };
    if (route.fleet) return { ...route, fleet: undefined };
    if (route.kpi) return { ...route, kpi: undefined, row: undefined };
    if (route.metric) return { page: 'company', company: route.company, snapshot: route.snapshot, start: route.start, end: route.end };
    return { page: route.company === 'MANAGEMENT' ? 'overview' : 'company', company: route.company === 'MANAGEMENT' ? undefined : 'MANAGEMENT', snapshot: route.snapshot };
  }
  if (route.page === 'executive-detail') return route.company === 'GROUP' ? {page:'overview'} : { page: 'company', company: route.company || 'MANAGEMENT', snapshot: route.snapshot };
  return { page: 'overview' };
}

export function canGoBackWithinWorkspace() { return window.history.state?.aviationSession === session && position > 0; }
