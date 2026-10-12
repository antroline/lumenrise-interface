'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBlux, useWriteContract } from '@bluxcc/react';
import { Keypair, scValToNative, StrKey } from '@stellar/stellar-sdk';
import { ApiError } from '@/lib/api/client';
import {
  fileFromDataUrl,
  getLaunchImage,
  launchImageErrorMessage,
  uploadLaunchImage,
} from '@/lib/api/launches/images';
import { useLaunchpad, type AccountState } from '@/lib/launchpad';
import { buildBondingCurveParams, FACTORY_CONTRACT_ID } from './bonding-curve';
import { waitForIndexedLaunch } from './indexing';
import type { LaunchDraft } from './launch-draft';
import type { LaunchOperation, LaunchOperationStep } from './launch-operation';
import {
  checkPending,
  describeError,
  isLaunchRecord,
  isTransactionConfirmed,
  requireCreator,
  toUnits,
  validateInput,
  type LaunchInput,
  type LaunchRecord,
} from './launch-state';
import {
  assetFor,
  API_NETWORK,
  buildIssuance,
  buildSacDeployment,
  buildSetup,
  horizon,
  NETWORK,
  soroban,
  submitIssuance,
  transactionHash,
} from './transactions';

const STORAGE_PREFIX = 'launchpad:testnet-bonding:';
export const BONDING_AUTH_RETURN_KEY = 'launchpad:bonding-auth-return';
/** The uploaded logo stored beside a launch record so retries reuse it. */
type LaunchImageRecord = {
  imageId: string;
  publicUrl: string;
  fingerprint: string;
};
type BondingRecord = {
  token: LaunchRecord;
  factoryHash?: string;
  curveAddress?: string;
  image?: LaunchImageRecord;
};

function recordKey(owner: string, input: LaunchInput) {
  return `${STORAGE_PREFIX}${owner}:${encodeURIComponent(input.name)}:${input.code}:${toUnits(input.amount)}`;
}

function matchesInput(token: LaunchInput, input: LaunchInput) {
  return (
    token.name === input.name && token.code === input.code &&
    toUnits(token.amount) === toUnits(input.amount)
  );
}

function readImageRecord(value: unknown): LaunchImageRecord {
  if (
    value &&
    typeof value === 'object' &&
    'imageId' in value &&
    typeof value.imageId === 'string' &&
    'publicUrl' in value &&
    typeof value.publicUrl === 'string' &&
    'fingerprint' in value &&
    typeof value.fingerprint === 'string'
  )
    return {
      imageId: value.imageId,
      publicUrl: value.publicUrl,
      fingerprint: value.fingerprint,
    };
  throw new Error('The saved bonding-curve launch cannot be read.');
}

function readRecord(stored: string, owner: string): BondingRecord {
  const value: unknown = JSON.parse(stored);
  if (
    !value ||
    typeof value !== 'object' ||
    !('token' in value) ||
    !isLaunchRecord(value.token) ||
    value.token.creator !== owner ||
    ('factoryHash' in value && typeof value.factoryHash !== 'string') ||
    ('curveAddress' in value && typeof value.curveAddress !== 'string')
  )
    throw new Error('The saved bonding-curve launch cannot be read.');
  return {
    token: value.token,
    factoryHash:
      'factoryHash' in value && typeof value.factoryHash === 'string'
        ? value.factoryHash
        : undefined,
    curveAddress:
      'curveAddress' in value && typeof value.curveAddress === 'string'
        ? value.curveAddress
        : undefined,
    image:
      'image' in value && value.image !== undefined
        ? readImageRecord(value.image)
        : undefined,
  };
}

function loadRecord(owner: string, input: LaunchInput): BondingRecord | null {
  const stored = localStorage.getItem(recordKey(owner, input));
  if (stored) {
    const record = readRecord(stored, owner);
    if (!matchesInput(record.token, input))
      throw new Error('The saved bonding-curve launch does not match this token.');
    return record;
  }

  // Older versions kept one launch per wallet. Migrate only the matching token,
  // preserving every transaction hash and the issuer key needed to resume it.
  const legacyKey = `${STORAGE_PREFIX}${owner}`;
  const legacy = localStorage.getItem(legacyKey);
  if (!legacy) return null;
  const record = readRecord(legacy, owner);
  if (!matchesInput(record.token, input)) return null;
  saveRecord(record);
  localStorage.removeItem(legacyKey);
  return record;
}

