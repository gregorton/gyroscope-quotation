<#
  ============================================================
  send-campaign.ps1  -  DIY email sender (no third-party service)

  Sends an exported Email Studio HTML file to a list of recipients
  through YOUR OWN SMTP mailbox (e.g. the server behind
  info@gyroinst.com). One individual message per recipient.

  QUICK START
  -----------
  1) Export your email from the studio (Export HTML -> Download .html).
  2) Put recipient addresses in recipients.txt (one per line).
  3) Set your SMTP details below (or via environment variables).
  4) Test to yourself first:
       powershell -ExecutionPolicy Bypass -File send-campaign.ps1 `
         -HtmlFile email-advertisement.html -Subject "Test" -TestTo you@yourmail.com
  5) Real send:
       powershell -ExecutionPolicy Bypass -File send-campaign.ps1 `
         -HtmlFile campaign.html -Subject "Introducing CS Instruments, Hontzsch & ABLE"

  SECURITY: never hard-code your password in this file. The script
  reads it from the GTI_SMTP_PASS environment variable, or prompts
  you securely at run time.
  ============================================================
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $HtmlFile,
  [Parameter(Mandatory = $true)] [string] $Subject,
  [string] $Recipients = 'recipients.txt',
  [string] $TestTo,                       # if set, sends ONE test to this address only
  [int]    $DelaySeconds = 5              # pause between sends (be gentle on your server)
)

# ---------- SMTP configuration (edit these, or set env vars) ----------
$SmtpHost = if ($env:GTI_SMTP_HOST) { $env:GTI_SMTP_HOST } else { 'mail.gyroinst.com' }  # your outgoing server
$SmtpPort = if ($env:GTI_SMTP_PORT) { [int]$env:GTI_SMTP_PORT } else { 587 }             # 587 (STARTTLS) or 465 (SSL)
$From     = if ($env:GTI_FROM)      { $env:GTI_FROM }      else { 'info@gyroinst.com' }
$FromName = if ($env:GTI_FROM_NAME) { $env:GTI_FROM_NAME } else { 'Gyroscope Technology' }
$User     = if ($env:GTI_SMTP_USER) { $env:GTI_SMTP_USER } else { $From }
$UseSsl   = $true
# ----------------------------------------------------------------------

# Resolve HTML file relative to this script if needed
if (-not (Test-Path $HtmlFile)) {
  $alt = Join-Path $PSScriptRoot $HtmlFile
  if (Test-Path $alt) { $HtmlFile = $alt } else { throw "HTML file not found: $HtmlFile" }
}
$Body = Get-Content -Path $HtmlFile -Raw -Encoding UTF8

# Build recipient list
$list = @()
if ($TestTo) {
  $list = @($TestTo)
  Write-Host "TEST MODE - sending one message to $TestTo" -ForegroundColor Yellow
} else {
  if (-not (Test-Path $Recipients)) {
    $alt = Join-Path $PSScriptRoot $Recipients
    if (Test-Path $alt) { $Recipients = $alt } else { throw "Recipients file not found: $Recipients" }
  }
  $list = Get-Content -Path $Recipients |
          ForEach-Object { $_.Trim() } |
          Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -match '@' } |
          Select-Object -Unique
}
if ($list.Count -eq 0) { throw "No valid recipients found." }

# Get password securely (env var, else prompt)
if ($env:GTI_SMTP_PASS) {
  $sec = ConvertTo-SecureString $env:GTI_SMTP_PASS -AsPlainText -Force
} else {
  $sec = Read-Host -AsSecureString "SMTP password for $User"
}
$cred = New-Object System.Management.Automation.PSCredential($User, $sec)

Write-Host ("Sending '{0}' from {1} via {2}:{3} to {4} recipient(s)..." -f $Subject, $From, $SmtpHost, $SmtpPort, $list.Count) -ForegroundColor Cyan

$ok = 0; $fail = 0
foreach ($to in $list) {
  try {
    Send-MailMessage `
      -SmtpServer $SmtpHost -Port $SmtpPort -UseSsl:$UseSsl -Credential $cred `
      -From "$FromName <$From>" -To $to `
      -Subject $Subject -Body $Body -BodyAsHtml `
      -Encoding ([System.Text.Encoding]::UTF8) -ErrorAction Stop
    $ok++
    Write-Host ("  sent  -> {0}" -f $to) -ForegroundColor Green
  } catch {
    $fail++
    Write-Host ("  FAIL  -> {0} : {1}" -f $to, $_.Exception.Message) -ForegroundColor Red
  }
  if ($to -ne $list[-1] -and $DelaySeconds -gt 0) { Start-Sleep -Seconds $DelaySeconds }
}

Write-Host ("Done. {0} sent, {1} failed." -f $ok, $fail) -ForegroundColor Cyan
if (-not $TestTo) {
  Write-Host "Reminder: marketing email needs an unsubscribe option and your postal address in the content." -ForegroundColor DarkYellow
}
