document.addEventListener('DOMContentLoaded', () => {
    try {
        const manifest = chrome.runtime.getManifest();
        const versionElem = document.getElementById('version-text');
        if (versionElem) {
            versionElem.textContent = 'v' + manifest.version;
        }
    } catch (e) {}

    // Update Checker
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

    // Wallpaper & Dark Mode Controls
    const wpToggle = document.getElementById('popup-wp-toggle');
    const darkToggle = document.getElementById('popup-dark-toggle');
    const btnRandomWp = document.getElementById('btn-popup-random-wp');
    const btnBlurToggle = document.getElementById('btn-popup-blur-toggle');
    const btnOpenGallery = document.getElementById('btn-popup-open-gallery');

    // Load initial settings
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['oc_wallpaper_settings'], (result) => {
            const settings = result.oc_wallpaper_settings || { enabled: true, darkMode: false };
            if (wpToggle) wpToggle.checked = (settings.enabled !== false);
            if (darkToggle) darkToggle.checked = !!settings.darkMode;
        });
    }

    // Toggle Wallpaper
    if (wpToggle) {
        wpToggle.addEventListener('change', () => {
            const isEnabled = wpToggle.checked;
            chrome.storage.local.get(['oc_wallpaper_settings'], (result) => {
                const settings = result.oc_wallpaper_settings || {};
                settings.enabled = isEnabled;
                chrome.storage.local.set({ oc_wallpaper_settings: settings });
            });
        });
    }

    // Toggle Dark Mode
    if (darkToggle) {
        darkToggle.addEventListener('change', () => {
            const isDark = darkToggle.checked;
            chrome.storage.local.get(['oc_wallpaper_settings'], (result) => {
                const settings = result.oc_wallpaper_settings || {};
                settings.darkMode = isDark;
                chrome.storage.local.set({ oc_wallpaper_settings: settings });
            });
        });
    }

    // Random Wallpaper
    if (btnRandomWp) {
        btnRandomWp.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'set_random_wallpaper' });
                }
            });
        });
    }

    // Toggle Blur
    if (btnBlurToggle) {
        btnBlurToggle.addEventListener('click', () => {
            chrome.storage.local.get(['oc_wallpaper_settings'], (result) => {
                const settings = result.oc_wallpaper_settings || {};
                settings.wallpaperBlur = (settings.wallpaperBlur > 0) ? 0 : 8;
                chrome.storage.local.set({ oc_wallpaper_settings: settings });
            });
        });
    }

    // Open Gallery Modal inside Page
    if (btnOpenGallery) {
        btnOpenGallery.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'open_wallpaper_modal' });
                    window.close(); // Close popup so user sees modal
                }
            });
        });
    }
});
