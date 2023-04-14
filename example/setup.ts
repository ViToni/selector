import { DEFAULTS, Selector, SelectionMarkMode } from "../src/selector";
import { generateRandomElements } from "./randomElements";

//==============================================================================

const selectectedClass = "selected";

function handleSelected(selectedElements: HTMLElement[], selectionMarkMode: SelectionMarkMode) {
    selectedElements.forEach((selectedElement) => {
        if (selectionMarkMode == SelectionMarkMode.ADD) {
            selectedElement.classList.add(selectectedClass);
        } else {
            selectedElement.classList.remove(selectectedClass);
        }
    });
}

//==============================================================================

function setupArea(areaId: string) {
    const areaQuery = "#" + areaId;
    const selectablesRootQuery = areaQuery + " div.selectables-root";
    const selectablesRoot = document.querySelector(selectablesRootQuery) as HTMLElement;
    generateRandomElements(selectablesRoot, 6, 400);

    const selectableElementsQuery = "div.selectable";

    const selector = new Selector(
        selectableElementsQuery,
        handleSelected,
        {
            selectablesRootQuery,
            selectorClass: [
                DEFAULTS.SELECTOR_CLASS,
                areaId
            ]
        }
    );

    selector.mount();

    const clearSelectedButton = document.querySelector(areaQuery + " .clear-selected") as HTMLElement;
    function clearSelected() {
        document
            .querySelectorAll(selectableElementsQuery)
            .forEach((selectedElement) => {
                selectedElement.classList.remove(selectectedClass);
            });
    }
    clearSelectedButton.addEventListener("click", clearSelected);

    const selectionMarkModeButton = document.querySelector(areaQuery + " .change-mark-mode") as HTMLElement;
    setSelectionMarkModeButtonText();

    function setSelectionMarkModeButtonText() {
        const selectionMarkMode = selector.getSelectionMarkMode();
        selectionMarkModeButton.textContent = computeSelectionMarkModeButtonText(selectionMarkMode);
        selectionMarkModeButton.classList.remove(
            computeSelectionMarkModeButtonClass(SelectionMarkMode.ADD),
            computeSelectionMarkModeButtonClass(SelectionMarkMode.REMOVE)
        );
        selectionMarkModeButton.classList.add(
            computeSelectionMarkModeButtonClass(selectionMarkMode)
        );
    }

    function computeSelectionMarkModeButtonText(markMode: SelectionMarkMode): string {
        return (markMode == SelectionMarkMode.ADD)
            ? "Mode: Add"
            : "Mode: Remove";
    }

    function computeSelectionMarkModeButtonClass(markMode: SelectionMarkMode): string {
        return (markMode == SelectionMarkMode.ADD)
            ? "add"
            : "remove";
    }

    function toggleSelectionMarkMode() {
        selector.setSelectionMarkMode(
            selector.getSelectionMarkMode() == SelectionMarkMode.ADD
                ? SelectionMarkMode.REMOVE
                : SelectionMarkMode.ADD
        );
        setSelectionMarkModeButtonText();
    }

    selectionMarkModeButton.addEventListener("click", toggleSelectionMarkMode);
}

//==============================================================================

function onLoad() {
    setupArea("area-1");
    setupArea("area-2");
}

//==============================================================================

onLoad();

//==============================================================================
