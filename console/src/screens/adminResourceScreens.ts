import inquirer from 'inquirer';
import api from '../apiClient';
import ui from '../ui';

/**
 * Admin Employee Management Screens
 */

const resourceMenu = async () => {
  ui.header('Admin — Resource Management');

  const { action } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'action',
      message: 'Select an action:',
      choices: [
        { name: '📋 List all resources', value: 'list' },
        { name: '👤 View resource detail', value: 'detail' },
        { name: '✏️  Update resource', value: 'update' },
        { name: '🤝 Assign Manager', value: 'assign_manager' },
        { name: '🛠️  Manage skills', value: 'skills' },
        { name: '🔒 Deactivate resource', value: 'deactivate' },
        new inquirer.Separator(),
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  switch (action) {
    case 'list':
      await listEmployeesScreen();
      break;
    case 'assign_manager':
      await assignManagerScreen();
      break;
    case 'detail':
      await employeeDetailScreen();
      break;
    case 'update':
      await updateEmployeeScreen();
      break;
    case 'skills':
      await skillsMenu();
      break;
    case 'deactivate':
      await deactivateEmployeeScreen();
      break;
    case 'back':
      return;
  }

  return resourceMenu();
};

const listEmployeesScreen = async (currentStatusFilter: string = '', currentDeptFilter: string = '') => {
  try {
    const params: any = {};
    if (currentStatusFilter) params.status = currentStatusFilter;
    if (currentDeptFilter) params.department = currentDeptFilter;

    const result = await api.listEmployees(params);
    const { employees, counts } = result.data;

    let title = 'All Resources';
    if (currentStatusFilter || currentDeptFilter) {
      title = `Resources (Filter: ${[currentStatusFilter, currentDeptFilter].filter(Boolean).join(', ')})`;
    }
    ui.header(title);
    ui.info(`Total: ${counts.total} | Allocated: ${counts.allocated} | Bench: ${counts.bench}`);

    ui.table(
      employees.map((e) => ({
        name: e.fullName,
        department: e.departmentId?.name || 'N/A',
        designation: e.designationId?.title || 'N/A',
        status: e.resourceData?.status || 'N/A',
        utilisation: e.resourceData ? `${e.resourceData.currentUtilisation}%` : 'N/A',
        id: e._id,
      })),
      ['name', 'department', 'designation', 'status', 'utilisation', 'id'],
      {
        name: 'Name', department: 'Dept', designation: 'Designation',
        status: 'Status', utilisation: 'Util%', id: 'ID',
      }
    );

    const { action } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'action',
        message: 'Options:',
        choices: [
          { name: '🔍 Filter by Status', value: 'filter_status' },
          { name: '🏢 Filter by Department', value: 'filter_dept' },
          { name: '⬅️  Exit / Back', value: 'exit' },
        ],
      },
    ]);

    if (action === 'filter_status') {
      const { filterStatus } = await inquirer.prompt([
        {
          type: 'list', loop: false,
          name: 'filterStatus',
          message: 'Select status:',
          choices: [
            { name: 'All active', value: '' },
            { name: 'BENCH only', value: 'BENCH' },
            { name: 'ALLOCATED only', value: 'ALLOCATED' },
          ],
        },
      ]);
      return listEmployeesScreen(filterStatus, currentDeptFilter);
    }
    
    if (action === 'filter_dept') {
      const { filterDept } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filterDept',
          message: 'Enter Department Name (or leave blank for all):',
        },
      ]);
      return listEmployeesScreen(currentStatusFilter, filterDept);
    }
  } catch (err) {
    ui.error(err.message);
  }
};

const assignManagerScreen = async () => {
  try {
    const employee = await selectEmployee('Select resource to assign manager:');
    if (!employee) return;

    const usersResult = await api.listUsers();
    const managers = usersResult.data.users.filter(u => u.roleId?.name === 'MANAGER' && u.isActive);

    if (managers.length === 0) {
      ui.warn('No active managers found. Create a MANAGER user first.');
      return;
    }

    const { managerId } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'managerId',
        message: 'Select manager:',
        choices: managers.map(m => ({ name: `${m.fullName} (${m.username})`, value: m._id })),
      }
    ]);

    const { confirmAction } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'confirmAction',
        message: 'Options:',
        choices: [
          { name: '💾 Save', value: 'save' },
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (confirmAction === 'back') return;

    const axios = require('axios');
    const apiClient = require('../apiClient').default;
    const empId = employee.userId?._id || employee.userId || employee._id;
    await axios.put(`${process.env.API_URL || 'http://localhost:5000/api'}/admin/resources/${empId}/assign-manager`, { managerId }, { headers: { Authorization: `Bearer ${apiClient.getToken()}` } });
    
    ui.success('Manager assigned successfully.');
  } catch (err) {
    ui.error(err.response?.data?.message || err.message);
  }
};

