import { StrKey } from '@stellar/stellar-sdk';
import { ApiError, apiRequest, getApiChain, getApiNetwork } from './client';
import type { ApiNetwork } from './launches/types';

export type NetworkConfiguration = {
  network: ApiNetwork;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  factoryContractId: string;
  homeDomain: string;
  launchConfigured: boolean;
};
type Limits = { minLimit: number; defaultLimit: number; maxLimit: number };
export type PublicConfiguration = {
  version: 1;
  auth: { appId: string };
  network: {
    default: ApiNetwork;
    header: string;
    supported: ApiNetwork[];
    configurations: Record<ApiNetwork, NetworkConfiguration>;
  };
  features: { registration: boolean; imageUploads: boolean; githubConnection: boolean; xConnection: boolean };
  uploads: Record<'avatar' | 'tokenImage' | 'teamImage', { maxBytes: number }>;
  // Only rules consumed by implemented frontend features are decoded.
  rules: {
    images: { formats: string[]; mimeTypes: string[]; minWidth: number; minHeight: number; maxInputPixels: number };
    profile: { nameMinLength: number; nameMaxLength: number; walletRequired: boolean };
    team: { nameMinLength: number; nameMaxLength: number; roleMinLength: number; roleMaxLength: number; searchMinLength: number; searchMaxLength: number; searchLimit: number; maxMembers: number; externalXAccountRequired: boolean };
    projectLinks: { maxLength: number; protocols: string[]; allowCredentials: boolean; requireDottedHostname: boolean; websiteRequired: boolean; xAccountRequired: boolean };
    launches: Limits & { minPage: number; maxPage: number; searchMaxLength: number; defaultCategory: string; categories: string[]; defaultSort: string; sorts: string[]; defaultDirection: string; directions: string[]; pairRequiredSorts: string[] };
    trades: Limits & { cursorMaxLength: number; sides: string[] };
    holders: Limits & { cursorMaxLength: number };
    chart: Limits & { timeframes: string[]; defaultTimeframes: string[]; maxTimeframes: number; kinds: string[]; timezone: string; allowFutureTo: boolean; requireFromBeforeTo: boolean; legacyRanges: string[]; defaultLegacyRange: string; rangeExclusiveParameters: string[] };
  };
};
export type BasePublicConfiguration = Omit<PublicConfiguration, 'network'> & {
  chain: 'base';
  network: {
    default: ApiNetwork;
    header: 'X-Network';
    supported: ApiNetwork[];
    configurations: Record<ApiNetwork, {
      network: ApiNetwork; chainId: 8453 | 84532; factoryContractId: string; launchConfigured: boolean;
    }>;
  };
};
export type ApplicationConfiguration = PublicConfiguration | BasePublicConfiguration;

function invalid(field: string): never {
  throw new ApiError(`Server configuration is missing or invalid (${field}).`, 'invalid-response');
}
function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field);
  return value as Record<string, unknown>;
}
function fields(value: unknown, path: string, numbers = '', strings = '', booleans = '', arrays = '') {
  const record = object(value, path);
  for (const key of numbers.split(' ').filter(Boolean))
    if (!Number.isSafeInteger(record[key]) || Number(record[key]) < 0) invalid(`${path}.${key}`);
  for (const key of strings.split(' ').filter(Boolean))
    if (typeof record[key] !== 'string') invalid(`${path}.${key}`);
  for (const key of booleans.split(' ').filter(Boolean))
    if (typeof record[key] !== 'boolean') invalid(`${path}.${key}`);
  for (const key of arrays.split(' ').filter(Boolean))
    if (!Array.isArray(record[key]) || !record[key].every((item: unknown) => typeof item === 'string' && item.length > 0)) invalid(`${path}.${key}`);
  return record;
}
function httpUrl(value: unknown, field: string, allowEmpty = false) {
  if (allowEmpty && value === '') return;
  try {
    const url = new URL(String(value));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) invalid(field);
  } catch { invalid(field); }
}

