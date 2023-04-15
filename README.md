# Selector

A tiny DIV based selector supporting mouse and touch written in TypeScript.

## Features

* Modes for selecting elements
  * Elements needs to be only partially covered
  * Elements must be fully covered
* Callback at end of selection with list of selected elements
* Can switch between selecting and deselecting (already selected) elements

## Using selector

```typescript
    import { SelectionMarkMode, Selector  } from "@vitoni/selector";

    const areaQuery = "#" + areaId;

    // identifies an area, the selection is restricted to
    // useful
    //  - when multiple selection areas are used
    //  - to show visual constrains of the selection area
    const selectablesRootQuery = areaQuery + " div.selectables-root";

    // identifies all elements which can be selected
    const selectableElementsQuery = "div.selectable";

    function handleSelected(selectedElements: HTMLElement[], selectionMarkMode: SelectionMarkMode) {
        // Other uses cases might change the data model which the elements visualize instead of the elements themselves.
        // The changed data model would trigger an update of the respective elements indirectly.
        selectedElements.forEach((selectedElement) => {
            if (selectionMarkMode == SelectionMarkMode.ADD) {
                selectedElement.classList.add(selectectedClass);
            } else {
                selectedElement.classList.remove(selectectedClass);
            }
        });
    }

    const selector = new Selector(
        selectableElementsQuery,
        handleSelected,
        { selectablesRootQuery }
    );
    ...
    selector.mount();
    ...
    // change mode of selection to deselect elements
    selector.setSelectionMarkMode(SelectionMarkMode.REMOVE);
    ...
    // change mode of selection to select elements
    selector.setSelectionMarkMode(SelectionMarkMode.ADD);
    ...
    // cleanup only needed for SPA
    selector.unmount();
```

* The `selectablesRootQuery` allows to restrict the selection to the area identified by the query.
* `mount()` registers event listeners and adds a `<div>` element to DOM to visualize the selection area.
* `unmount()` deregisters event listeners and removes the selection area `<div>` element from DOM.
* The callback `handleSelected` is called at the end of the selection with all elements which have been marked by the selection area.
* The `SelectionMarkMode` indicates whether the marked elements should be regarded as selected or deselected.

The example code in [setup.ts](example/setup.ts) shows how all these work together and also shows usage of multiple selection areas.

## Getting started with development

### Install dependencies

```sh
npm install
```

### Start local vite server

```sh
npm run dev
```

### Linting and fixing linting errors automatically

The workspace is configured to apply ESLint rules on save.
To allow linting without IDE support there are also CLI commands available:

Show linting errors:

```sh
npm run lint
```

Fix linting errors automatically:

```sh
npm run lint-fix
```

### Local usage without publishing for development

Make `selector` package locally available:

```sh
cd selector
npm link
```

Use local version directly in consuming project

```sh
cd consuming-project
npm link "@vitoni/selector"
```
