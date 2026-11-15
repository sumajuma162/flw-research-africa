import type { ResourceType, Visib, ResStatus } from '@/api/types';
import { TAXONOMY } from '@/api/seed';

export const TYPE_LABEL: Record<ResourceType, string> = {
  publication: 'Publication', dataset: 'Dataset', tool: 'Tool', methodology: 'Methodology',
  best_practice: 'Best practice', indigenous_knowledge: 'Community knowledge', policy_brief: 'Policy brief',
};
export const TYPE_HELP: Record<ResourceType, string> = {
  publication: 'Journal article, report, thesis or book chapter',
  dataset: 'Structured research data held by a custodian',
  tool: 'Calculator, template, app or checklist',
  methodology: 'Protocol or method others can reuse',
  best_practice: 'Practice note with practical guidance',
  indigenous_knowledge: 'Knowledge held by a community, shared with permission',
  policy_brief: 'Short brief for decision-makers',
};
export const VIS_LABEL: Record<Visib, string> = { public: 'Public', members: 'Members only', restricted: 'Restricted' };
export const STATUS_LABEL: Record<ResStatus | 'superseded', string> = {
  draft: 'Draft', pending: 'In review', returned: 'Changes requested', rejected: 'Not accepted', published: 'Published', withdrawn: 'Withdrawn', superseded: 'Superseded',
};
export const RIGHTS = ['CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'All rights reserved — link only', 'Shared with community permission', 'Shared with community permission; non-commercial use only', 'Restricted by community decision'];
export const TIMEZONES = ['Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Dakar', 'Africa/Dar_es_Salaam', 'Africa/Harare', 'Africa/Johannesburg', 'Africa/Kampala', 'Africa/Kigali', 'Africa/Lagos', 'Africa/Lusaka', 'Africa/Maputo', 'Africa/Nairobi', 'Africa/Tunis', 'UTC'];

const map = (list: { id: string; label: string }[]) => Object.fromEntries(list.map((t) => [t.id, t.label]));
const C = map(TAXONOMY.countries), CAT = map(TAXONOMY.categories), TOP = map(TAXONOMY.topics), LANG = map(TAXONOMY.languages);
export const country = (id?: string) => (id ? C[id] ?? id : '');
export const category = (id?: string) => (id ? CAT[id] ?? id : '');
export const topic = (id?: string) => (id ? TOP[id] ?? id : '');
export const language = (id?: string) => (id ? LANG[id] ?? id : '');
export const ROLE_LABEL: Record<string, string> = { member: 'Member', reviewer: 'Reviewer', moderator: 'Moderator', editor: 'Editor', admin: 'Administrator' };
