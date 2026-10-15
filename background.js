// Background Service Worker for Opencart Sesli Not Asistanı

// GitHub repo yapılandırması
const UPDATE_CONFIG = {
    // GitHub üzerindeki version.json adresi (Kullanıcı repo adresiyle eşleşir)
    versionUrl: "https://raw.githubusercontent.com/isacilgiin/oc-speak/main/version.json",
    checkIntervalMinutes: 20
};

// Kurulumda veya tarayıcı açılışında periyodik kontrol alarmı oluştur
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('checkForUpdates', { periodInMinutes: UPDATE_CONFIG.checkIntervalMinutes });
    checkAndReloadIfUpdated();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkForUpdates') {
        checkAndReloadIfUpdated();
    }
});

// Yeni sürüm kontrolü ve otomatik yeniden başlatma
async function checkAndReloadIfUpdated() {
    try {
        const response = await fetch(`${UPDATE_CONFIG.versionUrl}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        const remoteVersion = data.version;
        const currentVersion = chrome.runtime.getManifest().version;

        if (isNewerVersion(remoteVersion, currentVersion)) {
            console.log(`[Speak AutoUpdater] Yeni sürüm tespit edildi: ${remoteVersion} (Mevcut: ${currentVersion})`);
            // 3 saniye sonra eklentiyi sıfırdan yeniden başlat
            setTimeout(() => {
                chrome.runtime.reload();
            }, 3000);
        }
    } catch (e) {
        // Çevrimdışı veya bağlantı hatası durumunda sessizce geç
    }
}

function isNewerVersion(remote, local) {
    if (!remote || !local) return false;
    const rParts = remote.split('.').map(n => parseInt(n, 10) || 0);
    const lParts = local.split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
        const r = rParts[i] || 0;
        const l = lParts[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}

// Manuel istekleri dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'check_update_now') {
        checkAndReloadIfUpdated().then(() => sendResponse({ success: true }));
        return true;
    }
    if (request.action === 'force_reload') {
        chrome.runtime.reload();
        sendResponse({ success: true });
    }
});
