import * as fs from 'fs';
import * as path from 'path';

function checkDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"](\.[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const dirOfFile = path.dirname(fullPath);
        
        // 확장자가 없는 경우 .ts, .tsx, .d.ts, /index.ts 등 확인
        const possibleExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
        let found = false;
        let matchedActualName = '';

        for (const ext of possibleExtensions) {
          const candidate = path.resolve(dirOfFile, importPath + ext);
          if (fs.existsSync(candidate)) {
            // 실제 파일시스템상의 대소문자와 일치하는지 확인 (Linux 호환성)
            const parentDir = path.dirname(candidate);
            const baseName = path.basename(candidate);
            const actualFiles = fs.readdirSync(parentDir);
            if (actualFiles.includes(baseName)) {
              found = true;
              matchedActualName = candidate;
              break;
            } else {
              console.error(`❌ [CASE MISMATCH] File: ${fullPath}`);
              console.error(`   Imported: ${importPath}`);
              console.error(`   Expected exact case: ${baseName}, but filesystem has: ${actualFiles.find(f => f.toLowerCase() === baseName.toLowerCase())}`);
            }
          }
        }

        if (!found) {
          console.error(`❌ [MODULE NOT FOUND] File: ${fullPath}`);
          console.error(`   Imported: ${importPath}`);
        }
      }
    }
  }
}

console.log('--- Checking src directory for Linux import compatibility ---');
checkDirectory(path.resolve(process.cwd(), 'src'));
console.log('--- Check complete ---');
