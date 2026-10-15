@echo off
setlocal EnableDelayedExpansion
title Opencart Sesli Not Asistani - Kurulum ve Guncelleme
color 0b

echo ==============================================================
echo    Opencart Sesli Not Asistani - Kurulum ve Guncelleme
echo ==============================================================
echo.

:: 1. Yonetici Yetkisi Kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [BILGI] Yonetici yetkisi isteniyor...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: 2. Hedef Klasor
set "TARGET_DIR=C:\speak"
if not exist "%TARGET_DIR%" (
    echo [+] %TARGET_DIR% klasoru olusturuluyor...
    mkdir "%TARGET_DIR%"
)

:: 3. Guncelleyiciyi Calistir
echo [+] GitHub uzerinden en guncel dosyalar kontrol ediliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $u = 'https://raw.githubusercontent.com/isacilgiin/oc-speak/main/updater.ps1'; try { (New-Object Net.WebClient).DownloadFile($u, 'C:\speak\updater.ps1') } catch {}; if (Test-Path 'C:\speak\updater.ps1') { & 'C:\speak\updater.ps1' }"

:: 4. Netsipp Protokol Kaydi
if exist "%TARGET_DIR%\netsipp_protocol_register.reg" (
    echo [+] Netsipp telefon arama protokolu kaydediliyor...
    reg import "%TARGET_DIR%\netsipp_protocol_register.reg" >nul 2>&1
)

:: 5. Windows Gorev Zamanlayicisina Otomatik Guncelleme Ekleme
echo [+] Arka plan otomatik guncelleme servisi kuruluyor...
schtasks /create /tn "SpeakExtensionAutoUpdater" /tr "wscript.exe \"%TARGET_DIR%\silent_updater.vbs\"" /sc HOURLY /mo 1 /f >nul 2>&1
schtasks /create /tn "SpeakExtensionAutoUpdaterOnLogon" /tr "wscript.exe \"%TARGET_DIR%\silent_updater.vbs\"" /sc ONLOGON /f >nul 2>&1

echo.
echo ==============================================================
echo   [TEBRIKLER] Kurulum ve Guncelleme Basariyla Tamamlandi!
echo ==============================================================
:: chrome://extensions adresini otomatik panoya kopyala
echo | set /p="chrome://extensions" | clip

echo.
echo  1. Dosyalar C:\speak klasorune yerlestirildi / guncellendi.
echo  2. Netsipp hizli arama protokolu sisteme tanitildi.
echo  3. Arka plan otomatik guncelleme servisi devreye alindi.
echo.
echo  [BILGI] Google Chrome guvenlik kurallari geregi disaridan
echo  chrome:// linklerini otomatik acmaya izin vermez.
echo  Bu yuzden 'chrome://extensions' adresi panonuza KOPYALANDI!
echo.
echo  Chrome'da acilan rehber sayfasindaki adimlari takip edebilir
echo  veya yeni sekme acip Ctrl+V ile adrese gidebilirsiniz.
echo.
echo ==============================================================
echo.

:: Rehber Sayfasini ve C:\speak Klasorunu Ac
start "" "chrome.exe" "%TARGET_DIR%\kurulum_tamamlandi.html"
start "" explorer.exe "%TARGET_DIR%"

pause
