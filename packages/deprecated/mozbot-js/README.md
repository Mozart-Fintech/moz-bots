> ⚠️ This library is deprecated in favor of [`@mozbot.io/js`](https://www.npmjs.com/package/@mozbot.io/js) and [`@mozbot.io/react`](https://www.npmjs.com/package/@mozbot.io/react)

# Mozbot JS library

Frontend library to embed mozbots from [Mozbot](https://www.mozbot.io/).

## Installation

To install, simply run:

```bash
npm install mozbot-js
```

## Usage

It exposes 3 functions:

```ts
initContainer()
initPopup()
initBubble()
```

You can configure them directly in the "Share" tab of your mozbot.

Example:

```ts
import { initContainer } from 'mozbot-js'

const plausible = initContainer('container-id', {
  publishId: 'my-app.com',
})
```
