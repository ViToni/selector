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
     * Selector to identify the root of all selectables.
     * Used to identify the area which restricts the selection area.
     * If multiple selector instances are used, it may be useful to use a more
     * specific selector than the default "body".
     */
    SELECTABLES_ROOT_SELECTOR: "body"
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

/**
 * Specifies how selected elements should be marked during selection and how
 * they should be handled after the selection.
 *
 * It allows to distinguish between marking elements to be selected
 * or marking elements to be removed from the selected state.
 *
 * This enum is used:
 *  - to allow switching which CSS class is used to visualize selection
 *  - as information about the current mode for the callback function for selected elements
 */
export enum SelectionMode {
    /**
     * Selected elements will be flagged to be ADDED to the selection state.
     */
    ADD,

    /**
     * Selected elements will be flagged to be REMOVED from the selection state.
     */
    REMOVE
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
    selectorClass: string | string[],
    selectionMode: SelectionMode,
    markAddSelectedClass: string,
    markRemoveSelectedClass: string,
    selectablesRootSelector: string,
    selectionMatchMode: SelectionMatchMode,
    onClick?: (element: HTMLElement) => void
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
     * List of classes used to style the selection DIV.
     */
    private readonly selectorClassList: string[];

    /**
     * Selector identifying the root of selectable elements.
     */
    private readonly selectablesRootSelector: string;

    /**
     * Selector identifying all selectable elements.
     */
    private readonly selectableElementsSelector: string;

    /**
     * CSS class to mark elements during ADD selection.
     */
    private readonly markAddSelectedClass: string;

    /**
     * CSS class to mark elements during REMOVE selection.
     */
    private readonly markRemoveSelectedClass: string;

    /**
     * How should selected elements be marked during selection and how
     * should they by handled after the selection.
     */
    private selectionMode: SelectionMode;

    /**
     * How will elements get selected.
     */
    private readonly selectionMatchMode: SelectionMatchMode;

    /**
     * Callback to be executed on selected elements when selection is completed.
     */
    private readonly onSelection: (selectedElements: HTMLElement[], selectionMode: SelectionMode) => void;

    /**
     * Callback to be executed when clicking elements.
     */
    private readonly onClick?: (element: HTMLElement) => void;

    /**
     * Selectable element on which the selection started (mouse down / touch down event).
     * Used to keep track of the initial element in case the selection is a "fuzzy" click.
     */
    private clickedElement: HTMLElement | undefined = undefined;

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
        onSelection: (selectedElements: HTMLElement[], selectionMarkMode: SelectionMode) => void,
        options?: Partial<OptionalParameters>
    ) {
        const defaultOptions: OptionalParameters = {
            selectorUUID: htmlRandomUUID(),
            selectorClass: DEFAULTS.SELECTOR_CLASS,
            selectionMode: SelectionMode.ADD,
            markAddSelectedClass: DEFAULTS.MARK_ADD_SELECTED_CLASS,
            markRemoveSelectedClass: DEFAULTS.MARK_REMOVE_SELECTED_CLASS,
            selectablesRootSelector: DEFAULTS.SELECTABLES_ROOT_SELECTOR,
            selectionMatchMode: SelectionMatchMode.PARTIAL_COVER,
            onClick: undefined // don't handle clicks without user configuration
        };

        const optionsWithDefaultValues: OptionalParameters = {
            ...defaultOptions,
            ...options
        };

        this.selectablesRootSelector = optionsWithDefaultValues.selectablesRootSelector;
        this.selectableElementsSelector = selectableElementsSelector;

        this.onSelection = onSelection;
        this.onClick = optionsWithDefaultValues.onClick;

        this.selectorUUID = optionsWithDefaultValues.selectorUUID;
        this.selectorClassList = Array.isArray(optionsWithDefaultValues.selectorClass)
            ? optionsWithDefaultValues.selectorClass
            : optionsWithDefaultValues.selectorClass.split(" ");

        this.selectionMode = optionsWithDefaultValues.selectionMode;

        this.markAddSelectedClass = optionsWithDefaultValues.markAddSelectedClass;
        this.markRemoveSelectedClass = optionsWithDefaultValues.markRemoveSelectedClass;

        this.selectionMatchMode = optionsWithDefaultValues.selectionMatchMode;

        // need to do some binding to get "this" right when called within event handlers

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        this.matchedBySelection = this.matchedBySelection.bind(this);

        this.unmarkSelected = this.unmarkSelected.bind(this);
        this.markSelected = this.markSelected.bind(this);

        this.getSelectionMode = this.getSelectionMode.bind(this);
        this.setSelectionMode = this.setSelectionMode.bind(this);
    }

    //==============================================================================

    /**
     * Gets the mode used to mark elements within the selection area and
     * how selected elements should be handled after the selection.
     */
    public getSelectionMode(): SelectionMode {
        return this.selectionMode;
    }

    /**
     * Sets the mode for marking elements within the selection area and
     * how selected elements should be handled after the selection.
     */
    public setSelectionMode(selectionMode: SelectionMode) {
        this.selectionMode = selectionMode;
    }

    //==============================================================================

    /**
     * Sets up required event listeners and element for selection area.
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
     * Removes registered event listeners and element for selection area.
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

        // only checking for clicks if a click callback was configured
        if (this.onClick) {
            const eventLocation: Point = { x: event.clientX, y: event.clientY };

            const clickedElements = this.getSelectableElements().filter(
                (element) => withinElementBounds(eventLocation, element)
            );
            if (clickedElements.length == 1) {
                this.clickedElement = clickedElements[0];
            }
        }
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

        // a clickedElement implies:
        // - the user configured an onClick callback
        // - the selection started a from within this element
        // - the last position was within this element's bounds
        if (this.clickedElement) {
            const eventLocation: Point = { x: event.clientX, y: event.clientY };

            // maybe the current location is outside of the element the selection started in
            if (!withinElementBounds(eventLocation, this.clickedElement)) {
                // discard the element for click when the location is outside the element
                // (When the user shrinks the selection area again to be in the initial element
                // it wouldn't be a click anymore.)
                this.clickedElement = undefined;
            }
        }

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

            // fail safe since we execute user provided functions
            try {
                this.handleSelected();
            } finally {
                this.hideSelectionRectangle();
                this.resetSelectionRectangle();

                this.unmarkSelectedElements();

                this.clickedElement = undefined;
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
     * The element bounding the selection area and holding all selectable elements.
     */
    private getSelectableRoot(): HTMLElement {
        return document.querySelector(this.selectablesRootSelector) as HTMLElement;
    }

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
        this.getSelectableRoot()
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
        node.classList.add(...this.selectorClassList);

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
        if (this.selectionMode == SelectionMode.ADD) {
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
     * Delegates the clicked element / selected elements to the user provided callbacks.
     */
    private handleSelected() {
        // only one element to handle
        if (this.clickedElement) {
            this.onClick?.(this.clickedElement);
        } else {
            this.onSelection(this.getSelectedElements(), this.selectionMode);
        }
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
 * Checks if a location is within the bounds of a given element.
 *
 * @param location - to be checked againt the element
 * @param element - holding the bounds to be checked against
 */
function withinElementBounds(location: Point, element: HTMLElement): boolean {
    const elementRect = element.getBoundingClientRect();

    if (elementHasNoArea(elementRect)) {
        return false;
    }

    return (
        elementRect.left <= location.x && location.x <= elementRect.right &&
        elementRect.top <= location.y && location.y <= elementRect.bottom
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
