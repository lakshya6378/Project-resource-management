import inquirer from 'inquirer';
import api from '../apiClient';
import ui from '../ui';

/**
 * Admin Allocation Management Screens
 */

const listAllAllocationsScreen = async (filterText: string = '') => {
  try {
    const result = await api.listAllAllocations();
    let allocations = result.data;

    ui.header(filterText ? `All Allocations (Filter: ${filterText})` : 'All Allocations');

    if (allocations.length === 0) {
      ui.info('No allocations found.');
    } else {
      if (filterText) {
        allocations = allocations.filter((a) => {
          const emp = a.resourceId?.fullName || '';
          const proj = a.projectId?.name || '';
          return emp.toLowerCase().includes(filterText.toLowerCase()) || 
                 proj.toLowerCase().includes(filterText.toLowerCase());
        });
      }

      ui.table(
        allocations.map((a) => ({
          employee: a.resourceId?.fullName || 'N/A',
          project: a.projectId?.name || 'N/A',
          util: `${a.utilisation}%`,
          from: new Date(a.fromDate).toLocaleDateString(),
          to: new Date(a.toDate).toLocaleDateString(),
        })),
        ['employee', 'project', 'util', 'from', 'to'],
        { employee: 'Employee', project: 'Project', util: '%', from: 'From', to: 'To' }
      );
      
      console.log(`\nTotal Active Allocations: ${allocations.filter((a) => a.isActive).length}`);
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list', loop: false,
        name: 'action',
        message: 'Options:',
        choices: [
          { name: '🔍 Filter by Employee / Project', value: 'filter' },
          { name: '⬅️  Exit / Back', value: 'exit' },
        ],
      },
    ]);

    if (action === 'filter') {
      const { text } = await inquirer.prompt([
        {
          type: 'input',
          name: 'text',
          message: 'Enter name of employee or project to filter by (or leave blank to clear):',
        },
      ]);
      return listAllAllocationsScreen(text);
    }
  } catch (err) {
    ui.error(err.message);
  }
};

export { listAllAllocationsScreen };
