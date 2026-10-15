@echo off
set "input=%~1"
:: Remove netsipp:// prefix
set "number=%input:netsipp://=%"

:: Remove trailing slash if present
if "%number:~-1%"=="/" set "number=%number:~0,-1%"

:: Log for debugging
echo [%DATE% %TIME%] Input: %1  Raw: %input%  Parsed: %number% >> "%~dp0netsipp_debug.log"

:: 1. Copy to clipboard (so user can Ctrl+V if all else fails)
echo | set /p="%number%" | clip

:: 2. Launch/Focus Netsipp
start "" "C:\Program Files (x86)\NETGSM\Netsipp\Netsipp.exe"

:: 3. Send Keys Simulation via VBScript
:: This creates a temporary VBS file to handle window focus and typing
set "temp_vbs=%temp%\netsipp_sender_%RANDOM%.vbs"
(
echo Set WshShell = WScript.CreateObject("WScript.Shell"^)
echo WScript.Sleep 1000 ' Wait 1 sec for app to come to front
echo WshShell.AppActivate "netsipp"
echo WScript.Sleep 200
echo WshShell.SendKeys "%number%"
echo WScript.Sleep 200
echo WshShell.SendKeys "{ENTER}" ' Optional: Press Enter to dial
) > "%temp_vbs%"

:: Execute and delete wrapper
cscript //nologo "%temp_vbs%"
del "%temp_vbs%"
