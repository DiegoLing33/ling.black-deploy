import {DeployClientSettings} from "./DeployClientSettings";
import DeployConnector, {createConnector} from "./DeployConnector";
import DeploySFTPClient from "./DeploySFTPClient";
import DeploySSHClient from "./DeploySSHClient";
import Logger from "./Logger";
import {LType} from "@ling.black/log";


/**
 * Creates the deploy client
 * @param settings
 */
export async function createDeployClient(settings: DeployClientSettings): Promise<Deploy> {
	const client = new Deploy(settings);
	await client.connect();
	return client;
}

export interface DeployAppProps {
	localPath: string;
	remotePath: string;
	install?: boolean;
	start?: boolean;
}


export interface ExpressAppDeployProps extends DeployAppProps {
	localPath: string;
	remotePath: string;
	port: number;
}

export default class Deploy {

	protected settings: DeployClientSettings;
	protected connector?: DeployConnector;
	protected sftpClient?: DeploySFTPClient;
	protected sshClient?: DeploySSHClient;

	constructor(settings: DeployClientSettings) {
		this.settings = settings;
	}

	public async connect() {
		this.connector = await createConnector(this.settings);
		this.sshClient = new DeploySSHClient(this.getConnector());
		if (this.connector.isFTPUsage()) {
			this.sftpClient = new DeploySFTPClient(this.getConnector());
		}
	}

	/**
	 * Returns the connector
	 */
	public getConnector(): DeployConnector {
		if (!this.connector) throw new Error("First u should to call .connect()");
		return this.connector!;
	}

	/**
	 * Returns the shell
	 */
	public get shell() {
		if (!this.connector) throw new Error("First u should to call .connect()");
		return this.sshClient!;
	}

	/**
	 * Returns the sftp
	 */
	public get sftp() {
		if (!this.connector) throw new Error("First u should to call .connect()");
		return this.sftpClient!;
	}

	/**
	 * Closes the connection
	 */
	public close() {
		this.shell?.close();
		this.sftp?.close();
		this.connector?.close();
	}

	/**
	 * Uploads nodejs package and installs
	 *
	 * @param localPath
	 * @param remotePath
	 */
	public async nodeJSUploadAndInstall(localPath: string, remotePath: string) {
		await this.shell.command("mkdir -p " + remotePath);
		await this.sftp.uploadDirectory(localPath, remotePath);
		await this.shell.command(`cd ${remotePath} && yarn`);
	}

	public async nodeJSDeployApp(props: DeployAppProps) {
		const install = props.install ?? true;
		const start = props.start ?? true;

		Logger.log('Creates the path', LType.info(props.remotePath));
		await this.shell.command("mkdir -p " + props.remotePath);
		await this.sftp.uploadDirectory(props.localPath, props.remotePath);

		if (install) {
			Logger.log('Installing...');
			this.shell.showStreamData = true;
			await this.shell.command(`cd ${props.remotePath} && yarn`);
			this.shell.showStreamData = false;
		}

		if (start) {
			Logger.log("Starting...");
			this.shell.showStreamData = true;
			await this.shell.command(`cd ${props.remotePath} && yarn start`);
			this.shell.showStreamData = false;
		}

		return Promise.resolve();
	}

	/**
	 * Uploads nodejs package and installs, then starts via node
	 *
	 * @param props
	 */
	public async nodeJSDeployExpressApp(props: ExpressAppDeployProps) {
		Logger.log('Checking the port', LType.info(props.port));
		const portUsage = await this.shell.commandPortUsage(props.port);
		if (portUsage.process) {
			Logger.log('Found process id:', LType.danger(portUsage.process));
			Logger.log('Killing it...');
			await this.shell.commandKill(portUsage.process);
		}

		return this.nodeJSDeployApp(props);
	}
}