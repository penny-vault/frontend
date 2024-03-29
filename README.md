# Penny Vault (penny-vault)

Penny Vault is a portfolio visualization and investment strategy application.

## Design

 * [Quickbooks Design System][1]
 * [Finastra Design System][2]
 * [Penny Vault - Figma][3]
 * [Penny Vault - Color Palette][4]

## Development

### Install the dependencies
```bash
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```

### Lint the files
```bash
yarn run lint
```

### Build the app for production
```bash
quasar build
```

### Update Colfer serialization

Step 0: Copy the file `types.colf` from pv-api/portfolio into a working directory
Step 1: Modify the `package` statement from "portfolio" to "colfer" in pvapi source
Step 3: Run colfer (in the src/assets directory):

```bash
colf -l "4 * 1024 * 1024" JavaScript types.colf
```

[1]: https://designsystem.quickbooks.com/
[2]: https://design.fusionfabric.cloud
[3]: https://www.figma.com/file/oKLlf4OiW3tjRs7siZCH0F/Penny-Vault?node-id=2%3A4
[4]: https://coolors.co/414141-694ed6-c137a2-ffffff