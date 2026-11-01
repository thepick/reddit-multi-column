const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function popup(options = {}) {
    const events = new Map(); const timers = new Map(); const writes = []; let nextTimer = 0;
    const input = { id: 'maxNumOfColumns', type: 'number', value: '5', stepUp() { this.value = String(Number(this.value) + 1); }, stepDown() { this.value = String(Number(this.value) - 1); } };
    const status = { textContent: '' };
    const button = { classList: { contains(c) { return c === 'plus'; } }, closest(selector) { return selector === 'label' ? { children: [null, input] } : this; }, parentElement: { querySelector() { return input; } } };
    let resolveStorage;
    const context = vm.createContext({
        document: { getElementById(id) { return id === input.id ? input : status; }, querySelectorAll() { return [input]; }, querySelector() { return null; }, addEventListener(t, fn) { events.set(t, fn); } },
        window: { addEventListener(t, fn) { events.set(t, fn); } },
        setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; }, setInterval(fn) { timers.set(++nextTimer, fn); return nextTimer; },
        clearTimeout(id) { timers.delete(id); }, clearInterval(id) { timers.delete(id); },
        chrome: { storage: { sync: { get() { return options.defer ? new Promise(resolve => { resolveStorage = resolve; }) : Promise.resolve({}); }, set(values) { writes.push(values); return Promise.resolve(); } } } },
    });
    const src = path.join(__dirname, '../src');
    if (fs.existsSync(path.join(src, 'settings.js'))) vm.runInContext(fs.readFileSync(path.join(src, 'settings.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(src, 'popup.js'), 'utf8'), context);
    return { events, timers, writes, input, button, resolveStorage };
}

test('releasing a held button outside the button saves and stops all timers', async () => {
    const f = popup(); await Promise.resolve();
    f.events.get('pointerdown')?.({ target: f.button, button: 0, preventDefault() {} });
    assert.equal(f.input.value, '6');
    f.events.get('pointerup')?.({ target: {} });
    assert.equal(f.timers.size, 0);
    assert.equal(f.writes.at(-1)?.maxNumOfColumns, 6);
});

test('blur stops repeat timers and invalid changes do not reach storage', async () => {
    const f = popup(); await Promise.resolve();
    f.events.get('pointerdown')?.({ target: f.button, button: 0, preventDefault() {} });
    assert.ok(f.timers.size);
    f.events.get('blur')?.(); assert.equal(f.timers.size, 0);
    f.input.value = '-10'; f.events.get('change')?.({ target: f.input });
    assert.equal(f.writes.at(-1)?.maxNumOfColumns, 5);
});

test('late storage reads cannot undo an edit made while options load', async () => {
    const f = popup({ defer: true });
    f.input.value = '2'; f.events.get('change')({ target: f.input });
    f.resolveStorage({ maxNumOfColumns: 5 }); await Promise.resolve();
    assert.equal(f.input.value, '2');
    assert.equal(f.writes.at(-1).maxNumOfColumns, 2);
});

test('late reads cannot erase a pointer step before the pointer is released', async () => {
    const f = popup({ defer: true });
    f.events.get('pointerdown')({ target: f.button, button: 0, preventDefault() {} });
    f.resolveStorage({ maxNumOfColumns: 5 }); await Promise.resolve();
    f.events.get('pointerup')({ target: {} });
    assert.equal(f.input.value, '6');
    assert.equal(f.writes.at(-1).maxNumOfColumns, 6);
});

test('late reads preserve typing before the change event commits it', async () => {
    const f = popup({ defer: true });
    f.input.value = '12'; f.events.get('input')?.({ target: f.input });
    f.resolveStorage({ maxNumOfColumns: 5 }); await Promise.resolve();
    assert.equal(f.input.value, '12');
});