export function decodeConfiguration(value: unknown, selectedChain?: 'stellar' | 'base'): ApplicationConfiguration {
  const envelope = object(value, 'config');
  if (selectedChain === 'base' && envelope.chain !== 'base') return decodeConfiguration(envelope.base, 'base');
  if (selectedChain === 'stellar' && envelope.chain === 'base') invalid('chain');
  const config = object(value, 'config');
  if (config.version !== 1) invalid('version');
  const auth = fields(config.auth, 'auth', '', 'appId');
  const base = config.chain === 'base';
  if (!base && !String(auth.appId).trim()) invalid('auth.appId');
  const network = fields(config.network, 'network', '', 'default header', '', 'supported');
  if (network.header !== (base ? 'X-Network' : 'X-Stellar-Network')) invalid('network.header');
  const supported = network.supported as string[];
  if (!supported.length || new Set(supported).size !== supported.length || supported.some(n => n !== 'testnet' && n !== 'public') || !supported.includes(String(network.default))) invalid('network.supported');
  const configurations = object(network.configurations, 'network.configurations');
  for (const name of ['testnet', 'public']) {
    if (base) {
      const entry = fields(configurations[name], `network.${name}`, 'chainId', 'network factoryContractId', 'launchConfigured');
      if (entry.network !== name || entry.chainId !== (name === 'testnet' ? 84532 : 8453) ||
          (entry.factoryContractId !== '' && !/^0x[a-fA-F0-9]{40}$/.test(String(entry.factoryContractId))) ||
          (entry.launchConfigured && !entry.factoryContractId)) invalid(`network.${name}`);
      continue;
    }
    const entry = fields(configurations[name], `network.${name}`, '', 'network rpcUrl horizonUrl networkPassphrase factoryContractId homeDomain', 'launchConfigured');
    if (entry.network !== name || !String(entry.networkPassphrase).trim()) invalid(`network.${name}`);
    httpUrl(entry.horizonUrl, `network.${name}.horizonUrl`);
    httpUrl(entry.rpcUrl, `network.${name}.rpcUrl`, true);
    if (entry.launchConfigured && (!entry.rpcUrl || !StrKey.isValidContract(String(entry.factoryContractId)) || !String(entry.homeDomain).trim())) invalid(`network.${name}.launchConfigured`);
  }
  fields(config.features, 'features', '', '', 'registration imageUploads githubConnection xConnection');
  const uploads = object(config.uploads, 'uploads');
  for (const key of ['avatar', 'tokenImage', 'teamImage']) fields(uploads[key], `uploads.${key}`, 'maxBytes');
  const rules = object(config.rules, 'rules');
  fields(rules.images, 'rules.images', 'minWidth minHeight maxInputPixels', '', '', 'formats mimeTypes');
  fields(rules.profile, 'rules.profile', 'nameMinLength nameMaxLength', '', 'walletRequired');
  fields(rules.team, 'rules.team', 'nameMinLength nameMaxLength roleMinLength roleMaxLength searchMinLength searchMaxLength searchLimit maxMembers', '', 'externalXAccountRequired');
  fields(rules.projectLinks, 'rules.projectLinks', 'maxLength', '', 'allowCredentials requireDottedHostname websiteRequired xAccountRequired', 'protocols');
  fields(rules.launches, 'rules.launches', 'minLimit defaultLimit maxLimit minPage maxPage searchMaxLength', 'defaultCategory defaultSort defaultDirection', '', 'categories sorts directions pairRequiredSorts');
  fields(rules.trades, 'rules.trades', 'minLimit defaultLimit maxLimit cursorMaxLength', '', '', 'sides');
  fields(rules.holders, 'rules.holders', 'minLimit defaultLimit maxLimit cursorMaxLength');
  fields(rules.chart, 'rules.chart', 'minLimit defaultLimit maxLimit maxTimeframes', 'timezone defaultLegacyRange', 'allowFutureTo requireFromBeforeTo', 'timeframes defaultTimeframes kinds legacyRanges rangeExclusiveParameters');
  for (const key of ['launches', 'trades', 'holders', 'chart']) {
    const rule = object(rules[key], key);
    if (Number(rule.minLimit) < 1 || Number(rule.defaultLimit) < Number(rule.minLimit) || Number(rule.defaultLimit) > Number(rule.maxLimit)) invalid(`rules.${key}.limits`);
  }
  for (const key of ['profile', 'team']) {
    const rule = object(rules[key], key);
    for (const prefix of key === 'team' ? ['name', 'role', 'search'] : ['name'])
      if (Number(rule[`${prefix}MinLength`]) > Number(rule[`${prefix}MaxLength`])) invalid(`rules.${key}.${prefix}`);
  }
  const launches = object(rules.launches, 'launches');
  for (const [key, list] of [['defaultCategory', 'categories'], ['defaultSort', 'sorts'], ['defaultDirection', 'directions']])
    if (!(launches[list] as string[]).includes(String(launches[key]))) invalid(`rules.launches.${key}`);
  if (Number(launches.minPage) < 1 || Number(launches.maxPage) < Number(launches.minPage)) invalid('rules.launches.pages');
  if (base) {
    for (const key of ['amountScale', 'priceScale']) if (key in launches && launches[key] !== null) invalid('rules.launches.' + key);
    if (rules.base !== undefined) {
      const units = fields(rules.base, 'rules.base', 'maxTokenDecimals', 'amountUnit priceUnit decimalsSource totalSupplyMeaning', 'reputationRequired buyPaymentIncludesFee sellMinimumAfterFee sellRightsFollowTransfers', 'tradeEvents');
      if (units.maxTokenDecimals !== 18 || units.amountUnit !== 'token_base_units' || units.priceUnit !== 'pair_base_units_per_whole_asset' ||
        units.decimalsSource !== 'launch.assetDecimals_and_pairDecimals' || units.totalSupplyMeaning !== 'creator_deposit' ||
        units.reputationRequired !== false || units.buyPaymentIncludesFee !== true || units.sellMinimumAfterFee !== true || units.sellRightsFollowTransfers !== false ||
        (units.tradeEvents as string[]).join(',') !== 'Bought,Sold') invalid('rules.base');
    }
    const features = object(config.features, 'features');
    if (features.githubConnection !== false || features.xConnection !== false) invalid('features');
  }
  return value as ApplicationConfiguration;
}

