'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodeDeployData, encodeFunctionData, erc20Abi, keccak256, type Address, type Hash } from 'viem';
import { useLaunchpad } from '@/lib/launchpad';
import { useConfiguration } from '@/lib/configuration';
import { useNetwork } from '@/lib/networks/context';
import { ApiError, getApiBaseUrl, getApiChain, getApiNetwork, getApiUserId } from '@/lib/api/client';
import { getLaunchList } from '@/lib/api/launches/market';
import { enqueueLaunch, waitForLaunchRegistration } from '@/lib/api/launches/trade-queue';
import { fileFromDataUrl, getLaunchImage, uploadLaunchImage, launchImageErrorMessage } from '@/lib/api/launches/images';
import { requireBaseWrites, BASE_MAINNET_BLOCK_REASON } from '@/lib/base/deployment';
import { factoryAbi } from '@/lib/base/factoryAbi';
import { launchAbi } from '@/lib/base/launchAbi';
import { launchTokenDeployment } from '@/lib/base/tokenDeployment';
import { parseBaseAmount, requireBaseTokenDecimals } from '@/lib/base/amount';
import { baseMetadataError, encodeBaseCreation } from '@/lib/base/creation';
import { canOriginateBaseTransaction, sameEvmAddress } from '@/lib/base/wallet';
import type { LaunchDraft } from '../lib/launch-draft';
import type { LaunchOperation, LaunchOperationStep } from '../lib/launch-operation';
import { validateLaunchStage, launchStages } from '../lib/launch-stages';
import { baseAddress, baseCreationKey, baseInteger, baseLaunchStart, baseObject, baseReceipt, buildBaseBondingParams, createdBaseCurve, isWalletRejection, readBaseCreationRecord, type BaseCreationRecord } from '../lib/base-creation';
import { useBaseCreationWallet, type BaseCreationCall } from './use-base-creation-wallet';
const activeCreations = new Set<string>();
export const BASE_AUTH_RETURN_KEY = 'launchpad:bonding-auth-return:base:testnet';
const rpcChainCall = { address: '0xcA11bde05977b3631167028862bE2a173976CA11', abi: [{ type: 'function', name: 'getChainId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }], functionName: 'getChainId' } as const;
export function useBaseBondingLaunch() {
  const account = useLaunchpad(), configuration = useConfiguration(), { activeNetwork } = useNetwork();
  const wallet = useBaseCreationWallet(), router = useRouter();
  const [working, setWorking] = useState(false);
  const [operation, setOperation] = useState<LaunchOperation | null>(null);
  const [nameConflict, setNameConflict] = useState<{ name: string; message: string; field?: 'project-name' | 'launch-symbol'; symbol?: string } | null>(null);
  const running = useRef(false), records = useRef(new Map<string, BaseCreationRecord>()), epoch = useRef<object>({});
  const latest = useRef({ account, wallet });
  useLayoutEffect(() => { latest.current = { account, wallet }; });
  useLayoutEffect(() => { epoch.current = {}; return () => { epoch.current = {}; }; }, [wallet.identity]);
  const networkConfiguration = 'chain' in configuration ? configuration.network.configurations.testnet : undefined;
  const isReady = activeNetwork.id === 'base-sepolia' && !!networkConfiguration?.launchConfigured && !!configuration.auth.appId.trim();
  const unavailable = activeNetwork.id !== 'base-sepolia' ? BASE_MAINNET_BLOCK_REASON : !networkConfiguration?.launchConfigured ? 'Launching is not configured by the server for Base Sepolia.' : !configuration.auth.appId.trim() ? 'Base sign-in is not configured by the server.' : undefined;
  function report(step: LaunchOperationStep, message: string, phase: LaunchOperation['phase'] = 'working', hash?: string) {
    setOperation(current => ({ step, message, phase, hash, status: 'running', transactionHashes: { ...current?.transactionHashes, ...(hash ? { [step]: hash } : {}) } }));
  }
  async function launch(draft: LaunchDraft) {
    if (running.current || draft.method !== 'bonding') return;
    if (!account.isSignedIn) {
      if (activeNetwork.id !== 'base-sepolia') { account.notify(BASE_MAINNET_BLOCK_REASON, { tone: 'error' }); return; }
      sessionStorage.setItem(BASE_AUTH_RETURN_KEY, JSON.stringify(draft));
      await account.login('/create?network=base-sepolia'); return;
    }
    const selectedOwner = wallet.owner;
    const userId = account.account.status === 'registered' ? account.account.profile.userId : undefined;
    if (!selectedOwner || !userId || !account.accountReady || account.baseSigningSupported !== true) {
      account.notify('Finish registration and select a verified linked EOA wallet before launching.', { tone: 'error' }); return;
    }
    const owner = selectedOwner;
    const identity = wallet.identity, generation = epoch.current, origin = getApiBaseUrl();
    const key = baseCreationKey(origin, userId, owner);
    if (activeCreations.has(key)) return;
    activeCreations.add(key); running.current = true; setWorking(true); setNameConflict(null);
    let saved: BaseCreationRecord | undefined;
    const guard = () => {
      if (epoch.current !== generation || latest.current.wallet.identity !== identity || getApiBaseUrl() !== origin || getApiChain() !== 'base' || getApiNetwork() !== 'testnet' || getApiUserId() !== userId)
        throw new Error('Your account, wallet, or application context changed. Return to the original account to resume this launch.');
    };
    const save = () => {
      if (!saved) throw new Error('Launch recovery is unavailable.');
      records.current.set(key, saved);
      try { localStorage.setItem(key, JSON.stringify(saved)); }
      catch { throw new Error('Launch recovery could not be saved. Keep any submitted transaction hash and restore browser storage before continuing.'); }
    };
    async function environment(writing = true) {
      requireBaseWrites('creation', activeNetwork.apiNetwork); guard();
      if (writing) { await wallet.ensureChain(); guard(); }
      const factory = baseAddress(networkConfiguration?.factoryContractId);
      const [settingsValue, chain] = await wallet.read([{ address: factory, abi: factoryAbi, functionName: 'settings' }, rpcChainCall]); guard();
      const settings = baseObject(settingsValue), pair = baseAddress(settings.pair), graduation = baseAddress(settings.graduation);
      if (chain !== BigInt(84532) || typeof settings.platform_fee_bps !== 'number' || settings.platform_fee_bps !== 100) throw new Error('The RPC chain or factory fees differ from the reviewed Base Sepolia configuration.');
      baseAddress(settings.platform);
      for (const address of [factory, pair, graduation]) { const code = await wallet.code(address); guard(); if (!code || code === '0x') throw new Error('The factory, payment token or graduation contract is not deployed.'); }
      const [decimals, symbol, graduationPair] = await wallet.read([
        { address: pair, abi: erc20Abi, functionName: 'decimals' }, { address: pair, abi: erc20Abi, functionName: 'symbol' },
        { address: graduation, abi: [{ type: 'function', name: 'pair', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' }], functionName: 'pair' },
      ]); guard();
      if (typeof decimals !== 'number' || symbol !== 'USDC' || !sameEvmAddress(baseAddress(graduationPair), pair)) throw new Error('The configured payment asset does not match this launch form or graduation contract.');
      requireBaseTokenDecimals(decimals);
      const ownerCode = writing ? await wallet.code(owner) : undefined; guard();
      if (!canOriginateBaseTransaction(ownerCode)) throw new Error('Smart-wallet deployment is not supported. Select the linked EOA wallet.');
      if (writing && await wallet.gasBalance() <= BigInt(0)) throw new Error('Fund your wallet with Base Sepolia ETH for network gas.'); guard();
      return { factory, pair, pairDecimals: decimals, platformFeeBps: settings.platform_fee_bps };
    }
    async function checkGas(data: `0x${string}`, to?: Address) {
      const needed = await wallet.estimate(data, to); guard();
      const balance = await wallet.gasBalance(); guard();
      if (balance < needed) throw new Error('Insufficient Base Sepolia ETH for this transaction’s estimated gas.');
    }
    async function sign(kind: 'token' | 'approval' | 'factory', action: (onHash: (hash: Hash) => void) => Promise<unknown>) {
      guard(); if (!saved) throw new Error('Launch recovery is unavailable.');
      saved.pendingSignature = kind; save();
      try {
        await action(hash => {
          if (!saved) return;
          if (kind === 'token') saved.tokenHash = hash;
          else if (kind === 'approval') saved.approvalHash = hash;
          else saved.factoryHash = hash;
          saved.pendingSignature = undefined;
          report(kind === 'token' ? 'setup' : kind === 'approval' ? 'deploy' : 'curve', 'Transaction submitted. Waiting for confirmation…', 'confirming', hash);
          save();
        });
      } catch (error) {
        if (isWalletRejection(error)) { saved.pendingSignature = undefined; save(); }
        throw error;
      }
    }
    async function tokenState(token: Address, name: string, deposit: bigint, factory: Address) {
      const code = await wallet.code(token); guard();
      if (code !== launchTokenDeployment.deployedBytecode) throw new Error('The deployed token does not match the verified LaunchToken artifact.');
      const [decimals, symbol, tokenName, supply, balance, allowance] = await wallet.read([
        { address: token, abi: erc20Abi, functionName: 'decimals' }, { address: token, abi: erc20Abi, functionName: 'symbol' }, { address: token, abi: erc20Abi, functionName: 'name' },
        { address: token, abi: erc20Abi, functionName: 'totalSupply' }, { address: token, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }, { address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, factory] },
      ]); guard();
      if (decimals !== 18 || symbol !== draft.symbol || tokenName !== name || baseInteger(supply) !== deposit || baseInteger(balance) !== deposit) throw new Error('Your current token balance or metadata differs from the reviewed full deposit. No token transfer was submitted.');
      return { balance: baseInteger(balance), allowance: baseInteger(allowance) };
    }
    try {
      report('check', 'Checking your wallet and deployed Base launch settings.');
      if (!isReady || unavailable) throw new Error(unavailable ?? 'Base launch creation is unavailable.');
      guard();
      const fingerprint = keccak256(new TextEncoder().encode(JSON.stringify(draft)));
      saved = records.current.get(key) ?? readBaseCreationRecord(localStorage.getItem(key), identity);
      if (saved && saved.fingerprint !== fingerprint) {
        if (saved.tokenHash || saved.tokenAddress || saved.approvalHash || saved.factoryHash || saved.pendingSignature) throw new Error('An earlier launch is saved for this wallet. Restore its reviewed draft before signing another deployment.');
        saved = undefined;
      }
      if (saved?.pendingSignature) throw new Error('A previous wallet signature has no confirmed hash. Check your wallet activity before starting another transaction.');
      if (!saved) for (const stage of launchStages) {
        const error = Object.values(validateLaunchStage(draft, stage))[0]; if (error) throw new Error(error);
      }
      if (!saved) saved = { version: 1, identity, fingerprint, startsAt: baseLaunchStart(draft) };
      save(); sessionStorage.setItem(BASE_AUTH_RETURN_KEY, JSON.stringify(draft));
      setOperation(current => current ? { ...current, transactionHashes: { setup: saved?.tokenHash, deploy: saved?.approvalHash, curve: saved?.factoryHash } } : current);
      const env = await environment(!saved.factoryHash); guard();
      const deposit = parseBaseAmount(draft.supply, 18);
      if (!saved.image) {
        const normalizeName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        for (const search of new Set([draft.symbol, draft.name])) {
          for (let page = 1; ; page++) {
            const result = await getLaunchList('testnet', page, configuration.rules.launches.defaultLimit, undefined, undefined, { search }); guard();
            const symbolTaken = result.launches.some(item => item.metadata.symbol.toUpperCase() === draft.symbol.toUpperCase());
            const nameTaken = result.launches.some(item => normalizeName(item.metadata.name) === normalizeName(draft.name));
            if (nameTaken || symbolTaken) {
              const message = nameTaken ? 'This project name is already taken on Base Sepolia.' : 'This token symbol is already used on Base Sepolia.';
              setNameConflict({ name: draft.name, symbol: draft.symbol, field: nameTaken ? 'project-name' : 'launch-symbol', message });
              throw new Error(message);
            }
            if (page * result.limit >= result.total) break;
          }
        }
        report('logo', 'Reserving your project name and uploading its image.');
        try {
          saved.image = await uploadLaunchImage({ name: draft.name, description: draft.description, network: 'testnet', ownerAddress: owner, image: fileFromDataUrl(draft.logo), website: draft.website, xAccount: draft.xAccount });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) setNameConflict({ name: draft.name, message: launchImageErrorMessage(error) });
          throw error;
        }
        guard(); save();
      }
      let image = saved.image;
      let info = await getLaunchImage(image.imageId); guard();
      if (info.network !== 'testnet' || !sameEvmAddress(info.ownerAddress, owner) || info.name !== image.name || info.publicUrl !== image.publicUrl) throw new Error('The project reservation does not match this wallet and launch.');
      if (!saved.factoryHash && info.status === 'expired') {
        report('logo', 'Renewing the expired project reservation. Your saved token deployment will be reused.');
        const renewed = await uploadLaunchImage({ name: draft.name, description: draft.description, network: 'testnet', ownerAddress: owner, image: fileFromDataUrl(draft.logo), website: draft.website, xAccount: draft.xAccount }); guard();
        if (renewed.name !== image.name) throw new Error('The renewed project name differs from the saved token. No transaction was submitted.');
        saved.image = image = renewed; save();
        info = await getLaunchImage(image.imageId); guard();
        if (info.network !== 'testnet' || !sameEvmAddress(info.ownerAddress, owner) || info.name !== image.name || info.publicUrl !== image.publicUrl) throw new Error('The renewed reservation does not match this wallet and launch.');
      }
      for (const field of ['name', 'symbol', 'description', 'logo'] as const) {
        const value = field === 'name' ? image.name : field === 'logo' ? image.publicUrl : draft[field].trim();
        const error = baseMetadataError(value, field); if (error) throw new Error(error);
      }
      if (!saved.factoryHash && (info.status === 'expired' || info.status === 'deleting')) throw new Error('Your project reservation expired. The saved token will not be deployed or deposited again.');
      // Validate all economics and ABI bounds before asking for the first signature.
      buildBaseBondingParams(draft, owner, saved.tokenAddress ?? owner, env.pair, env.pairDecimals, env.platformFeeBps, image, BigInt(saved.startsAt));
      if (!saved.tokenHash && !saved.tokenAddress) {
        const data = encodeDeployData({ abi: launchTokenDeployment.abi, bytecode: launchTokenDeployment.bytecode, args: [image.name, draft.symbol, deposit, owner] });
        await checkGas(data); await wallet.ensureChain(); guard();
        report('setup', `Approve creating ${draft.supply} ${draft.symbol} in your wallet.`, 'approval');
        await sign('token', onHash => wallet.deploy(image.name, draft.symbol, deposit, onHash)); guard();
      }
      if (saved.tokenHash && !saved.tokenAddress) {
        report('setup', 'Confirming your token deployment on Base Sepolia.', 'confirming', saved.tokenHash);
        const receipt = baseReceipt(await wallet.receipt(saved.tokenHash)); guard();
        if (receipt.status !== 'success') { saved.tokenHash = undefined; save(); throw new Error('Token deployment reverted. Retry checks before a new deployment.'); }
        if (!receipt.contractAddress) throw new Error('The mined deployment did not return a token address. Keep the transaction hash.');
        saved.tokenAddress = receipt.contractAddress; save();
      }
      const token = saved.tokenAddress;
      if (!token) throw new Error('Confirm the saved token deployment before launching.');
      const params = buildBaseBondingParams(draft, owner, token, env.pair, env.pairDecimals, env.platformFeeBps, image, BigInt(saved.startsAt));
      if (!saved.factoryHash) {
        let state = await tokenState(token, image.name, deposit, env.factory);
        if (saved.approvalHash) {
          report('deploy', 'Checking the saved token approval.', 'confirming', saved.approvalHash);
          const receipt = baseReceipt(await wallet.receipt(saved.approvalHash)); guard();
          if (receipt.status !== 'success') { saved.approvalHash = undefined; save(); throw new Error('Token approval reverted. No launch was submitted.'); }
          state = await tokenState(token, image.name, deposit, env.factory);
        }
        if (state.allowance < deposit) {
          const call: BaseCreationCall = { address: token, abi: erc20Abi, functionName: 'approve', args: [env.factory, deposit] };
          if (await wallet.simulate(call) === false) throw new Error('Token approval simulation failed.'); guard();
          await checkGas(encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [env.factory, deposit] }), token);
          await tokenState(token, image.name, deposit, env.factory); await wallet.ensureChain(); guard();
          report('deploy', `Approve the factory to deposit exactly ${draft.supply} ${draft.symbol}.`, 'approval');
          await sign('approval', onHash => wallet.write(call, onHash)); guard();
          if (!saved.approvalHash) throw new Error('The approval transaction hash is unavailable.');
          const receipt = baseReceipt(await wallet.receipt(saved.approvalHash)); guard();
          if (receipt.status !== 'success') { saved.approvalHash = undefined; save(); throw new Error('Token approval reverted. No launch was submitted.'); }
          state = await tokenState(token, image.name, deposit, env.factory);
          if (state.allowance < deposit) throw new Error('The confirmed approval is insufficient. No launch was submitted.');
        }
        const currentEnv = await environment(); guard();
        if (currentEnv.factory !== env.factory || currentEnv.pair !== env.pair || currentEnv.pairDecimals !== env.pairDecimals || currentEnv.platformFeeBps !== env.platformFeeBps) throw new Error('Deployment settings changed. Review the launch again.');
        const current = await tokenState(token, image.name, deposit, env.factory);
        const data = encodeBaseCreation(params, { caller: owner, pair: env.pair, symbol: draft.symbol, reviewedDeposit: deposit, currentBalance: current.balance, platformFeeBps: env.platformFeeBps });
        const call: BaseCreationCall = { address: env.factory, abi: factoryAbi, functionName: 'create_bonding_curve', args: [params] };
        await wallet.simulate(call); guard(); await checkGas(data, env.factory);
        const beforeSign = await tokenState(token, image.name, deposit, env.factory);
        if (beforeSign.allowance < deposit) throw new Error('Token allowance changed. No launch was submitted.');
        await wallet.ensureChain(); guard();
        report('curve', `Approve the launch and deposit of all ${draft.supply} ${draft.symbol}.`, 'approval');
        await sign('factory', onHash => wallet.write(call, onHash)); guard();
      }
      if (!saved.factoryHash) throw new Error('The launch transaction hash is unavailable.');
      report('curve', 'Confirming your launch on Base Sepolia.', 'confirming', saved.factoryHash);
      const mined = baseReceipt(await wallet.receipt(saved.factoryHash)); guard();
      if (mined.status !== 'success') { saved.factoryHash = undefined; save(); throw new Error('The launch transaction reverted. Your token deployment is saved for retry.'); }
      const confirmationRecord = enqueueLaunch({ chain: 'base', network: 'testnet', userId, apiBaseUrl: origin,
        transactionHash: saved.factoryHash, traderAddress: owner, contractId: '' });
      const curve = createdBaseCurve(mined.logs, env.factory, owner, token, deposit);
      saved.curveAddress = curve; save();
      const [curveConfig] = await wallet.read([{ address: curve, abi: launchAbi, functionName: 'get_config' }]); guard();
      const config = baseObject(curveConfig), curveParams = baseObject(config.params);
      if (!sameEvmAddress(baseAddress(config.factory), env.factory) || !sameEvmAddress(baseAddress(curveParams.owner), owner) || !sameEvmAddress(baseAddress(curveParams.asset), token) || !sameEvmAddress(baseAddress(curveParams.pair), env.pair) || baseInteger(config.total_supply) !== deposit) throw new Error('The mined launch configuration could not be verified. Do not submit a second launch.');
      report('index', 'Launch mined. Waiting for your project page to be indexed.', 'confirming', saved.factoryHash);
      const registered = await waitForLaunchRegistration(confirmationRecord); guard();
      if (!registered) throw new Error('Your launch is confirmed on Base. Backend registration is pending and will retry automatically for the original account and network. Do not deploy or deposit again.');
      if (!sameEvmAddress(registered.contractId, curve)) throw new Error('The registered project does not match the mined launch. Keep the Factory transaction hash.');
      setOperation({ step: 'index', status: 'success', phase: 'confirming', message: 'Your Base launch is confirmed and its project page is ready.', curveAddress: curve, slug: registered.slug, hash: saved.factoryHash, transactionHashes: { setup: saved.tokenHash, deploy: saved.approvalHash, curve: saved.factoryHash } });
      localStorage.removeItem(key); sessionStorage.removeItem(BASE_AUTH_RETURN_KEY); records.current.delete(key);
      router.refresh(); return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The launch could not be completed.';
      setOperation(current => ({ ...(current ?? { step: 'check', transactionHashes: {} }), status: 'error', phase: 'working', message }));
    } finally { activeCreations.delete(key); running.current = false; setWorking(false); }
  }
  return { launch, working, operation, nameConflict, isReady, unavailable };
}
