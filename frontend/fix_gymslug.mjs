import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) {
        callback(dirPath);
      }
    }
  });
}

const rootDir = 'd:/Desktop/Projects/gym/frontend';

walkDir(rootDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace /api/dashboard/${gymSlug}/ with /api/dashboard/
  content = content.replace(/\/api\/dashboard\/\$\{gymSlug\}\//g, '/api/dashboard/');
  content = content.replace(/\/api\/dashboard\/\$\{gymSlug\}/g, '/api/dashboard');
  
  // Replace /dashboard/${gymSlug}/ with /dashboard/
  content = content.replace(/\/dashboard\/\$\{gymSlug\}\//g, '/dashboard/');
  content = content.replace(/\/dashboard\/\$\{gymSlug\}/g, '/dashboard');

  // Same for params.gymSlug
  content = content.replace(/\/dashboard\/\$\{params\.gymSlug\}\//g, '/dashboard/');
  content = content.replace(/\/dashboard\/\$\{params\.gymSlug\}/g, '/dashboard');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});

console.log("Done updating frontend routes!");
