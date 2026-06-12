# PRM Tool — Phase 3 Project & Config API Test Script

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

# Login as admin (password was changed in Phase 2 tests, re-seed if needed)
$login = Test-API "Login" "POST" "/auth/login" @{ username="admin"; password="Admin@1234" }
if (-not $login.data) {
  $login = Test-API "Login (alt)" "POST" "/auth/login" @{ username="admin"; password="NewAdmin@1" }
}
$token = $login.data.token

# If forcePasswordChange, handle it
if ($login.data.user.forcePasswordChange) {
  Test-API "Change password" "POST" "/auth/change-password" @{ currentPassword="Admin@1234"; newPassword="NewAdmin@1" } -token $token
  $login = Test-API "Re-login" "POST" "/auth/login" @{ username="admin"; password="NewAdmin@1" }
  $token = $login.data.token
}

# Ensure a manager exists
$users = Test-API "List users" "GET" "/admin/users" -token $token
$mgr = $users.data.users | Where-Object { $_.role -eq "MANAGER" -and $_.isActive }
if (-not $mgr) {
  $mgrResult = Test-API "Create manager" "POST" "/admin/users" @{
    fullName="Alice Manager"; email="alice2@company.com"; username="alice2";
    tempPassword="Temp@1234"; role="MANAGER"
  } -token $token
  $mgrId = $mgrResult.data._id
} else {
  $mgrId = $mgr[0]._id
}

# 1. Create project
$proj = Test-API "Create project" "POST" "/admin/projects" @{
  name="PRM Tool v2"; description="Resource management system";
  managerId=$mgrId; startDate="2026-01-01"; endDate="2026-12-31"
} -token $token
$projId = $proj.data._id
Write-Host "  Project ID: $projId"

# 2. List projects
Test-API "List projects" "GET" "/admin/projects" -token $token

# 3. Get project detail
Test-API "Get project" "GET" "/admin/projects/$projId" -token $token

# 4. Update project
Test-API "Update project status" "PUT" "/admin/projects/$projId" @{ status="ACTIVE" } -token $token

# 5. Add milestone
$ms1 = Test-API "Add milestone: MVP" "POST" "/admin/projects/$projId/milestones" @{
  title="MVP Release"; dueDate="2026-03-15"
} -token $token
$msId = $ms1.data[0]._id
Write-Host "  Milestone ID: $msId"

# 6. Add second milestone
Test-API "Add milestone: Beta" "POST" "/admin/projects/$projId/milestones" @{
  title="Beta Release"; dueDate="2026-06-15"
} -token $token

# 7. Update milestone status
Test-API "Update milestone to IN_PROGRESS" "PUT" "/admin/projects/$projId/milestones/$msId" @{
  status="IN_PROGRESS"
} -token $token

# 8. Get config
$cfg = Test-API "Get config" "GET" "/admin/config" -token $token

# 9. Update config
Test-API "Update config" "PUT" "/admin/config" @{
  llmProvider="GEMINI"; schedulerIntervalHours=2; maxWeeklyHours=45
} -token $token

# 10. Verify config update
Test-API "Verify config" "GET" "/admin/config" -token $token

# 11. Bad date range (should fail)
Test-API "Bad date range (should fail)" "POST" "/admin/projects" @{
  name="Bad Project"; managerId=$mgrId; startDate="2026-12-31"; endDate="2026-01-01"
} -token $token

# 12. Duplicate milestone (should fail)
Test-API "Duplicate milestone (should fail)" "POST" "/admin/projects/$projId/milestones" @{
  title="MVP Release"; dueDate="2026-04-01"
} -token $token

Write-Host "`n=== ALL PHASE 3 TESTS COMPLETE ===" -ForegroundColor Yellow
