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

  // Clean up useEffect dependency arrays
  content = content.replace(/,\s*gymSlug\s*\]/g, ']');
  content = content.replace(/\[\s*gymSlug\s*\]/g, '[]');
  content = content.replace(/\[\s*gymSlug\s*,/g, '[');

  // Clean up interface props
  content = content.replace(/gymSlug\s*:\s*string\s*;/g, '');
  
  // Clean up function parameters (e.g. { gymSlug, ... } or gymSlug,)
  content = content.replace(/,\s*gymSlug/g, '');
  content = content.replace(/gymSlug\s*,/g, '');
  
  // Clean up component definitions where it might be left alone like { gymSlug }
  content = content.replace(/\{\s*gymSlug\s*\}/g, '{}');

  // Fix dashboard/page.tsx router issue
  if (filePath.replace(/\\/g, '/').includes('dashboard/dashboard/page.tsx')) {
    if (!content.includes('useRouter')) {
      content = content.replace("import { useParams } from 'next/navigation';", "import { useParams, useRouter } from 'next/navigation';");
    }
    if (!content.includes('const router = useRouter();')) {
      content = content.replace('export default function Dashboard() {', 'export default function Dashboard() {\n  const router = useRouter();');
      content = content.replace('export default function DashboardPage() {', 'export default function DashboardPage() {\n  const router = useRouter();');
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated TS errors in ${filePath}`);
  }
});

console.log("Done fixing TS errors!");
