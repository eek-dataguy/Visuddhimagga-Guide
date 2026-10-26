const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
const stack = [];

lines.forEach((line, idx) => {
  const m = line.match(/<section[^>]*id=["']([^"']+)["']/);
  if (m) {
    stack.push({ line: idx + 1, id: m[1] });
    console.log(`OPEN  <section id="${m[1]}"> at line ${idx + 1}`);
  }
  if (line.includes('</section>')) {
    const last = stack.pop();
    console.log(`CLOSE </section> at line ${idx + 1} (closed: ${last ? last.id : 'NONE'} from line ${last ? last.line : '?'})`);
  }
});

console.log('\nUnclosed sections:', stack);
