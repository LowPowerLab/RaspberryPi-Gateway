// **********************************************************************************
// Websocket server backend for the RaspberryPi-Gateway App
// http://lowpowerlab.com/gateway
// **********************************************************************************
// Common application configuration settings.
// **********************************************************************************

const JSON5 = require('json5'); // https://github.com/aseemk/json5
const nconf = require('nconf'); // https://github.com/indexzero/nconf
const path = require('path');

exports.load = function({defaultStateDir = __dirname, defaultContentDir = null} = {}) {
  nconf.argv().env()

  const stateDir = path.normalize(nconf.get('MOTEINO_GATEWAY_STATE_DIRECTORY') || defaultStateDir);

  const resolvePath = (base) => (...dirs) => path.resolve(base, ...dirs);

  const resolveCoreStatePath = resolvePath(defaultStateDir);
  const resolveUserStatePath = resolvePath(stateDir);

  const coreContentDir = resolveCoreStatePath('www');
  const contentDir = path.normalize(nconf.get('MOTEINO_GATEWAY_CONTENT_DIRECTORY') || defaultContentDir || coreContentDir);

  const resolveCoreContentPath = resolvePath(coreContentDir);
  const resolveUserContentPath = resolvePath(contentDir);

  const coreImagesDir = resolveCoreContentPath('images');
  const userImagesDir = resolveUserContentPath('images');

  const coreMetricsDir = resolveCoreStatePath('metrics');
  const userMetricsDir = resolveUserStatePath('metrics');

  const dbDir = resolveUserStatePath('data/db');

  if (stateDir == defaultStateDir)
  {
    nconf.file('mutable5', {
      file: resolveCoreStatePath('settings.json5'),
      format: JSON5,
    });

    nconf.file('mutable', {
      file: resolveCoreStatePath('settings.json'),
    });
  }
  else
  {
    nconf.file('mutable5', {
      file: resolveUserStatePath('settings.json5'),
      format: JSON5,
    });

    nconf.file('mutable', {
      file: resolveUserStatePath('settings.json'),
    });

    nconf.file('immutable5', {
      file: resolveCoreStatePath('settings.json5'),
      format: JSON5,
    });

    nconf.file('immutable', {
      file: resolveCoreStatePath('settings.json'),
    });
  }

  return {
    'nconf': nconf,
    'stateDir': stateDir,
    'contentDir': contentDir,
    'coreContentDir': coreContentDir,
    'coreImagesDir': coreImagesDir,
    'userImagesDir': userImagesDir,
    'coreMetricsDir': coreMetricsDir,
    'userMetricsDir': userMetricsDir,
    'dbDir': dbDir,
    'resolveCoreContentPath': resolveCoreContentPath,
    'resolveCoreStatePath': resolveCoreStatePath,
    'resolveUserContentPath': resolveUserContentPath,
    'resolveUserStatePath': resolveUserStatePath,
  };
};

// Load configuration and export it
Object.assign(exports, exports.load());
