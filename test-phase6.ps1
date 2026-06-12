# PRM Tool — Phase 6 Core AI Module Test Script

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

# 1. Login as Admin to set up data
$adminLogin = Test-API "Login Admin" "POST" "/auth/login" @{ username="admin"; password="NewAdmin@1" }
if (-not $adminLogin.data) {
  Write-Host "Admin login failed. Aborting." -ForegroundColor Red
  exit
}
$adminToken = $adminLogin.data.token

# Find or create a Manager
$users = Test-API "List users" "GET" "/admin/users" -token $adminToken
$mgrUser = $users.data.users | Where-Object { $_.role -eq "MANAGER" } | Select-Object -First 1

# Find a project owned by the manager
$projects = Test-API "List projects" "GET" "/admin/projects" -token $adminToken
$project = $projects.data | Where-Object { $_.managerId._id -eq $mgrUser._id -or $_.managerId -eq $mgrUser._id } | Select-Object -First 1
$projectId = $project._id

# 2. Login as Manager
$mgrLogin = Test-API "Login Manager" "POST" "/auth/login" @{ username=$mgrUser.username; password="NewMgr@123" }
$mgrToken = $mgrLogin.data.token

# 3. Request AI Suggestion WITHOUT API Key (Should fail with 400)
Test-API "Request AI Suggestion (No API Key) (should fail)" "GET" "/manager/projects/$projectId/suggest-team" -token $mgrToken

# 4. Set dummy API Key
Test-API "Set Dummy API Key" "PUT" "/admin/config" @{ llmApiKey="dummy-key-12345" } -token $adminToken

# 5. Request AI Suggestion WITH dummy API Key (Should fail with 500 because dummy key is invalid for real Google API)
Test-API "Request AI Suggestion (Dummy Key) (should fail with 500 API Error)" "GET" "/manager/projects/$projectId/suggest-team" -token $mgrToken

Write-Host "`n=== PHASE 6 TESTS COMPLETE ===" -ForegroundColor Yellow
