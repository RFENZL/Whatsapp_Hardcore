const { expect, agent, uniqEmail } = require("./utils.js")

describe("Auth", function () {
  this.timeout(30000)

  it("registers and returns token", async () => {
    const email = uniqEmail("auth")
    const r = await agent().post("/api/auth/register").send({ email, password: "secret123", username: "alice01" })
    expect(r.status).to.equal(201)
    expect(r.body.token).to.be.a("string")
  })

  it("login -> online", async () => {
    const email = uniqEmail("auth2")
    await agent().post("/api/auth/register").send({ email, password: "secret123", username: "bobby02" })
    const r = await agent().post("/api/auth/login").send({ email, password: "secret123" })
    expect(r.status).to.equal(200)
    expect(r.body.user.status).to.equal("online")
  })

  it("logout -> 200", async () => {
    const email = uniqEmail("auth3")
    await agent().post("/api/auth/register").send({ email, password: "secret123", username: "carlos03" })
    const login = await agent().post("/api/auth/login").send({ email, password: "secret123" })
    const r = await agent().post("/api/auth/logout").set("Authorization", `Bearer ${login.body.token}`)
    expect(r.status).to.equal(200)
  })
})