const employeeDetailScreen = async () => {
  try {
    const { resourceId } = await inquirer.prompt([
      { type: 'input', name: 'resourceId', message: 'Enter Resource ID to view details:' }
    ]);
    if (!resourceId) return;

    let result;
    try {
      result = await api.getEmployee(resourceId);
    } catch (e) {
      ui.error('Resource not found');
      return;
    }
    const emp = result.data;

    const mappedEmp = {
      id: emp._id,
      fullName: emp.fullName,
      email: emp.email || 'N/A',
      department: emp.departmentId?.name || 'N/A',
      designation: emp.designationId?.title || 'N/A',
      status: emp.resourceData?.status || 'N/A',
      currentUtilisation: emp.resourceData ? `${emp.resourceData.currentUtilisation}%` : 'N/A',
    };

    ui.detail(mappedEmp, [
      { key: 'id', label: 'ID' },
      { key: 'fullName', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status' },
      { key: 'currentUtilisation', label: 'Utilisation' },
    ]);

    if (emp.skills.length > 0) {
      console.log('');
      ui.info('Skills:');
      ui.table(
        emp.skills.map((s) => ({
          name: s.skillId?.name || 'N/A',
          category: s.skillId?.categoryId?.name || 'N/A',
          proficiency: s.proficiency,
          id: s._id,
        })),
        ['name', 'category', 'proficiency', 'id'],
        { name: 'Skill', category: 'Category', proficiency: 'Level', id: 'Skill ID' }
      );
    } else {
      ui.info('No skills added yet');
    }

    await inquirer.prompt([{ type: 'input', name: 'back', message: 'Press Enter to go back' }]);
  } catch (err) {
    ui.error(err.message);
  }
};

const updateEmployeeScreen = async () => {
  try {
    const { resourceId } = await inquirer.prompt([
      { type: 'input', name: 'resourceId', message: 'Enter Resource ID to update:' }
    ]);
    if (!resourceId) return;

    const result = await api.listEmployees();
    const employee = result.data.employees.find((e) => e._id === resourceId);
    if (!employee) {
      ui.error('Resource not found');
      return;
    }

    const deptsResult = await api.listDepartments();
    const depts = deptsResult.data;

    const answers = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'departmentId',
        message: `Department (Currently: ${employee.departmentId?.name || 'N/A'}):`,
        choices: depts.map(d => ({ name: d.name, value: d._id })),
      },
    ]);

    const desigsResult = await api.listDesignations(answers.departmentId);
    const desigs = desigsResult.data;

    const desigAnswer = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'designationId',
        message: `Designation (Currently: ${employee.designationId?.title || 'N/A'}):`,
        choices: desigs.map(d => ({ name: d.title, value: d._id })),
      },
    ]);

    await api.updateEmployee(employee._id, {
      departmentId: answers.departmentId,
      designationId: desigAnswer.designationId,
    });
    ui.success('Resource updated');
  } catch (err) {
    ui.error(err.message);
  }
};

