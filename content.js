// Check if SpeechRecognition is supported
if (!('webkitSpeechRecognition' in window)) {
    console.error("Web Speech API bu tarayıcıda desteklenmiyor.");
} else {
    initSpeechExtension();
}

function initSpeechExtension() {
    // Locate the target textarea
    const targetArea = document.getElementById('input-comment');
    if (!targetArea) return;

    // Create the control container
    const controlPanel = document.createElement('div');
    controlPanel.id = 'speech-control-panel';
    controlPanel.innerHTML = `
        <div class="speech-header">
            <span>🎙️ Sesli Asistan</span>
            <span id="speech-status" class="status-badge">Hazır</span>
        </div>
        <div class="speech-controls">
            <button id="btn-record" class="speech-btn btn-record" title="Konuşmak için bas veya basılı tut">
                <i class="fa fa-microphone"></i> <span id="btn-record-text">Konuş</span>
            </button>
            <div class="mode-switch-container" title="Mod Değiştir">
                <label class="switch-label">Sürekli</label>
                <label class="switch">
                    <input type="checkbox" id="mode-toggle">
                    <span class="slider round"></span>
                </label>
                <label class="switch-label">Bas-Konuş</label>
            </div>
            <button id="btn-read" class="speech-btn btn-read" title="Metni Oku">
                <i class="fa fa-volume-up"></i>
            </button>
            <button id="btn-vpn" class="speech-btn btn-vpn" title="EczaneVPN Onay Notu Gir">
                <i class="fa fa-shield"></i> <span id="btn-vpn-text">EczaneVPN Onay Notu</span>
            </button>
            <button id="btn-vpn-script" class="speech-btn btn-script" title="Müşteri Sözlü Onay Metnini Aç / Oku">
                <i class="fa fa-bullhorn"></i> <span id="btn-vpn-script-text">Sözlü Onay Metni</span>
            </button>
        </div>
        <div id="speech-preview" class="speech-preview"></div>
        <div id="vpn-script-card" class="vpn-script-card" style="display: none;">
            <div class="vpn-script-header">
                <span><i class="fa fa-bullhorn"></i> EczaneVPN Müşteri Sözlü Onay Metni</span>
                <div class="vpn-script-actions">
                    <button id="btn-script-insert" class="btn-script-action" title="Not Alanına Yaz"><i class="fa fa-pencil"></i> Nota Yaz</button>
                    <button id="btn-script-copy" class="btn-script-action" title="Panoya Kopyala"><i class="fa fa-copy"></i> Kopyala</button>
                    <button id="btn-script-speak" class="btn-script-action" title="Sesli Dinle"><i class="fa fa-volume-up"></i> Dinle</button>
                    <button id="btn-script-close" class="btn-script-close" title="Kapat">&times;</button>
                </div>
            </div>
            <div class="vpn-script-body" id="vpn-script-body"></div>
        </div>
    `;

    // Inject panel before the textarea's parent (or inside the column)
    targetArea.parentNode.insertBefore(controlPanel, targetArea);

    // Add margin to textarea to separate it from panel
    targetArea.style.marginTop = '15px';


    // Speech Recognition Setup
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'tr-TR';

    let isRecording = false;
    let mode = 'continuous'; // 'continuous' or 'ptt' (push-to-talk)

    // UI Elements
    const btnRecord = controlPanel.querySelector('#btn-record');
    const btnRecordText = controlPanel.querySelector('#btn-record-text');
    const btnRead = controlPanel.querySelector('#btn-read');
    const btnVpn = controlPanel.querySelector('#btn-vpn');
    const btnVpnScript = controlPanel.querySelector('#btn-vpn-script');
    const scriptCard = controlPanel.querySelector('#vpn-script-card');
    const scriptBody = controlPanel.querySelector('#vpn-script-body');
    const btnScriptInsert = controlPanel.querySelector('#btn-script-insert');
    const btnScriptCopy = controlPanel.querySelector('#btn-script-copy');
    const btnScriptSpeak = controlPanel.querySelector('#btn-script-speak');
    const btnScriptClose = controlPanel.querySelector('#btn-script-close');
    const statusBadge = controlPanel.querySelector('#speech-status');
    const modeToggle = controlPanel.querySelector('#mode-toggle');
    const previewArea = controlPanel.querySelector('#speech-preview');

    // Update UI based on mode
    function updateModeUI() {
        if (modeToggle.checked) {
            mode = 'ptt';
            btnRecordText.textContent = "Basılı Tut";
            btnRecord.title = "Konuşmak için basılı tutun, bitince bırakın";
            if (isRecording) stopRecording();
        } else {
            mode = 'continuous';
            btnRecordText.textContent = "Konuş";
            btnRecord.title = "Başlatmak/Durdurmak için tıklayın";
            if (isRecording) stopRecording();
        }
    }

    modeToggle.addEventListener('change', updateModeUI);

    // Recording Functions
    function startRecording() {
        if (!isRecording) {
            try {
                recognition.start();
            } catch (e) {
                console.error("Recognition start error", e);
            }
        }
    }

    function stopRecording() {
        if (isRecording) {
            recognition.stop();
        }
    }

    // Button Logic
    // Mouse Down (PTT Start) or Click (Continuous Toggle) behavior is complex to mix, 
    // so we separate them based on mode.

    btnRecord.addEventListener('mousedown', (e) => {
        if (mode === 'ptt') {
            e.preventDefault();
            startRecording();
        }
    });

    btnRecord.addEventListener('mouseup', (e) => {
        if (mode === 'ptt') {
            e.preventDefault();
            setTimeout(stopRecording, 500); // Small delay to catch end of sentence
        }
    });

    btnRecord.addEventListener('mouseleave', (e) => {
        if (mode === 'ptt' && isRecording) {
            stopRecording();
        }
    });

    btnRecord.addEventListener('click', (e) => {
        e.preventDefault();
        if (mode === 'continuous') {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
    });

    // Read Button
    btnRead.addEventListener('click', (e) => {
        e.preventDefault();
        const textToRead = targetArea.value;
        if (textToRead.trim() !== "") {
            speakText(textToRead);
        }
    });

    // EczaneVPN Onay Notu Button
    if (btnVpn) {
        btnVpn.addEventListener('click', async (e) => {
            e.preventDefault();
            await insertEczaneVpnNote(targetArea, btnVpn);
        });
    }

    // Teleprompter / Müşteri Sözlü Onay Metni Kontrolleri
    function toggleScriptCard(show) {
        if (!scriptCard) return;
        const willShow = (typeof show === 'boolean') ? show : (scriptCard.style.display === 'none');
        if (willShow) {
            renderVpnScriptCard(scriptBody);
            scriptCard.style.display = 'block';
            if (btnVpnScript) btnVpnScript.classList.add('active-open');
            localStorage.setItem('vpn_script_visible', '1');
        } else {
            scriptCard.style.display = 'none';
            if (btnVpnScript) btnVpnScript.classList.remove('active-open');
            localStorage.setItem('vpn_script_visible', '0');
        }
    }

    if (btnVpnScript) {
        btnVpnScript.addEventListener('click', (e) => {
            e.preventDefault();
            toggleScriptCard();
        });
    }

    if (btnScriptClose) {
        btnScriptClose.addEventListener('click', (e) => {
            e.preventDefault();
            toggleScriptCard(false);
        });
    }

    if (btnScriptInsert) {
        btnScriptInsert.addEventListener('click', (e) => {
            e.preventDefault();
            const text = getEczaneVpnScriptPlainText();
            if (targetArea.value.trim().length > 0) {
                targetArea.value = targetArea.value + '\n\n' + text;
            } else {
                targetArea.value = text;
            }
            targetArea.dispatchEvent(new Event('input', { bubbles: true }));
            targetArea.dispatchEvent(new Event('change', { bubbles: true }));
            targetArea.focus();

            btnScriptInsert.innerHTML = '<i class="fa fa-check"></i> Yazıldı!';
            setTimeout(() => {
                btnScriptInsert.innerHTML = '<i class="fa fa-pencil"></i> Nota Yaz';
            }, 1200);
        });
    }

    if (btnScriptCopy) {
        btnScriptCopy.addEventListener('click', (e) => {
            e.preventDefault();
            const text = getEczaneVpnScriptPlainText();
            navigator.clipboard.writeText(text);
            btnScriptCopy.innerHTML = '<i class="fa fa-check"></i> Kopyalandı!';
            setTimeout(() => {
                btnScriptCopy.innerHTML = '<i class="fa fa-copy"></i> Kopyala';
            }, 1200);
        });
    }

    if (btnScriptSpeak) {
        btnScriptSpeak.addEventListener('click', (e) => {
            e.preventDefault();
            const text = getEczaneVpnScriptPlainText();
            speakText(text);
        });
    }

    // Önceden açık bırakıldıysa kalıcı olarak açık tut
    if (localStorage.getItem('vpn_script_visible') === '1') {
        toggleScriptCard(true);
    }

    // Recognition Lifecycle
    recognition.onstart = () => {
        isRecording = true;
        statusBadge.textContent = "Dinliyor...";
        statusBadge.className = "status-badge status-listening";
        controlPanel.classList.add('recording-active');
        previewArea.style.display = 'block';
        previewArea.textContent = '...';

        // Audio Feedback
        playBeep();

        if (mode === 'continuous') {
            btnRecord.innerHTML = '<i class="fa fa-stop"></i> Durdur';
            btnRecord.classList.add('btn-stop-mode');
        } else {
            btnRecord.classList.add('btn-active-ptt');
        }
    };

    function playBeep() {
        // Short "ding" sound (Base64 WAV) to avoid AudioContext policy issues
        const beepUrl = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder short, using a real one below

        // Real Base64 for a short 880Hz sine beep (generated for brevity and reliability)
        const realBeep = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1mfHzK1X18W2yBioVzXWZ8fMrVfXtbbIGKhGxdaHx8ytV9e1trgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1ofHzK1X17W2yBioVsXWZ8fMrVfXtbbIGKhWxdaHx8ytV9e1tsgYqFbF1mfHzK1X17W2yBioVsXWh8fMrVfXtbbIGKhWxdaHx8ytV9e1t";

        try {
            const audio = new Audio(realBeep);
            audio.volume = 0.5;
            audio.play().catch(e => console.error("Audio play error", e));
        } catch (e) {
            console.error("Audio construction failed", e);
        }
    }

    // Netsipp logic moved to end of file to run globally


    recognition.onend = () => {
        isRecording = false;
        statusBadge.textContent = "Hazır";
        statusBadge.className = "status-badge";
        controlPanel.classList.remove('recording-active');
        previewArea.style.display = 'none';
        previewArea.textContent = '';

        if (mode === 'continuous') {
            btnRecord.innerHTML = '<i class="fa fa-microphone"></i> Konuş';
            btnRecord.classList.remove('btn-stop-mode');
        } else {
            btnRecord.classList.remove('btn-active-ptt');
        }
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                // Determine if we need a space
                const previousContent = targetArea.value;
                const needsSpace = previousContent.length > 0 && !previousContent.endsWith(' ') && !previousContent.endsWith('\n');

                targetArea.value += (needsSpace ? ' ' : '') + event.results[i][0].transcript;
                previewArea.textContent = ''; // Clear preview when final
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (interimTranscript) {
            previewArea.textContent = interimTranscript;
        }
    };

    recognition.onerror = (event) => {
        // Ignore 'no-speech' errors which happen frequently
        if (event.error !== 'no-speech') {
            console.error("Speech error", event.error);
            statusBadge.textContent = "Hata";
        }
    };
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Tarayıcınız metin okuma özelliğini desteklemiyor.");
    }
}

