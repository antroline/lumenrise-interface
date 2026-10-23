import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { Asset, Networks } from '@stellar/stellar-sdk';

const registry = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('./payment-assets.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: registry });

test('USDC contracts match Circle issuers derived with the correct network passphrases', () => {
  assert.equal(registry.USDC_CONTRACTS.public,
    new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN').contractId(Networks.PUBLIC));
  assert.equal(registry.USDC_CONTRACTS.testnet,
    new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5').contractId(Networks.TESTNET));
  assert.notEqual(registry.USDC_CONTRACTS.public, registry.USDC_CONTRACTS.testnet);
});
