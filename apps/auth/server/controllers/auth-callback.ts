import { Response, NextFunction } from 'express';
import User, { UserDocument, UserModel } from '../models/user';
import { verifyRefreshToken } from '../services/tokens';
import { getRequestHost } from '../services/req-host';
import { tokenPayload } from './signin-signup-token';

// Controller to convert refresh token to cookie token
export async function authCallback(req: any, res: Response, next: NextFunction) {

	if (!req.query.rt) {
		return res.status(401).end()
	}

	const refreshToken = req.query.rt;

	const tenant = req.headers.tenant || '0';  // Get tenant

	if (!refreshToken || refreshToken.trim() === '') {
		return res.status(400).json({ error: 'Refresh token is missing' });
	}

	try {
		// Validation of refresh token
		const decoded = await verifyRefreshToken(refreshToken, tenant) as any;

		const user: UserDocument & UserModel = await User.findOne({ _id: decoded.sub, tenant: decoded.tenant }).exec() as any;

		if (!user) {
			return res.status(401).json({
				errors: {
					general: 'User not found',
				}
			});
		}

		if (!user.tokens.some(token => token.tokenIdentifier === decoded.tokenIdentifier)) {
			return res.status(401).json({
				errors: {
					general: 'Refresh token not valid',
				}
			});
		}

		user.tokens = user.tokens.filter(token => token.tokenIdentifier !== decoded.tokenIdentifier);

		// Generate a new token
		const workspace = decoded.workspace ? { _id: decoded.workspace } : null
		const cookieToken = user.getToken({ authType: 'cookie', workspace });

		tokenPayload(getRequestHost(req), res, { tenant, cookieToken, user, workspace });

		await user.save();

	} catch (error) {
		return res.status(401).json({ error: 'Invalid refresh token' });
	}
}
