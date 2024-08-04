import draftDao from '../server/dao/drafts';

const TENANT = process.env.TENANT;

if (!TENANT) {
  console.log('you must specify the tenant you want to be removed');
  process.exit(0);
}

console.log('initiate remove tenant');

Promise.all([
  draftDao.removeTenantDrafts(TENANT),
])
  .then(() => {
    console.log('tenant deleted successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

