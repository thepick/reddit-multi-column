let holdTimer;
let repeatTimer;
let heldInput;
const editedInputs = new Set();

function reportError() {
    document.getElementById('status').textContent = 'Settings could not be saved. Please try again.';
}

function saveInput(input) {
    if (!Object.hasOwn(rmcSettings.defaults, input.id)) return;
    editedInputs.add(input.id);
    const value = rmcSettings.normalize({ [input.id]: input.type === 'checkbox' ? input.checked : input.value })[input.id];
    const changes = { [input.id]: value };
    if (input.type === 'checkbox') {
        input.checked = value;
        if (value) {
            const peer = input.id === 'autoHideRSidebar' ? 'autoHideRSidebarFeedPages' : 'autoHideRSidebar';
            document.getElementById(peer).checked = false;
            editedInputs.add(peer);
            changes[peer] = false;
        }
    } else input.value = String(value);
    document.getElementById('status').textContent = '';
    chrome.storage.sync.set(changes).catch(reportError);
}

chrome.storage.sync.get().then(function (values) {
    const settings = rmcSettings.normalize(values);
    for (const [id, value] of Object.entries(settings)) {
        if (editedInputs.has(id)) continue;
        const input = document.getElementById(id);
        if (input.type === 'checkbox') input.checked = value;
        else input.value = String(value);
    }
}).catch(reportError);

function stopHold() {
    clearTimeout(holdTimer);
    clearInterval(repeatTimer);
    if (heldInput) saveInput(heldInput);
    heldInput = null;
}

document.addEventListener('change', function (event) { saveInput(event.target); });
document.addEventListener('input', function (event) {
    if (Object.hasOwn(rmcSettings.defaults, event.target.id)) editedInputs.add(event.target.id);
});
document.addEventListener('pointerdown', function (event) {
    const button = event.target.closest('.numInputBtn');
    if (!button || event.button !== 0) return;
    event.preventDefault();
    stopHold();
    heldInput = button.parentElement.querySelector('input');
    editedInputs.add(heldInput.id);
    const input = heldInput;
    const step = function () {
        if (button.classList.contains('plus')) input.stepUp();
        else input.stepDown();
    };
    step();
    holdTimer = setTimeout(function () { repeatTimer = setInterval(step, 75); }, 350);
});
// Keyboard-generated clicks have no pointerdown.
document.addEventListener('click', function (event) {
    const button = event.target.closest('.numInputBtn');
    if (!button || event.detail !== 0) return;
    const input = button.parentElement.querySelector('input');
    if (button.classList.contains('plus')) input.stepUp();
    else input.stepDown();
    saveInput(input);
});
window.addEventListener('pointerup', stopHold);
window.addEventListener('pointercancel', stopHold);
window.addEventListener('blur', stopHold);
