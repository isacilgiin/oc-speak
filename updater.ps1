# ==============================================================
# Opencart & Mercury Sesli Not Asistanı - Otomatik İndirici & Güncelleyici
# ==============================================================
param (
    [string]$RepoOwner = "isacilgiin",
    [string]$RepoName = "oc-speak",
    [string]$Branch = "main",
    [string]$TargetDir = "C:\speak",
    [switch]$Force = $false
)

# Log dosyası
$LogFile = Join-Path $TargetDir "updater.log"
function Write-Log($msg, [string]$color = "Cyan") {
    $time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    "[$time] $msg" | Out-File -FilePath $LogFile -Append -Encoding utf8
    Write-Host " [+] $msg" -ForegroundColor $color
}

# 1. Klasör Kontrolü
if (!(Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$VersionUrls = @(
    "https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/version.json?t=$ts",
    "https://cdn.jsdelivr.net/gh/$RepoOwner/$RepoName@$Branch/version.json?t=$ts"
)

$ZipUrls = @(
    "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$Branch.zip?t=$ts",
    "https://codeload.github.com/$RepoOwner/$RepoName/zip/refs/heads/$Branch"
)

# 2. Uzak Sürüm Kontrolü
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$remoteVersion = ""

foreach ($vUrl in $VersionUrls) {
    try {
        $remoteData = Invoke-RestMethod -Uri $vUrl -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 10
        if ($remoteData -and !([string]::IsNullOrWhiteSpace($remoteData.version))) {
            $remoteVersion = $remoteData.version.Trim()
            break
        }
    } catch {
        # Sonraki URL dene
    }
}

if ([string]::IsNullOrWhiteSpace($remoteVersion)) {
    Write-Log "Uzak surum bilgisi alinamadi, Force parametresi aktifse dogrudan zip indirilecek." "Yellow"
    $remoteVersion = "2.0.1"
}

# 3. Yerel Sürüm Kontrolü
$localVersion = "0.0.0"
$ManifestPath = Join-Path $TargetDir "manifest.json"
if (Test-Path $ManifestPath) {
    try {
        $manifest = Get-Content $ManifestPath -Raw -Encoding utf8 | ConvertFrom-Json
        $localVersion = $manifest.version
    } catch {
        Write-Log "manifest.json okunamadi: $($_.Exception.Message)" "Yellow"
    }
}

# 4. Sürüm Kıyaslama Fonksiyonu
function Is-Newer($vRemote, $vLocal) {
    if ([string]::IsNullOrWhiteSpace($vLocal) -or $vLocal -eq "0.0.0") { return $true }
    try {
        $rv = [version]$vRemote
        $lv = [version]$vLocal
        return ($rv -gt $lv)
    } catch {
        return ($vRemote -ne $vLocal)
    }
}

$needsUpdate = $Force -or !(Test-Path $ManifestPath) -or (Is-Newer $remoteVersion $localVersion)

if ($needsUpdate) {
    Write-Log "Guncelleme/Kurulum baslatiliyor... (Mevcut: $localVersion -> Hedef: $remoteVersion)" "Green"
    
    $TempZip = Join-Path $env:TEMP "speak_update_$([Guid]::NewGuid().ToString('N')).zip"
    $TempExtract = Join-Path $env:TEMP "speak_extract_$([Guid]::NewGuid().ToString('N'))"
    
    try {
        $downloadSuccess = $false
        
        foreach ($zUrl in $ZipUrls) {
            Write-Log "Dosyalar indiriliyor: $zUrl" "Gray"
            try {
                Invoke-WebRequest -Uri $zUrl -OutFile $TempZip -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -TimeoutSec 20
                if ((Test-Path $TempZip) -and ((Get-Item $TempZip).Length -gt 500)) {
                    $downloadSuccess = $true
                    break
                }
            } catch {
                # WebClient ile dene
                try {
                    $wc = New-Object System.Net.WebClient
                    $wc.Headers.Add("User-Agent", "Mozilla/5.0")
                    $wc.DownloadFile($zUrl, $TempZip)
                    $wc.Dispose()
                    if ((Test-Path $TempZip) -and ((Get-Item $TempZip).Length -gt 500)) {
                        $downloadSuccess = $true
                        break
                    }
                } catch {}
            }
        }
        
        if (!$downloadSuccess) {
            throw "ZIP dosyasi indirilemedi. Lutfen internet baglantinizi kontrol edin."
        }
        
        # İndirilen ZIP'in SmartScreen engelini kaldır
        Unblock-File -Path $TempZip -ErrorAction SilentlyContinue
        
        # Arşivi aç
        Write-Log "Arsiv aciliyor..." "Gray"
        Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force
        
        # GitHub ZIP içinde klasör adı: <RepoName>-<Branch>
        $ExtractedSubFolder = Join-Path $TempExtract "$RepoName-$Branch"
        if (!(Test-Path $ExtractedSubFolder)) {
            $foundDir = Get-ChildItem -Path $TempExtract -Directory | Select-Object -First 1
            if ($foundDir) { $ExtractedSubFolder = $foundDir.FullName }
        }
        
        if (!(Test-Path $ExtractedSubFolder)) {
            throw "Arsivden klasor cikarilamadi."
        }
        
        # Dosyaları C:\speak klasörüne kopyala
        Write-Log "Dosyalar C:\speak klasorune yerlestiriliyor..." "Gray"
        try {
            Copy-Item -Path "$ExtractedSubFolder\*" -Destination $TargetDir -Recurse -Force -ErrorAction Stop
        } catch {
            # Robocopy yedek kopyalama (dosya kilitlerini daha iyi aşar)
            robocopy "$ExtractedSubFolder" "$TargetDir" /E /NP /NFL /NDO /R:1 /W:1 | Out-Null
        }
        
        # Dosyaların Windows SmartScreen / Defender engelini kaldır
        Get-ChildItem -Path $TargetDir -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
        
        Write-Log "Guncelleme basariyla tamamlandi! Surum: $remoteVersion" "Green"

        # Netsipp Registry Kaydı
        $RegFile = Join-Path $TargetDir "netsipp_protocol_register.reg"
        if (Test-Path $RegFile) {
            reg import "$RegFile" *>$null
        }

    } catch {
        Write-Log "Hata olustu: $($_.Exception.Message)" "Red"
    } finally {
        # Temizlik
        Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Log "Sistem zaten en guncel surumde (Surum: $localVersion)" "Green"
}
