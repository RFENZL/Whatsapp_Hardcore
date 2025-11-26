const { expect, agent, uniqEmail } = require('./utils.js');

describe('Auth negative branches', function(){
  this.timeout(30000);

  it('rejects duplicate register', async () => {
    const email = uniqEmail('dup');
    await agent().post('/api/auth/register').send({ email, password: 'secret123', username: 'dupUser01' });
    const r = await agent().post('/api/auth/register').send({ email, password: 'secret123', username: 'dupUser01' });
    expect([400,409]).to.include(r.status);
  });

  it('rejects bad login', async () => {
    const email = uniqEmail('bad');
    await agent().post('/api/auth/register').send({ email, password: 'secret123', username: 'badUser01' });
    const r = await agent().post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect([400,401]).to.include(r.status);
  });
});
