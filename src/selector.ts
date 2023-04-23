import { htmlRandomUUID } from "./randomUUID";

/**
 * Default values for CSS class names used and other properties.
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
    MARK_REMOVE_SELECTED_CLASS: "mark_remove_selected",

    /**
     * Query to identify the root of alls selectables.
     * Used to identify the area which contrains the selection are.
     * As default we use "body". For multiple selectors a it might be useful
     * to narrow donw the query to a more specific element.
     */
    SELECTABLES_ROOT_QUERY: "body",

    /**
     * Maximun distance from selection start coordinates to current position so that
     * one mouse down / mouse up action could be considered a click instead of a selection.
     * The threshold is used to allow minimum movement and clicking without automatically
     * starting a selection (which has a SelectionMarkMode, which might have to be changed
     * for selecting / deselecting elements).
     */
    CLICK_THRESHOLD: 5 // chosen by fair dice roll

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
    selectorClass: string | string[],
    markAddSelectedClass: string,
    markRemoveSelectedClass: string,
    selectionMode: SelectionMode,
    selectionMarkMode: SelectionMarkMode,
    selectablesRootQuery: string
    clickThreshold: number,
    onClickCallback?: (element: HTMLElement) => void,
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
     * List of classes used to style the selection DIV.
     */
    private readonly selectorClassList: string[];

    /**
     * Query to "find" the selection DIV
     */
    private readonly selectorRectQuery: string;

    /**
     * Query identifying the root of selectable elements.
     */
    private readonly selectablesRootQuery: string;

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
     * Callback to be executed when clicking elements.
     */
    private readonly onClickCallback?: (element: HTMLElement) => void;

    /**
     * Threshold for any of the selection area dimensions to consider mouse down /mouse up a clcik
     */
    private readonly clickThreshold;

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
     * Flag indicating whether the current selection could be still considered as a click action.
     */
    private isStillClick = true;

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
            selectionMarkMode: SelectionMarkMode.ADD,
            selectablesRootQuery: DEFAULTS.SELECTABLES_ROOT_QUERY,
            clickThreshold: DEFAULTS.CLICK_THRESHOLD
        };

        const optionsWithDefaultValues: OptionalParameters = {
            ...defaultOptions,
            ...options
        };

        this.selectorUUID = optionsWithDefaultValues.selectorUUID;
        this.selectorClassList = Array.isArray(optionsWithDefaultValues.selectorClass)
            ? optionsWithDefaultValues.selectorClass
            : optionsWithDefaultValues.selectorClass.split(" ");

        // setup query by which we get the the selection <div>
        this.selectorRectQuery = "div#" + this.selectorUUID;

        this.selectableElementsQuery = selectableElementsQuery;

        this.markAddSelectedClass = optionsWithDefaultValues.markAddSelectedClass;
        this.markRemoveSelectedClass = optionsWithDefaultValues.markRemoveSelectedClass;
        this.selectionMarkMode = optionsWithDefaultValues.selectionMarkMode;

        this.selectablesRootQuery = optionsWithDefaultValues.selectablesRootQuery;

        this.onSelectedCallback = onSelectedCallback;

        this.onClickCallback = optionsWithDefaultValues.onClickCallback;
        this.clickThreshold = optionsWithDefaultValues.clickThreshold;

        this.selectionMode = optionsWithDefaultValues.selectionMode;

        // need to do some binding to get "this" right within the event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        this.isSelectedBySelectionRectangle = this.isSelectedBySelectionRectangle.bind(this);
        this.isClicked = this.isClicked.bind(this);

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

            // adding mouse up listener to document to see the events
            // even if released outside the selectable root
            document.addEventListener("mouseup", this.onMouseUp);

            document.addEventListener("mousemove", this.onMouseMove);

            // selection can only start within the selectable area
            this.getSelectableRoot().addEventListener("mousedown", this.onMouseDown);

            this.isMounted = true;
        }
    }

    /**
     * Remove elelment for selection area and registered event listeners.
     */
    public unmount() {
        if (this.isMounted) {
            this.hideSelectionRectangle();

            this.getSelectableRoot().removeEventListener("mousedown", this.onMouseDown);

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
        this.isStillClick = true;

        this.selectionStartPoint.x = event.clientX;
        this.selectionStartPoint.y = event.clientY;

        this.selectionRectangle.right = event.clientX;
        this.selectionRectangle.left = event.clientX;
        this.selectionRectangle.top = event.clientY;
        this.selectionRectangle.bottom = event.clientY;
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

        // maybe the user moved to far, then we don't want to consider it still
        // as a click when the user shrinks the area again
        if (this.isStillClick) {
            this.isStillClick = this.isInClickRange();
        }

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

            // fail safe since we execute user provided functions
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
        const selectableRoot = this.getSelectableRoot();
        const selectableRect = selectableRoot.getBoundingClientRect();

        const x = limitToRange(selectableRect.left, selectableRect.right, event.clientX);
        const y = limitToRange(selectableRect.top, selectableRect.bottom, event.clientY);

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
     * Uses the size of the selection area to check if the current selection
     * could be a still regarded as a click.
     * The selection area contains the starting point and the current position
     * which allows computing the distance from the current position to the
     * starting point.
     * A distance below the given threshold is regarded as within click range.
     */
    private isInClickRange(): boolean {
        const width = Math.abs(this.selectionRectangle.right - this.selectionRectangle.left);
        if (this.clickThreshold < width) {
            return false;
        }

        const height = Math.abs(this.selectionRectangle.bottom - this.selectionRectangle.top);
        if (this.clickThreshold < height) {
            return false;
        }

        const hypotenuse = Math.sqrt(width * width + height * height);
        if (this.clickThreshold < hypotenuse) {
            return false;
        }

        return true;
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
     * The element bounding the selection area.
     */
    private getSelectableRoot(): HTMLElement {
        return document.querySelector(this.selectablesRootQuery) as HTMLElement;
    }

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
        this.getSelectableRoot()
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
        node.classList.add(...this.selectorClassList);
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
        const selectableElements = this.getSelectableElements();

        const shouldHandleSingleElementClick = this.isStillClick && this.onClickCallback;

        if (shouldHandleSingleElementClick) {
            const selectedElements = selectableElements.filter(this.isClicked);

            if (selectedElements.length == 1) {
                this.onClickCallback?.(selectedElements[0]);
                return;
            }
        }

        const selectedElements = selectableElements.filter(this.isSelectedBySelectionRectangle);
        this.onSelectedCallback(selectedElements, this.selectionMarkMode);
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

    /**
     * Checks if a given element is selected by the selection area.
     * @param element - to be checked
     */
    private isClicked(element: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();

        return doOverlap(this.selectionRectangle, elementRect);
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
    // if element has area 0, no overlap
    if (elementRect.right == elementRect.left || elementRect.top == elementRect.bottom) {
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
    // if element has area 0, no overlap
    if (elementRect.right == elementRect.left || elementRect.top == elementRect.bottom) {
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
 * Limits the given value to the given range.
 *
 * @param from - minimum value (inclusive)
 * @param to - maximum value (inclusive)
 * @param value - to check against the given range
 */
function limitToRange(from: number, to: number, value: number): number {
    if (to <= value) {
        return to;
    }

    if (value <= from) {
        return from;
    }

    return value;
}

//==============================================================================
