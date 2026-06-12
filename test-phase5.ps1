# PRM Tool — Phase 5 Scheduler & Automations Test Script

$BASE = "http://localhost:5000/api"

function Test-API($label, $method, $url, $body = $null, $token = $null) {
  Write-Host "`n=== $label ===" -ForegroundColor Cyan
  $h = @{ "Content-Type" = "application/json" }
  if ($token) { $h["Authorization"] = "Bearer $token" }

  try {
    $params = @{ Uri = "$BASE$url"; Method = $method; Headers = $h }
    if ($body) { $params["Body"] = ($body | ConvertTo-Json -Depth 5) }
    $resp = Invoke-RestMethod @params
    Write-Host "  OK: $($resp.message)" -ForegroundColor Green
    return $resp
  } catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  FAIL: $($err.message)" -ForegroundColor Red
    return $err
  }
}

# 1. Login as Admin
$adminLogin = Test-API "Login Admin" "POST" "/auth/login" @{ username="admin"; password="NewAdmin@1" }
if (-not $adminLogin.data) {
  Write-Host "Admin login failed. Aborting." -ForegroundColor Red
  exit
}
$adminToken = $adminLogin.data.token

# 2. Trigger Scheduler
Test-API "Trigger Scheduler Jobs" "POST" "/admin/scheduler/trigger" -token $adminToken

Write-Host "`n=== PHASE 5 TESTS COMPLETE ===" -ForegroundColor Yellow
