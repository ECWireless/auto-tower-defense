# Auto Tower Defense

Auto Tower Defense is a strategy game for both battlers and builders. Battle to become the top kingdom, or build and patent tower components to earn royalties. Whether you're a tactician or an engineer, there's a path to victory.

## Overview

Auto Tower Defense is a mix of a tower defense game and a game of chess, but with 3 additional twists:

1. A tower's underlying components code can be modified by the player using Solidity
2. When a player wins a battle, that battle is saved as an additional possible opponent for future players to face at that level. So, the more players play, the more the game grows
3. Any player can license out any other player's tower component patents, but if the first player earns money in a win, a portion of that winning goes to the player they licensed the patent from

Get a deeper look into the game mechanics [here](https://paragraph.com/@raidguild-forge/introducing-auto-tower-defense).

## Prerequisites

- Node.js v20
- git
- Foundry
- pnpm, at least version 8

Installation instructions for all prerequisites can be found [here](https://mud.dev/quickstart#prerequisites).

## Running Locally

1. Install dependencies

```bash
pnpm install
```

2. Create an env file for each package

```bash
cp packages/api/.env.sample packages/api/.env
cp packages/client/.env.sample packages/client/.env
cp packages/contracts/.env.sample packages/contracts/.env
```

3. Fill in necessary env variables

4. Run development server

```bash
pnpm dev
```
