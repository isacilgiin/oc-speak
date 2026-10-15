# ==============================================================
# Opencart Sesli Not Asistanı - Otomatik İndirici & Güncelleyici
# ==============================================================
param (
    [string]$RepoOwner = "isacilgiin",
    [string]$RepoName = "oc-speak",
    [string]$Branch = "main",
    [string]$TargetDir = "C:\speak"
)

$ErrorActionPreference = "SilentlyContinue"

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
    $webClient = New-Object System.Net.WebClient
    $webClient.Encoding = [System.Text.Encoding]::UTF8
    $jsonContent = $webClient.DownloadString("$VersionUrl?t=$([DateTime]::UtcNow.Ticks)")
    
    $remoteData = $jsonContent | ConvertFrom-Json
    $remoteVersion = $remoteData.version
} catch {
    Write-Log "Uzak sürüm bilgisi alınamadı (İnternet veya repo kontrolü yapınız): $($_.Exception.Message)"
    exit 0
}

# 3. Yerel Sürüm Kontrolü
$localVersion = "0.0.0"
$ManifestPath = Join-Path $TargetDir "manifest.json"
if (Test-Path $ManifestPath) {
    try {
        $manifest = Get-Content $ManifestPath -Raw -Encoding utf8 | ConvertFrom-Json
        $localVersion = $manifest.version
    } catch {}
}

# 4. Sürüm Kıyaslama Fonksiyonu
function Is-Newer($vRemote, $vLocal) {
    if (!$vLocal) { return $true }
    try {
        $rv = [version]$vRemote
        $lv = [version]$vLocal
        return ($rv -gt $lv)
    } catch {
        return ($vRemote -ne $vLocal)
    }
}

if (!(Test-Path $ManifestPath) -or (Is-Newer $remoteVersion $localVersion)) {
    Write-Log "Güncelleme/Kurulum başlatılıyor... (Mevcut: $localVersion -> Yeni: $remoteVersion)"
    
    $TempZip = Join-Path $env:TEMP "speak_update_$([Guid]::NewGuid().ToString('N')).zip"
    $TempExtract = Join-Path $env:TEMP "speak_extract_$([Guid]::NewGuid().ToString('N'))"
    
    try {
        # ZIP indir
        $webClient.DownloadFile($ZipUrl, $TempZip)
        
        # Arşivi aç
        Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force
        
        # GitHub ZIP içinde klasör adı: <RepoName>-<Branch>
        $ExtractedSubFolder = Join-Path $TempExtract "$RepoName-$Branch"
        if (!(Test-Path $ExtractedSubFolder)) {
            $ExtractedSubFolder = (Get-ChildItem -Path $TempExtract -Directory | Select-Object -First 1).FullName
        }
        
        # Dosyaları C:\speak klasörüne kopyala
        Get-ChildItem -Path $ExtractedSubFolder -Recurse | ForEach-Object {
            $dest = Join-Path $TargetDir $_.FullName.Substring($ExtractedSubFolder.Length)
            if ($_.PSIsContainer) {
                if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
            } else {
                Copy-Item -Path $_.FullName -Destination $dest -Force
            }
        }
        
        Write-Log "Güncelleme başarıyla tamamlandı! Yeni sürüm: $remoteVersion"

        # Netsipp Registry Kaydı (Eğer daha önce kaydedilmediyse)
        $RegFile = Join-Path $TargetDir "netsipp_protocol_register.reg"
        if (Test-Path $RegFile) {
            reg import "$RegFile" *>$null
        }

    } catch {
        Write-Log "Hata oluştu: $($_.Exception.Message)"
    } finally {
        # Temizlik
        Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Log "Sistem zaten güncel (Sürüm: $localVersion)"
}
