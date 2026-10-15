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
echo.
echo  1. Dosyalar C:\speak klasorune yerlestirildi / guncellendi.
echo  2. Netsipp hizli arama protokolu sisteme tanitildi.
echo  3. Arka plan otomatik guncelleme servisi devreye alindi.
echo     (GitHub'a yeni surum yuklendiginde kendi kendine guncellenir)
echo.
echo  Chrome aciliyor... 
echo  Acilan sayfada Gelistirici Modu'nu acip Paketlenmemis oge yukle 
echo  diyerek C:\speak klasorunu secmeniz yeterlidir.
echo.
echo ==============================================================
echo.

:: Chrome Extensions Sayfasini Ac
start "" "chrome.exe" "chrome://extensions"

pause
