document.addEventListener('DOMContentLoaded', () => {
    try {
        const manifest = chrome.runtime.getManifest();
        const versionElem = document.getElementById('version-text');
        if (versionElem) {
            versionElem.textContent = 'v' + manifest.version;
        }
    } catch (e) {}

    const btn = document.getElementById('btn-check-update');
    const msg = document.getElementById('status-msg');

    if (btn && msg) {
        btn.addEventListener('click', () => {
            btn.disabled = true;
            msg.style.display = 'block';
            msg.style.color = '#3b82f6';
            msg.textContent = 'Güncelleme kontrol ediliyor...';

            chrome.runtime.sendMessage({ action: 'check_update_now' }, (response) => {
                msg.style.color = '#10b981';
                msg.textContent = 'Kontrol tamamlandı! Sistem güncel.';
                setTimeout(() => {
                    btn.disabled = false;
                    msg.style.display = 'none';
                }, 2500);
            });
        });
    }
});
