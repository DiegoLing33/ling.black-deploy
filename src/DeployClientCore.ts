import Logger from "./Logger";
import DeployConnector from "./DeployConnector";

export type DeployQueueNextFunc = (results: string) => void;

/**
 * Core deploy client
 */
export default class DeployClientCore<QueueType> {

	protected readonly connector: DeployConnector;
	protected queue: Array<[QueueType, DeployQueueNextFunc]> = [];
	protected queueOpen: boolean = true;
	protected queueInterval: any = null;

	protected constructor(connector: DeployConnector) {
		this.connector = connector;
	}

	protected startQueue(handler: (item: QueueType, next: DeployQueueNextFunc) => void) {
		if (this.queueInterval) clearInterval(this.queueInterval);
		Logger.log('Staring the queue interval...');

		this.queueInterval = setInterval(() => {
			const item = this.first();
			if (!this.queueOpen || item === null) return;
			this.closeQueue();
			handler(item[0], (results) => {
				item[1](results);
				this.queue.splice(0, 1);
				this.openQueue();
			});
		}, 500);
	}

	protected async addToQueue(item: QueueType): Promise<string> {
		return new Promise(resolve => {
			this.queue.push([item, (result) => {
				resolve(result);
			}]);
		})
	}

	protected closeQueue() {
		this.queueOpen = false;
	}

	protected openQueue() {
		this.queueOpen = true;
	}

	protected stopQueue() {
		clearInterval(this.queueInterval);
	}

	/**
	 * Returns the first element
	 * @protected
	 */
	protected first(): [QueueType, DeployQueueNextFunc] | null {
		if (this.queue.length > 0) {
			return this.queue[0];
		}
		return null;
	}

}