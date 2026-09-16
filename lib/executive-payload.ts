import type { OwnerRoute } from './owner-model';
import type { ExecutiveSnapshot } from './executive-model';
import type { AirlineId } from './airline-model';
export const executiveProfiles = ['overview', 'AL1', 'AL2', 'AL3'] as const;
export type ExecutiveProfile = typeof executiveProfiles[number];
export function executiveProfile(route: OwnerRoute): ExecutiveProfile {
  return route.page === 'company' && executiveProfiles.some(p => p !== 'overview' && p === route.company) ? route.company as ExecutiveProfile : 'overview';
}
export function projectExecutive(data: ExecutiveSnapshot, profile: ExecutiveProfile): ExecutiveSnapshot {
  const {snapshotId, opSnapshotId, productionSnapshotId, asOf, classification, entities, hierarchy, actions} = data;
  const base = {snapshotId, opSnapshotId, productionSnapshotId, asOf, classification, entities, hierarchy, actions};
  if (profile === 'overview') return base;
  const airline = data.airlines?.[profile as AirlineId];
  if (!airline || airline.companyId !== profile || airline.snapshotId !== snapshotId || airline.asOf !== asOf) throw Error('Company snapshot unavailable');
  if (profile === 'AL1' && [data.al1, data.operations, data.commercial, data.finance, data.safety].some(part => !part || part.snapshotId !== snapshotId || part.asOf !== asOf)) throw Error('Company detail snapshot unavailable');
  return {...base, airlines:{[profile]:airline}, ...(profile === 'AL1' ? {al1:data.al1, operations:data.operations, commercial:data.commercial, finance:data.finance, safety:data.safety} : {})};
}
