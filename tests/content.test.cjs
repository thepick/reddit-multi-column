const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(settings = {}) {
    const frames = [];
    const mutations = [];
    const resizes = [];
    const events = new Map();
    function style() {
        const values = {};
        return { setProperty(k, v) { values[k] = String(v); }, getPropertyValue(k) { return values[k] || ''; } };
    }
    function element(tag = 'div', height = 100) {
        const classes = new Set();
        const node = {
            tagName: tag.toUpperCase(), style: style(), attributes: {}, children: [],
            isConnected: true, parentElement: null, nextElementSibling: null,
            height, width: 1500,
            get clientWidth() { return this.width; }, get offsetWidth() { return this.width; },
            get offsetHeight() { return this.height; },
            get lastElementChild() { return this.children.at(-1) || null; },
            classList: { add(c) { classes.add(c); }, remove(c) { classes.delete(c); }, contains(c) { return classes.has(c); }, toggle(c, on) { if (on ?? !classes.has(c)) classes.add(c); else classes.delete(c); } },
            after(node) { node.isConnected = true; node.parentElement = this.parentElement; },
            remove() { this.isConnected = false; },
            querySelectorAll() { return this.children.filter(n => n.tagName === 'ARTICLE'); },
            querySelector() { return null; },
            closest(selector) { return selector === '.subgrid-container' ? this.parentElement : null; },
            matches(selector) { return selector.includes('article') && this.tagName === 'ARTICLE'; },
        };
        let inlineStyle = node.style;
        Object.defineProperty(node, 'style', { get() { return inlineStyle; }, set(value) {
            if (typeof value !== 'string') { inlineStyle = value; return; }
            inlineStyle = style();
            for (const rule of value.split(';')) { const [key, val] = rule.split(':'); if (val) inlineStyle[key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val.trim(); }
        } });
        return node;
    }
    const root = element('html');
    const parent = element('main');
    const feed = element('shreddit-feed');
    feed.parentElement = parent;
    let currentFeed = feed;
    let currentFeeds;
    const doc = {
        documentElement: root, body: null, readyState: 'complete',
        querySelector(selector) { if (selector.includes('shreddit-feed')) return currentFeed; return null; },
        querySelectorAll(selector) { return selector.includes('shreddit-feed') ? (currentFeeds || (currentFeed ? [currentFeed] : [])) : []; },
        createElement() { const el = element(); el.isConnected = false; Object.defineProperty(el, 'clientWidth', { get() { return feed.width; } }); return el; },
        addEventListener(type, callback) { events.set('document:' + type, callback); },
        removeEventListener() {},
    };
    doc.body = doc;
    const originalAdd = doc.addEventListener;
    const originalRemove = doc.removeEventListener;
    const location = { pathname: '/', href: 'https://www.reddit.com/' };
    const window = { location, addEventListener(type, callback) { events.set(type, callback); } };
    let storageListener;
    const context = vm.createContext({
        document: doc, window, location, console,
        requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
        MutationObserver: class { constructor(callback) { this.callback = callback; this.targets = []; mutations.push(this); } observe(target) { this.targets.push(target); } disconnect() { this.targets = []; } },
        ResizeObserver: class { constructor(callback) { this.callback = callback; this.targets = []; resizes.push(this); } observe(target) { this.targets.push(target); } unobserve(target) { this.targets = this.targets.filter(n => n !== target); } disconnect() { this.targets = []; } },
        HTMLDocument: { prototype: { addEventListener: originalAdd, removeEventListener: originalRemove } },
        chrome: { storage: { sync: { get() { return Promise.resolve(settings); } }, onChanged: { addListener(callback) { storageListener = callback; } } } },
    });
    const base = path.join(__dirname, '../src');
    if (fs.existsSync(path.join(base, 'settings.js'))) vm.runInContext(fs.readFileSync(path.join(base, 'settings.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(base, 'content.js'), 'utf8'), context);
    function addPost(height = 100) { const post = element('article', height); post.parentElement = feed; feed.children.push(post); return post; }
    function flush() { for (let i = 0; frames.length; i++) { assert.ok(i < 30, 'animation frames must settle'); frames.splice(0).forEach(fn => fn(0)); } }
    function mutate(target = root) { mutations.filter(o => o.targets.length).forEach(o => o.callback.call(o, [{ target, type: 'childList', addedNodes: [], removedNodes: [] }])); flush(); }
    async function ready() {
        await Promise.resolve(); await Promise.resolve();
        // Support upstream's initialization event while testing the same fixture.
        events.get('document:rmcStorageData')?.({ detail: settings });
        mutate();
    }
    return { root, feed, doc, window, location, events, resizes, mutations, context, originalAdd, originalRemove, addPost, flush, mutate, ready,
        setFeed(value) { currentFeed = value; },
        setFeeds(values) { currentFeeds = values; },
        change(values, area = 'sync') { storageListener?.(values, area); flush(); },
    };
}

test('does not replace Reddit document event methods', async () => {
    const f = fixture(); await f.ready();
    assert.equal(f.doc.addEventListener, f.originalAdd);
    assert.equal(f.doc.removeEventListener, f.originalRemove);
});

test('Back restores feed class even when the feed node is reused', async () => {
    const f = fixture(); f.addPost(); await f.ready();
    f.root.classList.remove('rmc-feed-page');
    f.events.get('popstate')?.(); f.flush();
    assert.equal(f.root.classList.contains('rmc-feed-page'), true);
});

test('outgoing feed retains its width mode until Reddit replaces its DOM', async () => {
    const f = fixture(); f.addPost(); await f.ready();
    f.location.pathname = '/r/test/comments/id/title/'; f.mutate();
    assert.equal(f.feed.parentElement.classList.contains('rmc-feed-container'), true);
    assert.equal(f.root.classList.contains('rmc-feed-page'), false);
    f.setFeed(null); f.mutate();
    assert.equal(f.feed.parentElement.classList.contains('rmc-feed-container'), false);
    assert.equal(f.root.classList.contains('rmc-feed-page'), false);
});

test('a feed first encountered on a post page does not activate feed width', async () => {
    const f = fixture(); f.location.pathname = '/r/test/comments/id/title/'; f.addPost(); await f.ready();
    assert.equal(f.root.classList.contains('rmc-feed-page'), false);
});

test('a reused container recovers its feed marker after Reddit resets its classes', async () => {
    const f = fixture(); f.addPost(); await f.ready();
    f.feed.parentElement.classList.remove('rmc-feed-container'); f.mutate();
    assert.equal(f.feed.parentElement.classList.contains('rmc-feed-container'), true);
});

test('an empty feed initializes without a last-child exception', async () => {
    const f = fixture(); await f.ready();
    f.resizes.forEach(o => o.callback([])); f.events.get('scrollend')?.(); f.flush();
    assert.equal(f.root.classList.contains('rmc-feed-page'), true);
});

test('handles a narrow viewport with one valid column', async () => {
    const f = fixture(); f.feed.width = 200; f.addPost(); await f.ready();
    assert.equal(f.root.style.getPropertyValue('--rmc-post-width'), '200px');
});

test('normalizes card inline styles using the original extension method', async () => {
    const f = fixture(); const p = f.addPost(); p.style.color = 'red'; await f.ready();
    assert.equal(p.style.position, 'absolute'); assert.equal(p.style.color, undefined);
});

test('clears stale card transforms and fixed heights before measuring', async () => {
    const f = fixture(); const p = f.addPost(200); p.style.height = '80px'; p.style.transform = 'translateY(-12px)'; await f.ready();
    assert.equal(p.style.height, undefined);
    assert.equal(p.style.transform, undefined);
});

test('repositions following cards when media changes height', async () => {
    const f = fixture({ maxNumOfColumns: 1 }); const a = f.addPost(100); const b = f.addPost(100); await f.ready();
    a.height = 250;
    f.resizes.filter(o => o.targets.includes(a)).forEach(o => o.callback([{ target: a }])); f.flush();
    assert.equal(b.style.top, '250px');
});

test('reconnects a replacement feed and safely drops the previous observer', async () => {
    const f = fixture(); f.addPost(); await f.ready();
    const replacement = { ...f.feed, children: [], posts: undefined, style: { ...f.feed.style } };
    f.feed.isConnected = false; f.setFeed(replacement); f.mutate();
    assert.equal(f.root.classList.contains('rmc-feed-page'), true);
    assert.ok(f.resizes.some(o => o.targets.includes(replacement)));
});

test('pageshow restores feed mode after page-cache restoration', async () => {
    const f = fixture(); f.addPost(); await f.ready();
    f.root.classList.remove('rmc-feed-page'); f.events.get('pageshow')?.({ persisted: true }); f.flush();
    assert.equal(f.root.classList.contains('rmc-feed-page'), true);
});

test('layout settles after observers report identical geometry', async () => {
    const f = fixture(); f.addPost(); await f.ready();
    for (let i = 0; i < 3; i++) { f.resizes.forEach(o => o.callback([])); f.flush(); }
    assert.ok(f.root.style.getPropertyValue('--rmc-post-width'));
});

module.exports = { fixture };

test('deleted settings reset defaults and unrelated storage areas are ignored', async () => {
    const f = fixture({ maxNumOfColumns: 1 }); f.addPost(); await f.ready();
    assert.equal(f.root.style.getPropertyValue('--rmc-columns'), '1');
    f.change({ maxNumOfColumns: { newValue: 2 } }, 'local');
    assert.equal(f.root.style.getPropertyValue('--rmc-columns'), '1');
    f.change({ maxNumOfColumns: { oldValue: 1 } });
    assert.equal(f.root.style.getPropertyValue('--rmc-columns'), '3');
});

test('storage changes set sidebar classes rather than blindly toggling them', async () => {
    const f = fixture(); await f.ready();
    f.change({ autoHideRSidebar: { newValue: true } });
    f.change({ autoHideRSidebar: { newValue: true } });
    assert.equal(f.root.classList.contains('rmc-auto-hide-r-sidebar'), true);
    f.change({ autoHideRSidebar: { oldValue: true } });
    assert.equal(f.root.classList.contains('rmc-auto-hide-r-sidebar'), false);
});

test('nonvirtualized removal collapses gaps and releases stale post references', async () => {
    const f = fixture({ maxNumOfColumns: 1 }); const a = f.addPost(200); const b = f.addPost(100); await f.ready();
    a.isConnected = false; f.feed.children.shift(); f.mutate();
    assert.equal(b.style.top, '0px');
    assert.equal(f.feed.posts.length, 1);
});

test('virtualized removals retain prior height and observe restored cards again', async () => {
    const f = fixture({ maxNumOfColumns: 1 }); const a = f.addPost(200); const b = f.addPost(100); await f.ready();
    f.feed.querySelector = () => ({});
    a.isConnected = false; f.feed.children.shift(); f.mutate();
    assert.equal(b.style.top, '200px');
    a.isConnected = true; f.feed.children.unshift(a); f.mutate();
    assert.ok(f.resizes.some(o => o.targets.includes(a)));
});

test('a nested batch reserves the full height of all its cards', async () => {
    const f = fixture({ maxNumOfColumns: 1 }); const a = f.addPost(100); const b = f.addPost(200);
    const batch = { style: {} }; a.parentElement = batch; b.parentElement = batch;
    a.nextElementSibling = { nextElementSibling: b };
    b.nextElementSibling = { nextElementSibling: null };
    await f.ready();
    assert.equal(batch.style.minHeight, '300px');
});

test('subreddits named comments or s are still feeds', async () => {
    for (const pathname of ['/r/comments/', '/r/comments/hot/', '/r/s/', '/user/test/m/comments/']) {
        const f = fixture(); f.location.pathname = pathname; const post = f.addPost(); await f.ready();
        assert.equal(f.root.classList.contains('rmc-feed-page'), true, pathname);
        assert.equal(post.style.position, 'absolute', pathname);
    }
});

test('selects a visible replacement instead of the first hidden cached feed', async () => {
    const f = fixture(); f.addPost(); await f.ready();
    f.feed.width = 0;
    const visible = { ...f.feed, width: 1500, children: [], posts: undefined };
    f.setFeeds([f.feed, visible]); f.mutate();
    assert.ok(f.resizes.some(o => o.targets.includes(visible)));
    assert.equal(visible.style.position, 'relative');
});

test('a hidden feed can become active without a new node being inserted', async () => {
    const f = fixture(); f.feed.width = 0; f.addPost(); await f.ready();
    assert.equal(f.root.classList.contains('rmc-feed-page'), false);
    f.feed.width = 1500;
    f.resizes.filter(o => o.targets.includes(f.feed)).forEach(o => o.callback([{ target: f.feed }])); f.flush();
    assert.equal(f.root.classList.contains('rmc-feed-page'), true);
});

test('recreated virtualized cards with stable IDs reclaim the original slot', async () => {
    const f = fixture({ maxNumOfColumns: 1 }); const a = f.addPost(200); const b = f.addPost(100); a.id = 'post-a'; await f.ready();
    f.feed.querySelector = () => ({});
    a.isConnected = false; f.feed.children.shift(); f.mutate();
    const restored = f.addPost(200); restored.id = 'post-a';
    f.feed.children = [restored, b]; f.mutate();
    assert.equal(restored.style.top, '0px');
    assert.equal(b.style.top, '200px');
    assert.equal(f.feed.posts.length, 2);
});

test('returning to a cached feed clears columns from an older layout', async () => {
    const f = fixture({ maxNumOfColumns: 3 }); const cards = [f.addPost(), f.addPost(), f.addPost()]; await f.ready();
    const other = { ...f.feed, children: [], posts: undefined };
    f.setFeed(other); f.mutate(); f.change({ maxNumOfColumns: { newValue: 1 } });
    f.setFeed(f.feed); f.mutate();
    assert.deepEqual(cards.map(post => post.style.left), ['0%', '0%', '0%']);
    assert.ok(cards.every(post => !post.style.top.includes('undefined')));
});

test('explicitly hidden cards stay hidden when upstream styling is applied', async () => {
    const f = fixture({ maxNumOfColumns: 1 }); const hidden = f.addPost(200); const visible = f.addPost(100);
    hidden.style.display = 'none'; await f.ready();
    assert.equal(hidden.style.display, 'none');
    assert.equal(visible.style.top, '0px');
});
