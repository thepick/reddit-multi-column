(function () {
let settings = rmcSettings.normalize();
const div = document.createElement('div');
div.style = 'width: calc(100vw - var(--rmc-left-sidebar, 0px) - var(--rmc-gap, 0px) - var(--rmc-right-sidebar, 0px) - var(--rmc-right-sidebar-gap, 0px))';

let numOfColumns, width, postsContainer;
let maxNumOfColumns = settings.maxNumOfColumns;
let minColumnWidth = settings.minColumnWidth;
let heights = [];
let framePending = false;
let lastFeedWidth = 0;
const cardSizes = new WeakMap();
const candidateFeeds = new Set();
const candidateWidths = new WeakMap();
const visibilityObserver = new ResizeObserver(function (entries) {
    for (const { target } of entries) {
        if (candidateWidths.get(target) !== target.offsetWidth) {
            candidateWidths.set(target, target.offsetWidth);
            scheduleLayout();
        }
    }
});
const cardObserver = new ResizeObserver(function (entries) {
    let changed = false;
    for (const { target } of entries) {
        const size = `${target.offsetWidth}:${target.offsetHeight}`;
        if (cardSizes.get(target) !== size) {
            cardSizes.set(target, size);
            changed = true;
        }
    }
    if (changed) scheduleLayout();
});
function scheduleLayout() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(function () {
        framePending = false;
        handlePageNav();
        if (!postsContainer?.isConnected) return;
        addPostsToArray();
        handlePageResize();
        arrangePosts();
    });
}
new MutationObserver(function () {
    scheduleLayout();
}).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['routename']
});

window.addEventListener('popstate', scheduleLayout);
window.addEventListener('pageshow', scheduleLayout);
window.addEventListener('resize', scheduleLayout);

function handlePageNav() {
    const isPost = /^\/(?:r\/[^/]+\/|(?:user|u)\/[^/]+\/)?comments\/[^/]+(?:\/|$)/.test(location.pathname);
    const isShare = /^\/(?:r\/[^/]+\/)?s\/[^/]+(?:\/|$)/.test(location.pathname);
    const candidates = Array.from(document.querySelectorAll('shreddit-app:not([routename^="profile"]):not([routename="explore-page"]) shreddit-feed'));
    const currentCandidates = new Set(candidates);
    for (const candidate of candidateFeeds) {
        if (!currentCandidates.has(candidate)) {
            visibilityObserver.unobserve(candidate);
            candidateFeeds.delete(candidate);
        }
    }
    for (const candidate of candidates) {
        if (!candidateFeeds.has(candidate)) {
            candidateFeeds.add(candidate);
            visibilityObserver.observe(candidate);
        }
    }
    const feed = isPost || isShare ? null : candidates.find(candidate => candidate.offsetWidth > 0) || null;
    if (document.documentElement.classList.contains('rmc-feed-page') !== Boolean(feed)) {
        document.documentElement.classList.toggle('rmc-feed-page', Boolean(feed));
    }
    if (feed === postsContainer) return;
    cardObserver.disconnect();
    feedObserver.disconnect();
    postsContainer = feed;
    lastFeedWidth = 0;
    if (postsContainer) {

        postsContainer.after(div);
        feedObserver.observe(postsContainer);
        if (!numOfColumns) columns();
        if (!postsContainer.posts) {
            postsContainer.style.position = 'relative';
            postsContainer.posts = [];
        }

        for (const post of postsContainer.posts) if (post.isConnected) cardObserver.observe(post);
    } else div.remove();
}

function addPostsToArray() {
    if (!postsContainer?.isConnected) return;
    const newPosts = postsContainer.querySelectorAll(':is(article, in-feed-wiki-page-carousel, in-feed-community-recommendations)');

    // All the old posts were removed
    // Retain off-screen slots only while Reddit still exposes virtualization placeholders.
    if (!postsContainer.querySelector('.virtualized-placeholder')) {
        const livePosts = new Set(newPosts);
        for (const post of postsContainer.posts) if (!livePosts.has(post)) cardObserver.unobserve(post);
        postsContainer.posts = Array.from(newPosts);
    }

    const knownPosts = new Set(postsContainer.posts);
    const detachedById = new Map();
    function postId(post) { return post.querySelector('shreddit-post')?.id || post.id; }
    postsContainer.posts.forEach(function (post, index) {
        const id = postId(post);
        if (!post.isConnected && id) detachedById.set(id, { post, index });
    });
    for (let i = 0; i < newPosts.length; i++) {
        const post = newPosts[i];
        if (!knownPosts.has(post)) {
            const saved = detachedById.get(postId(post));
            if (saved) {
                post.column = saved.post.column;
                post.height = saved.post.height;
                postsContainer.posts[saved.index] = post;
                cardObserver.unobserve(saved.post);
                detachedById.delete(postId(post));
            } else postsContainer.posts.push(post);
            knownPosts.add(post);
        }
        cardObserver.observe(post);
    }
}

