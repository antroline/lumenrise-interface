import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configurationModule } from '../configuration-fixture.mjs';

function harness() {
  const slots = [], cropped = [], errors = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], next => { slots[index] = next; }];
      },
      useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
      useEffect() {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {},
    '@/components/app-dialog': {},
    '@/components/ui/dialog': { Dialog: 'Dialog' },
    '@/components/ui/button': {},
    '@/lib/api/config': configurationModule,
    '@/lib/client-rules': { validateImage: async () => undefined },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('./image-crop-input.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { module, exports: module.exports, URL, require(name) { assert.ok(name in mocks, name); return mocks[name]; } });
  function render() {
    cursor = 0;
    const tree = module.exports.ImageCropInput({ kind: 'avatar', onCropped: file => cropped.push(file), onError: error => errors.push(error) });
    return { input: tree.props.children[0], dialog: tree.props.children[1], editor: tree.props.children[1].props.children };
  }
  async function select() {
    const event = { target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })], value: 'photo.png' } };
    render().input.props.onChange(event);
    await new Promise(setImmediate);
    assert.equal(event.target.value, '');
    return render();
  }
  return { render, select, cropped };
}

test('crop cancel keeps the editor and its source until the exit finishes', async () => {
  const h = harness();
  let { dialog, editor } = await h.select();
  assert.equal(dialog.props.open, true);
  const source = editor.props.source;
  editor.props.onCancel();
  ({ dialog, editor } = h.render());
  assert.equal(dialog.props.open, false);
  assert.equal(editor.props.source, source);
  dialog.props.onOpenChangeComplete(false);
  assert.equal(h.render().editor, null);
});

test('a crop finishing after cancel cannot apply the image during the closing transition', async () => {
  const h = harness();
  const { editor } = await h.select();
  const file = new File(['crop'], 'cropped.png', { type: 'image/png' });
  editor.props.onCancel();
  editor.props.onConfirm(file);
  h.render().editor.props.onConfirm(file);
  assert.equal(h.cropped.length, 0);
});

test('confirm delivers once and keeps the exiting editor, then clears it', async () => {
  const h = harness();
  const { editor } = await h.select();
  const file = new File(['crop'], 'cropped.png', { type: 'image/png' });
  editor.props.onConfirm(file);
  editor.props.onConfirm(file);
  assert.deepEqual(h.cropped, [file]);
  const closing = h.render();
  assert.equal(closing.dialog.props.open, false);
  assert.ok(closing.editor);
  closing.dialog.props.onOpenChangeComplete(false);
  assert.equal(h.render().editor, null);
});

test('an old close completion cannot remove a newly selected image', async () => {
  const h = harness();
  (await h.select()).editor.props.onCancel();
  const reopened = await h.select();
  reopened.dialog.props.onOpenChangeComplete(false);
  assert.equal(h.render().dialog.props.open, true);
  assert.ok(h.render().editor);
  h.render().editor.props.onCancel();
  h.render().dialog.props.onOpenChangeComplete(false);
});
