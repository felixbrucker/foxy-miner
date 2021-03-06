const { basename, join } = require('path');
const { createWriteStream, createReadStream, unlinkSync, copyFileSync, existsSync } = require('fs');
const { exec } = require('pkg');
const mkdirp = require('mkdirp');
const archiver = require('archiver');

const version = require('../lib/version');

const nativeModulePaths = [];

(async () => {
  const buildPath = join(__dirname, '..', 'build');
  mkdirp.sync(buildPath);
  const binaryFileName = `foxy-miner${process.platform === 'win32' ? '.exe' : ''}`;
  const binaryPath = join(buildPath, binaryFileName);
  await exec([ '--output', binaryPath, '.' ]);
  const fileList = [
    binaryPath,
  ];
  nativeModulePaths.forEach(nativeModulePath => {
    const fullNativeModulePath = join(__dirname, '..', 'node_modules', nativeModulePath);
    if (!existsSync(fullNativeModulePath)) {
      return;
    }
    const filePath = join(buildPath, basename(nativeModulePath));
    copyFileSync(fullNativeModulePath, filePath);
    fileList.push(filePath);
  });
  await createZipArchiveForFiles(fileList, join(buildPath, `foxy-miner-${version}-${getZipPlatform()}.zip`));
})();

async function createZipArchiveForFiles(fileList, zipFilePath) {
  const zipFileStream = createWriteStream(zipFilePath);
  const zipFileClosedPromise = new Promise(resolve => zipFileStream.once('close', resolve));
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(zipFileStream);
  fileList.forEach(filePath => archive.append(createReadStream(filePath), {
    name: basename(filePath),
    mode: 0o755,
    prefix: `foxy-miner-${version}`,
  }));
  await archive.finalize();
  await zipFileClosedPromise;
  fileList.forEach(filePath => unlinkSync(filePath));
}

function getZipPlatform() {
  switch (process.platform) {
    case 'win32': return 'windows';
    case 'linux': return 'linux';
    case 'darwin': return 'macos';
  }
}
