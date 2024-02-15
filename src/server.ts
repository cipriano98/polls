import fastify from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import { createPool, getPool } from "./resources/poll/poll";
import { voteOnPoll } from "./resources/vote/vote-on-poll";
import { pollResults } from "./resources/poll/websocket/poll.websocket";

const app = fastify();

app.register(websocket);
app.register(cookie, {
  secret: "polls-app-nlw",
  hook: "onRequest",
});

app.register(createPool);
app.register(getPool);
app.register(pollResults);

app.register(voteOnPoll);

app.listen({ port: 3333 }).then((server) => {
  console.dir(`App listen on ${server}`);
});
