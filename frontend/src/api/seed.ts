import type { DB, User, Resource, ResourceVersion, ResourceType, Visib, Thread, Taxonomy, Collection, HelpArticle, Organisation, EventItem, Opportunity, NewsItem, Page } from './types';

/** All demo records are fictional. Dates are generated relative to "now" so upcoming events stay upcoming. */
export const DEMO_PASSWORD = 'harvest-2026';
export const DEMO_MFA_CODE = '246810';
export const CONSENT_VERSION = 'privacy-2026.1';

const DAY = 864e5;
const now = () => Date.now();
const ago = (d: number, h = 9) => { const t = new Date(now() - d * DAY); t.setUTCHours(h, 0, 0, 0); return t.toISOString(); };
const ahead = (d: number, h = 9) => { const t = new Date(now() + d * DAY); t.setUTCHours(h, 0, 0, 0); return t.toISOString(); };
const month = (d: number) => new Date(now() - d * DAY).toISOString().slice(0, 7);

export const TAXONOMY: Taxonomy = {
  countries: [
    ['DZ', 'Algeria'], ['BJ', 'Benin'], ['BW', 'Botswana'], ['BF', 'Burkina Faso'], ['CM', 'Cameroon'], ['CI', 'Côte d’Ivoire'],
    ['CD', 'DR Congo'], ['EG', 'Egypt'], ['ET', 'Ethiopia'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['MW', 'Malawi'], ['ML', 'Mali'],
    ['MA', 'Morocco'], ['MZ', 'Mozambique'], ['NA', 'Namibia'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['RW', 'Rwanda'],
    ['SN', 'Senegal'], ['SL', 'Sierra Leone'], ['ZA', 'South Africa'], ['SD', 'Sudan'], ['TZ', 'Tanzania'], ['TG', 'Togo'],
    ['TN', 'Tunisia'], ['UG', 'Uganda'], ['ZM', 'Zambia'], ['ZW', 'Zimbabwe'],
  ].map(([id, label]) => ({ id, label })),
  categories: [
    ['early_career', 'Early-career researcher'], ['researcher', 'Established researcher or academic'], ['student', 'Student'],
    ['practitioner', 'Practitioner or extension officer'], ['policy', 'Policymaker or government official'],
    ['private', 'Private sector or agribusiness'], ['ngo', 'NGO or development partner'],
    ['community', 'Farmer or community organisation'], ['other', 'Other engaged stakeholder'],
  ].map(([id, label]) => ({ id, label })),
  topics: [
    ['post_harvest', 'Post-harvest handling'], ['cold_chain', 'Cold chain'], ['storage', 'Storage'], ['processing', 'Processing and value addition'],
    ['retail_waste', 'Retail and household waste'], ['indigenous', 'Indigenous knowledge'], ['policy', 'Policy and governance'],
    ['measurement', 'Measurement and data'], ['nutrition', 'Nutrition and food security'], ['circular', 'Circular economy'],
    ['climate', 'Climate resilience'], ['gender', 'Gender and inclusion'],
  ].map(([id, label]) => ({ id, label })),
  languages: [['en', 'English'], ['fr', 'French'], ['pt', 'Portuguese'], ['sw', 'Swahili'], ['ar', 'Arabic'], ['am', 'Amharic']].map(([id, label]) => ({ id, label })),
};

const defaultPrefs = () => ({ theme: 'system' as const, language: 'en', notif: { events: false, community: false, newsletter: false, opportunities: false }, channels: { phone: '', verified: false, sms: false, whatsapp: false } });
const vis = (on: boolean) => ({ affiliation: on, biography: on, interests: on, email: false, country: true });

function u(id: string, name: string, email: string, p: Partial<User>): User {
  return {
    id, name, email, password: DEMO_PASSWORD, status: 'approved', roles: ['member'], mfaEnabled: false,
    country: 'TZ', category: 'researcher', affiliation: '', biography: '', interests: [], visibility: vis(true),
    joinedAt: ago(200), avatarHue: (id.charCodeAt(1) * 47) % 360, acceptsRequests: true, blocked: [],
    prefs: defaultPrefs(), consents: [{ scope: 'membership', version: CONSENT_VERSION, at: ago(200) }], learnProgress: [], ...p,
  };
}

function users(): User[] {
  return [
    u('u01', 'Amina Mwakyusa', 'amina@demo.flw', { country: 'TZ', category: 'early_career', affiliation: 'Lake Zone Post-Harvest Institute', orgId: 'o01', orgConfirmed: true,
      biography: 'PhD candidate studying tomato losses between farm gate and urban markets in northern Tanzania. Interested in low-cost cooling and market logistics.',
      interests: ['post_harvest', 'cold_chain', 'measurement'], joinedAt: ago(320), orcid: '0000-0002-1825-0097', orcidVerified: true,
      prefs: { ...defaultPrefs(), notif: { events: true, community: true, newsletter: true, opportunities: true } },
      mentorship: { role: 'mentee', topics: ['cold_chain', 'measurement'], note: 'Looking for guidance on field measurement protocols.', updatedAt: ago(40) } }),
    u('u02', 'Kwame Asante', 'kwame@demo.flw', { country: 'GH', category: 'policy', affiliation: 'Ministry of Food and Agriculture (demo)', interests: ['policy', 'measurement', 'nutrition'],
      biography: 'Policy adviser working on national food loss reporting and post-harvest strategy.', joinedAt: ago(280), visibility: { ...vis(true), email: true } }),
    u('u03', 'Neema Mollel', 'neema@demo.flw', { country: 'TZ', category: 'practitioner', affiliation: 'Arusha District Extension Office (demo)', interests: ['indigenous', 'storage', 'gender'],
      biography: 'Extension officer working with women’s farmer groups on traditional grain storage.', joinedAt: ago(150), prefs: { ...defaultPrefs(), language: 'sw' } }),
    u('u04', 'Joseph Otieno', 'joseph@demo.flw', { country: 'KE', category: 'researcher', roles: ['member', 'moderator', 'reviewer'], mfaEnabled: true,
      affiliation: 'Rift Valley Food Systems Centre', interests: ['post_harvest', 'processing'], joinedAt: ago(400), orgId: 'o02', orgConfirmed: true,
      biography: 'Food scientist and network moderator. Reviews submissions on processing and storage.', mentorship: { role: 'mentor', topics: ['processing', 'post_harvest'], note: 'Happy to mentor early-career researchers on processing trials.', updatedAt: ago(60) } }),
    u('u05', 'Grace Achieng', 'grace@demo.flw', { country: 'UG', category: 'researcher', roles: ['member', 'admin', 'editor', 'reviewer'], mfaEnabled: true,
      affiliation: 'FLW Research Network secretariat (demo)', interests: ['policy', 'circular'], joinedAt: ago(420),
      biography: 'Network administrator (demo account) responsible for membership, content and platform settings.' }),
    u('u06', 'Fatou Diallo', 'fatou@demo.flw', { status: 'pending', country: 'SN', category: 'ngo', affiliation: 'Sahel Food Futures (demo)', interests: ['retail_waste', 'circular'], joinedAt: ago(3) }),
    u('u07', 'Tendai Moyo', 'tendai@demo.flw', { country: 'ZW', category: 'researcher', affiliation: 'Highveld Agricultural University (demo)', interests: ['storage', 'climate'],
      biography: 'Researches hermetic storage of maize and smallholder adoption.', orgId: 'o04', orgConfirmed: true, mentorship: { role: 'mentor', topics: ['storage', 'climate'], note: 'Storage trials and statistics.', updatedAt: ago(30) } }),
    u('u08', 'Chidinma Okafor', 'chidinma@demo.flw', { country: 'NG', category: 'private', affiliation: 'ColdLink Logistics (demo)', interests: ['cold_chain', 'retail_waste'],
      biography: 'Operations lead for a solar cold-room start-up serving fresh produce traders.', orgId: 'o05', orgConfirmed: true }),
    u('u09', 'Youssef Benali', 'youssef@demo.flw', { country: 'MA', category: 'researcher', affiliation: 'Atlas Agrifood Lab (demo)', interests: ['processing', 'circular'], prefs: { ...defaultPrefs(), language: 'fr' } }),
    u('u10', 'Hiwot Tesfaye', 'hiwot@demo.flw', { country: 'ET', category: 'early_career', affiliation: 'Highlands Agricultural Research Centre (demo)', interests: ['post_harvest', 'nutrition'],
      biography: 'Studies teff and pulse storage losses.', mentorship: { role: 'mentee', topics: ['post_harvest'], note: 'Seeking a mentor for my first journal submission.', updatedAt: ago(10) } }),
    u('u11', 'Moses Banda', 'moses@demo.flw', { country: 'ZM', category: 'community', affiliation: 'Chongwe Farmers’ Cooperative (demo)', interests: ['storage', 'indigenous'], visibility: vis(false) }),
    u('u12', 'Aïcha Traoré', 'aicha@demo.flw', { country: 'ML', category: 'ngo', affiliation: 'Niger Basin Nutrition Alliance (demo)', interests: ['nutrition', 'gender'], prefs: { ...defaultPrefs(), language: 'fr' } }),
    u('u13', 'Samuel Kariuki', 'samuel@demo.flw', { country: 'KE', category: 'student', affiliation: 'MSc student (demo)', interests: ['measurement', 'retail_waste'] }),
    u('u14', 'Nomvula Dlamini', 'nomvula@demo.flw', { country: 'ZA', category: 'researcher', affiliation: 'Cape Food Waste Observatory (demo)', interests: ['retail_waste', 'circular', 'measurement'],
      biography: 'Leads household food waste diaries in urban South Africa.', orgId: 'o06', orgConfirmed: true }),
    u('u15', 'Jean-Pierre Habimana', 'jeanpierre@demo.flw', { country: 'RW', category: 'policy', affiliation: 'Rwanda Agriculture Board (demo)', interests: ['policy', 'cold_chain'] }),
    u('u16', 'Esi Mensah', 'esi@demo.flw', { country: 'GH', category: 'practitioner', affiliation: 'Volta Fish Processors Association (demo)', interests: ['processing', 'gender'],
      biography: 'Works with women fish processors on improved smoking ovens.' }),
    u('u17', 'Luís Machava', 'luis@demo.flw', { country: 'MZ', category: 'researcher', affiliation: 'Zambezi Valley Research Station (demo)', interests: ['climate', 'storage'], prefs: { ...defaultPrefs(), language: 'pt' } }),
    u('u18', 'Halima Yusuf', 'halima@demo.flw', { country: 'NG', category: 'early_career', affiliation: 'Sokoto Grain Lab (demo)', interests: ['storage', 'measurement'], visibility: vis(false) }),
    ...([['u20', 'Rehema Juma', 'TZ', 'practitioner', 'Morogoro Horticulture Cooperative (demo)', ['post_harvest', 'gender']], ['u21', 'Baraka Kimaro', 'TZ', 'student', 'MSc student, food science (demo)', ['processing']],
      ['u22', 'Ngozi Eze', 'NG', 'researcher', 'Niger Delta Food Science Lab (demo)', ['processing', 'nutrition']], ['u23', 'Kofi Boateng', 'GH', 'private', 'Accra Fresh Produce Traders (demo)', ['retail_waste', 'cold_chain']],
      ['u24', 'Sarah Nakato', 'UG', 'researcher', 'Lake Victoria Fisheries Institute (demo)', ['cold_chain', 'processing']], ['u25', 'Isaac Mugisha', 'UG', 'policy', 'Ministry of Agriculture (demo)', ['policy']],
      ['u26', 'Ruth Achola', 'UG', 'ngo', 'Food Rescue Kampala (demo)', ['retail_waste', 'circular']], ['u27', 'Thabo Nkosi', 'ZA', 'private', 'Gauteng Cold Logistics (demo)', ['cold_chain']],
      ['u28', 'Lindiwe Khumalo', 'ZA', 'early_career', 'Free State Grain Research (demo)', ['storage', 'measurement']], ['u29', 'Selam Bekele', 'ET', 'researcher', 'Hawassa Food Systems Group (demo)', ['nutrition', 'measurement']],
      ['u30', 'Abebe Girma', 'ET', 'community', 'Oromia Grain Cooperative (demo)', ['storage', 'indigenous']], ['u31', 'Claudine Uwase', 'RW', 'early_career', 'Kigali Horticulture Lab (demo)', ['cold_chain', 'gender']],
      ['u32', 'Ousmane Sy', 'SN', 'researcher', 'Dakar Food Technology Institute (demo)', ['processing', 'retail_waste']]] as const).map(([id, name, c, cat, aff, ints], i) =>
      u(id, name, `${name.split(' ')[0].toLowerCase()}@demo.flw`, { country: c, category: cat, affiliation: aff, interests: [...ints], joinedAt: ago(20 + i * 23), visibility: vis(i % 3 !== 2) })),
    u('u19', 'Peter Okello', 'peter@demo.flw', { status: 'suspended', country: 'UG', category: 'other', affiliation: '', suspendedReason: 'Repeated off-topic promotional posts (demo).' }),
  ];
}

const V = (p: Partial<ResourceVersion> & Pick<ResourceVersion, 'title' | 'summary' | 'authors' | 'countries' | 'topics' | 'year' | 'submittedBy'>): ResourceVersion => ({
  no: 1, language: 'en', rights: 'CC BY 4.0', keywords: [], submittedAt: ago(100), status: 'published', reviewedBy: 'u04', reviewedAt: ago(95), ...p,
});
let rc = 0;
function R(type: ResourceType, slug: string, v: ResourceVersion[], o: Partial<Resource> = {}): Resource {
  rc++;
  const age = 10 + ((rc * 37) % 170);
  v.forEach((x) => { if (x.status === 'published') { x.submittedAt = ago(age + 6); x.reviewedAt = ago(age); } });
  const published = v.filter((x) => x.status === 'published').pop();
  const views = 40 + ((rc * 97) % 700);
  return {
    id: `r${String(rc).padStart(2, '0')}`, slug, type, visibility: 'public', status: published ? 'published' : (v[v.length - 1].status as Resource['status']),
    ownerId: v[0].submittedBy, versions: v, publishedNo: published?.no, createdAt: v[0].submittedAt, publishedAt: published?.reviewedAt,
    stats: {
      views, downloads: Math.round(views * 0.3), citations: Math.round(views * 0.08),
      byCountry: { TZ: Math.round(views * 0.3), KE: Math.round(views * 0.2), GH: Math.round(views * 0.12), NG: Math.round(views * 0.1), UG: Math.round(views * 0.08), ZA: 3 },
      monthly: Object.fromEntries([5, 4, 3, 2, 1, 0].map((m, i) => [month(m * 30), Math.round(views / 8 + i * 7)])),
    },
    ...o,
  };
}

function resources(): Resource[] {
  rc = 0;
  return [
    R('publication', 'tomato-losses-arusha-markets', [V({ title: 'Quantifying tomato losses from farm gate to urban markets in Arusha', summary: 'A season-long tracking study of 120 tomato consignments, measuring weight and quality losses at harvest, transport, wholesale and retail stages. Losses concentrated in transport and wholesale handling, where bruising and heat exposure were highest.', authors: ['A. Mwakyusa', 'J. Otieno'], countries: ['TZ'], topics: ['post_harvest', 'measurement'], year: 2025, keywords: ['tomato', 'value chain', 'loss assessment'], submittedBy: 'u01', fileName: 'tomato-losses-arusha.pdf', fileSize: 2_400_000 })]),
    R('dataset', 'east-africa-maize-storage-trials', [V({ title: 'East Africa maize storage trials 2021–2024', summary: 'Plot-level data from 48 on-farm trials comparing hermetic bags, treated polypropylene bags and traditional granaries over nine-month storage periods.', authors: ['T. Moyo', 'Rift Valley Food Systems Centre'], countries: ['KE', 'TZ', 'UG'], topics: ['storage', 'measurement'], year: 2024, keywords: ['maize', 'hermetic', 'grain'], submittedBy: 'u07', url: 'https://example.org/datasets/maize-storage',
      dataset: { custodian: 'Rift Valley Food Systems Centre (demo)', period: 'Mar 2021 – Dec 2024', coverage: '48 farms in Kenya, Tanzania and Uganda', method: 'Randomised on-farm trials; monthly sampling for insect damage and weight loss', access: 'Open after free registration with the custodian', pid: 'demo:flw/ds-0001' } })]),
    R('tool', 'cold-room-sizing-calculator', [V({ title: 'Solar cold-room sizing calculator', summary: 'Spreadsheet tool for estimating cold-room capacity, solar array size and payback period from daily produce volumes and local irradiance.', authors: ['C. Okafor'], countries: ['NG', 'GH'], topics: ['cold_chain', 'circular'], year: 2024, keywords: ['solar', 'cold storage', 'business case'], submittedBy: 'u08', fileName: 'cold-room-calculator.xlsx', fileSize: 380_000, rights: 'CC BY-SA 4.0' })]),
    R('methodology', 'household-food-waste-diaries', [V({ title: 'Household food waste diary method for African cities', summary: 'A seven-day diary protocol with photo prompts, adapted for low-literacy households and validated against kitchen caddy weighing in Cape Town and Nairobi.', authors: ['N. Dlamini', 'S. Kariuki'], countries: ['ZA', 'KE'], topics: ['retail_waste', 'measurement'], year: 2023, keywords: ['household', 'diary', 'urban'], submittedBy: 'u14', fileName: 'diary-method.pdf', fileSize: 1_100_000 })]),
    R('best_practice', 'improved-fish-smoking-ovens', [V({ title: 'Improved fish smoking ovens with women processors on the Volta', summary: 'Practice note on adopting improved smoking ovens that cut fuelwood use, smoke exposure and fish spoilage, with guidance on group financing.', authors: ['E. Mensah'], countries: ['GH'], topics: ['processing', 'gender'], year: 2024, keywords: ['fish', 'smoking', 'women'], submittedBy: 'u16', url: 'https://example.org/practice/fish-ovens' })]),
    R('policy_brief', 'national-flw-reporting-ghana', [V({ title: 'Building a national food loss reporting system: lessons from Ghana', summary: 'Policy brief on aligning national statistics with international food loss indicators, covering data sources, institutional roles and costs.', authors: ['K. Asante'], countries: ['GH'], topics: ['policy', 'measurement'], year: 2025, keywords: ['SDG 12.3', 'statistics', 'policy'], submittedBy: 'u02', fileName: 'ghana-flw-reporting.pdf', fileSize: 900_000 })]),
    R('indigenous_knowledge', 'ash-and-neem-grain-protection', [V({ title: 'Ash and neem leaf grain protection in Meru communities', summary: 'Community-shared practice of mixing wood ash and dried neem leaves with stored beans and maize, documented with the community’s permission for public sharing.', authors: ['Meru women’s farmer groups', 'N. Mollel'], countries: ['TZ'], topics: ['indigenous', 'storage'], year: 2024, language: 'sw', keywords: ['neem', 'ash', 'beans'], submittedBy: 'u03', rights: 'Shared with community permission; non-commercial use only',
      ik: { authority: 'Meru women’s farmer groups leadership council', restrictions: 'Public sharing permitted; no commercial use; credit the community', community: 'Meru, Arusha Region', confirmedBy: 'u04' } })]),
    R('indigenous_knowledge', 'sacred-granary-practices', [V({ title: 'Granary ritual calendars and storage timing', summary: 'Restricted record of granary opening calendars held by community elders. Access limited to members approved by the community.', authors: ['Elders’ council (demo)'], countries: ['ZM'], topics: ['indigenous', 'storage'], year: 2023, keywords: ['granary', 'calendar'], submittedBy: 'u11', rights: 'Restricted by community decision',
      ik: { authority: 'Chongwe elders’ council', restrictions: 'Members approved by the community only', community: 'Chongwe District', confirmedBy: 'u04' } })], { visibility: 'restricted' }),
    R('publication', 'hermetic-bag-adoption-zimbabwe', [V({ title: 'Why smallholders adopt hermetic storage bags: evidence from Zimbabwe', summary: 'Mixed-methods study of 600 households examining price, access, trust and gender dynamics in hermetic bag adoption.', authors: ['T. Moyo', 'L. Machava'], countries: ['ZW', 'MZ'], topics: ['storage', 'gender'], year: 2023, submittedBy: 'u07', url: 'https://example.org/papers/hermetic-adoption' })]),
    R('publication', 'teff-pulse-storage-losses', [V({ title: 'Storage losses of teff and pulses in the Ethiopian highlands', summary: 'Measures storage losses across three agro-ecological zones and estimates their contribution to household food insecurity.', authors: ['H. Tesfaye'], countries: ['ET'], topics: ['post_harvest', 'nutrition'], year: 2025, submittedBy: 'u10', fileName: 'teff-pulses.pdf', fileSize: 1_700_000 })], { visibility: 'members' }),
    R('dataset', 'urban-household-food-waste-panel', [V({ title: 'Urban household food waste panel (Cape Town, Nairobi)', summary: 'Anonymised diary records from 1,200 households over two waves, with food category, reason for discard and household characteristics.', authors: ['Cape Food Waste Observatory'], countries: ['ZA', 'KE'], topics: ['retail_waste', 'measurement'], year: 2025, submittedBy: 'u14', url: 'https://example.org/datasets/household-panel',
      dataset: { custodian: 'Cape Food Waste Observatory (demo)', period: 'Jan 2023 – Jun 2025', coverage: '1,200 households, two cities', method: 'Seven-day diaries, two waves', access: 'Restricted: data use agreement required from the custodian' } })], { visibility: 'members' }),
    R('dataset', 'fish-market-spoilage-volta', [V({ title: 'Fish spoilage observations at Volta landing sites', summary: 'Hourly temperature and quality scores for fresh fish at six landing sites across dry and rainy seasons.', authors: ['E. Mensah', 'Y. Benali'], countries: ['GH'], topics: ['cold_chain', 'processing'], year: 2024, submittedBy: 'u16', url: 'https://example.org/datasets/fish-spoilage',
      dataset: { custodian: 'Volta Fish Processors Association (demo)', period: 'Feb 2023 – Jan 2024', coverage: 'Six landing sites', method: 'Data loggers and sensory scoring', access: 'Open under CC BY 4.0', pid: 'demo:flw/ds-0003' } })]),
    R('dataset', 'cold-room-utilisation-nigeria', [V({ title: 'Solar cold-room utilisation in Nigerian markets', summary: 'Daily occupancy, energy and revenue data from 22 pay-as-you-store cold rooms.', authors: ['ColdLink Logistics'], countries: ['NG'], topics: ['cold_chain'], year: 2025, submittedBy: 'u08', url: 'https://example.org/datasets/cold-rooms',
      dataset: { custodian: 'ColdLink Logistics (demo)', period: 'Jan – Dec 2024', coverage: '22 cold rooms in 9 states', method: 'IoT sensor logs', access: 'Aggregated data open; raw logs on request' } })]),
    R('tool', 'loss-hotspot-mapping-template', [V({ title: 'Value-chain loss hotspot mapping template', summary: 'Workshop template for mapping where losses occur along a value chain, with prompts for causes, actors and quick wins.', authors: ['J. Otieno'], countries: ['KE'], topics: ['post_harvest', 'measurement'], year: 2022, submittedBy: 'u04', fileName: 'hotspot-template.pdf', fileSize: 600_000 })]),
    R('methodology', 'rapid-loss-assessment-cereals', [V({ title: 'Rapid loss assessment protocol for cereals', summary: 'Field protocol combining farmer interviews and sample measurements to estimate cereal losses within one week per site.', authors: ['H. Yusuf', 'T. Moyo'], countries: ['NG', 'ZW'], topics: ['measurement', 'storage'], year: 2024, language: 'fr', submittedBy: 'u18', fileName: 'rapid-assessment.pdf', fileSize: 1_300_000 })]),
    R('policy_brief', 'cold-chain-incentives-rwanda', [V({ title: 'Public incentives for cold-chain investment in Rwanda', summary: 'Reviews tax, tariff and co-investment incentives for cold storage and their uptake by cooperatives.', authors: ['J.-P. Habimana'], countries: ['RW'], topics: ['policy', 'cold_chain'], year: 2025, submittedBy: 'u15', fileName: 'rwanda-cold-chain.pdf', fileSize: 750_000 })]),
    R('best_practice', 'mango-solar-drying-mali', [V({ title: 'Solar drying of mango with women’s groups in Mali', summary: 'Step-by-step practice for tunnel solar drying of surplus mango, including hygiene, packaging and market links.', authors: ['A. Traoré'], countries: ['ML', 'BF'], topics: ['processing', 'gender', 'nutrition'], year: 2023, language: 'fr', submittedBy: 'u12', url: 'https://example.org/practice/mango-drying' })]),
    R('publication', 'retail-food-waste-casablanca', [V({ title: 'Retail fruit and vegetable waste in Casablanca supermarkets', summary: 'Audit of discards in 14 supermarkets and the potential for redistribution and composting.', authors: ['Y. Benali'], countries: ['MA'], topics: ['retail_waste', 'circular'], year: 2024, language: 'ar', submittedBy: 'u09', url: 'https://example.org/papers/casablanca-retail' })]),
    R('publication', 'climate-shocks-and-storage', [V({ title: 'Climate shocks and post-harvest storage decisions in Mozambique', summary: 'Panel analysis linking rainfall shocks with storage duration, sales timing and losses.', authors: ['L. Machava'], countries: ['MZ'], topics: ['climate', 'storage'], year: 2026, language: 'pt', submittedBy: 'u17', fileName: 'climate-storage.pdf', fileSize: 2_000_000 })]),
    // Pending and returned submissions for the review workflow
    R('publication', 'cassava-peel-feed-trial', [V({ title: 'Turning cassava peels into poultry feed: a pilot in Nigeria', summary: 'Pilot results from processing cassava peels into feed ingredients, with cost and safety data.', authors: ['H. Yusuf'], countries: ['NG'], topics: ['circular', 'processing'], year: 2026, submittedBy: 'u18', submittedAt: ago(2), status: 'pending', reviewedBy: undefined, reviewedAt: undefined, fileName: 'cassava-peel.pdf', fileSize: 1_200_000 })]),
    R('indigenous_knowledge', 'clay-pot-seed-storage', [V({ title: 'Clay pot seed storage in Arumeru', summary: 'Neema’s documentation of sealed clay pot seed storage with cow dung lining, recorded with a women’s group.', authors: ['Arumeru women’s group', 'N. Mollel'], countries: ['TZ'], topics: ['indigenous', 'storage'], year: 2026, language: 'sw', submittedBy: 'u03', submittedAt: ago(1), status: 'pending', reviewedBy: undefined, reviewedAt: undefined, rights: 'Shared with community permission', url: 'https://example.org/community/clay-pot-storage',
      ik: { authority: 'Arumeru women’s group chairperson', restrictions: 'Public sharing permitted with attribution', community: 'Arumeru District' } })]),
    R('policy_brief', 'flw-indicators-west-africa', [V({ title: 'Harmonising food loss indicators across West Africa', summary: 'Draft brief comparing national indicator definitions and proposing a common minimum set.', authors: ['K. Asante', 'A. Traoré'], countries: ['GH', 'ML', 'SN'], topics: ['policy', 'measurement'], year: 2026, submittedBy: 'u02', submittedAt: ago(4), status: 'pending', reviewedBy: undefined, reviewedAt: undefined, url: 'https://example.org/briefs/west-africa-indicators' })]),
    R('dataset', 'tomato-crate-temperatures', [V({ title: 'Tomato crate temperature logs, Arusha to Dar es Salaam', summary: 'Temperature and humidity logs from 30 crates on overnight trucks.', authors: ['A. Mwakyusa'], countries: ['TZ'], topics: ['cold_chain', 'measurement'], year: 2026, submittedBy: 'u01', submittedAt: ago(9), status: 'returned', reviewedBy: 'u04', reviewedAt: ago(6),
      reviewNote: 'Please add the collection period, the data custodian and the access conditions before we can publish.', url: 'https://example.org/datasets/tomato-crates',
      dataset: { custodian: '', period: '', coverage: '30 crates, 10 trips', method: 'USB data loggers at 10-minute intervals', access: '' } })]),
  ];
}

function events(): EventItem[] {
  return [
    { id: 'e01', title: 'Webinar: Measuring post-harvest losses in the field', summary: 'Practical session on sampling, weighing and recording losses for cereals and fresh produce.', body: 'Join researchers from three countries as they walk through field measurement protocols, common pitfalls and how to report results consistently.\n\nThe session includes a 20-minute question and answer segment. A recording will be shared with members.', startsAt: ahead(6, 11), endsAt: ahead(6, 12), timezone: 'Africa/Nairobi', location: 'Online', online: true, link: 'https://example.org/webinar-measurement', status: 'published', membersOnly: false, topic: 'measurement' },
    { id: 'e02', title: 'Regional workshop: Cold chain for smallholders', summary: 'Two-day workshop with operators, financiers and researchers on cold storage for fresh produce.', body: 'Hosted in Kigali with site visits to cooperative cold rooms.\n\nPlaces are limited; register through the external form.', startsAt: ahead(24, 6), endsAt: ahead(25, 14), timezone: 'Africa/Kigali', location: 'Kigali, Rwanda', online: false, link: 'https://example.org/register-cold-chain', status: 'published', membersOnly: false, topic: 'cold_chain' },
    { id: 'e03', title: 'Members’ clinic: Preparing your first dataset for sharing', summary: 'Small-group clinic on metadata, licences and access conditions.', body: 'Bring a dataset you would like to share. Reviewers will help you complete the metadata the catalogue requires.', startsAt: ahead(12, 13), endsAt: ahead(12, 14), timezone: 'Africa/Lagos', location: 'Online', online: true, link: 'https://example.org/clinic', status: 'published', membersOnly: true, topic: 'measurement' },
    { id: 'e04', title: 'Indigenous knowledge and storage: listening session', summary: 'Community custodians share storage practices and discuss how they should be recorded.', body: 'Conducted in Swahili and English with interpretation.', startsAt: ahead(40, 7), endsAt: ahead(40, 10), timezone: 'Africa/Dar_es_Salaam', location: 'Arusha, Tanzania', online: false, status: 'published', membersOnly: false, topic: 'indigenous' },
    { id: 'e05', title: 'Network launch meeting', summary: 'The founding meeting of the FLW Research Network in Africa.', body: 'Recording available to members.', startsAt: ago(60, 10), endsAt: ago(60, 12), timezone: 'Africa/Nairobi', location: 'Online', online: true, status: 'published', membersOnly: false, topic: 'policy' },
    { id: 'e06', title: 'Webinar: Household food waste in African cities', summary: 'Findings from diary studies and what they mean for city policy.', body: 'Speakers from Cape Town and Nairobi share results.', startsAt: ago(21, 12), endsAt: ago(21, 13), timezone: 'Africa/Johannesburg', location: 'Online', online: true, status: 'published', membersOnly: false, topic: 'retail_waste' },
    { id: 'e07', title: 'Draft: Annual members’ assembly', summary: 'Planning draft — not yet published.', body: '', startsAt: ahead(90, 8), endsAt: ahead(90, 12), timezone: 'Africa/Nairobi', location: 'Nairobi, Kenya', online: false, status: 'draft', membersOnly: true, topic: 'policy' },
  ];
}

function news(): NewsItem[] {
  return [
    { id: 'n01', title: 'Knowledge hub opens to members', summary: 'Members can now submit publications, datasets, tools and community practices for review.', body: 'The knowledge hub brings together research findings, datasets, methodologies, tools and community knowledge on food loss and waste across Africa.\n\nEvery submission is reviewed for provenance, rights and visibility before publication. Community knowledge is published only with the permission of the people who hold it.', publishedAt: ago(5), status: 'published', image: 'research', author: 'Network secretariat' },
    { id: 'n02', title: 'Call for mentors: support early-career researchers', summary: 'Established researchers can register as mentors in their member settings.', body: 'The mentorship programme pairs early-career researchers with experienced colleagues. Registration is voluntary and you can withdraw at any time.', publishedAt: ago(18), status: 'published', image: 'heritage', author: 'Research Chair' },
    { id: 'n03', title: 'Cold-chain workshop set for Kigali', summary: 'Operators, financiers and researchers will meet to discuss cold storage for smallholders.', body: 'Details and registration are on the events page.', publishedAt: ago(30), status: 'published', image: 'cold-chain', author: 'Partnerships Lead' },
    { id: 'n04', title: 'Steering committee confirms interim leadership', summary: 'Three interim leaders will guide the network through its founding phase.', body: 'See the leadership page for roles and responsibilities.', publishedAt: ago(62), status: 'published', image: 'storage', author: 'Steering committee' },
  ];
}

function opportunities(): Opportunity[] {
  return [
    { id: 'op1', title: 'Small grants for post-harvest innovation pilots', kind: 'funding', owner: 'Innovation and Grants Lead', summary: 'Seed grants for pilots that test practical loss-reduction approaches with farmers, traders or processors.', eligibility: 'Teams led by network members based in Africa; at least one early-career researcher.', deadline: ahead(28, 21), timezone: 'Africa/Nairobi', contact: 'grants@flwresearchafrica.org (to be verified)', status: 'published', countries: [] },
    { id: 'op2', title: 'Collaborators wanted: multi-country tomato loss study', kind: 'collaboration', owner: 'A. Mwakyusa', summary: 'Seeking partners in Kenya, Uganda and Nigeria to replicate a market tracking study.', eligibility: 'Researchers with access to wholesale markets.', deadline: ahead(14, 21), timezone: 'Africa/Dar_es_Salaam', contact: 'Send a connection request to Amina in the directory', status: 'published', countries: ['KE', 'UG', 'NG'] },
    { id: 'op3', title: 'Data fellowship: open food loss datasets', kind: 'fellowship', owner: 'Research Chair', summary: 'Six-month fellowship to clean, document and share existing food loss datasets.', eligibility: 'Early-career researchers and data scientists.', deadline: ahead(45, 21), timezone: 'Africa/Nairobi', contact: 'research@flwresearchafrica.org (to be verified)', status: 'published', countries: [] },
    { id: 'op4', title: 'Partnership: cooperative cold-room network', kind: 'partnership', owner: 'ColdLink Logistics (demo)', summary: 'Seeking research partners to evaluate the impact of cold rooms on trader incomes and losses.', eligibility: 'Research institutions in West Africa.', deadline: undefined, timezone: 'Africa/Lagos', contact: 'Through the organisation page', status: 'published', countries: ['NG', 'GH'] },
    { id: 'op5', title: 'Writing retreat for policy briefs', kind: 'collaboration', owner: 'Network secretariat', summary: 'Closed: three-day retreat to turn research into policy briefs.', eligibility: 'Members with completed studies.', deadline: ago(5, 21), timezone: 'Africa/Nairobi', contact: 'Closed', status: 'published', countries: [] },
  ];
}

function pages(): Page[] {
  const p = (slug: string, title: string, body: string): Page => ({ slug, title, body, version: 1, publishedAt: ago(60), publishedBy: 'u05', history: [{ version: 1, publishedAt: ago(60), publishedBy: 'u05' }] });
  return [
    p('vision', 'Vision', 'Sustainable and resilient African food systems, strengthened through research, innovation and collaboration.'),
    p('mission', 'Mission', 'To connect researchers, practitioners, policymakers and other stakeholders to generate data, share knowledge and advance solutions that reduce food loss and waste across Africa.'),
    p('aim', 'Aim', 'To strengthen collaboration, research capacity and knowledge exchange on food loss and waste among people and institutions working across the continent.'),
    p('objectives', 'Objectives', 'Build a community of practice that supports exchange, relationships and mentorship.\n\nEnable cross-country, interdisciplinary and multi-stakeholder collaboration.\n\nShare research findings, datasets, methodologies, tools, practices and indigenous knowledge.\n\nSupport co-creation that brings together science, data, indigenous knowledge and community realities.'),
    p('values', 'Core values', 'Collaboration\n\nScientific integrity\n\nLearning\n\nAfrican relevance\n\nInnovation\n\nImpact'),
  ];
}

function threads(): Thread[] {
  const post = (id: string, a: string, body: string, d: number) => ({ id, authorId: a, body, createdAt: ago(d, 10 + (d % 6)), status: 'visible' as const });
  return [
    { id: 't01', title: 'Low-cost ways to measure tomato bruising in markets?', topic: 'post_harvest', authorId: 'u01', createdAt: ago(8), status: 'open', posts: [
      post('p01', 'u01', 'I am tracking tomato consignments into Arusha. Has anyone used a simple visual scale for bruising that traders also understand?', 8),
      post('p02', 'u04', 'We used a five-point visual card with photos. Agreement between enumerators was good after a half-day training. I can share the card.', 7),
      post('p03', 'u08', 'Traders in Lagos respond well to price-based categories. You could pair the visual scale with the price each grade fetched.', 6),
    ] },
    { id: 't02', title: 'Hermetic bags: what is your experience with counterfeits?', topic: 'storage', authorId: 'u07', createdAt: ago(15), status: 'open', posts: [
      post('p04', 'u07', 'Farmers in our study reported bags that tore within weeks. How are others checking quality?', 15),
      post('p05', 'u11', 'Our cooperative now buys only from registered agro-dealers and tests a sample by inflating it overnight.', 14),
      post('p06', 'u19', 'Buy cheap bags from my shop, best prices, call now!!!', 13),
    ] },
    { id: 't03', title: 'How should we record community storage practices respectfully?', topic: 'indigenous', authorId: 'u03', createdAt: ago(20), status: 'open', posts: [
      post('p07', 'u03', 'Before I submit records from the women’s groups I work with, I want to agree how permission and credit should work.', 20),
      post('p08', 'u05', 'The submission form asks who gave permission and what the limits are. A reviewer confirms this before anything is published.', 19),
    ] },
    { id: 't04', title: 'Indicator definitions for national reporting', topic: 'policy', authorId: 'u02', createdAt: ago(4), status: 'open', posts: [
      post('p09', 'u02', 'We are drafting a brief comparing indicator definitions across West Africa. Which definitions does your country use?', 4),
    ] },
    { id: 't05', title: 'Welcome thread: introduce yourself', topic: 'policy', authorId: 'u05', createdAt: ago(58), status: 'locked', posts: [
      post('p10', 'u05', 'Welcome to the network. This thread is now closed; please start a new discussion in the relevant topic.', 58),
    ] },
  ];
}

function organisations(): Organisation[] {
  const o = (id: string, slug: string, name: string, type: string, country: string, description: string, rep?: string, status: Organisation['status'] = 'approved'): Organisation =>
    ({ id, slug, name, type, country, description, website: `https://example.org/${slug}`, status, repUserId: rep, createdAt: ago(100) });
  return [
    o('o01', 'lake-zone-post-harvest-institute', 'Lake Zone Post-Harvest Institute', 'Research institute', 'TZ', 'Applied research on fresh produce handling and market logistics in the Lake Zone (fictional demo organisation).', 'u01'),
    o('o02', 'rift-valley-food-systems-centre', 'Rift Valley Food Systems Centre', 'Research institute', 'KE', 'Food science, processing and storage research (fictional demo organisation).', 'u04'),
    o('o04', 'highveld-agricultural-university', 'Highveld Agricultural University', 'University', 'ZW', 'Teaching and research on grain storage and climate adaptation (fictional).', 'u07'),
    o('o05', 'coldlink-logistics', 'ColdLink Logistics', 'Company', 'NG', 'Pay-as-you-store solar cold rooms for traders (fictional).', 'u08'),
    o('o06', 'cape-food-waste-observatory', 'Cape Food Waste Observatory', 'Research institute', 'ZA', 'Household and retail food waste measurement (fictional).', 'u14'),
    o('o07', 'sahel-food-futures', 'Sahel Food Futures', 'NGO', 'SN', 'Food redistribution and circular economy projects (fictional).', undefined, 'pending'),
  ];
}

function collections(): Collection[] {
  return [
    { id: 'c1', slug: 'measuring-food-loss', title: 'Measuring food loss in the field', level: 'Introductory', topic: 'measurement', image: 'research',
      summary: 'Learn the main methods for estimating losses along a value chain and how to choose between them.', objectives: ['Explain the difference between food loss and food waste', 'Choose a measurement method for your study', 'Report results consistently'],
      items: [
        { id: 'c1i1', title: 'Food loss and waste: key definitions', kind: 'guide', minutes: 10, language: 'en', summary: 'Short guide to the terms used across the network.' },
        { id: 'c1i2', title: 'Rapid loss assessment protocol for cereals', kind: 'resource', minutes: 25, language: 'fr', resourceSlug: 'rapid-loss-assessment-cereals', summary: 'Read the protocol and note the sampling steps.' },
        { id: 'c1i3', title: 'Webinar recording: measuring losses in the field', kind: 'webinar', minutes: 55, language: 'en', captions: true, summary: 'Recording of the network webinar.' },
        { id: 'c1i4', title: 'Value-chain loss hotspot mapping template', kind: 'resource', minutes: 20, language: 'en', resourceSlug: 'loss-hotspot-mapping-template', summary: 'Practise mapping hotspots for a value chain you know.' },
      ] },
    { id: 'c2', slug: 'cold-chain-basics', title: 'Cold chain basics for fresh produce', level: 'Intermediate', topic: 'cold_chain', image: 'cold-chain',
      summary: 'Understand how cooling extends shelf life and how to size and finance small cold rooms.', objectives: ['Describe temperature needs of common crops', 'Estimate cold-room capacity', 'Compare business models'],
      items: [
        { id: 'c2i1', title: 'Temperature and shelf life', kind: 'guide', minutes: 15, language: 'en', summary: 'How temperature and humidity affect produce.' },
        { id: 'c2i2', title: 'Solar cold-room sizing calculator', kind: 'resource', minutes: 30, language: 'en', resourceSlug: 'cold-room-sizing-calculator', summary: 'Size a cold room for a market you know.' },
        { id: 'c2i3', title: 'Webinar: cold storage business models', kind: 'webinar', minutes: 45, language: 'en', captions: false, summary: 'Operators explain pay-as-you-store models.' },
      ] },
    { id: 'c3', slug: 'community-knowledge-ethics', title: 'Working ethically with community knowledge', level: 'Introductory', topic: 'indigenous', image: 'heritage',
      summary: 'How to document, credit and share community and indigenous knowledge with permission.', objectives: ['Seek and record permission', 'Respect restrictions', 'Credit knowledge holders'],
      items: [
        { id: 'c3i1', title: 'Permission, credit and withdrawal', kind: 'guide', minutes: 12, language: 'en', summary: 'The network’s approach to community knowledge.' },
        { id: 'c3i2', title: 'Ash and neem leaf grain protection', kind: 'resource', minutes: 10, language: 'sw', resourceSlug: 'ash-and-neem-grain-protection', summary: 'An example of a well-documented record.' },
      ] },
  ];
}

function help(): HelpArticle[] {
  const h = (slug: string, title: string, category: string, body: string): HelpArticle => ({ id: slug, slug, title, category, body, updatedAt: ago(20) });
  return [
    h('joining-the-network', 'How to join the network', 'Membership', 'Choose Join the network, complete the four steps and verify your email. A membership reviewer checks your application, usually within a few working days. You will receive an email and a notification with the decision.\n\nWhile you wait, you can sign in to see your application status.'),
    h('profile-visibility', 'Controlling what other members see', 'Membership', 'Your profile is private by default. In Profile, switch on each field you want to show in the member directory. Use Preview as others see me to check the result. Changes take effect immediately.'),
    h('submitting-a-resource', 'Submitting a resource for review', 'Knowledge hub', 'Choose Submit a resource. Pick the type, add a title, summary, authors, countries and topics, then add a link or a file and choose who can see it.\n\nYour draft saves automatically. After you submit, a reviewer who is not the author checks provenance, rights and visibility. You can follow progress in My submissions.'),
    h('community-knowledge', 'Sharing community or indigenous knowledge', 'Knowledge hub', 'If your submission records knowledge held by a community, you must name who gave permission and any limits on sharing. A designated reviewer confirms the permission before publication. Communities can ask for a record to be withdrawn at any time.'),
    h('citing-resources', 'Citing a resource', 'Knowledge hub', 'Every published resource has a citation box. Choose Copy citation to copy it. The citation uses only the details the contributor recorded; nothing is invented.'),
    h('two-step-sign-in', 'Two-step sign-in', 'Account and security', 'Staff accounts must use two-step sign-in. Members can turn it on in Settings, Security. You will enter a six-digit code from your authenticator app after your password.'),
    h('reset-password', 'Resetting your password', 'Account and security', 'Choose Forgot password on the sign-in page and enter your email. If an account exists, we send a link that works once and expires after one hour. Resetting your password signs you out everywhere.'),
    h('data-requests', 'Asking for a copy of your data', 'Privacy', 'Go to Privacy requests and choose the type of request. The privacy contact will check your identity and respond. You can follow the status on the same page.'),
    h('low-bandwidth', 'Using the site on a slow connection', 'Using the site', 'Pages load text first and images later. In Settings, Appearance, you can turn on reduced data mode to stop the landing page video and large images.'),
  ];
}

export function makeSeed(): DB {
  const db: DB = {
    version: 4, users: users(), resources: resources(), events: events(), news: news(), opportunities: opportunities(), pages: pages(),
    threads: threads(), organisations: organisations(), collections: collections(), help: help(), taxonomy: JSON.parse(JSON.stringify(TAXONOMY)),
    applications: [
      { id: 'a01', ref: 'APP-2026-0141', userId: 'u06', category: 'ngo', country: 'SN', affiliation: 'Sahel Food Futures (demo)', interests: ['retail_waste', 'circular'], motivation: 'We run food redistribution pilots in Dakar and want to share our data and learn measurement methods from researchers.', status: 'pending', createdAt: ago(3), consentVersion: CONSENT_VERSION },
      { id: 'a03', ref: 'APP-2026-0128', userId: 'u31', category: 'early_career', country: 'RW', affiliation: 'Kigali Horticulture Lab (demo)', interests: ['cold_chain'], motivation: 'Cold storage research.', status: 'approved', createdAt: ago(70), decidedAt: ago(66), decidedBy: 'u05', reason: 'Meets membership criteria.', consentVersion: CONSENT_VERSION },
      { id: 'a04', ref: 'APP-2026-0133', userId: 'u28', category: 'early_career', country: 'ZA', affiliation: 'Free State Grain Research (demo)', interests: ['storage'], motivation: 'Grain storage PhD.', status: 'approved', createdAt: ago(40), decidedAt: ago(37), decidedBy: 'u05', reason: 'Meets membership criteria.', consentVersion: CONSENT_VERSION },
      { id: 'a05', ref: 'APP-2026-0137', userId: 'u21', category: 'student', country: 'TZ', affiliation: 'MSc student (demo)', interests: ['processing'], motivation: 'Learning.', status: 'approved', createdAt: ago(14), decidedAt: ago(12), decidedBy: 'u04', reason: 'Meets membership criteria.', consentVersion: CONSENT_VERSION },
      { id: 'a02', ref: 'APP-2026-0102', userId: 'u01', category: 'early_career', country: 'TZ', affiliation: 'Lake Zone Post-Harvest Institute', interests: ['post_harvest'], motivation: 'Doctoral research on tomato losses.', status: 'approved', createdAt: ago(325), decidedAt: ago(320), decidedBy: 'u05', reason: 'Meets membership criteria.', consentVersion: CONSENT_VERSION },
    ],
    reports: [{ id: 'rep1', targetType: 'post', targetId: 'p06', threadId: 't02', reporterId: 'u07', reason: 'Spam or advertising', details: 'Promotional post unrelated to the discussion.', createdAt: ago(12), status: 'open' }],
    contacts: [
      { id: 'ct1', ref: 'CON-0031', name: 'Daniel Ochieng', email: 'daniel@example.org', subject: 'Partnership enquiry', message: 'Our university would like to explore a partnership on cold-chain research. Who should we speak with?', createdAt: ago(2), status: 'open' },
      { id: 'ct2', ref: 'CON-0029', name: 'Marie Kaboré', email: 'marie@example.org', subject: 'Question about membership', message: 'Can students apply for membership?', createdAt: ago(6), status: 'resolved', resolution: 'Replied: yes, students can apply.' },
    ],
    notifications: [
      { id: 'nt1', userId: 'u01', kind: 'decision', title: 'Submission returned for changes', body: 'Tomato crate temperature logs needs more detail before it can be published.', link: '/my-submissions', createdAt: ago(6), read: false },
      { id: 'nt2', userId: 'u01', kind: 'community', title: 'New reply in your discussion', body: 'Chidinma Okafor replied to “Low-cost ways to measure tomato bruising”.', link: '/community/t01', createdAt: ago(6), read: false },
      { id: 'nt3', userId: 'u01', kind: 'event', title: 'Upcoming webinar', body: 'Measuring post-harvest losses in the field starts in 6 days.', link: '/events/e01', createdAt: ago(1), read: true },
      { id: 'nt4', userId: 'u01', kind: 'community', title: 'Connection request', body: 'Neema Mollel would like to connect.', link: '/messages', createdAt: ago(1), read: false },
    ],
    emails: [{ id: 'em1', to: 'amina@demo.flw', subject: 'Your submission needs changes', body: 'A reviewer returned “Tomato crate temperature logs” with notes. Open My submissions to revise and resubmit.', createdAt: ago(6), action: { label: 'Open My submissions', path: '/my-submissions' } }],
    audit: [
      { id: 'au1', at: ago(320), actorId: 'u05', actorName: 'Grace Achieng', action: 'application.approve', object: 'APP-2026-0102', result: 'success', correlationId: 'c-7f1a' },
      { id: 'au2', at: ago(6), actorId: 'u04', actorName: 'Joseph Otieno', action: 'resource.return', object: 'tomato-crate-temperatures v1', result: 'success', correlationId: 'c-91b2' },
      { id: 'au3', at: ago(3), actorName: 'Unknown', action: 'auth.login', object: 'grace@demo.flw', result: 'failure', correlationId: 'c-a3c4' },
    ],
    dataRequests: [{ id: 'dr1', ref: 'PRV-0007', userId: 'u02', kind: 'access', details: 'Please send me a copy of the personal data you hold about me.', status: 'open', createdAt: ago(2) }],
    feedback: [{ id: 'fb1', ref: 'FB-0012', userId: 'u10', page: '/knowledge', message: 'It would help to filter by language on mobile too.', status: 'open', createdAt: ago(3) }],
    connections: [
      { id: 'cn1', fromId: 'u01', toId: 'u02', message: 'Hello Kwame, I would like to discuss national reporting of tomato losses.', status: 'accepted', createdAt: ago(20) },
      { id: 'cn2', fromId: 'u03', toId: 'u01', message: 'Habari Amina! I work with farmer groups near Arusha and saw your tomato study.', status: 'pending', createdAt: ago(1) },
      { id: 'cn3', fromId: 'u04', toId: 'u01', message: 'Following up on your mentorship request.', status: 'accepted', createdAt: ago(35) },
    ],
    messages: [
      { id: 'm1', connectionId: 'cn1', fromId: 'u01', body: 'Thank you for accepting. Does the ministry publish market-level loss estimates?', createdAt: ago(19) },
      { id: 'm2', connectionId: 'cn1', fromId: 'u02', body: 'Not yet at market level. Our brief on indicators may help; I will share it once it is reviewed.', createdAt: ago(18) },
      { id: 'm3', connectionId: 'cn3', fromId: 'u04', body: 'Happy to review your measurement protocol before the next season.', createdAt: ago(34) },
    ],
    workspaces: [{ id: 'w1', name: 'Tomato value chain study', description: 'Shared space for the multi-country tomato loss replication.', ownerId: 'u01', members: ['u01', 'u02', 'u04'], invites: ['u08'], resources: ['tomato-losses-arusha-markets', 'loss-hotspot-mapping-template'], notes: [{ id: 'wn1', authorId: 'u04', body: 'Agreed to use the five-point bruising card in all sites.', at: ago(9) }], createdAt: ago(30) }],
    newsletters: [{ id: 'nl1', subject: 'Network update: knowledge hub and upcoming events', body: 'Highlights from the last month.', segment: { topics: [], countries: [], categories: [] }, sentAt: ago(14), recipients: 6, sentBy: 'u05' }],
    session: null, mfaChallenge: null, tokens: [], loginFailures: {}, idempotency: {}, seq: 1000,
  };
  return db;
}
