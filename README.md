# Selector

A tiny DIV based selector supporting mouse and touch written in TypeScript.

## Features

* Modes for selecting elements
  * Elements needs to be only partially covered
  * Elements must be fully covered

## Using selector

```typescript
    import { Selector } from "@vitoni/selector";

    const selector = new Selector();
    ...
    selector.mount();
    ...
    // cleanup only needed for SPA
    selector.unmount();
```

* `mount()` registers event listeners and adds a `<div>` element to DOM to visualize the selection area.
* `unmount()` deregisters event listeners and removes the selection area `<div>` element from DOM.

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