const loaded = new Map<string, ApplicationConfiguration>();
const pending = new Map<string, Promise<ApplicationConfiguration>>();
function configurationKey() {
  return getApiChain() === 'base' ? `base:${getApiNetwork()}` : 'stellar';
}
/** One request per document; failed reads are evicted so Retry really retries. */
export function loadConfiguration(): Promise<ApplicationConfiguration> {
  const key = configurationKey();
  const cached = loaded.get(key);
  if (cached) return Promise.resolve(cached);
  let request = pending.get(key);
  if (!request) {
    const chain = getApiChain();
    request = apiRequest<unknown>('/config')
    .then(value => decodeConfiguration(value, chain))
    .then(config => {
      if (('chain' in config ? config.chain : 'stellar') !== chain) invalid('chain');
      loaded.set(key, config); return config;
    })
    .finally(() => { pending.delete(key); });
    pending.set(key, request);
  }
  return request;
}
export function getConfiguration(): ApplicationConfiguration {
  const config = loaded.get(configurationKey());
  if (!config) throw new Error('Server configuration has not loaded.');
  return config;
}

export function retryConfiguration() {
  loaded.delete(configurationKey());
  pending.delete(configurationKey());
  return loadConfiguration();
}

export function selectNetwork(config: ApplicationConfiguration, requested: string | null): ApiNetwork {
  const network = requested === 'mainnet' ? 'public' : requested ?? config.network.default;
  if (!config.network.supported.some(value => value === network)) invalid('selected network');
  return network as ApiNetwork;
}
