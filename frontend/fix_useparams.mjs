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

  // Remove `const { gymSlug } = useParams() as { gymSlug: string };`
  content = content.replace(/const\s+\{\s*gymSlug\s*\}\s*=\s*useParams\(\)(?:\s*as\s*\{\s*gymSlug\s*:\s*string\s*\})?\s*;/g, '');
  content = content.replace(/const\s+\{\s*gymSlug\s*\}\s*=\s*useParams\(\)\s*;/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated useParams in ${filePath}`);
  }
});

console.log("Done updating frontend useParams!");
