import inquirer from 'inquirer';
import api from '../apiClient';
import ui from '../ui';

/**
 * Manager Console Screens
 *
 * Provides Allocation Management and Team Timesheet viewing
 * for Manager-role users.
 */

const managerMainMenu = async (user) => {
  const dateStr = new Date().toLocaleString();
  ui.header('Manager Panel', `User: ${user.fullName} | ${dateStr}`);

  const { action } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📊 Resource Dashboard', value: 'dashboard' },
        { name: '👥 Allocate Resource', value: 'allocations' },
        { name: '📁 My Projects', value: 'projects' },
        { name: '⏱️  Timesheets', value: 'timesheets' },
        { name: '🧠 AI Assistant', value: 'ai' },
        new inquirer.Separator(),
        { name: '🚪 Logout', value: 'logout' },
      ],
    },
  ]);

  switch (action) {
    case 'dashboard':
      await resourceDashboardScreen();
      break;
    case 'allocations':
      await allocationsMenu();
      break;
    case 'projects':
      await myProjectsScreen();
      break;
    case 'timesheets':
      await managerTimesheetsMenu();
      break;
    case 'ai':
      await aiAssistantMenu();
      break;
    case 'logout':
      try {
        await api.logout();
        api.clearToken();
        ui.success('Logged out');
      } catch (err) {
        ui.error(err.message);
      }
      return 'LOGOUT';
  }

  return managerMainMenu(user);
};

// ─── Dashboards & Overviews ───────────────────────────────────

const resourceDashboardScreen = async () => {
  try {
    const result = await api.getTeamEmployees();
    const employees = result.data.employees;

    ui.header('Resource Dashboard (My Team)');
    
    if (employees.length === 0) {
      ui.info('No employees in your team.');
      return;
    }

    const bench = employees.filter(e => e.resourceData?.status === 'BENCH' || (e.resourceData?.currentUtilisation || 0) === 0);
    const partial = employees.filter(e => e.resourceData?.status === 'ALLOCATED' && (e.resourceData?.currentUtilisation || 0) < 100 && (e.resourceData?.currentUtilisation || 0) > 0);
    const fully = employees.filter(e => e.resourceData?.status === 'ALLOCATED' && (e.resourceData?.currentUtilisation || 0) >= 100);

    console.log(`\n  🟢 Bench (Fully Available): ${bench.length}`);
    console.log(`  🟡 Partially Allocated:     ${partial.length}`);
    console.log(`  🔴 Fully Allocated:         ${fully.length}\n`);

    ui.table(
      employees.map(e => ({ name: e.fullName, status: e.resourceData?.status || 'N/A', util: `${e.resourceData?.currentUtilisation || 0}%`, skills: e.skills?.length || 0 })),
      ['name', 'status', 'util', 'skills'],
      { name: 'Name', status: 'Status', util: 'Util%', skills: '#Skills' }
    );

    const { action } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'action',
        message: 'Options:',
        choices: [
          { name: '🔍 Drill into resource details', value: 'drill' },
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'drill') {
       const employee = await selectEmployee('Select resource to view details:');
       if (employee) {
         ui.detail(employee, [
           { key: '_id', label: 'ID' },
           { key: 'fullName', label: 'Name' },
           { key: 'department', label: 'Department' },
           { key: 'status', label: 'Status' },
           { key: 'currentUtilisation', label: 'Utilisation (%)' },
         ]);
         if (employee.skills && employee.skills.length > 0) {
           ui.info('Skills: ' + employee.skills.map(s => `${s.skillId?.name || s.name} (${s.proficiency})`).join(', '));
         }
         await inquirer.prompt([{ type: 'input', name: 'back', message: 'Press Enter to go back' }]);
       }
       return resourceDashboardScreen();
    }

  } catch (err) {
    ui.error(err.message);
  }
};

