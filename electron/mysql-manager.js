const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const MYSQL_PORT = 3307; // non-default, avoids clashing with any pre-existing local MySQL/XAMPP

function getMysqlPaths(app) {
  const isDev = !app.isPackaged;
  const mysqlRoot = isDev
    ? path.join(__dirname, '../mysql-portable')
    : path.join(process.resourcesPath, 'mysql-portable');

  return {
    mysqldExe: path.join(mysqlRoot, 'bin', 'mysqld.exe'),
    baseDir: mysqlRoot,
    dataDir: path.join(app.getPath('userData'), 'mysql-data'),
  };
}

function isInitialized(dataDir) {
  return fs.existsSync(path.join(dataDir, 'mysql'));
}

function initializeDataDir({ mysqldExe, baseDir, dataDir }) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Initializing MySQL data directory (first run)...');
  execFileSync(mysqldExe, [
    `--basedir=${baseDir}`,
    `--datadir=${dataDir}`,
    '--initialize-insecure', // creates root@localhost with no password
  ]);
  console.log('MySQL data directory initialized.');
}

// --initialize-insecure only creates 'root'@'localhost'. With
// --skip-name-resolve active, TCP connections from 127.0.0.1 are matched
// by raw IP (not reverse-resolved to "localhost"), so setup-database.js's
// root@127.0.0.1 connection would otherwise be rejected. This writes a
// one-time SQL file that mysqld runs as part of its own startup (via
// --init-file) to add that grant, before any external client connects.
function writeBootstrapInitFile(dataDir) {
  const initFilePath = path.join(dataDir, 'bootstrap-init.sql');
  fs.writeFileSync(
    initFilePath,
    [
      "CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '';",
      "GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;",
      'FLUSH PRIVILEGES;',
    ].join('\n')
  );
  return initFilePath;
}

let mysqldProcess = null;

function startMysqld(app) {
  return new Promise((resolve, reject) => {
    const paths = getMysqlPaths(app);
    const wasAlreadyInitialized = isInitialized(paths.dataDir);

    if (!wasAlreadyInitialized) {
      try {
        initializeDataDir(paths);
      } catch (err) {
        return reject(err);
      }
    }

    const args = [
      `--basedir=${paths.baseDir}`,
      `--datadir=${paths.dataDir}`,
      `--port=${MYSQL_PORT}`,
      '--bind-address=0.0.0.0', // allow LAN clients (doctor PCs on the network)
      '--sql-mode=',             // match XAMPP's relaxed mode — no strict NOT NULL enforcement
      '--skip-name-resolve',      // skip reverse-DNS on connect
      '--skip-performance-schema',
      '--innodb-buffer-pool-size=128M',
      '--innodb-flush-log-at-trx-commit=2',
      '--console',
    ];

    // Only needed on first boot — once the account exists in mysql.user,
    // it persists in the data dir for every future launch.
    if (!wasAlreadyInitialized) {
      const initFilePath = writeBootstrapInitFile(paths.dataDir);
      args.push(`--init-file=${initFilePath}`);
    }

    mysqldProcess = spawn(paths.mysqldExe, args, { stdio: 'pipe' });

    mysqldProcess.stdout.on('data', (d) => console.log('[mysqld]', d.toString().trim()));
    mysqldProcess.stderr.on('data', (d) => console.log('[mysqld]', d.toString().trim()));
    mysqldProcess.on('error', reject);
    mysqldProcess.on('exit', (code) => {
      console.log(`mysqld exited with code ${code}`);
      mysqldProcess = null;
    });

    waitForPort(
      MYSQL_PORT,
      30,
      () => resolve({ ...paths, wasAlreadyInitialized }),
      (err) => reject(err)
    );
  });
}

function waitForPort(port, retries, onReady, onFail) {
  const socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
    socket.end();
    onReady();
  });
  socket.on('error', () => {
    socket.destroy();
    if (retries > 0) {
      setTimeout(() => waitForPort(port, retries - 1, onReady, onFail), 1000);
    } else {
      onFail(new Error(`MySQL did not become ready on port ${port} after 30 seconds`));
    }
  });
}

function stopMysqld() {
  if (mysqldProcess) {
    mysqldProcess.kill();
    mysqldProcess = null;
  }
}

module.exports = { startMysqld, stopMysqld, MYSQL_PORT };