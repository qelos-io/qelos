/**
 * this file used to initiate basic data inside the authentication service
 */
import { model } from 'mongoose';
import { privilegedRoles } from '../config';

const User = model('User');

export function init() {
  const user = new User({
    tenant: process.env.TENANT,
    username: process.env.USERNAME || process.env.EMAIL || 'test@test.com',
    firstName: process.env.FIRST_NAME || 'Administrator',
    lastName: process.env.LAST_NAME || 'The Ruler',
    password: process.env.PASSWORD || 'admin',
    roles: [privilegedRoles[0]],
  });

  return user.save().then((lastUser) => {
    return lastUser;
  });
}

export async function reset(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    await User.deleteMany({}, {});
    await User.syncIndexes({})
  } else {
    throw new Error('cannot reset production');
  }
}