// --- ECZANEVPN NOTE HELPER FUNCTIONS ---
function formatPhoneNumber(raw) {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length === 12) {
        digits = '0' + digits.substring(2);
    }
    if (digits.length === 10 && (digits.startsWith('5') || !digits.startsWith('0'))) {
        digits = '0' + digits;
    }
    return digits;
}

function saveLastNetsippNumber(num) {
    if (!num) return;
    const formatted = formatPhoneNumber(num);
    if (formatted) {
        window.lastNetsippPhone = formatted;
        try {
            sessionStorage.setItem('lastNetsippPhone', formatted);
        } catch (e) {}
    }
}

function findPhoneFromHistoryNotes() {
    const containers = document.querySelectorAll('#history_customer, #tableana');
    for (const container of containers) {
        const rows = container.querySelectorAll('tr');
        for (const row of rows) {
            const text = row.innerText || row.textContent;
            if (!text) continue;

            // Matches real-world formats from team notes:
            // "NUMARA : 05300372795", "numara:0530-846-90-26(ali)", "numara:532-696-62-95(ALİ)",
            // "Çağrı No : +90 553 707 64 16", "|| Çağrı No : 0535-228-00-00", "numara:0216-352-33-95"
            const match = text.match(/(?:çağrı\s*no|cagri\s*no|çağrı\s*numarası|cagri\s*numarasi|\bnumara|\btel|\btelefon)\s*[:=\-]?\s*([+0-9\s\-]{9,20})/i);
            if (match && match[1]) {
                const formatted = formatPhoneNumber(match[1]);
                if (formatted.length >= 10) {
                    return formatted;
                }
            }
        }
    }
    return null;
}

