import fs from 'fs';
import path from 'path';

const routesDir = 'd:/Desktop/Projects/gym/backend/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to match things like:
  // const { gymSlug } = req.params;
  // const { gymSlug, id } = req.params;
  // const { id, gymSlug } = req.params;
  // It handles multiple variables and replaces `gymSlug` with `req.gym.slug` correctly.
  
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*req\.params\s*;/g, (match, varsStr) => {
    const vars = varsStr.split(',').map(v => v.trim()).filter(Boolean);
    if (vars.includes('gymSlug')) {
      const otherVars = vars.filter(v => v !== 'gymSlug');
      let replacement = `const gymSlug = req.gym.slug;`;
      if (otherVars.length > 0) {
        replacement += `\n  const { ${otherVars.join(', ')} } = req.params;`;
      }
      return replacement;
    }
    return match;
  });

  // Also replace `let { gymSlug } = req.params;` just in case
  content = content.replace(/let\s+\{([^}]+)\}\s*=\s*req\.params\s*;/g, (match, varsStr) => {
    const vars = varsStr.split(',').map(v => v.trim()).filter(Boolean);
    if (vars.includes('gymSlug')) {
      const otherVars = vars.filter(v => v !== 'gymSlug');
      let replacement = `let gymSlug = req.gym.slug;`;
      if (otherVars.length > 0) {
        replacement += `\n  let { ${otherVars.join(', ')} } = req.params;`;
      }
      return replacement;
    }
    return match;
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log("Done updating routes!");
