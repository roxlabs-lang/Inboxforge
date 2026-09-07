import { GeneratorEngine } from './GeneratorEngine';
import { Variant } from '../types';
import { generateSyntheticIdentity } from './SyntheticIdentityGenerator';

/**
 * GmailDotVariantGenerator
 * Enumerates the exact finite mathematical space of Gmail dot-placement combinations.
 * Total finite space: 2^(N-1) where N is username length.
 */
export class GmailDotVariantGenerator implements GeneratorEngine {
  readonly id = 'gmail-dot-generator';
  readonly name = 'Gmail Dot Variant Generator';
  readonly description = 'Enumerates all 2^(N-1) deterministic dot-placement variations for a given Gmail username.';

  /**
   * Calculates total combinations: 2^(N-1)
   */
  estimate(username: string, _domain: string = 'gmail.com'): bigint {
    const cleanUsername = username.replace(/\./g, '');
    const len = cleanUsername.length;
    if (len <= 1) {
      return 1n;
    }
    const gaps = BigInt(len - 1);
    return 1n << gaps;
  }

  /**
   * Deterministically returns the email variant string at combination index k (0-indexed).
   */
  getVariantAt(username: string, domain: string, index: bigint): string {
    const cleanUsername = username.replace(/\./g, '');
    const len = cleanUsername.length;
    if (len <= 1) {
      return `${cleanUsername}@${domain}`;
    }

    let out = '';
    for (let i = 0; i < len; i++) {
      out += cleanUsername[i];
      if (i < len - 1) {
        const bit = (index >> BigInt(i)) & 1n;
        if (bit === 1n) {
          out += '.';
        }
      }
    }
    return `${out}@${domain}`;
  }

  /**
   * Generates all variants synchronously (recommended for testing or small sets).
   */
  generateAll(username: string, domain: string = 'gmail.com'): string[] {
    const total = this.estimate(username, domain);
    const count = Number(total);
    const results: string[] = [];
    for (let i = 0n; i < BigInt(count); i++) {
      results.push(this.getVariantAt(username, domain, i));
    }
    return results;
  }

  /**
   * Generates a range of string variants from startIndex to startIndex + count.
   */
  generateRange(username: string, domain: string, start: bigint, count: bigint): string[] {
    const total = this.estimate(username, domain);
    const results: string[] = [];
    for (let i = 0n; i < count; i++) {
      const idx = start + i;
      if (idx >= total) break;
      results.push(this.getVariantAt(username, domain, idx));
    }
    return results;
  }

  /**
   * Generates a batch of Variant records from startIndex up to count records.
   */
  generateChunk(
    workspaceId: string,
    username: string,
    domain: string,
    startIndex: bigint,
    count: number
  ): Variant[] {
    const cleanUsername = username.replace(/\./g, '');
    const total = this.estimate(cleanUsername, domain);
    const baseEmail = `${cleanUsername}@${domain}`;
    const results: Variant[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const currentIndex = startIndex + BigInt(i);
      if (currentIndex >= total) {
        break;
      }

      const email = this.getVariantAt(cleanUsername, domain, currentIndex);
      const synth = generateSyntheticIdentity(cleanUsername, Number(currentIndex % 1000000n));
      // Deterministic unique ID derived from workspace and index
      const id = `${workspaceId}_var_${currentIndex.toString()}`;

      results.push({
        id,
        workspaceId,
        email,
        baseEmail,
        username: cleanUsername,
        status: 'unused',
        starred: false,
        labelIds: [],
        notes: '',
        createdAt: now,
        updatedAt: now,
        copyCount: 0,
        usageCount: 0,
        identityName: synth.identityName,
        identityType: synth.identityType,
        organization: synth.organization,
        roleTitle: synth.roleTitle,
        avatarSeed: synth.avatarSeed,
        tags: synth.tags,
        suffix: synth.suffix,
      });
    }

    return results;
  }
}

export const defaultGmailGenerator = new GmailDotVariantGenerator();
