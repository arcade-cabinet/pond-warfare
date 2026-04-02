/**
 * Market Trading System Tests
 *
 * Validates trade resource changes, cooldown enforcement, and reset.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import {
  executeTrade,
  isMarketOnCooldown,
  MARKET_COOLDOWN_FRAMES,
  MARKET_TRADES,
  marketCooldownSeconds,
  resetMarketCooldowns,
} from '@/game/action-panel/market-buttons';

describe('Market trading', () => {
  let world: GameWorld;
  const MARKET_EID = 42;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 100;
    world.resources.clams = 500;
    world.resources.twigs = 500;
    world.resources.pearls = 100;
    resetMarketCooldowns();
  });

  it('should deduct sold resource and add bought resource (twigs -> clams)', () => {
    const trade = MARKET_TRADES[0]; // Sell 100T -> 60C
    const prevClams = world.resources.clams;
    const prevTwigs = world.resources.twigs;

    const success = executeTrade(world, MARKET_EID, trade);

    expect(success).toBe(true);
    expect(world.resources.twigs).toBe(prevTwigs - 100);
    expect(world.resources.clams).toBe(prevClams + 60);
  });

  it('should deduct sold resource and add bought resource (clams -> twigs)', () => {
    const trade = MARKET_TRADES[1]; // Sell 100C -> 60T
    const prevClams = world.resources.clams;
    const prevTwigs = world.resources.twigs;

    const success = executeTrade(world, MARKET_EID, trade);

    expect(success).toBe(true);
    expect(world.resources.clams).toBe(prevClams - 100);
    expect(world.resources.twigs).toBe(prevTwigs + 60);
  });

  it('should deduct sold resource and add bought resource (pearls -> clams)', () => {
    const trade = MARKET_TRADES[2]; // Sell 50P -> 100C
    const prevClams = world.resources.clams;
    const prevPearls = world.resources.pearls;

    const success = executeTrade(world, MARKET_EID, trade);

    expect(success).toBe(true);
    expect(world.resources.pearls).toBe(prevPearls - 50);
    expect(world.resources.clams).toBe(prevClams + 100);
  });

  it('should fail if player cannot afford the trade', () => {
    world.resources.twigs = 50; // Not enough for 100T trade
    const trade = MARKET_TRADES[0];

    const success = executeTrade(world, MARKET_EID, trade);

    expect(success).toBe(false);
    expect(world.resources.twigs).toBe(50); // Unchanged
  });

  it('should set cooldown after a successful trade', () => {
    const trade = MARKET_TRADES[0];
    expect(isMarketOnCooldown(MARKET_EID, world.frameCount)).toBe(false);

    executeTrade(world, MARKET_EID, trade);

    expect(isMarketOnCooldown(MARKET_EID, world.frameCount)).toBe(true);
  });

  it('should prevent trading during cooldown', () => {
    const trade = MARKET_TRADES[0];
    executeTrade(world, MARKET_EID, trade);

    // Try trading again immediately
    const prevTwigs = world.resources.twigs;
    const success = executeTrade(world, MARKET_EID, trade);

    expect(success).toBe(false);
    expect(world.resources.twigs).toBe(prevTwigs); // Unchanged
  });

  it('should allow trading after cooldown expires', () => {
    const trade = MARKET_TRADES[0];
    executeTrade(world, MARKET_EID, trade);

    // Advance past cooldown
    world.frameCount += MARKET_COOLDOWN_FRAMES;
    expect(isMarketOnCooldown(MARKET_EID, world.frameCount)).toBe(false);

    const success = executeTrade(world, MARKET_EID, trade);
    expect(success).toBe(true);
  });

  it('should report correct cooldown seconds remaining', () => {
    const trade = MARKET_TRADES[0];
    executeTrade(world, MARKET_EID, trade);

    // Right after trade, cooldown should be 30 seconds
    expect(marketCooldownSeconds(MARKET_EID, world.frameCount)).toBe(30);

    // After 15 seconds (900 frames)
    expect(marketCooldownSeconds(MARKET_EID, world.frameCount + 900)).toBe(15);

    // After cooldown expires
    expect(marketCooldownSeconds(MARKET_EID, world.frameCount + MARKET_COOLDOWN_FRAMES)).toBe(0);
  });

  it('should track cooldowns per Market entity independently', () => {
    const OTHER_MARKET = 99;
    const trade = MARKET_TRADES[0];

    executeTrade(world, MARKET_EID, trade);

    // Other market should not be on cooldown
    expect(isMarketOnCooldown(OTHER_MARKET, world.frameCount)).toBe(false);
    expect(executeTrade(world, OTHER_MARKET, trade)).toBe(true);
  });

  it('should clear all cooldowns on reset', () => {
    const trade = MARKET_TRADES[0];
    executeTrade(world, MARKET_EID, trade);
    expect(isMarketOnCooldown(MARKET_EID, world.frameCount)).toBe(true);

    resetMarketCooldowns();

    expect(isMarketOnCooldown(MARKET_EID, world.frameCount)).toBe(false);
  });
});
