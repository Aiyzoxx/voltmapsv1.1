const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'icon', 'volt_logo.svg');
const pngPath = path.join(__dirname, 'public', 'icon', 'volt_logo.png');

sharp(svgPath)
  .resize(512, 512)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('Successfully generated rounded PNG logo.');
  })
  .catch(err => {
    console.error('Error generating logo:', err);
  });
