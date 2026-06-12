declare var process: any;
import mongoose from 'mongoose';
import AiService from './src/services/AiService';

mongoose.connect('mongodb://localhost:27017/prm_tool').then(async () => {
  try {
    const res = await AiService.teamSearch('Need 1 React developer', 'dummy');
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
});
