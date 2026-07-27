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

  // Clean up JSX attributes like gymSlug={} or gymSlug={gymSlug}
  content = content.replace(/gymSlug=\{[^}]*\}/g, '');
  content = content.replace(/gymSlug="[^"]*"/g, '');
  
  // Also clean up loose gymSlug references causing Cannot find name 'gymSlug'
  content = content.replace(/if\s*\(\!gymSlug\)\s*return;/g, '');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated more TS errors in ${filePath}`);
  }
});

console.log("Done fixing more TS errors!");
