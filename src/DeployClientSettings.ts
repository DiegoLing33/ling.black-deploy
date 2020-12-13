export interface DeployClientSettings {
	host: string;
	user: string;
	password: string;
	port: number;

	useSFTP?: boolean,

	[name: string]: any;
}