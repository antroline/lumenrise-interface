"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useBlux } from "@bluxcc/react";
import { Keypair, type Horizon } from "@stellar/stellar-sdk";
import {
  checkPending,
  describeError,
  isTransactionConfirmed,
  loadLaunch,
  requireCreator,
  saveLaunch,
  shortAddress,
  validateInput,
  type LaunchInput,
  type LaunchRecord,
} from "./launch-state";
import {
  assetFor,
  buildIssuance,
  buildSacDeployment,
  buildSetup,
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

export function useLaunch(resumeIssuer: string | null, initialInput: LaunchInput) {
  const { user, isReady, sendTransaction } = useBlux();
  const [record, setRecord] = useState<LaunchRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { refetch: refetchWallet } = useAccount(undefined, { enabled: !!user });
  const { refetch: refetchIssuer, data: issuerAccount } = useAccount(
    { address: record?.issuer, network: NETWORK },
    { enabled: record?.stage === "issuerReady" },
  );
  const initialInputRef = useRef(initialInput);
  const [input, setInput] = useState<LaunchInput>(initialInput);
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<1 | 2 | null>(null);
  const [activity, setActivity] = useState("");
  const [error, setError] = useState("");
  const autoAdvance = useRef(false);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const saved = resumeIssuer ? loadLaunch(resumeIssuer) : null;
    setRecord(saved);
    setInput(saved ? { name: saved.name, code: saved.code, amount: saved.amount } : initialInputRef.current);
    setError(resumeIssuer && !saved ? "This launch is not saved in this browser. You can start a new token here." : "");
    setHydrated(true);
  }, [resumeIssuer]);

  const save = useCallback((next: LaunchRecord) => {
    saveLaunch(next);
    if (!mounted.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("resume") !== next.issuer) {
      url.searchParams.set("resume", next.issuer);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
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
        setActivity("Approval 2 of 2: deploy the Stellar Asset Contract.");
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
        save({ ...next, stage: "complete" });
        setActivity("Token created. The full supply was issued to the creator wallet.");
      }
    },
    [refetchIssuer, refetchWallet, save, sendTransaction],
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

  const launch = () =>
    execute(async () => {
      const values = validateInput(input);
      if (record) throw new Error("Open Create token again to start a separate launch.");
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
      setActivity("Approval 1 of 2: fund the issuer and open your trustline.");
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
        setActivity("Approval 1 of 2: resubmit the issue transaction.");
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
        setActivity("Approval 2 of 2: resubmit the SAC deployment.");
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
    launch,
    resume,
  };
}
