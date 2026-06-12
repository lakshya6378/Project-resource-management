import inquirer from 'inquirer';
import api from '../apiClient';
import ui from '../ui';

/**
 * Admin System Configuration Screen
 */

const configMenu = async () => {
  let stay = true;
  while (stay) {
    console.clear();
    ui.header('System Configuration');

    try {
      const result = await api.getConfig();
      const config = result.data;

      ui.detail(config, [
        { key: 'llmProvider', label: 'LLM Provider' },
        { key: 'llmApiKey', label: 'API Key' },
        { key: 'schedulerIntervalHours', label: 'Scheduler Interval (hours)' },
        { key: 'maxWeeklyHours', label: 'Max Weekly Hours' },
      ]);

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Select an option:',
          choices: [
            { name: '1. Update LLM API Key', value: 'api_key' },
            { name: '2. Change LLM Provider  (Gemini / Groq)', value: 'provider' },
            { name: '3. Update Scheduler Interval', value: 'interval' },
            { name: '4. Update Max Weekly Hours', value: 'hours' },
            { name: '5. Back', value: 'back' },
          ],
        },
      ]);

      if (action === 'back') {
        stay = false;
        continue;
      }

      let updateData: any = {};
      if (action === 'api_key') {
        const { llmApiKey } = await inquirer.prompt([{ type: 'input', name: 'llmApiKey', message: 'Enter new LLM API Key:' }]);
        if (llmApiKey) updateData.llmApiKey = llmApiKey;
      } else if (action === 'provider') {
        const { llmProvider } = await inquirer.prompt([{ type: 'list', name: 'llmProvider', message: 'Select LLM Provider:', choices: ['GEMINI', 'GROQ', 'LOCAL_GEMMA'], default: config.llmProvider }]);
        let llmApiKey = config.llmApiKey;
        
        const ans = await inquirer.prompt([{ type: 'input', name: 'llmApiKey', message: `Enter ${llmProvider} API Key (leave empty to keep current):` }]);
        if (ans.llmApiKey) llmApiKey = ans.llmApiKey;

        updateData.llmProvider = llmProvider;
        updateData.llmApiKey = llmApiKey;
      } else if (action === 'interval') {
        const { schedulerIntervalHours } = await inquirer.prompt([{ type: 'number', name: 'schedulerIntervalHours', message: 'Enter Scheduler Interval (hours):', default: config.schedulerIntervalHours }]);
        updateData.schedulerIntervalHours = schedulerIntervalHours;
      } else if (action === 'hours') {
        const { maxWeeklyHours } = await inquirer.prompt([{ type: 'number', name: 'maxWeeklyHours', message: 'Enter Max Weekly Hours:', default: config.maxWeeklyHours }]);
        updateData.maxWeeklyHours = maxWeeklyHours;
      }

      if (Object.keys(updateData).length > 0) {
        await api.updateConfig(updateData);
        ui.success('Configuration updated successfully');
        await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
        stay = false; // Exit back to main menu after updating
      }
    } catch (err) {
      ui.error(err.message);
      await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
    }
  }
};

export { configMenu };
