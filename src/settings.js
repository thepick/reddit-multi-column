// Shared by the isolated content script and options page; no page-event bridge.
globalThis.rmcSettings = Object.freeze({
    defaults: Object.freeze({
        maxNumOfColumns: 5, minColumnWidth: 450, maxColumnWidth: 732, maxContWidth: 732,
        autoHideRSidebar: false, autoHideRSidebarFeedPages: false
    }),
    limits: Object.freeze({
        maxNumOfColumns: [1, 20], minColumnWidth: [100, 10000],
        maxColumnWidth: [100, 10000], maxContWidth: [100, 10000]
    }),
    normalize(values = {}) {
        const settings = { ...this.defaults };
        for (const [key, [min, max]] of Object.entries(this.limits)) {
            const raw = values?.[key];
            const value = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN;
            if (Number.isFinite(value) && value > 0) settings[key] = Math.min(max, Math.max(min, Math.floor(value)));
        }
        settings.autoHideRSidebar = values?.autoHideRSidebar === true;
        settings.autoHideRSidebarFeedPages = !settings.autoHideRSidebar && values?.autoHideRSidebarFeedPages === true;
        return settings;
    }
});
