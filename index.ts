import { Selector } from "./src/selector";

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

function handleSelected(selectedElements: HTMLElement[]) {
    selectedElements.forEach((selectedElement) => {
        selectedElement.classList.add(selectectedClass);
    });
}

//==============================================================================

function onLoad() {
    const selectablesRootSelector = "div.selectables-root";
    const selectablesRoot = document.querySelector(selectablesRootSelector) as HTMLElement;
    generateRandomElements(selectablesRoot, 10, 600);

    const selectableElementsSelector = "div.selectables-root div.selectable";

    const selector = new Selector(
        selectableElementsSelector,
        handleSelected
    );

    selector.mount();

    const clearSelectedButton = document.querySelector("#clear-selected") as HTMLElement;
    function clearSelected() {
        document
            .querySelectorAll(selectableElementsSelector)
            .forEach((selectedElement) => {
                selectedElement.classList.remove(selectectedClass);
            });
    }

    clearSelectedButton.addEventListener("click", clearSelected);
}

//==============================================================================

onLoad();

//==============================================================================