const myProjectsScreen = async () => {
  try {
    const result = await api.getMyManagerProjects();
    const projects = result.data;
    
    ui.header('My Projects');
    if (!projects || projects.length === 0) {
      ui.info('No projects assigned to you.');
      return;
    }

    const getHealthEmoji = (status) => {
      if (status === 'AT_RISK') return '🔴 AT RISK';
      if (status === 'ATTENTION') return '🟡 ATTENTION';
      return '🟢 ON TRACK';
    };

    const today = new Date();
    
    ui.table(
      projects.map((p, idx) => {
        return {
          idx: `${idx + 1}.`,
          name: p.name,
          date: p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : 'N/A',
          health: getHealthEmoji(p.healthStatus)
        };
      }),
      ['idx', 'name', 'date', 'health'],
      { idx: '#', name: 'Project', date: 'End Date', health: 'Health' }
    );

    const { action } = await inquirer.prompt([
      {
        type: 'input',
        name: 'action',
        message: 'Enter project number to view details (or leave blank to go back):',
      },
    ]);

    if (!action) return;

    const pIdx = parseInt(action) - 1;
    if (pIdx >= 0 && pIdx < projects.length) {
      const project = projects[pIdx];
      const allocResult = await api.getProjectAllocations(project._id);
      const allocations = allocResult.data.filter((a: any) => a.isActive);

      console.log(`\n── ${project.name} ───────────────────────────────`);
      console.log(`Health Status : ${getHealthEmoji(project.healthStatus)}\n`);
      
      console.log(`Risk Flags:`);
      if (project.riskFlags && project.riskFlags.length > 0) {
        project.riskFlags.forEach(flag => console.log(`  ✗  ${flag}`));
      } else {
        console.log(`  ✓  Resources are correctly allocated`);
        console.log(`  ✓  All milestones are on track`);
      }

      console.log(`\nMilestones:`);
      if (project.milestones && project.milestones.length > 0) {
        console.log(`  ${'#'.padEnd(4)} ${'Title'.padEnd(18)} ${'Due Date'.padEnd(12)} ${'Status'.padEnd(15)}`);
        project.milestones.forEach((m, i) => {
          const isOverdue = (m.status === 'NOT_STARTED' || m.status === 'IN_PROGRESS') && new Date(m.dueDate) < today;
          const overdueMarker = isOverdue ? ' ⚠ OVERDUE' : '';
          const mDate = new Date(m.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
          console.log(`  ${`${i+1}.`.padEnd(4)} ${m.title.padEnd(18)} ${mDate.padEnd(12)} ${m.status.padEnd(15)}${overdueMarker}`);
        });
      } else {
        console.log(`  No milestones defined.`);
      }

      console.log(`\nAllocated Resources:`);
      if (allocations.length > 0) {
        console.log(`  ${'Name'.padEnd(14)} ${'%'.padEnd(6)} ${'From'.padEnd(12)} ${'To'.padEnd(12)}`);
        allocations.forEach(a => {
          const fDate = new Date(a.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
          const tDate = new Date(a.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
          console.log(`  ${a.employeeId.fullName.padEnd(14)} ${`${a.utilisation}%`.padEnd(6)} ${fDate.padEnd(12)} ${tDate.padEnd(12)}`);
        });
      } else {
        console.log(`  No active allocations.`);
      }
      console.log('');

      const { subAction } = await inquirer.prompt([
        {
          type: 'list', loop: false,
          name: 'subAction',
          message: 'Options:',
          choices: [
            { name: '🤖 Get AI Risk Summary', value: 'risk' },
            { name: '⬅️  Back', value: 'back' },
          ],
        },
      ]);

      if (subAction === 'risk') {
         ui.info('🧠 AI is analyzing project risk...');
         try {
           const riskRes = await api.generateRiskSummary(project._id);
           console.log(`\n🤖 AI Risk Summary:\n\n${riskRes.data.summary}\n`);
         } catch (e) {
           ui.error(e.message);
         }
         await inquirer.prompt([{ type: 'input', name: 'back', message: 'Press Enter to continue' }]);
      }
      return myProjectsScreen();
    }

  } catch (err) {
    ui.error(err.message);
  }
};

const managerTimesheetsMenu = async () => {
  const { action } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'action',
      message: 'Timesheets:',
      choices: [
        { name: '⏱️  View Team Timesheets', value: 'view' },
        { name: '🔓 Review Timesheet Access Request', value: 'review' },
        { name: '⬅️  Back', value: 'back' },
      ],
    },
  ]);
  
  if (action === 'view') await teamTimesheetsScreen();
  if (action === 'review') await reviewAccessScreen();
};