function saveRecord(record: BondingRecord) {
  localStorage.setItem(
    recordKey(record.token.creator, record.token),
    JSON.stringify(record),
  );
}

/**
 * Detects image, owner, or network changes without persisting the image
 * itself: two FNV-1a passes over the preview data URL plus its length.
 */
function imageFingerprint(dataUrl: string, owner: string) {
  const input = `${API_NETWORK}:${owner}:${dataUrl}`;
  let first = 0x811c9dc5;
  let second = 0x811c9dc5 ^ 0x9e3779b9;
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + (index & 0xff)), 0x01000193);
  }
  return `${input.length}:${(first >>> 0).toString(16)}:${(second >>> 0).toString(16)}`;
}

/** The image upload is identified by X-User-Id, which requires a finished registration. */
function requireRegisteredAccount(account: AccountState) {
  if (account.status === 'registered') return;
  if (account.status === 'checking')
    throw new Error('We are still checking your account. Try again in a moment.');
  if (account.status === 'error') throw new Error(account.message);
  throw new Error('Finish setting up your LumenRise account before launching.');
}

function requireHash(result: unknown) {
  if (
    result &&
    typeof result === 'object' &&
    'hash' in result &&
    typeof result.hash === 'string'
  )
    return result.hash;
  throw new Error('Blux did not return a transaction hash.');
}

function curveAddress(value: unknown) {
  if (typeof value !== 'string' || !StrKey.isValidContract(value))
    throw new Error(
      'The factory transaction has no valid curve address yet. Retry to check its result.',
    );
  return value;
}

