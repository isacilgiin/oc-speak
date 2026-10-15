# Opencart Sesli Not & EczaneVPN Asistanı (Chrome Extension)

OpenCart yönetim paneli için geliştirilmiş; **sesli müşteri notu girişi (STT)**, **notları sesli okuma (TTS)**, **NetGSM Netsipp softphone arama entegrasyonu**, **EczaneVPN onay notu oluşturucu** ve **müşteri sözlü onay teleprompteri** içeren hibrit bir Chrome Eklentisidir.

---

## 🚀 Özellikler

1. **🎙️ Sesli Not Asistanı (Speech-to-Text & Text-to-Speech):**
   - Açıklama alanında (`#input-comment`) sürekli dinleme veya bas-konuş (Push-to-Talk) modunda konuşulanları metne çevirir.
   - Yazılan notları Türkçe ses motoruyla sesli okur.

2. **📞 Netsipp Click-to-Call & Hızlı Kopyalama:**
   - Sayfadaki telefon numaralarını otomatik algılar; yanlarına tek tıkla arama (`netsipp://`) ve panoya kopyalama butonları ekler.

3. **🛡️ EczaneVPN Onay Notu:**
   - Tek tıkla onay saatini, o an görüşülen telefon numarasını (panodan, çağrı no'dan veya müşteri kartından akıllıca çekerek) ve oturum açan personelin adını forma doldurur:
     ```text
     ONAY SUNMA SAATİ: 14:30 GÖRÜŞÜLEN NUMARA:05308469026 GÖRÜŞEN PERSONEL :İSA ÇILGIN
     ```

4. **📢 Müşteri Sözlü Onay Teleprompteri:**
   - Müşteriyle telefonda konuşurken ekranda kalıcı durabilen yasal onay metni kartı.
   - Personel adını dinamik olarak yerleştirir ve tek tıkla nota yazdırma / kopyalama imkanı sunar.

5. **🔄 Otomatik Güncelleme (Auto-Updater):**
   - GitHub'a yeni sürüm yüklendiğinde Windows arka plan servisi dosyaları günceller, eklenti kendini otomatik yeniden başlatır.

---

## 🛠️ Hızlı Kurulum

1. Repoyu indirin veya [kurulum_ve_guncelleme.bat](kurulum_ve_guncelleme.bat) dosyasını çalıştırın.
2. Google Chrome'da `chrome://extensions` sayfasına gidin.
3. Sağ üstteki **"Geliştirici Modu"**nu açın.
4. **"Paketlenmemiş öğe yükle"** butonuna basarak `C:\speak` klasörünü seçin.
