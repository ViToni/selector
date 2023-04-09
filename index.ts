import { DEFAULTS, Selector, SelectionMarkMode } from "./src/selector";

//==============================================================================

const margin = 3;

const sizeClasses = [
    {
        name: "tiny",
        size: 15
    },
    {
        name: "small",
        size: 30
    },
    {
        name:  "regular",
        size: 50
    },
    {
        name: "big",
        size: 75
    }
];

//==============================================================================

function generateRandomElements(parent: HTMLElement, columns: number, height: number) {
    for (let i = 0; i < columns; i++) {
        parent.appendChild(generateColumn(height));
    }
}

function generateColumn(height: number): HTMLElement {
    const column = document.createElement("div");
    column.className = "column";

    generateColumnElements(column, height);

    return column;
}

function generateColumnElements(column: HTMLElement, height: number) {
    let calculatedHeight = - margin;
    while (calculatedHeight < height) {
        const element = document.createElement("div");
        const index = Math.floor(Math.random() * sizeClasses.length);

        element.className = "selectable " + sizeClasses[index].name;
        column.appendChild(element);

        calculatedHeight += margin + sizeClasses[index].size;
    }
}

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
