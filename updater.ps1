# ==============================================================
# Opencart Sesli Not Asistanı - Otomatik İndirici & Güncelleyici
# ==============================================================
param (
    [string]$RepoOwner = "isacilgiin",
    [string]$RepoName = "oc-speak",
    [string]$Branch = "main",
    [string]$TargetDir = "C:\speak"
)

# Log dosyası
$LogFile = Join-Path $TargetDir "updater.log"
function Write-Log($msg) {
    $time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    "[$time] $msg" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

# 1. Klasör Kontrolü
if (!(Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$VersionUrl = "https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/version.json"
$ZipUrl     = "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$Branch.zip"

# 2. Uzak Sürüm Kontrolü
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $remoteData = Invoke-RestMethod -Uri $VersionUrl -Headers @{ "Cache-Control" = "no-cache" }
    $remoteVersion = $remoteData.version
} catch {
    Write-Log "Uzak surum bilgisi alinamadi (Internet veya repo kontrolu yapiniz): $($_.Exception.Message)"
    exit 0
}

if ([string]::IsNullOrWhiteSpace($remoteVersion)) {
    Write-Log "Uzak surum bilgisi bos geldi, guncelleme iptal."
    exit 0
}

# 3. Yerel Sürüm Kontrolü
$localVersion = "0.0.0"
$ManifestPath = Join-Path $TargetDir "manifest.json"
if (Test-Path $ManifestPath) {
    try {
        $manifest = Get-Content $ManifestPath -Raw -Encoding utf8 | ConvertFrom-Json
        $localVersion = $manifest.version
    } catch {
        Write-Log "manifest.json okunamadi: $($_.Exception.Message)"
    }
}

# 4. Sürüm Kıyaslama Fonksiyonu
function Is-Newer($vRemote, $vLocal) {
    if ([string]::IsNullOrWhiteSpace($vLocal)) { return $true }
    try {
        $rv = [version]$vRemote
        $lv = [version]$vLocal
        return ($rv -gt $lv)
    } catch {
        return ($vRemote -ne $vLocal)
    }
}

if (!(Test-Path $ManifestPath) -or (Is-Newer $remoteVersion $localVersion)) {
    Write-Log "Guncelleme/Kurulum baslatiliyor... (Mevcut: $localVersion -> Yeni: $remoteVersion)"
    
    $TempZip = Join-Path $env:TEMP "speak_update_$([Guid]::NewGuid().ToString('N')).zip"
    $TempExtract = Join-Path $env:TEMP "speak_extract_$([Guid]::NewGuid().ToString('N'))"
    
    try {
        # ZIP indir - Invoke-WebRequest kullan (WebClient'tan daha güvenilir, AV uyumlu)
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        $downloadSuccess = $false
        
        # Yöntem 1: Invoke-WebRequest
        try {
            Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            if ((Test-Path $TempZip) -and ((Get-Item $TempZip).Length -gt 100)) {
                $downloadSuccess = $true
            }
        } catch {
            Write-Log "Invoke-WebRequest basarisiz, WebClient deneniyor: $($_.Exception.Message)"
        }
        
        # Yöntem 2: WebClient (yedek)
        if (!$downloadSuccess) {
            try {
                $downloader = New-Object System.Net.WebClient
                if ($null -eq $downloader) {
                    throw "WebClient olusturulamadi"
                }
                $downloader.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                $downloader.DownloadFile($ZipUrl, $TempZip)
                if ((Test-Path $TempZip) -and ((Get-Item $TempZip).Length -gt 100)) {
                    $downloadSuccess = $true
                }
            } catch {
                Write-Log "WebClient da basarisiz: $($_.Exception.Message)"
            } finally {
                if ($null -ne $downloader) { $downloader.Dispose() }
            }
        }
        
        if (!$downloadSuccess) {
            throw "ZIP dosyasi indirilemedi. Internet baglantisini ve antivirus ayarlarini kontrol edin."
        }
        
        # İndirilen ZIP'in SmartScreen engelini kaldır
        Unblock-File -Path $TempZip -ErrorAction SilentlyContinue
        
        # Arşivi aç
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
        
        # Dosyaları C:\speak klasörüne kopyala (Copy-Item -Recurse ile güvenli kopyalama)
        Copy-Item -Path "$ExtractedSubFolder\*" -Destination $TargetDir -Recurse -Force
        
        # Dosyaların Windows SmartScreen / Defender engelini kaldır
        Get-ChildItem -Path $TargetDir -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
        
        Write-Log "Guncelleme basariyla tamamlandi! Yeni surum: $remoteVersion"

        # Netsipp Registry Kaydı
        $RegFile = Join-Path $TargetDir "netsipp_protocol_register.reg"
        if (Test-Path $RegFile) {
            reg import "$RegFile" *>$null
        }

    } catch {
        Write-Log "Hata olustu: $($_.Exception.Message)"
    } finally {
        # Temizlik
        Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Log "Sistem zaten guncel (Surum: $localVersion)"
}
