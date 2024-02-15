import { FastifyInstance } from "fastify";
import { prisma } from "../../modules/prisma/prisma.connection";
import { randomUUID } from "node:crypto";
import z from "zod";
import { redis } from "../../modules/redis/redis";
import { voting } from "./utils/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/poll/:pollId/votes", async (request, reply) => {
    const body = z.object({
      pollOptionId: z.string().uuid(),
    });

    const params = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = params.parse(request.params);
    const { pollOptionId } = body.parse(request.body);

    let { sessionId } = request.cookies;

    if (sessionId) {
      const userPreviusVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          },
        },
      });

      if (userPreviusVoteOnPoll) {
        const previusPollOptionId = userPreviusVoteOnPoll.pollOptionId;

        if (previusPollOptionId === pollOptionId) {
          return reply
            .status(400)
            .send({ message: "Você já votou nesta enquete" });
        }

        await prisma.vote.delete({ where: { id: userPreviusVoteOnPoll.id } });
        const votes = await redis.zincrby(pollId, -1, previusPollOptionId);

        voting.publish(pollId, { pollOptionId: previusPollOptionId, votes: +votes });
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();

      reply.setCookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        signed: true,
        httpOnly: true,
      });
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId,
      },
    });

    const votes = await redis.zincrby(pollId, 1, pollOptionId);

    voting.publish(pollId, { pollOptionId, votes: +votes });

    return reply.status(201).send();
  });
}
