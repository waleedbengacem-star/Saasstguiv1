const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = 'C:\\Users\\Walee\\Desktop\\V1\\Omnibetter New';
const tempDir = 'C:\\Users\\Walee\\Desktop\\V1\\temp_aws_staging';
const zipPath = 'C:\\Users\\Walee\\Desktop\\V1\\AWS STAGING.zip';

console.log("==============================================");
console.log("Starting AWS Staging packaging process...");
console.log("==============================================");

// Step 1: Run local Next.js staging build
console.log("\n[1/6] Running Next.js staging build locally...");
try {
  execSync('npm.cmd run build:staging', { stdio: 'inherit', cwd: sourceDir });
  console.log("Next.js staging build compiled successfully.");
} catch (err) {
  console.error("Failed to compile Next.js staging build:", err.message);
  process.exit(1);
}

// Step 2: Clean up previous temp files
console.log("\n[2/6] Cleaning up previous packaging temp files...");
if (fs.existsSync(tempDir)) {
  console.log("Cleaning up existing temp directory...");
  fs.rmSync(tempDir, { recursive: true, force: true });
}
if (fs.existsSync(zipPath)) {
  console.log("Removing existing zip file...");
  fs.unlinkSync(zipPath);
}

fs.mkdirSync(tempDir, { recursive: true });

// Excluded paths
const excludePatterns = [
  /\\node_modules(\\|\\|$)/,
  /\\\.git(\\|\\|$)/,
  /\\\.vercel(\\|\\|$)/,
  /\\\.env(\\|\\|$)/,
  /\\\.next\\cache(\\|\\|$)/,
  /\\\.next\\dev(\\|\\|$)/,
  /\\scratch_backup(\\|\\|$)/,
  /\\scratch(\\|\\|$)/
];

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  
  // Check exclusions
  for (const pattern of excludePatterns) {
    if (pattern.test(src)) {
      return;
    }
  }

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

// Step 3: Copy files to packaging directory
console.log("\n[3/6] Copying codebase files (excluding large node_modules and cache folders)...");
fs.readdirSync(sourceDir).forEach(child => {
  if (child !== 'temp_aws_staging' && child !== 'temp_aws') {
    copyRecursive(path.join(sourceDir, child), path.join(tempDir, child));
  }
});

// Step 4: Modify package.json for Elastic Beanstalk instance
console.log("\n[4/6] Modifying package.json in packaging directory...");
const pkgJsonPath = path.join(tempDir, 'package.json');
if (fs.existsSync(pkgJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  
  if (pkg.scripts) {
    // Only run prisma generate on AWS deployment instance startup
    pkg.scripts.postinstall = "prisma generate";
    pkg.scripts.build = "prisma generate";
    console.log("Configured postinstall and build scripts to run prisma generate only.");
  }
  
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
} else {
  console.error("package.json not found in temp directory!");
}

// Recursive function to patch all absolute local paths in Next.js build files
function patchPathsRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      patchPathsRecursive(fullPath);
    } else {
      const ext = path.extname(fullPath);
      if (ext === '.json' || ext === '.js' || ext === '.map') {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = content;
        
        // Match with V1
        modified = modified.replace(/[cC]:\\\\\\\\Users\\\\\\\\Walee\\\\\\\\Desktop\\\\\\\\V1\\\\\\\\Omnibetter New/g, '/var/app/current');
        modified = modified.replace(/[cC]:\\\\Users\\\\Walee\\\\Desktop\\\\V1\\\\Omnibetter New/g, '/var/app/current');
        modified = modified.replace(/[cC]:\\Users\\Walee\\Desktop\\V1\\Omnibetter New/g, '/var/app/current');
        modified = modified.replace(/[cC]:\/Users\/Walee\/Desktop\/V1\/Omnibetter New/g, '/var/app/current');
        
        // Match without V1
        modified = modified.replace(/[cC]:\\\\\\\\Users\\\\\\\\Walee\\\\\\\\Desktop\\\\\\\\Omnibetter New/g, '/var/app/current');
        modified = modified.replace(/[cC]:\\\\Users\\\\Walee\\\\Desktop\\\\Omnibetter New/g, '/var/app/current');
        modified = modified.replace(/[cC]:\\Users\\Walee\\Desktop\\Omnibetter New/g, '/var/app/current');
        modified = modified.replace(/[cC]:\/Users\/Walee\/Desktop\/V1\/Omnibetter New/g, '/var/app/current');
        
        if (modified !== content) {
          fs.writeFileSync(fullPath, modified, 'utf8');
        }
      }
    }
  });
}

// Step 5: Patch paths
console.log("\n[5/6] Patching absolute Windows paths to AWS Linux paths in Next.js build...");
const nextTempDir = path.join(tempDir, '.next');
patchPathsRecursive(nextTempDir);
console.log("Absolute path patching completed.");

// Step 6: Compress temp files using tar.exe
console.log("\n[6/6] Compressing package into AWS STAGING.zip...");
try {
  execSync(`tar.exe -a -c -f "${zipPath}" -C "${tempDir}" .`);
  console.log("Compression completed successfully.");
} catch (err) {
  console.error("Failed to compress package:", err.message);
  process.exit(1);
}

// Clean up local temp environments
console.log("\nCleaning up staging temp directory...");
fs.rmSync(tempDir, { recursive: true, force: true });

// Remove temporary local env built files
const localProdLocalEnv = path.join(sourceDir, '.env.production.local');
if (fs.existsSync(localProdLocalEnv)) {
  fs.unlinkSync(localProdLocalEnv);
  console.log("Removed temporary local config file: .env.production.local");
}

console.log("\n==============================================");
console.log(`Success! AWS STAGING.zip created successfully!`);
console.log(`Location: ${zipPath}`);
console.log("==============================================");
