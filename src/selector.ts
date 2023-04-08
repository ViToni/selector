/**
 * Default values.
 */
export const DEFAULTS = {
    /**
     * Class used to style the selector <div>.
     */
    SELECTOR_CLASS: "selector-rect"
};

//==============================================================================

type Point = {
    x: number,
    y: number
};

type Rectangle = {
    top: number,
    left: number,
    right: number,
    bottom: number
};

interface OptionalParameters {
    selectorUUID: string,
    selectorClass: string
}

//==============================================================================

/**
 * Handles all the aspects of selecting elements via click and drag.
 */
export class Selector {
    /**
     * ID identifying the DIV used to visualize selection.
     */
    private readonly selectorUUID: string;

    /**
     * Class used to style the selection DIV.
     */
    private readonly selectorClass: string;

    /**
     * Flag to indicate whether the selection DIV has been created
     * and the event handlers have been registered.
     */
    private isMounted = false;

    /**
     * Flag indicating whether a selection has been started.
     */
    private selectionStarted = false;

    /**
     * Initial starting point of selection.
     * Used to compute the selection area between this point and the current cursor position.
     */
    private readonly selectionStartPoint: Point = {
        x: 0,
        y: 0
    };

    /**
     * Computed selection rectangle derived from `selectionStartPoint` and current cursor position.
     */
    private readonly selectionRectangle: Rectangle = {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    };

    //==============================================================================

    public constructor(
        options?: Partial<OptionalParameters>
    ) {
        const defaultOptions: OptionalParameters = {
            selectorUUID: htmlRandomUUID(),
            selectorClass: DEFAULTS.SELECTOR_CLASS
        };

        const optionsWithDefaultValues: OptionalParameters = {
            ...defaultOptions,
            ...options
        };

        this.selectorUUID = optionsWithDefaultValues.selectorUUID;
        this.selectorClass = optionsWithDefaultValues.selectorClass;

        // need to do some binding to get "this" right when called within event handlers

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }

    //==============================================================================

    /**
     * Sets up required event listeners and element for selection area.
     */
    public mount() {
        if (!this.isMounted) {
            this.createSelectionRect();
            this.hideSelectionRectangle();

            document.addEventListener("mouseup", this.onMouseUp);
            document.addEventListener("mousemove", this.onMouseMove);
            document.addEventListener("mousedown", this.onMouseDown);

            this.isMounted = true;
        }
    }

    /**
     * Removes registered event listeners and element for selection area.
     */
    public unmount() {
        if (this.isMounted) {
            this.hideSelectionRectangle();

            document.removeEventListener("mousedown", this.onMouseDown);
            document.removeEventListener("mousemove", this.onMouseMove);
            document.removeEventListener("mouseup", this.onMouseUp);

            this.removeSelectionRect();

            this.isMounted = false;
        }
    }

    //==============================================================================

    /**
     * Starts the selection process.
     *
     * @param event - used to retrieve the starting coordinates of the selection area
     */
    private onMouseDown(event: MouseEvent) {
        event.preventDefault();

        this.selectionStarted = true;

        this.selectionStartPoint.x = event.clientX;
        this.selectionStartPoint.y = event.clientY;

        this.selectionRectangle.right = event.clientX;
        this.selectionRectangle.left = event.clientX;
        this.selectionRectangle.top = event.clientY;
        this.selectionRectangle.bottom = event.clientY;
    }

    /**
     * Handles changes of the selection area by mouse moves.
     *
     * @param event - used to resize the selection area
     */
    private onMouseMove(event: MouseEvent) {
        // ignore event when user didn't start a selection yet
        if (!this.selectionStarted) {
            return;
        }

        event.preventDefault();

        this.computeSelectionRectangle(event);
        this.showSelectionRectangle();
    }

    /**
     * Handles end of selection (if any is active).
     *
     * @param _unused - unused but required to match callback signature
     */
    private onMouseUp(_unused: MouseEvent) {
        if (this.selectionStarted) {
            this.selectionStarted = false;

            this.hideSelectionRectangle();
            this.resetSelectionRectangle();
        }
    }

    //==============================================================================

    /**
     * Compute the selection area based on the initial starting point and the current mouse position.
     *
     * @param event - used to retrieve current mouse coordinates
     */
    private computeSelectionRectangle(event: MouseEvent) {
        const x = event.clientX;
        const y = event.clientY;

        // mouse / touch is LEFT of starting point
        if (x < this.selectionStartPoint.x) {
            this.selectionRectangle.left = x;
            this.selectionRectangle.right = this.selectionStartPoint.x;
        } else {
            this.selectionRectangle.left = this.selectionStartPoint.x;
            this.selectionRectangle.right = x;
        }

        // mouse / touch is BELOW starting point
        if (y > this.selectionStartPoint.y) {
            this.selectionRectangle.top = this.selectionStartPoint.y;
            this.selectionRectangle.bottom = y;
        } else {
            this.selectionRectangle.top = y;
            this.selectionRectangle.bottom = this.selectionStartPoint.y;
        }
    }

