const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\Alexandre\\Documents\\AnimalMind\\server';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.ts'));

files.forEach(f => {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf8');
  const targetRegex = /single:\s*vi\.fn\(\)\.mockImplementation\(\(\)\s*=>\s*\{\s*if\s*\(table\s*===\s*"users"\)\s*\{\s*return\s*Promise\.resolve\(\{\s*data:\s*\{\s*id:\s*1\s*\},\s*error:\s*null\s*\}\);\s*\}\s*return\s*Promise\.resolve\(\{\s*data:\s*null,\s*error:\s*null\s*\}\);\s*\}\),/g;
  
  if (targetRegex.test(content)) {
    console.log('Fixing', f);
    content = content.replace(targetRegex, `single: vi.fn().mockImplementation(() => {
            if (table === "users") {
              return Promise.resolve({ data: { id: 1 }, error: null });
            }
            if (table === "animals") {
              return Promise.resolve({ data: { id: 1, user_id: 1, name: "Bobi", species: "dog" }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),`);
    fs.writeFileSync(fp, content);
  }
});
