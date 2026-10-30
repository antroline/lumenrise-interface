'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBlux, useWriteContract } from '@bluxcc/react';
import { Keypair, scValToNative, StrKey } from '@stellar/stellar-sdk';
import { LAUNCH_CONFIGURED } from '@/lib/stellar/network';
import { CONFIRMATION_TIMEOUT_MS, recoverSubmittedTransaction, waitForTransaction, waitForTransactionResult } from '../../../lib/stellar/confirmation';
import { ApiError, getApiBaseUrl, getApiUserId } from '@/lib/api/client';
import { enqueueLaunch, waitForLaunchRegistration } from '@/lib/api/launches/trade-queue';
import {
  fileFromDataUrl,
  getLaunchImage,
  launchImageErrorMessage,
  uploadLaunchImage,
} from '@/lib/api/launches/images';
import { useLaunchpad, type AccountState } from '@/lib/launchpad';
import { buildBondingCurveParams, FACTORY_CONTRACT_ID } from '../lib/bonding-curve';
import type { LaunchDraft } from '../lib/launch-draft';
import type { LaunchOperation, LaunchOperationStep } from '../lib/launch-operation';
import {
  checkPending,
  describeError,
  isTransactionConfirmed,
  requireCreator,
  toUnits,
  validateInput,
  type LaunchInput,
  type LaunchRecord,
} from '../lib/launch-state';
import {
  assetFor,
  API_NETWORK,
  buildIssuance,
  buildSacDeployment,
  buildSetup,
  horizon,
  NETWORK,
  submitIssuance,
  transactionHash,
} from '../lib/transactions';

const storagePrefix = () => `launchpad:${API_NETWORK}-bonding:`;
export const BONDING_AUTH_RETURN_KEY = 'launchpad:bonding-auth-return';
/** The uploaded logo stored beside a launch record so retries reuse it. */
type LaunchImageRecord = {
  name?: string;
  slug?: string;
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
  return `${storagePrefix()}${owner}:${encodeURIComponent(input.name)}:${input.code}:${toUnits(input.amount)}`;
}

/**
 * Detects description, image, link, owner, or network changes without persisting the image
 * itself: two FNV-1a passes over the prelaunch input plus its length.
 */
