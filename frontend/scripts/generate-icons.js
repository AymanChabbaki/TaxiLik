/**
 * Generates all app icon assets from logo.png.
 * Run: node scripts/generate-icons.js  (from the frontend/ directory)
 *
 * Produces:
 *   assets/images/icon.png                  — 1024×1024, red bg + white taxi mark (iOS + fallback)
 *   assets/images/android-icon-background.png  — 1024×1024 solid red
 *   assets/images/android-icon-foreground.png  — 1024×1024 white mark on transparent
 *   assets/images/android-icon-monochrome.png  — 1024×1024 dark mark on white
 *   assets/images/splash-icon.png           — 512×512 white mark on transparent (native splash)
 *   assets/images/favicon.png               — 64×64 red bg + white mark
 */
const Jimp = require('jimp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets', 'images');

// Brand red: #E8412A  →  RGBA big-endian = 0xE8412AFF
const RED_R = 0xE8, RED_G = 0x41, RED_B = 0x2A;

function isRed(r, g, b) {
  return r > 185 && g < 80 && b < 80 && r > g + 90 && r > b + 90;
}

// Create a new blank Jimp image via callback constructor (works in jimp 0.x)
function newImage(w, h) {
  return new Promise((resolve, reject) => {
    new Jimp(w, h, (err, img) => (err ? reject(err) : resolve(img)));
  });
}

// Fill an image with a solid color
function fill(img, r, g, b, a = 255) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, (x, y, idx) => {
    img.bitmap.data[idx]     = r;
    img.bitmap.data[idx + 1] = g;
    img.bitmap.data[idx + 2] = b;
    img.bitmap.data[idx + 3] = a;
  });
  return img;
}

// Extract the taxi car mark from logo.png:
//   - auto-detect the bounding box of red pixels
//   - convert red → white, everything else → transparent
//   - resize to targetWidth (height auto)
async function getCarMark(logo, targetWidth) {
  const W = logo.bitmap.width;
  const H = logo.bitmap.height;

  // Find the bounding box of all red pixels (the taxi car)
  let minX = W, maxX = 0, minY = H, maxY = 0;
  logo.scan(0, 0, W, H, (x, y, idx) => {
    const r = logo.bitmap.data[idx];
    const g = logo.bitmap.data[idx + 1];
    const b = logo.bitmap.data[idx + 2];
    if (isRed(r, g, b)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });

  // Cap at 53% of image height to safely exclude the ".ma" red text below the car
  maxY = Math.min(maxY, Math.floor(H * 0.53));
  // Also cap maxX: the car doesn't extend past ~82% of the logo width
  maxX = Math.min(maxX, Math.floor(W * 0.82));

  const PAD = 18;
  const cx = Math.max(0, minX - PAD);
  const cy = Math.max(0, minY - PAD);
  const cw = Math.min(W - cx, maxX - cx + PAD * 2);
  const ch = Math.min(H - cy, maxY - cy + PAD * 2);

  console.log(`  Car bounding box: x=${cx} y=${cy} w=${cw} h=${ch} (logo ${W}×${H})`);

  const car = logo.clone().crop(cx, cy, cw, ch);

  // Pixel transform: brand-red → white (opaque), everything else → transparent
  car.scan(0, 0, car.bitmap.width, car.bitmap.height, (x, y, idx) => {
    const r = car.bitmap.data[idx];
    const g = car.bitmap.data[idx + 1];
    const b = car.bitmap.data[idx + 2];
    if (isRed(r, g, b)) {
      car.bitmap.data[idx]     = 255;
      car.bitmap.data[idx + 1] = 255;
      car.bitmap.data[idx + 2] = 255;
      car.bitmap.data[idx + 3] = 255;
    } else {
      // Background + interior cutouts (wheels, pin) → transparent
      // Cutouts will show the red background through = correct icon design
      car.bitmap.data[idx + 3] = 0;
    }
  });

  car.resize(targetWidth, Jimp.AUTO);
  return car;
}

// Center-composite mark onto base image
function compose(base, mark) {
  const x = Math.floor((base.bitmap.width  - mark.bitmap.width)  / 2);
  const y = Math.floor((base.bitmap.height - mark.bitmap.height) / 2);
  base.composite(mark, x, y);
  return base;
}

async function main() {
  console.log('\nLoading logo.png…');
  const logo = await Jimp.read(path.join(ASSETS, 'logo.png'));
  console.log(`  Logo: ${logo.bitmap.width}×${logo.bitmap.height} px`);

  // ── icon.png ── 1024×1024 red + white taxi mark (iOS, fallback)
  process.stdout.write('Generating icon.png… ');
  const icon = await newImage(1024, 1024);
  fill(icon, RED_R, RED_G, RED_B);
  const mark_icon = await getCarMark(logo, 820);
  compose(icon, mark_icon);
  await icon.writeAsync(path.join(ASSETS, 'icon.png'));
  console.log('✓');

  // ── android-icon-background.png ── solid red
  process.stdout.write('Generating android-icon-background.png… ');
  const androidBg = await newImage(1024, 1024);
  fill(androidBg, RED_R, RED_G, RED_B);
  await androidBg.writeAsync(path.join(ASSETS, 'android-icon-background.png'));
  console.log('✓');

  // ── android-icon-foreground.png ── white mark on transparent (safe zone ~55% of 1024)
  process.stdout.write('Generating android-icon-foreground.png… ');
  const androidFg = await newImage(1024, 1024);
  fill(androidFg, 0, 0, 0, 0); // transparent
  const mark_fg = await getCarMark(logo, 560);
  compose(androidFg, mark_fg);
  await androidFg.writeAsync(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✓');

  // ── android-icon-monochrome.png ── dark mark on white (Android monochrome adaptive)
  process.stdout.write('Generating android-icon-monochrome.png… ');
  const androidMono = await newImage(1024, 1024);
  fill(androidMono, 255, 255, 255);
  const mark_mono = await getCarMark(logo, 560);
  mark_mono.scan(0, 0, mark_mono.bitmap.width, mark_mono.bitmap.height, (x, y, idx) => {
    if (mark_mono.bitmap.data[idx + 3] > 0) {
      mark_mono.bitmap.data[idx]     = 30;
      mark_mono.bitmap.data[idx + 1] = 30;
      mark_mono.bitmap.data[idx + 2] = 30;
    }
  });
  compose(androidMono, mark_mono);
  await androidMono.writeAsync(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✓');

  // ── splash-icon.png ── 512×512 white mark on transparent (native splash overlay)
  process.stdout.write('Generating splash-icon.png… ');
  const splashBg = await newImage(512, 512);
  fill(splashBg, 0, 0, 0, 0);
  const mark_splash = await getCarMark(logo, 420);
  compose(splashBg, mark_splash);
  await splashBg.writeAsync(path.join(ASSETS, 'splash-icon.png'));
  console.log('✓');

  // ── favicon.png ── 64×64 red + white mark (web)
  process.stdout.write('Generating favicon.png… ');
  const favicon = await newImage(64, 64);
  fill(favicon, RED_R, RED_G, RED_B);
  const mark_fav = await getCarMark(logo, 52);
  compose(favicon, mark_fav);
  await favicon.writeAsync(path.join(ASSETS, 'favicon.png'));
  console.log('✓');

  console.log('\nAll icons generated.\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
