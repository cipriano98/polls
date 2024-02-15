import { FastifyInstance } from "fastify";
import z from "zod";
import { voting } from "../../vote/utils/voting-pub-sub";

export async function pollResults(app: FastifyInstance): Promise<void> {
  app.get(
    "/poll/:pollId/results",
    { websocket: true },
    (connection, request) => {
      const params = z.object({
        pollId: z.string().uuid(),
      });

      const { pollId } = params.parse(request.params);

      voting.subscribe(pollId, (message): void => {
        connection.socket.send(JSON.stringify(message));
      });
    }
  );
}
