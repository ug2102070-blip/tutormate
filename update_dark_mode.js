const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

const replacements = {
  // Backgrounds
  'bg-white': 'bg-white dark:bg-[#1e1e2e]',
  'bg-slate-50/50': 'bg-slate-50/50 dark:bg-[#13131f]/50',
  'bg-slate-50/40': 'bg-slate-50/40 dark:bg-[#13131f]/40',
  'bg-slate-50': 'bg-slate-50 dark:bg-[#13131f]',
  'bg-slate-100/70': 'bg-slate-100/70 dark:bg-[#252535]/70',
  'bg-slate-100': 'bg-slate-100 dark:bg-[#252535]',
  'bg-slate-200/60': 'bg-slate-200/60 dark:bg-[#2d2d40]/60',
  'bg-slate-200': 'bg-slate-200 dark:bg-[#2d2d40]',
  'bg-indigo-50/70': 'bg-indigo-50/70 dark:bg-indigo-500/10',
  'bg-indigo-50': 'bg-indigo-50 dark:bg-indigo-500/10',
  'bg-indigo-100': 'bg-indigo-100 dark:bg-indigo-500/20',

  // Text colors
  'text-slate-900': 'text-slate-900 dark:text-slate-100',
  'text-slate-800': 'text-slate-800 dark:text-slate-200',
  'text-slate-700': 'text-slate-700 dark:text-slate-300',
  'text-slate-600': 'text-slate-600 dark:text-slate-400',
  'text-slate-500': 'text-slate-500 dark:text-slate-400',
  
  // Borders
  'border-slate-200': 'border-slate-200 dark:border-white/10',
  'border-slate-100': 'border-slate-100 dark:border-white/5',
  
  // Status Colors (Amber/Emerald/Red)
  'bg-amber-50': 'bg-amber-50 dark:bg-amber-500/10',
  'text-amber-700': 'text-amber-700 dark:text-amber-400',
  'border-amber-200': 'border-amber-200 dark:border-amber-500/20',
  
  'bg-emerald-50': 'bg-emerald-50 dark:bg-emerald-500/10',
  'text-emerald-700': 'text-emerald-700 dark:text-emerald-400',
  'border-emerald-200': 'border-emerald-200 dark:border-emerald-500/20',
  
  'bg-red-50': 'bg-red-50 dark:bg-red-500/10',
  'text-red-600': 'text-red-600 dark:text-red-400',
  'border-red-200': 'border-red-200 dark:border-red-500/20',
};

// Sort replacements by length descending to prevent partial replacements (e.g. bg-slate-50 inside bg-slate-50/50)
const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // We need to be careful with string replacements to only replace whole class names.
      // Use regex with word boundaries or space boundaries.
      for (const key of sortedKeys) {
        // match key if it's surrounded by quotes, spaces, or backticks
        // this regex ensures we only match the exact tailwind class
        // e.g. "bg-white " or 'bg-white' or `bg-white`
        const regex = new RegExp(`(?<=["'\`\\s])${key.replace(/\//g, '\\/')}(?=["'\`\\s])`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, replacements[key]);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(dir);
console.log('Done!');
