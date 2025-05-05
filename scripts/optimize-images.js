import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import sharp from 'sharp';

const IMAGES_DIR = './public';
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

async function optimizeImages() {
  try {
    const files = await readdir(IMAGES_DIR);
    
    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (!SUPPORTED_FORMATS.includes(ext)) continue;
      
      const filePath = join(IMAGES_DIR, file);
      const image = await readFile(filePath);
      
      // Optimize the image
      const optimized = await sharp(image)
        .resize(1920, 1080, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();
      
      // Save optimized version
      const newPath = filePath.replace(ext, '.webp');
      await writeFile(newPath, optimized);
      
      console.log(`Optimized: ${file} -> ${file.replace(ext, '.webp')}`);
    }
  } catch (error) {
    console.error('Error optimizing images:', error);
    process.exit(1);
  }
}

optimizeImages(); 