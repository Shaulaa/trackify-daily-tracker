/**
 * CSS Minifier untuk Trackify
 * Usage: node minify-css.js <input.css> <output.min.css>
 */

const fs = require('fs');
const path = require('path');
const csso = require('csso');

const [,, inputFile, outputFile] = process.argv;

if (!inputFile || !outputFile) {
  console.error('❌ Usage: node minify-css.js <input.css> <output.min.css>');
  process.exit(1);
}

try {
  const inputPath = path.resolve(process.cwd(), inputFile);
  const outputPath = path.resolve(process.cwd(), outputFile);
  
  console.log(`📦 Minifying: ${inputFile}`);
  
  const css = fs.readFileSync(inputPath, 'utf8');
  const originalSize = Buffer.byteLength(css, 'utf8');
  
  const result = csso.minify(css, {
    restructure: true,
    comments: false
  });
  
  const minifiedSize = Buffer.byteLength(result.css, 'utf8');
  const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
  
  fs.writeFileSync(outputPath, result.css, 'utf8');
  
  console.log(`✅ ${outputFile}`);
  console.log(`   ${(originalSize / 1024).toFixed(2)}KB → ${(minifiedSize / 1024).toFixed(2)}KB (${savings}% smaller)`);
} catch (error) {
  console.error('❌ Minification failed:', error.message);
  process.exit(1);
}
