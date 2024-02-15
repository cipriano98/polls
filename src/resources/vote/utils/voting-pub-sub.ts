type SubscriberMessage = { pollOptionId: string; votes: number };
type Subscriber = (message: SubscriberMessage) => void;

class VotingPubSub {
  private readonly channels: Record<string, Subscriber[]> = {};

  subscribe(pollId: string, subscriber: Subscriber): void {
    if (!this.channels[pollId]) {
      this.channels[pollId] = [];
    }

    this.channels[pollId].push(subscriber);
  }

  publish(pollId: string, message: SubscriberMessage): void {
    if (!this.channels[pollId]) {
      return;
    }

    for (const subscriber of this.channels[pollId]) {
      subscriber(message);
    }
  }
}

export const voting = new VotingPubSub()
// Publisher
// Subscribes
