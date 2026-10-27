// Always initialize extension components (Compatible with Chrome, Opera, Edge, Brave)
initSpeechExtension();

// Helper to detect note area in both OpenCart (#input-comment) and Mercury Portal (fluent-textarea)
function findTargetNoteArea() {
    const ocArea = document.getElementById('input-comment');
    if (ocArea) return { element: ocArea, type: 'opencart' };

    const mercurySelectors = [
        'fluent-textarea[placeholder*="açıklayıcı"]',
        'fluent-textarea[placeholder*="aciklayici"]',
        '#profil-panel fluent-textarea',
        'fluent-field fluent-textarea',
        'fluent-textarea'
    ];
    for (const sel of mercurySelectors) {
        const el = document.querySelector(sel);
        if (el) return { element: el, type: 'mercury' };
    }
    return null;
}

// Helper to safely read text from note area
function readTargetNoteText(targetInfo) {
    if (!targetInfo || !targetInfo.element) return '';
    const el = targetInfo.element;
    if (targetInfo.type === 'mercury') {
        const inner = el.shadowRoot ? el.shadowRoot.querySelector('textarea') : el.querySelector('textarea');
        return (el.value || (inner ? inner.value : '') || '');
    }
    return el.value || '';
}

// Helper to write text and trigger two-way binding for both OpenCart and Blazor Fluent UI
function writeToNoteArea(targetInfo, text, mode) {
    if (!targetInfo || !targetInfo.element) return;
    const el = targetInfo.element;

    if (targetInfo.type === 'opencart') {
        const cur = el.value || '';
        if (mode === 'append') {
            el.value = cur.trim().length > 0 ? cur + (cur.endsWith('\n') ? '' : '\n') + text : text;
        } else if (mode === 'append-inline') {
            const needsSpace = cur.length > 0 && !cur.endsWith(' ') && !cur.endsWith('\n');
            el.value += (needsSpace ? ' ' : '') + text;
        } else {
            el.value = text;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.focus();
    } else {
        // Mercury Portal (Fluent Web Component / Blazor)
        const inner = el.shadowRoot ? el.shadowRoot.querySelector('textarea') : (el.querySelector('textarea') || el);
        const cur = el.value || (inner ? inner.value : '') || '';
        let finalVal = text;

        if (mode === 'append') {
            finalVal = cur.trim().length > 0 ? cur + (cur.endsWith('\n') ? '' : '\n') + text : text;
        } else if (mode === 'append-inline') {
            const needsSpace = cur.length > 0 && !cur.endsWith(' ') && !cur.endsWith('\n');
            finalVal = cur + (needsSpace ? ' ' : '') + text;
        }

        el.value = finalVal;
        if (inner && inner !== el) {
            inner.value = finalVal;
        }

        const inputEvt = new Event('input', { bubbles: true, composed: true });
        const changeEvt = new Event('change', { bubbles: true, composed: true });
        el.dispatchEvent(inputEvt);
        el.dispatchEvent(changeEvt);
        if (inner && inner !== el) {
            inner.dispatchEvent(inputEvt);
            inner.dispatchEvent(changeEvt);
        }
        try { el.focus(); } catch (e) {}
    }
}

function initSpeechExtension() {
    // Locate the target textarea in OpenCart or Mercury Portal
    const targetInfo = findTargetNoteArea();
    if (!targetInfo) return;

    // Prevent duplicate panel injection
    if (document.getElementById('speech-control-panel')) return;

    const targetArea = targetInfo.element;

    // Create the control container
    const controlPanel = document.createElement('div');
    controlPanel.id = 'speech-control-panel';
    controlPanel.className = targetInfo.type === 'mercury' ? 'mercury-assistant-panel' : 'oc-assistant-panel';
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

    // Inject panel before the textarea's container
    if (targetInfo.type === 'mercury') {
        const fieldContainer = targetArea.closest('fluent-field') || targetArea;
        fieldContainer.parentNode.insertBefore(controlPanel, fieldContainer);
    } else {
        targetArea.parentNode.insertBefore(controlPanel, targetArea);
        targetArea.style.marginTop = '15px';
    }


    // Speech Recognition Setup (Opera / Chrome / Edge uyumlu)
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isSpeechSupported = false;

    if (SpeechRecognitionAPI) {
        try {
            recognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'tr-TR';
            isSpeechSupported = true;
        } catch (e) {
            console.warn("SpeechRecognition nesnesi oluşturulamadı:", e);
        }
    } else {
        console.warn("Web Speech API bu tarayıcıda (Opera) bulunmuyor. EczaneVPN, Sözlü Onay, Metin Okuma ve Duvar Kağıdı özellikleri aktiftir.");
    }

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

    if (!isSpeechSupported) {
        statusBadge.textContent = "Opera: Ses Kapalı";
        statusBadge.title = "Opera tarayıcısında mikrofonla sesli yazma desteklenmez (Google Chrome önerilir). Diğer tüm asistan özellikleri aktiftir.";
        btnRecord.title = "Opera'da mikrofonla sesli yazma desteklenmez (Chrome önerilir).";
    }

    // Update UI based on mode
    function updateModeUI() {
        if (!isSpeechSupported) return;
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
        if (!isSpeechSupported || !recognition) {
            alert("Bilgilendirme:\n\nOpera tarayıcısında mikrofonla sesli yazma (Google Web Speech API) motoru yer almamaktadır.\n\nMikrofona konuşarak yazdırmak için Google Chrome kullanabilirsiniz.\n\nEczaneVPN Onay Notu, Sözlü Onay Metni, Metin Okuma (Sesli Dinleme), Duvar Kağıdı ve Versiyon Değiştirme gibi diğer TÜM özellikler Opera'da tam olarak aktiftir ve sorunsuz çalışır.");
            return;
        }
        if (!isRecording) {
            try {
                recognition.start();
            } catch (e) {
                console.error("Recognition start error", e);
            }
        }
    }

    function stopRecording() {
        if (recognition && isRecording) {
            recognition.stop();
        }
    }

    // Button Logic
    btnRecord.addEventListener('mousedown', (e) => {
        if (!isSpeechSupported) return;
        if (mode === 'ptt') {
            e.preventDefault();
            startRecording();
        }
    });

    btnRecord.addEventListener('mouseup', (e) => {
        if (!isSpeechSupported) return;
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
        if (!isSpeechSupported || !recognition) {
            startRecording();
            return;
        }
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
        const textToRead = readTargetNoteText(targetInfo);
        if (textToRead.trim() !== "") {
            speakText(textToRead);
        }
    });

    // EczaneVPN Onay Notu Button
    if (btnVpn) {
        btnVpn.addEventListener('click', async (e) => {
            e.preventDefault();
            await insertEczaneVpnNote(targetInfo, btnVpn);
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
            writeToNoteArea(targetInfo, text, 'append');

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
    if (recognition) {
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
    }

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


    if (recognition) {
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
                    writeToNoteArea(targetInfo, event.results[i][0].transcript, 'append-inline');
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
    const containers = document.querySelectorAll('#history_customer, #tableana, table.history-comments, .history-comments');
    for (const container of containers) {
        const rows = container.querySelectorAll('tr, .fluent-data-grid-row');
        for (const row of rows) {
            const text = row.innerText || row.textContent;
            if (!text) continue;

            // Matches real-world formats from team notes including Mercury '|no:0533-590-15-89':
            const match = text.match(/(?:çağrı\s*no|cagri\s*no|çağrı\s*numarası|cagri\s*numarasi|\bnumara|\btel|\btelefon|\|no)\s*[:=\-]?\s*([+0-9\s\-]{9,20})/i);
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
    const rows = document.querySelectorAll('#history_customer tbody tr, #tableana tbody tr, table.history-comments tr, .history-comments tr');
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
    } catch (err) {}

    // 2. Önceki Kayıt / Geçmiş Yorumlardaki "Çağrı No" veya "|no:"
    const historyCallPhone = findPhoneFromHistoryNotes();
    if (historyCallPhone) {
        return { number: historyCallPhone, source: 'Geçmiş Kayıt' };
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

    // 4. Mercury Portal: WhatsApp linki (örn: https://wa.me/905335901589)
    const waLink = document.querySelector('fluent-anchor-button[href*="wa.me/"], a[href*="wa.me/"]');
    if (waLink) {
        const href = waLink.getAttribute('href') || waLink.href || '';
        const m = href.match(/wa\.me\/([0-9]+)/);
        if (m && m[1]) {
            const formatted = formatPhoneNumber(m[1]);
            if (formatted.length >= 10) return { number: formatted, source: 'WhatsApp' };
        }
    }

    // 5. Mercury Portal: GSM / Telefon kart alanı
    const spans = document.querySelectorAll('span, label');
    for (const span of spans) {
        const t = (span.textContent || '').trim();
        if (t === 'GSM' || t === 'Telefon') {
            const parent = span.parentElement;
            if (parent) {
                const text = parent.innerText || parent.textContent;
                const match = text.match(/(0\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\(?5\d{2}\)?\s?\d{3}\s?\d{4})/);
                if (match) {
                    const formatted = formatPhoneNumber(match[0]);
                    if (formatted.length >= 10) return { number: formatted, source: 'GSM Kartı' };
                }
            }
        }
    }

    // 6. Geçmiş notlardaki en güncel genel telefon numarası
    const generalHistoryPhone = findAnyPhoneFromLatestHistoryNote();
    if (generalHistoryPhone) {
        return { number: generalHistoryPhone, source: 'Geçmiş Not' };
    }

    // 7. Sayfadaki Müşteri Kartı Bilgileri (OpenCart & Mercury Inputs)
    const telInput = document.querySelector('fluent-text-input[type="tel"], input[type="tel"]');
    if (telInput && telInput.value) {
        const formatted = formatPhoneNumber(telInput.value);
        if (formatted.length >= 10) return { number: formatted, source: 'Müşteri Kartı' };
    }

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

    // 8. Varsayılan
    return { number: '05555555555', source: 'Varsayılan' };
}

function getLoggedInPersonnel() {
    // 1. Mercury Portal: Üst bar kullanıcı profil linki
    const mercuryUser = document.querySelector('fluent-link[href*="profil"], a[href*="/profil"]');
    if (mercuryUser && mercuryUser.textContent.trim()) {
        const name = mercuryUser.textContent.trim();
        if (name && !name.toLowerCase().includes('çıkış')) {
            return name.toLocaleUpperCase('tr-TR');
        }
    }

    // 2. OpenCart sol menü profili: <div id="profile"><h4>İsa Çılgın</h4>...
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

    return 'İSA';
}

function getApprovalTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

async function insertEczaneVpnNote(targetInfo, btnElem) {
    const time = getApprovalTime();
    const phoneInfo = await detectPhoneNumber();
    const phone = phoneInfo.number;
    const personnel = getLoggedInPersonnel();

    const note = `ONAY SUNMA SAATİ: ${time} GÖRÜŞÜLEN NUMARA:${phone} GÖRÜŞEN PERSONEL :${personnel}`;

    writeToNoteArea(targetInfo, note, 'append');

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
    // Mercury Portal
    const mercuryUser = document.querySelector('fluent-link[href*="profil"], a[href*="/profil"]');
    if (mercuryUser && mercuryUser.textContent.trim()) {
        const name = mercuryUser.textContent.trim();
        if (name && !name.toLowerCase().includes('çıkış')) {
            return name;
        }
    }

    // OpenCart
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

function getPersonnelFirstName() {
    const fullName = getPersonnelProperName();
    if (!fullName) return 'İsa';
    const parts = fullName.trim().split(/\s+/);
    // Son kelime soyisim kabul edilir, öncesi isim(ler)dir (örn: 'İsa Çılgın' -> 'İsa', 'Mehmet Ali Yılmaz' -> 'Mehmet Ali')
    let firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];

    // İsim tamamı büyük harfse (örn: İSA veya MEHMET ALİ) baş harfleri büyük, kalanı küçük yap
    if (firstName === firstName.toLocaleUpperCase('tr-TR')) {
        firstName = firstName.split(' ').map(w => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR')).join(' ');
    }
    return firstName;
}

function getEczaneVpnScriptPlainText() {
    const personnel = getPersonnelFirstName();
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
    const personnel = getPersonnelFirstName();
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

// --- MERCURY PORTAL NETSIPP & QUICK BUTTONS INTEGRATION ---
function upgradeMercuryNetsipp() {
    // 1. Destek listesindeki mevcut arama linklerini (tel:) netsipp:// protokolüne dönüştür
    const callLinks = document.querySelectorAll('a.td-comment-call, a[href^="tel:"]');
    callLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const title = link.getAttribute('title') || '';
        const raw = href.replace(/^tel:/, '') || title;
        const clean = formatPhoneNumber(raw);
        if (clean && clean.length >= 10) {
            link.href = `netsipp://${clean}`;
            link.setAttribute('title', `Netsipp ile Ara: ${clean}`);
            link.classList.add('mercury-netsipp-btn');
            link.onclick = (e) => {
                saveLastNetsippNumber(clean);
            };
        }
    });

    // 2. Sayfadaki TÜM telefon satırlarına ve WhatsApp butonlarının yanına [Netsipp Ara] butonu ekle
    const waAnchors = document.querySelectorAll('fluent-anchor-button[href*="wa.me/"], a[href*="wa.me/"], a.td-comment-wa');
    waAnchors.forEach(waAnchor => {
        const parent = waAnchor.parentNode;
        if (!parent || parent.querySelector('.mercury-card-netsipp-btn')) return;

        const href = waAnchor.getAttribute('href') || waAnchor.href || '';
        const match = href.match(/wa\.me\/([0-9]+)/);
        let clean = '';
        if (match && match[1]) {
            clean = formatPhoneNumber(match[1]);
        } else {
            // Sibling span veya çağrı linkinden numarayı al
            const siblingCall = parent.querySelector('a.td-comment-call, a[href*="netsipp://"], a[href^="tel:"]');
            if (siblingCall) {
                const callHref = siblingCall.getAttribute('href') || '';
                clean = formatPhoneNumber(callHref.replace(/^(netsipp:\/\/|tel:)/, ''));
            } else {
                const span = parent.querySelector('span');
                if (span) clean = formatPhoneNumber(span.textContent);
            }
        }

        if (clean && clean.length >= 10) {
            const netsippBtn = document.createElement('a');
            netsippBtn.className = 'mercury-card-netsipp-btn';
            netsippBtn.href = `netsipp://${clean}`;
            netsippBtn.title = `Netsipp ile Ara: ${clean}`;
            netsippBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.72 11.72 0 003.66.59 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.72 11.72 0 00.59 3.66 1 1 0 01-.24 1.02l-2.23 2.21z"/>
                </svg>
                <span>Netsipp Ara</span>
            `;
            netsippBtn.onclick = (e) => {
                e.stopPropagation();
                saveLastNetsippNumber(clean);
            };
            parent.insertBefore(netsippBtn, waAnchor.nextSibling);
        }
    });

    // 3. Tablodaki tüm telefon alanlarını (fluent-stack-horizontal) tara; buton eksikse tamamla
    const phoneContainers = document.querySelectorAll('.fluent-stack-horizontal');
    phoneContainers.forEach(container => {
        if (container.querySelector('.mercury-card-netsipp-btn')) return;
        const text = container.textContent || '';
        const clean = formatPhoneNumber(text);
        if (clean && clean.length >= 10) {
            const netsippBtn = document.createElement('a');
            netsippBtn.className = 'mercury-card-netsipp-btn';
            netsippBtn.href = `netsipp://${clean}`;
            netsippBtn.title = `Netsipp ile Ara: ${clean}`;
            netsippBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.72 11.72 0 003.66.59 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.72 11.72 0 00.59 3.66 1 1 0 01-.24 1.02l-2.23 2.21z"/>
                </svg>
                <span>Netsipp Ara</span>
            `;
            netsippBtn.onclick = (e) => {
                e.stopPropagation();
                saveLastNetsippNumber(clean);
            };
            container.appendChild(netsippBtn);
        }
    });

    // 3. Mercury History Table notes (table.history-comments):
    // Inject Netsipp call & copy chips into notes with phone numbers
    const histCells = document.querySelectorAll('table.history-comments td.multiline-text, .history-comments td.multiline-text');
    const phoneRegex = /(0\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|(\b5\d{9}\b)|(\+90[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/g;

    histCells.forEach(cell => {
        if (cell.querySelector('.mercury-hist-netsipp-group')) return;
        const text = cell.innerText || cell.textContent || '';
        const matches = text.match(phoneRegex);
        if (matches) {
            matches.forEach(number => {
                const clean = formatPhoneNumber(number);
                if (clean && clean.length >= 10) {
                    const group = document.createElement('span');
                    group.className = 'mercury-hist-netsipp-group';
                    group.innerHTML = `
                        <a href="netsipp://${clean}" class="mercury-hist-netsipp-btn" title="Netsipp ile Ara: ${clean}">
                            <i class="fa fa-phone"></i> Netsipp
                        </a>
                        <button type="button" class="mercury-hist-copy-btn" title="Kopyala">
                            <i class="fa fa-copy"></i>
                        </button>
                    `;
                    const callA = group.querySelector('.mercury-hist-netsipp-btn');
                    callA.onclick = () => saveLastNetsippNumber(clean);

                    const copyB = group.querySelector('.mercury-hist-copy-btn');
                    copyB.onclick = (e) => {
                        e.preventDefault();
                        saveLastNetsippNumber(clean);
                        navigator.clipboard.writeText(clean);
                        copyB.innerHTML = '<i class="fa fa-check"></i>';
                        setTimeout(() => { copyB.innerHTML = '<i class="fa fa-copy"></i>'; }, 1000);
                    };

                    cell.appendChild(group);
                }
            });
        }
    });
}

function injectMercuryQuickEczaneVpnBtn() {
    if (document.getElementById('mercury-btn-quick-vpn')) return;

    // Look for quick buttons bar under fluent-textarea
    const quickBar = document.querySelector('fluent-field + div[style*="flex-wrap"], fluent-textarea + div[style*="flex-wrap"], div[style*="gap:4px"]');
    if (!quickBar) return;

    const vpnBtn = document.createElement('button');
    vpnBtn.type = 'button';
    vpnBtn.id = 'mercury-btn-quick-vpn';
    vpnBtn.className = 'mercury-quick-chip mercury-chip-vpn';
    vpnBtn.setAttribute('title', 'EczaneVPN Onay Notunu Otomatik Ekle (Saat, Personel, Numara)');
    vpnBtn.innerHTML = '<span>🛡️ EczaneVPN Onay</span>';

    vpnBtn.onclick = async (e) => {
        e.preventDefault();
        const targetInfo = findTargetNoteArea();
        if (targetInfo) {
            await insertEczaneVpnNote(targetInfo, vpnBtn);
        }
    };

    quickBar.insertBefore(vpnBtn, quickBar.firstChild);
}

// --- RENGARENK VE YANIP SÖNEN SAAT ROZETLERİ (16:00, 16.00, 09:00, 09.00 vs.) ---
const COMMENT_TIME_REGEX = /(?<!\d[.:])\b([01]?[0-9]|2[0-3])[:.]([0-5][0-9])\b(?![.:]\d)/g;

function createClockIcon() {
    const span = document.createElement('span');
    span.className = 'oc-time-icon';
    span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px; margin-right:3px;"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 11H7v-2h4V6h2v7z"/></svg>`;
    return span;
}

function processTextNodesInCell(root) {
    if (!root) return;
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                // Saat rozeti, kurulum rozeti, buton, link veya yazar alanı içerisindeki metinleri atla
                if (parent.closest('.td-comment-time') || 
                    parent.closest('.td-comment-kurulum') ||
                    parent.closest('.td-comment-author') || 
                    parent.closest('button') || 
                    parent.closest('a') || 
                    parent.closest('fluent-button') ||
                    parent.closest('fluent-anchor-button')) {
                    return NodeFilter.FILTER_REJECT;
                }
                COMMENT_TIME_REGEX.lastIndex = 0;
                if (COMMENT_TIME_REGEX.test(node.textContent)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        }
    );

    const nodesToReplace = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
        nodesToReplace.push(currentNode);
    }

    nodesToReplace.forEach(textNode => {
        const text = textNode.textContent;
        COMMENT_TIME_REGEX.lastIndex = 0;
        let match;
        let lastIdx = 0;
        const fragments = [];

        while ((match = COMMENT_TIME_REGEX.exec(text)) !== null) {
            const timeStr = match[0];
            const startIdx = match.index;

            if (startIdx > lastIdx) {
                fragments.push(document.createTextNode(text.substring(lastIdx, startIdx)));
            }

            const badge = document.createElement('span');
            badge.className = 'td-comment-time td-blink';
            badge.setAttribute('data-auto-time', timeStr);
            badge.appendChild(createClockIcon());
            badge.appendChild(document.createTextNode(timeStr));
            fragments.push(badge);

            lastIdx = startIdx + timeStr.length;
        }

        if (fragments.length > 0) {
            if (lastIdx < text.length) {
                fragments.push(document.createTextNode(text.substring(lastIdx)));
            }
            const parent = textNode.parentNode;
            if (parent) {
                const frag = document.createDocumentFragment();
                fragments.forEach(f => frag.appendChild(f));
                parent.replaceChild(frag, textNode);
            }
        }
    });
}

function highlightAllCommentTimes() {
    // 1. Mercury Portal'ın kendi eklediği mevcut saat rozetlerine (.td-comment-time) saat ikonu ekle
    const existingTimes = document.querySelectorAll('.td-comment-time, .td-blink');
    existingTimes.forEach(el => {
        if (!el.querySelector('.oc-time-icon')) {
            el.insertBefore(createClockIcon(), el.firstChild);
        }
    });

    // 2. Yorum hücrelerindeki (16.00, 09.00, 14:45, 17.30 gibi) yakalanmamış tüm saatleri tespit edip rozete dönüştür
    const commentCells = document.querySelectorAll('.td-comment-cell, td.td-comment-fullrow, table.history-comments td.multiline-text, .history-comments td.multiline-text');
    commentCells.forEach(cell => {
        processTextNodesInCell(cell);
    });
}

// --- SADECE SON YORUM: ALANINDAKİ CANLI KIRMIZI TONLARINDA IŞILTILI KURULUM ROZETİ ---
const COMMENT_KURULUM_REGEX = /(?<![\p{L}\p{N}])kurulum(?:u)?(?![\p{L}\p{N}])/giu;

function createInstallIcon() {
    const span = document.createElement('span');
    span.className = 'oc-install-icon';
    span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px; margin-right:3px;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
    return span;
}

function processKurulumInCell(root) {
    if (!root) return;
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                // Saat rozeti, kurulum rozeti, buton, link veya yazar alanı içerisindeki metinleri atla
                if (parent.closest('.td-comment-time') || 
                    parent.closest('.td-comment-kurulum') ||
                    parent.closest('.td-comment-author') || 
                    parent.closest('button') || 
                    parent.closest('a') || 
                    parent.closest('fluent-button') ||
                    parent.closest('fluent-anchor-button')) {
                    return NodeFilter.FILTER_REJECT;
                }
                COMMENT_KURULUM_REGEX.lastIndex = 0;
                if (COMMENT_KURULUM_REGEX.test(node.textContent)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        }
    );

    const nodesToReplace = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
        nodesToReplace.push(currentNode);
    }

    nodesToReplace.forEach(textNode => {
        const text = textNode.textContent;
        COMMENT_KURULUM_REGEX.lastIndex = 0;
        let match;
        let lastIdx = 0;
        const fragments = [];

        while ((match = COMMENT_KURULUM_REGEX.exec(text)) !== null) {
            const matchedWord = match[0];
            const startIdx = match.index;

            if (startIdx > lastIdx) {
                fragments.push(document.createTextNode(text.substring(lastIdx, startIdx)));
            }

            const badge = document.createElement('span');
            badge.className = 'td-comment-kurulum td-blink-red';
            badge.setAttribute('data-auto-kurulum', 'true');
            badge.appendChild(createInstallIcon());
            badge.appendChild(document.createTextNode('KURULUM'));
            fragments.push(badge);

            lastIdx = startIdx + matchedWord.length;
        }

        if (fragments.length > 0) {
            if (lastIdx < text.length) {
                fragments.push(document.createTextNode(text.substring(lastIdx)));
            }
            const parent = textNode.parentNode;
            if (parent) {
                const frag = document.createDocumentFragment();
                fragments.forEach(f => frag.appendChild(f));
                parent.replaceChild(frag, textNode);
            }
        }
    });
}

function highlightAllCommentKurulum() {
    // SADECE "Son Yorum:" alanında ara (kartın altındaki yorum hücresi)
    const sonYorumCells = document.querySelectorAll('.td-comment-cell');
    if (sonYorumCells && sonYorumCells.length > 0) {
        sonYorumCells.forEach(cell => {
            processKurulumInCell(cell);
        });
    } else {
        // Fallback: .td-comment-cell bulunamazsa td.td-comment-fullrow içinde ara
        const fullrows = document.querySelectorAll('td.td-comment-fullrow, td[col-index="9"]');
        fullrows.forEach(cell => {
            processKurulumInCell(cell);
        });
    }
}

// ==============================================================
// MERCURY PORTAL HIZLI AŞAĞI / YUKARI KAYDIRMA BUTONU (FAB)
// ==============================================================
function injectMercuryScrollButton() {
    // Mercury portal veya destek listesi sayfasında mıyız kontrol et
    const isMercury = document.querySelector('.fluent-layout-item[area="content"], .fluent-data-grid, table.fluent-data-grid, .fluent-data-grid-row, .fluent-layout');
    if (!isMercury) return;

    let btn = document.getElementById('oc-mercury-scroll-btn');
    if (btn) {
        updateScrollButtonState();
        return;
    }

    btn = document.createElement('button');
    btn.id = 'oc-mercury-scroll-btn';
    btn.type = 'button';
    btn.className = 'oc-mercury-scroll-btn';
    btn.setAttribute('title', 'En Alta İn (Aşağı Kaydır)');
    btn.setAttribute('aria-label', 'En Alta İn');

    btn.innerHTML = `
        <span class="oc-scroll-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="4" x2="12" y2="20"></line>
                <polyline points="19 13 12 20 5 13"></polyline>
            </svg>
        </span>
    `;

    document.body.appendChild(btn);

    // Tıklama ile En Alta veya En Başa pürüzsüz kaydırma
    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let initialRight = 28, initialBottom = 28;

    btn.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
        const rect = btn.getBoundingClientRect();
        initialRight = window.innerWidth - rect.right;
        initialBottom = window.innerHeight - rect.bottom;
        hasMoved = false;

        function onMouseMove(moveEvent) {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            if (!hasMoved && Math.hypot(dx, dy) > 4) {
                hasMoved = true;
                isDragging = true;
                btn.classList.add('is-dragging');
            }
            if (hasMoved) {
                const newRight = Math.max(10, Math.min(window.innerWidth - 60, initialRight - dx));
                const newBottom = Math.max(10, Math.min(window.innerHeight - 60, initialBottom - dy));
                btn.style.right = `${newRight}px`;
                btn.style.bottom = `${newBottom}px`;
            }
        }

        function onMouseUp() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            btn.classList.remove('is-dragging');
            setTimeout(() => {
                isDragging = false;
                hasMoved = false;
            }, 60);
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    btn.addEventListener('click', (e) => {
        if (isDragging || hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const content = document.querySelector('.fluent-layout-item[area="content"]');
        const isAtBottom = btn.classList.contains('is-at-bottom');

        if (isAtBottom) {
            // Yukarı kaydır
            if (content) {
                content.scrollTo({ top: 0, behavior: 'smooth' });
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Aşağı kaydır
            if (content) {
                content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
            }
            window.scrollTo({ 
                top: document.documentElement.scrollHeight || document.body.scrollHeight, 
                behavior: 'smooth' 
            });
        }
    });

    // Scroll dinleyicilerini bağla
    window.addEventListener('scroll', updateScrollButtonState, { passive: true });
    const content = document.querySelector('.fluent-layout-item[area="content"]');
    if (content) {
        content.addEventListener('scroll', updateScrollButtonState, { passive: true });
    }

    updateScrollButtonState();
}

function updateScrollButtonState() {
    const btn = document.getElementById('oc-mercury-scroll-btn');
    if (!btn) return;

    const content = document.querySelector('.fluent-layout-item[area="content"]');
    let current = 0;
    let max = 0;

    if (content && content.scrollHeight > content.clientHeight + 40) {
        current = content.scrollTop;
        max = content.scrollHeight - content.clientHeight;
    } else {
        current = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        max = (document.documentElement.scrollHeight || document.body.scrollHeight || 0) - window.innerHeight;
    }

    // Eğer sayfada kaydırma gerekmiyorsa gizle
    if (max <= 50) {
        btn.classList.add('oc-scroll-hidden');
        return;
    } else {
        btn.classList.remove('oc-scroll-hidden');
    }

    // Dibe yaklaşıldıysa (son 160px) yukarı oka çevir, aksi halde aşağı ok
    if (current >= max - 160) {
        btn.classList.add('is-at-bottom');
        btn.setAttribute('title', 'En Başa Dön (Yukarı Kaydır)');
        btn.setAttribute('aria-label', 'En Başa Dön');
    } else {
        btn.classList.remove('is-at-bottom');
        btn.setAttribute('title', 'En Alta İn (Aşağı Kaydır)');
        btn.setAttribute('aria-label', 'En Alta İn');
    }
}

// Master refresh for both OpenCart and Mercury dynamic SPA pages
function refreshAllExtensions() {
    initSpeechExtension();
    injectMercuryQuickEczaneVpnBtn();
    upgradeMercuryNetsipp();
    highlightAllCommentTimes();
    highlightAllCommentKurulum();
    scanAndInjectNetsippButtons();
    overrideVersionDropdown();
    injectMercuryScrollButton();
}

// Debounced global observer
(function initGlobalAppObserver() {
    setTimeout(refreshAllExtensions, 800);
    setTimeout(refreshAllExtensions, 2000);

    let debounceTimer = null;
    const globalObserver = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            refreshAllExtensions();
        }, 350);
    });

    if (document.body) {
        globalObserver.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            globalObserver.observe(document.body, { childList: true, subtree: true });
        });
    }

    window.addEventListener('popstate', () => setTimeout(refreshAllExtensions, 300));
    window.addEventListener('hashchange', () => setTimeout(refreshAllExtensions, 300));
})();

// ==============================================================
// KULLANICI VERSİYON DEĞİŞTİRME DROPDOWN & ESKİ VERSİYONLAR MODAL SİSTEMİ
// ==============================================================
const ALL_KNOWN_VERSIONS = [
    // Öne Çıkanlar (Featured - Fix)
    { id: '90.0.0.0', short: '90', name: '90', category: 'featured', tag: 'Öne Çıkan' },
    { id: '93.0.0.0', short: '93', name: '93 (New)', category: 'featured', tag: 'Öne Çıkan', isNew: true },
    { id: '99.0.0.0', short: '99', name: '99', category: 'featured', tag: 'Öne Çıkan' },
    { id: '100.0.0.0', short: '100', name: '100', category: 'featured', tag: 'Öne Çıkan' },
    { id: '101.0.0.0', short: '101', name: '101', category: 'featured', tag: 'Öne Çıkan' },

    // 90 & 70 Serisi
    { id: '97.0.0.0', short: '97.3', name: '97.3', category: 'series90', tag: '90 Serisi' },
    { id: '96.0.0.0', short: '96', name: '96', category: 'series90', tag: '90 Serisi' },
    { id: '95.0.0.0', short: '95', name: '95', category: 'series90', tag: '90 Serisi' },
    { id: '76.0.0.0', short: '76', name: '76', category: 'series90', tag: '70 Serisi' },
    { id: '68.0.0.0', short: '68', name: '68. Versiyon', category: 'series90', tag: '60 Serisi' },

    // Medoxy Serisi
    { id: '7.36.0.0', name: 'Medoxy 36.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.35.0.0', name: 'Medoxy 35.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.34.0.0', name: 'Medoxy 34.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.32.0.0', name: 'Medoxy 32.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.30.0.0', name: 'Medoxy 30.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.29.0.0', name: 'Medoxy 29.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.27.0.0', name: 'Medoxy 27.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.25.0.0', name: 'Medoxy 25.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.24.0.0', name: 'Medoxy 24.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.23.0.0', name: 'Medoxy 23.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '7.22.0.0', name: 'Medoxy 22.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71017', name: 'Medoxy 17.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71016', name: 'Medoxy 16.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71014', name: 'Medoxy 14.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71013', name: 'Medoxy 13.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71012', name: 'Medoxy 12.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71011', name: 'Medoxy 11.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71010', name: 'Medoxy 10.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71009', name: 'Medoxy 9.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71008', name: 'Medoxy 8.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71007', name: 'Medoxy 7.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71006', name: 'Medoxy 6.0', category: 'medoxy', tag: 'Medoxy' },
    { id: '71005-2', name: 'Medoxy 5.0 (Server2)', category: 'medoxy', tag: 'Medoxy' },
    { id: '71005', name: 'Medoxy 5.0 (Server1)', category: 'medoxy', tag: 'Medoxy' },
    { id: '71004-2', name: 'Medoxy 4.0 (Server2)', category: 'medoxy', tag: 'Medoxy' },
    { id: '71004', name: 'Medoxy 4.0 (Server1)', category: 'medoxy', tag: 'Medoxy' },
    { id: '71001', name: 'Medoxy 1.0', category: 'medoxy', tag: 'Medoxy' },

    // Savar & Eczanem Serisi
    { id: '7.37.4.0', name: 'Savar 37 V4', category: 'savar', tag: 'Savar' },
    { id: '7.37.3.0', name: 'Savar 37 V3', category: 'savar', tag: 'Savar' },
    { id: '39.0.1.0', name: 'Eczanem 39', category: 'savar', tag: 'Eczanem' },
    { id: '39.0.0.0', name: 'Normal 39', category: 'savar', tag: 'Klasik' },
    { id: '40.0.0.0', name: 'Normal 40', category: 'savar', tag: 'Klasik' },

    // Proxy Serisi
    { id: '49.0.0.0', name: 'Proxy 49', category: 'proxy', tag: 'Proxy' },
    { id: '48.0.0.0', name: 'Proxy 48 (NET4.5)', category: 'proxy', tag: 'Proxy' },
    { id: '44.0.0.0', name: 'Proxy 44 (NET4.5)', category: 'proxy', tag: 'Proxy' },
    { id: '43.0.0.0', name: 'Proxy 43', category: 'proxy', tag: 'Proxy' },
    { id: '42.0.0.0', name: 'Proxy 42', category: 'proxy', tag: 'Proxy' },
    { id: '41.0.0.0', name: 'Proxy 41', category: 'proxy', tag: 'Proxy' },

    // Arşiv & Özel
    { id: '7900', name: '7900 (Latest)', category: 'archive', tag: 'Klasik' },
    { id: '7800', name: '7800', category: 'archive', tag: 'Klasik' },
    { id: '7700', name: '7700', category: 'archive', tag: 'Klasik' },
    { id: '6400', name: '6400 (API)', category: 'archive', tag: 'Özel' },
    { id: '3022', name: '3022 - Stable', category: 'archive', tag: 'Stabil' },
    { id: '2620', name: '2620', category: 'archive', tag: 'Klasik' },
    { id: '2150', name: 'Taş Devri (2150)', category: 'archive', tag: 'Nostalji' }
];

function overrideVersionDropdown() {
    // Sayfadaki 'versiyondegistir' linklerini bul
    const links = document.querySelectorAll('a[href*="versiyondegistir"]');
    if (!links || links.length === 0) return;

    let targetMenu = null;
    let sampleHref = '';

    for (const link of links) {
        const href = link.getAttribute('href') || link.href;
        if (href && href.includes('/versiyondegistir/')) {
            const menu = link.closest('.dropdown-menu');
            if (menu) {
                targetMenu = menu;
                sampleHref = href;
                break;
            }
        }
    }

    if (!targetMenu) return;
    if (targetMenu.getAttribute('data-oc-version-override') === 'true') return;

    // Sayfadaki orijinal versiyon linklerini tara ve bilinmeyenleri dinamik ekle
    const originalLinks = targetMenu.querySelectorAll('a[href*="versiyondegistir"]');
    originalLinks.forEach(link => {
        const href = link.getAttribute('href') || link.href;
        if (!href) return;
        const parts = href.split('/');
        const param = parts[parts.length - 1];
        let label = (link.textContent || '').trim();
        // Gereksiz veya uyarı kelimelerini temizle
        label = label.replace(/\(\s*kullanma\s*\)/gi, '')
                     .replace(/\bkullanma\b/gi, '')
                     .replace(/\(\s*bunu kullanmayın\s*\)/gi, '')
                     .trim();
        if (!label) label = param;

        const exists = ALL_KNOWN_VERSIONS.some(v => v.id === param);
        if (!exists && param) {
            ALL_KNOWN_VERSIONS.push({
                id: param,
                name: label,
                category: 'archive',
                tag: 'Arşiv'
            });
        }
    });

    // Örnek URL: http://ilactarif.com.tr/versiyondegistir/kullanici@mail.com/TOKEN/ORDERID/ADMIN/99.0.0.0
    // Sondaki sürüm numarasını atarak temel URL'i çıkarıyoruz
    const parts = sampleHref.split('/');
    if (parts.length < 2) return;
    parts.pop(); // Son versiyon parametresini çıkar
    const baseUrl = parts.join('/');

    // Sayfada mevcut versiyon bilgisi varsa tespit et (#versiyonbilgi)
    let currentVer = '';
    const verBadge = document.getElementById('versiyonbilgi');
    if (verBadge) {
        const m = verBadge.textContent.match(/(\d+(\.\d+)*)/);
        if (m) currentVer = m[1];
    }

    // Dropdown için Fix / Öne Çıkan 5 Versiyon
    const featuredVersions = ALL_KNOWN_VERSIONS.filter(v => v.category === 'featured');

    let dropdownHtml = `
        <li class="oc-ver-dropdown-header">
            <span><i class="fa fa-star"></i> Öne Çıkan Sürümler</span>
            <span class="oc-ver-count">${featuredVersions.length} Sürüm</span>
        </li>
    `;

    featuredVersions.forEach(item => {
        const isCurrent = currentVer && (currentVer === item.id || currentVer.startsWith(item.short + '.'));
        const activeBadge = isCurrent 
            ? '<span class="oc-ver-tag-current"><i class="fa fa-check"></i> Aktif</span>' 
            : '';
        const newBadge = item.isNew 
            ? '<span class="oc-ver-tag-new">New</span>' 
            : '';

        dropdownHtml += `
            <li>
                <a href="${baseUrl}/${item.id}" class="oc-ver-item">
                    <span class="oc-ver-num-wrap">
                        <span class="oc-ver-icon">${item.short}</span>
                        <span>${item.name}</span>
                    </span>
                    <span>${newBadge} ${activeBadge}</span>
                </a>
            </li>
        `;
    });

    dropdownHtml += `
        <li class="divider" style="margin: 8px 0;"></li>
        <li class="oc-ver-dropdown-footer">
            <button type="button" class="oc-btn-show-old-versions" id="oc-btn-open-old-versions">
                <i class="fa fa-history"></i> Eski Versiyonları Görüntüle...
            </button>
        </li>
    `;

    targetMenu.innerHTML = dropdownHtml;
    targetMenu.classList.add('oc-version-override-menu');
    targetMenu.setAttribute('data-oc-version-override', 'true');

    // Eski Versiyonları Görüntüle Butonuna Tıklama Olayı
    const btnOld = targetMenu.querySelector('#oc-btn-open-old-versions');
    if (btnOld) {
        btnOld.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Bootstrap dropdown'ını kapat
            const dropdownToggle = targetMenu.closest('.dropdown')?.querySelector('.dropdown-toggle');
            if (dropdownToggle && window.$) {
                try {
                    $(dropdownToggle).dropdown('toggle');
                } catch (err) {}
            }

            openOldVersionsModal(baseUrl, currentVer);
        });
    }
}

// ==============================================================
// ESKİ VERSİYONLARI GÖRÜNTÜLE & UYGULA MODAL PENCERESİ
// ==============================================================
function openOldVersionsModal(baseUrl, currentVer) {
    const existing = document.getElementById('oc-old-versions-backdrop');
    if (existing) {
        existing.remove();
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'oc-old-versions-backdrop';
    backdrop.className = 'oc-old-ver-backdrop';

    const categories = [
        { id: 'all', name: `Tümü (${ALL_KNOWN_VERSIONS.length})` },
        { id: 'featured', name: 'Öne Çıkanlar' },
        { id: 'series90', name: '90 & 70 Serisi' },
        { id: 'medoxy', name: 'Medoxy' },
        { id: 'savar', name: 'Savar & Eczanem' },
        { id: 'proxy', name: 'Proxy Serisi' },
        { id: 'archive', name: 'Klasik & Arşiv' }
    ];

    backdrop.innerHTML = `
        <div class="oc-old-ver-modal">
            <div class="oc-old-ver-header">
                <div class="oc-old-ver-header-left">
                    <div class="oc-old-ver-icon-badge">
                        <i class="fa fa-history"></i>
                    </div>
                    <div>
                        <h3 class="oc-old-ver-title">Versiyon Yöneticisi & Tüm Sürümler</h3>
                        <p class="oc-old-ver-subtitle">Öne çıkan veya geçmiş arşiv sürümlerinden birini seçerek müşteriye uygulayabilirsiniz.</p>
                    </div>
                </div>
                <button type="button" class="oc-old-ver-close-btn" id="oc-old-ver-close" title="Kapat">&times;</button>
            </div>

            <div class="oc-old-ver-toolbar">
                <div class="oc-old-ver-search-box">
                    <i class="fa fa-search"></i>
                    <input type="text" id="oc-old-ver-search-input" class="oc-old-ver-search-input" placeholder="Sürüm no veya isim ara (örn: 95, 76, Medoxy, Proxy, Savar, Taş Devri)...">
                </div>
                <div class="oc-old-ver-categories" id="oc-old-ver-cats">
                    ${categories.map((c, i) => `
                        <button type="button" class="oc-old-ver-cat-btn ${i === 0 ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>
                    `).join('')}
                </div>
            </div>

            <div class="oc-old-ver-body">
                <div class="oc-old-ver-grid" id="oc-old-ver-grid"></div>
            </div>

            <div class="oc-old-ver-footer">
                <div class="oc-old-ver-footer-info">
                    Mevcut Aktif Sürüm: <strong>${currentVer || 'Belirtilmedi'}</strong> &bull; Toplam <strong>${ALL_KNOWN_VERSIONS.length}</strong> sürüm listelendi.
                </div>
                <button type="button" class="oc-old-ver-footer-close" id="oc-old-ver-footer-close">Pencereyi Kapat</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);

    let activeCat = 'all';
    let searchQuery = '';

    const grid = backdrop.querySelector('#oc-old-ver-grid');
    const searchInput = backdrop.querySelector('#oc-old-ver-search-input');
    const catButtons = backdrop.querySelectorAll('.oc-old-ver-cat-btn');

    function renderCards() {
        const filtered = ALL_KNOWN_VERSIONS.filter(item => {
            const matchesCat = (activeCat === 'all') || (item.category === activeCat);
            const textToSearch = `${item.name} ${item.id} ${item.tag}`.toLowerCase();
            const matchesSearch = !searchQuery || textToSearch.includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="oc-old-ver-empty">
                    <i class="fa fa-search"></i>
                    <div>Aradığınız kriterlere uygun sürüm bulunamadı.</div>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(item => {
            const isCurrent = currentVer && (currentVer === item.id || currentVer.startsWith(item.id.replace('.0.0.0', '')));
            return `
                <div class="oc-old-ver-card ${isCurrent ? 'is-current' : ''}">
                    <div class="oc-old-ver-card-info">
                        <div class="oc-old-ver-card-name">${item.name}</div>
                        <div class="oc-old-ver-card-param">${item.id}</div>
                        <span class="oc-old-ver-card-tag">${isCurrent ? '✓ Mevcut Sürüm' : item.tag}</span>
                    </div>
                    <div>
                        <button type="button" class="oc-old-ver-apply-btn" data-url="${baseUrl}/${item.id}">
                            <i class="fa fa-check-circle"></i> Uygula
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Uygula Butonları
        grid.querySelectorAll('.oc-old-ver-apply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-url');
                if (url) {
                    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Geçiliyor...';
                    btn.style.opacity = '0.8';
                    window.location.href = url;
                }
            });
        });
    }

    renderCards();

    // Arama Girişi
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderCards();
    });

    // Kategori Seçimleri
    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCat = btn.getAttribute('data-cat');
            renderCards();
        });
    });

    // Kapatma İşlemleri
    function closeModal() {
        backdrop.style.opacity = '0';
        backdrop.style.transition = 'opacity 0.15s ease';
        setTimeout(() => backdrop.remove(), 150);
    }

    backdrop.querySelector('#oc-old-ver-close').addEventListener('click', closeModal);
    backdrop.querySelector('#oc-old-ver-footer-close').addEventListener('click', closeModal);

    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && document.getElementById('oc-old-versions-backdrop')) {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });

    // Otomatik Arama Kutusuna Odaklan
    setTimeout(() => {
        searchInput.focus();
    }, 100);
}

// Global Observer to handle page loads and dynamic content for version dropdown
(function initVersionDropdownObserver() {
    overrideVersionDropdown();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', overrideVersionDropdown);
    }

    const observer = new MutationObserver(() => {
        overrideVersionDropdown();
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();

// ==============================================================

// ==============================================================
// ==============================================================
// TEMIZLIK: ESKI DUVAR KAGIDI VE KARANLIK MOD ARTIKLARINI KALDIR
// ==============================================================
(function cleanupLegacyWallpaper() {
    try {
        const floatBtn = document.getElementById('btn-oc-wallpaper-trigger');
        if (floatBtn) floatBtn.remove();
        const modalBackdrop = document.getElementById('oc-wallpaper-modal-backdrop');
        if (modalBackdrop) modalBackdrop.remove();
        const modal = document.getElementById('oc-wallpaper-modal');
        if (modal) modal.remove();

        if (document.body) {
            document.body.classList.remove('oc-wallpaper-active', 'oc-has-wallpaper', 'oc-dark-mode');
            document.body.style.backgroundImage = '';
        }
    } catch (e) {}
})();