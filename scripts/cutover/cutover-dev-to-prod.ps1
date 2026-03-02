param(
  [string]$TargetClerkSecretKey = $env:CLERK_SECRET_KEY_PROD,
  [switch]$CreateMissingUsers,
  [string]$OutputDir = "scripts/cutover/out",
  [string]$RawSnapshotZip = "",
  [switch]$SkipExport,
  [switch]$SkipImport
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Write-Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Read-JsonLines([string]$Path) {
  if (-not (Test-Path $Path)) {
    return @()
  }

  $lines = @(Get-Content -Path $Path | Where-Object { $_.Trim().Length -gt 0 })
  if ($lines.Count -eq 0) {
    return @()
  }

  return $lines | ForEach-Object { $_ | ConvertFrom-Json }
}

function Write-JsonLines([string]$Path, [object[]]$Rows) {
  $rowsArray = @($Rows)
  $rowCount = ($rowsArray | Measure-Object).Count
  if ($rowCount -eq 0) {
    Set-Content -Path $Path -Value @()
    return
  }
  $out = $rowsArray | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 50 }
  Set-Content -Path $Path -Value $out
}

function New-ZipArchiveFromDirectory([string]$SourceDir, [string]$ZipPath) {
  if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
  }

  $zip = [System.IO.Compression.ZipFile]::Open(
    $ZipPath,
    [System.IO.Compression.ZipArchiveMode]::Create
  )
  try {
    $files = Get-ChildItem -Path $SourceDir -Recurse -File
    foreach ($file in $files) {
      $relative = $file.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
      $entryName = $relative -replace '\\', '/'
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip,
        $file.FullName,
        $entryName,
        [System.IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  } finally {
    $zip.Dispose()
  }
}

function Invoke-ClerkApi(
  [string]$Method,
  [string]$Path,
  [object]$Body = $null
) {
  if (-not $TargetClerkSecretKey) {
    throw "Missing TargetClerkSecretKey. Pass -TargetClerkSecretKey or set CLERK_SECRET_KEY_PROD."
  }

  $headers = @{
    Authorization = "Bearer $TargetClerkSecretKey"
    "Content-Type" = "application/json"
  }
  $uri = "https://api.clerk.com/v1$Path"

  if ($Method -eq "GET") {
    return Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
  }

  $payload = $null
  if ($null -ne $Body) {
    $payload = $Body | ConvertTo-Json -Depth 20
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $payload
}

function Resolve-FirstUser([object]$Response) {
  if ($null -eq $Response) {
    return $null
  }
  if ($Response -is [System.Array]) {
    if ($Response.Count -gt 0) { return $Response[0] }
    return $null
  }
  if ($null -ne $Response.data -and $Response.data.Count -gt 0) {
    return $Response.data[0]
  }
  return $null
}

function Get-ClerkUserIdByEmail([string]$Email) {
  $escaped = [System.Uri]::EscapeDataString($Email)
  $response = Invoke-ClerkApi -Method "GET" -Path "/users?email_address[]=$escaped&limit=1"
  $first = Resolve-FirstUser -Response $response
  if ($null -eq $first) {
    return $null
  }
  return [string]$first.id
}

function New-TemporaryPassword([string]$Seed) {
  $chars = (48..57) + (65..90) + (97..122)
  $suffix = -join ($chars | Get-Random -Count 8 | ForEach-Object { [char]$_ })
  return "Tmp-$($Seed.Substring(0, [Math]::Min(8, $Seed.Length)))-Aa1!-$suffix"
}

function Ensure-ClerkUser([string]$Email, [string]$ExternalId) {
  try {
    $created = Invoke-ClerkApi -Method "POST" -Path "/users" -Body @{
      external_id = $ExternalId
      email_address = @($Email)
      skip_password_requirement = $true
    }
    return [string]$created.id
  } catch {
    $password = New-TemporaryPassword -Seed $ExternalId
    $created = Invoke-ClerkApi -Method "POST" -Path "/users" -Body @{
      external_id = $ExternalId
      email_address = @($Email)
      password = $password
      skip_password_checks = $true
    }
    return [string]$created.id
  }
}

function Resolve-RawSnapshotZipPath([string]$OutDir, [string]$ProvidedPath, [switch]$SkipExportFlag) {
  if (-not [string]::IsNullOrWhiteSpace($ProvidedPath)) {
    $resolved = Resolve-Path -Path $ProvidedPath
    return $resolved.Path
  }

  if (-not $SkipExportFlag) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    return (Join-Path $OutDir "dev-snapshot-$stamp.zip")
  }

  $latest = Get-ChildItem -Path $OutDir -Filter "dev-snapshot-*.zip" |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
  if ($null -eq $latest) {
    throw "No existing dev snapshot zip found in $OutDir. Provide -RawSnapshotZip."
  }
  return $latest.FullName
}

Write-Step "Preparing output directory"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$rawZipPath = Resolve-RawSnapshotZipPath -OutDir $OutputDir -ProvidedPath $RawSnapshotZip -SkipExportFlag:$SkipExport
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$rawExtractDir = Join-Path $OutputDir "dev-snapshot-$stamp"
$transformedDir = Join-Path $OutputDir "prod-snapshot-$stamp"
$transformedZip = Join-Path $OutputDir "prod-snapshot-$stamp.zip"
$mapPath = Join-Path $OutputDir "user-id-map-$stamp.json"

if (-not $SkipExport) {
  Write-Step "Exporting Convex dev snapshot to $rawZipPath"
  npx convex export --path $rawZipPath
  if ($LASTEXITCODE -ne 0) {
    throw "Convex dev export failed"
  }
}

if (-not (Test-Path $rawZipPath)) {
  throw "Snapshot zip not found: $rawZipPath"
}

Write-Step "Extracting snapshot"
if (Test-Path $rawExtractDir) {
  Remove-Item -Recurse -Force $rawExtractDir
}
Expand-Archive -Path $rawZipPath -DestinationPath $rawExtractDir -Force

$usersFile = Join-Path $rawExtractDir "users/documents.jsonl"
$users = Read-JsonLines -Path $usersFile
if ($users.Count -eq 0) {
  throw "No users found in snapshot at $usersFile"
}

Write-Step "Mapping source users to target Clerk user IDs"
$map = @{}
$created = @()
$unresolved = @()

foreach ($user in $users) {
  $sourceId = [string]$user.id
  $email = [string]$user.email

  if ([string]::IsNullOrWhiteSpace($email)) {
    $unresolved += [pscustomobject]@{ source_id = $sourceId; email = $null; reason = "missing_email" }
    continue
  }

  $targetId = Get-ClerkUserIdByEmail -Email $email
  if (($null -eq $targetId) -and $CreateMissingUsers) {
    $targetId = Ensure-ClerkUser -Email $email -ExternalId $sourceId
    $created += [pscustomobject]@{ source_id = $sourceId; target_id = $targetId; email = $email }
  }

  if ($null -eq $targetId) {
    $unresolved += [pscustomobject]@{ source_id = $sourceId; email = $email; reason = "not_found_in_target_clerk" }
    continue
  }

  $map[$sourceId] = $targetId
}

$mapPayload = [ordered]@{
  generated_at = (Get-Date).ToString("o")
  source_user_count = $users.Count
  mapped_count = $map.Count
  created = $created
  unresolved = $unresolved
  mapping = $map
}
$mapPayload | ConvertTo-Json -Depth 20 | Set-Content -Path $mapPath
Write-Step "Wrote mapping report to $mapPath"

if ($unresolved.Count -gt 0) {
  throw "Unresolved users found ($($unresolved.Count)). Re-run with -CreateMissingUsers or create users in target Clerk."
}

Write-Step "Creating transformed snapshot"
if (Test-Path $transformedDir) {
  Remove-Item -Recurse -Force $transformedDir
}
New-Item -ItemType Directory -Force -Path $transformedDir | Out-Null
Copy-Item -Path (Join-Path $rawExtractDir "*") -Destination $transformedDir -Recurse

$usersTransformed = Read-JsonLines -Path (Join-Path $transformedDir "users/documents.jsonl")
foreach ($row in $usersTransformed) {
  $sourceId = [string]$row.id
  if (-not $map.ContainsKey($sourceId)) {
    throw "No mapping found for user id $sourceId"
  }
  if ([string]::IsNullOrWhiteSpace([string]$row.legacy_id)) {
    $row | Add-Member -NotePropertyName legacy_id -NotePropertyValue $sourceId -Force
  }
  $row.id = [string]$map[$sourceId]
}
Write-JsonLines -Path (Join-Path $transformedDir "users/documents.jsonl") -Rows $usersTransformed

$ownedTables = @(
  "assets",
  "categories",
  "transactions",
  "user_settings",
  "ai_summaries",
  "monthly_savings_goals",
  "notifications"
)

foreach ($table in $ownedTables) {
  $path = Join-Path $transformedDir "$table/documents.jsonl"
  $rows = Read-JsonLines -Path $path
  foreach ($row in $rows) {
    $sourceUserId = [string]$row.user_id
    if (-not $map.ContainsKey($sourceUserId)) {
      throw "No mapping found for $table row user_id $sourceUserId"
    }
    $row.user_id = [string]$map[$sourceUserId]
  }
  Write-JsonLines -Path $path -Rows $rows
}

Write-Step "Compressing transformed snapshot to $transformedZip"
New-ZipArchiveFromDirectory -SourceDir $transformedDir -ZipPath $transformedZip

if (-not $SkipImport) {
  Write-Step "Importing transformed snapshot into Convex production"
  npx convex import --prod --replace-all -y $transformedZip
  if ($LASTEXITCODE -ne 0) {
    throw "Convex production import failed"
  }
}

Write-Step "Cutover script completed"
Write-Host "Raw snapshot: $rawZipPath"
Write-Host "Transformed snapshot: $transformedZip"
Write-Host "User map report: $mapPath"
