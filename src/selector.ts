/**
 * Default values for CSS class names.
 */
export const DEFAULTS = {
    /**
     * Class used to style the selector <div>.
     */
    SELECTOR_CLASS: "selector-rect",

    /**
     * Class used to style elements while being selected.
     */
    MARK_SELECTED_CLASS: "mark_selected"
};

/**
 * Specifies how elements will be matched as selected.
 */
export enum SelectionMatchMode {
    /**
     * The selection area just needs to touch part of the element.
     */
    PARTIAL_COVER,

    /**
     * The selection area needs to cover the whole element.
     */
    FULL_COVER
}

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
    selectorClass: string,
    markSelectedClass: string,
    selectionMatchMode: SelectionMatchMode
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
     * Selector identifying all selectable elements.
     */
    private readonly selectableElementsSelector: string;

    /**
     * CSS class to mark elements during selection.
     */
    private readonly markSelectedClass: string;

    /**
     * How will elements get selected.
     */
    private readonly selectionMatchMode: SelectionMatchMode;

    /**
     * Callback to be executed on selected elements when selection is completed.
     */
    private readonly onSelection: (selectedElements: HTMLElement[]) => void;

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
        selectableElementsSelector: string,
        onSelection: (selectedElements: HTMLElement[]) => void,
        options?: Partial<OptionalParameters>
    ) {
        const defaultOptions: OptionalParameters = {
            selectorUUID: htmlRandomUUID(),
            selectorClass: DEFAULTS.SELECTOR_CLASS,
            markSelectedClass: DEFAULTS.MARK_SELECTED_CLASS,
            selectionMatchMode: SelectionMatchMode.PARTIAL_COVER
        };

        const optionsWithDefaultValues: OptionalParameters = {
            ...defaultOptions,
            ...options
        };

        this.selectableElementsSelector = selectableElementsSelector;

        this.onSelection = onSelection;

        this.selectorUUID = optionsWithDefaultValues.selectorUUID;
        this.selectorClass = optionsWithDefaultValues.selectorClass;

        this.markSelectedClass = optionsWithDefaultValues.markSelectedClass;

        this.selectionMatchMode = optionsWithDefaultValues.selectionMatchMode;

        // need to do some binding to get "this" right when called within event handlers

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        this.matchedBySelection = this.matchedBySelection.bind(this);

        this.unmarkSelected = this.unmarkSelected.bind(this);
        this.markSelected = this.markSelected.bind(this);
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

        this.markSelectedElements();
    }

    /**
     * Handles end of selection (if any is active).
     *
     * @param _unused - unused but required to match callback signature
     */
    private onMouseUp(_unused: MouseEvent) {
        if (this.selectionStarted) {
            this.selectionStarted = false;

            // fail safe since we execute a user provided function
            try {
                this.handleSelected();
            } finally {
                this.hideSelectionRectangle();
                this.resetSelectionRectangle();

                this.unmarkSelectedElements();
            }
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

    /**
     * All elements which can be selected.
     */
    private getSelectableElements(): HTMLElement[] {
        const selectableElements: HTMLElement[] = [];
        document
            .querySelectorAll(this.selectableElementsSelector)
            .forEach((element) => selectableElements.push(element as HTMLElement));

        return selectableElements;
    }

    //==============================================================================

    /**
     * All elements selected by the selection area.
     */
    private getSelectedElements(): HTMLElement[] {
        const selectedElements = this.getSelectableElements()
            .filter(this.matchedBySelection);

        return selectedElements;
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

    //==============================================================================

    /**
     * Marks all selected elements by adding the mark class to them.
     */
    private markSelectedElements() {
        this.unmarkSelectedElements();
        this.getSelectedElements().forEach(this.markSelected);
    }

    /**
     * Marks the given element as selected by adding the mark class to it.
     */
    private markSelected(element: HTMLElement) {
        element.classList.add(this.markSelectedClass);
    }

    /**
     * Removes the mark class from all selectable elements.
     */
    private unmarkSelectedElements() {
        this.getSelectableElements().forEach(this.unmarkSelected);
    }

    /**
     * Removes the mark class from the given element.
     */
    private unmarkSelected(element: HTMLElement) {
        element.classList.remove(this.markSelectedClass);
    }

    //==============================================================================

    /**
     * Delegates the selected elements to the user provided callback.
     */
    private handleSelected() {
        this.onSelection(this.getSelectedElements());
    }

    //==============================================================================

    /**
     * Checks if a given element is selected by the selection area.
     *
     * @param element - to be checked
     */
    private matchedBySelection(element: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();

        if (this.selectionMatchMode === SelectionMatchMode.PARTIAL_COVER) {
            return touches(this.selectionRectangle, elementRect);
        } else {
            return covers(this.selectionRectangle, elementRect);
        }
    }

}

//==============================================================================

/**
 * Checks if the given DOMRect has no area.
 *
 * @param domRect - The rect of the element to be tested
 *
 * @returns true if `domRect` has no width nor height, false otherwise
 */
function elementHasNoArea(domRect: DOMRect): boolean {
    return (domRect.width == 0 || domRect.height == 0);
}

/**
 * Checks if the given rectangle has no area.
 *
 * @param rectangle - The rectangle to be tested
 *
 * @returns true if `rectangle` has no width nor height, false otherwise
 */
function selectionHasNoArea(rectangle: Rectangle): boolean {
    return (
        rectangle.left == rectangle.right ||
        rectangle.top == rectangle.bottom
    );
}

/**
 * Checks if the selection area touches any part of the rect of given element.
 *
 * @param selectionRect - The rect of the selection area
 * @param elementRect - The rect of the element to be tested
 * @returns true if `selectionRect` touches any part of `elementRect`, false otherwise
 */
function touches(selectionRect: Rectangle, elementRect: DOMRect): boolean {
    if (selectionHasNoArea(selectionRect)) {
        return false;
    }

    if (elementHasNoArea(elementRect)) {
        return false;
    }

    // If one rectangle is beside the other
    if (elementRect.right < selectionRect.left || selectionRect.right < elementRect.left) {
        return false;
    }

    // If one rectangle is above the other
    // (Y increases going from top => bottom as the positive y-axis goes down)
    if (selectionRect.bottom < elementRect.top || elementRect.bottom < selectionRect.top) {
        return false;
    }

    return true;
}

/**
 * Checks if the rect of given element is completely covered by the selection area.
 *
 * @param selectionRect - The rect of the selection area
 * @param elementRect - The rect of the element to be tested
 * @returns true if `elementRect` is completely covered by `selectionRect`, false otherwise
 */
function covers(selectionRect: Rectangle, elementRect: DOMRect): boolean {
    if (selectionHasNoArea(selectionRect)) {
        return false;
    }

    if (elementHasNoArea(elementRect)) {
        return false;
    }

    // elementRect is within or matching selectionRect
    return (
        selectionRect.left <= elementRect.left && elementRect.right <= selectionRect.right &&
        selectionRect.top <= elementRect.top && elementRect.bottom <= selectionRect.bottom
    );
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
