const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
};

const files = walk('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('BudgetContext')) {
    // Regex para achar a importação (pode ter níveis diferentes de diretório)
    // Ex: import { useBudget } from '../../context/BudgetContext'
    content = content.replace(
      /import\s+\{\s*([^}]*?)\s*useBudget\s*([^}]*?)\s*\}\s+from\s+['"](.+)\/context\/BudgetContext['"];?/g,
      (match, p1, p2, p3) => {
        return `import { ${p1}useBudget${p2} } from '${p3}/hooks/useBudget';`;
      }
    );
    
    // Tratando quando é '../context/BudgetContext'
    content = content.replace(
      /import\s+\{\s*useBudget\s*\}\s+from\s+['"]\.\.\/context\/BudgetContext['"];?/g,
      "import { useBudget } from '../hooks/useBudget';"
    );
    
    // Tratando quando é '../../context/BudgetContext'
    content = content.replace(
      /import\s+\{\s*useBudget\s*\}\s+from\s+['"]\.\.\/\.\.\/context\/BudgetContext['"];?/g,
      "import { useBudget } from '../../hooks/useBudget';"
    );
    
    fs.writeFileSync(file, content);
  }
});