function findAnyPhoneFromLatestHistoryNote() {
    const rows = document.querySelectorAll('#history_customer tbody tr, #tableana tbody tr');
    for (const row of rows) {
        const text = row.innerText || row.textContent;
        if (!text) continue;
        const match = text.match(/(0\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\b5\d{9}\b)|(\+90[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/);
        if (match) {
            const formatted = formatPhoneNumber(match[0]);
            if (formatted.length >= 10) {
                return formatted;
            }
        }
    }
    return null;
}

async function detectPhoneNumber() {
    // 1. Pano (Clipboard) - Netsipp görüşmesi sırasında kopyalanan aktif numara
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const clipText = await navigator.clipboard.readText();
            if (clipText) {
                const match = clipText.match(/(0\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\b5\d{9}\b)|(\b\d{10,11}\b)|(\+90[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/);
                if (match) {
                    const formattedClip = formatPhoneNumber(match[0]);
                    if (formattedClip.length >= 10) {
                        saveLastNetsippNumber(formattedClip);
                        return { number: formattedClip, source: 'Pano' };
                    }
                }
            }
        }
    } catch (err) {
        // Clipboard read might be denied or empty, continue to next options
    }

    // 2. Önceki Kayıt / Geçmiş Yorumlardaki "Çağrı No"
    // Örnek: "eczanevpn kurulum isteniyor || Çağrı No: 0535-855-53-56"
    const historyCallPhone = findPhoneFromHistoryNotes();
    if (historyCallPhone) {
        return { number: historyCallPhone, source: 'Çağrı No' };
    }

    // 3. Sayfada az önce tıklanan Netsipp arama/kopyalama numarası
    let sessionPhone = window.lastNetsippPhone || '';
    if (!sessionPhone) {
        try {
            sessionPhone = sessionStorage.getItem('lastNetsippPhone') || '';
        } catch (e) {}
    }
    if (sessionPhone && sessionPhone.trim().length >= 10) {
        return { number: formatPhoneNumber(sessionPhone), source: 'Netsipp' };
    }

    // 4. Geçmiş notlardaki en güncel genel telefon numarası
    const generalHistoryPhone = findAnyPhoneFromLatestHistoryNote();
    if (generalHistoryPhone) {
        return { number: generalHistoryPhone, source: 'Geçmiş Not' };
    }

    // 5. Sayfadaki Müşteri Kartı Bilgileri (user-telephone, myInput, myInput2)
    const phoneInput = document.getElementById('myInput');
    if (phoneInput && phoneInput.value) {
        const formatted = formatPhoneNumber(phoneInput.value);
        if (formatted.length >= 10) return { number: formatted, source: 'Müşteri Kartı' };
    }

    const userPhoneElem = document.getElementById('user-telephone');
    if (userPhoneElem) {
        const text = userPhoneElem.innerText || userPhoneElem.textContent;
        const match = text.match(/(0\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\b5\d{9}\b)|(\b\d{10,11}\b)/);
        if (match) {
            const formatted = formatPhoneNumber(match[0]);
            if (formatted.length >= 10) return { number: formatted, source: 'Müşteri Kartı' };
        }
    }

    const workPhoneInput = document.getElementById('myInput2');
    if (workPhoneInput && workPhoneInput.value) {
        const formatted = formatPhoneNumber(workPhoneInput.value);
        if (formatted.length >= 10) return { number: formatted, source: 'İş Telefonu' };
    }

    const workPhoneElem = document.getElementById('work-telephone');
    if (workPhoneElem) {
        const text = workPhoneElem.innerText || workPhoneElem.textContent;
        const match = text.match(/(0\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\b\d{10,11}\b)/);
        if (match) {
            const formatted = formatPhoneNumber(match[0]);
            if (formatted.length >= 10) return { number: formatted, source: 'İş Telefonu' };
        }
    }

    // 6. Hiçbiri bulunamazsa varsayılan placeholder
    return { number: '05555555555', source: 'Varsayılan' };
}

function getLoggedInPersonnel() {
    // OpenCart left sidebar profile: <div id="profile"><h4>İsa Çılgın</h4>...
    const profileH4 = document.querySelector('#column-left #profile h4, #profile h4, .user-profile h4');
    if (profileH4 && profileH4.textContent.trim()) {
        return profileH4.textContent.trim().toLocaleUpperCase('tr-TR');
    }

    const navbarUser = document.querySelector('#header .dropdown-toggle .hidden-xs, .nav.pull-right li a span');
    if (navbarUser && navbarUser.textContent.trim()) {
        const name = navbarUser.textContent.trim();
        if (name && !name.toLowerCase().includes('çıkış') && !name.toLowerCase().includes('mağaza')) {
            return name.toLocaleUpperCase('tr-TR');
        }
    }

    return 'MERDA';
}

function getApprovalTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

async function insertEczaneVpnNote(targetArea, btnElem) {
    const time = getApprovalTime();
    const phoneInfo = await detectPhoneNumber();
    const phone = phoneInfo.number;
    const personnel = getLoggedInPersonnel();

    const note = `ONAY SUNMA SAATİ: ${time} GÖRÜŞÜLEN NUMARA:${phone} GÖRÜŞEN PERSONEL :${personnel}`;

    const prevValue = targetArea.value;
    if (prevValue.trim().length > 0) {
        targetArea.value = prevValue + '\n' + note;
    } else {
        targetArea.value = note;
    }

    targetArea.dispatchEvent(new Event('input', { bubbles: true }));
    targetArea.dispatchEvent(new Event('change', { bubbles: true }));
    targetArea.focus();

    if (btnElem) {
        btnElem.classList.add('btn-success-flash');
        const originalHtml = btnElem.innerHTML;
        btnElem.innerHTML = `<i class="fa fa-check"></i> Eklendi! (${phoneInfo.source})`;
        setTimeout(() => {
            btnElem.innerHTML = originalHtml;
            btnElem.classList.remove('btn-success-flash');
        }, 1500);
    }
}

function getPersonnelProperName() {
    const profileH4 = document.querySelector('#column-left #profile h4, #profile h4, .user-profile h4');
    if (profileH4 && profileH4.textContent.trim()) {
        return profileH4.textContent.trim();
    }

    const navbarUser = document.querySelector('#header .dropdown-toggle .hidden-xs, .nav.pull-right li a span');
    if (navbarUser && navbarUser.textContent.trim()) {
        const name = navbarUser.textContent.trim();
        if (name && !name.toLowerCase().includes('çıkış') && !name.toLowerCase().includes('mağaza')) {
            return name;
        }
    }

    return 'İsa Çılgın';
}

function getEczaneVpnScriptPlainText() {
    const personnel = getPersonnelProperName();
    return `Merhaba, ben Alternet Yazılım teknik ekibinden ${personnel}.
Kalite standartlarımız gereği bu görüşme kayıt altına alınmaktadır.
Satın aldığınız EczaneVpn ürününün kurulumu için arıyorum. Kuruluma başlamadan önce birkaç şartı hatırlatıp sözlü onayınızı almam gerekiyor:
1. Size tanımlanacak sabit IP adresinin yasal sahibi, kiralama süresi boyunca siz olacaksınız.
2. IP adresi tahsis edildikten sonra iade yapılamaz.
3. EczaneVpn yalnızca eczanenizde kullanılabilir, başkalarıyla ortak kullanılamaz.
Bu şartları kabul ediyor musunuz?`;
}

function renderVpnScriptCard(scriptBody) {
    if (!scriptBody) return;
    const personnel = getPersonnelProperName();
    scriptBody.innerHTML = `
        <p>Merhaba, ben Alternet Yazılım teknik ekibinden <strong>${personnel}</strong>.</p>
        <p>Kalite standartlarımız gereği bu görüşme kayıt altına alınmaktadır.</p>
        <p>Satın aldığınız EczaneVpn ürününün kurulumu için arıyorum. Kuruluma başlamadan önce birkaç şartı hatırlatıp sözlü onayınızı almam gerekiyor:</p>
        <ul class="vpn-script-list">
            <li><strong>1.</strong> Size tanımlanacak sabit IP adresinin yasal sahibi, kiralama süresi boyunca siz olacaksınız.</li>
            <li><strong>2.</strong> IP adresi tahsis edildikten sonra iade yapılamaz.</li>
            <li><strong>3.</strong> EczaneVpn yalnızca eczanenizde kullanılabilir, başkalarıyla ortak kullanılamaz.</li>
        </ul>
        <p class="vpn-script-question">👉 <strong>Bu şartları kabul ediyor musunuz?</strong></p>
    `;
}

// --- NETSIPP INTEGRATION (GLOBAL) ---
function scanAndInjectNetsippButtons() {
    // Target both History table and Setup List table
    const tables = document.querySelectorAll('#history_customer table tbody, #tableana table tbody');

    tables.forEach(tableBody => {
        // Expanded regex to catch:
        // 1. Standard mobile: 05xx...
        // 2. Local/Short: 212... or 532... (without leading 0)
        // 3. International: +90...
        const phoneRegex = /(0\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\d{3,4}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\+90[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/g;

        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');

            cells.forEach(cell => {
                // Skip if already injected
                if (cell.querySelector('.btn-netsipp')) return;

                const text = cell.innerText;
                let matches = text.match(phoneRegex);

                if (matches) {
                    matches.forEach(number => {
                        // Clean number
                        const cleanNumber = number.replace(/[\s\-\+]/g, '');

                        // Container for buttons
                        const btnContainer = document.createElement('span');
                        btnContainer.className = 'btn-netsipp-group';
                        btnContainer.style.whiteSpace = 'nowrap';
                        btnContainer.style.marginLeft = '5px';

                        // 1. Call Button
                        const btnCall = document.createElement('a');
                        btnCall.className = 'btn btn-success btn-xs btn-netsipp';
                        btnCall.style.marginRight = '2px';
                        btnCall.style.color = '#fff';
                        btnCall.title = 'Netsipp ile Ara';
                        btnCall.innerHTML = '<i class="fa fa-phone"></i>';
                        btnCall.href = `netsipp://${cleanNumber}`;
                        btnCall.onclick = () => {
                            saveLastNetsippNumber(cleanNumber);
                        };

                        // 2. Copy Button
                        const btnCopy = document.createElement('button');
                        btnCopy.className = 'btn btn-info btn-xs btn-netsipp-copy';
                        btnCopy.style.color = '#fff';
                        btnCopy.title = 'Kopyala';
                        btnCopy.innerHTML = '<i class="fa fa-copy"></i>';
                        btnCopy.onclick = (e) => {
                            e.preventDefault();
                            saveLastNetsippNumber(cleanNumber);
                            navigator.clipboard.writeText(cleanNumber);
                            btnCopy.innerHTML = '<i class="fa fa-check"></i>';
                            setTimeout(() => { btnCopy.innerHTML = '<i class="fa fa-copy"></i>'; }, 1000);
                        };

                        btnContainer.appendChild(btnCall);
                        btnContainer.appendChild(btnCopy);

                        // Inject using unique placeholder
                        const uniqueId = 'temp-netsipp-' + Math.random().toString(36).substr(2, 9);

                        if (cell.innerHTML.indexOf(number) !== -1 && cell.innerHTML.indexOf(uniqueId) === -1) {
                            const replacement = `${number} <span id="${uniqueId}"></span>`;
                            cell.innerHTML = cell.innerHTML.replace(number, replacement);

                            const placeholder = cell.querySelector(`#${uniqueId}`);
                            if (placeholder) {
                                placeholder.parentNode.replaceChild(btnContainer, placeholder);
                            }
                        }
                    });
                }
            });
        });
    });
}

// Global Observer to handle page loads and dynamic content
(function initNetsippObserver() {
    // Initial scan
    setTimeout(scanAndInjectNetsippButtons, 1500);

    const observer = new MutationObserver(() => {
        scanAndInjectNetsippButtons();
    });

    const targets = [
        document.getElementById('history_customer'),
        document.getElementById('tableana')
    ];

    let observed = false;
    targets.forEach(target => {
        if (target) {
            observer.observe(target, { childList: true, subtree: true });
            observed = true;
        }
    });

    // Fallback: If specific tables aren't found yet (dynamic page load), watch the body
    if (!observed) {
        const bodyObserver = new MutationObserver((mutations, obs) => {
            const hist = document.getElementById('history_customer');
            const setup = document.getElementById('tableana');
            if (hist || setup) {
                scanAndInjectNetsippButtons();
                if (hist) observer.observe(hist, { childList: true, subtree: true });
                if (setup) observer.observe(setup, { childList: true, subtree: true });
                obs.disconnect();
            }
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
})();
