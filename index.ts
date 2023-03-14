enum ElevatorStatus {
  Idle,
  Running,
}

interface InternalControl {
  getCurrentStatus(): ElevatorStatus;

  getCurrentFloor(): number;

  // Moves the elevator up 1 floor from where it is
  // When the elevator starts moving, the getCurrentStatus() change to Running,
  // Once it reaches the floor, promise is resolved, callback is called,
  // the getCurrentStatus() change to Idle
  up(callback?: () => void): Promise<void>;

  down(callback?: () => void): Promise<void>;
}

enum Direction {
  Up,
  Down,
  NotApplicable,
}

type ElevatorRequest =
  | {
      type: "RequestElevator";
      direction: Direction;
    }
  | {
      type: "RequestElevatorFloor";
      direction: Direction;
    };

type FloorRequestMap = {
  [FloorKey: number]: ElevatorRequest[];
};

class ElevatorEngine {
  // The direction that the elevator is going to, not going in currently
  private elevatorDirection: Direction | undefined;
  private currentDestinationFloorNumber: number | undefined;

  private internalControl: InternalControl;

  private floorRequests: FloorRequestMap = {
    1: [],
    2: [],
    3: [],
    4: [],
  };

  constructor() {
    const item = this.floorRequests[0][0];
    this.startEngine();
  }

  private getFloorRequests() {
    const floorRequests = Object.keys(this.floorRequests).map((floor) => {
      if (this.floorRequests[floor].length > 0) {
        return {
          floor: floor as unknown as number,
          direction: this.floorRequests[floor][0]
            .direction as ElevatorRequest["direction"],
        };
      }
    });
    return floorRequests;
  }

  /**
   * Get the nearest floor request in the direction of the elevator.
   * Helpful for reprioritizing floor requests.
   *
   * If direction not given, accepts any floor request.
   */
  private nearestFloorRequestInSameDirection(floorNumber: number) {
    const floorRequests = this.getFloorRequests();
    const currentFloor = this.internalControl.getCurrentFloor();

    if (floorRequests.length > 0 && this.elevatorDirection) {
      const nearestFloorRequest = floorRequests
        .filter(
          (floorRequest) =>
            floorRequest &&
            (this.elevatorDirection === Direction.Up
              ? floorRequest?.floor > currentFloor
              : this.elevatorDirection === Direction.Down
              ? floorRequest?.floor < currentFloor
              : // Floor direction not defined -- no direction exists
                true)
        )
        .sort((a, b) => a!.floor - b!.floor)[0];
      return nearestFloorRequest;
    }
  }

  /**
   * Main loop. Main logic lives here.
   */
  public async startEngine() {
    // Loop can be changed later to run every 5 seconds
    while (true) {
      const currentFloor = this.internalControl.getCurrentFloor();

      const nextRequestedFloor =
        this.nearestFloorRequestInSameDirection(currentFloor);

      this.currentDestinationFloorNumber = nextRequestedFloor?.floor;

      if (!this.currentDestinationFloorNumber) {
        this.elevatorDirection = undefined;
      }

      // If we are at a floor that is the current destination floor, then
      // remove it from current destination floor
      if (
        this.currentDestinationFloorNumber &&
        currentFloor === this.currentDestinationFloorNumber
      ) {
        // Remove the floor request from the list of floor requests
        this.floorRequests[this.currentDestinationFloorNumber] = [
          ...this.floorRequests[this.currentDestinationFloorNumber].filter(
            // Only remove the floor request if it is in the same direction or if the direction is not applicable
            (fr) =>
              !(fr.direction === this.elevatorDirection) ||
              fr.direction === Direction.NotApplicable
          ),
        ];

        if (!this.currentDestinationFloorNumber) {
          // No more floor requests in the same direction, so set elevator direction to undefined
          this.elevatorDirection = undefined;
        }
      }

      if (this.currentDestinationFloorNumber) {
        // If we are not at the current destination floor, then move towards it
        if (this.currentDestinationFloorNumber > currentFloor) {
          await this.internalControl.up();
        } else if (this.currentDestinationFloorNumber < currentFloor) {
          await this.internalControl.down();
        }
      }
    }
  }

  /**
   * Request the elevator from a specific floor
   */
  public requestElevator(userFloor: number, direction: Direction) {
    this.floorRequests[userFloor].push({
      type: "RequestElevator",
      direction,
    } as ElevatorRequest);
  }

  /**
   * Request a specific floor from inside the elevator
   */
  public requestFloorWhileInsideElevator(floor: number) {
    this.floorRequests[floor].push({
      type: "RequestElevatorFloor",
      direction: Direction.NotApplicable,
    } as ElevatorRequest);
  }
}
