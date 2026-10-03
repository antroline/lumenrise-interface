"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useBlux, useWriteContract } from "@bluxcc/react";
import { Keypair, type Horizon } from "@stellar/stellar-sdk";
import {
  checkPending,
  describeError,
  isTransactionConfirmed,
  loadLaunch,
  readLock,
  requireCreator,
  saveLaunch,
  shortAddress,
  toUnits,
  validateInput,
  type LaunchInput,
  type LaunchRecord,
} from "./launch-state";
import {
  assetFor,
  buildIssuance,
  buildSacDeployment,
  buildSetup,
  LOCK_CONTRACT_ID,
  NETWORK,
  submitIssuance,
  transactionHash,
} from "./transactions";

function submittedHash(result: unknown): string {
  if (
    result &&
    typeof result === "object" &&
    "hash" in result &&
    typeof result.hash === "string"
  )
    return result.hash;
  throw new Error("Blux did not return a transaction hash.");
}

function requireAccount(
  result: {
    data?: Horizon.AccountResponse | null;
    error?: Error | null;
  },
  missingMessage = "Your wallet needs testnet XLM. Fund it with Friendbot, then retry.",
) {
  if (result.error) throw result.error;
  if (!result.data) throw new Error(missingMessage);
  return result.data;
}

export function useLaunch() {
  const { user, isReady, sendTransaction } = useBlux();
  const [record, setRecord] = useState<LaunchRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { refetch: refetchWallet } = useAccount(undefined, { enabled: !!user });
  const { refetch: refetchIssuer, data: issuerAccount } = useAccount(
    { address: record?.issuer, network: NETWORK },
    { enabled: record?.stage === "issuerReady" },
  );
  const { mutateAsync: writeContract } = useWriteContract();
  const [input, setInput] = useState<LaunchInput>({ name: "", code: "", amount: "" });
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | null>(null);
  const [activity, setActivity] = useState("");
  const [error, setError] = useState("");
  const autoAdvance = useRef(false);
  const [now, setNow] = useState(Date.now);
  const running = useRef(false);

  useEffect(() => {
    const saved = loadLaunch();
    setRecord(saved);
    if (saved) setInput({ name: saved.name, code: saved.code, amount: saved.amount });
    setHydrated(true);
  }, []);

  const save = useCallback((next: LaunchRecord) => {
    saveLaunch(next);
    setRecord(next);
  }, []);

  const execute = useCallback(async (work: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setWorking(true);
    setError("");
    try {
      await work();
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      running.current = false;
      setWorking(false);
      setStep(null);
    }
  }, []);

  const advance = useCallback(
    async (start: LaunchRecord, knownIssuer?: Horizon.AccountResponse) => {
      let next = start;
      if (next.stage === "issuerReady") {
        setStep(1);
        setActivity(
          "Issuing the full supply and permanently disabling the issuer...",
        );
        if (!next.distributionXdr) {
          if (!next.issuerSecret)
            throw new Error(
              "The temporary issuer key is missing. This launch cannot continue.",
            );
          const issuer =
            knownIssuer ??
            requireAccount(
              await refetchIssuer(),
              "Issuer account is not visible yet. Check again shortly.",
            );
          const transaction = buildIssuance(
            issuer,
            next.issuerSecret,
            next.creator,
            next.code,
            next.amount,
          );
          next = {
            ...next,
            distributionHash: transactionHash(transaction),
            distributionXdr: transaction.toXDR(),
          };
          save(next);
        }
        if (!next.distributionHash || !next.distributionXdr)
          throw new Error("Issuer transaction is missing.");
        if (!(await isTransactionConfirmed(next.distributionHash)))
          await submitIssuance(next.distributionXdr);
        next = {
          ...next,
          stage: "setupConfirmed",
          issuerSecret: undefined,
          distributionXdr: undefined,
        };
        save(next);
      }

      if (next.stage === "setupConfirmed") {
        setStep(2);
        setActivity("Approval 2 of 3: deploy the Stellar Asset Contract.");
        const wallet = requireAccount(await refetchWallet());
        const transaction = await buildSacDeployment(
          wallet,
          next.code,
          next.issuer,
        );
        const pending: LaunchRecord = {
          ...next,
          stage: "sacPending",
          sacHash: transactionHash(transaction),
          sacXdr: transaction.toXDR(),
        };
        save(pending);
        const result = await sendTransaction(transaction.toXDR(), {
          network: NETWORK,
        });
        next = {
          ...pending,
          stage: "sacConfirmed",
          sacHash: submittedHash(result),
          sacXdr: undefined,
        };
        save(next);
      }

      if (next.stage === "sacConfirmed") {
        setStep(3);
        setActivity("Checking your full token balance before deposit...");
        const existing = await readLock(next);
        if (existing) {
          save({
            ...next,
            stage: "complete",
            lockAmount: existing.amount,
            unlockAt: existing.unlockAt,
          });
          return;
        }
        const wallet = requireAccount(await refetchWallet());
        const balance = wallet.balances.find(
          (item) =>
            "asset_code" in item &&
            item.asset_code === next.code &&
            item.asset_issuer === next.issuer,
        );
        if (!balance || toUnits(balance.balance) !== toUnits(next.amount)) {
          throw new Error(
            "Your wallet no longer holds the full supply. Return those tokens before locking them.",
          );
        }
        setActivity(
          "Approval 3 of 3: deposit the full supply into the two-minute lock.",
        );
        const result = await writeContract({
          call: {
            address: LOCK_CONTRACT_ID,
            fn: "deposit",
            args: [next.creator, next.sac],
          },
          options: { network: NETWORK },
        });
        const pending: LaunchRecord = {
          ...next,
          stage: "depositPending",
          depositHash: result.hash,
        };
        save(pending);
        const lock = await readLock(pending);
        if (!lock)
          throw new Error(
            "Deposit confirmed, but lock details are not visible yet. Continue to check again.",
          );
        next = {
          ...pending,
          stage: "complete",
          lockAmount: lock.amount,
          unlockAt: lock.unlockAt,
        };
        save(next);
        setActivity(
          "Full supply deposited. Withdraw after the unlock time shown below.",
        );
      }
    },
    [refetchIssuer, refetchWallet, save, sendTransaction, writeContract],
  );

  useEffect(() => {
    if (
      !autoAdvance.current ||
      record?.stage !== "issuerReady" ||
      !issuerAccount ||
      working
    )
      return;
    autoAdvance.current = false;
    void execute(() => advance(record, issuerAccount));
  }, [advance, execute, issuerAccount, record, working]);

  useEffect(() => {
    if (record?.stage !== "complete" || !record.unlockAt) return;
    const delay = Math.max(0, record.unlockAt * 1000 + 5_000 - Date.now());
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [record]);

  const launch = () =>
    execute(async () => {
      const values = validateInput(input);
      if (record) throw new Error("Finish or discard the current launch before creating another token.");
      if (!user) throw new Error("Connect your wallet to create a token.");
      setStep(1);
      setActivity("Checking your testnet account...");
      const creator = user.address;
      requireCreator(creator);
      const account = requireAccount(await refetchWallet());
      const issuer = Keypair.random();
      const transaction = buildSetup(account, issuer.publicKey(), values.code);
      const pending: LaunchRecord = {
        ...values,
        creator,
        issuer: issuer.publicKey(),
        issuerSecret: issuer.secret(),
        sac: assetFor(values.code, issuer.publicKey()).contractId(NETWORK),
        stage: "setupPending",
        setupHash: transactionHash(transaction),
        setupXdr: transaction.toXDR(),
      };
      setActivity("Approval 1 of 3: fund the issuer and open your trustline.");
      save(pending);
      const result = await sendTransaction(transaction.toXDR(), {
        network: NETWORK,
      });
      save({
        ...pending,
        stage: "issuerReady",
        setupHash: submittedHash(result),
        setupXdr: undefined,
      });
      autoAdvance.current = true;
    });

  const resume = () =>
    execute(async () => {
      if (!record) return;
      if (!user) throw new Error("Connect your wallet to continue this launch.");
      const address = user.address;
      if (address !== record.creator)
        throw new Error(
          `Connect ${shortAddress(record.creator)} to continue this launch.`,
        );
      let next = record;
      if (
        next.stage === "setupPending" &&
        next.setupXdr &&
        !(await isTransactionConfirmed(next.setupHash))
      ) {
        setActivity("Approval 1 of 3: resubmit the issue transaction.");
        const result = await sendTransaction(next.setupXdr, {
          network: NETWORK,
        });
        next = {
          ...next,
          stage: "issuerReady",
          setupHash: submittedHash(result),
          setupXdr: undefined,
        };
        save(next);
      } else if (next.stage.endsWith("Pending")) {
        setActivity("Checking the transaction on Stellar testnet...");
        next = await checkPending(next);
        save(next);
      }
      if (next.stage === "sacPending" && next.sacXdr) {
        setActivity("Approval 2 of 3: resubmit the SAC deployment.");
        const result = await sendTransaction(next.sacXdr, { network: NETWORK });
        next = {
          ...next,
          stage: "sacConfirmed",
          sacHash: submittedHash(result),
          sacXdr: undefined,
        };
        save(next);
      }
      if (
        next.stage === "issuerReady" ||
        next.stage === "setupConfirmed" ||
        next.stage === "sacConfirmed"
      )
        await advance(next);
    });

  const withdraw = () =>
    execute(async () => {
      if (
        !record ||
        record.stage !== "complete" ||
        !record.unlockAt ||
        Date.now() < record.unlockAt * 1000 + 5_000
      ) {
        throw new Error(
          "The tokens are still locked. Wait until the unlock time shown below.",
        );
      }
      if (!user) throw new Error("Connect your wallet to withdraw tokens.");
      const address = user.address;
      if (address !== record.creator)
        throw new Error(`Connect ${shortAddress(record.creator)} to withdraw.`);
      const existing = await readLock(record);
      if (!existing) {
        save({ ...record, stage: "withdrawn" });
        return;
      }
      setActivity("Sign to return the locked tokens to your wallet.");
      const result = await writeContract({
        call: {
          address: LOCK_CONTRACT_ID,
          fn: "withdraw",
          args: [record.creator, record.sac],
        },
        options: { network: NETWORK },
      });
      save({ ...record, stage: "withdrawn", withdrawHash: result.hash });
      setActivity("Withdrawal confirmed. Tokens are back in your wallet.");
    });

  return {
    user,
    isReady,
    hydrated,
    record,
    input,
    setInput,
    working,
    step,
    activity,
    error,
    now,
    launch,
    resume,
    withdraw,
  };
}
