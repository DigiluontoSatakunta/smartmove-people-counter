const fetch = require("node-fetch");

const logger = process.env.NODE_ENV === "production" ? false : true;

const fastify = require("fastify")({logger});

fastify.route({
  method: "GET",
  url: "/",
  schema: {
    // request needs to have a querystring with a `name` parameter
    querystring: {
      name: {type: "string"},
    },
    // the response needs to be an object with an `hello` property of type 'string'
    response: {
      200: {
        type: "object",
        properties: {
          hello: {type: "string"},
        },
      },
    },
  },
  // this function is executed for every request before the handler is executed
  preHandler: async (request, reply) => {
    console.log("preHandler", request.headers);
    // E.g. check authentication
  },
  handler: async (request, reply) => {
    console.log(request.query);
    return {hello: "world"};
    // if (request.query.name) {
    //   return {hello: request.query.name};
    // } else {
    //   reply.code(500);
    // }
  },
});

const start = async () => {
  fastify.listen({port: 3000, host: "0.0.0.0"}, function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.log.info(`🚀 Fastify server up and running at ${address}`);
  });
};

start();
