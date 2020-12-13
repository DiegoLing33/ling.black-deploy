import Logger from "./Logger";
import DeployClientCore from "./DeployClientCore";
import {LType} from "@ling.black/log";
import DeployConnector from "./DeployConnector";


export default class DeploySSHClient extends DeployClientCore<string> {

	public showStreamData = false;

	constructor(connector: DeployConnector) {
		super(connector);

		this.startQueue((item, next) => {
			this.evalCommand(item, next);
		});
	}

	protected evalCommand(command: string, next: (results: string) => void) {
		Logger.log('Running command:', LType.info(command));
		this.connector.getClient().exec(command, (err, channel) => {
			let results = "";
			if (err) {
				throw err;
			} else {
				channel.on('data', (data: any) => {
					results += data;
					if (this.showStreamData) Logger.log(data);
				});
				channel.stderr.on('data', (data: any) => {
					results += data;
					if (this.showStreamData) Logger.error(data);
				});

				channel.on('close', function(code: any) {
					Logger.log('Command', LType.info(command), "ends with code", LType.info(code));
					next(results);
				});
			}
		});
	}

	/**
	 * Closes the connection
	 */
	close() {
		this.stopQueue();
	}

	/**
	 * Returns all the ports usage
	 */
	async commandPortsUsage() {
		return this.command("lsof -i -P -n | grep LISTEN")
	}

	/**
	 * Returns the `port` usage with raw data and process id
	 * @param port
	 */
	async commandPortUsage(port: number): Promise<{ raw: string, process: number | null }> {
		const rows = await this.command("lsof -i -P -n | grep LISTEN");
		const row = rows.split("\n").find(value => value.includes(':' + port + " "));
		if (row) {
			const pid = ((/( [0-9]+ )/g.exec(row) ?? [])[0] ?? '').trim();
			return Promise.resolve({raw: row, process: pid === '' ? null : parseInt(pid)});
		}
		return Promise.resolve({raw: '', process: null});
	}

	/**
	 * Kills the process
	 * @param pid
	 */
	async commandKill(pid: number) {
		return this.command('kill ' + pid);
	}

	/**
	 * Runs the command
	 * @param command
	 */
	command(command: string): Promise<string> {
		return this.addToQueue(command);
	}

}