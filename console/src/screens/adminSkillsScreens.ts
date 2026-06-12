import inquirer from 'inquirer';
import api from '../apiClient';
import ui from '../ui';

const globalSkillsMenu = async () => {
  ui.header('Admin — Global Skills Management');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an action:',
      choices: [
        { name: '📋 List Skill Categories', value: 'list_categories' },
        { name: '➕ Create Skill Category', value: 'create_category' },
        { name: '📋 List Skills', value: 'list_skills' },
        { name: '➕ Create Skill', value: 'create_skill' },
        new inquirer.Separator(),
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  switch (action) {
    case 'list_categories':
      await listSkillCategoriesScreen();
      break;
    case 'create_category':
      await createSkillCategoryScreen();
      break;
    case 'list_skills':
      await listSkillsScreen();
      break;
    case 'create_skill':
      await createSkillScreen();
      break;
    case 'back':
      return;
  }

  return globalSkillsMenu();
};

const listSkillCategoriesScreen = async () => {
  try {
    const result = await api.listSkillCategories();
    const categories = result.data;
    
    if (categories.length === 0) {
      ui.info('No categories found.');
      return;
    }

    ui.table(
      categories.map(c => ({ name: c.name, id: c._id })),
      ['name', 'id'],
      { name: 'Category Name', id: 'ID' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const createSkillCategoryScreen = async () => {
  try {
    const { name } = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Category Name:', validate: v => v.length > 0 || 'Required' }
    ]);
    await api.createSkillCategory({ name });
    ui.success('Category created');
  } catch (err) {
    ui.error(err.message);
  }
};

const listSkillsScreen = async () => {
  try {
    const result = await api.listGlobalSkills();
    const skills = result.data;
    
    if (skills.length === 0) {
      ui.info('No skills found.');
      return;
    }

    ui.table(
      skills.map(s => ({ name: s.name, category: s.categoryId?.name, id: s._id })),
      ['name', 'category', 'id'],
      { name: 'Skill Name', category: 'Category', id: 'ID' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const createSkillScreen = async () => {
  try {
    const catResult = await api.listSkillCategories();
    const categories = catResult.data;

    if (categories.length === 0) {
      ui.warn('Please create a skill category first.');
      return;
    }

    const { name, categoryId } = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Skill Name:', validate: v => v.length > 0 || 'Required' },
      { type: 'list', name: 'categoryId', message: 'Select Category:', choices: categories.map(c => ({ name: c.name, value: c._id })) }
    ]);

    await api.createGlobalSkill({ name, categoryId });
    ui.success('Skill created');
  } catch (err) {
    ui.error(err.message);
  }
};

export { globalSkillsMenu };
