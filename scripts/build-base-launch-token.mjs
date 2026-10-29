import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeLaunchTokenArtifact } from './import-base-launch-token.mjs';
const [contractsDirectory, compilerDirectory, openzeppelinDirectory] = process.argv.slice(2);
if (!contractsDirectory || !compilerDirectory || !openzeppelinDirectory) throw new Error('Usage: node scripts/build-base-launch-token.mjs <contracts-dir> <solc-package-dir> <openzeppelin-dir>');
const root = path.resolve(contractsDirectory), oz = path.resolve(openzeppelinDirectory);
const require = createRequire(import.meta.url), solc = require(path.resolve(compilerDirectory));
const expectedOz = '5fd1781b1454fd1ef8e722282f86f9293cacf256';
const ozRevision = execFileSync('git', ['-C', oz, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (ozRevision !== expectedOz || !solc.version().startsWith('0.8.30+commit.73712a01')) throw new Error('Compiler or OpenZeppelin revision does not match foundry.toml/foundry.lock.');
const sources = {}, hashes = {};
const readSource = name => {
  const base = name.startsWith('lib/openzeppelin-contracts/') ? oz : root;
  const relative = name.startsWith('lib/openzeppelin-contracts/') ? name.slice('lib/openzeppelin-contracts/'.length) : name;
  const absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep)) throw new Error('Source import escapes the configured source tree.');
  const content = fs.readFileSync(absolute, 'utf8');
  hashes[name] = crypto.createHash('sha256').update(content).digest('hex');
  return content;
};
sources['src/LaunchToken.sol'] = { content: readSource('src/LaunchToken.sol') };
const settings = { evmVersion: 'cancun', optimizer: { enabled: true, runs: 200 }, viaIR: true,
  remappings: ['@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/', '@uniswap/v4-core/=lib/v4-core/', 'v4-periphery/=lib/v4-periphery/'],
  outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'] } } };
const result = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings }), { import: name => {
  try { return { contents: readSource(name) }; } catch (error) { return { error: error.message }; }
} }));
const failures = result.errors?.filter(error => error.severity === 'error') ?? [];
if (failures.length) throw new Error(failures.map(error => error.formattedMessage).join('\n'));
const token = result.contracts['src/LaunchToken.sol'].LaunchToken;
if (!/^[0-9a-f]+$/i.test(token.evm.bytecode.object) || Object.keys(token.evm.bytecode.linkReferences).length || Object.keys(token.evm.deployedBytecode.immutableReferences).length) throw new Error('The token artifact must contain fully linked creation/runtime bytecode without immutable patches.');
const artifact = { contractName: 'LaunchToken', sourceName: 'src/LaunchToken.sol', compiler: solc.version(),
  contractRepositoryRevision: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  openzeppelinRevision: ozRevision, settings, sourceSha256: hashes, abi: token.abi,
  bytecode: { ...token.evm.bytecode, object: '0x' + token.evm.bytecode.object }, deployedBytecode: { ...token.evm.deployedBytecode, object: '0x' + token.evm.deployedBytecode.object }, metadata: JSON.parse(token.metadata) };
writeLaunchTokenArtifact(artifact);
console.log(JSON.stringify({ compiler: artifact.compiler, openzeppelinRevision: ozRevision, creationBytes: token.evm.bytecode.object.length / 2, runtimeBytes: token.evm.deployedBytecode.object.length / 2 }));
