/**
 * JavaScript Minifier untuk Trackify
 * Usage: node minify-js.js <input.js> <output.min.js>
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const [,, inputFile, outputFile] = process.argv;

if (!inputFile || !outputFile) {
  console.error('❌ Usage: node minify-js.js <input.js> <output.min.js>');
  process.exit(1);
}

(async () => {
  try {
    const inputPath = path.resolve(process.cwd(), inputFile);
    const outputPath = path.resolve(process.cwd(), outputFile);
    
    console.log(`📦 Minifying: ${inputFile}`);
    
    const code = fs.readFileSync(inputPath, 'utf8');
    const originalSize = Buffer.byteLength(code, 'utf8');
    
    const result = await minify(code, {
      compress: {
        dead_code: true,
        drop_console: false, // Keep console untuk debugging
        drop_debugger: true,
        keep_infinity: true,
        passes: 2
      },
      mangle: {
        // Jangan mangle nama yang di-export untuk ES modules
        reserved: ['loginWithGoogle', 'logoutUser', 'onAuthChange', 'getCurrentUser', 
                   'addItem', 'getItems', 'updateItem', 'deleteItem', 'deleteAllItems',
                   'replaceCollection', 'getStreak', 'updateStreak', 'achieveMilestone',
                   'initNotifications', 'setAppState', 'setCurrentUser', 'getPermissionStatus',
                   'enableNotifications', 'disableNotifications', 'updateTypePrefs', 
                   'updateDeadlinePrefs', 'testNotification', 'renderNotifSettings',
                   'clearNotifHistoryUI', 'getPrefs', 'getNotificationHistorySync']
      },
      format: {
        comments: false,
        preamble: `/* Trackify v2.6.0 - Minified ${new Date().toISOString()} */`
      },
      sourceMap: false,
      module: true // Preserve ES module syntax
    });
    
    if (result.error) {
      throw result.error;
    }
    
    const minifiedSize = Buffer.byteLength(result.code, 'utf8');
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
    
    fs.writeFileSync(outputPath, result.code, 'utf8');
    
    console.log(`✅ ${outputFile}`);
    console.log(`   ${(originalSize / 1024).toFixed(2)}KB → ${(minifiedSize / 1024).toFixed(2)}KB (${savings}% smaller)`);
  } catch (error) {
    console.error('❌ Minification failed:', error.message);
    process.exit(1);
  }
})();
