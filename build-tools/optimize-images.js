/**
 * Image Optimizer untuk Trackify
 * Compress PNG images dengan Sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG_DIR = path.resolve(__dirname, '../img');

const imagesToOptimize = [
  'favicon.png',
  'logo-pwa-dark-192.png',
  'logo-pwa-dark-512.png',
  'logo-pwa-light-192.png',
  'logo-pwa-light-512.png',
  'logo-trackify_lightmode.png',
  'logo_trackify_darkmodet.png'
];

async function optimizeImage(filename) {
  const inputPath = path.join(IMG_DIR, filename);
  const outputPath = path.join(IMG_DIR, filename.replace(/\.png$/, '.optimized.png'));
  
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Skip: ${filename} (not found)`);
    return;
  }
  
  try {
    const inputStats = fs.statSync(inputPath);
    const originalSize = inputStats.size;
    
    await sharp(inputPath)
      .png({ 
        compressionLevel: 9,
        quality: 90,
        adaptiveFiltering: true
      })
      .toFile(outputPath);
    
    const outputStats = fs.statSync(outputPath);
    const optimizedSize = outputStats.size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    // Jika lebih kecil, replace original
    if (optimizedSize < originalSize) {
      fs.renameSync(outputPath, inputPath);
      console.log(`✅ ${filename}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${savings}% smaller)`);
    } else {
      fs.unlinkSync(outputPath);
      console.log(`⚠️  ${filename}: Skipped (optimization didn't reduce size)`);
    }
  } catch (error) {
    console.error(`❌ ${filename}: ${error.message}`);
  }
}

(async () => {
  console.log('🖼️  Optimizing images...\n');
  
  for (const filename of imagesToOptimize) {
    await optimizeImage(filename);
  }
  
  console.log('\n✨ Image optimization complete!');
})();