const aiAssistantMenu = async () => {
  const { action } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'action',
      message: 'AI Assistant:',
      choices: [
        { name: '✨ Skill Match (Suggest Team)', value: 'suggest' },
        { name: '🔎 AI Team Search (Organisation Wide)', value: 'search' },
        { name: '⚠️  AI Risk Summary', value: 'risk' },
        { name: '⬅️  Back', value: 'back' },
      ],
    },
  ]);
  
  if (action === 'suggest') await suggestTeamScreen();
  if (action === 'search') await aiTeamSearchScreen();
  if (action === 'risk') await aiRiskSummaryScreen();
};

const aiTeamSearchScreen = async () => {
  try {
    const { query } = await inquirer.prompt([
      { type: 'input', name: 'query', message: 'Enter team requirements (e.g., "Need 2 React devs and 1 Node dev"):' }
    ]);
    if (!query) return;

    ui.info('🧠 AI is searching the organisation...');
    const result = await api.teamSearch(query);
    const suggestion = result.data;

    ui.header('AI Team Search Results');
    console.log(`\n💡 Rationale:\n${suggestion.rationale}\n`);
    console.log(`🎯 Roles Identified:\n- ${suggestion.rolesIdentified.join('\n- ')}\n`);

    if (suggestion.unfilledRoles && suggestion.unfilledRoles.length > 0) {
      console.log(`⚠️  Unfilled Roles:`);
      suggestion.unfilledRoles.forEach(ur => console.log(`  - ${ur.role}: ${ur.reasoning}`));
      console.log('');
    }

    if (suggestion.suggestedTeam && suggestion.suggestedTeam.length > 0) {
      ui.table(
        suggestion.suggestedTeam.map((t: any) => ({
          rank: t.rank || '-',
          id: t.employeeId,
          name: t.name,
          role: t.suggestedRole,
          util: `${t.suggestedUtilisation}%`,
          reason: t.reasoning,
        })),
        ['rank', 'id', 'name', 'role', 'util', 'reason'],
        { rank: 'Rank', id: 'Emp ID', name: 'Employee', role: 'Suggested Role', util: 'Util%', reason: 'Reasoning' }
      );
    } else {
      ui.warn('No suitable team members found in the organisation.');
    }
  } catch (err) {
    ui.error(err.message);
  }
  await inquirer.prompt([{ type: 'input', name: 'back', message: 'Press Enter to go back' }]);
};

const aiRiskSummaryScreen = async () => {
  const project = await selectMyProject('Select project for risk summary:');
  if (!project) return;
  ui.info('🧠 AI is analyzing project risk...');
  try {
    const riskRes = await api.generateRiskSummary(project._id);
    console.log(`\n🤖 AI Risk Summary:\n\n${riskRes.data.summary}\n`);
  } catch (e) {
    ui.error(e.message);
  }
  await inquirer.prompt([{ type: 'input', name: 'back', message: 'Press Enter to continue' }]);
};

// ─── Allocations Management ───────────────────────────────────

const allocationsMenu = async () => {
  ui.header('Allocate Resource');

  const { action } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'action',
      message: 'Select action:',
      choices: [
        { name: '✨ Find resource using AI', value: 'suggest' },
        { name: '➕ Allocate directly', value: 'create' },
        { name: '🛑 End an existing allocation', value: 'end' },
        new inquirer.Separator(),
        { name: '⬅️  Back', value: 'back' },
      ],
    },
  ]);

  switch (action) {
    case 'suggest':
      await suggestTeamScreen();
      break;
    case 'create':
      await createAllocationScreen();
      break;
    case 'end':
      await endAllocationScreen();
      break;
    case 'back':
      return;
  }

  return allocationsMenu();
};