function imageFingerprint(draft: LaunchDraft, owner: string) {
  const input = JSON.stringify([
    API_NETWORK, owner, draft.name, draft.description.trim(), draft.logo, draft.website.trim(), draft.xAccount.trim(),
  ]);
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
      'There was a problem reading the launch transaction result.',
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
  // Intermediate token steps stay in memory; the final Factory hash also survives reload.
  const records = useRef(new Map<string, BondingRecord>());
  const loadRecord = (owner: string, input: LaunchInput) =>
    records.current.get(recordKey(owner, input)) ?? null;
  const saveRecord = (record: BondingRecord) => {
    records.current.set(recordKey(record.token.creator, record.token), record);
  };
  const [nameConflict, setNameConflict] = useState<{ name: string; message: string } | null>(null);

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

  function complete(address: string, slug: string, hash?: string) {
    setOperation((current) => ({
      step: 'index',
      status: 'success',
      phase: 'confirming',
      message: 'Your launch is confirmed and the project page is ready.',
      curveAddress: address,
      slug,
      hash,
      transactionHashes: {
        ...current?.transactionHashes,
        ...(hash ? { curve: hash } : {}),
      },
    }));
  }

  /**
   * Register the confirmed Factory transaction and navigate with its persisted
   * slug. Pending registration never triggers another wallet transaction.
   */
  async function finish(address: string, hash: string | undefined, origin: { userId: string; apiBaseUrl: string; traderAddress: string }, timeoutMs = CONFIRMATION_TIMEOUT_MS) {
    report(
      'index', 'Confirmed on Stellar. Preparing your project page.',
      'confirming', hash,
    );
    if (!hash) throw new Error('Your launch is confirmed, but its Factory transaction hash is unavailable.');
    const record = enqueueLaunch({ chain: 'stellar', network: API_NETWORK, contractId: address,
      transactionHash: hash, ...origin });
    const result = await waitForLaunchRegistration(record, timeoutMs);
    if (!result) throw new Error('Your launch is confirmed on Stellar. Backend registration is pending and will retry automatically for the original account and network. Do not submit another launch.');
    if (result.contractId !== address) throw new Error('The registered project does not match the confirmed Factory transaction. Keep its hash.');
    router.refresh();
    complete(address, result.slug, hash);
  }

  /**
   * Uploads the project image before any wallet transaction, or reuses the
   * stored upload when the description, image, links, owner, and network are unchanged and the
   * server still holds it. The returned publicUrl goes to the contract as-is.
   */
  async function resolveLaunchImage(
    draft: LaunchDraft,
    saved: BondingRecord | null,
    owner: string,
  ): Promise<LaunchImageRecord & { name: string; slug: string }> {
    const fingerprint = imageFingerprint(draft, owner);
    const existing = saved?.image;
    if (existing && existing.fingerprint === fingerprint) {
      report('logo', 'Checking your uploaded project image.');
      try {
        const info = await getLaunchImage(existing.imageId);
        if (
          !!info.slug && !!info.name &&
          info.status !== 'expired' &&
          info.status !== 'deleting' &&
          info.ownerAddress === owner &&
          info.network === API_NETWORK
        ) {
          return {
            name: info.name,
            slug: info.slug,
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
        name: draft.name,
        description: draft.description,
        network: API_NETWORK,
        ownerAddress: owner,
        image: fileFromDataUrl(draft.logo),
        website: draft.website,
        xAccount: draft.xAccount,
      });
      if (!uploaded.name || !uploaded.slug) throw new Error('The server returned an incomplete project reservation.');
      return { ...uploaded, fingerprint };
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setNameConflict({ name: draft.name, message: launchImageErrorMessage(cause) });
      }
      throw new Error(launchImageErrorMessage(cause));
    }
  }

  async function launch(draft: LaunchDraft) {
    if (draft.method !== 'bonding' || running.current) return;
    if (nameConflict?.name === draft.name) return;
    setNameConflict(null);
    running.current = true;
    setWorking(true);
    try {
      if (!user) {
        setOperation(null);
        sessionStorage.setItem(BONDING_AUTH_RETURN_KEY, JSON.stringify(draft));
        await account.login(`/create?network=${API_NETWORK}`);
        return;
      }
      report('check', 'Checking your wallet and launch settings.');
      if (!LAUNCH_CONFIGURED || !FACTORY_CONTRACT_ID)
        throw new Error('Launching is not configured by the server for this network.');
      const owner = user.address;
      requireCreator(owner);
      requireRegisteredAccount(account.account);
      const userId = getApiUserId();
      if (!userId) throw new Error('Sign in before launching.');
      const origin = { userId, apiBaseUrl: getApiBaseUrl(), traderAddress: owner };
      const queueFactory = (hash: string) => enqueueLaunch({ chain: 'stellar', network: API_NETWORK,
        contractId: '', transactionHash: hash, ...origin });
      const input = validateInput({
        name: draft.name,
        code: draft.symbol,
        amount: draft.supply,
      });
      const recoveryKey = `${recordKey(owner, input)}:factory:${encodeURIComponent(origin.apiBaseUrl)}:${origin.userId}`;
      const saveFactory = (record: BondingRecord) => {
        saveRecord(record);
        // Persist only the final hash, never the temporary issuer secret or signed XDRs.
        try { localStorage.setItem(recoveryKey, JSON.stringify({ transactionHash: record.factoryHash })); }
        catch { account.notify('Launch recovery could not be saved. Keep the Factory transaction hash.', { tone: 'error' }); }
      };
      let persistedHash: string | undefined;
      try {
        const value: unknown = JSON.parse(localStorage.getItem(recoveryKey) ?? 'null');
        if (value && typeof value === 'object' && 'transactionHash' in value && typeof value.transactionHash === 'string' && /^[a-fA-F0-9]{64}$/.test(value.transactionHash)) persistedHash = value.transactionHash;
      } catch { /* A damaged local entry must not be interpreted as a submitted transaction. */ }
      let saved = loadRecord(owner, input);
      if (persistedHash && !saved?.factoryHash) {
        report('curve', 'Checking your saved Factory transaction.', 'confirming', persistedHash);
        const confirmed = await waitForTransaction(persistedHash);
        if (confirmed.status !== 'SUCCESS') throw new Error('The saved launch is not confirmed. Keep its hash and check again before submitting another launch.');
        queueFactory(persistedHash);
        const address = curveAddress(confirmed.returnValue ? scValToNative(confirmed.returnValue) : null);
        await finish(address, persistedHash, origin);
        localStorage.removeItem(recoveryKey);
        return;
      }
      const resuming = !!saved;
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
        await finish(saved.curveAddress, saved.factoryHash, origin);
        localStorage.removeItem(recoveryKey);
        return;
      }
      // Recover a submitted factory call before considering another transfer.
      if (saved?.factoryHash) {
        const startedAt = Date.now();
        report(
          'curve', 'Checking your submitted launch transaction.',
          'confirming', saved.factoryHash,
        );
        const result = await waitForTransaction(saved.factoryHash);
        if (result.status === 'SUCCESS') {
          queueFactory(saved.factoryHash);
          const address = curveAddress(
            result.returnValue ? scValToNative(result.returnValue) : null,
          );
          saveFactory({ ...saved, curveAddress: address });
          await finish(address, saved.factoryHash, origin, Math.max(0, CONFIRMATION_TIMEOUT_MS - (Date.now() - startedAt)));
          localStorage.removeItem(recoveryKey);
          return;
        }
        if (result.status !== 'FAILED')
          throw new Error(
            'There was a problem confirming the launch transaction.',
          );
        saved = { token: saved.token, image: saved.image };
        saveRecord(saved);
        localStorage.removeItem(recoveryKey);
        throw new Error('The launch transaction failed on-chain.');
      }
      const keypair = Keypair.random();
      const issuer = saved?.token.issuer ?? keypair.publicKey();
      const image = await resolveLaunchImage(draft, saved, owner);
      if (saved) {
        saved = { ...saved, image };
        saveRecord(saved);
      }
      // Validate all contract inputs before funding or issuing a token.
      buildBondingCurveParams({ ...draft, name: image.name }, owner, issuer, image.publicUrl);
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
        if (!resuming || !(await waitForTransactionResult(token.setupHash, () => isTransactionConfirmed(token.setupHash)))) {
          if (!token.setupXdr)
            throw new Error('The saved issuer setup transaction is missing.');
          report(
            'setup', 'Approve issuer funding and the token trustline in your wallet.',
            'approval',
          );
          const setupXdr = token.setupXdr;
          const result = await recoverSubmittedTransaction(
            () => sendTransaction(setupXdr, { network: NETWORK }),
            (hash) => {
              saveToken({ ...token, setupHash: hash });
              report('setup', 'Waiting for issuer setup confirmation.', 'confirming', hash);
            },
          );
          saveToken({ ...token, setupHash: requireHash(result) });
        }
        report(
          'setup', 'Waiting for issuer setup confirmation.',
          'confirming', token.setupHash,
        );
        await waitForTransactionResult(token.setupHash, async () =>
          await isTransactionConfirmed(token.setupHash) ? true : undefined,
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
        if (!(await waitForTransactionResult(token.distributionHash, () => isTransactionConfirmed(token.distributionHash!))))
          await submitIssuance(token.distributionXdr);
        const distributionHash = token.distributionHash;
        await waitForTransactionResult(distributionHash, async () =>
          await isTransactionConfirmed(distributionHash) ? true : undefined,
        );
        saveToken({
          ...token,
          stage: 'setupConfirmed',
          issuerSecret: undefined,
          distributionXdr: undefined,
        });
      }
      if (token.stage === 'sacPending' && token.sacSubmitted) {
        report(
          'deploy', 'Checking the token contract deployment.',
          'confirming', token.sacHash,
        );
        const confirmedToken = await checkPending(token);
        saveToken(confirmedToken);
        if (confirmedToken.stage !== 'sacConfirmed')
          throw new Error('The token contract deployment failed on-chain.');
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
          sacSubmitted: false,
        });
      }
      if (token.stage === 'sacPending') {
        if (!token.sacXdr)
          throw new Error('The saved SAC deployment transaction is missing.');
        report(
          'deploy', 'Approve the token contract deployment in your wallet.',
          'approval',
        );
        const sacXdr = token.sacXdr;
        const result = await recoverSubmittedTransaction(
          () => sendTransaction(sacXdr, { network: NETWORK }),
          (hash) => {
            saveToken({ ...token, sacHash: hash, sacSubmitted: true });
            report('deploy', 'Waiting for token contract confirmation.', 'confirming', hash);
          },
        );
        saveToken({ ...token, sacHash: requireHash(result), sacSubmitted: true });
        report(
          'deploy', 'Waiting for token contract confirmation.',
          'confirming', token.sacHash,
        );
        const confirmedToken = await checkPending(token);
        saveToken(confirmedToken);
        if (confirmedToken.stage !== 'sacConfirmed')
          throw new Error('The token contract deployment failed on-chain.');
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
      const params = buildBondingCurveParams({ ...draft, name: image.name }, owner, token.issuer, image.publicUrl);
      params.metadata.name = image.name;
      report(
        'curve', 'Approve curve creation and the full supply transfer in your wallet.',
        'approval',
      );
      const result = await recoverSubmittedTransaction(
        () => writeContract({
          call: {
            address: FACTORY_CONTRACT_ID,
            fn: 'create_bonding_curve',
            args: [params],
          },
          options: { network: NETWORK },
        }),
        (hash) => {
          saveFactory({ token, factoryHash: hash, image });
          report('curve', 'Confirming your bonding curve on Stellar.', 'confirming', hash);
        },
      );
      saveFactory({ token, factoryHash: result.hash, image });
      report(
        'curve', 'Confirming your bonding curve on Stellar.',
        'confirming', result.hash,
      );
      const startedAt = Date.now();
      const confirmed = await waitForTransaction(result.hash);
      if (confirmed.status !== 'SUCCESS') {
        saveRecord({ token, image });
        localStorage.removeItem(recoveryKey);
        throw new Error('The launch transaction failed on-chain.');
      }
      queueFactory(result.hash);
      const address = curveAddress(
        confirmed.returnValue ? scValToNative(confirmed.returnValue) : null,
      );
      saveFactory({ token, factoryHash: result.hash, curveAddress: address, image });
      await finish(address, result.hash, origin, Math.max(0, CONFIRMATION_TIMEOUT_MS - (Date.now() - startedAt)));
      localStorage.removeItem(recoveryKey);
    } catch (cause) {
      const message = describeError(cause);
      setOperation((current) =>
        current?.status === 'running'
          ? { ...current, status: 'error', phase: 'working', message }
          : current,
      );
      // Signed-out failures have no launch operation dialog to display them.
      if (!user) account.notify(message, { tone: 'error' });
    } finally {
      running.current = false;
      setWorking(false);
    }
  }

  return { launch, working, nameConflict, isReady: isReady && LAUNCH_CONFIGURED, operation };
}
