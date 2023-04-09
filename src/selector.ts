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
    MARK_ADD_SELECTED_CLASS: "mark_add_selected",

    /**
     * Class used to style elements while being deselected.
     */
    MARK_REMOVE_SELECTED_CLASS: "mark_remove_selected"
};

/**
 * How should elements be selected.
 */
export enum SelectionMode {
    /**
     * The selection area just needs to touch part of the element.
     */
    PARTIAL_COVER,

    /**
     * The selection area needs to cover the whole element.
     */
    FULL_COVER
}

/**
 * How should elements be marked during selection.
 * It allows to distinguish between marking elements to be selected
 * or marking elements to be removed from the selected state.
 * This enum is used:
 *  - to allow switching which the CSS class used to visualize selection
 *  - as inform about the current mode for the callback function for selected elements
 */
export enum SelectionMarkMode {
    /**
     * Selected elements will flagged to be ADDED to the selection state.
     */
    ADD,

    /**
     * Selected elements will flagged to be REMOVED from the selection state.
     */
    REMOVE
}

//==============================================================================

type Point = {
    x: number,
    y: number
};

type SelectionRectangle = {
    top: number,
    left: number,
    right: number,
    bottom: number
};

interface OptionalParameters {
    selectorUUID: string,
    selectorClass: string,
    markAddSelectedClass: string,
    markRemoveSelectedClass: string,
    selectionMode: SelectionMode,
    selectionMarkMode: SelectionMarkMode
}

//==============================================================================

/**
 * Handles all the aspects of selecting elements via click and drag.
 */
export class Selector {
    /**
     * ID identifying the DIV used to visulaize selection.
     */
    private readonly selectorUUID: string;

    /**
     * Class used to style the selection DIV.
     */
    private readonly selectorClass: string;

    /**
     * Query to "find" the selection DIV
     */
    private readonly selectorRectQuery: string;

    /**
     * Query identifying all selectable elements.
     */
    private readonly selectableElementsQuery: string;

    /**
     * CSS class to mark elements during ADD selection.
     */
    private readonly markAddSelectedClass: string;

    /**
     * CSS class to mark elements during REMOVE selection.
     */
    private readonly markRemoveSelectedClass: string;

    /**
     * How should elements be marked during selection.
     */
    private selectionMarkMode: SelectionMarkMode;

    /**
     * How should the elements get selected.
     */
    private readonly selectionMode: SelectionMode;

    /**
     * Callback to be executed on selected elements when selection is completed.
     */
    private readonly onSelectedCallback:
        (
            selectedElements: HTMLElement[],
            selectionMarkMode: SelectionMarkMode
        ) => void;

    /**
     * Flag to indicated whether the DIV has been created
     * and the event handlers have been registered.
     */
    private isMounted = false;

    /**
     * Flag indicating whether a mouse drag action has been initiated
     */
    private isMouseDown = false;

    /**
     * Initial starting point of selection.
     * Used to compute the selection area between this point and the current cursor position.
     */
    private readonly selectionStartPoint: Point = {
        x: 0,
        y: 0
    };

    /**
     * Computed selection area derived from `selectionStartPoint` and the current cursor position.
     */
    private readonly selectionRectangle: SelectionRectangle = {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    };

    //==============================================================================

    public constructor(
        selectableElementsQuery: string,
        onSelectedCallback: (selectedElements: HTMLElement[], selectionMarkMode: SelectionMarkMode) => void,
        options?: Partial<OptionalParameters>
    ) {
        const defaultOptions: OptionalParameters = {
            selectorUUID: htmlRandomUUID(),
            selectorClass: DEFAULTS.SELECTOR_CLASS,
            markAddSelectedClass: DEFAULTS.MARK_ADD_SELECTED_CLASS,
            markRemoveSelectedClass: DEFAULTS.MARK_REMOVE_SELECTED_CLASS,
            selectionMode: SelectionMode.PARTIAL_COVER,
            selectionMarkMode: SelectionMarkMode.ADD
        };

        const optionsWithDefaultValues: OptionalParameters = {
            ...defaultOptions,
            ...options
        };

        this.selectorUUID = optionsWithDefaultValues.selectorUUID;
        this.selectorClass = optionsWithDefaultValues.selectorClass;

        // setup query by which we get the the selection <div>
        this.selectorRectQuery = "div#" + this.selectorUUID;

        this.selectableElementsQuery = selectableElementsQuery;

        this.markAddSelectedClass = optionsWithDefaultValues.markAddSelectedClass;
        this.markRemoveSelectedClass = optionsWithDefaultValues.markRemoveSelectedClass;
        this.selectionMarkMode = optionsWithDefaultValues.selectionMarkMode;

        this.onSelectedCallback = onSelectedCallback;

        this.selectionMode = optionsWithDefaultValues.selectionMode;

        // need to do some binding to get "this" right within the event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        this.isSelectedBySelectionRectangle = this.isSelectedBySelectionRectangle.bind(this);
        this.unmarkSelected = this.unmarkSelected.bind(this);
        this.markSelected = this.markSelected.bind(this);

        this.getSelectionMarkMode = this.getSelectionMarkMode.bind(this);
        this.setSelectionMarkMode = this.setSelectionMarkMode.bind(this);
    }

