const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && f !== 'node_modules') {
      walk(p);
    } else if (p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      if (c.includes('export default new ;')) {
        let m = c.match(/class\s+([A-Za-z0-9_]+)\s*(?:extends|{)/);
        if (m) {
          let nc = c.replace('export default new ;', `export default new ${m[1]}();`);
          fs.writeFileSync(p, nc, 'utf8');
          console.log(`Fixed ${p}`);
        }
      }
    }
  });
}

walk('./backend');
console.log('Fixed class exports');
