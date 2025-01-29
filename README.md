# Recomped

[![npm version](https://badge.fury.io/js/recomped.svg)](https://badge.fury.io/js/recomped)
[![CI](https://github.com/kazzix14/recomped/actions/workflows/ci.yml/badge.svg)](https://github.com/kazzix14/recomped/actions/workflows/ci.yml)
[![Storybook](https://raw.githubusercontent.com/storybook-js/brand/main/badge/badge-storybook.svg)](https://kazzix14.github.io/recomped)

A customizable datetime picker web component built with Lit.

## Features

- 📅 Date and time selection
- ⌨️ Manual input support with formatting
- 🌏 Locale support (ja/en)
- 🎨 Customizable styles via CSS variables
- 🎯 Single/double digit input support
- 🔄 Today button and clear functionality

## Installation

```bash
npm install recomped
```

## Usage

```html
<!-- Import the component -->
<script type="module">
  import { initDatetimePicker } from 'recomped';
  initDatetimePicker();
</script>

<!-- Use the component -->
<input
  recomped-datetime-picker
  placeholder="YYYY/MM/DD HH:mm"
  value="2024/01/01 10:30"
/>
```

### CSS Variables

```css
:root {
  --dt-background: white;
  --dt-border-radius: 0.5rem;
  --dt-border-color: #e5e7eb;
  --dt-text: #6b7280;
  --dt-header-text: #6b7280;
  --dt-hover-bg: #f3f4f6;
  --dt-selected-bg: rgb(235, 245, 255);
  --dt-sunday-color: #dc2626;
  --dt-saturday-color: #2563eb;
}
```

## Development

```bash
# Install dependencies
npm install

# Start Storybook
npm run storybook

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Lint
npm run lint        # Check for issues
npm run lint:fix    # Fix issues automatically

# Format
npm run format      # Check formatting
npm run format:fix  # Fix formatting issues

# Build
npm run build
```

## Release

1. Update version
```bash
# For patch release (bug fixes)
npm version patch

# For minor release (new features)
npm version minor

# For major release (breaking changes)
npm version major
```

2. Build and verify package contents
```bash
# Build the package
rm -rf dist && npm run build

# Check package contents
npm pack --dry-run
```

3. Publish to npm
```bash
# Login to npm (first time only)
npm login

# Publish package
npm publish
```

4. Create and push git tag
```bash
git push origin main --tags
```

## Code Quality

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The configuration can be found in `biome.json`.

## License

MIT

