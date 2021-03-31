import { v4 as uuidv4 } from 'uuid';

import { initContractWithNewTestAccount, addTestCollectible } from './utils';
import type { AccountContract, Collectible } from '../src';

const TEST_BENEFICIARY = 'corgis-nft.testnet'; // todo: remove corgis from here

describe('Nft contract', () => {
  const testContractsAmount = 3;
  let contracts: AccountContract[];

  let jen: AccountContract;
  let bob: AccountContract;
  let ted: AccountContract;

  beforeAll(async () => {
    contracts = await Promise.all(
      new Array(testContractsAmount).fill(0).map(initContractWithNewTestAccount),
    );

    [jen, bob, ted] = contracts;
  });

  afterAll(async () => {
    await Promise.all(contracts.map(({ account }) => account.deleteAccount(TEST_BENEFICIARY)));
  });

  describe('Initial state', () => {
    test('that test accounts are different', async () => {
      const accountIds = contracts.map(({ accountId }) => accountId);

      expect(new Set(accountIds).size).toBe(testContractsAmount);
    });

    test('that no collectibles has been created', async () => {
      const collectibles = await Promise.all(
        contracts.map(
          ({ contract, accountId }) => contract.get_collectibles_by_creator({ creator_id: accountId }),
        ),
      );

      expect(collectibles.flat()).toHaveLength(0);
    });

    test('that no tokens has been claimed', async () => {
      const tokens = await Promise.all(
        contracts.map(
          ({ contract, accountId }) => contract.get_tokens_by_owner({ owner_id: accountId }),
        ),
      );

      expect(tokens.flat()).toHaveLength(0);
    });
  });

  describe('create_collectible', () => {
    it('should create collectible with provided data', async () => {
      const gateId = uuidv4();
      const title = 'Test title';
      const description = 'Test description';
      const supply = '100';
      const royalty = {
        num: 5,
        den: 10,
      };

      await addTestCollectible(jen.contract, {
        gate_id: gateId,
        title,
        description,
        supply,
        royalty,
      });

      const collectible = await jen.contract.get_collectible_by_gate_id({ gate_id: gateId });

      expect(collectible).toMatchObject({
        title,
        description,
        current_supply: Number(supply),
        royalty,
      });
    });
  });

  describe('get_collectible_by_gate_id', () => {
    it('should return collectible', async () => {
      const gateId = uuidv4();

      await addTestCollectible(jen.contract, { gate_id: gateId });
      const collectible = await ted.contract.get_collectible_by_gate_id({ gate_id: gateId });

      expect(collectible).toMatchObject({ gate_id: gateId });
    });

    it('should throw an error if no collectible found', async () => {
      const nonExistentId = 'nonExistentId';

      await expect(jen.contract.get_collectible_by_gate_id({ gate_id: nonExistentId }))
        .rejects
        .toThrow('Given gate_id was not found');
    });
  });

  describe('get_collectibles_by_creator', () => {
    it('should return collectibles by one creator', async () => {
      const gateId = uuidv4();
      const numberOfCollectiblesToAdd = 5;
      const newGateIds = Array.from(new Array(numberOfCollectiblesToAdd), (el, i) => `${gateId}${i}`);

      const collectiblesInitial = await jen.contract.get_collectibles_by_creator({ creator_id: jen.accountId });

      await Promise.all(newGateIds.map((id) => addTestCollectible(jen.contract, { gate_id: id })));

      const collectibles = await jen.contract.get_collectibles_by_creator({ creator_id: jen.accountId });

      expect(collectibles).toHaveLength(numberOfCollectiblesToAdd + collectiblesInitial.length);
      expect(collectibles.every((collectible: Collectible) => collectible.creator_id === jen.accountId)).toBe(true);
      expect(
        newGateIds.every((id) => collectibles.some((collectible: Collectible) => collectible.gate_id === id)),
      ).toBe(true);
    });

    it('should return empty array if no collectibles found', async () => {
      const collectibles = await jen.contract.get_collectibles_by_creator({ creator_id: bob.accountId });

      expect(collectibles).toEqual([]);
    });
  });
});
