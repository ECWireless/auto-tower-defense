#!/bin/sh

# Install the desired pnpm version
npm install -g pnpm@9

# Run your original command
pnpm install --filter ./packages/api --frozen-lockfile
