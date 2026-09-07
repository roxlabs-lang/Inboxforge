/**
 * GeneratorEngine Interface
 * Provides a standard contract for modular email variant generators.
 */

import { GeneratorProgress, Variant } from '../types';

export interface GeneratorEngine {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  /**
   * Calculates the exact total finite mathematical space of variants.
   */
  estimate(username: string, domain: string): bigint;

  /**
   * Deterministically returns the variant at index k.
   */
  getVariantAt(username: string, domain: string, index: bigint): string;

  /**
   * Generates a chunk of variants starting from startIndex.
   */
  generateChunk(
    workspaceId: string,
    username: string,
    domain: string,
    startIndex: bigint,
    count: number
  ): Variant[];
}