const viewProjectAllocations = async () => {
  try {
    const project = await selectMyProject('Select project to view allocations:');
    if (!project) return;

    const result = await api.getProjectAllocations(project._id);
    const allocations = result.data;

    ui.header(`Active Allocations — ${project.name}`);

    if (allocations.length === 0) {
      ui.info('No active allocations');
      return;
    }

    ui.table(
      allocations.map((a) => ({
        employee: a.employeeId.fullName,
        dept: a.employeeId.department,
        util: `${a.utilisation}%`,
        from: new Date(a.fromDate).toLocaleDateString(),
        to: new Date(a.toDate).toLocaleDateString(),
        id: a._id,
      })),
      ['employee', 'dept', 'util', 'from', 'to', 'id'],
      { employee: 'Employee', dept: 'Dept', util: 'Util%', from: 'From', to: 'To', id: 'Alloc ID' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const viewEmployeeAllocations = async () => {
  try {
    const employee = await selectEmployee('Select employee:');
    if (!employee) return;

    const result = await api.getEmployeeAllocations(employee._id);
    const allocations = result.data;

    ui.header(`Allocations — ${employee.fullName}`);

    if (allocations.length === 0) {
      ui.info('No allocations found');
      return;
    }

    ui.table(
      allocations.map((a) => ({
        project: a.projectId.name,
        active: a.isActive ? '✅' : '❌',
        util: `${a.utilisation}%`,
        from: new Date(a.fromDate).toLocaleDateString(),
        to: new Date(a.toDate).toLocaleDateString(),
      })),
      ['project', 'active', 'util', 'from', 'to'],
      { project: 'Project', active: 'Active', util: 'Util%', from: 'From', to: 'To' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const suggestTeamScreen = async () => {
  try {
    const project = await selectMyProject('Select project for AI suggestion:');
    if (!project) return;

    const { requirements } = await inquirer.prompt([
      { type: 'input', name: 'requirements', message: 'Enter specific team requirements (optional):' }
    ]);

    ui.info('🧠 AI is analyzing project requirements and available staff...');
    
    const result = await api.suggestTeam(project._id, requirements);
    const suggestion = result.data;

    ui.header(`AI Team Suggestion — ${project.name}`);
    
    console.log(`\n💡 Rationale:\n${suggestion.rationale}\n`);
    console.log(`🎯 Roles Identified:\n- ${suggestion.rolesIdentified.join('\n- ')}\n`);

    if (suggestion.unfilledRoles && suggestion.unfilledRoles.length > 0) {
      console.log(`⚠️  Unfilled Roles:`);
      suggestion.unfilledRoles.forEach(ur => console.log(`  - ${ur.role}: ${ur.reasoning}`));
      console.log('');
    }

    if (suggestion.suggestedTeam && suggestion.suggestedTeam.length > 0) {
      ui.table(
        suggestion.suggestedTeam.map((t: any, i: number) => ({
          idx: i + 1,
          rank: t.rank || '-',
          id: t.employeeId,
          name: t.name,
          role: t.suggestedRole,
          util: `${t.suggestedUtilisation}%`,
          reason: t.reasoning,
        })),
        ['idx', 'rank', 'id', 'name', 'role', 'util', 'reason'],
        { idx: '#', rank: 'Rank', id: 'Emp ID', name: 'Employee', role: 'Suggested Role', util: 'Util%', reason: 'Reasoning' }
      );

      console.log('\nNote: Suggestions are AI-generated. Verify before confirming.');
      console.log('──────────────────────────────────────────────\n');

      while (true) {
        const { selection } = await inquirer.prompt([{
          type: 'input',
          name: 'selection',
          message: 'Select employee (enter #, or 0 to exit):',
          validate: (v) => {
            const num = parseInt(v, 10);
            if (isNaN(num) || num < 0 || num > suggestion.suggestedTeam.length) return 'Invalid selection';
            return true;
          }
        }]);

        if (selection === '0') break;

        const selectedIndex = parseInt(selection, 10) - 1;
        const emp = suggestion.suggestedTeam[selectedIndex];

        console.log(`\n── ${emp.name} ─────────────────────────────────`);
        
        let currentUtil = 0;
        try {
          const allocRes = await api.getEmployeeAllocations(emp.employeeId);
          currentUtil = allocRes.data.filter((a: any) => a.isActive).reduce((sum: number, a: any) => sum + a.utilisation, 0);
        } catch (e) {}

        console.log(`Current Utilisation: ${currentUtil}% ${currentUtil === 0 ? '  (fully on bench)' : ''}\n`);

        console.log('Set Allocation:');
        const answers = await inquirer.prompt([
          {
            type: 'number',
            name: 'utilisation',
            message: '  Utilisation %   :',
            default: emp.suggestedUtilisation || 50,
            validate: (v) => (v >= 1 && v <= 100) || 'Must be between 1 and 100',
          },
          {
            type: 'input',
            name: 'fromDate',
            message: '  From Date (DD-MM-YYYY):',
            validate: (v) => {
               const parts = v.split('-');
               if (parts.length !== 3) return 'Invalid format, use DD-MM-YYYY';
               return true;
            }
          },
          {
            type: 'input',
            name: 'toDate',
            message: '  To Date   (DD-MM-YYYY):',
            validate: (v) => {
               const parts = v.split('-');
               if (parts.length !== 3) return 'Invalid format, use DD-MM-YYYY';
               return true;
            }
          },
        ]);

        console.log('\nValidating...');
        const total = currentUtil + answers.utilisation;
        if (total > 100) {
           console.log(`  ${emp.name} total in this period: ${currentUtil}% + ${answers.utilisation}% = ${total}%   ❌ Invalid (Exceeds 100%)`);
           console.log('  Cannot proceed with this allocation.\n');
           continue;
        } else {
           console.log(`  ${emp.name} total in this period: ${currentUtil}% + ${answers.utilisation}% = ${total}%   ✓ Valid\n`);
        }

        const { confirm } = await inquirer.prompt([{
           type: 'list', loop: false,
           name: 'confirm',
           message: 'Action:',
           choices: [
             { name: '[C] Confirm Allocation', value: 'confirm' },
             { name: '[B] Back', value: 'back' }
           ]
        }]);

        if (confirm === 'confirm') {
           const parseDate = (d: string) => {
             const [day, month, year] = d.split('-');
             return `${year}-${month}-${day}`;
           };

           try {
             await api.createAllocation({
               employeeId: emp.employeeId,
               projectId: project._id,
               utilisation: answers.utilisation,
               fromDate: parseDate(answers.fromDate),
               toDate: parseDate(answers.toDate)
             });
             ui.success(`Allocation saved. ${emp.name} → ${project.name} (${answers.utilisation}%, ${answers.fromDate} to ${answers.toDate}) ✓\n`);
           } catch (e: any) {
             ui.error(`Failed to create allocation: ${e.response?.data?.message || e.message}\n`);
           }
        }
      }

    } else {
      ui.warn('No suitable team members found.');
    }

  } catch (err) {
    ui.error(err.message);
  }
};

const createAllocationScreen = async () => {
  ui.header('Allocate Employee');

  try {
    const project = await selectMyProject('Select target project:');
    if (!project) return;

    if (project.status !== 'ACTIVE' && project.status !== 'PLANNED') {
      ui.error(`Cannot allocate to ${project.status} project`);
      return;
    }

    const employee = await selectEmployee('Select employee to allocate:');
    if (!employee) return;

    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'utilisation',
        message: 'Utilisation percentage (1-100):',
        validate: (v) => (v >= 1 && v <= 100) || 'Must be between 1 and 100',
      },
      {
        type: 'input',
        name: 'fromDate',
        message: 'Start date (YYYY-MM-DD):',
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
      },
      {
        type: 'input',
        name: 'toDate',
        message: 'End date (YYYY-MM-DD):',
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
      },
    ]);

    await api.createAllocation({
      employeeId: employee._id,
      projectId: project._id,
      ...answers,
    });

    ui.success('Employee allocated successfully');
  } catch (err) {
    ui.error(err.message);
  }
};

const endAllocationScreen = async () => {
  try {
    const project = await selectMyProject('Select project to end an allocation on:');
    if (!project) return;

    const result = await api.getProjectAllocations(project._id);
    const allocations = result.data.filter((a) => a.isActive);

    if (allocations.length === 0) {
      ui.info('No active allocations on this project');
      return;
    }

    const { allocId } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'allocId',
        message: 'Select allocation to end:',
        choices: allocations.map((a) => ({
          name: `${a.employeeId.fullName} (${a.utilisation}%)`,
          value: a._id,
        })),
      },
    ]);

    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: 'End allocation today?', default: false },
    ]);

    if (confirm) {
      await api.endAllocation(allocId);
      ui.success('Allocation ended successfully');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Team Timesheets ──────────────────────────────────────────

const teamTimesheetsScreen = async () => {
  ui.header('Team Timesheets');

  try {
    const { weekStart } = await inquirer.prompt([
      {
        type: 'input',
        name: 'weekStart',
        message: 'Enter week start date (YYYY-MM-DD) or press enter for this week:',
        default: getMonday(new Date()).toISOString().split('T')[0],
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
      },
    ]);

    const result = await api.getTeamTimesheets(weekStart);
    const timesheets = result.data;

    if (timesheets.length === 0) {
      ui.info('No timesheets submitted by team members for this week');
      return;
    }

    ui.table(
      timesheets.map((t) => ({
        id: t._id,
        employee: t.resourceId?.fullName || t.employeeId?.fullName || 'N/A',
        dept: t.resourceId?.department || t.employeeId?.department || 'N/A',
        hours: t.totalHours,
        status: t.status,
        access: t.accessRequest?.status || 'NONE',
      })),
      ['id', 'employee', 'dept', 'hours', 'status', 'access'],
      { id: 'ID', employee: 'Employee', dept: 'Dept', hours: 'Hrs', status: 'Status', access: 'Access Req' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const reviewAccessScreen = async () => {
  ui.header('Review Timesheet Access Request');
  try {
    const response = await api.getPendingTimesheetRequests();
    const pendingRequests = response.data;

    if (!pendingRequests || pendingRequests.length === 0) {
      ui.info('There are no pending timesheet access requests from your team.');
      return;
    }

    const { timesheetId } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'timesheetId',
        message: 'Select a pending access request to review:',
        choices: pendingRequests.map((req) => ({
          name: `${req.resourceId?.fullName || 'Unknown'} - Week of ${req.weekStart.split('T')[0]} - Reason: ${req.accessRequest?.reason || 'No reason'}`,
          value: req._id,
        })),
      },
    ]);

    const { approved } = await inquirer.prompt([
      { type: 'confirm', name: 'approved', message: 'Approve access request?', default: false }
    ]);
    
    await api.reviewTimesheetAccess(timesheetId, { approved });
    ui.success(`Timesheet access request ${approved ? 'approved' : 'rejected'} successfully.`);
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Helpers ──────────────────────────────────────────────────

const selectMyProject = async (message) => {
  try {
    // Determine if the user is an admin by checking token
    const apiClient = require('../apiClient').default;
    const token = apiClient.getToken();
    let isAdmin = false;
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.role === 'ADMIN') isAdmin = true;
      } catch (e) {}
    }

    const result = isAdmin ? await api.listProjects() : await api.getMyManagerProjects();
    const projects = result.data;

    if (!projects || projects.length === 0) {
      ui.info(isAdmin ? 'No projects found.' : 'No projects found assigned to you.');
      return null;
    }

    const { projectId } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'projectId',
        message,
        choices: projects.map((p) => ({
          name: `${p.name} (${p.status})`,
          value: p._id,
        })),
      },
    ]);

    return projects.find((p) => p._id === projectId);
  } catch (err) {
    ui.error('Failed to load projects: ' + err.message);
    return null;
  }
};

const selectEmployee = async (message) => {
  try {
    const result = await api.getTeamEmployees();
    const employees = result.data.employees;

    if (employees.length === 0) {
      ui.info('No employees found in your team.');
      return null;
    }

    const { empId } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'empId',
        message,
        choices: employees.map((e) => ({
          name: `${e.fullName} — ${e.departmentId?.name || 'N/A'} (${e.resourceData?.status || 'N/A'}) - Util: ${e.resourceData?.currentUtilisation || 0}%`,
          value: e._id,
        })),
      },
    ]);

    return employees.find((e) => e._id === empId);
  } catch (err) {
    ui.error('Failed to load team employees: ' + err.message);
    return null;
  }
};

// Util
const getMonday = (d) => {
  d = new Date(d);
  var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

export { 
  managerMainMenu,
  resourceDashboardScreen,
  allocationsMenu,
  myProjectsScreen,
  managerTimesheetsMenu,
  aiAssistantMenu
};
