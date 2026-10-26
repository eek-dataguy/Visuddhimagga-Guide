const fs = require('fs');

function scanFile(filePath) {
  console.log(`=== Scanning ${filePath} ===`);
  const content = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    // If not JSON, scan lines
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      // ignore script tags, imports, css class names, code
      if (l.includes('class=') || l.includes('import ') || l.includes('const ') || l.includes('//') || l.includes('<svg')) return;
      const matches = l.match(/[a-zA-Z]{4,}/g);
      if (matches) {
        const filtered = matches.filter(w => !['https', 'http', 'tripitaka82', 'read', 'html', 'book', 'page', 'stroke', 'width', 'viewBox', 'round', 'none', 'fill', 'currentColor', 'style', 'margin', 'font', 'size', 'color', 'line', 'display', 'flex', 'text', 'section', 'button', 'span', 'header', 'active', 'container', 'mobile'].includes(w.toLowerCase()));
        if (filtered.length > 0) {
          console.log(`Line ${idx + 1}: ${filtered.join(', ')} -> ${l.trim().substring(0, 60)}`);
        }
      }
    });
    return;
  }

  function findLatin(obj, path = '') {
    for (let k in obj) {
      const val = obj[k];
      const currentPath = path ? `${path}.${k}` : k;
      if (typeof val === 'string') {
        if (['id', 'tripitakaUrl', 'tripitakaVol', 'catId', 'key'].includes(k)) continue;
        const matches = val.match(/[a-zA-Z]{3,}/g);
        if (matches) {
          const filtered = matches.filter(w => !['http', 'https', 'www', 'tripitaka82', 'com', 'read', 'html', 'book', 'page'].includes(w.toLowerCase()));
          if (filtered.length > 0) {
            console.log(`${currentPath}: [${filtered.join(', ')}] -> "${val.substring(0, 60)}..."`);
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        findLatin(val, currentPath);
      }
    }
  }

  findLatin(data);
}

scanFile('data/panna_namarupa.json');
scanFile('data/samadhi_methods.json');
