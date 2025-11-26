const fs = require('fs-extra');
const concat = require('concat');
const glob = require('glob');

const environment = process.argv[2];

build = async () => {
    // Leer el contenido del archivo config.json
    const configFileName = `./src/environments/config/config.${environment}.json`;
    const configData = await fs.readJson(configFileName);
    const configAsString = JSON.stringify(configData, null, 2);
    await fs.outputFile('./dist/geo-visor-cmp/configData.js', `const configData = ${configAsString};`);

    // Leer el contenido del archivo config.gallery.json
    const galleryConfigData = await fs.readJson('./src/assets/config.gallery.json');
    const galleryConfigAsString = JSON.stringify(galleryConfigData, null, 2);
    await fs.outputFile('./dist/geo-visor-cmp/galleryConfigData.js', `const galleryConfigData = ${galleryConfigAsString};`);

    const jsFiles = await getFiles('./dist/geo-visor-cmp/', '**/*.js');
    const cssFiles = await getFiles('./dist/geo-visor-cmp/', '**/*.css');

    await fs.ensureDir('webComponents');
    await concat(jsFiles, 'webComponents/web-components-geovisor.js');
    await concat(cssFiles, 'webComponents/web-components-geovisor.css');
}

async function getFiles(path, pattern) {
    return new Promise((resolve, reject) => {
        glob(pattern, { cwd: path }, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files.map(file => `${path}${file}`));
            }
        });
    });
}

build();
