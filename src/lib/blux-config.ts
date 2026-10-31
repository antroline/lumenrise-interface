import { type BluxProvider } from '@bluxcc/react';
import type { PublicConfiguration, NetworkConfiguration } from './api/config';

export function createBluxConfig(
  config: PublicConfiguration,
  network: NetworkConfiguration,
): Parameters<typeof BluxProvider>[0]['config'] {
  const configured = [
    network,
    ...config.network.supported
      .filter((name) => name !== network.network)
      .map((name) => config.network.configurations[name]),
  ];
  const transports = Object.fromEntries(
    configured.map((entry) => [
      entry.networkPassphrase,
      {
        horizon: entry.horizonUrl,
        soroban: entry.rpcUrl,
      },
    ]),
  );

  return {
    appId: config.auth.appId,
    appName: 'Launchpad',
    networks: configured.map((entry) => entry.networkPassphrase),
    showWalletUIs: false,
    defaultNetwork: network.networkPassphrase,
    transports,
    loginMethods: ['wallet'],
    appearance: {
      background: '#ffffff',
      fieldBackground: '#f1f0f2',
      accentColor: '#0b0b0b',
      textColor: '#0b0b0b',
      fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif',
      borderRadius: 'var(--radius-2xl)',
      borderColor: '#e5e5e5',
      borderWidth: '1px',
      outlineColor: '#0b0b0b',
      outlineWidth: '1px',
      outlineRadius: 'var(--radius-2xl)',
      logo: `${window.location.origin}/branding/lumenrise-logo-horizontal-for-light-background.svg`,
      backdropBlur: '2px',
      backdropColor: 'rgba(11, 11, 11, 0.5)',
      boxShadow: '0 24px 70px rgba(11, 11, 11, 0.18)',
    },
  };
}