const deactivateEmployeeScreen = async () => {
  try {
    const { employeeId } = await inquirer.prompt([
      { type: 'input', name: 'employeeId', message: 'Enter Resource ID to deactivate:' }
    ]);

    const result = await api.listEmployees();
    const employee = result.data.employees.find(e => e._id === employeeId);

    if (!employee) {
      ui.error('Resource not found with that ID.');
      return;
    }

    const apiClient = require('../apiClient').default;
    const token = apiClient.getToken();
    let currentUser;
    if (token) {
      try {
        currentUser = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      } catch (e) {}
    }
    if (currentUser && currentUser.id === employee._id) {
      ui.error('You cannot deactivate yourself.');
      return;
    }

    const mappedEmp = {
      id: employee._id,
      fullName: employee.fullName,
      department: employee.departmentId?.name || 'N/A',
      status: employee.resourceData?.status || 'N/A',
    };

    ui.detail(mappedEmp, [
      { key: 'id', label: 'ID' },
      { key: 'fullName', label: 'Name' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
    ]);

    ui.warn(`This will end all allocations and deactivate the user account for ${employee.fullName}`);
    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: 'Are you sure?', default: false },
    ]);

    if (confirm) {
      await api.deactivateEmployee(mappedEmp.id);
      ui.success('Resource deactivated');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Skills Management ──────────────────────────────────────

const skillsMenu = async () => {
  try {
    const { resourceId } = await inquirer.prompt([
      { type: 'input', name: 'resourceId', message: 'Enter Resource ID for skills management:' }
    ]);
    if (!resourceId) return;

    const result = await api.listEmployees();
    const employee = result.data.employees.find((e) => e._id === resourceId);
    if (!employee) {
      ui.error('Resource not found');
      return;
    }
    const empId = employee._id;

  const runSkillsMenu = async () => {
    ui.header(`Skills — ${employee.fullName}`);

    const skillsResult = await api.getSkills(empId);
    const skills = skillsResult.data;

    if (skills.length > 0) {
      ui.table(
        skills.map((s) => ({ name: s.skillId?.name, category: s.skillId?.categoryId?.name || 'N/A', proficiency: s.proficiency, id: s.skillId?._id })),
        ['name', 'category', 'proficiency', 'id'],
        { name: 'Skill', category: 'Category', proficiency: 'Level', id: 'ID' }
      );
    } else {
      ui.info('No skills yet');
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'action',
        message: 'Action:',
        choices: [
          { name: '➕ Add skill', value: 'add' },
          { name: '✏️  Update proficiency', value: 'update' },
          { name: '🗑️  Remove skill', value: 'remove' },
          new inquirer.Separator(),
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'back') return;

    if (action === 'add') {
      const globalSkillsResult = await api.listGlobalSkills();
      const globalSkills = globalSkillsResult.data;

      if (globalSkills.length === 0) {
         ui.warn('No global skills defined. Please ask the administrator to define some first.');
         return runSkillsMenu();
      }

      const skill = await inquirer.prompt([
        { 
          type: 'list', loop: false, 
          name: 'skillId', 
          message: 'Select skill:', 
          choices: globalSkills.map(s => ({ name: s.name, value: s._id })) 
        },
        { 
          type: 'list', loop: false, 
          name: 'proficiency', 
          message: 'Proficiency:', 
          choices: ['BEGINNER', 'INTERMEDIATE', 'EXPERT'] 
        },
      ]);
      try {
        await api.addSkill(empId, skill);
        ui.success('Skill added');
      } catch (err) {
        ui.error(err.message);
      }
    }

    if (action === 'update' && skills.length > 0) {
      const { skillId } = await inquirer.prompt([
        {
          type: 'list', loop: false, name: 'skillId', message: 'Select skill:',
          choices: skills.map((s) => ({ name: `${s.skillId?.name} (${s.proficiency})`, value: s.skillId?._id })),
        },
      ]);
      const { proficiency } = await inquirer.prompt([
        { type: 'list', loop: false, name: 'proficiency', message: 'New proficiency:', choices: ['BEGINNER', 'INTERMEDIATE', 'EXPERT'] },
      ]);
      try {
        await api.updateSkillProficiency(empId, skillId, proficiency);
        ui.success('Proficiency updated');
      } catch (err) {
        ui.error(err.message);
      }
    }

    if (action === 'remove' && skills.length > 0) {
      const { skillId } = await inquirer.prompt([
        {
          type: 'list', loop: false, name: 'skillId', message: 'Select skill to remove:',
          choices: skills.map((s) => ({ name: s.skillId?.name, value: s.skillId?._id })),
        },
      ]);
      try {
        await api.removeSkill(empId, skillId);
        ui.success('Skill removed');
      } catch (err) {
        ui.error(err.message);
      }
    }

    return runSkillsMenu();
  };

  return runSkillsMenu();
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Helper: Employee picker ─────────────────────────────────

const selectEmployee = async (message) => {
  const result = await api.listEmployees();
  const employees = result.data.employees;

  if (employees.length === 0) {
    ui.info('No resources found');
    return null;
  }

  const { empId } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'empId',
      message,
      choices: employees.map((e) => ({
        name: `${e.fullName} — ${e.departmentId?.name || 'N/A'} (${e.resourceData?.status || 'N/A'})`,
        value: e._id,
      })),
    },
  ]);

  return employees.find((e) => e._id === empId);
};

export { resourceMenu as employeeMenu };
