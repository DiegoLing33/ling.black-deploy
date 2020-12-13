import DeployClientCore from "./DeployClientCore";
import DeployConnector from "./DeployConnector";
import {uploadDir} from "./Utils";

export type DeployFTPClientType = 'file' | 'directory';

export default class DeploySFTPClient extends DeployClientCore<[string, string, DeployFTPClientType]> {


	constructor(connector: DeployConnector) {
		super(connector);

		this.startQueue((item, next) => {
			if(item.length === 3){
				if(item[2] === "directory"){
					uploadDir(this.connector.getSFTPClient(), item[1], item[0]).then(value => next(value));
				}
			}
		});
	}

	/**
	 * Uploads the directory
	 * @param localPath
	 * @param remotePath
	 */
	async uploadDirectory(localPath: string, remotePath: string): Promise<string>{
		return this.addToQueue([localPath, remotePath, "directory"]);
	}

	close() {
		this.stopQueue();
	}
}