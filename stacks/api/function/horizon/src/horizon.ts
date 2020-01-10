import {Injectable, OnModuleInit} from "@nestjs/common";
import {HttpAdapterHost} from "@nestjs/core";
import {Enqueuer, HttpEnqueuer} from "@spica-server/function/enqueuer";
import {EventQueue, HttpQueue} from "@spica-server/function/queue";
import {Event} from "@spica-server/function/queue/proto";
import {Node} from "@spica-server/function/runtime/node";
import {Runtime} from "@spica-server/function/runtime";

@Injectable()
export class Horizon implements OnModuleInit {
  private queue: EventQueue;
  private httpQueue: HttpQueue;
  runtime: Node;

  readonly runtimes = new Set<Runtime>();
  readonly enqueuers = new Set<Enqueuer<unknown>>();

  constructor(private http: HttpAdapterHost) {
    this.runtime = new Node();
    this.runtimes.add(this.runtime);
    this.queue = new EventQueue(this.enqueue.bind(this));
    this.httpQueue = new HttpQueue();
    this.queue.addQueue(this.httpQueue);
    this.queue.listen();
  }

  onModuleInit() {
    const httpEnqueuer = new HttpEnqueuer(
      this.queue,
      this.httpQueue,
      this.http.httpAdapter.getInstance()
    );
    this.enqueuers.add(httpEnqueuer);
  }

  private enqueue(event: Event.Event) {
    this.runtime.execute({
      eventId: event.id,
      cwd: event.target.cwd
    });
  }

  /**
   * ATTENTION: Do not use this method since it is only designed for testing.
   * @internal
   */
  kill() {
    this.queue.kill();
  }
}
