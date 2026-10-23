import { networks, type BluxProvider } from '@bluxcc/react';
import type { PublicConfiguration, NetworkConfiguration } from './api/config';

export function createBluxConfig(config: PublicConfiguration, network: NetworkConfiguration): Parameters<typeof BluxProvider>[0]['config'] {
  return {
    appId: config.auth.appId,
    appName: 'Launchpad',
    networks: [networks.mainnet, networks.testnet],
    showWalletUIs: false,
    defaultNetwork: networks.testnet,
    transports: {
      [networks.testnet]: { horizon: 'https://lb.drpc.live/stellar-testnet/Ahh1rnxVdErIlO_oTMvCRlN9SvIXxjYR8YVDbj3Fs6u0', soroban: 'https://rpc.ankr.com/stellar_soroban/b193c6b0b103d87578a6be96201c2dfbdf8c93c272a76f4257093cca02511068' },
      [networks.mainnet]: { horizon: 'https://lb.drpc.live/stellar/Ahh1rnxVdErIlO_oTMvCRlN9SvIXxjYR8YVDbj3Fs6u0', soroban: 'https://rpc.ankr.com/stellar_soroban/b193c6b0b103d87578a6be96201c2dfbdf8c93c272a76f4257093cca02511068' },
    },
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

