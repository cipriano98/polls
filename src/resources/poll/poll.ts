import { FastifyInstance } from "fastify";
import { prisma } from "../../modules/prisma/prisma.connection";
import z, { object } from "zod";
import { redis } from "../../modules/redis/redis";

export async function createPool(app: FastifyInstance): Promise<void> {
  app.post("/poll", async (request, reply) => {
    const body = z.object({
      title: z.string(),
      options: z.array(z.string()),
    });

    const { title, options } = body.parse(request.body);
    const poll = await prisma.poll.create({
      data: {
        title,
        options: {
          createMany: {
            data: options.map((option) => {
              return {
                title: option,
              };
            }),
          },
        },
      },
    });

    return reply.status(201).send({ pollId: poll.id });
  });
}

export async function getPool(app: FastifyInstance): Promise<void> {
  app.get("/poll/:pollId", async (request, reply) => {
    const params = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = params.parse(request.params);
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        title: true,
        options: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!poll) {
      return reply.status(400).send({ message: "Enquete não encontrada" });
    }

    const result = await redis.zrange(pollId, 0, -1, "WITHSCORES");

    const votes = result.reduce((votes, value, index) => {
      if (index % 2 === 0) {
        const score = result[index + 1];
        Object.assign(votes, { [value]: score });
      }

      return votes;
    }, {} as Record<string, number>);

    return reply.send({
      poll: {
        ...poll,
        options: poll.options.map((option) => {
          return {
            ...option,
            score: votes[option.id] ?? 0,
          };
        }),
      },
    });
  });
}

