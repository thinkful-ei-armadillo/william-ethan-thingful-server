const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')
const jwt = require('jsonwebtoken')

describe('Things Endpoints', function () {
  let db

  const {
    testUsers,
    testThings,
    testReviews,
  } = helpers.makeThingsFixtures()

  function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
    const token = jwt.sign({ user_id: user.id }, secret, {
      subject: user.user_name,
      algorithm: 'HS256',
    })
    return `Bearer ${token}`
  }

  // mocha hooks
  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  // tests begin
  describe(`Protected endpoints`, () => {
    beforeEach('insert articles', () => {
      helpers.seedArticlesTables(
        db,
        testUsers,
        testArticles,
        testComments,
      )
    })
  })

  describe(`GET /api/things`, () => {
    context(`Given no things`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/things')
          .expect(200, [])
      })
    })

    context('Given there are things in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(
          db,
          testUsers,
          testThings,
          testReviews,
        )
      )

      it('responds with 200 and all of the things', () => {
        const expectedThings = testThings.map(thing =>
          helpers.makeExpectedThing(
            testUsers,
            thing,
            testReviews,
          )
        )
        return supertest(app)
          .get('/api/things')
          .expect((res) => {
            expect(res.body[0].title).to.equal(expectedThings[0].title);
            // console.log(res.body[0].date_created);
            const actualDate = new Date(res.body[0].date_created).toLocaleString();
            const expectedDate = new Date(expectedThings[0].date_created).toLocaleString('en', {
              timeZone: 'UTC'
            });
            expect(actualDate).to.equal(expectedDate);
          })
      })
    })

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousThing,
        expectedThing,
      } = helpers.makeMaliciousThing(testUser)

      beforeEach('insert malicious thing', () => {
        return helpers.seedMaliciousThing(
          db,
          testUser,
          maliciousThing,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/things`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedThing.title)
            expect(res.body[0].content).to.eql(expectedThing.content)
          })
      })
    })
  })

  describe(`GET /api/things/:thing_id`, () => {
    context(`Given no things`, () => {
      beforeEach(() =>
        helpers.seedUsers(db, testUsers)
      )
      
      it(`responds with 404`, () => {
        const thingId = 123456
        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, {
            error: `Thing doesn't exist`
          })
      })
    })

    context('Given there are things in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(
          db,
          testUsers,
          testThings,
          testReviews,
        )
      )

      it('responds with 200 and the specified thing', () => {
        const thingId = 2
        const expectedThing = helpers.makeExpectedThing(
          testUsers,
          testThings[thingId - 1],
          testReviews,
        )

        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect((res) => {
            expect(res.body.title).to.equal(expectedThing.title);
            // console.log(res.body.date_created);
            const actualDate = new Date(res.body.date_created).toLocaleString();
            const expectedDate = new Date(expectedThing.date_created).toLocaleString('en', {
              timeZone: 'UTC'
            });
            expect(actualDate).to.equal(expectedDate);
          });

      })
    })

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1]
      const {
        maliciousThing,
        expectedThing,
      } = helpers.makeMaliciousThing(testUser)

      beforeEach('insert malicious thing', () => {
        return helpers.seedMaliciousThing(
          db,
          testUser,
          maliciousThing,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/things/${maliciousThing.id}`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedThing.title)
            expect(res.body.content).to.eql(expectedThing.content)
          })
      })
    })
  })

  describe(`GET /api/things/:thing_id/reviews`, () => {
    context(`Given no things`, () => {
      it(`responds with 404`, () => {
        const thingId = 123456
        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .expect(404, {
            error: `Thing doesn't exist`
          })
      })
    })

    context('Given there are reviews for thing in the database', () => {
      beforeEach('insert things', () =>
        helpers.seedThingsTables(
          db,
          testUsers,
          testThings,
          testReviews,
        )
      )

      it('responds with 200 and the specified reviews', () => {
        const thingId = 1
        const expectedReviews = helpers.makeExpectedThingReviews(
          testUsers, thingId, testReviews
        )

        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect((res) => {
            expect(res.body[0].title).to.equal(expectedReviews[0].title);
            // console.log(res.body[0].date_created);
            const actualDate = new Date(res.body[0].date_created).toLocaleString();
            const expectedDate = new Date(expectedReviews[0].date_created).toLocaleString('en', {
              timeZone: 'UTC'
            });
            expect(actualDate).to.equal(expectedDate);
          });
      })
    })
  })
})