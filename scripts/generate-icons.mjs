import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const sourcePathArg = process.argv[2];
const defaultSource = path.resolve('public/brand/logo.png');
const source = sourcePathArg ? path.resolve(sourcePathArg) : defaultSource;

const outputDir = path.resolve('public');

async function generateIcons() {
  if (!fs.existsSync(source)) {
    console.error(`Source logo not found at: ${source}`);
    console.log('Provide path via: node scripts/generate-icons.mjs <path-to-logo>');
    process.exit(1);
  }

  console.log(`Generating icon assets from: ${source}`);

  // 1. 16x16 Favicon
  await sharp(source)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('✓ Generated favicon-16x16.png');

  // 2. 32x32 Favicon
  await sharp(source)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));
  console.log('✓ Generated favicon-32x32.png');

  // 3. Apple Touch Icon (180x180)
  await sharp(source)
    .resize(180, 180, { fit: 'contain', background: { r: 14, g: 30, b: 59, alpha: 1 } }) // Navy background for apple touch icon
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png (180x180)');

  // 4. Android / PWA Icon 192x192
  await sharp(source)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));
  console.log('✓ Generated icon-192.png (192x192)');

  // 5. Android / PWA Icon 512x512
  await sharp(source)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));
  console.log('✓ Generated icon-512.png (512x512)');

  // 6. Copy 32x32 to favicon.ico
  fs.copyFileSync(path.join(outputDir, 'favicon-32x32.png'), path.join(outputDir, 'favicon.ico'));
  console.log('✓ Generated favicon.ico');

  console.log('All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
