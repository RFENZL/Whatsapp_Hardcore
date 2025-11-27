const { expect, agent, createUser, uniqEmail } = require('./utils.js');

describe('Users', function () {
  this.timeout(30000);
  let t1, u2;
  before(async () => {
    const email1 = uniqEmail('u1');
    ({ token: t1, user: u2 } = await createUser(email1, 'user01'));
    // t2 et u1 inutilisés, supprimés
  });

  it('profile public', async () => {
    const r = await agent().get(`/api/users/${u2._id}`).set('Authorization', t1);
    expect(r.status).to.equal(200);
    expect(r.body.username).to.equal('user02');
  });

  it('list paginated', async () => {
    const r = await agent().get('/api/users?limit=1&page=1').set('Authorization', t1);
    expect(r.status).to.equal(200);
    expect(r.body.items.length).to.be.at.least(1);
  });

  it('update profile (username, avatar)', async () => {
    const r = await agent().put('/api/users/profile').set('Authorization', t1).send({ username: 'user01x', avatar: 'http://img' });
    expect(r.status).to.equal(200);
    expect(r.body.username).to.equal('user01x');
  });

  it('search by name', async () => {
    const r = await agent().get('/api/users/search?q=user02').set('Authorization', t1);
    expect(r.status).to.equal(200);
    expect(Array.isArray(r.body)).to.equal(true);
  });
});