export function useBondingLaunch() {
  const { user, isReady, sendTransaction } = useBlux();
  const { mutateAsync: writeContract } = useWriteContract<string>();
  const router = useRouter();
  const account = useLaunchpad();
  const [working, setWorking] = useState(false);
  const [operation, setOperation] = useState<LaunchOperation | null>(null);
  const running = useRef(false);

  function report(
    step: LaunchOperationStep,
    message: string,
    phase: LaunchOperation['phase'] = 'working',
    hash?: string,
  ) {
    setOperation((current) => ({
      step, message, phase, hash, status: 'running',
      transactionHashes: {
        ...(step === 'check' ? {} : current?.transactionHashes),
        ...(hash ? { [step]: hash } : {}),
      },
    }));
  }

  function complete(address: string, hash?: string) {
    setOperation((current) => ({
      step: 'index',
      status: 'success',
      phase: 'confirming',
      message: 'Your launch is confirmed and the project page is ready.',
      curveAddress: address,
      hash,
      transactionHashes: {
        ...current?.transactionHashes,
        ...(hash ? { curve: hash } : {}),
      },
    }));
  }

  /**
   * After the factory transaction confirms on-chain, the server reads the
   * launch from the contract on its own. Wait for that index before pointing
   * the user at the token page; a still-pending index is not a launch failure
   * and never triggers another transaction.
   */
  async function finish(address: string, hash?: string) {
    report(
      'index', 'Confirmed on Stellar. Preparing your project page.',
      'confirming', hash,
    );
    const result = await waitForIndexedLaunch(address, API_NETWORK);
    if (result !== 'ready')
      throw new Error(
        'Your launch is confirmed on Stellar. The project page is still preparing — check again in a moment.',
      );
    router.refresh();
    complete(address, hash);
  }

  /**
   * Uploads the project image before any wallet transaction, or reuses the
   * stored upload when the image, owner, and network are unchanged and the
   * server still holds it. The returned publicUrl goes to the contract as-is.
   */
  async function resolveLaunchImage(
    draft: LaunchDraft,
    saved: BondingRecord | null,
    owner: string,
  ): Promise<LaunchImageRecord> {
    const fingerprint = imageFingerprint(draft.logo, owner);
    const existing = saved?.image;
    if (existing && existing.fingerprint === fingerprint) {
      report('logo', 'Checking your uploaded project image.');
      try {
        const info = await getLaunchImage(existing.imageId);
        if (
          info.status !== 'expired' &&
          info.status !== 'deleting' &&
          info.ownerAddress === owner &&
          info.network === API_NETWORK
        ) {
          return {
            imageId: info.imageId,
            publicUrl: info.publicUrl,
            fingerprint,
          };
        }
      } catch (cause) {
        // Session and ownership failures must stop before any transaction; a
        // missing or unreachable image record falls through to a fresh upload.
        if (
          cause instanceof ApiError &&
          (cause.code === 'unauthenticated' ||
            (cause.code === 'http' &&
              (cause.status === 401 || cause.status === 403)))
        )
          throw new Error(launchImageErrorMessage(cause));
      }
    }
    report('logo', 'Uploading your project image.');
    try {
      const uploaded = await uploadLaunchImage({
        network: API_NETWORK,
        ownerAddress: owner,
        image: fileFromDataUrl(draft.logo),
      });
      return { ...uploaded, fingerprint };
    } catch (cause) {
      throw new Error(launchImageErrorMessage(cause));
    }
  }

  async function launch(draft: LaunchDraft) {
    if (draft.method !== 'bonding' || running.current) return;
    running.current = true;
    setWorking(true);
    try {
      if (!user) {
        setOperation(null);
        sessionStorage.setItem(BONDING_AUTH_RETURN_KEY, JSON.stringify(draft));
        await account.login('/create');
        return;
      }
      report('check', 'Checking your wallet and launch settings.');
      const owner = user.address;
      requireCreator(owner);
      requireRegisteredAccount(account.account);
      const input = validateInput({
        name: draft.name,
        code: draft.symbol,
        amount: draft.supply,
      });
      let saved = loadRecord(owner, input);
      if (saved) {
        const transactionHashes = {
          setup: saved.token.setupHash,
          issue: saved.token.distributionHash,
          deploy: saved.token.sacHash,
          curve: saved.factoryHash,
        };
        setOperation((current) => current ? { ...current, transactionHashes } : current);
      }
      if (saved?.curveAddress) {
        await finish(saved.curveAddress, saved.factoryHash);
        return;
      }
      // Recover a submitted factory call before considering another transfer.
      if (saved?.factoryHash) {
        report(
          'curve', 'Checking your submitted launch transaction.',
          'confirming', saved.factoryHash,
        );
        const result = await soroban.getTransaction(saved.factoryHash);
        if (result.status === 'SUCCESS') {
          const address = curveAddress(
            result.returnValue ? scValToNative(result.returnValue) : null,
          );
          saveRecord({ ...saved, curveAddress: address });
          await finish(address, saved.factoryHash);
          return;
        }
        if (result.status !== 'FAILED')
          throw new Error(
            'The factory transaction is still pending. Retry to check its result.',
          );
        saved = { token: saved.token, image: saved.image };
        saveRecord(saved);
      }
      const keypair = Keypair.random();
      const issuer = saved?.token.issuer ?? keypair.publicKey();
      const image = await resolveLaunchImage(draft, saved, owner);
      if (saved) {
        saved = { ...saved, image };
        saveRecord(saved);
      }
      // Validate all contract inputs before funding or issuing a token.
      buildBondingCurveParams(draft, owner, issuer, image.publicUrl);
      if (!saved) {
        report('setup', 'Preparing the issuer account and token trustline.');
        const wallet = await horizon.loadAccount(owner);
        const setup = buildSetup(wallet, keypair.publicKey(), input.code);
        saved = {
          token: {
            ...input,
            creator: owner,
            issuer: keypair.publicKey(),
            issuerSecret: keypair.secret(),
            sac: assetFor(input.code, keypair.publicKey()).contractId(NETWORK),
            stage: 'setupPending',
            setupHash: transactionHash(setup),
            setupXdr: setup.toXDR(),
          },
          image,
        };
        saveRecord(saved);
      }
      let token = saved.token;
      const saveToken = (next: LaunchRecord) => {
        token = next;
        saveRecord({ token, image });
      };
      if (token.stage === 'setupPending') {
        report('setup', 'Checking issuer setup.', 'confirming', token.setupHash);
        if (!(await isTransactionConfirmed(token.setupHash))) {
          if (!token.setupXdr)
            throw new Error('The saved issuer setup transaction is missing.');
          report(
            'setup', 'Approve issuer funding and the token trustline in your wallet.',
            'approval',
          );
          const result = await sendTransaction(token.setupXdr, {
            network: NETWORK,
          });
          saveToken({ ...token, setupHash: requireHash(result) });
        }
        report(
          'setup', 'Waiting for issuer setup confirmation.',
          'confirming', token.setupHash,
        );
        if (!(await isTransactionConfirmed(token.setupHash)))
          throw new Error(
            'Issuer setup is still pending. Retry to check its result.',
          );
        saveToken({ ...token, stage: 'issuerReady', setupXdr: undefined });
      }
      if (token.stage === 'issuerReady') {
        report('issue', 'Issuing the full token supply to your wallet.');
        if (!token.distributionXdr) {
          if (!token.issuerSecret)
            throw new Error('The temporary issuer key is missing.');
          const issuerAccount = await horizon.loadAccount(token.issuer);
          const issuance = buildIssuance(
            issuerAccount,
            token.issuerSecret,
            owner,
            token.code,
            token.amount,
          );
          saveToken({
            ...token,
            distributionXdr: issuance.toXDR(),
            distributionHash: transactionHash(issuance),
          });
        }
        if (!token.distributionHash || !token.distributionXdr)
          throw new Error('The saved token issuance transaction is missing.');
        report(
          'issue', 'Confirming token issuance.',
          'confirming', token.distributionHash,
        );
        if (!(await isTransactionConfirmed(token.distributionHash)))
          await submitIssuance(token.distributionXdr);
        saveToken({
          ...token,
          stage: 'setupConfirmed',
          issuerSecret: undefined,
          distributionXdr: undefined,
        });
      }
      if (token.stage === 'sacPending') {
        report(
          'deploy', 'Checking the token contract deployment.',
          'confirming', token.sacHash,
        );
        saveToken(await checkPending(token));
      }
      if (token.stage === 'setupConfirmed') {
        report('deploy', 'Preparing the Stellar Asset Contract.');
        const wallet = await horizon.loadAccount(owner);
        const deployment = await buildSacDeployment(
          wallet,
          token.code,
          token.issuer,
        );
        saveToken({
          ...token,
          stage: 'sacPending',
          sacHash: transactionHash(deployment),
          sacXdr: deployment.toXDR(),
        });
      }
      if (token.stage === 'sacPending') {
        if (!token.sacXdr)
          throw new Error('The saved SAC deployment transaction is missing.');
        report(
          'deploy', 'Approve the token contract deployment in your wallet.',
          'approval',
        );
        const result = await sendTransaction(token.sacXdr, {
          network: NETWORK,
        });
        saveToken({ ...token, sacHash: requireHash(result) });
        report(
          'deploy', 'Waiting for token contract confirmation.',
          'confirming', token.sacHash,
        );
        saveToken(await checkPending(token));
      }
      if (token.stage !== 'sacConfirmed')
        throw new Error(
          'Finish the pending token creation before launching the curve.',
        );
      report('curve', 'Checking the full token supply before creating your curve.');
      const wallet = await horizon.loadAccount(owner);
      const balance = wallet.balances.find(
        (item) =>
          'asset_code' in item &&
          item.asset_code === token.code &&
          item.asset_issuer === token.issuer,
      );
      if (!balance || toUnits(balance.balance) !== toUnits(token.amount))
        throw new Error(
          'Your connected wallet must hold the full token supply before launching the curve.',
        );
      const params = buildBondingCurveParams(draft, owner, token.issuer, image.publicUrl);
      report(
        'curve', 'Approve curve creation and the full supply transfer in your wallet.',
        'approval',
      );
      const result = await writeContract({
        call: {
          address: FACTORY_CONTRACT_ID,
          fn: 'create_bonding_curve',
          args: [params],
        },
        options: { network: NETWORK },
      });
      saveRecord({ token, factoryHash: result.hash, image });
      report(
        'curve', 'Confirming your bonding curve on Stellar.',
        'confirming', result.hash,
      );
      const address = curveAddress(await result.returnValue());
      saveRecord({ token, factoryHash: result.hash, curveAddress: address, image });
      await finish(address, result.hash);
    } catch (cause) {
      const message = describeError(cause);
      setOperation((current) =>
        current?.status === 'running'
          ? { ...current, status: 'error', phase: 'working', message }
          : current,
      );
      // Signed-out failures have no launch operation dialog to display them.
      if (!user) account.notify(message);
    } finally {
      running.current = false;
      setWorking(false);
    }
  }

  return { launch, working, isReady, operation };
}
