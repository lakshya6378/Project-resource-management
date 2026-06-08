const inquirer = require('inquirer');
const api = require('../apiClient');
const ui = require('../ui');

/**
 * Admin System Configuration Screen
 */

const configMenu = async () => {
  ui.header('Admin — System Configuration');

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
        message: 'What would you like to do?',
        choices: [
          { name: '✏️  Edit Configuration', value: 'edit' },
          { name: '⚡ Trigger Scheduler Manually', value: 'trigger' },
          new inquirer.Separator(),
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    switch (action) {
      case 'edit':
        await editConfigScreen(config);
        break;
      case 'trigger':
        await api.triggerScheduler();
        ui.success('Scheduler jobs triggered successfully in the background');
        break;
      case 'back':
        return;
    }
  } catch (err) {
    ui.error(err.message);
  }
};

const editConfigScreen = async (config) => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'llmProvider',
        message: `LLM Provider (${config.llmProvider}):`,
        choices: ['GEMINI', 'GROQ'],
        default: config.llmProvider,
      },
      {
        type: 'input',
        name: 'llmApiKey',
        message: 'API Key (leave empty to keep current):',
      },
      {
        type: 'number',
        name: 'schedulerIntervalHours',
        message: `Scheduler interval in hours (${config.schedulerIntervalHours}):`,
        default: config.schedulerIntervalHours,
        validate: (v) => v >= 1 || 'Must be at least 1',
      },
      {
        type: 'number',
        name: 'maxWeeklyHours',
        message: `Max weekly hours (${config.maxWeeklyHours}):`,
        default: config.maxWeeklyHours,
        validate: (v) => (v >= 1 && v <= 168) || 'Must be 1-168',
      },
    ]);

    // Remove empty API key to keep current
    const updateData = { ...answers };
    if (!updateData.llmApiKey) {
      delete updateData.llmApiKey;
    }

    await api.updateConfig(updateData);
    ui.success('Configuration updated');
  } catch (err) {
    ui.error(err.message);
  }
};

module.exports = { configMenu };
