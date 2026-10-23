import { networks, type BluxProvider } from '@bluxcc/react';
import type { PublicConfiguration, NetworkConfiguration } from './api/config';

export function createBluxConfig(config: PublicConfiguration, network: NetworkConfiguration): Parameters<typeof BluxProvider>[0]['config'] {
  const selected = network.network === 'public' ? networks.mainnet : networks.testnet;
  const supported = config.network.supported.map(name => name === 'public' ? networks.mainnet : networks.testnet);
  return {
    appId: config.auth.appId,
    appName: 'Launchpad',
    networks: [selected, ...supported.filter(value => value !== selected)],
    showWalletUIs: false,
    defaultNetwork: selected,
    transports: Object.fromEntries(config.network.supported.map(name => {
      const entry = config.network.configurations[name];
      const passphrase = name === 'public' ? networks.mainnet : networks.testnet;
      return [passphrase, { horizon: entry.horizonUrl, soroban: entry.rpcUrl }];
    })),
    loginMethods: ['wallet'],
    appearance: {
      background: '#ffffff',
      fieldBackground: '#f7f7f5',
      accentColor: '#0b0b0b',
      textColor: '#0b0b0b',
      fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif',
      borderRadius: 'var(--radius-2xl)',
      borderColor: '#e5e5e5',
      borderWidth: '1px',
      outlineColor: '#0b0b0b',
      outlineWidth: '2px',
      outlineRadius: 'var(--radius-2xl)',
      logo: `${window.location.origin}/branding/lumenrise-symbol-for-light-background.svg`,
      backdropBlur: '4px',
      backdropColor: 'rgba(11, 11, 11, 0.28)',
      boxShadow: '0 24px 70px rgba(11, 11, 11, 0.18)',
    },
  };
}

