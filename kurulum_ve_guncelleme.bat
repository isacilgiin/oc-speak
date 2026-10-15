@echo off
chcp 65001 >nul
title Opencart Sesli Not Asistanı - Kurulum & Güncelleme
color 0b

echo ==============================================================
echo    Opencart Sesli Not Asistanı - Kurulum ^& Güncelleme
echo ==============================================================
echo.

:: 1. Yönetici Yetkisi Kontrolü
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [BILGI] Yönetici yetkisi isteniyor...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Hedef Klasör
set "TARGET_DIR=C:\speak"
if not exist "%TARGET_DIR%" (
    echo [+] %TARGET_DIR% klasörü oluşturuluyor...
    mkdir "%TARGET_DIR%"
)

:: 2. Güncelleyiciyi Çalıştır
echo [+] GitHub üzerinden en güncel dosyalar kontrol ediliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
    "$bootstrap = 'https://raw.githubusercontent.com/isacilgiin/oc-speak/main/updater.ps1'; " ^
    "try { Invoke-RestMethod -Uri $bootstrap -OutFile '%TARGET_DIR%\updater.ps1' } catch {}; " ^
    "if (Test-Path '%TARGET_DIR%\updater.ps1') { & '%TARGET_DIR%\updater.ps1' }"

:: 3. Netsipp Protokol Kaydı
if exist "%TARGET_DIR%\netsipp_protocol_register.reg" (
    echo [+] Netsipp telefon arama protokolü kaydediliyor...
    reg import "%TARGET_DIR%\netsipp_protocol_register.reg" >nul 2>&1
)

:: 4. Windows Görev Zamanlayıcısına Otomatik Güncelleme Ekleme (Her 1 saatte bir sessizce çalışır)
echo [+] Arka plan otomatik güncelleme zamanlayıcısı kuruluyor...
schtasks /create /tn "SpeakExtensionAutoUpdater" /tr "wscript.exe \"%TARGET_DIR%\silent_updater.vbs\"" /sc HOURLY /mo 1 /f >nul 2>&1

:: Bilgisayar açılışına da ekle
schtasks /create /tn "SpeakExtensionAutoUpdaterOnLogon" /tr "wscript.exe \"%TARGET_DIR%\silent_updater.vbs\"" /sc ONLOGON /f >nul 2>&1

echo.
echo ==============================================================
echo   [TEBRIKLER] Kurulum ve Güncelleme Başarıyla Tamamlandı!
echo ==============================================================
echo.
echo  1. Dosyalar C:\speak klasörüne yerleştirildi.
echo  2. Netsipp hızlı arama protokolü sisteme tanıtıldı.
echo  3. Arka plan otomatik güncelleme servisi devreye alındı.
echo     (GitHub'a yeni sürüm yüklendiğinde kendi kendine güncellenir)
echo.
echo  Chrome açılıyor... 
echo  Açılan sayfada 'Geliştirici Modu'nu açıp 'Paketlenmemiş öğe yükle' 
echo  diyerek C:\speak klasörünü seçmeniz yeterlidir.
echo.
echo ==============================================================
echo.

:: Chrome Extensions Sayfasını Aç
start "" "chrome.exe" "chrome://extensions"

pause