    //==============================================================================

    /**
     * Gets the mode set for marking elements within the selection area.
     */
    public getSelectionMarkMode(): SelectionMarkMode {
        return this.selectionMarkMode;
    }

    /**
     * Sets the mode set for marking elements within the selection area.
     */
    public setSelectionMarkMode(selectionMarkMode: SelectionMarkMode) {
        this.selectionMarkMode = selectionMarkMode;
    }

    //==============================================================================

    /**
     * Sets up element for selection area and required event listeners.
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
     * Remove elelment for selection area and registered event listeners.
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
     * Start the selection process.
     *
     * @param event - used to define th initial coordinates of the selection area.
     */
    private onMouseDown(event: MouseEvent) {
        event.preventDefault();

        this.isMouseDown = true;

        this.selectionStartPoint.x = event.clientX;
        this.selectionStartPoint.y = event.clientY;
    }

    /**
     * Handles changes of the selection area by mouse moves.
     */
    private onMouseMove(event: MouseEvent) {
        // ignore event when user didn't start dragging yet
        if (!this.isMouseDown) {
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
        if (this.isMouseDown) {
            this.isMouseDown = false;

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
     * Compute the selection area based on the initial start point and the current mouse position.
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
     * Resets the selection area by setting the coordinates to '0'.
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
        return document.querySelector(this.selectorRectQuery) as HTMLElement;
    }

    /**
     * All elements which can be selected.
     */
    private getSelectableElements(): HTMLElement[] {
        const selectableElements: HTMLElement[] = [];
        document
            .querySelectorAll(this.selectableElementsQuery)
            .forEach((element) => selectableElements.push(element as HTMLElement));

        return selectableElements;
    }

    //==============================================================================

    /**
     * All elements selected by the selection area.
     */
    private getSelectedElements(): HTMLElement[] {
        const selectedElements = this.getSelectableElements()
            .filter(this.isSelectedBySelectionRectangle);

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

        selectionElement.style.opacity = "0.3";
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

        selectionElement.style.opacity = "0";
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

        node.style.opacity = "0";
        node.style.top = "0";
        node.style.left = "0";

        // we need to attach it to the body since other elements might interfere
        // with the absolute positioning we want
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
        if (this.selectionMarkMode == SelectionMarkMode.ADD) {
            element.classList.add(this.markAddSelectedClass);
        } else {
            element.classList.add(this.markRemoveSelectedClass);
        }
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
        element.classList.remove(this.markAddSelectedClass, this.markRemoveSelectedClass);
    }

    //==============================================================================

    /**
     * Delegates the selected elements to the user provided callback.
     */
    private handleSelected() {
        this.onSelectedCallback(this.getSelectedElements(), this.selectionMarkMode);
    }

    //==============================================================================

    /**
     * Checks if a given element is selected by the selection area.
     *
     * @param element - to be checked
     */
    private isSelectedBySelectionRectangle(element: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();

        if (this.selectionMode === SelectionMode.PARTIAL_COVER) {
            return doOverlap(this.selectionRectangle, elementRect);
        } else {
            return covers(this.selectionRectangle, elementRect);
        }
    }

}

//==============================================================================

/**
 * Checks if the selection area overlaps any part of the rect of given element.
 *
 * @param selectionRect - the rect of the selection area
 * @param elementRect - the rect of the element to be tested
 * @returns true if selectionRect overlaps any part of the elementRect, false otherwise
 */
function doOverlap(selectionRect: SelectionRectangle, elementRect: DOMRect): boolean {
    // if rectangle has area 0, no overlap
    if (
        selectionRect.right == selectionRect.left ||
        selectionRect.top == selectionRect.bottom ||
        elementRect.right == elementRect.left ||
        elementRect.top == elementRect.bottom
    ) {
        return false;
    }

    // If one rectangle is on left side of other
    if (elementRect.right < selectionRect.left || selectionRect.right < elementRect.left) {
        return false;
    }

    // If one rectangle is above other
    // (Y increases going from top => bottom as the positive y-axis goes down)
    if (selectionRect.bottom < elementRect.top || elementRect.bottom < selectionRect.top) {
        return false;
    }

    return true;
}

/**
 * Checks if the rect of given element is completely covered by the selection area.
 *
 * @param selectionRect - the rect of the selection area
 * @param elementRect - the rect of the element to be tested
 * @returns true if elementRect is completely covered by selectionRect, false otherwise
 */
function covers(selectionRect: SelectionRectangle, elementRect: DOMRect): boolean {
    // if rectangle has area 0, no overlap
    if (
        selectionRect.right == selectionRect.left ||
        selectionRect.top == selectionRect.bottom ||
        elementRect.right == elementRect.left ||
        elementRect.top == elementRect.bottom
    ) {
        return false;
    }

    // elementRect is within or matching selectionRect
    return (
        selectionRect.left <= elementRect.left &&
        elementRect.right <= selectionRect.right &&
        selectionRect.top <= elementRect.top &&
        elementRect.bottom <= selectionRect.bottom
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