    /**
     * Resets the selection area by setting its coordinates to '0'.
     */
    private resetSelectionRectangle() {
        this.selectionRectangle.top = 0;
        this.selectionRectangle.left = 0;
        this.selectionRectangle.right = 0;
        this.selectionRectangle.bottom = 0;
    }

    //==============================================================================

    /**
     * Gets the element used to visualize the selection area.
     */
    private getSelectionRectNode(): HTMLElement {
        return document.getElementById(this.selectorUUID) as HTMLElement;
    }

    //==============================================================================

    /**
     * Shows the selection area based on the computed coordinates.
     */
    private showSelectionRectangle() {
        const selectionElement = this.getSelectionRectNode();

        selectionElement.style.left = `${this.selectionRectangle.left + window.scrollX}px`;
        selectionElement.style.top = `${this.selectionRectangle.top + window.scrollY}px`;
        selectionElement.style.width = `${this.selectionRectangle.right - this.selectionRectangle.left}px`;
        selectionElement.style.height = `${this.selectionRectangle.bottom - this.selectionRectangle.top}px`;
    }

    /**
     * Hides the selection area by resetting its CSS coordinates and opacity.
     */
    private hideSelectionRectangle() {
        const selectionElement = this.getSelectionRectNode();

        selectionElement.style.left = "0px";
        selectionElement.style.top = "0px";
        selectionElement.style.width = "0px";
        selectionElement.style.height = "0px";
    }

    //==============================================================================

    /**
     * Creates and configures the selection area and attaches it to the document.
     */
    private createSelectionRect() {
        const node = document.createElement("div");
        node.id = this.selectorUUID;
        node.className = this.selectorClass;

        node.style.setProperty("display", "block", "important");
        node.style.setProperty("position", "absolute", "important");
        node.style.setProperty("margin", "0", "important");
        node.style.setProperty("padding", "0", "important");

        node.style.pointerEvents = "none";

        node.style.top = "0";
        node.style.left = "0";

        // needs to be attached to the body since other elements might interfere
        // with the absolute positioning needed
        document.body.appendChild(node);
    }

    /**
     * Removes the element used for selection area.
     */
    private removeSelectionRect() {
        this.getSelectionRectNode()?.remove();
    }

}

//==============================================================================

/**
 * Creates a HTML compatible UUID.
 *
 * @returns a UUID as string prefixed with "id-"
 */
function htmlRandomUUID(): string {
    // prefix required since the string returned by randomUUID()
    // can start with digits which are not allowed for HTML IDs.
    // see: https://www.w3.org/TR/html4/types.html#type-id
    const safePrefix = "id-";

    return safePrefix + randomUUID();
}

//==============================================================================

/**
 * Create a UUID.
 *
 * It tries to use crypto.randomUUID() and if that's not available falls back
 * to a naive Math.random() based implementation.
 *
 * @returns a UUID as string
 */
function randomUUID(): string {
    // only available in secure context
    // see: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
    if (typeof crypto?.randomUUID !== "undefined") {
        return crypto.randomUUID();
    }

    return naiveRandomUUID();
}

//==============================================================================

/**
 * Creates simple Math.random() based UUIDs (containing only a-z,A-Z,0-9).
 * (It might be not suitable for security related issues.)
 *
 * @param segments - number of segments
 * @param segmentLength - number of characters per segment
 *
 * @returns string made out N segments of the given lenght concatenated by '-'
 */
function naiveRandomUUID(segments = 4, segmentLength = 6): string {
    const uuids: string[] = [];
    for (let i = 0; i < segments; i++) {
        uuids.push(randomSimpleString(segmentLength));
    }

    return uuids.join("-");
}

/**
 * Creates Math.random() based strings (containing only a-z,A-Z,0-9).
 *
 * @param length - of string to be created
 * @returns string of given length containing only the characters a-z,A-Z,0-9
 */
function randomSimpleString(length: number): string {
    const allowedChars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "abcdefghijklmnopqrstuvwxyz" +
        "01234567890";

    let result = "";
    for (let i = 0; i < length; i++) {
        const randomInt = randomUnsignedInt();
        const index = randomInt % allowedChars.length;
        result += allowedChars[index];
    }

    return result;
}

/**
 * Creates a random unsigned integer between 0 and Number.MAX_SAFE_INTEGER using Math.random().
 *
 * @returns random unsigned integer between 0 and Number.MAX_SAFE_INTEGER
 */
function randomUnsignedInt(): number {
    const randomUnsignedInt = Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER);

    return randomUnsignedInt;
}

//==============================================================================
