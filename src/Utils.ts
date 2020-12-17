// import {Client} from "ssh2";
// import tar from "tar-fs";
//
// const zlib = require('zlib');
//
// export function transferDir(conn: Client, remotePath: string, localPath: string, cb: (error: Error | null) => void) {
// 	let cmd = 'tar cf - "' + remotePath + '" 2>/dev/null | gzip -6c 2>/dev/null';
//
// 	conn.exec(cmd, function(err, stream) {
// 		if (err)
// 			return cb(err);
//
// 		let exitErr: Error | null = null;
// 		const tarStream = tar.extract(localPath);
// 		tarStream.on('finish', function() {
// 			cb(exitErr);
// 		});
//
// 		stream.on('exit', function(code, signal) {
// 			if (typeof code === 'number' && code !== 0)
// 				exitErr = new Error('Remote process exited with code ' + code);
// 			else if (signal)
// 				exitErr = new Error('Remote process killed with signal ' + signal);
// 		}).stderr.resume();
//
// 		stream = stream.pipe(zlib.createGunzip());
// 		stream.pipe(tarStream);
// 	});
// }
//
import {promisify} from "util";
import fs from "fs";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

import * as path from "path";
import {LType} from "@ling.black/log";
import Logger from "./Logger";
import {SFTPWrapper} from "ssh2";
import DeploySSHClient from "./DeploySSHClient";

export function uploadDir(ssh: DeploySSHClient, conn: SFTPWrapper, remotePath: string, localPath: string): Promise<string> {
	return new Promise<string>(async (resolve, reject) => {
		try {
			const __path = path.resolve(localPath);
			const dirName = path.dirname(__path) + "/" + path.basename(__path);
			const files = await getFiles(__path);
			for (const file of files) {
				const fn = file.replace(dirName, '');
				const rmPath = remotePath + fn;
				await ssh.command("mkdir -p " + remotePath);
				Logger.log('File', LType.info(file), "-->", LType.info(rmPath));
				await (async () => {
					return new Promise((res, rej) => {
						conn.fastPut(file, rmPath, err => {
							if (err) rej(err);
							else res('ok');
						});
					});
				})();
			}
			resolve('yes');
		} catch (e) {
			reject(e);
		}
	});
}

export async function getFiles(dir: string): Promise<string[]> {
	const subdirs = await readdir(dir);
	const files: any[] = await Promise.all(subdirs.map(async (subdir) => {
		const res = path.resolve(dir, subdir);
		return (await stat(res)).isDirectory() ? getFiles(res) : res;
	}));
	return files.reduce((a, f) => a.concat(f), []);
}