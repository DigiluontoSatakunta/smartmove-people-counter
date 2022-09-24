const fetch = require("node-fetch");
const parser = require("./libs/ttn-v3/imbuildings-decoder");

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 8080;

const AUTH_TOKEN = process.env.AUTH_TOKEN || "SmartMove";

const logger = process.env.NODE_ENV === "production" ? false : true;
const fastify = require("fastify")({logger});

fastify.addHook("preHandler", async (request, reply) => {
  if (request.headers["x-user"] !== AUTH_TOKEN)
    reply.code(401).send("401 Unauthorized");
  done();
});

fastify.get("/", async (_, reply) => {
  reply.code(200).send("200 OK");
});

fastify.post("/", async (request, reply) => {
  const payload = request.body.DevEUI_uplink.payload_hex;

  fastify.log.info(
    `Payload ${payload} received at ${request.body.DevEUI_uplink.Time}`
  );

  if (payload) {
    const parsedData = parser.decode({bytes: Buffer.from(payload, "hex")});

    if (parsedData) {
      fastify.log.info(parsedData);
    } else {
      fastify.log.error("Payload structure unknown");
    }
    reply.code(200).send("200 OK");
  } else {
    reply.code(404).send("404 Not Found");
  }
});

const start = async () => {
  fastify.listen({port, host}, function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
};

start();
