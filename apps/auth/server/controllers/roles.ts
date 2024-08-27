import { Response } from 'express'
import { AuthRequest } from '../../types'
import User from '../models/user'
import logger from '../services/logger';

async function getAllRoles(req: AuthRequest, res: Response) {
	const tenant = req.headers.tenant as string;
	if (!tenant) {
		return res.status(401).end();
	}

	try {
		const roles = await User.distinct('roles', { tenant }).exec();
		res.status(200).json(roles).end();
	} catch (err) {
		logger.error('Failed to fetch roles', err);
		res.status(500).json({ message: 'Failed to fetch roles' }).end();
	}
}

export default getAllRoles;