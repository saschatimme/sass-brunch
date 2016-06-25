const mkdirp = require('mkdirp');
const fs = require('fs');

function collectSourceFilePaths(files) {
  const sourceFiles = [];
  files.forEach(file => {
    file.allSourceFiles.forEach(sourceFile => {
      sourceFiles.push(sourceFile.path);
    });
  });
  return sourceFiles;
}

function extractModules(styles, styleDir, elmDir) {
  return (path) => {
    const basePath = path.replace(styleDir.endsWith('/') ? styleDir : `${styleDir}/`, '');

    const moduleName = 'Css.' + basePath.replace(/.scss/, '').replace('/', '.');

    const _elmDir = elmDir.endsWith('/') ? elmDir : `${elmDir}/`;
    const elmFilePath = (_elmDir + 'Css/' + basePath).replace(/.scss$/, '.elm');
    const dir = elmFilePath.split('/').slice(0, -1).join('/');
    const cssModules = styles[path];

    return {
      moduleName,
      filePath: elmFilePath,
      dir,
      cssModules
    };
  };
}

function createElmFile(moduleName, cssModules) {
  const stylesTypeObject =
        Object.keys(cssModules).reduce((xs, x) => Object.assign(xs, { [x]: 'String' }), {});

  const stylesType =
        JSON.stringify(stylesTypeObject, null, 2)
            .replace(/\"/g, '')
            .replace(/\n/g, '\n  ');

  const escapedJson =
         Object.keys(cssModules).reduce((xs, x) => Object.assign(xs, { [x]: `!${cssModules[x]}!` }), {});

  const stylesRecord =
        JSON.stringify(escapedJson, null, 2)
            .replace(/\"/g, '')
            .replace(/!/g, '"')
            .replace(/:/g, ' =')
            .replace(/\n/g, '\n  ');

  const elmFile = `module ${moduleName} exposing (..)
    
    
type alias Styles = ${stylesType}

styles : Styles
styles = ${stylesRecord} 

`;
  return elmFile;
}

function shallowCompare(obj1, obj2) {
  if (Object.keys(obj1).length === Object.keys(obj2).length) {
    Object.keys(obj1).forEach((key) => {
      if (obj2[key] !== obj1[key]) {
         return false;
       }
    });
    return true;
  }
  return false;
}

function createModules(prevModules) {

  const prevModulesDict =
      prevModules.reduce((dict, x) => Object.assign(dict, { [x.filePath]: x.scssModules }), {});

  return ({ moduleName, filePath, dir, cssModules }) => {
    if (prevModulesDict[filePath] && shallowCompare(prevModulesDict[filePath], cssModules)) {
      return;
    }
    const elmFile = createElmFile(moduleName, cssModules);
    mkdirp(dir, err => {
      if (!err) {
        fs.writeFile(filePath, elmFile);
      }
    });
  };
}

module.exports = {
  collectSourceFilePaths,
  createModules,
  extractModules
};
