const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

async function generateIcon() {
  const rootDir = path.join(__dirname, '..');
  const sourceIconPath = path.join(rootDir, 'bar-icon.avif');
  const outputDir = path.join(rootDir, 'build');
  const outputIconPath = path.join(outputDir, 'icon.ico');
  const sizes = [16, 24, 32, 48, 64, 128, 256];

  await fs.mkdir(outputDir, { recursive: true });

  const iconBuffers = await Promise.all(
    sizes.map((size) => sharp(sourceIconPath).resize(size, size).png().toBuffer())
  );

  const icoBuffer = await toIco(iconBuffers);
  await fs.writeFile(outputIconPath, icoBuffer);
}

generateIcon().catch((error) => {
  console.error(error);
  process.exit(1);
});
