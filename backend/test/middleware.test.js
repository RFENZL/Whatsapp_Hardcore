const { expect, agent } = require("./utils.js")

describe("Auth middleware", function () {
  this.timeout(20000)

  it("401 when missing token", async () => {
    const r = await agent().get("/api/users")
    expect([401,403]).to.include(r.status)
  })

  it("401 when invalid token", async () => {
    const r = await agent().get("/api/users").set("Authorization", "Bearer invalid.token.here")
    expect([401,403]).to.include(r.status)
  })
})
