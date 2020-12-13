import {Client, SFTPWrapper} from "ssh2";
import {DeployClientSettings} from "./DeployClientSettings";
import Logger from "./Logger";
import {LType} from "@ling.black/log";

/**
 * Returns the connector
 * @param settings
 */
export async function createConnector(settings: DeployClientSettings): Promise<DeployConnector> {
	return new Promise((resolve, reject) => {
		const client = new DeployConnector(settings);
		client.connect(err => {
			if (err) reject(err);
			else resolve(client);
		});
	});
}

export default class DeployConnector {

	protected readonly client: Client = new Client();
	protected readonly settings: DeployClientSettings;
	protected callback: (err?: Error) => void = () => null;
	protected sftp: SFTPWrapper | undefined;

	constructor(settings: DeployClientSettings) {
		this.settings = settings;
		this.client.on('ready', () => {
			Logger.log('Connection to', LType.info(this.getName()), 'is ready to use');
			if (this.isFTPUsage()) {
				this.client.sftp((err, sftp) => {
					if (err) this.callback(err);
					else {
						this.sftp = sftp;
						this.callback();
					}
				});
			} else {
				this.callback();
			}
		});
	}

	/**
	 * Returns true if connection uses ftp
	 */
	public isFTPUsage() {
		return this.settings.useSFTP ?? true;
	}

	/**
	 * Returns the settings
	 */
	public getSettings(): Readonly<DeployClientSettings> {
		return Object.freeze(this.settings);
	}

	/**
	 * Returns the client
	 */
	public getClient(): Readonly<Client> {
		return this.client;
	}

	/**
	 * Returns the sftp client
	 */
	public getSFTPClient(): Readonly<SFTPWrapper> {
		if (!this.isFTPUsage()) throw new Error('Change your settings in constructor. Set `useSFTP: true`');
		if (!this.sftp) throw new Error('SFTP connection is undefined');

		return this.sftp;
	}

	/**
	 * Returns the connection name
	 */
	getName() {
		return `${this.settings.user}@${this.settings.host}`;
	}

	/**
	 * Connects to the remote
	 * @param callback
	 */
	connect(callback: (err?: Error) => void) {
		this.callback = callback;
		this.client.connect(this.settings);
	}

	/**
	 * Closes the connection
	 */
	close() {
		this.client.end();
		Logger.log('Connection', LType.info(this.getName()), 'is closed!');
	}

}