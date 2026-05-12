import { Client } from 'ssh2';

const [,, ...args] = process.argv;
const cmd = args.join(' ') || 'echo OK';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '159.194.198.239',
  port: 22,
  username: 'root',
  password: 'Mds-162625',
  readyTimeout: 15000,
  hostVerifier: () => true,
});

conn.on('error', e => { console.error('Error:', e.message); process.exit(1); });
