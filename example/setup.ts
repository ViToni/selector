import { DEFAULTS, Selector, SelectionMode } from "../src";
import { generateRandomElements } from "./randomElements";

//==============================================================================

const selectectedClass = "selected";

function handleSelected(selectedElements: HTMLElement[], selectionMode: SelectionMode) {
    selectedElements.forEach((selectedElement) => {
        if (selectionMode == SelectionMode.ADD) {
            selectedElement.classList.add(selectectedClass);
        } else {
            selectedElement.classList.remove(selectectedClass);
        }
    });
}

function onClick(element: HTMLElement) {
    if (element.classList.contains(selectectedClass)) {
        element.classList.remove(selectectedClass);
    } else {
        element.classList.add(selectectedClass);
    }
}

//==============================================================================

function setupArea(areaId: string) {
    const areaSelector = "#" + areaId;
    const selectablesRootSelector = areaSelector + " div.selectables-root";
    const selectablesRoot = document.querySelector(selectablesRootSelector) as HTMLElement;
    generateRandomElements(selectablesRoot, 6, 400);

    const selectableElementsSelector = "div.selectable";

    const selector = new Selector(
        selectableElementsSelector,
        handleSelected,
        {
            selectablesRootSelector,
            selectorClass: [
                DEFAULTS.SELECTOR_CLASS,
                areaId
            ],
            onClick
        }
    );

    selector.mount();

    const clearSelectedButton = document.querySelector(areaSelector + " .clear-selected") as HTMLElement;
    function clearSelected() {
        document
            .querySelectorAll(selectableElementsSelector)
            .forEach((selectedElement) => {
                selectedElement.classList.remove(selectectedClass);
            });
    }
    clearSelectedButton.addEventListener("click", clearSelected);

    const selectionModeButton = document.querySelector(areaSelector + " .change-selection-mode") as HTMLElement;
    setSelectionModeButtonText();

    function setSelectionModeButtonText() {
        const selectionMode = selector.getSelectionMode();
        selectionModeButton.textContent = computeSelectionModeButtonText(selectionMode);
        selectionModeButton.classList.remove(
            computeSelectionModeButtonClass(SelectionMode.ADD),
            computeSelectionModeButtonClass(SelectionMode.REMOVE)
        );
        selectionModeButton.classList.add(
            computeSelectionModeButtonClass(selectionMode)
        );
    }

    function computeSelectionModeButtonText(selectionMode: SelectionMode): string {
        return (selectionMode == SelectionMode.ADD)
            ? "Mode: Add"
            : "Mode: Remove";
    }

    function computeSelectionModeButtonClass(selectionMode: SelectionMode): string {
        return (selectionMode == SelectionMode.ADD)
            ? "add"
            : "remove";
    }

    function toggleSelectionMode() {
        selector.setSelectionMode(
            selector.getSelectionMode() == SelectionMode.ADD
                ? SelectionMode.REMOVE
                : SelectionMode.ADD
        );
        setSelectionModeButtonText();
    }

    selectionModeButton.addEventListener("click", toggleSelectionMode);
}

//==============================================================================

function onLoad() {
    setupArea("area-1");
    setupArea("area-2");
}

//==============================================================================

onLoad();

//==============================================================================
