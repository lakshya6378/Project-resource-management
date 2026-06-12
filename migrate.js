const fs = require('fs');
const path = require('path');

const DIRS_TO_PROCESS = ['backend', 'console'];

// Simple AST-less regex replacements for common require/exports patterns
function convertSyntax(content) {
  let newContent = content;

  // 1. const { a, b } = require('foo'); -> import { a, b } from 'foo';
  newContent = newContent.replace(
    /const\s+(\{[\s\S]*?\})\s*=\s*require\((['"`])([^'"`]+)\2\);?/g,
    "import $1 from '$3';"
  );

  // 2. const x = require('foo'); -> import x from 'foo';
  newContent = newContent.replace(
    /const\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"`])([^'"`]+)\2\);?/g,
    "import $1 from '$3';"
  );

  // 3. module.exports = { a, b }; -> export { a, b };
  newContent = newContent.replace(
    /module\.exports\s*=\s*(\{[\s\S]*?\});?/g,
    "export $1;"
  );

  // 4. module.exports = x; -> export default x;
  // This might conflict with the one above, but it runs after, so the `{}` matches first.
  newContent = newContent.replace(
    /module\.exports\s*=\s*([a-zA-Z0-9_()]+);?/g,
    "export default $1;"
  );

  // 5. router.get(...) with const router = express.Router();
  // Instead of default export for router, if the file ends with `module.exports = router;`
  // it becomes `export default router;` which works with `import router from './router'`

  return newContent;
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'coverage') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(path.join(dir, f));
    }
  });
}

DIRS_TO_PROCESS.forEach((baseDir) => {
  const dirPath = path.join(__dirname, baseDir);
  console.log(`Processing directory: ${dirPath}`);
  
  walkDir(dirPath, (filePath) => {
    if (filePath.endsWith('.js') && !filePath.includes('node_modules')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const newContent = convertSyntax(content);
      
      const newFilePath = filePath.replace(/\.js$/, '.ts');
      
      // Rename file
      fs.unlinkSync(filePath);
      fs.writeFileSync(newFilePath, newContent, 'utf8');
      
      console.log(`Migrated: ${filePath} -> ${newFilePath}`);
    }
  });
});

console.log('Done!');