function arrangePosts() {
    if (!postsContainer?.isConnected || !numOfColumns) return;
    heights.fill(0);
    const batches = new Map();
    let post, shortestCol;
    for (let i = 0; i < postsContainer.posts.length; i++) {
        post = postsContainer.posts[i];
        shortestCol = post.column < numOfColumns ? post.column : getShortestCol(heights);

        if (post.isConnected) {
            Object.assign(post.style, {
                position: 'absolute', width: 'var(--rmc-post-width)',
                left: `${width * shortestCol}%`, top: `${heights[shortestCol]}px`, boxSizing: 'border-box'
            });
            heights[shortestCol] += post.offsetHeight;
            post.height = post.offsetHeight;
            post.column = shortestCol;
            if (post.parentElement !== postsContainer) {
                if (!batches.has(post.parentElement)) batches.set(post.parentElement, Array(numOfColumns).fill(0));
                batches.get(post.parentElement)[shortestCol] += post.offsetHeight;
            }
        } else {
            cardObserver.unobserve(post);
            heights[shortestCol] += post.height || 0;
        }
    }
    for (const [batch, sizes] of batches) batch.style.minHeight = Math.max(...sizes) + 'px';
    if (postsContainer.classList.contains('rmc-has-batch') !== Boolean(batches.size)) {
        postsContainer.classList.toggle('rmc-has-batch', Boolean(batches.size));
    }

    const loadMorePostsEl = getLoadMorePostsEl();

    if (loadMorePostsEl) {
        shortestCol = getShortestCol(heights);
        Object.assign(loadMorePostsEl.style, {
            position: 'absolute', width: 'var(--rmc-post-width)',
            left: `${width * shortestCol}%`, top: `${heights[shortestCol]}px`
        });
        postsContainer.style.height = Math.max(...heights) + loadMorePostsEl.offsetHeight + 'px';
    } else {
        postsContainer.style.height = Math.max(...heights) + 'px';
    }
    for (let i = 0; i < heights.length; i++) {
        heights[i] = 0;
    }
}

function getLoadMorePostsEl() {
    let el = postsContainer.lastElementChild;
    if (el?.attributes.method) return el;

    for (let i = 0; i < 5; i++) {
        if (el?.attributes.method) return el;
        else if (el) el = el.previousElementSibling;
        else break;
    }
}

function calcNumOfColumns() {
    for (let i = maxNumOfColumns; i > 0; i--) {
        if (div.clientWidth / i >= minColumnWidth) {
            document.documentElement.style.setProperty('--rmc-columns', i);
            return i;
        }
    }
    document.documentElement.style.setProperty('--rmc-columns', 1);
    return 1;
}

function getShortestCol(array) {
    let column = 0;
    for (let i = 1; i < array.length; i++) {
        if (array[column] > array[i]) {
            column = i;
        }
    }
    return column;
}

function handlePageResize() {
    if (!postsContainer?.isConnected) return;
    const feedWidth = postsContainer.offsetWidth;
    if (!feedWidth) return;
    if (calcNumOfColumns() != numOfColumns) {
        columns();
        for (let i = 0; i < postsContainer.posts.length; i++) {
            delete postsContainer.posts[i].column;
        }
    } else if (lastFeedWidth !== feedWidth) {
        document.documentElement.style.setProperty('--rmc-post-width', postsContainer.offsetWidth / numOfColumns + 'px');
    }
    lastFeedWidth = postsContainer.offsetWidth;
}

function columns() {
    numOfColumns = calcNumOfColumns() || 1;
    document.documentElement.style.setProperty('--rmc-post-width', postsContainer.offsetWidth / numOfColumns + 'px');
    width = 100 / numOfColumns;
    heights = [];
    for (let i = 0; i < numOfColumns; i++) {
        heights.push(0);
    }
}

const feedObserver = new ResizeObserver(function () {
    if (postsContainer?.isConnected && postsContainer.offsetWidth !== lastFeedWidth) scheduleLayout();
});
new ResizeObserver(scheduleLayout).observe(div);

window.addEventListener('scrollend', function () {
    if (postsContainer?.isConnected) scheduleLayout();
});

function applySettings(values) {
    settings = rmcSettings.normalize(values);
    maxNumOfColumns = settings.maxNumOfColumns;
    minColumnWidth = settings.minColumnWidth;
    document.documentElement.style.setProperty('--rmc-max-column-width', settings.maxColumnWidth + 'px');
    document.documentElement.style.setProperty('--rmc-max-cont-width', settings.maxContWidth + 'px');
    document.documentElement.classList.toggle('rmc-auto-hide-r-sidebar', settings.autoHideRSidebar);
    document.documentElement.classList.toggle('rmc-auto-hide-r-sidebar-feed-pages', settings.autoHideRSidebarFeedPages);
    lastFeedWidth = 0;
    scheduleLayout();
}
// Subscribe before the asynchronous read so a late snapshot cannot undo a change.
const pendingChanges = {};
let loaded = false;
chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync') return;
    const values = { ...settings };
    for (const key of Object.keys(rmcSettings.defaults)) {
        if (Object.hasOwn(changes, key)) {
            values[key] = changes[key].newValue;
            if (!loaded) pendingChanges[key] = changes[key].newValue;
        }
    }
    applySettings(values);
});
applySettings(settings);
chrome.storage.sync.get().then(function (values) {
    loaded = true;
    applySettings({ ...values, ...pendingChanges });
}).catch(function () {
    loaded = true;
    // Keep functional defaults (or changes already received) if sync is unavailable.
});
})();
