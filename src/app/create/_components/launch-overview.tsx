'use client';

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shortAddress, type LaunchRecord } from '../_launch/launch-state';
import { LOCK_CONTRACT_ID } from '../_launch/transactions';
import { LaunchDetail } from './launch-detail';
import { TransactionLink } from './transaction-link';

export function LaunchOverview({ record }: { record: LaunchRecord }) {
  return (
    <section aria-labelledby="record-heading">
      <h2
        id="record-heading"
        className="text-[18px] font-semibold tracking-[-0.015em]"
      >
        On-chain record
      </h2>
      <dl className="mt-4">
        <LaunchDetail
          label="Asset"
          value={`${record.code}:${shortAddress(record.issuer)}`}
        />
        <LaunchDetail
          label="Issuer"
          value={record.issuer}
          href={`https://stellar.expert/explorer/testnet/account/${record.issuer}`}
        />
        <LaunchDetail
          label="SAC"
          value={record.sac}
          href={`https://stellar.expert/explorer/testnet/contract/${record.sac}`}
        />
        <LaunchDetail
          label="Lock"
          value={LOCK_CONTRACT_ID}
          href={`https://stellar.expert/explorer/testnet/contract/${LOCK_CONTRACT_ID}`}
        />
      </dl>
      <Button
        variant="outline"
        type="button"
        className="mt-5 w-full"
        onClick={() =>
          void navigator.clipboard.writeText(`${record.code}:${record.issuer}`)
        }
      >
        <Copy className="size-4" aria-hidden="true" />
        Copy full asset ID
      </Button>
      <div className="mt-6 border-t border-divider pt-5">
        <h3 className="text-[14px] font-semibold">Transactions</h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <TransactionLink hash={record.setupHash} label="Setup" />
          <TransactionLink hash={record.distributionHash} label="Issuance" />
          <TransactionLink hash={record.sacHash} label="Deployment" />
          <TransactionLink hash={record.depositHash} label="Deposit" />
          <TransactionLink hash={record.withdrawHash} label="Withdrawal" />
        </div>
      </div>
    </section>
  );
}
