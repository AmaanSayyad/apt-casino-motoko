const fs = require('fs');
const path = require('path');

const roots = [
  path.join(__dirname, '..', 'src'),
  path.join(__dirname, '..', 'deploy', 'frontend'),
];

const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.md', '.html']);

function shouldProcess(file) {
  const ext = path.extname(file);
  return exts.has(ext);
}

function replaceContent(content) {
  // UI-only replacements (avoid breaking imports):
  // 1) 'Aptos' -> 'ICP' (case-sensitive capitalized)
  content = content.replace(/\bAptos\b/g, 'ICP');
  // 2) token symbol 'APT' -> 'APTC' (standalone word)
  content = content.replace(/\bAPT\b/g, 'APTC');
  // 3) 'Cycles' (UI text) -> 'APTC'
  content = content.replace(/\bCycles\b/g, 'APTC');
  // 4) Branding: 'APTC-Casino' -> 'APT-Casino'
  content = content.replace(/APTC-Casino/g, 'APT-Casino');
  // 5) Branding: 'APTC Casino' -> 'APT Casino'
  content = content.replace(/APTC Casino/g, 'APT Casino');
  return content;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (shouldProcess(full)) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const files = walk(root);
    for (const file of files) {
      const old = fs.readFileSync(file, 'utf8');
      const neu = replaceContent(old);
      if (old !== neu) {
        fs.writeFileSync(file, neu, 'utf8');
        console.log('Updated:', path.relative(process.cwd(), file));
      }
    }
  }
  console.log('Branding replacements completed.');
}

if (require.main === module) {
  main();
}
