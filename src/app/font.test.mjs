import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

test('local font registration exposes the variable asset’s actual weight range', () => {
  const layout = new URL('./layout.tsx', import.meta.url);
  const source = ts.createSourceFile('layout.tsx', readFileSync(layout, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements
    .filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(node => node.name.getText(source) === 'bricolage');
  const options = declaration.initializer.arguments[0];
  const value = name => options.properties.find(property => property.name.getText(source) === name)?.initializer.text;
  const font = readFileSync(new URL(value('src'), layout));
  const tableCount = font.readUInt16BE(4);
  let variationOffset;
  for (let index = 0; index < tableCount; index++) {
    const offset = 12 + index * 16;
    if (font.toString('ascii', offset, offset + 4) === 'fvar') {
      variationOffset = font.readUInt32BE(offset + 8);
      break;
    }
  }
  assert.notEqual(variationOffset, undefined, 'font must retain its variable axes');
  const axesOffset = variationOffset + font.readUInt16BE(variationOffset + 4);
  const axisCount = font.readUInt16BE(variationOffset + 8);
  const axisSize = font.readUInt16BE(variationOffset + 10);
  let weightRange;
  for (let index = 0; index < axisCount; index++) {
    const offset = axesOffset + index * axisSize;
    if (font.toString('ascii', offset, offset + 4) === 'wght') {
      weightRange = [font.readInt32BE(offset + 4) / 65536, font.readInt32BE(offset + 12) / 65536];
      break;
    }
  }
  assert.deepEqual(weightRange, [200, 800]);
  assert.equal(value('weight'), weightRange.join(' '), 'next/font must advertise all supported weights');
});
