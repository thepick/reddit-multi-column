const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function settingsApi() {
    const source = path.join(__dirname, '../src/settings.js');
    assert.ok(fs.existsSync(source), 'shared settings validation must exist');
    const context = vm.createContext({});
    vm.runInContext(fs.readFileSync(source, 'utf8'), context);
    return context.rmcSettings;
}

test('invalid and deleted settings resolve to safe defaults', () => {
    const api = settingsApi();
    const values = api.normalize({ maxNumOfColumns: Infinity, minColumnWidth: -1, maxColumnWidth: 'bad', maxContWidth: undefined, autoHideRSidebar: 'false' });
    assert.equal(values.maxNumOfColumns, 5);
    assert.equal(values.minColumnWidth, 450);
    assert.equal(values.maxColumnWidth, 732);
    assert.equal(values.maxContWidth, 732);
    assert.equal(values.autoHideRSidebar, false);
});

test('legacy numeric strings remain valid and numeric controls have bounds', () => {
    const api = settingsApi();
    assert.equal(api.normalize({ maxNumOfColumns: '3', minColumnWidth: '600' }).maxNumOfColumns, 3);
    assert.equal(api.normalize({ minColumnWidth: '600' }).minColumnWidth, 600);
    assert.equal(api.normalize({ maxNumOfColumns: 999 }).maxNumOfColumns, 20);
    assert.equal(api.normalize({ maxNumOfColumns: 2.8 }).maxNumOfColumns, 2);
});

test('sidebar modes are mutually exclusive with Everywhere taking precedence', () => {
    const api = settingsApi();
    const values = api.normalize({ autoHideRSidebar: true, autoHideRSidebarFeedPages: true });
    assert.equal(values.autoHideRSidebar, true);
    assert.equal(values.autoHideRSidebarFeedPages, false);
});
