const fetch = require("node-fetch");
const parser = require("./libs/ttn-v3/imbuildings-decoder");

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 8080;

const logger = process.env.NODE_ENV === "production" ? false : true;
const fastify = require("fastify")({logger});

fastify.get("/", async (_, reply) => {
  reply.code(200).send("200 OK");
});

fastify.post("/", async (request, reply) => {
  if (request.headers["X-User"] !== "SmartMove") reply.code(401);

  const payload = request.body.DevEUI_uplink.payload_hex;

  fastify.log.info(
    `Payload ${payload} received at ${request.body.DevEUI_uplink.Time}`
  );

  if (payload) {
    const input = {fPort: null, bytes: Buffer.from(payload, "hex")};
    const parsedData = parser.decode(input);

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
