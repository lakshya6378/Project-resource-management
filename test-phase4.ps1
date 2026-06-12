# PRM Tool — Phase 4 Allocations & Timesheets Test Script

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

# Find or create an Employee
$empUser = $users.data.users | Where-Object { $_.role -eq "EMPLOYEE" } | Select-Object -First 1

if (-not $empUser) {
  $empUserRes = Test-API "Create Employee User" "POST" "/admin/users" @{
    fullName="Bob Builder"; email="bob@company.com"; username="bobbuilder"; tempPassword="Temp@1234"; role="EMPLOYEE"
  } -token $adminToken
  $empUserId = $empUserRes.data._id
} else {
  $empUserId = $empUser._id
}

# Ensure employee profile exists
$employees = Test-API "List employee profiles" "GET" "/admin/employees" -token $adminToken
$empProfile = $employees.data.employees | Where-Object { $_.userId -eq $empUserId } | Select-Object -First 1
if (-not $empProfile) {
  $empProfileRes = Test-API "Create Employee Profile" "POST" "/admin/employees" @{
    userId=$empUserId; fullName="Bob Builder"; email="bob@company.com"; department="Engineering"; designation="Dev"
  } -token $adminToken
  $empProfileId = $empProfileRes.data._id
} else {
  $empProfileId = $empProfile._id
}

# Find a project owned by the manager
$projects = Test-API "List projects" "GET" "/admin/projects" -token $adminToken
$project = $projects.data | Where-Object { $_.managerId._id -eq $mgrUser._id -or $_.managerId -eq $mgrUser._id } | Select-Object -First 1
$projectId = $project._id

# 2. Login as Manager
$mgrLogin = Test-API "Login Manager" "POST" "/auth/login" @{ username=$mgrUser.username; password="Temp@1234" }
if ($mgrLogin.data.user.forcePasswordChange) {
  Test-API "Manager Change password" "POST" "/auth/change-password" @{ currentPassword="Temp@1234"; newPassword="NewMgr@123" } -token $mgrLogin.data.token
  $mgrLogin = Test-API "Re-login Manager" "POST" "/auth/login" @{ username=$mgrUser.username; password="NewMgr@123" }
} elseif (-not $mgrLogin.data) {
  $mgrLogin = Test-API "Login Manager (alt)" "POST" "/auth/login" @{ username=$mgrUser.username; password="NewMgr@123" }
}
$mgrToken = $mgrLogin.data.token

# 3. Manager allocates Employee
$alloc = Test-API "Manager: Allocate Employee" "POST" "/manager/allocations" @{
  employeeId=$empProfileId; projectId=$projectId; utilisation=50; fromDate="2026-06-01"; toDate="2026-12-31"
} -token $mgrToken

# Should fail: Over allocation
Test-API "Manager: Over-allocate Employee (should fail)" "POST" "/manager/allocations" @{
  employeeId=$empProfileId; projectId=$projectId; utilisation=60; fromDate="2026-06-01"; toDate="2026-12-31"
} -token $mgrToken

# 4. Login as Employee
$empLogin = Test-API "Login Employee" "POST" "/auth/login" @{ username=$empUser.username; password="Temp@1234" }
if ($empLogin.data.user.forcePasswordChange) {
  Test-API "Employee Change password" "POST" "/auth/change-password" @{ currentPassword="Temp@1234"; newPassword="NewEmp@123" } -token $empLogin.data.token
  $empLogin = Test-API "Re-login Employee" "POST" "/auth/login" @{ username=$empUser.username; password="NewEmp@123" }
} elseif (-not $empLogin.data) {
  $empLogin = Test-API "Login Employee (alt)" "POST" "/auth/login" @{ username=$empUser.username; password="NewEmp@123" }
}
$empToken = $empLogin.data.token

# 5. Employee Views Allocations
Test-API "Employee: View Allocations" "GET" "/employee/my-allocations" -token $empToken

# 6. Employee Submits Timesheet
$ts = Test-API "Employee: Submit Timesheet" "POST" "/employee/timesheets" @{
  weekStart="2026-06-08";
  entries= @( @{ projectId=$projectId; hours=20; activityTags=@("Backend API Development") } )
} -token $empToken

# Should fail: Duplicate timesheet
Test-API "Employee: Duplicate Timesheet (should fail)" "POST" "/employee/timesheets" @{
  weekStart="2026-06-08";
  entries= @( @{ projectId=$projectId; hours=10 } )
} -token $empToken

# Should fail: Exceeds max hours (50% of 45h max? Wait, the limit is maxWeeklyHours, which is 45 total)
Test-API "Employee: Exceeds max hours (should fail)" "POST" "/employee/timesheets" @{
  weekStart="2026-06-15";
  entries= @( @{ projectId=$projectId; hours=50 } )
} -token $empToken

# 7. Employee Views Timesheet History
Test-API "Employee: View Timesheet History" "GET" "/employee/timesheets" -token $empToken

# 8. Manager Views Team Timesheets
Test-API "Manager: View Team Timesheets" "GET" "/manager/timesheets/team?weekStart=2026-06-08" -token $mgrToken

# 9. Manager Ends Allocation
$allocId = $alloc.data._id
if ($allocId) {
  Test-API "Manager: End Allocation" "DELETE" "/manager/allocations/$allocId" -token $mgrToken
}

Write-Host "`n=== ALL PHASE 4 TESTS COMPLETE ===" -ForegroundColor Yellow
