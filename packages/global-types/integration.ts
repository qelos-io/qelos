export interface IIntegration {
	_id: string;
	tenant: string;
	plugin?: string;
	user: string;
	kind: string[];
	trigger: IIntegrationEntity;
	target: IIntegrationEntity;
	created: Date;
}

export interface IIntegrationEntity {
	source: string;
	operation: string;
	details: any;
}
