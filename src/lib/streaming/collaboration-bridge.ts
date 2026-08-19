export interface WhiteboardStroke {
  id: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

export interface PollQuestion {
  id: string;
  question: string;
  options: string[];
  votes: Map<string, number>; // optionIndex -> voteCount
  active: boolean;
}

export class CollaborationBridge {
  private whiteboardStrokes: Map<string, WhiteboardStroke[]> = new Map(); // roomId -> strokes
  private activePolls: Map<string, PollQuestion> = new Map(); // pollId -> PollQuestion

  public addStroke(roomId: string, stroke: WhiteboardStroke): void {
    const strokes = this.whiteboardStrokes.get(roomId) || [];
    strokes.push(stroke);
    this.whiteboardStrokes.set(roomId, strokes);
  }

  public getWhiteboardState(roomId: string): WhiteboardStroke[] {
    return this.whiteboardStrokes.get(roomId) || [];
  }

  public clearWhiteboard(roomId: string): void {
    this.whiteboardStrokes.set(roomId, []);
  }

  public createPoll(pollId: string, question: string, options: string[]): PollQuestion {
    const poll: PollQuestion = {
      id: pollId,
      question,
      options,
      votes: new Map(),
      active: true,
    };
    for (let i = 0; i < options.length; i++) {
      poll.votes.set(String(i), 0);
    }
    this.activePolls.set(pollId, poll);
    return poll;
  }

  public castVote(pollId: string, optionIndex: number): PollQuestion {
    const poll = this.activePolls.get(pollId);
    if (!poll || !poll.active) {
      throw new Error(`Poll ${pollId} is not active`);
    }
    const current = poll.votes.get(String(optionIndex)) || 0;
    poll.votes.set(String(optionIndex), current + 1);
    return poll;
  }
}
