const fs = require('fs');
const path = require('path');

function getHelpers(dir) {
    let helpers = {};
    
    if (!fs.existsSync(dir)) {
        console.log('Helpers directory not found:', dir);
        return helpers;
    }
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        if (item.isDirectory()) {
            const folderPath = path.join(dir, item.name);
            
            // Look for JS files in the directory
            const files = fs.readdirSync(folderPath, { withFileTypes: true });
            
            for (const file of files) {
                if (file.isFile() && file.name.endsWith('.js')) {
                    const helperName = file.name.replace('.js', '');
                    const helperPath = path.join(folderPath, file.name);
                    
                    try {
                        const helper = require(helperPath);
                        
                        // Use folder name as category and file name as helper name
                        if (!helpers[item.name]) {
                            helpers[item.name] = {};
                        }
                        
                        helpers[item.name][helperName] = helper;
                        console.log(`✅ Loaded helper: ${item.name}.${helperName}`);
                    } catch (error) {
                        console.error(`❌ Failed to load helper ${item.name}/${file.name}:`, error);
                    }
                }
            }
        } else if (item.isFile() && item.name.endsWith('.js') && item.name !== 'load.js') {
            // Direct JS files in helpers folder (excluding the loader itself)
            const helperName = item.name.replace('.js', '');
            const helperPath = path.join(dir, item.name);
            
            try {
                const helper = require(helperPath);
                helpers[helperName] = helper;
                console.log(`✅ Loaded helper: ${helperName}`);
            } catch (error) {
                console.error(`❌ Failed to load helper ${item.name}:`, error);
            }
        }
    }
    
    return helpers;
}

const helpers = getHelpers(path.join(__dirname));

module.exports = helpers;